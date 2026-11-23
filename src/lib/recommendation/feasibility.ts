import type { SkillGapSeverity, SkillProficiency } from "@prisma/client";

export interface StudentSkillInput {
  skillSlug: string;
  proficiency: SkillProficiency;
}

export interface FeasibilityCalculationInput {
  studentSkills: readonly StudentSkillInput[];
  requiredSkillSlugs: readonly string[];
  weeklyHours: number;
  durationWeeks: number;
  teamSize: number;
  baseEffortHours: number;
  publicDatasetAvailable: boolean;
  standardHardwareSufficient: boolean;
  noPaidApiLockin: boolean;
  bestAvailableSupervisorSimilarity: number | null; // null if department has 0 supervisors onboarded
}

export interface ComputedSkillGap {
  skillSlug: string;
  requiredProficiency: SkillProficiency;
  currentProficiency: SkillProficiency | null;
  severity: SkillGapSeverity;
  estimatedLearnHours: number;
  learningAction: string;
}

export interface FeasibilityBreakdown {
  feasibilityScore: number; // 0..100 exact sum of the 4 integer sub-scores
  skillOverlapScore: number; // 0..40
  timeFitScore: number; // 0..30
  resourceReadinessScore: number; // 0..20
  supervisorFitScore: number; // 0..10
  totalEffortHours: number;
  totalSkillGapHours: number;
  skillGaps: ComputedSkillGap[];
  explanation: string;
}

const PROFICIENCY_WEIGHTS: Record<SkillProficiency, number> = {
  ADVANCED: 1.0,
  INTERMEDIATE: 0.75,
  BEGINNER: 0.4,
};

export function computeTeamFactor(teamSize: number): number {
  if (teamSize <= 1) return 1.0;
  if (teamSize === 2) return 1.65;
  return 2.2;
}

export function calculateTotalEffortHours(
  weeklyHours: number,
  durationWeeks: number,
  teamSize: number
): number {
  const safeWeekly = Math.max(5, Math.min(45, weeklyHours));
  const safeWeeks = Math.max(12, Math.min(36, durationWeeks));
  const factor = computeTeamFactor(teamSize);
  return Math.round(safeWeekly * safeWeeks * factor);
}

/**
 * Deterministic 4-factor Feasibility Score (0-100):
 * - Skill Overlap (40%)
 * - Time-to-Complexity Fit (30%)
 * - Resource & Data Readiness (20%)
 * - Supervisor Domain Fit (10%)
 */
export function calculateFeasibilityBreakdown(
  input: FeasibilityCalculationInput
): FeasibilityBreakdown {
  const skillMap = new Map<string, SkillProficiency>();
  for (const s of input.studentSkills) {
    skillMap.set(s.skillSlug.toLowerCase(), s.proficiency);
  }

  const required = input.requiredSkillSlugs;
  const skillGaps: ComputedSkillGap[] = [];
  let weightedSum = 0;

  for (const reqSlug of required) {
    const normalized = reqSlug.toLowerCase();
    const current = skillMap.get(normalized) ?? null;

    if (current) {
      weightedSum += PROFICIENCY_WEIGHTS[current];
      if (current === "BEGINNER") {
        skillGaps.push({
          skillSlug: normalized,
          requiredProficiency: "INTERMEDIATE",
          currentProficiency: "BEGINNER",
          severity: "MINOR",
          estimatedLearnHours: 10,
          learningAction: `Build a vertical prototype strengthening ${normalized} patterns and error handling before core integration.`,
        });
      }
    } else {
      skillGaps.push({
        skillSlug: normalized,
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: null,
        severity: required.indexOf(reqSlug) < 2 ? "CRITICAL" : "MODERATE",
        estimatedLearnHours: required.indexOf(reqSlug) < 2 ? 18 : 12,
        learningAction: `Complete focused documentation labs and implement an isolated spike module for ${normalized}.`,
      });
    }
  }

  const rawSkillRatio = required.length > 0 ? weightedSum / required.length : 1.0;
  const skillOverlapScore = Math.max(0, Math.min(40, Math.round(rawSkillRatio * 40)));

  const totalEffortHours = calculateTotalEffortHours(
    input.weeklyHours,
    input.durationWeeks,
    input.teamSize
  );
  const totalSkillGapHours = skillGaps.reduce((acc, g) => acc + g.estimatedLearnHours, 0);
  const netBuildEffort = Math.max(0, totalEffortHours - totalSkillGapHours);
  const requiredBase = Math.max(100, input.baseEffortHours);
  const effortRatio = netBuildEffort / requiredBase;

  let timeFitScore: number;
  if (effortRatio >= 1.0) {
    timeFitScore = 30;
  } else {
    timeFitScore = Math.max(0, Math.min(30, Math.round(effortRatio * 30)));
  }

  let resourceScoreRaw = 0;
  if (input.publicDatasetAvailable) resourceScoreRaw += 8;
  if (input.standardHardwareSufficient) resourceScoreRaw += 7;
  if (input.noPaidApiLockin) resourceScoreRaw += 5;
  const resourceReadinessScore = Math.max(0, Math.min(20, resourceScoreRaw));

  let supervisorFitScore: number;
  let supNote: string;
  if (input.bestAvailableSupervisorSimilarity === null) {
    // Explicit neutral fallback when department has 0 available supervisors onboarded
    supervisorFitScore = 6;
    supNote = "Department supervisors not yet onboarded (neutral 6/10 baseline)";
  } else {
    const clampedSim = Math.max(0, Math.min(1, input.bestAvailableSupervisorSimilarity));
    supervisorFitScore = Math.max(0, Math.min(10, Math.round(clampedSim * 10)));
    supNote = `Matched open-capacity faculty similarity ${(clampedSim * 100).toFixed(0)}% (${supervisorFitScore}/10)`;
  }

  const feasibilityScore =
    skillOverlapScore + timeFitScore + resourceReadinessScore + supervisorFitScore;

  const explanation = `Feasibility ${feasibilityScore}/100: Skill overlap ${skillOverlapScore}/40 (${
    required.length - skillGaps.filter((g) => g.currentProficiency === null).length
  }/${required.length} core skills present), Time fit ${timeFitScore}/30 (${netBuildEffort}h net budget vs ${requiredBase}h target), Resource readiness ${resourceReadinessScore}/20, and ${supNote}.`;

  return {
    feasibilityScore,
    skillOverlapScore,
    timeFitScore,
    resourceReadinessScore,
    supervisorFitScore,
    totalEffortHours,
    totalSkillGapHours,
    skillGaps,
    explanation,
  };
}

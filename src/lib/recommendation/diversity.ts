import type { DifficultyLevel, ProjectTrack } from "@prisma/client";
import { cosineSimilarity } from "@/lib/ai/embeddings";

export interface ScoredCandidateArchetype {
  seedTemplateId: string;
  slug: string;
  title: string;
  domain: string;
  problemSummary: string;
  coreDeliverable: string;
  requiredSkillSlugs: string[];
  recommendedStack: string[];
  difficulty: DifficultyLevel;
  baseEffortHours: number;
  careerTracks: string[];
  embedding: number[];
  feasibilityScore: number;
  skillOverlapScore: number;
  timeFitScore: number;
  resourceReadinessScore: number;
  supervisorFitScore: number;
  totalSkillGapHours: number;
  profileSimilarity: number;
}

export interface SelectedTrackCandidate {
  track: ProjectTrack;
  candidate: ScoredCandidateArchetype;
}

/**
 * Stage 3 Anti-Bias Diversity Selector (Maximal Marginal Relevance):
 * Selects 3 distinct tracks:
 * - Track 1 (CORE_SAFE): Highest Feasibility Score, low skill-gap risk.
 * - Track 2 (CAREER_STRETCH): Strong careerGoal & high-growth domain alignment with moderate skill stretch.
 * - Track 3 (RESEARCH_NICHE): Maximum vector/domain distance from Tracks 1 & 2 (MMR lambda = 0.65).
 */
export function selectDiversifiedTracks(
  candidates: readonly ScoredCandidateArchetype[],
  careerGoal: string,
  allBeginnerProfile = false
): SelectedTrackCandidate[] {
  if (candidates.length === 0) {
    return [];
  }

  // Cap complexity at MODERATE when student selects 0 advanced/intermediate skills (all beginner safeguard)
  const pool = allBeginnerProfile
    ? candidates.filter((c) => c.difficulty === "MODERATE")
    : [...candidates];

  const workingPool = pool.length >= 3 ? pool : [...candidates];

  // Track 1: CORE_SAFE — highest feasibility score, tie-breaking by lowest skill gap hours
  const sortedForCore = [...workingPool].sort((a, b) => {
    if (b.feasibilityScore !== a.feasibilityScore) {
      return b.feasibilityScore - a.feasibilityScore;
    }
    return a.totalSkillGapHours - b.totalSkillGapHours;
  });

  const coreSafe = sortedForCore[0]!;
  const usedIds = new Set<string>([coreSafe.seedTemplateId]);

  // Track 2: CAREER_STRETCH — aligns with careerGoal + moderate stretch (10..48 skill gap hours) + distinct domain preferred
  const goalLower = careerGoal.trim().toLowerCase();
  const remainingForStretch = workingPool.filter((c) => !usedIds.has(c.seedTemplateId));

  const scoredStretch = remainingForStretch.map((c) => {
    const careerMatch = c.careerTracks.some(
      (t) =>
        goalLower.includes(t.toLowerCase()) ||
        t.toLowerCase().includes(goalLower) ||
        t
          .toLowerCase()
          .split(/\s+/)
          .some((word) => word.length > 3 && goalLower.includes(word))
    )
      ? 18
      : 6;

    const stretchBonus =
      c.totalSkillGapHours >= 10 && c.totalSkillGapHours <= 48 ? 12 : 4;
    const domainDiversityBonus = c.domain !== coreSafe.domain ? 10 : 0;
    const simPenalty = cosineSimilarity(c.embedding, coreSafe.embedding) * 15;

    const composite =
      c.feasibilityScore * 0.65 +
      careerMatch +
      stretchBonus +
      domainDiversityBonus -
      simPenalty;

    return { candidate: c, composite };
  });

  scoredStretch.sort((a, b) => b.composite - a.composite);
  const careerStretch = (scoredStretch[0]?.candidate ?? coreSafe)!;
  usedIds.add(careerStretch.seedTemplateId);

  // Track 3: RESEARCH_NICHE — MMR diversity penalty (lambda = 0.65) maximizing vector distance from Tracks 1 & 2
  const remainingForNiche = workingPool.filter((c) => !usedIds.has(c.seedTemplateId));
  const lambda = 0.65;

  const scoredNiche = remainingForNiche.map((c) => {
    const relevance = (c.feasibilityScore / 100) * 0.5 + c.profileSimilarity * 0.5;
    const simToTrack1 = cosineSimilarity(c.embedding, coreSafe.embedding);
    const simToTrack2 = cosineSimilarity(c.embedding, careerStretch.embedding);
    const maxSimToSelected = Math.max(simToTrack1, simToTrack2);

    const distinctDomainBonus =
      c.domain !== coreSafe.domain && c.domain !== careerStretch.domain ? 0.15 : 0;

    const mmrScore =
      lambda * relevance - (1 - lambda) * maxSimToSelected + distinctDomainBonus;

    return { candidate: c, mmrScore };
  });

  scoredNiche.sort((a, b) => b.mmrScore - a.mmrScore);
  const researchNiche = (scoredNiche[0]?.candidate ?? careerStretch)!;

  return [
    { track: "CORE_SAFE", candidate: coreSafe },
    { track: "CAREER_STRETCH", candidate: careerStretch },
    { track: "RESEARCH_NICHE", candidate: researchNiche },
  ];
}

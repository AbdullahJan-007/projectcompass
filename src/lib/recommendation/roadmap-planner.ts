import type { MilestoneStatus } from "@prisma/client";

export interface RoadmapPlanningInput {
  ideaTitle: string;
  domain: string;
  durationWeeks: number; // 12..36
  weeklyHours: number; // 5..45
  totalSkillGapHours: number;
  skillGapSlugs: readonly string[];
  recommendedStack: readonly string[];
}

export interface PlannedMilestoneItem {
  id: string;
  phaseNumber: 1 | 2 | 3 | 4;
  phaseTitle: string;
  weekStart: number;
  weekEnd: number;
  weeksAllocated: number;
  title: string;
  deliverables: string[];
  verificationCriteria: string;
  riskNote: string;
  status: MilestoneStatus;
  sortOrder: number;
}

export interface PlannedRoadmapResult {
  durationWeeks: number;
  weeklyHours: number;
  prepWeeksAllocated: number;
  phaseWeekCounts: [number, number, number, number];
  summary: string;
  milestones: PlannedMilestoneItem[];
}

/**
 * Deterministic Roadmap Week Allocator (State Machine 4):
 * 1. Calculates prepWeeks = ceil(totalSkillGapHours / (weeklyHours * 0.7)),
 *    capped at floor(durationWeeks * 0.25) (minimum 1 week, maximum 6 weeks).
 * 2. Allocates remaining weeks across Phases 2 (40%), 3 (35%), and 4 (25%).
 * 3. Guarantees sum(phase.weeks) === durationWeeks deterministically.
 */
export function allocateRoadmapWeeks(params: {
  durationWeeks: number;
  weeklyHours: number;
  totalSkillGapHours: number;
}): {
  prepWeeks: number;
  phase2Weeks: number;
  phase3Weeks: number;
  phase4Weeks: number;
} {
  const safeDuration = Math.max(12, Math.min(36, Math.round(params.durationWeeks)));
  const safeWeekly = Math.max(5, Math.min(45, Math.round(params.weeklyHours)));
  const safeGap = Math.max(0, params.totalSkillGapHours);

  const maxPrepCap = Math.min(6, Math.max(1, Math.floor(safeDuration * 0.25)));
  const rawPrep =
    safeGap <= 0 ? 1 : Math.ceil(safeGap / Math.max(1, safeWeekly * 0.7));
  const prepWeeks = Math.max(1, Math.min(maxPrepCap, rawPrep));

  const remainingWeeks = safeDuration - prepWeeks;
  const phase2Weeks = Math.max(1, Math.round(remainingWeeks * 0.4));
  const phase3Weeks = Math.max(1, Math.round(remainingWeeks * 0.35));
  const phase4Weeks = Math.max(1, remainingWeeks - phase2Weeks - phase3Weeks);

  // Final deterministic invariant enforcement
  const currentSum = prepWeeks + phase2Weeks + phase3Weeks + phase4Weeks;
  const diff = safeDuration - currentSum;
  const adjustedPhase2 = phase2Weeks + diff;

  return {
    prepWeeks,
    phase2Weeks: adjustedPhase2,
    phase3Weeks,
    phase4Weeks,
  };
}

export function buildCalibratedProjectRoadmap(
  input: RoadmapPlanningInput
): PlannedRoadmapResult {
  const { prepWeeks, phase2Weeks, phase3Weeks, phase4Weeks } = allocateRoadmapWeeks({
    durationWeeks: input.durationWeeks,
    weeklyHours: input.weeklyHours,
    totalSkillGapHours: input.totalSkillGapHours,
  });

  const p1Start = 1;
  const p1End = prepWeeks;

  const p2Start = p1End + 1;
  const p2End = p1End + phase2Weeks;

  const p3Start = p2End + 1;
  const p3End = p2End + phase3Weeks;

  const p4Start = p3End + 1;
  const p4End = p3End + phase4Weeks;

  const gapFocus =
    input.skillGapSlugs.length > 0
      ? input.skillGapSlugs.join(", ")
      : "Core TypeScript & PostgreSQL architecture patterns";

  const milestones: PlannedMilestoneItem[] = [
    {
      id: "ms_phase_1_rampup",
      phaseNumber: 1,
      phaseTitle: "Phase 1: Skill Ramp-Up & Specification",
      weekStart: p1Start,
      weekEnd: p1End,
      weeksAllocated: prepWeeks,
      title: `Skill-Gap Remediation (${gapFocus}) & Formal Architecture RFC`,
      deliverables: [
        `Complete isolated spike modules covering ${gapFocus} (${input.totalSkillGapHours}h upskilling budget).`,
        "Lock Prisma relational + vector schema and freeze API boundary contracts.",
        "Submit supervisor-signed FYP Scope & Verification Rubric.",
      ],
      verificationCriteria:
        "All spike unit tests pass in Vitest; database migrations apply cleanly against local PostgreSQL 16.",
      riskNote:
        "Risk Checkpoint: Do not proceed to full feature UI before verifying data ingestion and core schema constraints.",
      status: "COMPLETED",
      sortOrder: 1,
    },
    {
      id: "ms_phase_2_vertical_slice",
      phaseNumber: 2,
      phaseTitle: "Phase 2: Core Architecture & Vertical Slice",
      weekStart: p2Start,
      weekEnd: p2End,
      weeksAllocated: phase2Weeks,
      title: `End-to-End Deterministic Engine & ${input.domain} Core Pipeline`,
      deliverables: [
        `Implement primary data ingestion, validation schemas, and ${input.recommendedStack.slice(0, 2).join(" + ")} foundation.`,
        "Build deterministic domain scoring and baseline retrieval queries.",
        "Deliver mid-semester functional vertical slice for supervisor walkthrough.",
      ],
      verificationCriteria:
        "Core vertical slice executes end-to-end in < 400ms (CRUD) with >= 85% unit test branch coverage.",
      riskNote:
        "Risk Checkpoint: Mid-semester scope freeze — defer non-essential UI polish if core pipeline throughput lags.",
      status: "IN_PROGRESS",
      sortOrder: 2,
    },
    {
      id: "ms_phase_3_hardening",
      phaseNumber: 3,
      phaseTitle: "Phase 3: Feature Completion, AI/Data Integration & Hardening",
      weekStart: p3Start,
      weekEnd: p3End,
      weeksAllocated: phase3Weeks,
      title: "Guardrailed Synthesis, Concurrency Safety & Failure Fallbacks",
      deliverables: [
        "Wire asynchronous workers, rate limiting, and deterministic fallback handlers.",
        "Implement all 4 UI states (Loading, Empty, Error, Populated) across workspace screens.",
        "Execute concurrency and fault-injection stress tests.",
      ],
      verificationCriteria:
        "Zero unhandled 500 crashes when external APIs time out; atomic database constraints verified under concurrent load.",
      riskNote:
        "Risk Checkpoint: Verify API token/rate-limit circuit breakers to prevent quota exhaustion during evaluation.",
      status: "NOT_STARTED",
      sortOrder: 3,
    },
    {
      id: "ms_phase_4_defense",
      phaseNumber: 4,
      phaseTitle: "Phase 4: Evaluation, Testing, Documentation & Defense Prep",
      weekStart: p4Start,
      weekEnd: p4End,
      weeksAllocated: phase4Weeks,
      title: "Empirical Benchmarking, Playwright E2E Suite & Final Viva Defense",
      deliverables: [
        "Run benchmark suite comparing precision/latency against baseline methods.",
        "Pass full Playwright E2E golden-path and RBAC security tests.",
        "Finalize thesis report, architecture diagrams, and live demo fallback rehearsal.",
      ],
      verificationCriteria:
        "CI pipeline 100% green (typecheck, lint, Vitest, Playwright); WCAG 2.1 AA contrast verified across all screens.",
      riskNote:
        "Risk Checkpoint: Freeze production deployment 72 hours prior to FYP panel defense and verify offline fallback mode.",
      status: "NOT_STARTED",
      sortOrder: 4,
    },
  ];

  const summary = `${input.durationWeeks}-week execution plan for "${input.ideaTitle}" calibrated to ${input.weeklyHours} hrs/week (${prepWeeks} weeks allocated to skill-gap preparation).`;

  return {
    durationWeeks: input.durationWeeks,
    weeklyHours: input.weeklyHours,
    prepWeeksAllocated: prepWeeks,
    phaseWeekCounts: [prepWeeks, phase2Weeks, phase3Weeks, phase4Weeks],
    summary,
    milestones,
  };
}

export function formatRoadmapAsMarkdown(params: {
  ideaTitle: string;
  roadmap: PlannedRoadmapResult;
}): string {
  const { ideaTitle, roadmap } = params;
  const lines: string[] = [
    `# ProjectCompass Execution Roadmap — ${ideaTitle}`,
    "",
    `- **Total Duration:** ${roadmap.durationWeeks} Weeks`,
    `- **Weekly Commitment:** ${roadmap.weeklyHours} Hours / Week`,
    `- **Skill-Gap Prep Allocated:** ${roadmap.prepWeeksAllocated} Weeks`,
    `- **Summary:** ${roadmap.summary}`,
    "",
    "---",
    "",
  ];

  for (const ms of roadmap.milestones) {
    const weekLabel = `W${String(ms.weekStart).padStart(2, "0")}–W${String(ms.weekEnd).padStart(2, "0")}`;
    lines.push(`## ${ms.phaseTitle} (${weekLabel} · ${ms.weeksAllocated} Weeks)`);
    lines.push(`**Milestone:** ${ms.title}  `);
    lines.push(`**Status:** \`${ms.status}\``);
    lines.push("");
    lines.push("### Concrete Deliverables");
    for (const d of ms.deliverables) {
      lines.push(`- [ ] ${d}`);
    }
    lines.push("");
    lines.push(`**Verification Criteria:** ${ms.verificationCriteria}`);
    lines.push("");
    lines.push(`> **${ms.riskNote}**`);
    lines.push("");
  }

  return lines.join("\n");
}

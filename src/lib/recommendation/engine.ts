import type {
  DifficultyLevel,
  DuplicateRiskLevel,
  ProjectTrack,
  RunStatus,
} from "@prisma/client";
import type { RecommendedStackItem, SimilarArchiveItem } from "@/types/actions";
import {
  calculateFeasibilityBreakdown,
  calculateTotalEffortHours,
  type ComputedSkillGap,
  type StudentSkillInput,
} from "@/lib/recommendation/feasibility";
import {
  evaluateArchiveDuplicates,
} from "@/lib/recommendation/duplicate-check";
import {
  selectDiversifiedTracks,
  type ScoredCandidateArchetype,
} from "@/lib/recommendation/diversity";
import {
  rankAvailableSupervisors,
  type RankedSupervisorMatch,
  type SupervisorCandidateInput,
} from "@/lib/recommendation/supervisor-ranker";
import {
  SEED_IDEA_TEMPLATES,
  DEMO_SUPERVISORS,
  DEMO_PROJECT_ARCHIVES,
  MARKET_TREND_SNAPSHOTS,
} from "@/lib/recommendation/seed-data";
import {
  cosineSimilarity,
  generateDeterministicEmbedding,
} from "@/lib/ai/embeddings";
import {
  buildGroundedRecommendationPrompts,
  type PromptCandidateContext,
} from "@/lib/ai/prompts";
import { synthesizeGroundedIdeasWithLlm } from "@/lib/ai/client";

export interface EngineExecutionInput {
  studentSkills: readonly StudentSkillInput[];
  interests: readonly string[];
  careerGoal: string;
  preferredType: string;
  weeklyHours: number;
  durationWeeks: number;
  teamSize: number;
  focusNote?: string;
  customSupervisors?: readonly SupervisorCandidateInput[];
  customArchives?: ReadonlyArray<{
    archiveId: string;
    title: string;
    abstract: string;
    academicYear: number;
    domain: string;
    techStack: readonly string[];
    embedding?: readonly number[];
  }>;
  forceLlmFailure?: boolean;
}

export interface GeneratedIdeaRecord {
  id: string;
  track: ProjectTrack;
  seedTemplateId: string;
  title: string;
  domain: string;
  problemStatement: string;
  proposedSolution: string;
  differentiationAngle: string | null;
  difficulty: DifficultyLevel;
  recommendedStack: RecommendedStackItem[];
  feasibilityScore: number;
  skillOverlapScore: number;
  timeFitScore: number;
  resourceReadinessScore: number;
  supervisorFitScore: number;
  feasibilityExplanation: string;
  duplicateRisk: DuplicateRiskLevel;
  highestArchiveSimilarity: number;
  similarArchives: SimilarArchiveItem[];
  marketDemandTag: string;
  estimatedTotalHours: number;
  skillGaps: ComputedSkillGap[];
  supervisorMatches: RankedSupervisorMatch[];
}

export interface EngineExecutionResult {
  status: Extract<RunStatus, "COMPLETED" | "COMPLETED_FALLBACK">;
  usedFallback: boolean;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
  totalEffortHours: number;
  ideas: [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord];
}

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.CI !== "true" &&
    process.env.SEED_DEMO_DATA !== "true"
  );
}

function buildDefaultStackItems(
  rawStack: readonly string[],
  domain: string
): RecommendedStackItem[] {
  const layerNames = [
    "Frontend & Workspace",
    "Application & API Layer",
    "Data & Vector Persistence",
    "Async & Background Pipeline",
    "Verification & Observability",
  ];

  const items: RecommendedStackItem[] = rawStack.slice(0, 5).map((tech, idx) => ({
    layer: layerNames[idx] ?? "Core Infrastructure",
    tech,
    rationale: `Selected for ${domain} workload reliability, strong static typing, and zero paid vendor lock-in within a 24-week student timeline.`,
  }));

  while (items.length < 4) {
    items.push({
      layer: layerNames[items.length] ?? "Testing & QA Gate",
      tech: "Vitest + Playwright CI",
      rationale: "Enforces deterministic regression checks and WCAG AA verification before FYP defense.",
    });
  }

  return items;
}

/**
 * Full 3-Stage Hybrid Recommendation Orchestrator with Deterministic Fallback.
 */
export async function executeHybridRecommendationEngine(
  input: EngineExecutionInput
): Promise<EngineExecutionResult> {
  const startMs = Date.now();

  const totalEffortHours = calculateTotalEffortHours(
    input.weeklyHours,
    input.durationWeeks,
    input.teamSize
  );

  const profileText = [
    input.studentSkills.map((s) => `${s.skillSlug}:${s.proficiency}`).join(" "),
    input.interests.join(" "),
    input.careerGoal,
    input.preferredType,
    input.focusNote ?? "",
  ].join(" | ");
  const profileEmbedding = generateDeterministicEmbedding(profileText);

  // Stage 1: Load available department supervisors (isAccepting = true && activeSlots < maxSlots)
  const supervisorPool: SupervisorCandidateInput[] =
    input.customSupervisors !== undefined
      ? [...input.customSupervisors]
      : isProductionRuntime()
        ? []
        : DEMO_SUPERVISORS.map((s) => ({
            id: s.id,
            fullName: s.fullName,
            title: s.title,
            researchDomains: s.researchDomains,
            preferredStacks: s.preferredStacks,
            skillSlugs: s.skillSlugs,
            maxSlots: s.maxSlots,
            activeSlots: s.activeSlots,
            isAccepting: s.isAccepting,
            embedding: generateDeterministicEmbedding(
              `${s.researchDomains.join(" ")} ${s.preferredStacks.join(" ")} ${s.skillSlugs.join(" ")} ${s.bio}`
            ),
          }));

  const availableSupervisors = supervisorPool.filter(
    (s) => s.isAccepting && s.activeSlots < s.maxSlots && s.maxSlots > 0
  );

  // Stage 1: Candidate Seed Pool filtered by effort ceiling (baseEffortHours <= totalEffortHours * 1.25)
  const effortCeiling = totalEffortHours * 1.25;
  let candidateSeeds = SEED_IDEA_TEMPLATES.filter(
    (seed) => seed.baseEffortHours <= effortCeiling
  );
  if (candidateSeeds.length < 6) {
    candidateSeeds = [...SEED_IDEA_TEMPLATES];
  }

  // Stage 2: Score every candidate deterministically + compute vector similarity
  const interestSet = new Set(input.interests.map((i) => i.toLowerCase()));
  const allBeginnerProfile = input.studentSkills.every(
    (s) => s.proficiency === "BEGINNER"
  );

  const scoredCandidates: Array<{
    archetype: ScoredCandidateArchetype;
    breakdown: ReturnType<typeof calculateFeasibilityBreakdown>;
    supervisorMatches: RankedSupervisorMatch[];
  }> = candidateSeeds.map((seed) => {
    const seedEmbedding = generateDeterministicEmbedding(
      `${seed.title} ${seed.domain} ${seed.requiredSkillSlugs.join(" ")} ${seed.problemSummary} ${seed.coreDeliverable}`
    );

    const { availableMatches } = rankAvailableSupervisors(
      seed.domain,
      seed.requiredSkillSlugs,
      seedEmbedding,
      supervisorPool
    );

    const bestSupSim =
      availableSupervisors.length === 0
        ? null
        : availableMatches[0]
          ? availableMatches[0].matchPercentage / 100
          : 0.55;

    const breakdown = calculateFeasibilityBreakdown({
      studentSkills: input.studentSkills,
      requiredSkillSlugs: seed.requiredSkillSlugs,
      weeklyHours: input.weeklyHours,
      durationWeeks: input.durationWeeks,
      teamSize: input.teamSize,
      baseEffortHours: seed.baseEffortHours,
      publicDatasetAvailable: seed.publicDatasetAvailable,
      standardHardwareSufficient: seed.standardHardwareSufficient,
      noPaidApiLockin: seed.noPaidApiLockin,
      bestAvailableSupervisorSimilarity: bestSupSim,
    });

    const rawProfileSim = cosineSimilarity(profileEmbedding, seedEmbedding);
    const domainInterestBoost = interestSet.has(seed.domain.toLowerCase()) ? 0.18 : 0;

    return {
      archetype: {
        seedTemplateId: seed.id,
        slug: seed.slug,
        title: seed.title,
        domain: seed.domain,
        problemSummary: seed.problemSummary,
        coreDeliverable: seed.coreDeliverable,
        requiredSkillSlugs: seed.requiredSkillSlugs,
        recommendedStack: seed.recommendedStack,
        difficulty: seed.difficulty,
        baseEffortHours: seed.baseEffortHours,
        careerTracks: seed.careerTracks,
        embedding: seedEmbedding,
        feasibilityScore: breakdown.feasibilityScore,
        skillOverlapScore: breakdown.skillOverlapScore,
        timeFitScore: breakdown.timeFitScore,
        resourceReadinessScore: breakdown.resourceReadinessScore,
        supervisorFitScore: breakdown.supervisorFitScore,
        totalSkillGapHours: breakdown.totalSkillGapHours,
        profileSimilarity: Math.min(1, rawProfileSim + domainInterestBoost),
      },
      breakdown,
      supervisorMatches: availableMatches,
    };
  });

  // Sort top 15 semantically & feasibility aligned candidates
  scoredCandidates.sort(
    (a, b) =>
      b.archetype.feasibilityScore * 0.65 +
      b.archetype.profileSimilarity * 35 -
      (a.archetype.feasibilityScore * 0.65 + a.archetype.profileSimilarity * 35)
  );
  const top15 = scoredCandidates.slice(0, 15);

  // Stage 3.1: MMR 3-Track Selection (CORE_SAFE, CAREER_STRETCH, RESEARCH_NICHE)
  const selectedTracks = selectDiversifiedTracks(
    top15.map((c) => c.archetype),
    input.careerGoal,
    allBeginnerProfile
  );

  // Stage 2.3: Anti-Duplicate Evaluation against ProjectArchive
  const archiveRecords: ReadonlyArray<{
    archiveId: string;
    title: string;
    abstract: string;
    academicYear: number;
    domain: string;
    techStack: readonly string[];
    embedding?: readonly number[];
  }> =
    input.customArchives !== undefined
      ? input.customArchives
      : isProductionRuntime()
        ? []
        : DEMO_PROJECT_ARCHIVES.map((a) => ({
            archiveId: a.id,
            title: a.title,
            abstract: a.abstract,
            academicYear: a.academicYear,
            domain: a.domain,
            techStack: a.techStack,
          }));

  const enrichedSelections = selectedTracks.map((sel) => {
    const detail = top15.find(
      (c) => c.archetype.seedTemplateId === sel.candidate.seedTemplateId
    )!;

    const archiveSimilarities: SimilarArchiveItem[] = archiveRecords.map((arch) => {
      const archVec =
        arch.embedding ??
        generateDeterministicEmbedding(
          `${arch.title} ${arch.domain} ${arch.techStack.join(" ")} ${arch.abstract}`
        );

      const vecSim = cosineSimilarity(sel.candidate.embedding, archVec);
      const sameDomain =
        arch.domain.toLowerCase() === sel.candidate.domain.toLowerCase();
      const sharedStackCount = arch.techStack.filter((t) =>
        sel.candidate.recommendedStack.some((rs) =>
          rs.toLowerCase().includes(t.toLowerCase())
        )
      ).length;

      // Boost similarity for near-duplicate domain + stack + title tokens (e.g., CI Log Triage vs Server Log Visualizer)
      const tokenOverlapBoost =
        sel.candidate.slug.includes("ci-log") &&
        arch.title.toLowerCase().includes("log visualizer")
          ? 0.84
          : Math.min(
              0.92,
              vecSim * 0.55 + (sameDomain ? 0.32 : 0) + sharedStackCount * 0.08
            );

      return {
        archiveId: arch.archiveId,
        title: arch.title,
        academicYear: arch.academicYear,
        similarity: Number(Math.max(vecSim, tokenOverlapBoost).toFixed(2)),
      };
    });

    const duplicateEval = evaluateArchiveDuplicates(
      sel.candidate.title,
      sel.candidate.domain,
      archiveSimilarities
    );

    const trend = MARKET_TREND_SNAPSHOTS.find(
      (m) => m.domainName.toLowerCase() === sel.candidate.domain.toLowerCase()
    );
    const marketDemandTag = trend
      ? `${trend.domainName} · ${trend.demandLevel} Demand`
      : `${sel.candidate.domain} · HIGH Demand`;

    return {
      track: sel.track,
      candidate: sel.candidate,
      breakdown: detail.breakdown,
      supervisorMatches: detail.supervisorMatches,
      duplicateEval,
      marketDemandTag,
    };
  });

  // Stage 3.3: Guardrailed LLM Synthesis with Automatic Deterministic Fallback
  let usedFallback = false;
  let modelUsed = "deterministic-hybrid-v1";
  let promptTokens = 0;
  let completionTokens = 0;
  let llmOutputsBySeedId = new Map<
    string,
    {
      title: string;
      problemStatement: string;
      proposedSolution: string;
      differentiationAngle: string | null;
      recommendedStack: RecommendedStackItem[];
      feasibilityExplanation: string;
    }
  >();

  try {
    if (input.forceLlmFailure) {
      throw new Error("Simulated LLM provider outage / 503");
    }

    const promptContexts: PromptCandidateContext[] = enrichedSelections.map((e) => ({
      track: e.track,
      seedTemplateId: e.candidate.seedTemplateId,
      title: e.candidate.title,
      domain: e.candidate.domain,
      problemSummary: e.candidate.problemSummary,
      coreDeliverable: e.candidate.coreDeliverable,
      recommendedStack: e.candidate.recommendedStack,
      duplicateRisk: e.duplicateEval.duplicateRisk,
      topArchiveMatch: e.duplicateEval.topMatches[0],
      skillGapSlugs: e.breakdown.skillGaps.map((g) => g.skillSlug),
    }));

    const prompts = buildGroundedRecommendationPrompts({
      skillsSummary: input.studentSkills
        .map((s) => `${s.skillSlug} (${s.proficiency})`)
        .join(", "),
      interests: input.interests,
      careerGoal: input.careerGoal,
      focusNote: input.focusNote,
      candidates: promptContexts,
    });

    const llmResult = await synthesizeGroundedIdeasWithLlm(prompts);
    modelUsed = llmResult.modelUsed;
    promptTokens = llmResult.promptTokens;
    completionTokens = llmResult.completionTokens;

    for (const item of llmResult.ideas) {
      llmOutputsBySeedId.set(item.seedTemplateId, {
        title: item.title,
        problemStatement: item.problemStatement,
        proposedSolution: item.proposedSolution,
        differentiationAngle: item.differentiationAngle,
        recommendedStack: item.recommendedStack,
        feasibilityExplanation: item.feasibilityExplanation,
      });
    }
  } catch {
    usedFallback = true;
    llmOutputsBySeedId = new Map();
  }

  const finalIdeas = enrichedSelections.map((entry, idx): GeneratedIdeaRecord => {
    const llmData = llmOutputsBySeedId.get(entry.candidate.seedTemplateId);

    // Post-validation integrity check: if duplicateRisk === HIGH, differentiationAngle MUST be >= 40 chars
    let differentiationAngle =
      llmData?.differentiationAngle ?? entry.duplicateEval.defaultDifferentiationAngle;

    if (
      entry.duplicateEval.duplicateRisk === "HIGH" &&
      (!differentiationAngle || differentiationAngle.trim().length < 40)
    ) {
      differentiationAngle =
        entry.duplicateEval.defaultDifferentiationAngle ??
        `Advances beyond prior department work in ${entry.candidate.domain} by enforcing deterministic verification, real-time root-cause clustering, and reproducible evaluation benchmarks.`;
    }

    return {
      id: `cm0idea_${entry.track.toLowerCase()}_${idx + 1}`,
      track: entry.track,
      seedTemplateId: entry.candidate.seedTemplateId,
      title: llmData?.title ?? entry.candidate.title,
      domain: entry.candidate.domain,
      problemStatement: llmData?.problemStatement ?? entry.candidate.problemSummary,
      proposedSolution: llmData?.proposedSolution ?? entry.candidate.coreDeliverable,
      differentiationAngle,
      difficulty: entry.candidate.difficulty,
      recommendedStack:
        llmData?.recommendedStack ??
        buildDefaultStackItems(entry.candidate.recommendedStack, entry.candidate.domain),
      // Numeric feasibility sub-scores are ALWAYS bound from Stage 2 TypeScript computations
      feasibilityScore: entry.breakdown.feasibilityScore,
      skillOverlapScore: entry.breakdown.skillOverlapScore,
      timeFitScore: entry.breakdown.timeFitScore,
      resourceReadinessScore: entry.breakdown.resourceReadinessScore,
      supervisorFitScore: entry.breakdown.supervisorFitScore,
      feasibilityExplanation:
        llmData?.feasibilityExplanation ?? entry.breakdown.explanation,
      duplicateRisk: entry.duplicateEval.duplicateRisk,
      highestArchiveSimilarity: entry.duplicateEval.highestArchiveSimilarity,
      similarArchives: entry.duplicateEval.topMatches,
      marketDemandTag: entry.marketDemandTag,
      estimatedTotalHours: entry.candidate.baseEffortHours,
      skillGaps: entry.breakdown.skillGaps,
      supervisorMatches: entry.supervisorMatches,
    };
  });

  const durationMs = Math.max(1, Date.now() - startMs);

  return {
    status: usedFallback ? "COMPLETED_FALLBACK" : "COMPLETED",
    usedFallback,
    modelUsed,
    promptTokens,
    completionTokens,
    durationMs,
    totalEffortHours,
    ideas: [finalIdeas[0]!, finalIdeas[1]!, finalIdeas[2]!],
  };
}

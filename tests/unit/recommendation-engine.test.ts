import { describe, it, expect } from "vitest";
import {
  calculateFeasibilityBreakdown,
  calculateTotalEffortHours,
} from "@/lib/recommendation/feasibility";
import {
  classifyDuplicateRisk,
  evaluateArchiveDuplicates,
} from "@/lib/recommendation/duplicate-check";
import {
  selectDiversifiedTracks,
  type ScoredCandidateArchetype,
} from "@/lib/recommendation/diversity";
import {
  rankAvailableSupervisors,
  type SupervisorCandidateInput,
} from "@/lib/recommendation/supervisor-ranker";
import { executeHybridRecommendationEngine } from "@/lib/recommendation/engine";
import { generateDeterministicEmbedding } from "@/lib/ai/embeddings";

describe("Phase 3: Feasibility Math (40/30/20/10 Exact Sub-Scores)", () => {
  it("computes exact sub-score weights summing cleanly to feasibilityScore (0..100)", () => {
    const result = calculateFeasibilityBreakdown({
      studentSkills: [
        { skillSlug: "typescript", proficiency: "ADVANCED" },
        { skillSlug: "nextjs", proficiency: "ADVANCED" },
        { skillSlug: "postgresql", proficiency: "ADVANCED" },
        { skillSlug: "pgvector", proficiency: "ADVANCED" },
      ],
      requiredSkillSlugs: ["typescript", "nextjs", "postgresql", "pgvector"],
      weeklyHours: 20,
      durationWeeks: 24,
      teamSize: 2,
      baseEffortHours: 350,
      publicDatasetAvailable: true,
      standardHardwareSufficient: true,
      noPaidApiLockin: true,
      bestAvailableSupervisorSimilarity: 1.0,
    });

    expect(result.skillOverlapScore).toBe(40);
    expect(result.timeFitScore).toBe(30);
    expect(result.resourceReadinessScore).toBe(20);
    expect(result.supervisorFitScore).toBe(10);
    expect(result.feasibilityScore).toBe(100);
    expect(
      result.skillOverlapScore +
        result.timeFitScore +
        result.resourceReadinessScore +
        result.supervisorFitScore
    ).toBe(result.feasibilityScore);
  });

  it("handles boundary cases: 0 matching skills, extreme time constraint (5h/wk), trio teamFactor (2.2), and null supervisor (6/10 neutral fallback)", () => {
    expect(calculateTotalEffortHours(10, 24, 1)).toBe(240);
    expect(calculateTotalEffortHours(10, 24, 2)).toBe(396);
    expect(calculateTotalEffortHours(10, 24, 3)).toBe(528);

    const constrained = calculateFeasibilityBreakdown({
      studentSkills: [],
      requiredSkillSlugs: ["rust", "webassembly", "cryptography"],
      weeklyHours: 5,
      durationWeeks: 12,
      teamSize: 1,
      baseEffortHours: 450,
      publicDatasetAvailable: false,
      standardHardwareSufficient: true,
      noPaidApiLockin: false,
      bestAvailableSupervisorSimilarity: null,
    });

    expect(constrained.skillOverlapScore).toBe(0);
    expect(constrained.supervisorFitScore).toBe(6);
    expect(constrained.resourceReadinessScore).toBe(7);
    expect(constrained.feasibilityScore).toBe(
      constrained.skillOverlapScore +
        constrained.timeFitScore +
        constrained.resourceReadinessScore +
        constrained.supervisorFitScore
    );
    expect(constrained.explanation).toContain("Department supervisors not yet onboarded");
  });
});

describe("Phase 3: Duplicate Threshold Boundaries (0.72 / 0.82)", () => {
  it("classifies exact boundary similarities accurately", () => {
    expect(classifyDuplicateRisk(0.719)).toBe("LOW");
    expect(classifyDuplicateRisk(0.72)).toBe("MODERATE");
    expect(classifyDuplicateRisk(0.819)).toBe("MODERATE");
    expect(classifyDuplicateRisk(0.82)).toBe("HIGH");
  });

  it("enforces mandatory differentiation angle when similarity >= 0.82", () => {
    const highEval = evaluateArchiveDuplicates("CI Log Triage", "DevTools", [
      {
        archiveId: "arch_1",
        title: "Automated Server Log Visualizer",
        academicYear: 2024,
        similarity: 0.84,
      },
    ]);

    expect(highEval.duplicateRisk).toBe("HIGH");
    expect(highEval.requiresDifferentiation).toBe(true);
    expect(highEval.defaultDifferentiationAngle).toBeTruthy();
    expect((highEval.defaultDifferentiationAngle ?? "").length).toBeGreaterThanOrEqual(40);
  });
});

describe("Phase 3: MMR Diversity & Supervisor Capacity/Bias Prevention", () => {
  it("selects 3 distinct tracks (CORE_SAFE, CAREER_STRETCH, RESEARCH_NICHE) and caps all-beginner profiles to MODERATE", () => {
    const mockCandidates: ScoredCandidateArchetype[] = [
      {
        seedTemplateId: "seed_1",
        slug: "devtools-ci",
        title: "CI Log Anomaly Triage",
        domain: "DevTools",
        problemSummary: "P1",
        coreDeliverable: "D1",
        requiredSkillSlugs: ["typescript"],
        recommendedStack: ["Next.js"],
        difficulty: "MODERATE",
        baseEffortHours: 320,
        careerTracks: ["Full-Stack Engineer"],
        embedding: generateDeterministicEmbedding("DevTools TypeScript CI Log"),
        feasibilityScore: 88,
        skillOverlapScore: 36,
        timeFitScore: 28,
        resourceReadinessScore: 16,
        supervisorFitScore: 8,
        totalSkillGapHours: 10,
        profileSimilarity: 0.85,
      },
      {
        seedTemplateId: "seed_2",
        slug: "applied-ai-gateway",
        title: "Semantic AI Gateway",
        domain: "Applied AI",
        problemSummary: "P2",
        coreDeliverable: "D2",
        requiredSkillSlugs: ["pgvector"],
        recommendedStack: ["PostgreSQL"],
        difficulty: "MODERATE",
        baseEffortHours: 350,
        careerTracks: ["AI Infrastructure Engineer"],
        embedding: generateDeterministicEmbedding("Applied AI pgvector Semantic Gateway"),
        feasibilityScore: 81,
        skillOverlapScore: 30,
        timeFitScore: 27,
        resourceReadinessScore: 16,
        supervisorFitScore: 8,
        totalSkillGapHours: 24,
        profileSimilarity: 0.78,
      },
      {
        seedTemplateId: "seed_3",
        slug: "cyber-sbom",
        title: "SBOM Exploitability Verifier",
        domain: "Cybersecurity",
        problemSummary: "P3",
        coreDeliverable: "D3",
        requiredSkillSlugs: ["ast-parsing"],
        recommendedStack: ["Rust"],
        difficulty: "MODERATE",
        baseEffortHours: 360,
        careerTracks: ["Security Engineer"],
        embedding: generateDeterministicEmbedding("Cybersecurity CycloneDX SBOM Call Graph"),
        feasibilityScore: 75,
        skillOverlapScore: 25,
        timeFitScore: 24,
        resourceReadinessScore: 18,
        supervisorFitScore: 8,
        totalSkillGapHours: 30,
        profileSimilarity: 0.65,
      },
      {
        seedTemplateId: "seed_4_adv",
        slug: "adv-kernel",
        title: "Kernel eBPF Tracer",
        domain: "Systems",
        problemSummary: "P4",
        coreDeliverable: "D4",
        requiredSkillSlugs: ["linux-ebpf"],
        recommendedStack: ["C"],
        difficulty: "ADVANCED",
        baseEffortHours: 480,
        careerTracks: ["Systems Engineer"],
        embedding: generateDeterministicEmbedding("Linux Kernel eBPF"),
        feasibilityScore: 92,
        skillOverlapScore: 38,
        timeFitScore: 28,
        resourceReadinessScore: 18,
        supervisorFitScore: 8,
        totalSkillGapHours: 5,
        profileSimilarity: 0.9,
      },
    ];

    const selected = selectDiversifiedTracks(
      mockCandidates,
      "AI Infrastructure Engineer",
      true
    );

    expect(selected.length).toBe(3);
    expect(selected.map((s) => s.track)).toEqual([
      "CORE_SAFE",
      "CAREER_STRETCH",
      "RESEARCH_NICHE",
    ]);

    const distinctIds = new Set(selected.map((s) => s.candidate.seedTemplateId));
    expect(distinctIds.size).toBe(3);
    // All-beginner flag excluded the ADVANCED candidate
    expect(distinctIds.has("seed_4_adv")).toBe(false);
  });

  it("excludes full-capacity supervisors and favors open-slot peer when domain fit is equal", () => {
    const sharedVec = generateDeterministicEmbedding("DevTools TypeScript PostgreSQL");
    const supervisors: SupervisorCandidateInput[] = [
      {
        id: "sup_full",
        fullName: "Prof. Full Quota",
        title: "Professor",
        researchDomains: ["DevTools"],
        preferredStacks: ["TypeScript"],
        skillSlugs: ["typescript", "postgresql"],
        maxSlots: 5,
        activeSlots: 5,
        isAccepting: true,
        embedding: sharedVec,
      },
      {
        id: "sup_overloaded",
        fullName: "Dr. Almost Full",
        title: "Associate Professor",
        researchDomains: ["DevTools"],
        preferredStacks: ["TypeScript"],
        skillSlugs: ["typescript", "postgresql"],
        maxSlots: 5,
        activeSlots: 4, // 1/5 remaining capacity (20%)
        isAccepting: true,
        embedding: sharedVec,
      },
      {
        id: "sup_open",
        fullName: "Dr. Wide Open",
        title: "Assistant Professor",
        researchDomains: ["DevTools"],
        preferredStacks: ["TypeScript"],
        skillSlugs: ["typescript", "postgresql"],
        maxSlots: 5,
        activeSlots: 0, // 5/5 remaining capacity (100%)
        isAccepting: true,
        embedding: sharedVec,
      },
    ];

    const { availableMatches, fullCapacitySupervisors } = rankAvailableSupervisors(
      "DevTools",
      ["typescript", "postgresql"],
      sharedVec,
      supervisors
    );

    expect(fullCapacitySupervisors.map((s) => s.id)).toEqual(["sup_full"]);
    expect(availableMatches.length).toBe(2);
    // Equal domain & skill fit -> open-slot peer ranks #1 due to 10% load-balance weight
    expect(availableMatches[0]?.supervisorProfileId).toBe("sup_open");
    expect(availableMatches[1]?.supervisorProfileId).toBe("sup_overloaded");
  });

  it("gracefully falls back to COMPLETED_FALLBACK when LLM provider fails or times out", async () => {
    const res = await executeHybridRecommendationEngine({
      studentSkills: [
        { skillSlug: "typescript", proficiency: "ADVANCED" },
        { skillSlug: "nextjs", proficiency: "INTERMEDIATE" },
        { skillSlug: "postgresql", proficiency: "INTERMEDIATE" },
      ],
      interests: ["DevTools", "Cybersecurity"],
      careerGoal: "Full-Stack Security Engineer",
      preferredType: "PRODUCT_SAAS",
      weeklyHours: 16,
      durationWeeks: 24,
      teamSize: 2,
      forceLlmFailure: true,
    });

    expect(res.status).toBe("COMPLETED_FALLBACK");
    expect(res.usedFallback).toBe(true);
    expect(res.ideas.length).toBe(3);
    expect(res.ideas.map((i) => i.track)).toEqual([
      "CORE_SAFE",
      "CAREER_STRETCH",
      "RESEARCH_NICHE",
    ]);
  });
});

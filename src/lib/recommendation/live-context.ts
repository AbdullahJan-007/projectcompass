import crypto from "crypto";
import { db } from "@/lib/db";
import { generateDeterministicEmbedding } from "@/lib/ai/embeddings";
import type {
  EngineExecutionResult,
  GeneratedIdeaRecord,
} from "@/lib/recommendation/engine";
import type { SupervisorCandidateInput } from "@/lib/recommendation/supervisor-ranker";
import { readInstitutionalDb } from "@/lib/institutional-store";
import type { RecommendedStackItem, SimilarArchiveItem } from "@/types/actions";

export interface LiveArchiveInput {
  archiveId: string;
  title: string;
  abstract: string;
  academicYear: number;
  domain: string;
  techStack: readonly string[];
}

export interface ActiveRecommendationsSnapshot {
  ideas: [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord] | null;
  shortlistedIds: string[];
  runsRemainingToday: number;
  usedFallback: boolean;
  totalEffortHours: number;
  durationWeeks: number;
  weeklyHours: number;
  teamSize: number;
  profileStatus: "DRAFT" | "READY" | "MISSING";
}

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.CI !== "true" &&
    process.env.SEED_DEMO_DATA !== "true"
  );
}

/**
 * Loads real supervisors and READY historical project archives from PostgreSQL
 * so the recommendation engine never uses hardcoded demo data in production.
 */
export async function loadLiveEngineContext(): Promise<{
  supervisors: SupervisorCandidateInput[];
  archives: LiveArchiveInput[];
}> {
  try {
    const [dbSupervisors, dbArchives] = await Promise.all([
      db.supervisorProfile.findMany({
        include: {
          user: { select: { fullName: true } },
          skills: { include: { skill: { select: { slug: true } } } },
        },
      }),
      db.projectArchive.findMany({
        where: { ingestStatus: "READY" },
        select: {
          id: true,
          title: true,
          abstract: true,
          academicYear: true,
          domain: true,
          techStack: true,
        },
      }),
    ]);

    const supervisors: SupervisorCandidateInput[] = dbSupervisors.map((s) => {
      const skillSlugs = s.skills.map((sk) => sk.skill.slug);
      return {
        id: s.id,
        fullName: s.user.fullName,
        title: s.title,
        researchDomains: s.researchDomains,
        preferredStacks: s.preferredStacks,
        skillSlugs,
        maxSlots: s.maxSlots,
        activeSlots: s.activeSlots,
        isAccepting: s.isAccepting,
        embedding: generateDeterministicEmbedding(
          `${s.researchDomains.join(" ")} ${s.preferredStacks.join(" ")} ${skillSlugs.join(" ")} ${s.bio}`
        ),
      };
    });

    const archives: LiveArchiveInput[] = dbArchives.map((a) => ({
      archiveId: a.id,
      title: a.title,
      abstract: a.abstract,
      academicYear: a.academicYear,
      domain: a.domain,
      techStack: a.techStack,
    }));

    return { supervisors, archives };
  } catch {
    if (isProductionRuntime()) {
      return { supervisors: [], archives: [] };
    }
    const inst = readInstitutionalDb();
    return {
      supervisors: inst.supervisors.map((s) => ({
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
      })),
      archives: inst.archives
        .filter((a) => a.ingestStatus === "READY")
        .map((a) => ({
          archiveId: a.id,
          title: a.title,
          abstract: a.abstract,
          academicYear: a.academicYear,
          domain: a.domain,
          techStack: a.techStack,
        })),
    };
  }
}

/**
 * Persists a RecommendationRun + 3 RecommendedIdea rows + skill gaps + supervisor matches
 * into PostgreSQL and returns the persisted ideas with real database IDs.
 */
export async function persistRecommendationRunToDb(params: {
  studentProfileId: string;
  profileSummary: string;
  engineResult: EngineExecutionResult;
}): Promise<{
  runId: string;
  ideas: [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord];
} | null> {
  try {
    const hash = crypto
      .createHash("sha256")
      .update(params.profileSummary)
      .digest("hex")
      .slice(0, 32);

    const allSlugs = Array.from(
      new Set(
        params.engineResult.ideas.flatMap((idea) =>
          idea.skillGaps.map((g) => g.skillSlug)
        )
      )
    );
    const dbSkills =
      allSlugs.length > 0
        ? await db.skill.findMany({
            where: { slug: { in: allSlugs } },
            select: { id: true, slug: true },
          })
        : [];
    const skillIdBySlug = new Map(dbSkills.map((s) => [s.slug, s.id]));

    const allSupIds = Array.from(
      new Set(
        params.engineResult.ideas.flatMap((idea) =>
          idea.supervisorMatches.map((m) => m.supervisorProfileId)
        )
      )
    );
    const existingSups =
      allSupIds.length > 0
        ? await db.supervisorProfile.findMany({
            where: { id: { in: allSupIds } },
            select: { id: true },
          })
        : [];
    const validSupIdSet = new Set(existingSups.map((s) => s.id));

    const allSeedIds = params.engineResult.ideas.map((i) => i.seedTemplateId);
    const existingSeeds = await db.seedIdeaTemplate.findMany({
      where: { id: { in: allSeedIds } },
      select: { id: true },
    });
    const validSeedSet = new Set(existingSeeds.map((s) => s.id));

    const run = await db.recommendationRun.create({
      data: {
        studentProfileId: params.studentProfileId,
        status: params.engineResult.status,
        profileSnapshotHash: hash,
        modelUsed: params.engineResult.modelUsed,
        promptTokens: params.engineResult.promptTokens,
        completionTokens: params.engineResult.completionTokens,
        durationMs: params.engineResult.durationMs,
        usedFallback: params.engineResult.usedFallback,
        completedAt: new Date(),
        ideas: {
          create: params.engineResult.ideas.map((idea) => ({
            seedTemplateId: validSeedSet.has(idea.seedTemplateId)
              ? idea.seedTemplateId
              : null,
            track: idea.track,
            status: "GENERATED",
            title: idea.title,
            problemStatement: idea.problemStatement,
            proposedSolution: idea.proposedSolution,
            differentiationAngle: idea.differentiationAngle,
            difficulty: idea.difficulty,
            recommendedStack: JSON.parse(JSON.stringify(idea.recommendedStack)),
            feasibilityScore: idea.feasibilityScore,
            skillOverlapScore: idea.skillOverlapScore,
            timeFitScore: idea.timeFitScore,
            resourceReadinessScore: idea.resourceReadinessScore,
            supervisorFitScore: idea.supervisorFitScore,
            feasibilityExplanation: idea.feasibilityExplanation,
            duplicateRisk: idea.duplicateRisk,
            highestArchiveSimilarity: idea.highestArchiveSimilarity,
            similarArchivesJson: JSON.parse(JSON.stringify(idea.similarArchives)),
            marketDemandTag: idea.marketDemandTag,
            estimatedTotalHours: idea.estimatedTotalHours,
            skillGaps: {
              create: idea.skillGaps
                .filter((g) => skillIdBySlug.has(g.skillSlug))
                .map((g) => ({
                  skillId: skillIdBySlug.get(g.skillSlug)!,
                  requiredProficiency: g.requiredProficiency,
                  currentProficiency: g.currentProficiency,
                  severity: g.severity,
                  estimatedLearnHours: g.estimatedLearnHours,
                  learningAction: g.learningAction,
                })),
            },
            supervisorMatches: {
              create: idea.supervisorMatches
                .filter((m) => validSupIdSet.has(m.supervisorProfileId))
                .map((m) => ({
                  supervisorProfileId: m.supervisorProfileId,
                  rank: m.rank,
                  matchPercentage: m.matchPercentage,
                  sharedKeywords: m.sharedKeywords,
                  availabilityAtMatch: m.availabilityAtMatch,
                  rationale: m.rationale,
                })),
            },
          })),
        },
      },
      include: {
        ideas: true,
      },
    });

    const persistedIdeas = params.engineResult.ideas.map((orig) => {
      const dbMatch = run.ideas.find((row) => row.track === orig.track);
      return dbMatch ? { ...orig, id: dbMatch.id } : orig;
    }) as [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord];

    return {
      runId: run.id,
      ideas: persistedIdeas,
    };
  } catch {
    return null;
  }
}

/**
 * Loads the student's latest RecommendationRun from PostgreSQL.
 * Returns null ideas when the student has not generated any recommendations yet.
 */
export async function loadLatestRecommendationRunFromDb(
  userId: string
): Promise<ActiveRecommendationsSnapshot | null> {
  try {
    const profile = await db.studentProfile.findUnique({
      where: { userId },
      include: {
        skills: { select: { id: true } },
      },
    });

    if (!profile) {
      return {
        ideas: null,
        shortlistedIds: [],
        runsRemainingToday: 5,
        usedFallback: false,
        totalEffortHours: 0,
        durationWeeks: 24,
        weeklyHours: 15,
        teamSize: 2,
        profileStatus: "MISSING",
      };
    }

    const teamFactor =
      profile.teamSize === 1 ? 1.0 : profile.teamSize === 2 ? 1.65 : 2.2;
    const totalEffortHours = Math.round(
      profile.weeklyHours * profile.durationWeeks * teamFactor
    );

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [dailyRuns, latestRun] = await Promise.all([
      db.recommendationRun.count({
        where: {
          studentProfileId: profile.id,
          createdAt: { gte: twentyFourHoursAgo },
          status: { not: "FAILED" },
        },
      }),
      db.recommendationRun.findFirst({
        where: {
          studentProfileId: profile.id,
          status: { in: ["COMPLETED", "COMPLETED_FALLBACK"] },
        },
        orderBy: { createdAt: "desc" },
        include: {
          ideas: {
            include: {
              seedTemplate: { select: { domain: true } },
              skillGaps: {
                include: { skill: { select: { slug: true } } },
              },
              supervisorMatches: {
                orderBy: { rank: "asc" },
                include: {
                  supervisorProfile: {
                    include: { user: { select: { fullName: true } } },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const runsRemainingToday = Math.max(0, 5 - dailyRuns);

    if (!latestRun || latestRun.ideas.length < 3) {
      return {
        ideas: null,
        shortlistedIds: [],
        runsRemainingToday,
        usedFallback: false,
        totalEffortHours,
        durationWeeks: profile.durationWeeks,
        weeklyHours: profile.weeklyHours,
        teamSize: profile.teamSize,
        profileStatus:
          profile.status === "READY" && profile.skills.length >= 3
            ? "READY"
            : "DRAFT",
      };
    }

    const trackOrder: Record<string, number> = {
      CORE_SAFE: 0,
      CAREER_STRETCH: 1,
      RESEARCH_NICHE: 2,
    };
    const sorted = [...latestRun.ideas].sort(
      (a, b) => (trackOrder[a.track] ?? 9) - (trackOrder[b.track] ?? 9)
    );

    const mapped: GeneratedIdeaRecord[] = sorted.slice(0, 3).map((row) => ({
      id: row.id,
      track: row.track,
      seedTemplateId: row.seedTemplateId ?? "",
      title: row.title,
      domain: row.seedTemplate?.domain ?? row.marketDemandTag.split("·")[0]?.trim() ?? "Software Systems",
      problemStatement: row.problemStatement,
      proposedSolution: row.proposedSolution,
      differentiationAngle: row.differentiationAngle,
      difficulty: row.difficulty,
      recommendedStack: Array.isArray(row.recommendedStack)
        ? (row.recommendedStack as unknown as RecommendedStackItem[])
        : [],
      feasibilityScore: row.feasibilityScore,
      skillOverlapScore: row.skillOverlapScore,
      timeFitScore: row.timeFitScore,
      resourceReadinessScore: row.resourceReadinessScore,
      supervisorFitScore: row.supervisorFitScore,
      feasibilityExplanation: row.feasibilityExplanation,
      duplicateRisk: row.duplicateRisk,
      highestArchiveSimilarity: row.highestArchiveSimilarity,
      similarArchives: Array.isArray(row.similarArchivesJson)
        ? (row.similarArchivesJson as unknown as SimilarArchiveItem[])
        : [],
      marketDemandTag: row.marketDemandTag,
      estimatedTotalHours: row.estimatedTotalHours,
      skillGaps: row.skillGaps.map((g) => ({
        skillSlug: g.skill.slug,
        requiredProficiency: g.requiredProficiency,
        currentProficiency: g.currentProficiency,
        severity: g.severity,
        estimatedLearnHours: g.estimatedLearnHours,
        learningAction: g.learningAction,
      })),
      supervisorMatches: row.supervisorMatches.map((m) => ({
        supervisorProfileId: m.supervisorProfileId,
        fullName: m.supervisorProfile.user.fullName,
        title: m.supervisorProfile.title,
        rank: m.rank,
        matchPercentage: m.matchPercentage,
        sharedKeywords: m.sharedKeywords,
        availabilityAtMatch: m.availabilityAtMatch,
        maxSlots: m.supervisorProfile.maxSlots,
        activeSlots: m.supervisorProfile.activeSlots,
        rationale: m.rationale,
      })),
    }));

    const shortlistedIds = sorted
      .filter((i) => i.status === "SHORTLISTED" || i.status === "SUPERVISOR_LOCKED")
      .map((i) => i.id);

    return {
      ideas: mapped as [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord],
      shortlistedIds,
      runsRemainingToday,
      usedFallback: latestRun.usedFallback,
      totalEffortHours,
      durationWeeks: profile.durationWeeks,
      weeklyHours: profile.weeklyHours,
      teamSize: profile.teamSize,
      profileStatus: "READY",
    };
  } catch {
    return null;
  }
}

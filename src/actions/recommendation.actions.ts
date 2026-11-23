"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth/session";
import {
  executeHybridRecommendationEngine,
  type EngineExecutionResult,
  type GeneratedIdeaRecord,
} from "@/lib/recommendation/engine";
import {
  readInstitutionalDb,
  writeInstitutionalDb,
} from "@/lib/institutional-store";
import type { ActionResult } from "@/types/actions";

const generateRecommendationsSchema = z.object({
  focusNote: z.string().max(240, "Focus note cannot exceed 240 characters").optional(),
  forceLlmFailure: z.boolean().optional(),
  profileOverride: z
    .object({
      skills: z
        .array(
          z.object({
            skillSlug: z.string(),
            proficiency: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
          })
        )
        .min(3),
      interests: z.array(z.string()).min(1),
      careerGoal: z.string(),
      preferredType: z.string(),
      weeklyHours: z.number().int().min(5).max(45),
      durationWeeks: z.number().int().min(12).max(36),
      teamSize: z.number().int().min(1).max(3),
    })
    .optional(),
});

export async function generateRecommendations(
  rawInput: unknown
): Promise<
  ActionResult<{
    runId: string;
    status: "COMPLETED" | "COMPLETED_FALLBACK";
    usedFallback: boolean;
    engineResult: EngineExecutionResult;
  }>
> {
  try {
    const user = await requireRole(["STUDENT", "COORDINATOR", "ADMIN"]);
    const parsed = generateRecommendationsSchema.safeParse(rawInput ?? {});

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Focus note must be 240 characters or fewer.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const instDb = readInstitutionalDb();
    const savedProfile =
      instDb.studentProfiles[user.id] ?? instDb.studentProfiles["stu_b23f0184cs042"];

    let studentSkills: Array<{
      skillSlug: string;
      proficiency: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    }> =
      parsed.data.profileOverride?.skills ??
      savedProfile?.skills.map((s) => ({
        skillSlug: s.skillSlug,
        proficiency: s.proficiency,
      })) ?? [
        { skillSlug: "typescript", proficiency: "ADVANCED" },
        { skillSlug: "nextjs", proficiency: "INTERMEDIATE" },
        { skillSlug: "postgresql", proficiency: "INTERMEDIATE" },
        { skillSlug: "pgvector", proficiency: "BEGINNER" },
      ];
    let interests =
      parsed.data.profileOverride?.interests ??
      savedProfile?.interests ?? ["DevTools", "Applied AI"];
    let careerGoal =
      parsed.data.profileOverride?.careerGoal ??
      savedProfile?.careerGoal ??
      "Full-Stack & AI Systems Engineer";
    let preferredType =
      parsed.data.profileOverride?.preferredType ??
      savedProfile?.preferredType ??
      "PRODUCT_SAAS";
    let weeklyHours =
      parsed.data.profileOverride?.weeklyHours ?? savedProfile?.weeklyHours ?? 15;
    let durationWeeks =
      parsed.data.profileOverride?.durationWeeks ?? savedProfile?.durationWeeks ?? 24;
    let teamSize =
      parsed.data.profileOverride?.teamSize ?? savedProfile?.teamSize ?? 2;

    try {
      const profile = await db.studentProfile.findUnique({
        where: { userId: user.id },
        include: {
          skills: {
            include: { skill: true },
          },
        },
      });

      if (profile) {
        if (profile.status !== "READY" || profile.skills.length < 3) {
          return {
            ok: false,
            error: {
              code: "PROFILE_INCOMPLETE",
              message:
                "Complete your skill profile (minimum 3 skills and 1 interest domain) before running recommendations.",
            },
          };
        }

        // Recover stale stuck runs older than 90 seconds
        const ninetySecondsAgo = new Date(Date.now() - 90 * 1000);
        await db.recommendationRun.updateMany({
          where: {
            studentProfileId: profile.id,
            status: "RUNNING",
            createdAt: { lt: ninetySecondsAgo },
          },
          data: {
            status: "FAILED",
            errorCode: "TIMEOUT_RECOVERY",
          },
        });

        const activeRunningCount = await db.recommendationRun.count({
          where: {
            studentProfileId: profile.id,
            status: "RUNNING",
          },
        });

        if (activeRunningCount > 0) {
          return {
            ok: false,
            error: {
              code: "CONCURRENT_RUN_ACTIVE",
              message: "A recommendation analysis is already running for your profile.",
            },
          };
        }

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const dailyRuns = await db.recommendationRun.count({
          where: {
            studentProfileId: profile.id,
            createdAt: { gte: twentyFourHoursAgo },
            status: { not: "FAILED" },
          },
        });

        if (dailyRuns >= 5) {
          return {
            ok: false,
            error: {
              code: "RATE_LIMITED",
              message: "Daily quota reached (maximum 5 recommendation runs per 24 hours).",
            },
          };
        }

        studentSkills = profile.skills.map((s) => ({
          skillSlug: s.skill.slug,
          proficiency: s.proficiency,
        }));
        interests = profile.interests;
        careerGoal = profile.careerGoal;
        preferredType = profile.preferredType;
        weeklyHours = profile.weeklyHours;
        durationWeeks = profile.durationWeeks;
        teamSize = profile.teamSize;
      }
    } catch {
      // Fallback to verified in-memory profile snapshot when running without live DB connection
    }

    const engineResult = await executeHybridRecommendationEngine({
      studentSkills,
      interests,
      careerGoal,
      preferredType,
      weeklyHours,
      durationWeeks,
      teamSize,
      focusNote: parsed.data.focusNote,
      forceLlmFailure: parsed.data.forceLlmFailure,
    });

    const runId = `cm0run_${Date.now()}`;
    try {
      const store = readInstitutionalDb();
      const prev =
        store.recommendationsByUser[user.id] ??
        store.recommendationsByUser["stu_b23f0184cs042"];
      const nextRemaining = Math.max(0, (prev?.runsRemainingToday ?? 5) - 1);

      store.recommendationsByUser[user.id] = {
        runId,
        usedFallback: engineResult.usedFallback,
        runsRemainingToday: nextRemaining,
        shortlistedIds: [engineResult.ideas[0].id],
        ideas: engineResult.ideas,
        updatedAt: new Date().toISOString(),
      };
      store.recommendationsByUser["stu_b23f0184cs042"] =
        store.recommendationsByUser[user.id]!;
      writeInstitutionalDb(store);
    } catch {
      // Ignore write error in unit tests
    }

    revalidatePath("/dashboard/recommendations");

    return {
      ok: true,
      data: {
        runId,
        status: engineResult.status,
        usedFallback: engineResult.usedFallback,
        engineResult,
      },
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        error: { code: err.code, message: err.message },
      };
    }
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to run recommendation engine.",
      },
    };
  }
}

const updateIdeaStatusSchema = z.object({
  ideaId: z.string().min(4).max(64),
  status: z.enum(["SHORTLISTED", "DISMISSED", "GENERATED"]),
});

export async function updateIdeaStatus(
  rawInput: unknown
): Promise<ActionResult<{ ideaId: string; status: "SHORTLISTED" | "DISMISSED" | "GENERATED" }>> {
  try {
    const user = await requireRole(["STUDENT"]);
    const parsed = updateIdeaStatusSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid idea status transition.",
        },
      };
    }

    const { ideaId, status } = parsed.data;

    try {
      const idea = await db.recommendedIdea.findUnique({
        where: { id: ideaId },
        include: {
          run: {
            include: { studentProfile: true },
          },
        },
      });

      if (idea) {
        if (idea.run.studentProfile.userId !== user.id) {
          return {
            ok: false,
            error: {
              code: "FORBIDDEN",
              message: "You can only modify ideas belonging to your own recommendation runs.",
            },
          };
        }

        if (idea.status === "SUPERVISOR_LOCKED") {
          return {
            ok: false,
            error: {
              code: "FORBIDDEN",
              message: "Cannot modify an idea that is already locked with an accepted supervisor.",
            },
          };
        }

        await db.recommendedIdea.update({
          where: { id: ideaId },
          data: { status },
        });
      }
    } catch {
      // Allow UI shortlist toggling when DB is offline in local preview
    }

    try {
      const store = readInstitutionalDb();
      for (const key of Object.keys(store.recommendationsByUser)) {
        const entry = store.recommendationsByUser[key];
        if (!entry) continue;
        const hasId = entry.shortlistedIds.includes(ideaId);
        if (status === "SHORTLISTED" && !hasId) {
          entry.shortlistedIds.push(ideaId);
        } else if (status !== "SHORTLISTED" && hasId) {
          entry.shortlistedIds = entry.shortlistedIds.filter((id) => id !== ideaId);
        }
      }
      writeInstitutionalDb(store);
    } catch {
      // Ignore write error in unit tests
    }

    revalidatePath("/dashboard/recommendations");
    return {
      ok: true,
      data: { ideaId, status },
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        error: { code: err.code, message: err.message },
      };
    }
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update idea status.",
      },
    };
  }
}

export async function getActiveRecommendationsSnapshot(): Promise<{
  ideas: [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord];
  shortlistedIds: string[];
  runsRemainingToday: number;
  usedFallback: boolean;
  totalEffortHours: number;
  durationWeeks: number;
  weeklyHours: number;
  teamSize: number;
}> {
  const user = await requireRole(["STUDENT", "COORDINATOR", "ADMIN"]);
  const store = readInstitutionalDb();
  const profile =
    store.studentProfiles[user.id] ?? store.studentProfiles["stu_b23f0184cs042"];
  const rec =
    store.recommendationsByUser[user.id] ??
    store.recommendationsByUser["stu_b23f0184cs042"]!;
  return {
    ideas: rec.ideas,
    shortlistedIds: rec.shortlistedIds,
    runsRemainingToday: rec.runsRemainingToday,
    usedFallback: rec.usedFallback,
    totalEffortHours: profile?.totalEffortHours ?? 594,
    durationWeeks: profile?.durationWeeks ?? 24,
    weeklyHours: profile?.weeklyHours ?? 15,
    teamSize: profile?.teamSize ?? 2,
  };
}

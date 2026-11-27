"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth/session";
import {
  executeHybridRecommendationEngine,
  type EngineExecutionResult,
} from "@/lib/recommendation/engine";
import {
  isProductionRuntime,
  loadLatestRecommendationRunFromDb,
  loadLiveEngineContext,
  persistRecommendationRunToDb,
  type ActiveRecommendationsSnapshot,
} from "@/lib/recommendation/live-context";
import {
  readInstitutionalDb,
  writeInstitutionalDb,
} from "@/lib/institutional-store";
import type { ActionResult } from "@/types/actions";

function isDbConnectionOffline(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === "PrismaClientInitializationError" ||
    err.message.includes("Can't reach database server") ||
    err.message.includes("ECONNREFUSED")
  );
}

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

    let studentSkills: Array<{
      skillSlug: string;
      proficiency: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    }> = [];
    let interests: string[] = [];
    let careerGoal = "";
    let preferredType = "PRODUCT_SAAS";
    let weeklyHours = 15;
    let durationWeeks = 24;
    let teamSize = 2;

    let studentProfileId: string | null = null;
    try {
      const profile = await db.studentProfile.findUnique({
        where: { userId: user.id },
        include: {
          skills: {
            include: { skill: true },
          },
        },
      });

      if (!profile || profile.status !== "READY" || profile.skills.length < 3) {
        return {
          ok: false,
          error: {
            code: "PROFILE_INCOMPLETE",
            message:
              "Complete your skill profile (minimum 3 skills and 1 interest domain) before running recommendations.",
          },
        };
      }

      studentProfileId = profile.id;

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

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [activeRunningCount, dailyRuns] = await Promise.all([
        db.recommendationRun.count({
          where: {
            studentProfileId: profile.id,
            status: "RUNNING",
          },
        }),
        db.recommendationRun.count({
          where: {
            studentProfileId: profile.id,
            createdAt: { gte: twentyFourHoursAgo },
            status: { not: "FAILED" },
          },
        }),
      ]);

      if (activeRunningCount > 0) {
        return {
          ok: false,
          error: {
            code: "CONCURRENT_RUN_ACTIVE",
            message: "A recommendation analysis is already running for your profile.",
          },
        };
      }

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
    } catch (dbErr) {
      if (isProductionRuntime() || !isDbConnectionOffline(dbErr)) {
        console.error("[generateRecommendations] Database profile query failed:", dbErr);
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message:
              "Could not load your student skill profile from the database. Please try again.",
          },
        };
      }

      const instDb = readInstitutionalDb();
      const savedProfile = instDb.studentProfiles[user.id];

      if (!parsed.data.profileOverride && (!savedProfile || savedProfile.skills.length < 3)) {
        return {
          ok: false,
          error: {
            code: "PROFILE_INCOMPLETE",
            message:
              "Complete your skill profile (minimum 3 skills and 1 interest domain) before running recommendations.",
          },
        };
      }

      studentSkills =
        parsed.data.profileOverride?.skills ??
        savedProfile?.skills.map((s) => ({
          skillSlug: s.skillSlug,
          proficiency: s.proficiency,
        })) ??
        [];
      interests =
        parsed.data.profileOverride?.interests ?? savedProfile?.interests ?? ["DevTools"];
      careerGoal =
        parsed.data.profileOverride?.careerGoal ??
        savedProfile?.careerGoal ??
        "Full-Stack Engineer";
      preferredType =
        parsed.data.profileOverride?.preferredType ??
        savedProfile?.preferredType ??
        "PRODUCT_SAAS";
      weeklyHours =
        parsed.data.profileOverride?.weeklyHours ?? savedProfile?.weeklyHours ?? 15;
      durationWeeks =
        parsed.data.profileOverride?.durationWeeks ?? savedProfile?.durationWeeks ?? 24;
      teamSize = parsed.data.profileOverride?.teamSize ?? savedProfile?.teamSize ?? 2;
    }

    const liveContext = await loadLiveEngineContext();
    const engineResult = await executeHybridRecommendationEngine({
      studentSkills,
      interests,
      careerGoal,
      preferredType,
      weeklyHours,
      durationWeeks,
      teamSize,
      focusNote: parsed.data.focusNote,
      customSupervisors: liveContext.supervisors,
      customArchives: liveContext.archives,
      forceLlmFailure: parsed.data.forceLlmFailure,
    });

    let runId = `cm0run_${Date.now()}`;
    let finalEngineResult: EngineExecutionResult = engineResult;

    if (studentProfileId) {
      const persisted = await persistRecommendationRunToDb({
        studentProfileId,
        profileSummary: `${studentSkills.map((s) => `${s.skillSlug}:${s.proficiency}`).join(",")}|${interests.join(",")}|${careerGoal}|${parsed.data.focusNote ?? ""}`,
        engineResult,
      });

      if (!persisted && isProductionRuntime()) {
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message:
              "Could not persist recommendation run to the database. Please try again.",
          },
        };
      }

      if (persisted) {
        runId = persisted.runId;
        finalEngineResult = {
          ...engineResult,
          ideas: persisted.ideas,
        };
      }
    }

    if (!isProductionRuntime()) {
      try {
        const store = readInstitutionalDb();
        const prev = store.recommendationsByUser[user.id];
        const nextRemaining = Math.max(0, (prev?.runsRemainingToday ?? 5) - 1);

        store.recommendationsByUser[user.id] = {
          runId,
          usedFallback: finalEngineResult.usedFallback,
          runsRemainingToday: nextRemaining,
          shortlistedIds: [finalEngineResult.ideas[0].id],
          ideas: finalEngineResult.ideas,
          updatedAt: new Date().toISOString(),
        };
        writeInstitutionalDb(store);
      } catch {
        // Ignore write error in unit tests
      }
    }

    revalidatePath("/dashboard/recommendations");
    revalidatePath("/dashboard/admin");

    return {
      ok: true,
      data: {
        runId,
        status: finalEngineResult.status,
        usedFallback: finalEngineResult.usedFallback,
        engineResult: finalEngineResult,
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
      } else if (isProductionRuntime()) {
        return {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: "Recommended idea not found in the database.",
          },
        };
      }
    } catch (dbErr) {
      if (isProductionRuntime() || !isDbConnectionOffline(dbErr)) {
        console.error("[updateIdeaStatus] Database update failed:", dbErr);
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Could not save proposal status to the database. Please try again.",
          },
        };
      }
    }

    if (!isProductionRuntime()) {
      try {
        const store = readInstitutionalDb();
        const entry = store.recommendationsByUser[user.id];

        if (entry) {
          const hasId = entry.shortlistedIds.includes(ideaId);
          if (status === "SHORTLISTED" && !hasId) {
            entry.shortlistedIds.push(ideaId);
          } else if (status !== "SHORTLISTED" && hasId) {
            entry.shortlistedIds = entry.shortlistedIds.filter((id) => id !== ideaId);
          }
          store.recommendationsByUser[user.id] = entry;
          writeInstitutionalDb(store);
        }
      } catch {
        // Ignore write error in unit tests
      }
    }

    revalidatePath("/dashboard/recommendations");
    revalidatePath("/dashboard/supervisors");
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

export async function getActiveRecommendationsSnapshot(): Promise<ActiveRecommendationsSnapshot> {
  const user = await requireRole(["STUDENT", "COORDINATOR", "ADMIN"]);

  const dbSnapshot = await loadLatestRecommendationRunFromDb(user.id);
  if (dbSnapshot !== null) {
    return dbSnapshot;
  }

  if (isProductionRuntime()) {
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

  // Local offline fallback (never populated in production)
  const store = readInstitutionalDb();
  const profile = store.studentProfiles[user.id];
  const rec = store.recommendationsByUser[user.id];

  if (!rec) {
    return {
      ideas: null,
      shortlistedIds: [],
      runsRemainingToday: 5,
      usedFallback: false,
      totalEffortHours: profile?.totalEffortHours ?? 0,
      durationWeeks: profile?.durationWeeks ?? 24,
      weeklyHours: profile?.weeklyHours ?? 15,
      teamSize: profile?.teamSize ?? 2,
      profileStatus: profile ? profile.status : "MISSING",
    };
  }

  return {
    ideas: rec.ideas,
    shortlistedIds: rec.shortlistedIds,
    runsRemainingToday: rec.runsRemainingToday,
    usedFallback: rec.usedFallback,
    totalEffortHours: profile?.totalEffortHours ?? 594,
    durationWeeks: profile?.durationWeeks ?? 24,
    weeklyHours: profile?.weeklyHours ?? 15,
    teamSize: profile?.teamSize ?? 2,
    profileStatus: "READY",
  };
}

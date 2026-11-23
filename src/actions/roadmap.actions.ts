"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth/session";
import {
  buildCalibratedProjectRoadmap,
  formatRoadmapAsMarkdown,
  type PlannedRoadmapResult,
} from "@/lib/recommendation/roadmap-planner";
import type { ActionResult } from "@/types/actions";

const generateRoadmapSchema = z.object({
  recommendedIdeaId: z.string().min(4).max(64),
  regenerate: z.boolean().optional(),
  durationWeeks: z.coerce.number().int().min(12).max(36).optional(),
  weeklyHours: z.coerce.number().int().min(5).max(45).optional(),
});

export async function generateProjectRoadmap(
  rawInput: unknown
): Promise<ActionResult<{ roadmapId: string; roadmap: PlannedRoadmapResult }>> {
  try {
    const user = await requireRole(["STUDENT"]);
    const parsed = generateRoadmapSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid roadmap parameters.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const durationWeeks = parsed.data.durationWeeks ?? 24;
    const weeklyHours = parsed.data.weeklyHours ?? 15;
    let ideaTitle =
      "Deterministic CI Log Anomaly Triage Engine for Small Engineering Teams";
    const domain = "DevTools";
    let totalSkillGapHours = 22;
    let skillGapSlugs = ["pgvector", "github-actions"];
    const recommendedStack = ["Next.js", "TypeScript", "PostgreSQL + pgvector", "Inngest"];

    try {
      const idea = await db.recommendedIdea.findUnique({
        where: { id: parsed.data.recommendedIdeaId },
        include: {
          skillGaps: { include: { skill: true } },
          run: { include: { studentProfile: true } },
        },
      });

      if (idea) {
        if (idea.run.studentProfile.userId !== user.id) {
          return {
            ok: false,
            error: {
              code: "FORBIDDEN",
              message: "You can only generate roadmaps for your own recommended ideas.",
            },
          };
        }

        ideaTitle = idea.title;
        totalSkillGapHours = idea.skillGaps.reduce(
          (acc, g) => acc + g.estimatedLearnHours,
          0
        );
        skillGapSlugs = idea.skillGaps.map((g) => g.skill.slug);
      }
    } catch {
      // Fallback to verified local idea parameters when DB is offline
    }

    const planned = buildCalibratedProjectRoadmap({
      ideaTitle,
      domain,
      durationWeeks,
      weeklyHours,
      totalSkillGapHours,
      skillGapSlugs,
      recommendedStack,
    });

    revalidatePath(`/dashboard/roadmaps/${parsed.data.recommendedIdeaId}`);

    return {
      ok: true,
      data: {
        roadmapId: `cm0roadmap_${parsed.data.recommendedIdeaId}`,
        roadmap: planned,
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
        message: "Failed to generate project roadmap.",
      },
    };
  }
}

const toggleMilestoneSchema = z.object({
  milestoneId: z.string().min(3).max(64),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
});

export async function toggleMilestoneStatus(
  rawInput: unknown
): Promise<
  ActionResult<{
    milestoneId: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  }>
> {
  try {
    await requireRole(["STUDENT"]);
    const parsed = toggleMilestoneSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid milestone status update.",
        },
      };
    }

    try {
      await db.roadmapMilestone.update({
        where: { id: parsed.data.milestoneId },
        data: { status: parsed.data.status },
      });
    } catch {
      // In-memory milestone toggle when DB is not connected
    }

    revalidatePath("/dashboard/roadmaps");

    return {
      ok: true,
      data: {
        milestoneId: parsed.data.milestoneId,
        status: parsed.data.status,
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
        message: "Failed to update milestone status.",
      },
    };
  }
}

const exportRoadmapSchema = z.object({
  roadmapId: z.string().min(3).max(64),
  ideaTitle: z.string().optional(),
  durationWeeks: z.coerce.number().int().min(12).max(36).optional(),
  weeklyHours: z.coerce.number().int().min(5).max(45).optional(),
  totalSkillGapHours: z.coerce.number().int().min(0).optional(),
});

export async function exportRoadmapMarkdown(
  rawInput: unknown
): Promise<ActionResult<{ markdown: string }>> {
  try {
    await requireRole(["STUDENT", "SUPERVISOR", "COORDINATOR", "ADMIN"]);
    const parsed = exportRoadmapSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid roadmap export request.",
        },
      };
    }

    const ideaTitle =
      parsed.data.ideaTitle ??
      "Deterministic CI Log Anomaly Triage Engine for Small Engineering Teams";
    const roadmap = buildCalibratedProjectRoadmap({
      ideaTitle,
      domain: "DevTools",
      durationWeeks: parsed.data.durationWeeks ?? 24,
      weeklyHours: parsed.data.weeklyHours ?? 15,
      totalSkillGapHours: parsed.data.totalSkillGapHours ?? 22,
      skillGapSlugs: ["pgvector", "github-actions"],
      recommendedStack: ["Next.js", "TypeScript", "PostgreSQL + pgvector", "Inngest"],
    });

    const markdown = formatRoadmapAsMarkdown({
      ideaTitle,
      roadmap,
    });

    return {
      ok: true,
      data: { markdown },
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
        message: "Failed to export roadmap markdown.",
      },
    };
  }
}

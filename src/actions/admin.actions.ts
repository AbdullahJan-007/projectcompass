"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth/session";
import type { ActionResult } from "@/types/actions";

const updateUserRoleSchema = z.object({
  targetUserId: z.string().min(5).max(64),
  role: z.enum(["STUDENT", "SUPERVISOR", "COORDINATOR", "ADMIN"]),
  departmentId: z.string().min(5).max(64).optional(),
});

export async function updateUserRole(
  rawInput: unknown
): Promise<ActionResult<{ targetUserId: string; role: string }>> {
  try {
    const actor = await requireRole(["ADMIN"]);
    const parsed = updateUserRoleSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid user role update request.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { targetUserId, role, departmentId } = parsed.data;

    // Prevent self-demotion of the last active ADMIN
    if (targetUserId === actor.id && role !== "ADMIN") {
      const activeAdminsCount = await db.user.count({
        where: { role: "ADMIN", isActive: true },
      });
      if (activeAdminsCount <= 1) {
        return {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message:
              "Last-Admin protection: Cannot demote the only active University Admin account.",
          },
        };
      }
    }

    const target = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!target) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Target user not found.",
        },
      };
    }

    await db.$transaction([
      db.user.update({
        where: { id: targetUserId },
        data: {
          role,
          ...(departmentId ? { departmentId } : {}),
        },
      }),
      db.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "ROLE_UPDATED",
          entityType: "User",
          entityId: targetUserId,
          metadataJson: {
            previousRole: target.role,
            newRole: role,
            departmentId: departmentId ?? target.departmentId,
          },
        },
      }),
    ]);

    revalidatePath("/dashboard/admin");
    return {
      ok: true,
      data: { targetUserId, role },
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
        message: "Failed to update user role.",
      },
    };
  }
}

const overrideQuotaSchema = z.object({
  supervisorProfileId: z.string().min(5).max(64),
  maxSlots: z.coerce.number().int().min(0).max(20),
  reason: z.string().min(10, "Audit reason must be at least 10 characters").max(400),
});

export async function overrideSupervisorQuota(
  rawInput: unknown
): Promise<ActionResult<{ supervisorProfileId: string; maxSlots: number }>> {
  try {
    const actor = await requireRole(["COORDINATOR", "ADMIN"]);
    const parsed = overrideQuotaSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide a valid slot limit (0–20) and audit reason (>= 10 chars).",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { supervisorProfileId, maxSlots, reason } = parsed.data;

    const supervisor = await db.supervisorProfile.findUnique({
      where: { id: supervisorProfileId },
    });

    if (!supervisor) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Supervisor profile not found.",
        },
      };
    }

    if (
      actor.role === "COORDINATOR" &&
      actor.departmentId &&
      supervisor.departmentId !== actor.departmentId
    ) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "Coordinators can only override quotas within their own department.",
        },
      };
    }

    if (maxSlots < supervisor.activeSlots) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Cannot set maxSlots (${maxSlots}) below activeSlots (${supervisor.activeSlots}).`,
        },
      };
    }

    await db.$transaction([
      db.supervisorProfile.update({
        where: { id: supervisorProfileId },
        data: { maxSlots },
      }),
      db.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "SUPERVISOR_SLOT_OVERRIDE",
          entityType: "SupervisorProfile",
          entityId: supervisorProfileId,
          metadataJson: {
            previousMaxSlots: supervisor.maxSlots,
            newMaxSlots: maxSlots,
            activeSlots: supervisor.activeSlots,
            reason: reason.trim(),
          },
        },
      }),
    ]);

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/coordinator");

    return {
      ok: true,
      data: { supervisorProfileId, maxSlots },
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
        message: "Failed to override supervisor quota.",
      },
    };
  }
}

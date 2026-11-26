"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth/session";
import {
  readAccountsStore,
  registerFacultyAccountInDb,
  syncRoleInAccountsStore,
} from "@/lib/auth/account-registry";
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

    try {
      syncRoleInAccountsStore(targetUserId, role, departmentId);
    } catch {
      // Ignore file sync error in mocked unit tests
    }

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
    if (isDbConnectionOffline(err)) {
      const actor = await requireRole(["ADMIN"]);
      const parsed = updateUserRoleSchema.parse(rawInput);
      const accStore = readAccountsStore();
      const adminCount = accStore.facultyAccounts.filter((f) => f.role === "ADMIN").length;

      if (parsed.targetUserId === actor.id && parsed.role !== "ADMIN" && adminCount <= 1) {
        return {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message:
              "Last-Admin protection: Cannot demote the only active University Admin account.",
          },
        };
      }

      syncRoleInAccountsStore(parsed.targetUserId, parsed.role, parsed.departmentId);

      const instStore = readInstitutionalDb();
      instStore.auditLogs.unshift({
        id: `cm0audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: actor.fullName,
        action: "ROLE_UPDATED",
        entityType: "User",
        entityId: parsed.targetUserId,
        summary: `Updated role for ${parsed.targetUserId} to ${parsed.role}.`,
      });
      writeInstitutionalDb(instStore);
      revalidatePath("/dashboard/admin");
      return {
        ok: true,
        data: { targetUserId: parsed.targetUserId, role: parsed.role },
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
    if (isDbConnectionOffline(err)) {
      const actor = await requireRole(["COORDINATOR", "ADMIN"]);
      const parsed = overrideQuotaSchema.parse(rawInput);
      const instStore = readInstitutionalDb();
      const sup = instStore.supervisors.find((s) => s.id === parsed.supervisorProfileId);
      if (!sup) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "Supervisor profile not found." },
        };
      }
      if (parsed.maxSlots < sup.activeSlots) {
        return {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Cannot set maxSlots (${parsed.maxSlots}) below activeSlots (${sup.activeSlots}).`,
          },
        };
      }
      sup.maxSlots = parsed.maxSlots;
      instStore.auditLogs.unshift({
        id: `cm0audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: actor.fullName,
        action: "SUPERVISOR_SLOT_OVERRIDE",
        entityType: "SupervisorProfile",
        entityId: parsed.supervisorProfileId,
        summary: `Overrode maxSlots for ${sup.fullName} to ${parsed.maxSlots}. Reason: ${parsed.reason.trim()}`,
      });
      writeInstitutionalDb(instStore);
      revalidatePath("/dashboard/admin");
      revalidatePath("/dashboard/coordinator");
      return {
        ok: true,
        data: {
          supervisorProfileId: parsed.supervisorProfileId,
          maxSlots: parsed.maxSlots,
        },
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

const provisionFacultySchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters").max(80),
  universityEmail: z
    .string()
    .email("Enter a valid official university email address")
    .max(120),
  departmentCode: z.enum(["BSIT", "BSCS", "BSSE", "BSAI", "BSCY", "BSDS"]),
  designation: z.string().min(2).max(80).default("Assistant Professor"),
  maxSlots: z.coerce.number().int().min(1).max(15).default(5),
  pin: z.string().regex(/^\d{4}$/, "Initial 4-digit PIN must be exactly 4 numeric digits"),
  researchDomains: z
    .array(z.string().min(2).max(60))
    .min(1, "Select at least one research domain")
    .max(8),
});

/**
 * Admin-only faculty hiring & database provisioning.
 * Creates User (SUPERVISOR) + FacultyAccount + SupervisorProfile + AuditLog.
 * Public faculty self-registration is strictly disabled.
 */
export async function provisionFacultyAccount(rawInput: unknown): Promise<
  ActionResult<{
    userId: string;
    fullName: string;
    universityEmail: string;
    departmentCode: string;
    designation: string;
    maxSlots: number;
  }>
> {
  try {
    const actor = await requireRole(["ADMIN"]);
    const parsed = provisionFacultySchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message:
            parsed.error.issues[0]?.message ?? "Invalid faculty provisioning details.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const input = parsed.data;
    const reg = await registerFacultyAccountInDb({
      identifier: input.universityEmail.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      designation: input.designation.trim(),
      departmentCode: input.departmentCode,
      maxSlots: input.maxSlots,
      researchDomains: input.researchDomains,
      pin: input.pin,
    });

    if (!reg.ok) {
      return {
        ok: false,
        error: {
          code: reg.code,
          message: reg.message,
        },
      };
    }

    try {
      await db.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "FACULTY_PROVISIONED",
          entityType: "FacultyAccount",
          entityId: reg.account.userId,
          metadataJson: {
            universityEmail: reg.account.universityEmail,
            departmentCode: reg.account.departmentCode,
            designation: reg.account.designation,
            maxSlots: reg.account.maxSlots,
          },
        },
      });
    } catch {
      // Non-blocking audit log write if local DB is offline
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/supervisors");

    return {
      ok: true,
      data: {
        userId: reg.account.userId,
        fullName: reg.account.fullName,
        universityEmail: reg.account.universityEmail,
        departmentCode: reg.account.departmentCode,
        designation: reg.account.designation,
        maxSlots: reg.account.maxSlots,
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
        message: "Failed to provision faculty account.",
      },
    };
  }
}

const toggleUserStatusSchema = z.object({
  targetUserId: z.string().min(4).max(64),
  isActive: z.boolean(),
});

export async function toggleUserActiveStatus(
  rawInput: unknown
): Promise<ActionResult<{ targetUserId: string; isActive: boolean }>> {
  try {
    const actor = await requireRole(["ADMIN"]);
    const parsed = toggleUserStatusSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid user status request.",
        },
      };
    }

    const { targetUserId, isActive } = parsed.data;
    if (targetUserId === actor.id && !isActive) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "Cannot deactivate your own active Admin account.",
        },
      };
    }

    await db.$transaction([
      db.user.update({
        where: { id: targetUserId },
        data: { isActive },
      }),
      db.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
          entityType: "User",
          entityId: targetUserId,
          metadataJson: { isActive },
        },
      }),
    ]);

    revalidatePath("/dashboard/admin");
    return { ok: true, data: { targetUserId, isActive } };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: { code: err.code, message: err.message } };
    }
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update user active status.",
      },
    };
  }
}

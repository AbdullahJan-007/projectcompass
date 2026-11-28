"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth/session";
import {
  hashFourDigitPin,
  readAccountsStore,
  registerFacultyAccountInDb,
  syncActiveStatusInAccountsStore,
  syncPinInAccountsStore,
  syncRoleInAccountsStore,
} from "@/lib/auth/account-registry";
import {
  readInstitutionalDb,
  writeInstitutionalDb,
} from "@/lib/institutional-store";
import type { ActionResult } from "@/types/actions";

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.CI !== "true" &&
    process.env.SEED_DEMO_DATA !== "true"
  );
}

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

    if (target.role === "ADMIN" && role !== "ADMIN") {
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
    if (!isProductionRuntime() && isDbConnectionOffline(err)) {
      const actor = await requireRole(["ADMIN"]);
      const parsed = updateUserRoleSchema.parse(rawInput);
      const accStore = readAccountsStore();
      const adminCount = accStore.facultyAccounts.filter(
        (f) => f.role === "ADMIN" && f.isActive !== false
      ).length;

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
        timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
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
    revalidatePath("/dashboard/supervisors");

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
    if (!isProductionRuntime() && isDbConnectionOffline(err)) {
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
        timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
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
  role: z.enum(["SUPERVISOR", "COORDINATOR"]).default("SUPERVISOR"),
  maxSlots: z.coerce.number().int().min(1).max(15).default(5),
  pin: z.string().regex(/^\d{4}$/, "Initial 4-digit PIN must be exactly 4 numeric digits"),
  researchDomains: z
    .array(z.string().min(2).max(60))
    .min(1, "Select at least one research domain")
    .max(8),
});

/**
 * Admin-only faculty hiring & database provisioning.
 * Atomically creates User (SUPERVISOR | COORDINATOR) + FacultyAccount + SupervisorProfile
 * (with 1536-dim embedding) + AuditLog in PostgreSQL, failing closed in production.
 */
export async function provisionFacultyAccount(rawInput: unknown): Promise<
  ActionResult<{
    userId: string;
    fullName: string;
    universityEmail: string;
    departmentCode: string;
    designation: string;
    role: "SUPERVISOR" | "COORDINATOR";
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
      role: input.role,
      actorUserId: actor.id,
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

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/coordinator");
    revalidatePath("/dashboard/supervisors");

    return {
      ok: true,
      data: {
        userId: reg.account.userId,
        fullName: reg.account.fullName,
        universityEmail: reg.account.universityEmail,
        departmentCode: reg.account.departmentCode,
        designation: reg.account.designation,
        role: input.role,
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

    const target = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, isActive: true },
    });

    if (!target) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Target user account not found.",
        },
      };
    }

    if (!isActive && target.role === "ADMIN" && target.isActive) {
      const activeAdminsCount = await db.user.count({
        where: { role: "ADMIN", isActive: true },
      });
      if (activeAdminsCount <= 1) {
        return {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message:
              "Last-Admin protection: Cannot deactivate the only active University Admin account.",
          },
        };
      }
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

    try {
      syncActiveStatusInAccountsStore(targetUserId, isActive);
    } catch {
      // Ignore file sync error in mocked unit tests
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/supervisors");
    return { ok: true, data: { targetUserId, isActive } };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: { code: err.code, message: err.message } };
    }
    if (!isProductionRuntime() && isDbConnectionOffline(err)) {
      const actor = await requireRole(["ADMIN"]);
      const parsed = toggleUserStatusSchema.parse(rawInput);
      syncActiveStatusInAccountsStore(parsed.targetUserId, parsed.isActive);
      const instStore = readInstitutionalDb();
      instStore.auditLogs.unshift({
        id: `cm0audit_${Date.now()}`,
        timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
        actor: actor.fullName,
        action: parsed.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
        entityType: "User",
        entityId: parsed.targetUserId,
        summary: `${parsed.isActive ? "Activated" : "Deactivated"} user ${parsed.targetUserId}.`,
      });
      writeInstitutionalDb(instStore);
      revalidatePath("/dashboard/admin");
      return { ok: true, data: { targetUserId: parsed.targetUserId, isActive: parsed.isActive } };
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

const resetAccountPinSchema = z.object({
  targetUserId: z.string().min(4).max(64),
  newPin: z.string().regex(/^\d{4}$/, "New PIN must be exactly 4 numeric digits"),
  reason: z.string().max(240).optional(),
});

/**
 * Admin-only 4-digit PIN reset for forgotten Student or Faculty accounts.
 */
export async function resetAccountPin(
  rawInput: unknown
): Promise<ActionResult<{ targetUserId: string; fullName: string }>> {
  try {
    const actor = await requireRole(["ADMIN"]);
    const parsed = resetAccountPinSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Invalid PIN reset request.",
        },
      };
    }

    const { targetUserId, newPin, reason } = parsed.data;
    const newPinHash = hashFourDigitPin(newPin);

    const target = await db.user.findUnique({
      where: { id: targetUserId },
      include: { studentAccount: true, facultyAccount: true },
    });

    if (!target) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Target user account not found." },
      };
    }

    await db.$transaction(async (tx) => {
      if (target.studentAccount) {
        await tx.studentAccount.update({
          where: { id: target.studentAccount.id },
          data: { pinHash: newPinHash },
        });
      }
      if (target.facultyAccount) {
        await tx.facultyAccount.update({
          where: { id: target.facultyAccount.id },
          data: { pinHash: newPinHash },
        });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "PIN_RESET",
          entityType: "User",
          entityId: target.id,
          metadataJson: {
            reason: reason?.trim() || `Admin reset 4-digit PIN for ${target.fullName}.`,
          },
        },
      });
    });

    syncPinInAccountsStore(target.id, newPinHash);
    revalidatePath("/dashboard/admin");
    return { ok: true, data: { targetUserId: target.id, fullName: target.fullName } };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: { code: err.code, message: err.message } };
    }
    if (!isProductionRuntime() && isDbConnectionOffline(err)) {
      const actor = await requireRole(["ADMIN"]);
      const parsed = resetAccountPinSchema.parse(rawInput);
      syncPinInAccountsStore(parsed.targetUserId, hashFourDigitPin(parsed.newPin));
      const instStore = readInstitutionalDb();
      instStore.auditLogs.unshift({
        id: `cm0audit_${Date.now()}`,
        timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
        actor: actor.fullName,
        action: "PIN_RESET",
        entityType: "User",
        entityId: parsed.targetUserId,
        summary: parsed.reason?.trim() || `Admin reset 4-digit PIN for ${parsed.targetUserId}.`,
      });
      writeInstitutionalDb(instStore);
      revalidatePath("/dashboard/admin");
      return { ok: true, data: { targetUserId: parsed.targetUserId, fullName: "Account" } };
    }
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to reset account PIN." },
    };
  }
}

const assignProjectSupervisorSchema = z.object({
  recommendedIdeaId: z.string().min(4).max(64),
  supervisorProfileId: z.string().min(4).max(64),
  note: z.string().max(240).optional(),
});

/**
 * Admin-only direct supervisor assignment / reassignment for any Student FYP project.
 * Atomically releases any previous accepted supervisor slot and locks 1 slot on the new supervisor.
 */
export async function assignProjectSupervisor(rawInput: unknown): Promise<
  ActionResult<{
    recommendedIdeaId: string;
    supervisorProfileId: string;
    supervisorName: string;
  }>
> {
  try {
    const actor = await requireRole(["ADMIN"]);
    const parsed = assignProjectSupervisorSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Select both a valid project and faculty supervisor.",
        },
      };
    }

    const { recommendedIdeaId, supervisorProfileId, note } = parsed.data;

    const result = await db.$transaction(async (tx) => {
      const idea = await tx.recommendedIdea.findUnique({
        where: { id: recommendedIdeaId },
        include: {
          run: { include: { studentProfile: true } },
          supervisionRequests: { where: { status: "ACCEPTED" } },
        },
      });

      if (!idea) {
        return { error: { code: "NOT_FOUND" as const, message: "Student project not found." } };
      }

      const targetSup = await tx.supervisorProfile.findUnique({
        where: { id: supervisorProfileId },
        include: { user: { select: { fullName: true, isActive: true } } },
      });

      if (!targetSup || !targetSup.user.isActive) {
        return {
          error: {
            code: "NOT_FOUND" as const,
            message: "Target faculty supervisor not found or inactive.",
          },
        };
      }

      const existingAccepted = idea.supervisionRequests.find(
        (r) => r.supervisorProfileId === supervisorProfileId
      );
      if (existingAccepted) {
        return {
          ok: true as const,
          supervisorName: targetSup.user.fullName,
        };
      }

      // Release any previous accepted supervisor slot for this idea
      for (const prev of idea.supervisionRequests) {
        await tx.supervisorRequest.update({
          where: { id: prev.id },
          data: {
            status: "RELEASED",
            supervisorNote: "Reassigned by University Admin Command Center.",
          },
        });
        await tx.supervisorProfile.updateMany({
          where: { id: prev.supervisorProfileId, activeSlots: { gt: 0 } },
          data: { activeSlots: { decrement: 1 } },
        });
      }

      // Atomically lock 1 slot on the newly assigned supervisor
      const locked = await tx.supervisorProfile.updateMany({
        where: {
          id: supervisorProfileId,
          activeSlots: { lt: targetSup.maxSlots },
        },
        data: { activeSlots: { increment: 1 } },
      });

      if (locked.count === 0) {
        return {
          error: {
            code: "SUPERVISOR_QUOTA_FULL" as const,
            message: `${targetSup.user.fullName} has reached maximum supervision capacity (${targetSup.maxSlots} slots). Increase quota first.`,
          },
        };
      }

      const existingPair = await tx.supervisorRequest.findFirst({
        where: {
          studentProfileId: idea.run.studentProfileId,
          supervisorProfileId,
          recommendedIdeaId: idea.id,
        },
        select: { id: true },
      });

      if (existingPair) {
        await tx.supervisorRequest.update({
          where: { id: existingPair.id },
          data: {
            status: "ACCEPTED",
            supervisorNote: note?.trim() || "Assigned directly by University Admin.",
            respondedAt: new Date(),
          },
        });
      } else {
        await tx.supervisorRequest.create({
          data: {
            studentProfileId: idea.run.studentProfileId,
            supervisorProfileId,
            recommendedIdeaId: idea.id,
            studentPitch:
              "Direct departmental supervision assignment recorded by the University Admin Command Center.",
            status: "ACCEPTED",
            supervisorNote: note?.trim() || "Assigned directly by University Admin.",
            respondedAt: new Date(),
          },
        });
      }

      await tx.recommendedIdea.update({
        where: { id: idea.id },
        data: { status: "SHORTLISTED" },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "ADMIN_SUPERVISOR_ASSIGNED",
          entityType: "RecommendedIdea",
          entityId: idea.id,
          metadataJson: {
            supervisorProfileId,
            reason: `Assigned ${targetSup.user.fullName} to "${idea.title}".`,
          },
        },
      });

      return { ok: true as const, supervisorName: targetSup.user.fullName };
    });

    if ("error" in result && result.error) {
      return { ok: false, error: result.error };
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/supervisor");
    revalidatePath("/dashboard/supervisors");

    return {
      ok: true,
      data: {
        recommendedIdeaId,
        supervisorProfileId,
        supervisorName: result.supervisorName,
      },
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: { code: err.code, message: err.message } };
    }
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to assign supervisor to project.",
      },
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth/session";
import {
  generateDeterministicEmbedding,
  toPgVectorLiteral,
} from "@/lib/ai/embeddings";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { escapeHtml, slugifySkill } from "@/lib/utils";
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

const upsertSupervisorProfileSchema = z.object({
  title: z.string().min(2).max(80),
  bio: z.string().min(30, "Research bio must be at least 30 characters").max(1000),
  researchDomains: z.array(z.string().min(2).max(60)).min(1).max(8),
  preferredStacks: z.array(z.string().min(1).max(60)).min(1).max(12),
  skillSlugs: z.array(z.string().min(1).max(60)).min(1).max(20),
  maxSlots: z.coerce.number().int().min(0).max(15),
  isAccepting: z.boolean(),
});

export type UpsertSupervisorProfileInput = z.infer<typeof upsertSupervisorProfileSchema>;

export async function upsertSupervisorProfile(
  rawInput: unknown
): Promise<ActionResult<{ supervisorProfileId: string; maxSlots: number; activeSlots: number }>> {
  try {
    const user = await requireRole(["SUPERVISOR", "COORDINATOR", "ADMIN"]);
    const parsed = upsertSupervisorProfileSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Please verify supervisor bio length (30..1000 chars), domains, and slot limits.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const input = parsed.data;
    const uniqueSkillSlugs = Array.from(
      new Set(input.skillSlugs.map((s) => slugifySkill(s)).filter(Boolean))
    );
    let supervisorId = `cm0sup_${user.id}`;
    let activeSlots = 0;

    try {
      const existing = await db.supervisorProfile.findUnique({
        where: { userId: user.id },
      });

      if (existing && input.maxSlots < existing.activeSlots) {
        return {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Cannot reduce maxSlots (${input.maxSlots}) below currently locked activeSlots (${existing.activeSlots}).`,
          },
        };
      }

      const departmentId = user.departmentId ?? "cm0deptbscs00000000000001";
      const embeddingText = `${input.researchDomains.join(", ")} | ${input.preferredStacks.join(", ")} | ${uniqueSkillSlugs.join(", ")} | ${input.bio}`;
      // Fast deterministic 1536-dim embedding prevents 5-10s external HTTP stalls on Save
      const embedding = generateDeterministicEmbedding(embeddingText);
      const vecLiteral = toPgVectorLiteral(embedding);

      const saved = await db.$transaction(
        async (tx) => {
          const profile = await tx.supervisorProfile.upsert({
            where: { userId: user.id },
            update: {
              title: input.title.trim(),
              bio: input.bio.trim(),
              researchDomains: input.researchDomains,
              preferredStacks: input.preferredStacks,
              maxSlots: input.maxSlots,
              isAccepting: input.isAccepting,
            },
            create: {
              userId: user.id,
              departmentId,
              title: input.title.trim(),
              bio: input.bio.trim(),
              researchDomains: input.researchDomains,
              preferredStacks: input.preferredStacks,
              maxSlots: input.maxSlots,
              activeSlots: 0,
              isAccepting: input.isAccepting,
            },
            select: { id: true, activeSlots: true },
          });

          // Batched skill link synchronization (zero N+1 queries inside transaction)
          if (uniqueSkillSlugs.length > 0 && "skill" in tx && "supervisorSkill" in tx) {
            const existingSkills = await tx.skill.findMany({
              where: { slug: { in: uniqueSkillSlugs } },
              select: { id: true, slug: true },
            });
            const existingSet = new Set(existingSkills.map((s) => s.slug));
            const missingSlugs = uniqueSkillSlugs.filter((slug) => !existingSet.has(slug));

            if (missingSlugs.length > 0) {
              await tx.skill.createMany({
                data: missingSlugs.map((slug) => ({
                  slug,
                  displayName: slug,
                  category: "Custom",
                })),
                skipDuplicates: true,
              });
            }

            const allSkills =
              missingSlugs.length > 0
                ? await tx.skill.findMany({
                    where: { slug: { in: uniqueSkillSlugs } },
                    select: { id: true },
                  })
                : existingSkills;

            await tx.supervisorSkill.deleteMany({
              where: { supervisorProfileId: profile.id },
            });

            if (allSkills.length > 0) {
              await tx.supervisorSkill.createMany({
                data: allSkills.map((s) => ({
                  supervisorProfileId: profile.id,
                  skillId: s.id,
                })),
                skipDuplicates: true,
              });
            }
          }

          await tx.$executeRaw`
            UPDATE "SupervisorProfile"
            SET "profileEmbedding" = ${vecLiteral}::vector
            WHERE id = ${profile.id}
          `;

          return profile;
        },
        { maxWait: 5000, timeout: 15000 }
      );

      if (!saved.id) {
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Database verification failed while saving supervisor profile.",
          },
        };
      }

      supervisorId = saved.id;
      activeSlots = saved.activeSlots;
    } catch (dbErr) {
      if (isProductionRuntime() || !isDbConnectionOffline(dbErr)) {
        console.error("[upsertSupervisorProfile] Database write failed:", dbErr);
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message:
              "Could not save your faculty profile to the database. Please try again.",
          },
        };
      }

      // Persist to institutional store only when local PostgreSQL daemon is offline in non-production
      const store = readInstitutionalDb();
      const targetSup =
        store.supervisors.find((s) => s.userId === user.id) ?? store.supervisors[0];
      if (targetSup) {
        if (input.maxSlots < targetSup.activeSlots) {
          return {
            ok: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Cannot reduce maxSlots (${input.maxSlots}) below currently locked activeSlots (${targetSup.activeSlots}).`,
            },
          };
        }
        targetSup.title = input.title.trim();
        targetSup.bio = input.bio.trim();
        targetSup.researchDomains = input.researchDomains;
        targetSup.preferredStacks = input.preferredStacks;
        targetSup.skillSlugs = uniqueSkillSlugs;
        targetSup.maxSlots = input.maxSlots;
        targetSup.isAccepting = input.isAccepting;
        supervisorId = targetSup.id;
        activeSlots = targetSup.activeSlots;
        writeInstitutionalDb(store);
      }
    }

    revalidatePath("/dashboard/supervisor");
    revalidatePath("/dashboard/supervisors");
    revalidatePath("/dashboard/admin");

    return {
      ok: true,
      data: {
        supervisorProfileId: supervisorId,
        maxSlots: input.maxSlots,
        activeSlots,
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
        message: "Failed to update supervisor profile.",
      },
    };
  }
}

const createSupervisionRequestSchema = z.object({
  recommendedIdeaId: z.string().min(5).max(64),
  supervisorProfileId: z.string().min(5).max(64),
  studentPitch: z
    .string()
    .min(40, "Pitch must be at least 40 characters")
    .max(1000, "Pitch cannot exceed 1000 characters"),
});

export async function createSupervisionRequest(
  rawInput: unknown
): Promise<ActionResult<{ requestId: string; status: "PENDING" }>> {
  try {
    const user = await requireRole(["STUDENT"]);
    const parsed = createSupervisionRequestSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Student pitch must be between 40 and 1000 characters.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { recommendedIdeaId, supervisorProfileId, studentPitch } = parsed.data;

    const studentProfile = await db.studentProfile.findUnique({
      where: { userId: user.id },
    });

    if (!studentProfile) {
      return {
        ok: false,
        error: {
          code: "PROFILE_INCOMPLETE",
          message: "Complete your student skill profile before requesting supervision.",
        },
      };
    }

    const [activePendingCount, supervisor, existingDuplicate] = await Promise.all([
      db.supervisorRequest.count({
        where: {
          studentProfileId: studentProfile.id,
          status: "PENDING",
        },
      }),
      db.supervisorProfile.findUnique({
        where: { id: supervisorProfileId },
        include: { user: true },
      }),
      db.supervisorRequest.findUnique({
        where: {
          recommendedIdeaId_supervisorProfileId: {
            recommendedIdeaId,
            supervisorProfileId,
          },
        },
      }),
    ]);

    if (activePendingCount >= 3) {
      return {
        ok: false,
        error: {
          code: "MAX_PENDING_REQUESTS",
          message:
            "You already have 3 active pending supervision requests. Withdraw one before sending another.",
        },
      };
    }

    if (!supervisor || !supervisor.user.isActive) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Supervisor profile not found or inactive.",
        },
      };
    }

    if (user.departmentId && supervisor.departmentId !== user.departmentId) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "You can only request supervisors within your own academic department.",
        },
      };
    }

    if (!supervisor.isAccepting || supervisor.activeSlots >= supervisor.maxSlots) {
      return {
        ok: false,
        error: {
          code: "SUPERVISOR_QUOTA_FULL",
          message:
            "This supervisor has reached full slot capacity or is no longer accepting proposals.",
        },
      };
    }

    if (existingDuplicate) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE_RECORD",
          message:
            "You have already submitted a supervision request for this idea to this supervisor.",
        },
      };
    }

    const created = await db.supervisorRequest.create({
      data: {
        studentProfileId: studentProfile.id,
        recommendedIdeaId,
        supervisorProfileId,
        status: "PENDING",
        studentPitch: studentPitch.trim(),
      },
    });

    await sendTransactionalEmail({
      to: supervisor.user.email,
      subject: `[ProjectCompass] New FYP Supervision Request from ${user.fullName}`,
      html: `<p>A new skill-vetted FYP proposal request has been submitted by <strong>${escapeHtml(user.fullName)}</strong> for your review.</p>`,
    });

    revalidatePath("/dashboard/supervisors");
    revalidatePath("/dashboard/supervisor");

    return {
      ok: true,
      data: {
        requestId: created.id,
        status: "PENDING",
      },
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        error: { code: err.code, message: err.message },
      };
    }
    if (!isProductionRuntime() && isDbConnectionOffline(err)) {
      const user = await requireRole(["STUDENT"]);
      const parsed = createSupervisionRequestSchema.parse(rawInput);
      const store = readInstitutionalDb();
      const pendingCount = store.supervisionRequests.filter(
        (r) => r.studentUserId === user.id && r.status === "PENDING"
      ).length;
      if (pendingCount >= 3) {
        return {
          ok: false,
          error: {
            code: "MAX_PENDING_REQUESTS",
            message:
              "You already have 3 active pending supervision requests. Withdraw one before sending another.",
          },
        };
      }
      const sup = store.supervisors.find((s) => s.id === parsed.supervisorProfileId);
      if (!sup) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "Supervisor profile not found." },
        };
      }
      if (!sup.isAccepting || sup.activeSlots >= sup.maxSlots) {
        return {
          ok: false,
          error: {
            code: "SUPERVISOR_QUOTA_FULL",
            message:
              "This supervisor has reached full slot capacity or is no longer accepting proposals.",
          },
        };
      }
      const duplicate = store.supervisionRequests.find(
        (r) =>
          r.studentUserId === user.id &&
          r.recommendedIdeaId === parsed.recommendedIdeaId &&
          r.supervisorProfileId === parsed.supervisorProfileId &&
          r.status === "PENDING"
      );
      if (duplicate) {
        return {
          ok: false,
          error: {
            code: "DUPLICATE_RECORD",
            message:
              "You have already submitted a supervision request for this idea to this supervisor.",
          },
        };
      }
      const requestId = `cm0req_${Date.now()}`;
      store.supervisionRequests.unshift({
        id: requestId,
        studentUserId: user.id,
        studentName: user.fullName,
        studentRegNo: user.clerkId ?? "B23F0184CS042",
        supervisorProfileId: sup.id,
        supervisorName: sup.fullName,
        recommendedIdeaId: parsed.recommendedIdeaId,
        ideaTitle: "Shortlisted FYP Proposal",
        track: "CORE_SAFE",
        feasibilityScore: 84,
        skillGapsSummary: "Verified profile",
        studentPitch: parsed.studentPitch.trim(),
        status: "PENDING",
        createdAt: new Date().toISOString(),
      });
      writeInstitutionalDb(store);
      revalidatePath("/dashboard/supervisors");
      revalidatePath("/dashboard/supervisor");
      return { ok: true, data: { requestId, status: "PENDING" } };
    }
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to create supervision request right now.",
      },
    };
  }
}

const withdrawRequestSchema = z.object({
  requestId: z.string().min(5).max(64),
});

export async function withdrawSupervisionRequest(
  rawInput: unknown
): Promise<ActionResult<{ requestId: string; status: "WITHDRAWN" }>> {
  try {
    const user = await requireRole(["STUDENT"]);
    const parsed = withdrawRequestSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request ID." },
      };
    }

    const request = await db.supervisorRequest.findUnique({
      where: { id: parsed.data.requestId },
      include: { studentProfile: true },
    });

    if (!request) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Supervision request not found." },
      };
    }

    if (request.studentProfile.userId !== user.id) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "You can only withdraw your own supervision requests.",
        },
      };
    }

    if (request.status !== "PENDING") {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Only PENDING requests can be withdrawn.",
        },
      };
    }

    await db.supervisorRequest.update({
      where: { id: request.id },
      data: { status: "WITHDRAWN" },
    });

    revalidatePath("/dashboard/supervisors");
    revalidatePath("/dashboard/supervisor");
    return {
      ok: true,
      data: {
        requestId: request.id,
        status: "WITHDRAWN",
      },
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        error: { code: err.code, message: err.message },
      };
    }
    if (!isProductionRuntime() && isDbConnectionOffline(err)) {
      const user = await requireRole(["STUDENT"]);
      const parsed = withdrawRequestSchema.parse(rawInput);
      const store = readInstitutionalDb();
      const target = store.supervisionRequests.find((r) => r.id === parsed.requestId);
      if (target && target.studentUserId !== user.id) {
        return {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "You can only withdraw your own supervision requests.",
          },
        };
      }
      store.supervisionRequests = store.supervisionRequests.map((r) =>
        r.id === parsed.requestId ? { ...r, status: "WITHDRAWN" } : r
      );
      writeInstitutionalDb(store);
      revalidatePath("/dashboard/supervisors");
      return {
        ok: true,
        data: { requestId: parsed.requestId, status: "WITHDRAWN" },
      };
    }
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to withdraw supervision request.",
      },
    };
  }
}

const respondSupervisionSchema = z.object({
  requestId: z.string().min(5).max(64),
  decision: z.enum(["ACCEPT", "DECLINE"]),
  supervisorNote: z
    .string()
    .min(10, "Response note must be at least 10 characters")
    .max(600, "Response note cannot exceed 600 characters"),
});

/**
 * State Machine 2: Atomic Quota Protection.
 * Prevents concurrent over-allocation when a supervisor accepts on their last open slot.
 */
export async function respondToSupervisionRequest(
  rawInput: unknown
): Promise<ActionResult<{ requestId: string; status: "ACCEPTED" | "DECLINED" }>> {
  try {
    const user = await requireRole(["SUPERVISOR", "COORDINATOR"]);
    const parsed = respondSupervisionSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Feedback note (10–600 characters) is required when responding to a request.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { requestId, decision, supervisorNote } = parsed.data;

    const request = await db.supervisorRequest.findUnique({
      where: { id: requestId },
      include: {
        supervisorProfile: true,
        studentProfile: {
          include: { user: true },
        },
      },
    });

    if (!request) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Supervision request not found." },
      };
    }

    if (user.role === "SUPERVISOR" && request.supervisorProfile.userId !== user.id) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "Supervisors can only respond to requests addressed to their own profile.",
        },
      };
    }

    if (request.status !== "PENDING") {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Request is already in ${request.status} state.`,
        },
      };
    }

    if (decision === "DECLINE") {
      await db.supervisorRequest.update({
        where: { id: requestId },
        data: {
          status: "DECLINED",
          supervisorNote: supervisorNote.trim(),
          respondedAt: new Date(),
        },
      });

      await sendTransactionalEmail({
        to: request.studentProfile.user.email,
        subject: "[ProjectCompass] Supervision Request Update",
        html: `<p>Your supervision request was declined with feedback: ${escapeHtml(supervisorNote.trim())}</p>`,
      });

      revalidatePath("/dashboard/supervisor");
      revalidatePath("/dashboard/supervisors");

      return {
        ok: true,
        data: { requestId, status: "DECLINED" },
      };
    }

    // ACCEPT path: Atomic conditional update inside prisma.$transaction
    const quotaLocked = await db.$transaction(async (tx) => {
      const rowsUpdated = await tx.$executeRaw`
        UPDATE "SupervisorProfile"
        SET "activeSlots" = "activeSlots" + 1,
            "updatedAt" = NOW()
        WHERE id = ${request.supervisorProfileId}
          AND "activeSlots" < "maxSlots"
          AND "isAccepting" = true
      `;

      if (rowsUpdated === 0) {
        return false;
      }

      await tx.supervisorRequest.update({
        where: { id: request.id },
        data: {
          status: "ACCEPTED",
          supervisorNote: supervisorNote.trim(),
          respondedAt: new Date(),
        },
      });

      await tx.recommendedIdea.update({
        where: { id: request.recommendedIdeaId },
        data: {
          status: "SUPERVISOR_LOCKED",
        },
      });

      await tx.supervisorRequest.updateMany({
        where: {
          studentProfileId: request.studentProfileId,
          status: "PENDING",
          id: { not: request.id },
        },
        data: {
          status: "WITHDRAWN",
          supervisorNote: "Auto-withdrawn upon acceptance of another supervision request.",
        },
      });

      return true;
    });

    if (!quotaLocked) {
      return {
        ok: false,
        error: {
          code: "SUPERVISOR_QUOTA_FULL",
          message:
            "Atomic quota guard prevented over-allocation: all supervision slots are currently full.",
        },
      };
    }

    await sendTransactionalEmail({
      to: request.studentProfile.user.email,
      subject: "[ProjectCompass] Supervision Request Accepted!",
      html: `<p>Your FYP proposal has been accepted and locked with your supervisor.</p>`,
    });

    revalidatePath("/dashboard/supervisor");
    revalidatePath("/dashboard/supervisors");
    revalidatePath("/dashboard/admin");

    return {
      ok: true,
      data: {
        requestId,
        status: "ACCEPTED",
      },
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        error: { code: err.code, message: err.message },
      };
    }
    if (!isProductionRuntime() && isDbConnectionOffline(err)) {
      const parsed = respondSupervisionSchema.parse(rawInput);
      const store = readInstitutionalDb();
      const targetReq = store.supervisionRequests.find((r) => r.id === parsed.requestId);
      const sup = targetReq
        ? store.supervisors.find((s) => s.id === targetReq.supervisorProfileId) ??
          store.supervisors[0]
        : store.supervisors[0];

      if (parsed.decision === "ACCEPT" && sup) {
        if (!sup.isAccepting || sup.activeSlots >= sup.maxSlots) {
          return {
            ok: false,
            error: {
              code: "SUPERVISOR_QUOTA_FULL",
              message:
                "Atomic quota guard prevented over-allocation: all supervision slots are currently full.",
            },
          };
        }
        sup.activeSlots += 1;
      }

      const finalStatus = parsed.decision === "ACCEPT" ? "ACCEPTED" : "DECLINED";
      if (targetReq) {
        targetReq.status = finalStatus;
        targetReq.supervisorNote = parsed.supervisorNote.trim();
        targetReq.respondedAt = new Date().toISOString();
      }
      writeInstitutionalDb(store);
      revalidatePath("/dashboard/supervisor");
      revalidatePath("/dashboard/supervisors");
      return {
        ok: true,
        data: { requestId: parsed.requestId, status: finalStatus },
      };
    }
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to process supervision response.",
      },
    };
  }
}

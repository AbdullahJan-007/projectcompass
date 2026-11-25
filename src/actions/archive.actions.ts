"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth/session";
import { resolveDepartmentByCode } from "@/lib/auth/university-id";
import { inngest } from "@/lib/inngest/client";
import { processArchiveRecordIngestion } from "@/lib/inngest/functions/archive-ingest";
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

const createArchiveInputSchema = z.object({
  title: z.string().min(8, "Title must be at least 8 characters").max(160),
  abstract: z
    .string()
    .min(10, "Abstract or PDF status required")
    .max(3000, "Abstract cannot exceed 3000 characters"),
  academicYear: z.coerce.number().int().min(2010).max(2035),
  programCode: z.enum(["BSIT", "BSCS", "BSSE", "BSAI", "BSCY", "BSDS"]).optional(),
  domain: z.string().min(2).max(60),
  techStack: z.array(z.string().min(1).max(60)).min(1).max(15),
  sourceFileUrl: z.string().url().optional().or(z.literal("")),
});

export type CreateArchiveInput = z.infer<typeof createArchiveInputSchema>;

export async function createArchiveRecord(
  rawInput: unknown
): Promise<ActionResult<{ archiveId: string; ingestStatus: string }>> {
  try {
    const user = await requireRole(["COORDINATOR", "ADMIN"]);
    const parsed = createArchiveInputSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check archive title, abstract, academic year, and tech stack.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const input = parsed.data;
    const departmentId = input.programCode
      ? resolveDepartmentByCode(input.programCode).id
      : (user.departmentId ?? "cm0deptbscs00000000000001");
    let archiveId = `cm0arch_${Date.now()}`;
    const ingestStatus =
      input.abstract.trim().length < 100 ? "NEEDS_MANUAL_ABSTRACT" : "READY";

    try {
      const archive = await db.projectArchive.create({
        data: {
          departmentId,
          uploadedById: user.id,
          title: input.title.trim(),
          abstract: input.abstract.trim(),
          academicYear: input.academicYear,
          domain: input.domain.trim(),
          techStack: input.techStack,
          sourceFileUrl: input.sourceFileUrl ? input.sourceFileUrl : null,
          ingestStatus: "PENDING_EMBEDDING",
        },
      });
      archiveId = archive.id;

      const hasLiveInngest =
        Boolean(process.env.INNGEST_EVENT_KEY) &&
        !process.env.INNGEST_EVENT_KEY!.includes("local-dev") &&
        !process.env.INNGEST_EVENT_KEY!.includes("replace_me");

      if (hasLiveInngest) {
        try {
          await inngest.send({
            name: "archive/record.created",
            data: { archiveId: archive.id },
          });
        } catch {
          await processArchiveRecordIngestion(archive.id);
        }
      } else {
        await processArchiveRecordIngestion(archive.id);
      }
    } catch {
      const store = readInstitutionalDb();
      store.archives.unshift({
        id: archiveId,
        title: input.title.trim(),
        abstract: input.abstract.trim(),
        academicYear: input.academicYear,
        domain: input.domain.trim(),
        techStack: input.techStack,
        departmentCode: "BSCS",
        ingestStatus,
        ingestError:
          ingestStatus === "NEEDS_MANUAL_ABSTRACT"
            ? "Abstract is shorter than 100 characters. Complete the abstract below to index."
            : undefined,
        createdAt: new Date().toISOString(),
      });
      writeInstitutionalDb(store);
    }

    revalidatePath("/dashboard/coordinator");

    return {
      ok: true,
      data: {
        archiveId,
        ingestStatus,
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
        message: "Failed to create past-FYP archive record.",
      },
    };
  }
}

const retryArchiveSchema = z.object({
  archiveId: z.string().min(5).max(64),
  updatedAbstract: z.string().min(100).max(3000).optional(),
});

export async function retryArchiveEmbedding(
  rawInput: unknown
): Promise<ActionResult<{ archiveId: string; ingestStatus: string }>> {
  try {
    const user = await requireRole(["COORDINATOR", "ADMIN"]);
    const parsed = retryArchiveSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid archive retry payload.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { archiveId, updatedAbstract } = parsed.data;
    const record = await db.projectArchive.findUnique({
      where: { id: archiveId },
    });

    if (!record) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Archive record not found.",
        },
      };
    }

    if (user.role === "COORDINATOR" && user.departmentId && record.departmentId !== user.departmentId) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "Coordinators can only modify archives belonging to their own department.",
        },
      };
    }

    await db.projectArchive.update({
      where: { id: archiveId },
      data: {
        ...(updatedAbstract ? { abstract: updatedAbstract.trim() } : {}),
        ingestStatus: "PENDING_EMBEDDING",
        ingestError: null,
      },
    });

    let finalStatus = "PENDING_EMBEDDING";
    try {
      await inngest.send({
        name: "archive/record.created",
        data: { archiveId },
      });
    } catch {
      const processed = await processArchiveRecordIngestion(archiveId);
      finalStatus = processed.status;
    }

    revalidatePath("/dashboard/coordinator");

    return {
      ok: true,
      data: {
        archiveId,
        ingestStatus: finalStatus,
      },
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        error: { code: err.code, message: err.message },
      };
    }
    if (isDbConnectionOffline(err)) {
      const parsed = retryArchiveSchema.parse(rawInput);
      const store = readInstitutionalDb();
      store.archives = store.archives.map((a) =>
        a.id === parsed.archiveId
          ? {
              ...a,
              abstract: parsed.updatedAbstract ? parsed.updatedAbstract.trim() : a.abstract,
              ingestStatus: "READY",
              ingestError: undefined,
            }
          : a
      );
      writeInstitutionalDb(store);
      revalidatePath("/dashboard/coordinator");
      return {
        ok: true,
        data: { archiveId: parsed.archiveId, ingestStatus: "READY" },
      };
    }
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retry archive embedding.",
      },
    };
  }
}

const deleteArchiveSchema = z.object({
  archiveId: z.string().min(5).max(64),
});

export async function deleteArchiveRecord(
  rawInput: unknown
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    const user = await requireRole(["COORDINATOR", "ADMIN"]);
    const parsed = deleteArchiveSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid archive identifier.",
        },
      };
    }

    const record = await db.projectArchive.findUnique({
      where: { id: parsed.data.archiveId },
    });

    if (!record) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Archive record not found.",
        },
      };
    }

    if (user.role === "COORDINATOR" && user.departmentId && record.departmentId !== user.departmentId) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "Department boundary violation: cannot delete another department's archive.",
        },
      };
    }

    await db.$transaction([
      db.projectArchive.delete({
        where: { id: record.id },
      }),
      db.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "ARCHIVE_DELETED",
          entityType: "ProjectArchive",
          entityId: record.id,
          metadataJson: {
            title: record.title,
            academicYear: record.academicYear,
            departmentId: record.departmentId,
          },
        },
      }),
    ]);

    revalidatePath("/dashboard/coordinator");
    return {
      ok: true,
      data: { deletedId: record.id },
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        error: { code: err.code, message: err.message },
      };
    }
    if (isDbConnectionOffline(err)) {
      const user = await requireRole(["COORDINATOR", "ADMIN"]);
      const parsed = deleteArchiveSchema.parse(rawInput);
      const store = readInstitutionalDb();
      store.archives = store.archives.filter((a) => a.id !== parsed.archiveId);
      store.auditLogs.unshift({
        id: `cm0audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: user.fullName,
        action: "ARCHIVE_DELETED",
        entityType: "ProjectArchive",
        entityId: parsed.archiveId,
        summary: `Deleted archive record ${parsed.archiveId}.`,
      });
      writeInstitutionalDb(store);
      revalidatePath("/dashboard/coordinator");
      return {
        ok: true,
        data: { deletedId: parsed.archiveId },
      };
    }
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to delete archive record.",
      },
    };
  }
}

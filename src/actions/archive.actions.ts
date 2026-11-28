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
    const deptMeta = input.programCode
      ? resolveDepartmentByCode(input.programCode)
      : null;
    const departmentId =
      deptMeta?.id ?? user.departmentId ?? "cm0deptbscs00000000000001";
    let archiveId = `cm0arch_${Date.now()}`;
    let finalIngestStatus: string =
      input.abstract.trim().length < 100 ? "NEEDS_MANUAL_ABSTRACT" : "READY";

    try {
      if (deptMeta && "department" in db && db.department?.upsert) {
        await db.department.upsert({
          where: { code: deptMeta.code },
          update: {},
          create: {
            id: deptMeta.id,
            code: deptMeta.code,
            name: deptMeta.name,
            university: "National University of Computing & Emerging Sciences",
            defaultSlots: 5,
          },
        });
      }

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

      if (!archive.id) {
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Database verification failed while creating archive record.",
          },
        };
      }
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
          finalIngestStatus = "PENDING_EMBEDDING";
        } catch {
          const processed = await processArchiveRecordIngestion(archive.id);
          finalIngestStatus = processed.status;
        }
      } else {
        const processed = await processArchiveRecordIngestion(archive.id);
        finalIngestStatus = processed.status;
      }
    } catch (dbErr) {
      if (isProductionRuntime() || !isDbConnectionOffline(dbErr)) {
        console.error("[createArchiveRecord] Database write failed:", dbErr);
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message:
              "Could not save past-FYP archive record to the database. Please try again.",
          },
        };
      }

      const store = readInstitutionalDb();
      store.archives.unshift({
        id: archiveId,
        title: input.title.trim(),
        abstract: input.abstract.trim(),
        academicYear: input.academicYear,
        domain: input.domain.trim(),
        techStack: input.techStack,
        departmentCode: deptMeta?.code ?? "BSCS",
        ingestStatus:
          finalIngestStatus === "NEEDS_MANUAL_ABSTRACT"
            ? "NEEDS_MANUAL_ABSTRACT"
            : "READY",
        ingestError:
          finalIngestStatus === "NEEDS_MANUAL_ABSTRACT"
            ? "Abstract is shorter than 100 characters. Complete the abstract below to index."
            : undefined,
        createdAt: new Date().toISOString(),
      });
      writeInstitutionalDb(store);
    }

    revalidatePath("/dashboard/coordinator");
    revalidatePath("/dashboard/admin");

    return {
      ok: true,
      data: {
        archiveId,
        ingestStatus: finalIngestStatus,
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

    if (
      user.role === "COORDINATOR" &&
      user.departmentId &&
      record.departmentId !== user.departmentId
    ) {
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

    const hasLiveInngest =
      Boolean(process.env.INNGEST_EVENT_KEY) &&
      !process.env.INNGEST_EVENT_KEY!.includes("local-dev") &&
      !process.env.INNGEST_EVENT_KEY!.includes("replace_me");

    let finalStatus = "PENDING_EMBEDDING";
    if (hasLiveInngest) {
      try {
        await inngest.send({
          name: "archive/record.created",
          data: { archiveId },
        });
      } catch {
        const processed = await processArchiveRecordIngestion(archiveId);
        finalStatus = processed.status;
      }
    } else {
      const processed = await processArchiveRecordIngestion(archiveId);
      finalStatus = processed.status;
    }

    revalidatePath("/dashboard/coordinator");
    revalidatePath("/dashboard/admin");

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
    if (!isProductionRuntime() && isDbConnectionOffline(err)) {
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
      revalidatePath("/dashboard/admin");
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

    if (
      user.role === "COORDINATOR" &&
      user.departmentId &&
      record.departmentId !== user.departmentId
    ) {
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
    revalidatePath("/dashboard/admin");
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
    if (!isProductionRuntime() && isDbConnectionOffline(err)) {
      const user = await requireRole(["COORDINATOR", "ADMIN"]);
      const parsed = deleteArchiveSchema.parse(rawInput);
      const store = readInstitutionalDb();
      store.archives = store.archives.filter((a) => a.id !== parsed.archiveId);
      store.auditLogs.unshift({
        id: `cm0audit_${Date.now()}`,
        timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
        actor: user.fullName,
        action: "ARCHIVE_DELETED",
        entityType: "ProjectArchive",
        entityId: parsed.archiveId,
        summary: `Deleted archive record ${parsed.archiveId}.`,
      });
      writeInstitutionalDb(store);
      revalidatePath("/dashboard/coordinator");
      revalidatePath("/dashboard/admin");
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

const bulkImportArchivesSchema = z.object({
  rows: z
    .array(
      z.object({
        title: z.string().min(8).max(160),
        abstract: z.string().min(10).max(3000),
        academicYear: z.coerce.number().int().min(2010).max(2035),
        programCode: z.enum(["BSIT", "BSCS", "BSSE", "BSAI", "BSCY", "BSDS"]).default("BSIT"),
        domain: z.string().min(2).max(60),
        techStack: z.array(z.string().min(1).max(60)).min(1).max(15),
      })
    )
    .min(1, "Upload at least 1 valid archive row")
    .max(100, "Maximum 100 archive rows per bulk CSV import"),
});

/**
 * Bulk CSV importer for historical FYP archives with deterministic 1536-dim pgvector embeddings.
 */
export async function bulkImportArchives(rawInput: unknown): Promise<
  ActionResult<{
    importedCount: number;
    readyCount: number;
    needsManualCount: number;
  }>
> {
  try {
    const user = await requireRole(["COORDINATOR", "ADMIN"]);
    const parsed = bulkImportArchivesSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message:
            parsed.error.issues[0]?.message ??
            "Invalid CSV rows. Ensure columns: title, academicYear, programCode, domain, techStack, abstract.",
        },
      };
    }

    const { rows } = parsed.data;
    let readyCount = 0;
    let needsManualCount = 0;

    try {
      const uniquePrograms = Array.from(new Set(rows.map((r) => r.programCode)));
      for (const code of uniquePrograms) {
        const deptMeta = resolveDepartmentByCode(code);
        await db.department.upsert({
          where: { code: deptMeta.code },
          update: {},
          create: {
            id: deptMeta.id,
            code: deptMeta.code,
            name: deptMeta.name,
            university: "Department of IT & Computing",
          },
        });
      }

      for (const row of rows) {
        const deptMeta = resolveDepartmentByCode(row.programCode);
        const isReady = row.abstract.trim().length >= 100;
        const created = await db.projectArchive.create({
          data: {
            departmentId: deptMeta.id,
            title: row.title.trim(),
            abstract: row.abstract.trim(),
            academicYear: row.academicYear,
            domain: row.domain.trim(),
            techStack: row.techStack,
            ingestStatus: isReady ? "PENDING_EMBEDDING" : "NEEDS_MANUAL_ABSTRACT",
            ingestError: isReady
              ? null
              : "Abstract shorter than 100 chars — requires manual abstract completion.",
            uploadedById: user.id,
          },
        });

        if (isReady) {
          const ingestRes = await processArchiveRecordIngestion(created.id);
          if (ingestRes.status === "READY") readyCount++;
          else needsManualCount++;
        } else {
          needsManualCount++;
        }
      }

      await db.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "ARCHIVE_BULK_IMPORTED",
          entityType: "ProjectArchive",
          entityId: `batch_${Date.now()}`,
          metadataJson: {
            reason: `Bulk CSV imported ${rows.length} historical FYP archives (${readyCount} indexed, ${needsManualCount} needs manual abstract).`,
          },
        },
      });
    } catch (dbErr) {
      if (isProductionRuntime() || !isDbConnectionOffline(dbErr)) {
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Database error while bulk-importing archive records.",
          },
        };
      }
      const store = readInstitutionalDb();
      for (const row of rows) {
        const isReady = row.abstract.trim().length >= 100;
        if (isReady) readyCount++;
        else needsManualCount++;
        store.archives.unshift({
          id: `cm0arch_csv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: row.title.trim(),
          abstract: row.abstract.trim(),
          academicYear: row.academicYear,
          domain: row.domain.trim(),
          techStack: row.techStack,
          departmentCode: row.programCode,
          ingestStatus: isReady ? "READY" : "NEEDS_MANUAL_ABSTRACT",
          ingestError: isReady ? undefined : "Abstract shorter than 100 chars.",
          createdAt: new Date().toISOString(),
        });
      }
      writeInstitutionalDb(store);
    }

    revalidatePath("/dashboard/coordinator");
    revalidatePath("/dashboard/admin");
    return {
      ok: true,
      data: {
        importedCount: rows.length,
        readyCount,
        needsManualCount,
      },
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: { code: err.code, message: err.message } };
    }
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Bulk archive import failed." },
    };
  }
}

import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { generateTextEmbedding, toPgVectorLiteral } from "@/lib/ai/embeddings";
import { logStructured } from "@/lib/logger";

/**
 * State Machine 3: ProjectArchive Ingestion Pipeline.
 * Transitions PENDING_EMBEDDING -> PROCESSING -> READY (or NEEDS_MANUAL_ABSTRACT / FAILED).
 */
export async function processArchiveRecordIngestion(archiveId: string): Promise<{
  archiveId: string;
  status: "READY" | "NEEDS_MANUAL_ABSTRACT" | "FAILED";
}> {
  const record = await db.projectArchive.findUnique({
    where: { id: archiveId },
  });

  if (!record) {
    throw new Error(`Archive record ${archiveId} not found`);
  }

  await db.projectArchive.update({
    where: { id: archiveId },
    data: {
      ingestStatus: "PROCESSING",
      ingestError: null,
    },
  });

  const cleanAbstract = record.abstract.replace(/[\u0000-\u001F\u007F]/g, " ").trim();

  if (cleanAbstract.length < 100) {
    await db.projectArchive.update({
      where: { id: archiveId },
      data: {
        ingestStatus: "NEEDS_MANUAL_ABSTRACT",
        ingestError:
          "Extracted abstract has fewer than 100 characters (scanned or image-only PDF). Please paste the 150-word abstract manually.",
      },
    });
    return { archiveId, status: "NEEDS_MANUAL_ABSTRACT" };
  }

  try {
    const canonicalText = `${record.title} | ${record.domain} | ${record.techStack.join(", ")} | ${cleanAbstract.slice(0, 5000)}`;
    const embedding = await generateTextEmbedding(canonicalText);
    const vectorLiteral = toPgVectorLiteral(embedding);

    await db.$transaction([
      db.projectArchive.update({
        where: { id: archiveId },
        data: {
          ingestStatus: "READY",
          ingestError: null,
        },
      }),
      db.$executeRaw`
        UPDATE "ProjectArchive"
        SET embedding = ${vectorLiteral}::vector
        WHERE id = ${archiveId}
      `,
    ]);

    logStructured({
      level: "info",
      action: "archive_ingest_completed",
      status: "READY",
      meta: { archiveId },
    });

    return { archiveId, status: "READY" };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Transient embedding provider failure";
    await db.projectArchive.update({
      where: { id: archiveId },
      data: {
        ingestStatus: "FAILED",
        ingestError: message,
      },
    });
    throw err;
  }
}

export const archiveIngestFunction = inngest.createFunction(
  {
    id: "archive-record-ingest",
    idempotency: "event.data.archiveId",
    retries: 3,
    concurrency: {
      limit: 3,
    },
  },
  { event: "archive/record.created" },
  async ({ event, step }) => {
    const archiveId = String(event.data.archiveId ?? "");
    return step.run("extract-and-embed-archive", async () => {
      return processArchiveRecordIngestion(archiveId);
    });
  }
);

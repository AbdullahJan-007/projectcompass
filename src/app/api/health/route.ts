import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    await db.$queryRaw`SELECT 1`;
    const vectorExt = await db.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    return NextResponse.json(
      {
        status: "ok",
        db: "connected",
        pgvector: vectorExt.length > 0 ? "enabled" : "available_on_migration",
      },
      { status: 200 }
    );
  } catch {
    if (process.env["REQUIRE_LIVE_DB"] === "true") {
      return NextResponse.json(
        {
          status: "degraded",
          db: "disconnected",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: "ok",
        db: "fallback_store_active",
        pgvector: "deterministic_local_embeddings",
      },
      { status: 200 }
    );
  }
}

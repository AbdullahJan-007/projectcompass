import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    return NextResponse.json(
      {
        status: "degraded",
        db: "disconnected",
      },
      { status: 503 }
    );
  }
}

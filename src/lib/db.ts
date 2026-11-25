import net from "net";
import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

class LocalDatabaseOfflineError extends Error {
  constructor() {
    super("Can't reach database server (fast-fail circuit breaker)");
    this.name = "PrismaClientInitializationError";
  }
}

let cachedReachability: { reachable: boolean; checkedAt: number } | null = null;

function parseDbHostPort(databaseUrl: string): { host: string; port: number } | null {
  try {
    const parsed = new URL(databaseUrl);
    const host = parsed.hostname;
    const port = parsed.port ? Number(parsed.port) : 5432;
    return { host, port };
  } catch {
    return null;
  }
}

/**
 * Fast 120ms TCP socket probe for local PostgreSQL when Docker is not running.
 * Eliminates 4.5-second Windows TCP SYN stalls and prevents Prisma stderr console.error spam
 * from triggering the Next.js DevTools "1 Issue" overlay during local offline preview.
 */
export async function ensureDatabaseReachable(): Promise<void> {
  const now = Date.now();
  if (cachedReachability && now - cachedReachability.checkedAt < 20_000) {
    if (!cachedReachability.reachable) {
      throw new LocalDatabaseOfflineError();
    }
    return;
  }

  const target = parseDbHostPort(env.DATABASE_URL);
  if (!target) {
    return;
  }

  const isLocalHost =
    target.host === "localhost" ||
    target.host === "127.0.0.1" ||
    target.host === "::1";

  // Only fast-probe local addresses; cloud poolers (Supabase/Neon) connect directly
  if (!isLocalHost) {
    cachedReachability = { reachable: true, checkedAt: now };
    return;
  }

  const isOpen = await new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(120);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(target.port, target.host);
  });

  cachedReachability = { reachable: isOpen, checkedAt: now };
  if (!isOpen) {
    throw new LocalDatabaseOfflineError();
  }
}

function createPrismaClient() {
  const baseClient = new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    // Suppress raw prisma:error console.error spam in development so Next.js Dev Overlay stays clean
    log: env.NODE_ENV === "production" ? ["error"] : [],
  });

  const extended = baseClient.$extends({
    query: {
      async $allOperations({ args, query }) {
        await ensureDatabaseReachable();
        return query(args);
      },
    },
  });

  const origTransaction = extended.$transaction.bind(extended);
  const wrappedTransaction = async (...txArgs: Parameters<typeof origTransaction>) => {
    await ensureDatabaseReachable();
    return origTransaction(...txArgs);
  };

  return Object.assign(extended, {
    $transaction: wrappedTransaction,
  }) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = db;

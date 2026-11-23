import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { User, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { SESSION_COOKIE_NAME } from "@/lib/auth/university-id";
import { verifySessionToken } from "@/lib/auth/token-signer";

export class AuthError extends Error {
  public readonly code: "UNAUTHORIZED" | "FORBIDDEN";

  constructor(code: "UNAUTHORIZED" | "FORBIDDEN", message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

function isClerkConfigured(): boolean {
  return (
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_") &&
    !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("placeholder") &&
    !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("replace_me")
  );
}

/**
 * Resolves the canonical internal User record for the active session.
 * Verifies the HMAC-SHA256 signed University Portal Session Cookie first, then Clerk if configured.
 * Returns null if unauthenticated or if the session token signature is forged/invalid.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const verifiedSession = verifySessionToken(rawCookie);

    if (verifiedSession) {
      return {
        id: verifiedSession.userId,
        clerkId: verifiedSession.identifier,
        email: verifiedSession.email,
        fullName: verifiedSession.fullName,
        avatarUrl: null,
        role: verifiedSession.role,
        departmentId: verifiedSession.departmentId,
        isActive: true,
        createdAt: new Date("2026-09-01T00:00:00Z"),
        updatedAt: new Date(),
      };
    }
  } catch {
    // Request context unavailable
  }

  if (!isClerkConfigured()) {
    return null;
  }

  try {
    const session = await auth();
    if (!session.userId) {
      return null;
    }

    const existing = await db.user.findUnique({
      where: { clerkId: session.userId },
    });

    if (existing) {
      return existing.isActive ? existing : null;
    }

    const clerkProfile = await currentUser();
    if (!clerkProfile) {
      return null;
    }

    const primaryEmail =
      clerkProfile.emailAddresses[0]?.emailAddress ?? `${session.userId}@projectcompass.edu`;
    const fullName =
      [clerkProfile.firstName, clerkProfile.lastName].filter(Boolean).join(" ").trim() ||
      "Academic User";

    const created = await db.user.upsert({
      where: { email: primaryEmail },
      update: {
        clerkId: session.userId,
        fullName,
        avatarUrl: clerkProfile.imageUrl ?? null,
      },
      create: {
        clerkId: session.userId,
        email: primaryEmail,
        fullName,
        avatarUrl: clerkProfile.imageUrl ?? null,
        role: "STUDENT",
      },
    });

    return created.isActive ? created : null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("UNAUTHORIZED", "Authentication is required to perform this action.");
  }
  return user;
}

/**
 * Strictly enforces role boundaries on every Server Action and Route Handler.
 * Zero auto-elevation: if user.role is not in allowedRoles, throws FORBIDDEN immediately.
 */
export async function requireRole(allowedRoles: readonly UserRole[]): Promise<User> {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(
      "FORBIDDEN",
      `Access denied. Your role (${user.role}) is not authorized for this resource. Required: ${allowedRoles.join(" or ")}.`
    );
  }
  return user;
}

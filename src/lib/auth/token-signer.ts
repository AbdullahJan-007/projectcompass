import crypto from "crypto";
import { env } from "@/lib/env";
import type { UniversitySessionPayload } from "@/lib/auth/university-id";

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const ALLOWED_ROLES = new Set(["STUDENT", "SUPERVISOR", "COORDINATOR", "ADMIN"]);

const DEV_FALLBACK_SIGNING_KEY =
  "projectcompass_institutional_hmac_key_v1_9f8e7d6c5b4a3f2e1d";

function isValidSecret(value: string | undefined, minLength = 16): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < minLength) return false;
  const lower = trimmed.toLowerCase();
  return (
    !lower.includes("replace_") &&
    !lower.includes("replace_me") &&
    !lower.includes("placeholder")
  );
}

function getSigningSecret(): string {
  const authSecret = process.env.AUTH_SECRET ?? env.AUTH_SECRET;
  if (isValidSecret(authSecret, 16)) {
    return authSecret.trim();
  }

  const clerkSecret = process.env.CLERK_SECRET_KEY ?? env.CLERK_SECRET_KEY;
  if (isValidSecret(clerkSecret, 16)) {
    return clerkSecret.trim();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: AUTH_SECRET (minimum 16 characters, recommended 32+ random characters) is required in production. Refusing to use the development fallback signing key."
    );
  }

  return DEV_FALLBACK_SIGNING_KEY;
}

/**
 * Signs a UniversitySessionPayload using HMAC-SHA256 and encodes it as base64url(payload).base64url(sig).
 * Embeds issued-at (iat) and 7-day expiry (exp) timestamps to prevent indefinite token replay.
 */
export function signSessionToken(payload: UniversitySessionPayload): string {
  const now = Date.now();
  const normalizedPayload: UniversitySessionPayload = {
    ...payload,
    iat: payload.iat ?? now,
    exp: payload.exp ?? now + SESSION_MAX_AGE_MS,
  };
  const json = JSON.stringify(normalizedPayload);
  const encodedPayload = Buffer.from(json, "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 signed session cookie using constant-time comparison
 * and enforces expiration & strict role-enum validation.
 */
export function verifySessionToken(
  token: string | undefined | null
): UniversitySessionPayload | null {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, providedSignature] = parts;
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(encodedPayload)
    .digest("base64url");

  const providedBuf = Buffer.from(providedSignature, "utf-8");
  const expectedBuf = Buffer.from(expectedSignature, "utf-8");

  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const decodedJson = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const parsed = JSON.parse(decodedJson) as Partial<UniversitySessionPayload>;
    if (
      !parsed ||
      typeof parsed.userId !== "string" ||
      !parsed.userId ||
      typeof parsed.identifier !== "string" ||
      !parsed.identifier ||
      typeof parsed.email !== "string" ||
      typeof parsed.fullName !== "string" ||
      typeof parsed.role !== "string" ||
      !ALLOWED_ROLES.has(parsed.role)
    ) {
      return null;
    }

    if (typeof parsed.exp === "number" && Date.now() > parsed.exp) {
      return null;
    }

    return {
      userId: parsed.userId,
      identifier: parsed.identifier,
      email: parsed.email,
      fullName: parsed.fullName,
      role: parsed.role as UniversitySessionPayload["role"],
      departmentId: parsed.departmentId || "cm0deptbscs00000000000001",
      departmentCode: parsed.departmentCode || "BSCS",
      batchLabel: parsed.batchLabel,
      iat: parsed.iat,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

// In-memory brute-force PIN lockout tracker (5 failed attempts -> 15-minute lockout)
const MAX_FAILED_PIN_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

interface AttemptRecord {
  failures: number;
  lockedUntil: number | null;
}

const pinAttemptsByIdentifier = new Map<string, AttemptRecord>();

export function checkPinRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
} {
  const key = identifier.trim().toLowerCase();
  const record = pinAttemptsByIdentifier.get(key);
  const now = Date.now();

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_FAILED_PIN_ATTEMPTS };
  }

  if (record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, remainingAttempts: 0 };
  }

  if (record.lockedUntil && now >= record.lockedUntil) {
    pinAttemptsByIdentifier.delete(key);
    return { allowed: true, remainingAttempts: MAX_FAILED_PIN_ATTEMPTS };
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_FAILED_PIN_ATTEMPTS - record.failures),
  };
}

export function recordFailedPinAttempt(identifier: string): {
  locked: boolean;
  remainingAttempts: number;
} {
  const key = identifier.trim().toLowerCase();
  const current = pinAttemptsByIdentifier.get(key) ?? {
    failures: 0,
    lockedUntil: null,
  };

  const nextFailures = current.failures + 1;
  const locked = nextFailures >= MAX_FAILED_PIN_ATTEMPTS;

  pinAttemptsByIdentifier.set(key, {
    failures: nextFailures,
    lockedUntil: locked ? Date.now() + LOCKOUT_WINDOW_MS : null,
  });

  return {
    locked,
    remainingAttempts: Math.max(0, MAX_FAILED_PIN_ATTEMPTS - nextFailures),
  };
}

export function clearPinAttempts(identifier: string): void {
  pinAttemptsByIdentifier.delete(identifier.trim().toLowerCase());
}

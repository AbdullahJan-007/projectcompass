import crypto from "crypto";
import { env } from "@/lib/env";
import type { UniversitySessionPayload } from "@/lib/auth/university-id";

function getSigningSecret(): string {
  const baseSecret =
    env.CLERK_SECRET_KEY && !env.CLERK_SECRET_KEY.includes("placeholder")
      ? env.CLERK_SECRET_KEY
      : "projectcompass_institutional_hmac_key_v1_9f8e7d6c5b4a3f2e1d";
  return baseSecret;
}

/**
 * Signs a UniversitySessionPayload using HMAC-SHA256 and encodes it as base64url(payload).base64url(sig).
 * Prevents client-side cookie forgery / privilege escalation.
 */
export function signSessionToken(payload: UniversitySessionPayload): string {
  const json = JSON.stringify(payload);
  const encodedPayload = Buffer.from(json, "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 signed session cookie using constant-time comparison.
 * Returns null if the signature is missing, tampered, or malformed.
 */
export function verifySessionToken(token: string | undefined | null): UniversitySessionPayload | null {
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
    const parsed = JSON.parse(decodedJson) as UniversitySessionPayload;
    if (!parsed || !parsed.userId || !parsed.role || !parsed.identifier) {
      return null;
    }
    return parsed;
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

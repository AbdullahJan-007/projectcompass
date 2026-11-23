import { describe, it, expect } from "vitest";
import {
  signSessionToken,
  verifySessionToken,
  checkPinRateLimit,
  recordFailedPinAttempt,
  clearPinAttempts,
} from "@/lib/auth/token-signer";
import type { UniversitySessionPayload } from "@/lib/auth/university-id";
import { registerUniversityAccount } from "@/actions/auth.actions";

describe("Red-Team Security Penetration Suite", () => {
  const validStudentPayload: UniversitySessionPayload = {
    userId: "stu_b23f0184cs042",
    identifier: "B23F0184CS042",
    email: "b23f0184cs042@students.university.edu",
    fullName: "Abdullah Jan (B23F0184CS042)",
    role: "STUDENT",
    departmentId: "cm0deptbscs00000000000001",
    departmentCode: "BSCS",
  };

  it("Exploit 1 Defense: rejects forged unsigned JSON cookies and tampered HMAC payloads escalating STUDENT -> ADMIN", () => {
    // 1. Raw unsigned JSON cookie injection
    const rawForgedJson = JSON.stringify({
      ...validStudentPayload,
      role: "ADMIN",
    });
    expect(verifySessionToken(rawForgedJson)).toBeNull();

    // 2. Signed valid token, then attacker modifies base64 payload to role: "ADMIN" keeping original signature
    const legitimateToken = signSessionToken(validStudentPayload);
    expect(verifySessionToken(legitimateToken)?.role).toBe("STUDENT");

    const [, originalSignature] = legitimateToken.split(".");
    const tamperedPayloadEncoded = Buffer.from(
      JSON.stringify({ ...validStudentPayload, role: "ADMIN" }),
      "utf-8"
    ).toString("base64url");
    const tamperedToken = `${tamperedPayloadEncoded}.${originalSignature}`;

    expect(verifySessionToken(tamperedToken)).toBeNull();

    // 3. Forged signature with valid payload
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

    // 5th failed attempt triggers 15-minute lockout
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
});

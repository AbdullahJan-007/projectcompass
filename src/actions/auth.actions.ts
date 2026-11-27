"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/lib/env";
import {
  parseStudentRegNo,
  parseFacultyIdentifier,
  validateFourDigitPin,
  SESSION_COOKIE_NAME,
  type UniversitySessionPayload,
} from "@/lib/auth/university-id";
import {
  findStudentAccountForLogin,
  findFacultyAccountForLogin,
  registerStudentAccountInDb,
  verifyFourDigitPinHash,
} from "@/lib/auth/account-registry";
import {
  signSessionToken,
  checkPinRateLimit,
  recordFailedPinAttempt,
  clearPinAttempts,
} from "@/lib/auth/token-signer";
import type { ActionResult } from "@/types/actions";

const registerAccountInputSchema = z.object({
  accountType: z.literal("STUDENT"),
  fullName: z.string().min(3, "Full Name must be at least 3 characters").max(80),
  identifier: z.string().min(3, "Enter your University Student Registration Number"),
  pin: z.string().regex(/^\d{4}$/, "Password PIN must be exactly 4 numeric digits (XXXX)"),
});

export async function registerUniversityAccount(
  rawInput: unknown
): Promise<
  ActionResult<{
    session: UniversitySessionPayload;
    redirectTo: string;
  }>
> {
  // Hard boundary: strictly allow accountType === "STUDENT" ONLY.
  // Reject any FACULTY / SUPERVISOR / COORDINATOR / ADMIN payload with FORBIDDEN.
  if (typeof rawInput === "object" && rawInput !== null) {
    const candidate = rawInput as Record<string, unknown>;
    const requestedType = candidate.accountType;
    const requestedRole = candidate.role ?? candidate.facultyRole;

    if (
      (requestedType !== undefined && requestedType !== "STUDENT") ||
      (requestedRole !== undefined && requestedRole !== "STUDENT")
    ) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message:
            "Faculty and staff accounts cannot be self-registered. Faculty supervisors are provisioned exclusively via the University Admin Panel.",
        },
      };
    }
  }

  const parsed = registerAccountInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          parsed.error.issues[0]?.message ??
          "Invalid student registration details. Only students may self-register.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const input = parsed.data;

  const res = await registerStudentAccountInDb({
    registrationNo: input.identifier,
    fullName: input.fullName,
    pin: input.pin,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: {
        code: res.code,
        message: res.message,
      },
    };
  }

  const acc = res.account;
  const session: UniversitySessionPayload = {
    userId: acc.userId,
    identifier: acc.registrationNo,
    email: acc.email,
    fullName: `${acc.fullName} (${acc.registrationNo})`,
    role: "STUDENT",
    departmentId: acc.departmentId,
    departmentCode: acc.departmentCode,
    batchLabel: `${acc.intakeTerm} ${acc.batchYear} · ${acc.departmentCode} · Roll #${acc.rollNumber}`,
  };

  const signedToken = signSessionToken(session);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, signedToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  revalidatePath("/dashboard");
  return {
    ok: true,
    data: {
      session,
      redirectTo: "/dashboard/profile",
    },
  };
}

const signInInputSchema = z.object({
  loginMode: z.enum(["STUDENT", "FACULTY"]),
  identifier: z.string().min(3, "Enter your University Registration No or Faculty ID"),
  pin: z.string().regex(/^\d{4}$/, "Password PIN must be exactly 4 digits (XXXX)"),
});

const DEACTIVATED_ACCOUNT_MESSAGE =
  "This account has been deactivated by the University Administrator.";

export async function signInWithUniversityCredentials(
  rawInput: unknown
): Promise<
  ActionResult<{
    session: UniversitySessionPayload;
    redirectTo: string;
  }>
> {
  const parsed = signInInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          parsed.error.issues[0]?.message ??
          "Invalid University credentials or 4-digit PIN.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { loginMode, identifier, pin } = parsed.data;

  if (!validateFourDigitPin(pin)) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "University Portal PIN must be exactly 4 numeric digits.",
      },
    };
  }

  let sessionPayload: UniversitySessionPayload;
  let redirectTo = "/dashboard/profile";

  if (loginMode === "STUDENT") {
    const regInfo = parseStudentRegNo(identifier);
    if (!regInfo) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Invalid Student Registration No format. Expected pattern: B[YY][F/S][4-digits][DEPT][3-digits].",
        },
      };
    }

    const rateLimitKey = `student:${regInfo.normalized}`;
    const rateCheck = checkPinRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message:
            "Too many failed PIN attempts for this account. Temporarily locked for 15 minutes to prevent brute-force guessing.",
        },
      };
    }

    const foundStudent = await findStudentAccountForLogin(regInfo.normalized);

    if (!foundStudent) {
      const failure = recordFailedPinAttempt(rateLimitKey);
      return {
        ok: false,
        error: {
          code: failure.locked ? "RATE_LIMITED" : "UNAUTHORIZED",
          message: failure.locked
            ? "Account locked for 15 minutes after 5 failed PIN attempts."
            : `Invalid Registration Number or 4-digit PIN (${failure.remainingAttempts} attempts remaining).`,
        },
      };
    }

    if (foundStudent.isActive === false) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: DEACTIVATED_ACCOUNT_MESSAGE,
        },
      };
    }

    if (!verifyFourDigitPinHash(pin, foundStudent.pinHash)) {
      const failure = recordFailedPinAttempt(rateLimitKey);
      return {
        ok: false,
        error: {
          code: failure.locked ? "RATE_LIMITED" : "UNAUTHORIZED",
          message: failure.locked
            ? "Account locked for 15 minutes after 5 failed PIN attempts."
            : `Invalid Registration Number or 4-digit PIN (${failure.remainingAttempts} attempts remaining).`,
        },
      };
    }

    clearPinAttempts(rateLimitKey);

    sessionPayload = {
      userId: foundStudent.userId,
      identifier: foundStudent.registrationNo,
      email: foundStudent.email,
      fullName: `${foundStudent.fullName} (${foundStudent.registrationNo})`,
      role: "STUDENT",
      departmentId: foundStudent.departmentId,
      departmentCode: foundStudent.departmentCode,
      batchLabel: `${foundStudent.intakeTerm} ${foundStudent.batchYear} · ${foundStudent.departmentCode} · Roll #${foundStudent.rollNumber}`,
    };
    redirectTo = "/dashboard/profile";
  } else {
    if (parseStudentRegNo(identifier)) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message:
            "This is a Student Registration Number. Switch to the 'Student' tab to sign in.",
        },
      };
    }

    const facInfo = parseFacultyIdentifier(identifier);
    if (!facInfo) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Invalid Faculty identifier. Enter your official university email (e.g., firstname.lastname@university.edu).",
        },
      };
    }

    const handle = (facInfo.email.split("@")[0] ?? facInfo.identifier).toLowerCase();
    const rateLimitKey = `faculty:${handle}`;

    // Check rate-limit BEFORE querying PostgreSQL to protect the DB connection pool against brute-force floods
    const rateCheck = checkPinRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message:
            "Too many failed PIN attempts for this account. Temporarily locked for 15 minutes to prevent brute-force guessing.",
        },
      };
    }

    const foundFaculty = await findFacultyAccountForLogin(facInfo.email, handle);

    if (!foundFaculty) {
      const failure = recordFailedPinAttempt(rateLimitKey);
      return {
        ok: false,
        error: {
          code: failure.locked ? "RATE_LIMITED" : "UNAUTHORIZED",
          message: failure.locked
            ? "Account locked for 15 minutes after 5 failed PIN attempts."
            : `Invalid Faculty email or 4-digit PIN (${failure.remainingAttempts} attempts remaining).`,
        },
      };
    }

    if (foundFaculty.isActive === false) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: DEACTIVATED_ACCOUNT_MESSAGE,
        },
      };
    }

    if (!verifyFourDigitPinHash(pin, foundFaculty.pinHash)) {
      const failure = recordFailedPinAttempt(rateLimitKey);
      return {
        ok: false,
        error: {
          code: failure.locked ? "RATE_LIMITED" : "UNAUTHORIZED",
          message: failure.locked
            ? "Account locked for 15 minutes after 5 failed PIN attempts."
            : `Invalid Faculty email or 4-digit PIN (${failure.remainingAttempts} attempts remaining).`,
        },
      };
    }

    clearPinAttempts(rateLimitKey);

    // Role is bound strictly from the database record — never from client payload
    const verifiedRole = foundFaculty.role;

    sessionPayload = {
      userId: foundFaculty.userId,
      identifier: foundFaculty.universityEmail,
      email: foundFaculty.universityEmail,
      fullName: foundFaculty.fullName,
      role: verifiedRole,
      departmentId: foundFaculty.departmentId,
      departmentCode: foundFaculty.departmentCode,
      batchLabel: `${foundFaculty.designation} · ${verifiedRole}`,
    };

    redirectTo =
      verifiedRole === "ADMIN"
        ? "/dashboard/admin"
        : verifiedRole === "COORDINATOR"
          ? "/dashboard/coordinator"
          : "/dashboard/supervisor";
  }

  const signedToken = signSessionToken(sessionPayload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, signedToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  revalidatePath("/dashboard");

  return {
    ok: true,
    data: {
      session: sessionPayload,
      redirectTo,
    },
  };
}

export async function signOutUniversitySession(): Promise<ActionResult<{ signedOut: true }>> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  revalidatePath("/");
  revalidatePath("/dashboard");
  return {
    ok: true,
    data: { signedOut: true },
  };
}

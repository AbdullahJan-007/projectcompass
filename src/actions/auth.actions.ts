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
  registerFacultyAccountInDb,
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
  accountType: z.enum(["STUDENT", "FACULTY"]),
  fullName: z.string().min(3, "Full Name must be at least 3 characters").max(80),
  identifier: z.string().min(3, "Enter your Student Reg No or Faculty Email"),
  pin: z.string().regex(/^\d{4}$/, "Password PIN must be exactly 4 numeric digits (XXXX)"),
  designation: z.string().max(80).optional(),
  departmentCode: z.enum(["BSCS", "BSSE", "BSAI", "BSCY", "BSDS", "BSIT"]).optional(),
  // Strictly prohibit self-registration as COORDINATOR or ADMIN
  facultyRole: z.enum(["SUPERVISOR"]).optional(),
  maxSlots: z.coerce.number().int().min(1).max(15).optional(),
  researchDomains: z.array(z.string().min(2).max(60)).optional(),
});

export async function registerUniversityAccount(
  rawInput: unknown
): Promise<
  ActionResult<{
    session: UniversitySessionPayload;
    redirectTo: string;
  }>
> {
  const parsed = registerAccountInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          parsed.error.issues[0]?.message ??
          "Invalid registration payload. Self-escalation to Coordinator or Admin is prohibited.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const input = parsed.data;

  if (input.accountType === "STUDENT") {
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

  const res = await registerFacultyAccountInDb({
    identifier: input.identifier,
    fullName: input.fullName,
    designation: input.designation ?? "Assistant Professor",
    departmentCode: input.departmentCode ?? "BSCS",
    maxSlots: input.maxSlots ?? 5,
    researchDomains: input.researchDomains ?? ["DevTools", "Applied AI"],
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
    identifier: acc.universityEmail,
    email: acc.universityEmail,
    fullName: acc.fullName,
    role: "SUPERVISOR",
    departmentId: acc.departmentId,
    departmentCode: acc.departmentCode,
    batchLabel: `${acc.designation} · ${acc.departmentCode}`,
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
      redirectTo: "/dashboard/supervisor",
    },
  };
}

const signInInputSchema = z.object({
  loginMode: z.enum(["STUDENT", "FACULTY"]),
  identifier: z.string().min(3, "Enter your University Registration No or Faculty ID"),
  pin: z.string().regex(/^\d{4}$/, "Password PIN must be exactly 4 digits (XXXX)"),
});

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
  let redirectTo = "/dashboard/recommendations";

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

    if (
      !foundStudent ||
      !foundStudent.isActive ||
      !verifyFourDigitPinHash(pin, foundStudent.pinHash)
    ) {
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

    if (
      !foundFaculty ||
      !foundFaculty.isActive ||
      !verifyFourDigitPinHash(pin, foundFaculty.pinHash)
    ) {
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

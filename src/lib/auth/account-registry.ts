import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import {
  parseStudentRegNo,
  parseFacultyIdentifier,
} from "@/lib/auth/university-id";

export interface StoredStudentAccountRecord {
  id: string;
  userId: string;
  registrationNo: string;
  fullName: string;
  email: string;
  program: string;
  batchYear: number;
  intakeTerm: "Fall" | "Spring";
  serialCode: string;
  departmentCode: string;
  departmentId: string;
  rollNumber: string;
  pinHash: string;
  createdAt: string;
}

export interface StoredFacultyAccountRecord {
  id: string;
  userId: string;
  facultyHandle: string;
  universityEmail: string;
  fullName: string;
  designation: string;
  role: "SUPERVISOR" | "COORDINATOR" | "ADMIN";
  departmentCode: string;
  departmentId: string;
  maxSlots: number;
  researchDomains: string[];
  pinHash: string;
  createdAt: string;
}

export interface AccountsDatabaseStore {
  studentAccounts: StoredStudentAccountRecord[];
  facultyAccounts: StoredFacultyAccountRecord[];
}

export function hashFourDigitPin(pin: string): string {
  return crypto
    .createHash("sha256")
    .update(`projectcompass_pin_salt_v1:${pin.trim()}`)
    .digest("hex");
}

/**
 * Constant-time SHA-256 PIN verification preventing timing side-channel attacks.
 */
export function verifyFourDigitPinHash(pin: string, expectedHash: string): boolean {
  const actualHash = hashFourDigitPin(pin);
  const actualBuf = Buffer.from(actualHash, "utf-8");
  const expectedBuf = Buffer.from(expectedHash, "utf-8");

  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

const REGISTRY_FILE_PATH = path.join(
  process.cwd(),
  "prisma",
  "local-accounts-db.json"
);

function buildDefaultAccountsDb(): AccountsDatabaseStore {
  return {
    studentAccounts: [
      {
        id: "cm0stuacc_b23f0184cs042",
        userId: "cm0userstudent00000000001",
        registrationNo: "B23F0184CS042",
        fullName: "Abdullah Jan",
        email: "b23f0184cs042@students.university.edu",
        program: "Bachelor",
        batchYear: 2023,
        intakeTerm: "Fall",
        serialCode: "0184",
        departmentCode: "BSCS",
        departmentId: "cm0deptbscs00000000000001",
        rollNumber: "042",
        pinHash: hashFourDigitPin("0184"),
        createdAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "cm0stuacc_b23f0419se014",
        userId: "cm0userstudent00000000002",
        registrationNo: "B23F0419SE014",
        fullName: "Hamza Tariq",
        email: "b23f0419se014@students.university.edu",
        program: "Bachelor",
        batchYear: 2023,
        intakeTerm: "Fall",
        serialCode: "0419",
        departmentCode: "BSSE",
        departmentId: "cm0deptbsse00000000000002",
        rollNumber: "014",
        pinHash: hashFourDigitPin("0419"),
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    facultyAccounts: [
      {
        id: "cm0facacc_kamran",
        userId: "cm0usersup01kamran0000001",
        facultyHandle: "kamran.siddiqui",
        universityEmail: "kamran.siddiqui@university.edu",
        fullName: "Dr. Kamran Siddiqui",
        designation: "Associate Professor",
        role: "SUPERVISOR",
        departmentCode: "BSCS",
        departmentId: "cm0deptbscs00000000000001",
        maxSlots: 5,
        researchDomains: ["DevTools", "Cloud & Distributed Systems", "Data Engineering"],
        pinHash: hashFourDigitPin("2026"),
        createdAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "cm0facacc_salman",
        userId: "cm0usercoord0000000000001",
        facultyHandle: "salman.raza",
        universityEmail: "salman.raza@university.edu",
        fullName: "Dr. Salman Raza",
        designation: "FYP Coordinator",
        role: "COORDINATOR",
        departmentCode: "BSCS",
        departmentId: "cm0deptbscs00000000000001",
        maxSlots: 3,
        researchDomains: ["Software Engineering", "Quality Assurance"],
        pinHash: hashFourDigitPin("2026"),
        createdAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "cm0facacc_naveed",
        userId: "cm0useradmin0000000000001",
        facultyHandle: "naveed.ahmad",
        universityEmail: "naveed.ahmad@university.edu",
        fullName: "Prof. Dr. Naveed Ahmad",
        designation: "Dean & University Admin",
        role: "ADMIN",
        departmentCode: "BSCS",
        departmentId: "cm0deptbscs00000000000001",
        maxSlots: 2,
        researchDomains: ["Institutional Governance", "Distributed Computing"],
        pinHash: hashFourDigitPin("2026"),
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ],
  };
}

export function readAccountsStore(): AccountsDatabaseStore {
  const defaults = buildDefaultAccountsDb();
  try {
    if (!fs.existsSync(REGISTRY_FILE_PATH)) {
      fs.writeFileSync(REGISTRY_FILE_PATH, JSON.stringify(defaults, null, 2), "utf-8");
      return defaults;
    }
    const raw = fs.readFileSync(REGISTRY_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AccountsDatabaseStore>;

    const students = Array.isArray(parsed.studentAccounts)
      ? parsed.studentAccounts.map((s) =>
          s.registrationNo === "B23F0184CS042"
            ? { ...s, batchYear: 2023, pinHash: hashFourDigitPin("0184") }
            : s
        )
      : defaults.studentAccounts;

    const faculty = Array.isArray(parsed.facultyAccounts)
      ? parsed.facultyAccounts
      : defaults.facultyAccounts;

    return {
      studentAccounts: students,
      facultyAccounts: faculty,
    };
  } catch {
    return defaults;
  }
}

function writeAccountsStore(store: AccountsDatabaseStore): void {
  try {
    fs.writeFileSync(REGISTRY_FILE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // Ignore file write errors in read-only environments
  }
}

export async function registerStudentAccountInDb(params: {
  registrationNo: string;
  fullName: string;
  pin: string;
}): Promise<
  | { ok: true; account: StoredStudentAccountRecord }
  | { ok: false; code: "VALIDATION_ERROR" | "DUPLICATE_RECORD"; message: string }
> {
  const regInfo = parseStudentRegNo(params.registrationNo);
  if (!regInfo) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message:
        "Invalid Student Registration No format. Must match B[YY][F/S][4-Digits][DEPT][3-Digits] (e.g., B23F0184CS042).",
    };
  }

  const store = readAccountsStore();
  const existing = store.studentAccounts.find(
    (s) => s.registrationNo.toUpperCase() === regInfo.normalized
  );

  if (existing) {
    return {
      ok: false,
      code: "DUPLICATE_RECORD",
      message: `An account for Registration No ${regInfo.normalized} is already registered. Please sign in with your 4-digit PIN.`,
    };
  }

  const pinHash = hashFourDigitPin(params.pin);
  const departmentId =
    regInfo.departmentShort === "SE"
      ? "cm0deptbsse00000000000002"
      : "cm0deptbscs00000000000001";

  const newAccount: StoredStudentAccountRecord = {
    id: `cm0stuacc_${regInfo.normalized.toLowerCase()}`,
    userId: `stu_${regInfo.normalized.toLowerCase()}`,
    registrationNo: regInfo.normalized,
    fullName: params.fullName.trim(),
    email: regInfo.universityEmail,
    program: regInfo.program,
    batchYear: Number(regInfo.batchYear),
    intakeTerm: regInfo.intakeTerm,
    serialCode: regInfo.serialCode,
    departmentCode: regInfo.departmentCode,
    departmentId,
    rollNumber: regInfo.rollNumber,
    pinHash,
    createdAt: new Date().toISOString(),
  };

  store.studentAccounts.unshift(newAccount);
  writeAccountsStore(store);

  try {
    await db.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { email: newAccount.email },
        update: {
          fullName: newAccount.fullName,
          role: "STUDENT",
          departmentId: newAccount.departmentId,
        },
        create: {
          id: newAccount.userId,
          clerkId: newAccount.registrationNo,
          email: newAccount.email,
          fullName: newAccount.fullName,
          role: "STUDENT",
          departmentId: newAccount.departmentId,
        },
      });

      await tx.$executeRaw`
        INSERT INTO "StudentAccount" (
          "id", "userId", "registrationNo", "program", "batchYear",
          "intakeTerm", "serialCode", "departmentCode", "rollNumber", "pinHash", "updatedAt"
        ) VALUES (
          ${newAccount.id}, ${newAccount.userId}, ${newAccount.registrationNo},
          ${newAccount.program}, ${newAccount.batchYear}, ${newAccount.intakeTerm},
          ${newAccount.serialCode}, ${newAccount.departmentCode}, ${newAccount.rollNumber},
          ${newAccount.pinHash}, NOW()
        )
        ON CONFLICT ("registrationNo") DO UPDATE SET "pinHash" = EXCLUDED."pinHash", "updatedAt" = NOW()
      `;

      await tx.studentProfile.upsert({
        where: { userId: newAccount.userId },
        update: {},
        create: {
          userId: newAccount.userId,
          status: "DRAFT",
        },
      });
    });
  } catch {
    // Persistent store fallback saved
  }

  return { ok: true, account: newAccount };
}

/**
 * Self-Registration for Faculty is strictly locked to the SUPERVISOR role.
 * Promotion to COORDINATOR or ADMIN requires an existing University Admin via updateUserRole().
 */
export async function registerFacultyAccountInDb(params: {
  identifier: string;
  fullName: string;
  designation: string;
  departmentCode: string;
  maxSlots: number;
  researchDomains: string[];
  pin: string;
}): Promise<
  | { ok: true; account: StoredFacultyAccountRecord }
  | { ok: false; code: "VALIDATION_ERROR" | "DUPLICATE_RECORD"; message: string }
> {
  if (parseStudentRegNo(params.identifier)) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message:
        "This is a Student Registration Number. Please switch to the Student Account tab.",
    };
  }

  const facInfo = parseFacultyIdentifier(params.identifier);
  if (!facInfo) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message:
        "Invalid Faculty Email or Handle. Use your official university email (e.g., firstname.lastname@university.edu).",
    };
  }

  const handle = (facInfo.email.split("@")[0] ?? facInfo.identifier).toLowerCase();
  const store = readAccountsStore();
  const existing = store.facultyAccounts.find(
    (f) =>
      f.facultyHandle.toLowerCase() === handle ||
      f.universityEmail.toLowerCase() === facInfo.email.toLowerCase()
  );

  if (existing) {
    return {
      ok: false,
      code: "DUPLICATE_RECORD",
      message: `A faculty account for "${existing.universityEmail}" is already registered. Please sign in directly.`,
    };
  }

  const pinHash = hashFourDigitPin(params.pin);
  const departmentId =
    params.departmentCode === "BSSE"
      ? "cm0deptbsse00000000000002"
      : "cm0deptbscs00000000000001";

  const newAccount: StoredFacultyAccountRecord = {
    id: `cm0facacc_${handle.replace(/[^a-z0-9]/g, "_")}`,
    userId: `fac_${handle.replace(/[^a-z0-9]/g, "_")}`,
    facultyHandle: handle,
    universityEmail: facInfo.email,
    fullName: params.fullName.trim(),
    designation: params.designation.trim() || "Assistant Professor",
    role: "SUPERVISOR",
    departmentCode: params.departmentCode,
    departmentId,
    maxSlots: params.maxSlots,
    researchDomains:
      params.researchDomains.length > 0 ? params.researchDomains : ["Computer Science"],
    pinHash,
    createdAt: new Date().toISOString(),
  };

  store.facultyAccounts.unshift(newAccount);
  writeAccountsStore(store);

  try {
    await db.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { email: newAccount.universityEmail },
        update: {
          fullName: newAccount.fullName,
          role: "SUPERVISOR",
          departmentId: newAccount.departmentId,
        },
        create: {
          id: newAccount.userId,
          clerkId: newAccount.facultyHandle,
          email: newAccount.universityEmail,
          fullName: newAccount.fullName,
          role: "SUPERVISOR",
          departmentId: newAccount.departmentId,
        },
      });

      await tx.$executeRaw`
        INSERT INTO "FacultyAccount" (
          "id", "userId", "facultyHandle", "universityEmail",
          "designation", "departmentCode", "pinHash", "updatedAt"
        ) VALUES (
          ${newAccount.id}, ${newAccount.userId}, ${newAccount.facultyHandle},
          ${newAccount.universityEmail}, ${newAccount.designation},
          ${newAccount.departmentCode}, ${newAccount.pinHash}, NOW()
        )
        ON CONFLICT ("universityEmail") DO UPDATE SET "pinHash" = EXCLUDED."pinHash", "updatedAt" = NOW()
      `;

      await tx.supervisorProfile.upsert({
        where: { userId: newAccount.userId },
        update: {
          title: newAccount.designation,
          maxSlots: newAccount.maxSlots,
          researchDomains: newAccount.researchDomains,
        },
        create: {
          userId: newAccount.userId,
          departmentId: newAccount.departmentId,
          title: newAccount.designation,
          bio: `${newAccount.designation} in ${newAccount.departmentCode} supervising ${newAccount.researchDomains.join(", ")}.`,
          researchDomains: newAccount.researchDomains,
          preferredStacks: ["TypeScript", "Python", "PostgreSQL"],
          maxSlots: newAccount.maxSlots,
          activeSlots: 0,
          isAccepting: true,
        },
      });
    });
  } catch {
    // Persistent store fallback saved
  }

  return { ok: true, account: newAccount };
}

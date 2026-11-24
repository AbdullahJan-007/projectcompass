import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import type { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import {
  parseStudentRegNo,
  parseFacultyIdentifier,
  resolveDepartmentByCode,
  resolveDepartmentCodeById,
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
  os.tmpdir(),
  "projectcompass-local-accounts-db-v2.json"
);

export function buildDefaultAccountsDb(): AccountsDatabaseStore {
  return {
    studentAccounts: [
      {
        id: "cm0stuacc_b23f0184cs042",
        userId: "cm0userstudent00000000001",
        registrationNo: "B23F0184CS042",
        fullName: "Areeba Noor",
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
            ? {
                ...s,
                fullName: s.fullName === "Abdullah Jan" ? "Areeba Noor" : s.fullName,
                batchYear: 2023,
                pinHash: hashFourDigitPin("0184"),
              }
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
    // Ignore file write errors in read-only serverless environments
  }
}

let dbUnreachableUntilMs = 0;

function isLiveDbTemporarilyUnreachable(): boolean {
  return Date.now() < dbUnreachableUntilMs;
}

function markDbUnreachable(): void {
  dbUnreachableUntilMs = Date.now() + 15_000;
}

/**
 * Resolves a student account from PostgreSQL first (serverless production source of truth),
 * falling back seamlessly to readAccountsStore() when local PostgreSQL is offline.
 */
export async function findStudentAccountForLogin(
  normalizedRegNo: string
): Promise<(StoredStudentAccountRecord & { isActive: boolean }) | null> {
  if (!isLiveDbTemporarilyUnreachable()) {
    try {
      const dbRecord = await db.studentAccount.findUnique({
        where: { registrationNo: normalizedRegNo },
        include: { user: true },
      });

      if (dbRecord) {
        const dept = resolveDepartmentByCode(dbRecord.departmentCode);
        return {
          id: dbRecord.id,
          userId: dbRecord.userId,
          registrationNo: dbRecord.registrationNo,
          fullName: dbRecord.user.fullName,
          email: dbRecord.user.email,
          program: dbRecord.program,
          batchYear: dbRecord.batchYear,
          intakeTerm: dbRecord.intakeTerm === "Spring" ? "Spring" : "Fall",
          serialCode: dbRecord.serialCode,
          departmentCode: dbRecord.departmentCode,
          departmentId: dbRecord.user.departmentId ?? dept.id,
          rollNumber: dbRecord.rollNumber,
          pinHash: dbRecord.pinHash,
          createdAt: dbRecord.createdAt.toISOString(),
          isActive: dbRecord.user.isActive,
        };
      }
    } catch {
      markDbUnreachable();
    }
  }

  const store = readAccountsStore();
  const found = store.studentAccounts.find(
    (s) => s.registrationNo.toUpperCase() === normalizedRegNo.toUpperCase()
  );
  return found ? { ...found, isActive: true } : null;
}

/**
 * Resolves a faculty account from PostgreSQL first, falling back to readAccountsStore() when offline.
 */
export async function findFacultyAccountForLogin(
  email: string,
  handle: string
): Promise<(StoredFacultyAccountRecord & { isActive: boolean }) | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedHandle = handle.trim().toLowerCase();

  if (!isLiveDbTemporarilyUnreachable()) {
    try {
      const dbRecord = await db.facultyAccount.findFirst({
        where: {
          OR: [
            { universityEmail: normalizedEmail },
            { facultyHandle: normalizedHandle },
          ],
        },
        include: { user: true },
      });

      if (dbRecord && dbRecord.user.role !== "STUDENT") {
        const dept = resolveDepartmentByCode(dbRecord.departmentCode);
        return {
          id: dbRecord.id,
          userId: dbRecord.userId,
          facultyHandle: dbRecord.facultyHandle,
          universityEmail: dbRecord.universityEmail,
          fullName: dbRecord.user.fullName,
          designation: dbRecord.designation,
          role: dbRecord.user.role,
          departmentCode: dbRecord.departmentCode,
          departmentId: dbRecord.user.departmentId ?? dept.id,
          maxSlots: 5,
          researchDomains: [],
          pinHash: dbRecord.pinHash,
          createdAt: dbRecord.createdAt.toISOString(),
          isActive: dbRecord.user.isActive,
        };
      }
    } catch {
      markDbUnreachable();
    }
  }

  const store = readAccountsStore();
  const found = store.facultyAccounts.find(
    (f) =>
      f.facultyHandle.toLowerCase() === normalizedHandle ||
      f.universityEmail.toLowerCase() === normalizedEmail
  );
  return found ? { ...found, isActive: true } : null;
}

/**
 * Synchronizes role changes in local accounts store when an Admin updates a user's role.
 */
export function syncRoleInAccountsStore(
  userId: string,
  newRole: UserRole,
  departmentId?: string
): void {
  const store = readAccountsStore();
  let changed = false;

  if (newRole !== "STUDENT") {
    store.facultyAccounts = store.facultyAccounts.map((f) => {
      if (f.userId !== userId) return f;
      changed = true;
      return {
        ...f,
        role: newRole,
        ...(departmentId
          ? {
              departmentId,
              departmentCode: resolveDepartmentCodeById(departmentId),
            }
          : {}),
      };
    });
  }

  if (changed) {
    writeAccountsStore(store);
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

  const existingRecord = await findStudentAccountForLogin(regInfo.normalized);
  if (existingRecord) {
    return {
      ok: false,
      code: "DUPLICATE_RECORD",
      message: `An account for Registration No ${regInfo.normalized} is already registered. Please sign in with your 4-digit PIN.`,
    };
  }

  const pinHash = hashFourDigitPin(params.pin);
  const deptMeta = resolveDepartmentByCode(regInfo.departmentShort);

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
    departmentCode: deptMeta.code,
    departmentId: deptMeta.id,
    rollNumber: regInfo.rollNumber,
    pinHash,
    createdAt: new Date().toISOString(),
  };

  const store = readAccountsStore();
  store.studentAccounts.unshift(newAccount);
  writeAccountsStore(store);

  try {
    await db.$transaction(async (tx) => {
      await tx.department.upsert({
        where: { code: deptMeta.code },
        update: {},
        create: {
          id: deptMeta.id,
          code: deptMeta.code,
          name: deptMeta.name,
          university: "National University of Computing & Emerging Sciences",
          defaultSlots: 5,
        },
      });

      const userRow = await tx.user.upsert({
        where: { email: newAccount.email },
        update: {
          fullName: newAccount.fullName,
          role: "STUDENT",
          departmentId: deptMeta.id,
        },
        create: {
          id: newAccount.userId,
          clerkId: newAccount.registrationNo,
          email: newAccount.email,
          fullName: newAccount.fullName,
          role: "STUDENT",
          departmentId: deptMeta.id,
        },
      });
      newAccount.userId = userRow.id;

      await tx.studentAccount.upsert({
        where: { registrationNo: newAccount.registrationNo },
        update: {
          pinHash: newAccount.pinHash,
        },
        create: {
          id: newAccount.id,
          userId: userRow.id,
          registrationNo: newAccount.registrationNo,
          program: newAccount.program,
          batchYear: newAccount.batchYear,
          intakeTerm: newAccount.intakeTerm,
          serialCode: newAccount.serialCode,
          departmentCode: newAccount.departmentCode,
          rollNumber: newAccount.rollNumber,
          pinHash: newAccount.pinHash,
        },
      });

      await tx.studentProfile.upsert({
        where: { userId: userRow.id },
        update: {},
        create: {
          userId: userRow.id,
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
  const existingRecord = await findFacultyAccountForLogin(facInfo.email, handle);

  if (existingRecord) {
    return {
      ok: false,
      code: "DUPLICATE_RECORD",
      message: `A faculty account for "${existingRecord.universityEmail}" is already registered. Please sign in directly.`,
    };
  }

  const pinHash = hashFourDigitPin(params.pin);
  const deptMeta = resolveDepartmentByCode(params.departmentCode);

  const newAccount: StoredFacultyAccountRecord = {
    id: `cm0facacc_${handle.replace(/[^a-z0-9]/g, "_")}`,
    userId: `fac_${handle.replace(/[^a-z0-9]/g, "_")}`,
    facultyHandle: handle,
    universityEmail: facInfo.email,
    fullName: params.fullName.trim(),
    designation: params.designation.trim() || "Assistant Professor",
    role: "SUPERVISOR",
    departmentCode: deptMeta.code,
    departmentId: deptMeta.id,
    maxSlots: params.maxSlots,
    researchDomains:
      params.researchDomains.length > 0 ? params.researchDomains : ["Computer Science"],
    pinHash,
    createdAt: new Date().toISOString(),
  };

  const store = readAccountsStore();
  store.facultyAccounts.unshift(newAccount);
  writeAccountsStore(store);

  try {
    await db.$transaction(async (tx) => {
      await tx.department.upsert({
        where: { code: deptMeta.code },
        update: {},
        create: {
          id: deptMeta.id,
          code: deptMeta.code,
          name: deptMeta.name,
          university: "National University of Computing & Emerging Sciences",
          defaultSlots: 5,
        },
      });

      const userRow = await tx.user.upsert({
        where: { email: newAccount.universityEmail },
        update: {
          fullName: newAccount.fullName,
          role: "SUPERVISOR",
          departmentId: deptMeta.id,
        },
        create: {
          id: newAccount.userId,
          clerkId: newAccount.facultyHandle,
          email: newAccount.universityEmail,
          fullName: newAccount.fullName,
          role: "SUPERVISOR",
          departmentId: deptMeta.id,
        },
      });
      newAccount.userId = userRow.id;

      await tx.facultyAccount.upsert({
        where: { universityEmail: newAccount.universityEmail },
        update: {
          pinHash: newAccount.pinHash,
          designation: newAccount.designation,
          departmentCode: newAccount.departmentCode,
        },
        create: {
          id: newAccount.id,
          userId: userRow.id,
          facultyHandle: newAccount.facultyHandle,
          universityEmail: newAccount.universityEmail,
          designation: newAccount.designation,
          departmentCode: newAccount.departmentCode,
          pinHash: newAccount.pinHash,
        },
      });

      await tx.supervisorProfile.upsert({
        where: { userId: userRow.id },
        update: {
          title: newAccount.designation,
          maxSlots: newAccount.maxSlots,
          researchDomains: newAccount.researchDomains,
        },
        create: {
          userId: userRow.id,
          departmentId: deptMeta.id,
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

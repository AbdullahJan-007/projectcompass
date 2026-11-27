import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import type { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import {
  generateDeterministicEmbedding,
  toPgVectorLiteral,
} from "@/lib/ai/embeddings";
import {
  parseStudentRegNo,
  parseFacultyIdentifier,
  resolveDepartmentByCode,
  resolveDepartmentCodeById,
} from "@/lib/auth/university-id";
import {
  readInstitutionalDb,
  writeInstitutionalDb,
} from "@/lib/institutional-store";

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
  isActive?: boolean;
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
  isActive?: boolean;
  createdAt: string;
}

export interface AccountsDatabaseStore {
  studentAccounts: StoredStudentAccountRecord[];
  facultyAccounts: StoredFacultyAccountRecord[];
}

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.CI !== "true" &&
    process.env.SEED_DEMO_DATA !== "true"
  );
}

function isDbConnectionOffline(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === "PrismaClientInitializationError" ||
    err.message.includes("Can't reach database server") ||
    err.message.includes("ECONNREFUSED")
  );
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
  const bootstrapAdminEmail = (
    process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@projectcompass.edu"
  )
    .trim()
    .toLowerCase();
  const bootstrapAdminHandle = bootstrapAdminEmail.split("@")[0] || "admin";
  const bootstrapAdminName = (
    process.env.BOOTSTRAP_ADMIN_NAME || "University System Administrator"
  ).trim();
  const bootstrapAdminPin =
    process.env.BOOTSTRAP_ADMIN_PIN && /^\d{4}$/.test(process.env.BOOTSTRAP_ADMIN_PIN.trim())
      ? process.env.BOOTSTRAP_ADMIN_PIN.trim()
      : "2026";

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
        isActive: true,
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
        isActive: true,
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    facultyAccounts: [
      {
        id: "cm0facacc_bootstrap_admin",
        userId: "cm0userbootstrapadmin0001",
        facultyHandle: bootstrapAdminHandle,
        universityEmail: bootstrapAdminEmail,
        fullName: bootstrapAdminName,
        designation: "University Administrator",
        role: "ADMIN",
        departmentCode: "BSCS",
        departmentId: "cm0deptbscs00000000000001",
        maxSlots: 2,
        researchDomains: ["Institutional Governance", "Information Technology"],
        pinHash: hashFourDigitPin(bootstrapAdminPin),
        isActive: true,
        createdAt: "2026-09-01T00:00:00.000Z",
      },
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
        isActive: true,
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
        isActive: true,
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
        isActive: true,
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ],
  };
}

export function readAccountsStore(): AccountsDatabaseStore {
  // Never serve local demo/dummy accounts in production deployments (Vercel/Supabase)
  if (isProductionRuntime()) {
    return { studentAccounts: [], facultyAccounts: [] };
  }

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

    const existingFaculty = Array.isArray(parsed.facultyAccounts)
      ? parsed.facultyAccounts
      : defaults.facultyAccounts;

    const hasBootstrapAdmin = existingFaculty.some(
      (f) => f.universityEmail.toLowerCase() === "admin@projectcompass.edu"
    );
    const bootstrapAdminDefault = defaults.facultyAccounts.find(
      (f) => f.universityEmail.toLowerCase() === "admin@projectcompass.edu"
    );
    const faculty =
      !hasBootstrapAdmin && bootstrapAdminDefault
        ? [bootstrapAdminDefault, ...existingFaculty]
        : existingFaculty;

    return {
      studentAccounts: students,
      facultyAccounts: faculty,
    };
  } catch {
    return defaults;
  }
}

function writeAccountsStore(store: AccountsDatabaseStore): void {
  if (isProductionRuntime()) return;
  try {
    fs.writeFileSync(REGISTRY_FILE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // Ignore file write errors in read-only serverless environments
  }
}

let dbUnreachableUntilMs = 0;

function isLiveDbTemporarilyUnreachable(): boolean {
  if (isProductionRuntime()) return false;
  return Date.now() < dbUnreachableUntilMs;
}

function markDbUnreachable(): void {
  if (isProductionRuntime()) return;
  dbUnreachableUntilMs = Date.now() + 15_000;
}

/**
 * Resolves a student account from PostgreSQL first (serverless production source of truth),
 * verifying User.isActive directly on the relational User record, and falling back seamlessly
 * to readAccountsStore() only when local PostgreSQL is offline in non-production.
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
        const activeFlag = dbRecord.user.isActive !== false;
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
          isActive: activeFlag,
          createdAt: dbRecord.createdAt.toISOString(),
        };
      }
    } catch (err) {
      if (isDbConnectionOffline(err)) {
        markDbUnreachable();
      }
    }
  }

  const store = readAccountsStore();
  const found = store.studentAccounts.find(
    (s) => s.registrationNo.toUpperCase() === normalizedRegNo.toUpperCase()
  );
  return found ? { ...found, isActive: found.isActive !== false } : null;
}

/**
 * Resolves a faculty/admin/coordinator account from PostgreSQL first,
 * verifying User.isActive directly on the relational User record, and falling back
 * to readAccountsStore() only in non-production offline environments.
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
        const activeFlag = dbRecord.user.isActive !== false;
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
          isActive: activeFlag,
          createdAt: dbRecord.createdAt.toISOString(),
        };
      }
    } catch (err) {
      if (isDbConnectionOffline(err)) {
        markDbUnreachable();
      }
    }
  }

  const store = readAccountsStore();
  const found = store.facultyAccounts.find(
    (f) =>
      f.facultyHandle.toLowerCase() === normalizedHandle ||
      f.universityEmail.toLowerCase() === normalizedEmail
  );
  return found ? { ...found, isActive: found.isActive !== false } : null;
}

/**
 * Synchronizes role changes in local accounts store when an Admin updates a user's role.
 */
export function syncRoleInAccountsStore(
  userId: string,
  newRole: UserRole,
  departmentId?: string
): void {
  if (isProductionRuntime()) return;
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

/**
 * Synchronizes active/deactivated status in local accounts store when an Admin toggles account status.
 */
export function syncActiveStatusInAccountsStore(
  userId: string,
  isActive: boolean
): void {
  if (isProductionRuntime()) return;
  const store = readAccountsStore();
  let changed = false;

  store.studentAccounts = store.studentAccounts.map((s) => {
    if (s.userId !== userId) return s;
    changed = true;
    return { ...s, isActive };
  });

  store.facultyAccounts = store.facultyAccounts.map((f) => {
    if (f.userId !== userId) return f;
    changed = true;
    return { ...f, isActive };
  });

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
  | {
      ok: false;
      code: "VALIDATION_ERROR" | "DUPLICATE_RECORD" | "INTERNAL_ERROR";
      message: string;
    }
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
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  try {
    const persistedUserId = await db.$transaction(
      async (tx) => {
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
            isActive: true,
          },
          create: {
            id: newAccount.userId,
            clerkId: newAccount.registrationNo,
            email: newAccount.email,
            fullName: newAccount.fullName,
            role: "STUDENT",
            departmentId: deptMeta.id,
            isActive: true,
          },
        });

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

        return userRow.id;
      },
      { maxWait: 5000, timeout: 15000 }
    );

    newAccount.userId = persistedUserId;
  } catch (dbErr) {
    if (isProductionRuntime() || !isDbConnectionOffline(dbErr)) {
      console.error("[registerStudentAccountInDb] Database write failed:", dbErr);
      return {
        ok: false,
        code: "INTERNAL_ERROR",
        message:
          "Could not register your student account in the university database. Please try again.",
      };
    }
  }

  if (!isProductionRuntime()) {
    const store = readAccountsStore();
    store.studentAccounts.unshift(newAccount);
    writeAccountsStore(store);
  }

  return { ok: true, account: newAccount };
}

/**
 * Admin-only Faculty Provisioning in PostgreSQL.
 * Atomically creates User (SUPERVISOR | COORDINATOR) + FacultyAccount + SupervisorProfile
 * (with 1536-dim deterministic embedding) + AuditLog, failing closed in production.
 */
export async function registerFacultyAccountInDb(params: {
  identifier: string;
  fullName: string;
  designation: string;
  departmentCode: string;
  maxSlots: number;
  researchDomains: string[];
  pin: string;
  role?: "SUPERVISOR" | "COORDINATOR";
  actorUserId?: string;
}): Promise<
  | { ok: true; account: StoredFacultyAccountRecord }
  | {
      ok: false;
      code: "VALIDATION_ERROR" | "DUPLICATE_RECORD" | "INTERNAL_ERROR";
      message: string;
    }
> {
  if (parseStudentRegNo(params.identifier)) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message:
        "This is a Student Registration Number. Faculty accounts require an official university email.",
    };
  }

  const facInfo = parseFacultyIdentifier(params.identifier);
  if (!facInfo) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message:
        "Invalid Faculty Email or Handle. Use an official university email (e.g., firstname.lastname@university.edu).",
    };
  }

  const handle = (facInfo.email.split("@")[0] ?? facInfo.identifier).toLowerCase();
  const existingRecord = await findFacultyAccountForLogin(facInfo.email, handle);

  if (existingRecord) {
    return {
      ok: false,
      code: "DUPLICATE_RECORD",
      message: `A faculty account for "${existingRecord.universityEmail}" is already registered.`,
    };
  }

  const pinHash = hashFourDigitPin(params.pin);
  const deptMeta = resolveDepartmentByCode(params.departmentCode);
  const assignedRole: "SUPERVISOR" | "COORDINATOR" =
    params.role === "COORDINATOR" ? "COORDINATOR" : "SUPERVISOR";

  const sanitizedDomains =
    params.researchDomains.length > 0 ? params.researchDomains : ["Computer Science"];
  const bioText = `${params.designation.trim() || "Assistant Professor"} in ${deptMeta.code} supervising ${sanitizedDomains.join(", ")}.`;
  const defaultStacks = ["TypeScript", "Python", "PostgreSQL"];
  const embeddingVec = generateDeterministicEmbedding(
    `${sanitizedDomains.join(", ")} | ${defaultStacks.join(", ")} | ${bioText}`
  );
  const vecLiteral = toPgVectorLiteral(embeddingVec);

  const newAccount: StoredFacultyAccountRecord = {
    id: `cm0facacc_${handle.replace(/[^a-z0-9]/g, "_")}`,
    userId: `fac_${handle.replace(/[^a-z0-9]/g, "_")}`,
    facultyHandle: handle,
    universityEmail: facInfo.email,
    fullName: params.fullName.trim(),
    designation: params.designation.trim() || "Assistant Professor",
    role: assignedRole,
    departmentCode: deptMeta.code,
    departmentId: deptMeta.id,
    maxSlots: params.maxSlots,
    researchDomains: sanitizedDomains,
    pinHash,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  let persistedSupervisorProfileId = `cm0sup_${handle.replace(/[^a-z0-9]/g, "_")}`;

  try {
    const saved = await db.$transaction(
      async (tx) => {
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
            role: assignedRole,
            departmentId: deptMeta.id,
            isActive: true,
          },
          create: {
            id: newAccount.userId,
            clerkId: newAccount.facultyHandle,
            email: newAccount.universityEmail,
            fullName: newAccount.fullName,
            role: assignedRole,
            departmentId: deptMeta.id,
            isActive: true,
          },
        });

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

        const supProfile = await tx.supervisorProfile.upsert({
          where: { userId: userRow.id },
          update: {
            departmentId: deptMeta.id,
            title: newAccount.designation,
            maxSlots: newAccount.maxSlots,
            researchDomains: newAccount.researchDomains,
            isAccepting: true,
          },
          create: {
            userId: userRow.id,
            departmentId: deptMeta.id,
            title: newAccount.designation,
            bio: bioText,
            researchDomains: newAccount.researchDomains,
            preferredStacks: defaultStacks,
            maxSlots: newAccount.maxSlots,
            activeSlots: 0,
            isAccepting: true,
          },
          select: { id: true },
        });

        await tx.$executeRaw`
          UPDATE "SupervisorProfile"
          SET "profileEmbedding" = ${vecLiteral}::vector
          WHERE id = ${supProfile.id}
        `;

        if (params.actorUserId) {
          // Verify actorUserId exists in User table before binding foreign key
          const actorExists = await tx.user.findUnique({
            where: { id: params.actorUserId },
            select: { id: true },
          });
          await tx.auditLog.create({
            data: {
              actorUserId: actorExists ? actorExists.id : null,
              action: "FACULTY_PROVISIONED",
              entityType: "FacultyAccount",
              entityId: userRow.id,
              metadataJson: {
                universityEmail: newAccount.universityEmail,
                departmentCode: newAccount.departmentCode,
                designation: newAccount.designation,
                role: assignedRole,
                maxSlots: newAccount.maxSlots,
              },
            },
          });
        }

        return {
          userId: userRow.id,
          supervisorProfileId: supProfile.id,
        };
      },
      { maxWait: 5000, timeout: 15000 }
    );

    if (!saved.userId || !saved.supervisorProfileId) {
      return {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "Database verification failed while provisioning faculty account.",
      };
    }

    newAccount.userId = saved.userId;
    persistedSupervisorProfileId = saved.supervisorProfileId;
  } catch (dbErr) {
    if (isProductionRuntime() || !isDbConnectionOffline(dbErr)) {
      console.error("[registerFacultyAccountInDb] Database write failed:", dbErr);
      return {
        ok: false,
        code: "INTERNAL_ERROR",
        message:
          "Could not provision faculty account in the database. Please verify database connectivity and try again.",
      };
    }
  }

  if (!isProductionRuntime()) {
    const store = readAccountsStore();
    store.facultyAccounts.unshift(newAccount);
    writeAccountsStore(store);

    const inst = readInstitutionalDb();
    inst.supervisors.unshift({
      id: persistedSupervisorProfileId,
      userId: newAccount.userId,
      fullName: newAccount.fullName,
      email: newAccount.universityEmail,
      title: newAccount.designation,
      departmentCode: newAccount.departmentCode,
      researchDomains: newAccount.researchDomains,
      bio: bioText,
      preferredStacks: defaultStacks,
      skillSlugs: ["typescript", "python", "postgresql"],
      maxSlots: newAccount.maxSlots,
      activeSlots: 0,
      isAccepting: true,
    });
    inst.auditLogs.unshift({
      id: `cm0audit_${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
      actor: "University Admin",
      action: "FACULTY_PROVISIONED",
      entityType: "FacultyAccount",
      entityId: newAccount.userId,
      summary: `Provisioned ${newAccount.fullName} (${newAccount.universityEmail} · ${newAccount.departmentCode} · ${assignedRole}).`,
    });
    writeInstitutionalDb(inst);
  }

  return { ok: true, account: newAccount };
}

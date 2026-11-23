import type { UserRole } from "@prisma/client";

export const SESSION_COOKIE_NAME = "projectcompass_uni_session";

export interface UniversitySessionPayload {
  userId: string;
  identifier: string; // e.g., "B23F0184CS042" or "kamran.siddiqui@university.edu"
  email: string;
  fullName: string;
  role: "STUDENT" | "SUPERVISOR" | "COORDINATOR" | "ADMIN";
  departmentId: string;
  departmentCode: string;
  batchLabel?: string; // e.g., "Fall 2024 · Roll #042"
}

/**
 * University Student Registration Number Pattern:
 * Example: B23F0184CS042
 * - Program Prefix: B (Bachelor)
 * - Batch Year: 2 digits (e.g., 21..29)
 * - Semester Intake: F (Fall) or S (Spring)
 * - Unique Form/Serial Number: 4 digits (e.g., 0184)
 * - Department Code: 2 to 4 letters (e.g., CS, SE, AI, CY, DS, IT, EE)
 * - Roll Number: 3 digits (e.g., 042)
 */
export const STUDENT_REG_NO_REGEX = /^B(\d{2})([FS])(\d{4})([A-Z]{2,4})(\d{3})$/i;

/**
 * Faculty / Institutional Email or Username Pattern:
 * Example: kamran.siddiqui@university.edu.pk or ayesha.rehman@fecid.edu.pk or dr.kamran
 */
export const FACULTY_IDENTIFIER_REGEX =
  /^(?:[a-zA-Z][a-zA-Z0-9._-]{2,40}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z][a-zA-Z._-]{3,35})$/;

/**
 * 4-Digit University Portal PIN / Password (XXXX)
 */
export const FOUR_DIGIT_PIN_REGEX = /^\d{4}$/;

export interface ParsedStudentRegNo {
  raw: string;
  normalized: string;
  program: "Bachelor";
  batchYear: string; // e.g., "2024"
  intakeTerm: "Fall" | "Spring";
  serialCode: string; // e.g., "0184"
  departmentShort: string; // e.g., "CS"
  departmentCode: string; // e.g., "BSCS"
  departmentName: string;
  rollNumber: string; // e.g., "042"
  universityEmail: string; // e.g., "b23f0184cs042@students.university.edu"
}

const DEPARTMENT_MAP: Record<string, { code: string; name: string; id: string }> = {
  CS: {
    code: "BSCS",
    name: "Department of Computer Science",
    id: "cm0deptbscs00000000000001",
  },
  SE: {
    code: "BSSE",
    name: "Department of Software Engineering",
    id: "cm0deptbsse00000000000002",
  },
  AI: {
    code: "BSAI",
    name: "Department of Artificial Intelligence",
    id: "cm0deptbsai00000000000003",
  },
  CY: {
    code: "BSCY",
    name: "Department of Cybersecurity",
    id: "cm0deptbscy00000000000004",
  },
  DS: {
    code: "BSDS",
    name: "Department of Data Science",
    id: "cm0deptbsds00000000000005",
  },
  IT: {
    code: "BSIT",
    name: "Department of Information Technology",
    id: "cm0deptbsit00000000000006",
  },
};

export function parseStudentRegNo(input: string): ParsedStudentRegNo | null {
  const cleaned = input.trim().toUpperCase();
  const match = STUDENT_REG_NO_REGEX.exec(cleaned);
  if (!match) {
    return null;
  }

  const yearDigits = match[1] ?? "24";
  const termChar = (match[2] ?? "F").toUpperCase();
  const serialCode = match[3] ?? "0000";
  const deptShort = (match[4] ?? "CS").toUpperCase();
  const rollNumber = match[5] ?? "001";

  const deptMeta = DEPARTMENT_MAP[deptShort] ?? {
    code: `BS${deptShort}`,
    name: `Department of ${deptShort}`,
    id: "cm0deptbscs00000000000001",
  };

  return {
    raw: input.trim(),
    normalized: cleaned,
    program: "Bachelor",
    batchYear: `20${yearDigits}`,
    intakeTerm: termChar === "F" ? "Fall" : "Spring",
    serialCode,
    departmentShort: deptShort,
    departmentCode: deptMeta.code,
    departmentName: deptMeta.name,
    rollNumber,
    universityEmail: `${cleaned.toLowerCase()}@students.university.edu`,
  };
}

export interface ParsedFacultyIdentifier {
  identifier: string;
  fullName: string;
  email: string;
  role: Extract<UserRole, "SUPERVISOR" | "COORDINATOR" | "ADMIN">;
  departmentCode: string;
  departmentId: string;
}

export function parseFacultyIdentifier(input: string): ParsedFacultyIdentifier | null {
  const cleaned = input.trim().toLowerCase();
  if (!FACULTY_IDENTIFIER_REGEX.test(cleaned)) {
    return null;
  }

  // Extract name portion before @ if email, or entire handle
  const localPart = (cleaned.split("@")[0] ?? cleaned)
    .replace(/^(?:dr\.|prof\.)/i, "")
    .trim();

  const words = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));

  const baseName = words.length > 0 ? words.join(" ") : "Faculty Member";
  const fullName =
    cleaned.startsWith("prof") ? `Prof. Dr. ${baseName}` : `Dr. ${baseName}`;

  const email = cleaned.includes("@")
    ? cleaned
    : `${localPart}@faculty.university.edu`;

  let role: Extract<UserRole, "SUPERVISOR" | "COORDINATOR" | "ADMIN"> = "SUPERVISOR";
  if (localPart.includes("coord") || localPart.includes("salman")) {
    role = "COORDINATOR";
  } else if (localPart.includes("admin") || localPart.includes("naveed") || localPart.includes("dean")) {
    role = "ADMIN";
  }

  return {
    identifier: cleaned,
    fullName,
    email,
    role,
    departmentCode: "BSCS",
    departmentId: "cm0deptbscs00000000000001",
  };
}

export function validateFourDigitPin(pin: string): boolean {
  return FOUR_DIGIT_PIN_REGEX.test(pin.trim());
}

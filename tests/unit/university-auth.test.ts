import { describe, it, expect } from "vitest";
import {
  parseStudentRegNo,
  parseFacultyIdentifier,
  validateFourDigitPin,
} from "@/lib/auth/university-id";
import {
  hashFourDigitPin,
  verifyFourDigitPinHash,
  readAccountsStore,
} from "@/lib/auth/account-registry";

describe("University Registration Number (B23F0184CS042) & 4-Digit PIN Parser", () => {
  it("accurately parses B23F0184CS042 and extracts Program, Batch Year, Intake Term, Serial, Department, and Roll No", () => {
    const parsed = parseStudentRegNo("B23F0184CS042");
    expect(parsed).not.toBeNull();
    if (parsed) {
      expect(parsed.normalized).toBe("B23F0184CS042");
      expect(parsed.program).toBe("Bachelor");
      expect(parsed.batchYear).toBe("2023");
      expect(parsed.intakeTerm).toBe("Fall");
      expect(parsed.serialCode).toBe("0184");
      expect(parsed.departmentShort).toBe("CS");
      expect(parsed.departmentCode).toBe("BSCS");
      expect(parsed.rollNumber).toBe("042");
      expect(parsed.universityEmail).toBe("b23f0184cs042@students.university.edu");
    }
  });

  it("supports varied batches (22, 23, 25), Spring/Fall terms (S/F), and departments (SE, AI, CY, DS)", () => {
    const seSpring = parseStudentRegNo("b23s1042se018");
    expect(seSpring).not.toBeNull();
    if (seSpring) {
      expect(seSpring.normalized).toBe("B23S1042SE018");
      expect(seSpring.batchYear).toBe("2023");
      expect(seSpring.intakeTerm).toBe("Spring");
      expect(seSpring.departmentCode).toBe("BSSE");
      expect(seSpring.rollNumber).toBe("018");
    }

    const aiFall = parseStudentRegNo("B25F0911AI004");
    expect(aiFall?.departmentCode).toBe("BSAI");
  });

  it("rejects malformed student registration numbers", () => {
    expect(parseStudentRegNo("123456")).toBeNull();
    expect(parseStudentRegNo("M24F0184CS042")).toBeNull(); // Not Bachelor B prefix
    expect(parseStudentRegNo("B24X0184CS042")).toBeNull(); // Invalid intake term X
    expect(parseStudentRegNo("B24F704CS042")).toBeNull(); // Only 3 serial digits instead of 4
  });

  it("validates Faculty name/email identifiers and 4-digit PINs (XXXX)", () => {
    const fac = parseFacultyIdentifier("kamran.siddiqui@university.edu");
    expect(fac).not.toBeNull();
    expect(fac?.fullName).toBe("Dr. Kamran Siddiqui");
    expect(fac?.role).toBe("SUPERVISOR");

    const coord = parseFacultyIdentifier("salman.raza@university.edu");
    expect(coord?.role).toBe("COORDINATOR");

    expect(validateFourDigitPin("0184")).toBe(true);
    expect(validateFourDigitPin("1234")).toBe(true);
    expect(validateFourDigitPin("123")).toBe(false);
    expect(validateFourDigitPin("12345")).toBe(false);
    expect(validateFourDigitPin("abcd")).toBe(false);
  });

  it("hashes 4-digit PINs deterministically and seeds StudentAccount & FacultyAccount DB records", () => {
    const hash = hashFourDigitPin("0184");
    expect(verifyFourDigitPinHash("0184", hash)).toBe(true);
    expect(verifyFourDigitPinHash("9999", hash)).toBe(false);

    const store = readAccountsStore();
    expect(
      store.studentAccounts.some((s) => s.registrationNo === "B23F0184CS042")
    ).toBe(true);
    expect(
      store.facultyAccounts.some(
        (f) => f.universityEmail === "kamran.siddiqui@university.edu"
      )
    ).toBe(true);
  });
});

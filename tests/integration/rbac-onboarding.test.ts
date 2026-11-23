import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@prisma/client";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockUser: User = {
  id: "cm0userstudent00000000001",
  clerkId: "user_clerk_student_1",
  email: "student@university.edu",
  fullName: "Abdullah Jan",
  avatarUrl: null,
  role: "STUDENT",
  departmentId: "cm0deptbscs00000000000001",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

let currentMockUser: User | null = mockUser;

vi.mock("@/lib/auth/session", async () => {
  class MockAuthError extends Error {
    public readonly code: "UNAUTHORIZED" | "FORBIDDEN";
    constructor(code: "UNAUTHORIZED" | "FORBIDDEN", message: string) {
      super(message);
      this.name = "AuthError";
      this.code = code;
    }
  }

  return {
    AuthError: MockAuthError,
    getCurrentUser: vi.fn(async () => currentMockUser),
    requireUser: vi.fn(async () => {
      if (!currentMockUser) {
        throw new MockAuthError("UNAUTHORIZED", "Authentication required");
      }
      return currentMockUser;
    }),
    requireRole: vi.fn(async (allowed: readonly string[]) => {
      if (!currentMockUser) {
        throw new MockAuthError("UNAUTHORIZED", "Authentication required");
      }
      if (!allowed.includes(currentMockUser.role)) {
        throw new MockAuthError("FORBIDDEN", "Access denied for role");
      }
      return currentMockUser;
    }),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      update: vi.fn(async ({ data }: { data: { role: "STUDENT" | "SUPERVISOR"; departmentId: string } }) => ({
        ...mockUser,
        role: data.role,
        departmentId: data.departmentId,
      })),
    },
    studentProfile: {
      upsert: vi.fn(async () => ({ id: "cm0profile000000000000001" })),
    },
  },
}));

import { completeOnboarding, upsertStudentProfile } from "@/actions/profile.actions";

describe("Phase 1: RBAC & Onboarding Server Action Guards", () => {
  beforeEach(() => {
    currentMockUser = { ...mockUser, role: "STUDENT" };
  });

  it("rejects onboarding role escalation to ADMIN or COORDINATOR", async () => {
    const escalatedAdmin = await completeOnboarding({
      role: "ADMIN",
      departmentId: "cm0deptbscs00000000000001",
    });

    expect(escalatedAdmin.ok).toBe(false);
    if (!escalatedAdmin.ok) {
      expect(escalatedAdmin.error.code).toBe("VALIDATION_ERROR");
    }

    const escalatedCoordinator = await completeOnboarding({
      role: "COORDINATOR",
      departmentId: "cm0deptbscs00000000000001",
    });

    expect(escalatedCoordinator.ok).toBe(false);
    if (!escalatedCoordinator.ok) {
      expect(escalatedCoordinator.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns UNAUTHORIZED when an unauthenticated user calls completeOnboarding", async () => {
    currentMockUser = null;
    const result = await completeOnboarding({
      role: "STUDENT",
      departmentId: "cm0deptbscs00000000000001",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("returns FORBIDDEN when a SUPERVISOR attempts to update a student skill profile", async () => {
    currentMockUser = { ...mockUser, role: "SUPERVISOR" };
    const result = await upsertStudentProfile({
      skills: [
        { skillSlug: "typescript", displayName: "TypeScript", proficiency: "ADVANCED" },
        { skillSlug: "nextjs", displayName: "Next.js", proficiency: "INTERMEDIATE" },
        { skillSlug: "postgresql", displayName: "PostgreSQL", proficiency: "INTERMEDIATE" },
      ],
      interests: ["DevTools"],
      careerGoal: "Full-Stack Systems Engineer",
      preferredType: "PRODUCT_SAAS",
      weeklyHours: 15,
      durationWeeks: 24,
      teamSize: 2,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("permits valid STUDENT onboarding and returns updated scope", async () => {
    const result = await completeOnboarding({
      role: "STUDENT",
      departmentId: "cm0deptbscs00000000000001",
      cohortId: "cm0cohort2627000000000001",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.role).toBe("STUDENT");
      expect(result.data.departmentId).toBe("cm0deptbscs00000000000001");
    }
  });
});

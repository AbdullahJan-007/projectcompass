import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@prisma/client";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockAdmin: User = {
  id: "cm0useradmin0000000000001",
  clerkId: "clerk_admin_1",
  email: "admin@university.edu",
  fullName: "Prof. Dr. Naveed Ahmad",
  avatarUrl: null,
  role: "ADMIN",
  departmentId: "cm0deptbscs00000000000001",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

let activeActor: User = mockAdmin;
let activeAdminsCount = 1;

vi.mock("@/lib/auth/session", () => {
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
    requireRole: vi.fn(async (allowed: readonly string[]) => {
      if (!allowed.includes(activeActor.role)) {
        throw new MockAuthError("FORBIDDEN", "Insufficient role");
      }
      return activeActor;
    }),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      count: vi.fn(async () => activeAdminsCount),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
        ...mockAdmin,
        id: where.id,
      })),
      update: vi.fn(async () => ({})),
    },
    supervisorProfile: {
      findUnique: vi.fn(async () => ({
        id: "cm0sup01kamransiddiqui001",
        departmentId: "cm0deptbscs00000000000001",
        maxSlots: 5,
        activeSlots: 3,
      })),
      update: vi.fn(async () => ({})),
    },
    auditLog: {
      create: vi.fn(async () => ({})),
    },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
}));

import { updateUserRole, overrideSupervisorQuota } from "@/actions/admin.actions";
import { createArchiveRecord } from "@/actions/archive.actions";

describe("Phase 5: Admin Governance, Last-Admin Protection & RBAC Boundaries", () => {
  beforeEach(() => {
    activeActor = { ...mockAdmin, role: "ADMIN" };
    activeAdminsCount = 1;
  });

  it("blocks self-demotion of the last active University Admin", async () => {
    const res = await updateUserRole({
      targetUserId: mockAdmin.id,
      role: "COORDINATOR",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("FORBIDDEN");
      expect(res.error.message).toContain("Last-Admin protection");
    }
  });

  it("returns FORBIDDEN when a STUDENT calls createArchiveRecord or updateUserRole", async () => {
    activeActor = { ...mockAdmin, role: "STUDENT" };

    const archiveAttempt = await createArchiveRecord({
      title: "Unauthorized Student Archive Upload",
      abstract: "A".repeat(120),
      academicYear: 2025,
      domain: "DevTools",
      techStack: ["TypeScript"],
    });

    expect(archiveAttempt.ok).toBe(false);
    if (!archiveAttempt.ok) {
      expect(archiveAttempt.error.code).toBe("FORBIDDEN");
    }

    const roleAttempt = await updateUserRole({
      targetUserId: "cm0userstudent00000000001",
      role: "ADMIN",
    });

    expect(roleAttempt.ok).toBe(false);
    if (!roleAttempt.ok) {
      expect(roleAttempt.error.code).toBe("FORBIDDEN");
    }
  });

  it("rejects supervisor quota override when new maxSlots < activeSlots", async () => {
    const res = await overrideSupervisorQuota({
      supervisorProfileId: "cm0sup01kamransiddiqui001",
      maxSlots: 2, // activeSlots is 3
      reason: "Attempting to reduce quota below currently locked active slots",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  allocateRoadmapWeeks,
  buildCalibratedProjectRoadmap,
  formatRoadmapAsMarkdown,
} from "@/lib/recommendation/roadmap-planner";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: vi.fn(async () => ({ delivered: true })),
}));

vi.mock("@/lib/auth/session", () => ({
  AuthError: class extends Error {
    public readonly code = "FORBIDDEN";
  },
  requireRole: vi.fn(async () => ({
    id: "cm0usersup01kamran0000001",
    role: "SUPERVISOR",
    departmentId: "cm0deptbscs00000000000001",
  })),
}));

// Simulated shared PostgreSQL row state for atomic last-slot concurrency test
let simulatedActiveSlots = 4;
const simulatedMaxSlots = 5;
const simulatedIsAccepting = true;

const requestStates: Record<string, "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN"> = {
  req_student_a: "PENDING",
  req_student_b: "PENDING",
};

vi.mock("@/lib/db", () => ({
  db: {
    supervisorRequest: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const status = requestStates[where.id];
        if (!status) return null;
        return {
          id: where.id,
          studentProfileId: where.id === "req_student_a" ? "stu_a" : "stu_b",
          recommendedIdeaId: where.id === "req_student_a" ? "idea_a" : "idea_b",
          supervisorProfileId: "cm0sup01kamransiddiqui001",
          status,
          supervisorProfile: {
            id: "cm0sup01kamransiddiqui001",
            userId: "cm0usersup01kamran0000001",
            activeSlots: simulatedActiveSlots,
            maxSlots: simulatedMaxSlots,
            isAccepting: simulatedIsAccepting,
          },
          studentProfile: {
            id: where.id === "req_student_a" ? "stu_a" : "stu_b",
            user: {
              email: `${where.id}@university.edu`,
            },
          },
        };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { status: "ACCEPTED" | "DECLINED" } }) => {
        requestStates[where.id] = data.status;
        return { id: where.id, status: data.status };
      }),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    recommendedIdea: {
      update: vi.fn(async () => ({})),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<boolean>) => {
      const tx = {
        $executeRaw: vi.fn(async () => {
          // Atomic PostgreSQL conditional increment: WHERE activeSlots < maxSlots AND isAccepting = true
          if (simulatedIsAccepting && simulatedActiveSlots < simulatedMaxSlots) {
            simulatedActiveSlots += 1;
            return 1; // 1 row updated
          }
          return 0; // 0 rows updated -> quota full rollback
        }),
        supervisorRequest: {
          update: vi.fn(async ({ where, data }: { where: { id: string }; data: { status: "ACCEPTED" } }) => {
            requestStates[where.id] = data.status;
          }),
          updateMany: vi.fn(async () => ({ count: 0 })),
        },
        recommendedIdea: {
          update: vi.fn(async () => ({})),
        },
      };
      return fn(tx);
    }),
  },
}));

import { respondToSupervisionRequest } from "@/actions/supervisor.actions";

describe("Phase 4: Roadmap Week Allocator Invariant (sum(weeks) === durationWeeks)", () => {
  it("guarantees exact durationWeeks sum across 12, 16, 24, and 36 weeks with 0 to 80 skill-gap hours", () => {
    const durations = [12, 16, 24, 36];
    const skillGapBuckets = [0, 12, 25, 50, 80];

    for (const durationWeeks of durations) {
      for (const totalSkillGapHours of skillGapBuckets) {
        const allocated = allocateRoadmapWeeks({
          durationWeeks,
          weeklyHours: 15,
          totalSkillGapHours,
        });

        const sum =
          allocated.prepWeeks +
          allocated.phase2Weeks +
          allocated.phase3Weeks +
          allocated.phase4Weeks;

        expect(sum).toBe(durationWeeks);
        expect(allocated.prepWeeks).toBeGreaterThanOrEqual(1);
        expect(allocated.prepWeeks).toBeLessThanOrEqual(
          Math.min(6, Math.floor(durationWeeks * 0.25))
        );
      }
    }
  });

  it("allocates early ramp-up weeks when skillGapHours > 15 and exports valid Markdown", () => {
    const roadmap = buildCalibratedProjectRoadmap({
      ideaTitle: "Deterministic CI Log Anomaly Triage Engine",
      domain: "DevTools",
      durationWeeks: 24,
      weeklyHours: 15,
      totalSkillGapHours: 24,
      skillGapSlugs: ["pgvector", "github-actions"],
      recommendedStack: ["Next.js", "TypeScript", "PostgreSQL"],
    });

    expect(roadmap.prepWeeksAllocated).toBeGreaterThanOrEqual(2);
    expect(
      roadmap.milestones.reduce((acc, m) => acc + m.weeksAllocated, 0)
    ).toBe(24);

    const md = formatRoadmapAsMarkdown({
      ideaTitle: "Deterministic CI Log Anomaly Triage Engine",
      roadmap,
    });

    expect(md).toContain("# ProjectCompass Execution Roadmap");
    expect(md).toContain("Phase 1: Skill Ramp-Up & Specification");
    expect(md).toContain("Risk Checkpoint:");
  });
});

describe("Phase 4: Atomic Quota Concurrency Race Test (State Machine 2)", () => {
  beforeEach(() => {
    simulatedActiveSlots = 4;
    requestStates["req_student_a"] = "PENDING";
    requestStates["req_student_b"] = "PENDING";
  });

  it("prevents over-allocation when two students are concurrently accepted into the last open slot (4/5)", async () => {
    const [resA, resB] = await Promise.allSettled([
      respondToSupervisionRequest({
        requestId: "req_student_a",
        decision: "ACCEPT",
        supervisorNote: "Accepting Student A into final lab supervision slot.",
      }),
      respondToSupervisionRequest({
        requestId: "req_student_b",
        decision: "ACCEPT",
        supervisorNote: "Accepting Student B concurrently into final lab supervision slot.",
      }),
    ]);

    expect(resA.status).toBe("fulfilled");
    expect(resB.status).toBe("fulfilled");

    if (resA.status === "fulfilled" && resB.status === "fulfilled") {
      const outcomes = [resA.value, resB.value];
      const successes = outcomes.filter((o) => o.ok);
      const failures = outcomes.filter((o) => !o.ok);

      // Exactly 1 succeeds and increments activeSlots to 5; the second fails with SUPERVISOR_QUOTA_FULL
      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(simulatedActiveSlots).toBe(5);

      const failedResult = failures[0];
      if (failedResult && !failedResult.ok) {
        expect(failedResult.error.code).toBe("SUPERVISOR_QUOTA_FULL");
      }
    }
  });
});

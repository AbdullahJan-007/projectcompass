"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { resolveDepartmentCodeById } from "@/lib/auth/university-id";
import { readInstitutionalDb } from "@/lib/institutional-store";
import {
  buildCalibratedProjectRoadmap,
  type PlannedRoadmapResult,
} from "@/lib/recommendation/roadmap-planner";
import type { RecommendedStackItem } from "@/types/actions";

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.CI !== "true" &&
    process.env.SEED_DEMO_DATA !== "true"
  );
}

export interface LiveSupervisorDirectoryItem {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  title: string;
  programCode: string;
  researchDomains: string[];
  bio: string;
  preferredStacks: string[];
  skillSlugs: string[];
  maxSlots: number;
  activeSlots: number;
  isAccepting: boolean;
}

export interface LiveSupervisionRequestItem {
  id: string;
  recommendedIdeaId: string;
  ideaTitle: string;
  supervisorProfileId: string;
  supervisorName: string;
  studentName: string;
  studentRegNo: string;
  track: string;
  feasibilityScore: number;
  skillGapsSummary: string;
  studentPitch: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "RELEASED";
  supervisorNote?: string;
  createdAt: string;
}

export async function getStudentSupervisorsWorkspace(): Promise<{
  supervisors: LiveSupervisorDirectoryItem[];
  sentRequests: LiveSupervisionRequestItem[];
}> {
  const user = await requireRole(["STUDENT", "COORDINATOR", "ADMIN"]);

  try {
    const [dbSupervisors, dbRequests] = await Promise.all([
      db.supervisorProfile.findMany({
        include: {
          user: { select: { fullName: true, email: true } },
          department: { select: { code: true } },
          skills: { include: { skill: { select: { slug: true } } } },
        },
        orderBy: [{ isAccepting: "desc" }, { activeSlots: "asc" }],
      }),
      db.supervisorRequest.findMany({
        where: { studentProfile: { userId: user.id } },
        include: {
          recommendedIdea: {
            select: { id: true, title: true, track: true, feasibilityScore: true },
          },
          supervisorProfile: {
            include: { user: { select: { fullName: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      supervisors: dbSupervisors.map((s) => ({
        id: s.id,
        userId: s.userId,
        fullName: s.user.fullName,
        email: s.user.email,
        title: s.title,
        programCode: s.department.code,
        researchDomains: s.researchDomains,
        bio: s.bio,
        preferredStacks: s.preferredStacks,
        skillSlugs: s.skills.map((sk) => sk.skill.slug),
        maxSlots: s.maxSlots,
        activeSlots: s.activeSlots,
        isAccepting: s.isAccepting,
      })),
      sentRequests: dbRequests.map((r) => ({
        id: r.id,
        recommendedIdeaId: r.recommendedIdeaId,
        ideaTitle: r.recommendedIdea.title,
        supervisorProfileId: r.supervisorProfileId,
        supervisorName: r.supervisorProfile.user.fullName,
        studentName: user.fullName,
        studentRegNo: user.clerkId ?? "",
        track: r.recommendedIdea.track,
        feasibilityScore: r.recommendedIdea.feasibilityScore,
        skillGapsSummary: "",
        studentPitch: r.studentPitch,
        status: r.status,
        supervisorNote: r.supervisorNote ?? undefined,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch {
    if (isProductionRuntime()) {
      return { supervisors: [], sentRequests: [] };
    }
    const inst = readInstitutionalDb();
    return {
      supervisors: inst.supervisors.map((s) => ({
        ...s,
        programCode: s.departmentCode,
      })),
      sentRequests: inst.supervisionRequests
        .filter((r) => r.studentUserId === user.id)
        .map((r) => ({
          ...r,
          status: r.status,
        })),
    };
  }
}

export async function getFacultySupervisorWorkspace(): Promise<{
  profile: {
    id: string;
    title: string;
    bio: string;
    researchDomains: string[];
    preferredStacks: string[];
    maxSlots: number;
    activeSlots: number;
    isAccepting: boolean;
  } | null;
  incomingRequests: LiveSupervisionRequestItem[];
}> {
  const user = await requireRole(["SUPERVISOR", "COORDINATOR", "ADMIN"]);

  try {
    const dbProfile = await db.supervisorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!dbProfile) {
      return { profile: null, incomingRequests: [] };
    }

    const dbRequests = await db.supervisorRequest.findMany({
      where: { supervisorProfileId: dbProfile.id },
      orderBy: { createdAt: "desc" },
      include: {
        recommendedIdea: {
          include: { skillGaps: { include: { skill: true } } },
        },
        studentProfile: {
          include: {
            user: {
              include: { studentAccount: true },
            },
          },
        },
      },
    });

    return {
      profile: {
        id: dbProfile.id,
        title: dbProfile.title,
        bio: dbProfile.bio,
        researchDomains: dbProfile.researchDomains,
        preferredStacks: dbProfile.preferredStacks,
        maxSlots: dbProfile.maxSlots,
        activeSlots: dbProfile.activeSlots,
        isAccepting: dbProfile.isAccepting,
      },
      incomingRequests: dbRequests.map((r) => {
        const stuAcc = r.studentProfile.user.studentAccount;
        const batchInfo = stuAcc
          ? `${stuAcc.intakeTerm} ${stuAcc.batchYear} · ${stuAcc.departmentCode}`
          : resolveDepartmentCodeById(r.studentProfile.user.departmentId);
        return {
          id: r.id,
          recommendedIdeaId: r.recommendedIdeaId,
          ideaTitle: r.recommendedIdea.title,
          supervisorProfileId: dbProfile.id,
          supervisorName: user.fullName,
          studentName: `${r.studentProfile.user.fullName} (${batchInfo})`,
          studentRegNo: stuAcc?.registrationNo ?? "",
          track: r.recommendedIdea.track,
          feasibilityScore: r.recommendedIdea.feasibilityScore,
          skillGapsSummary:
            r.recommendedIdea.skillGaps
              .map((g) => `${g.skill.displayName} (${g.estimatedLearnHours}h)`)
              .join(", ") || "No major skill gaps",
          studentPitch: r.studentPitch,
          status: r.status,
          supervisorNote: r.supervisorNote ?? undefined,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    };
  } catch {
    if (isProductionRuntime()) {
      return { profile: null, incomingRequests: [] };
    }
    const inst = readInstitutionalDb();
    const sup = inst.supervisors.find((s) => s.userId === user.id);
    return {
      profile: sup
        ? {
            id: sup.id,
            title: sup.title,
            bio: sup.bio,
            researchDomains: sup.researchDomains,
            preferredStacks: sup.preferredStacks,
            maxSlots: sup.maxSlots,
            activeSlots: sup.activeSlots,
            isAccepting: sup.isAccepting,
          }
        : null,
      incomingRequests: inst.supervisionRequests.map((r) => ({
        ...r,
        status: r.status,
      })),
    };
  }
}

export interface LiveArchiveItem {
  id: string;
  title: string;
  abstract: string;
  academicYear: number;
  domain: string;
  programCode: string;
  techStack: string[];
  ingestStatus:
    | "PENDING_EMBEDDING"
    | "PROCESSING"
    | "READY"
    | "NEEDS_MANUAL_ABSTRACT"
    | "FAILED";
  ingestError?: string;
}

export async function getCoordinatorWorkspaceData(): Promise<{
  archives: LiveArchiveItem[];
  totalSupervisorsSlots: number;
  filledSupervisorSlots: number;
  supervisorCount: number;
}> {
  await requireRole(["COORDINATOR", "ADMIN"]);

  try {
    const [dbArchives, dbSupervisors] = await Promise.all([
      db.projectArchive.findMany({
        include: { department: { select: { code: true } } },
        orderBy: [{ academicYear: "desc" }, { createdAt: "desc" }],
        take: 200,
      }),
      db.supervisorProfile.findMany({
        select: { maxSlots: true, activeSlots: true },
      }),
    ]);

    return {
      archives: dbArchives.map((a) => ({
        id: a.id,
        title: a.title,
        abstract: a.abstract,
        academicYear: a.academicYear,
        domain: a.domain,
        programCode: a.department.code,
        techStack: a.techStack,
        ingestStatus: a.ingestStatus,
        ingestError: a.ingestError ?? undefined,
      })),
      totalSupervisorsSlots: dbSupervisors.reduce((acc, s) => acc + s.maxSlots, 0),
      filledSupervisorSlots: dbSupervisors.reduce((acc, s) => acc + s.activeSlots, 0),
      supervisorCount: dbSupervisors.length,
    };
  } catch {
    if (isProductionRuntime()) {
      return {
        archives: [],
        totalSupervisorsSlots: 0,
        filledSupervisorSlots: 0,
        supervisorCount: 0,
      };
    }
    const inst = readInstitutionalDb();
    return {
      archives: inst.archives.map((a) => ({
        id: a.id,
        title: a.title,
        abstract: a.abstract,
        academicYear: a.academicYear,
        domain: a.domain,
        programCode: a.departmentCode,
        techStack: [...a.techStack],
        ingestStatus: a.ingestStatus,
        ingestError: a.ingestError,
      })),
      totalSupervisorsSlots: inst.supervisors.reduce((acc, s) => acc + s.maxSlots, 0),
      filledSupervisorSlots: inst.supervisors.reduce((acc, s) => acc + s.activeSlots, 0),
      supervisorCount: inst.supervisors.length,
    };
  }
}

export async function getAdminWorkspaceData(): Promise<{
  users: Array<{
    id: string;
    fullName: string;
    email: string;
    role: "STUDENT" | "SUPERVISOR" | "COORDINATOR" | "ADMIN";
    departmentCode: string;
  }>;
  supervisors: Array<{
    id: string;
    fullName: string;
    programCode: string;
    activeSlots: number;
    maxSlots: number;
  }>;
  auditLogs: Array<{
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
  }>;
}> {
  await requireRole(["ADMIN"]);

  try {
    const [dbUsers, dbSupervisors, dbLogs] = await Promise.all([
      db.user.findMany({
        include: { department: { select: { code: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      db.supervisorProfile.findMany({
        include: {
          user: { select: { fullName: true } },
          department: { select: { code: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.auditLog.findMany({
        include: { actor: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

    return {
      users: dbUsers.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        departmentCode: u.department?.code ?? resolveDepartmentCodeById(u.departmentId),
      })),
      supervisors: dbSupervisors.map((s) => ({
        id: s.id,
        fullName: s.user.fullName,
        programCode: s.department.code,
        activeSlots: s.activeSlots,
        maxSlots: s.maxSlots,
      })),
      auditLogs: dbLogs.map((l) => ({
        id: l.id,
        timestamp: l.createdAt.toISOString().slice(0, 16).replace("T", " "),
        actor: l.actor?.fullName ?? "System",
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        summary:
          typeof l.metadataJson === "object" &&
          l.metadataJson !== null &&
          "reason" in l.metadataJson
            ? String((l.metadataJson as Record<string, unknown>).reason)
            : `${l.action} on ${l.entityType} (${l.entityId})`,
      })),
    };
  } catch {
    return { users: [], supervisors: [], auditLogs: [] };
  }
}

export async function getRoadmapWorkspaceData(recommendedIdeaId: string): Promise<{
  found: boolean;
  ideaTitle: string;
  domain: string;
  roadmap: PlannedRoadmapResult | null;
  milestoneStatuses: Record<string, "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED">;
}> {
  const user = await requireRole(["STUDENT"]);

  try {
    const idea = await db.recommendedIdea.findUnique({
      where: { id: recommendedIdeaId },
      include: {
        seedTemplate: { select: { domain: true } },
        skillGaps: { include: { skill: { select: { slug: true } } } },
        run: { include: { studentProfile: true } },
        roadmap: {
          include: { milestones: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (idea && (idea.run.studentProfile.userId === user.id || user.role !== "STUDENT")) {
      const domain =
        idea.seedTemplate?.domain ??
        idea.marketDemandTag.split("·")[0]?.trim() ??
        "Software Systems";
      const stack = Array.isArray(idea.recommendedStack)
        ? (idea.recommendedStack as unknown as RecommendedStackItem[]).map((s) => s.tech)
        : ["Next.js", "TypeScript", "PostgreSQL"];

      const planned = buildCalibratedProjectRoadmap({
        ideaTitle: idea.title,
        domain,
        durationWeeks: idea.run.studentProfile.durationWeeks,
        weeklyHours: idea.run.studentProfile.weeklyHours,
        totalSkillGapHours: idea.skillGaps.reduce((acc, g) => acc + g.estimatedLearnHours, 0),
        skillGapSlugs: idea.skillGaps.map((g) => g.skill.slug),
        recommendedStack: stack,
      });

      const statuses: Record<string, "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"> = {};
      if (idea.roadmap && idea.roadmap.milestones.length > 0) {
        idea.roadmap.milestones.forEach((m, idx) => {
          const key = planned.milestones[idx]?.id ?? m.id;
          statuses[key] = m.status;
        });
      }

      return {
        found: true,
        ideaTitle: idea.title,
        domain,
        roadmap: planned,
        milestoneStatuses: statuses,
      };
    }

    // Check if DB is reachable but idea doesn't exist
    return {
      found: false,
      ideaTitle: "",
      domain: "",
      roadmap: null,
      milestoneStatuses: {},
    };
  } catch {
    if (isProductionRuntime()) {
      return {
        found: false,
        ideaTitle: "",
        domain: "",
        roadmap: null,
        milestoneStatuses: {},
      };
    }
    const inst = readInstitutionalDb();
    const rec = inst.recommendationsByUser[user.id];
    const idea = rec?.ideas.find((i) => i.id === recommendedIdeaId);
    if (!idea) {
      return {
        found: false,
        ideaTitle: "",
        domain: "",
        roadmap: null,
        milestoneStatuses: {},
      };
    }
    const profile = inst.studentProfiles[user.id];
    const planned = buildCalibratedProjectRoadmap({
      ideaTitle: idea.title,
      domain: idea.domain,
      durationWeeks: profile?.durationWeeks ?? 24,
      weeklyHours: profile?.weeklyHours ?? 15,
      totalSkillGapHours: idea.skillGaps.reduce((acc, g) => acc + g.estimatedLearnHours, 0),
      skillGapSlugs: idea.skillGaps.map((g) => g.skillSlug),
      recommendedStack: idea.recommendedStack.map((s) => s.tech),
    });
    return {
      found: true,
      ideaTitle: idea.title,
      domain: idea.domain,
      roadmap: planned,
      milestoneStatuses: inst.milestoneStatuses ?? {},
    };
  }
}

"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { readAccountsStore } from "@/lib/auth/account-registry";
import { resolveDepartmentCodeById } from "@/lib/auth/university-id";
import { readInstitutionalDb } from "@/lib/institutional-store";
import {
  ensurePersistedRoadmapForIdea,
  isProductionRuntime,
} from "@/lib/recommendation/live-context";
import {
  buildCalibratedProjectRoadmap,
  type PlannedRoadmapResult,
} from "@/lib/recommendation/roadmap-planner";
import {
  formatPakistanDate,
  formatPakistanDateTime,
} from "@/lib/time/pakistan-time";

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
        where: {
          user: { isActive: true },
        },
        include: {
          user: { select: { fullName: true, email: true } },
          department: { select: { code: true } },
          skills: { include: { skill: { select: { slug: true } } } },
        },
        orderBy: [{ isAccepting: "desc" }, { activeSlots: "asc" }],
        take: 200,
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
        take: 100,
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
    // Single relational query (eliminates sequential 2-RTT waterfall on /dashboard/supervisor)
    const dbProfile = await db.supervisorProfile.findUnique({
      where: { userId: user.id },
      include: {
        supervisionRequests: {
          orderBy: { createdAt: "desc" },
          take: 100,
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
        },
      },
    });

    if (!dbProfile) {
      return { profile: null, incomingRequests: [] };
    }

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
      incomingRequests: dbProfile.supervisionRequests.map((r) => {
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
      incomingRequests: sup
        ? inst.supervisionRequests
            .filter((r) => r.supervisorProfileId === sup.id)
            .map((r) => ({
              ...r,
              status: r.status,
            }))
        : [],
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

export type AdminArchiveRow = LiveArchiveItem;

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
        where: { user: { isActive: true } },
        select: { maxSlots: true, activeSlots: true },
        take: 200,
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

export interface AdminStudentRow {
  userId: string;
  fullName: string;
  email: string;
  registrationNo: string;
  batchLabel: string;
  departmentCode: string;
  profileStatus: "DRAFT" | "READY" | "NOT_STARTED";
  skillsCount: number;
  careerGoal: string;
  ideasCount: number;
  isActive: boolean;
}

export interface AdminProjectRow {
  id: string;
  title: string;
  track: string;
  status: string;
  feasibilityScore: number;
  studentName: string;
  studentRegNo: string;
  departmentCode: string;
  supervisorName: string | null;
  createdAt: string;
}

export async function getAdminWorkspaceData(): Promise<{
  users: Array<{
    id: string;
    fullName: string;
    email: string;
    role: "STUDENT" | "SUPERVISOR" | "COORDINATOR" | "ADMIN";
    departmentCode: string;
    isActive: boolean;
  }>;
  students: AdminStudentRow[];
  supervisors: Array<{
    id: string;
    userId: string;
    fullName: string;
    email: string;
    designation: string;
    programCode: string;
    activeSlots: number;
    maxSlots: number;
    isAccepting: boolean;
    isActive: boolean;
  }>;
  projects: AdminProjectRow[];
  archives: LiveArchiveItem[];
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
    const [dbUsers, dbSupervisors, dbStudents, dbIdeas, dbArchives, dbLogs] =
      await Promise.all([
        db.user.findMany({
          include: { department: { select: { code: true } } },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
        db.supervisorProfile.findMany({
          include: {
            user: { select: { fullName: true, email: true, isActive: true } },
            department: { select: { code: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
        db.user.findMany({
          where: { role: "STUDENT" },
          include: {
            department: { select: { code: true } },
            studentAccount: true,
            studentProfile: {
              include: {
                _count: { select: { skills: true, recommendationRuns: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
        db.recommendedIdea.findMany({
          include: {
            run: {
              include: {
                studentProfile: {
                  include: {
                    user: {
                      include: {
                        studentAccount: true,
                        department: { select: { code: true } },
                      },
                    },
                  },
                },
              },
            },
            supervisionRequests: {
              where: { status: "ACCEPTED" },
              include: {
                supervisorProfile: { include: { user: { select: { fullName: true } } } },
              },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        db.projectArchive.findMany({
          include: { department: { select: { code: true } } },
          orderBy: [{ academicYear: "desc" }, { createdAt: "desc" }],
          take: 100,
        }),
        db.auditLog.findMany({
          include: { actor: { select: { fullName: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ]);

    return {
      users: dbUsers.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        departmentCode: u.department?.code ?? resolveDepartmentCodeById(u.departmentId),
        isActive: u.isActive,
      })),
      students: dbStudents.map((s) => {
        const acc = s.studentAccount;
        return {
          userId: s.id,
          fullName: s.fullName,
          email: s.email,
          registrationNo: acc?.registrationNo ?? "—",
          batchLabel: acc ? `${acc.intakeTerm} ${acc.batchYear}` : "Unassigned",
          departmentCode:
            acc?.departmentCode ??
            s.department?.code ??
            resolveDepartmentCodeById(s.departmentId),
          profileStatus: s.studentProfile ? s.studentProfile.status : "NOT_STARTED",
          skillsCount: s.studentProfile?._count.skills ?? 0,
          careerGoal: s.studentProfile?.careerGoal || "Not specified yet",
          ideasCount: (s.studentProfile?._count.recommendationRuns ?? 0) * 3,
          isActive: s.isActive,
        };
      }),
      supervisors: dbSupervisors.map((s) => ({
        id: s.id,
        userId: s.userId,
        fullName: s.user.fullName,
        email: s.user.email,
        designation: s.title,
        programCode: s.department.code,
        activeSlots: s.activeSlots,
        maxSlots: s.maxSlots,
        isAccepting: s.isAccepting,
        isActive: s.user.isActive,
      })),
      projects: dbIdeas.map((idea) => {
        const stu = idea.run.studentProfile.user;
        const acceptedSup =
          idea.supervisionRequests[0]?.supervisorProfile.user.fullName ?? null;
        return {
          id: idea.id,
          title: idea.title,
          track: idea.track,
          status: idea.status,
          feasibilityScore: idea.feasibilityScore,
          studentName: stu.fullName,
          studentRegNo: stu.studentAccount?.registrationNo ?? "—",
          departmentCode:
            stu.studentAccount?.departmentCode ??
            stu.department?.code ??
            resolveDepartmentCodeById(stu.departmentId),
          supervisorName: acceptedSup,
          createdAt: formatPakistanDate(idea.createdAt),
        };
      }),
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
      auditLogs: dbLogs.map((l) => ({
        id: l.id,
        timestamp: formatPakistanDateTime(l.createdAt),
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
    if (isProductionRuntime()) {
      return {
        users: [],
        students: [],
        supervisors: [],
        projects: [],
        archives: [],
        auditLogs: [],
      };
    }

    const acc = readAccountsStore();
    const inst = readInstitutionalDb();

    return {
      users: [
        ...acc.facultyAccounts.map((f) => ({
          id: f.userId,
          fullName: f.fullName,
          email: f.universityEmail,
          role: f.role,
          departmentCode: f.departmentCode,
          isActive: f.isActive !== false,
        })),
        ...acc.studentAccounts.map((s) => ({
          id: s.userId,
          fullName: s.fullName,
          email: s.email,
          role: "STUDENT" as const,
          departmentCode: s.departmentCode,
          isActive: s.isActive !== false,
        })),
      ],
      students: acc.studentAccounts.map((s) => {
        const prof = inst.studentProfiles[s.userId];
        const rec = inst.recommendationsByUser[s.userId];
        return {
          userId: s.userId,
          fullName: s.fullName,
          email: s.email,
          registrationNo: s.registrationNo,
          batchLabel: `${s.intakeTerm} ${s.batchYear}`,
          departmentCode: s.departmentCode,
          profileStatus: prof ? prof.status : "NOT_STARTED",
          skillsCount: prof?.skills.length ?? 0,
          careerGoal: prof?.careerGoal || "Not specified yet",
          ideasCount: rec?.ideas.length ?? 0,
          isActive: s.isActive !== false,
        };
      }),
      supervisors: inst.supervisors.map((s) => {
        const facAcc = acc.facultyAccounts.find((f) => f.userId === s.userId);
        return {
          id: s.id,
          userId: s.userId,
          fullName: s.fullName,
          email: s.email,
          designation: s.title,
          programCode: s.departmentCode,
          activeSlots: s.activeSlots,
          maxSlots: s.maxSlots,
          isAccepting: s.isAccepting,
          isActive: facAcc ? facAcc.isActive !== false : true,
        };
      }),
      projects: Object.entries(inst.recommendationsByUser).flatMap(([uid, rec]) => {
        const stuAcc = acc.studentAccounts.find((s) => s.userId === uid);
        return rec.ideas.map((idea) => ({
          id: idea.id,
          title: idea.title,
          track: idea.track,
          status: rec.shortlistedIds.includes(idea.id) ? "SHORTLISTED" : "GENERATED",
          feasibilityScore: idea.feasibilityScore,
          studentName: stuAcc?.fullName ?? "Student",
          studentRegNo: stuAcc?.registrationNo ?? "—",
          departmentCode: stuAcc?.departmentCode ?? "BSCS",
          supervisorName: null,
          createdAt: rec.updatedAt.slice(0, 10),
        }));
      }),
      archives: inst.archives.slice(0, 100).map((a) => ({
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
      auditLogs: inst.auditLogs.slice(0, 50),
    };
  }
}

export async function getRoadmapWorkspaceData(recommendedIdeaId: string): Promise<{
  found: boolean;
  roadmapId: string | null;
  ideaTitle: string;
  domain: string;
  roadmap: PlannedRoadmapResult | null;
  milestoneStatuses: Record<string, "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED">;
}> {
  const user = await requireRole(["STUDENT"]);

  try {
    const persisted = await ensurePersistedRoadmapForIdea({
      recommendedIdeaId,
      userId: user.id,
    });

    if (persisted.kind === "FOUND") {
      return {
        found: true,
        roadmapId: persisted.roadmapId,
        ideaTitle: persisted.ideaTitle,
        domain: persisted.domain,
        roadmap: persisted.roadmap,
        milestoneStatuses: persisted.milestoneStatuses,
      };
    }

    if (persisted.kind === "FORBIDDEN" || isProductionRuntime()) {
      return {
        found: false,
        roadmapId: null,
        ideaTitle: "",
        domain: "",
        roadmap: null,
        milestoneStatuses: {},
      };
    }
  } catch {
    if (isProductionRuntime()) {
      return {
        found: false,
        roadmapId: null,
        ideaTitle: "",
        domain: "",
        roadmap: null,
        milestoneStatuses: {},
      };
    }
  }

  // Non-production offline fallback
  const inst = readInstitutionalDb();
  const rec = inst.recommendationsByUser[user.id];
  const idea = rec?.ideas.find((i) => i.id === recommendedIdeaId);
  if (!idea) {
    return {
      found: false,
      roadmapId: null,
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
    roadmapId: `cm0roadmap_${recommendedIdeaId}`,
    ideaTitle: idea.title,
    domain: idea.domain,
    roadmap: planned,
    milestoneStatuses: inst.milestoneStatuses ?? {},
  };
}

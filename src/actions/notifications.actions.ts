"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { formatPakistanDateTime } from "@/lib/time/pakistan-time";

export interface PortalNotificationItem {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "info" | "success" | "warning";
  timestamp: string;
}

/**
 * Real-time, role-scoped notification feed aggregated directly from PostgreSQL
 * for the AppShell Notification Bell (zero extra table bloat).
 */
export async function getPortalNotifications(): Promise<PortalNotificationItem[]> {
  try {
    const user = await requireUser();

    if (user.role === "STUDENT") {
      const requests = await db.supervisorRequest.findMany({
        where: { studentProfile: { userId: user.id } },
        include: {
          recommendedIdea: { select: { id: true, title: true } },
          supervisorProfile: { include: { user: { select: { fullName: true } } } },
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      });

      return requests.map((r) => ({
        id: r.id,
        title:
          r.status === "ACCEPTED"
            ? `Supervision Accepted by ${r.supervisorProfile.user.fullName}`
            : r.status === "DECLINED"
              ? `Request Declined by ${r.supervisorProfile.user.fullName}`
              : r.status === "PENDING"
                ? `Pending Review: ${r.supervisorProfile.user.fullName}`
                : `Request ${r.status}: ${r.supervisorProfile.user.fullName}`,
        description: r.recommendedIdea.title,
        href: r.status === "ACCEPTED" ? `/dashboard/roadmaps/${r.recommendedIdea.id}` : "/dashboard/supervisors",
        tone: r.status === "ACCEPTED" ? "success" : r.status === "DECLINED" ? "warning" : "info",
        timestamp: formatPakistanDateTime(r.updatedAt),
      }));
    }

    if (user.role === "SUPERVISOR") {
      const incoming = await db.supervisorRequest.findMany({
        where: {
          supervisorProfile: { userId: user.id },
          status: "PENDING",
        },
        include: {
          recommendedIdea: { select: { title: true, feasibilityScore: true } },
          studentProfile: { include: { user: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      });

      return incoming.map((r) => ({
        id: r.id,
        title: `New Pitch from ${r.studentProfile.user.fullName}`,
        description: `${r.recommendedIdea.title} (${r.recommendedIdea.feasibilityScore}/100)`,
        href: "/dashboard/supervisor",
        tone: "info",
        timestamp: formatPakistanDateTime(r.createdAt),
      }));
    }

    // ADMIN or COORDINATOR
    const [pendingArchives, recentLogs] = await Promise.all([
      db.projectArchive.findMany({
        where: { ingestStatus: "NEEDS_MANUAL_ABSTRACT" },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      db.auditLog.findMany({
        include: { actor: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    ]);

    const items: PortalNotificationItem[] = [
      ...pendingArchives.map((a) => ({
        id: `arch_${a.id}`,
        title: "Archive Needs Manual Abstract",
        description: a.title,
        href: user.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/coordinator",
        tone: "warning" as const,
        timestamp: formatPakistanDateTime(a.createdAt),
      })),
      ...recentLogs.map((l) => ({
        id: `log_${l.id}`,
        title: `${l.action.replace(/_/g, " ")}`,
        description:
          typeof l.metadataJson === "object" &&
          l.metadataJson !== null &&
          "reason" in l.metadataJson
            ? String((l.metadataJson as Record<string, unknown>).reason)
            : `${l.actor?.fullName ?? "System"} updated ${l.entityType}`,
        href: user.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/coordinator",
        tone: "info" as const,
        timestamp: formatPakistanDateTime(l.createdAt),
      })),
    ];

    return items.slice(0, 6);
  } catch {
    return [];
  }
}

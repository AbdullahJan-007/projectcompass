"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  UserCircle,
  Sparkles,
  Users,
  CalendarRange,
  TrendingUp,
  Archive,
  ShieldAlert,
  Briefcase,
  LogOut,
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { signOutUniversitySession } from "@/actions/auth.actions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  roles: readonly UserRole[];
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/dashboard/profile",
    label: "Skill & Time Profile",
    icon: UserCircle,
    roles: ["STUDENT", "COORDINATOR", "ADMIN"],
  },
  {
    href: "/dashboard/recommendations",
    label: "FYP Recommendations",
    icon: Sparkles,
    roles: ["STUDENT", "COORDINATOR", "ADMIN"],
  },
  {
    href: "/dashboard/supervisors",
    label: "Supervisor Matching",
    icon: Users,
    roles: ["STUDENT", "COORDINATOR", "ADMIN"],
  },
  {
    href: "/dashboard/roadmaps",
    label: "Execution Roadmaps",
    icon: CalendarRange,
    roles: ["STUDENT", "SUPERVISOR", "COORDINATOR", "ADMIN"],
  },
  {
    href: "/dashboard/market-trends",
    label: "Market-Trend Insights",
    icon: TrendingUp,
    roles: ["STUDENT", "SUPERVISOR", "COORDINATOR", "ADMIN"],
  },
  {
    href: "/dashboard/supervisor",
    label: "Supervisor Portal & Quotas",
    icon: Briefcase,
    roles: ["SUPERVISOR", "COORDINATOR", "ADMIN"],
  },
  {
    href: "/dashboard/coordinator",
    label: "Archive & Dept Quotas",
    icon: Archive,
    roles: ["COORDINATOR", "ADMIN"],
  },
  {
    href: "/dashboard/admin",
    label: "Institutional Governance",
    icon: ShieldAlert,
    roles: ["ADMIN"],
  },
];

export interface AppShellProps {
  children: React.ReactNode;
  userRole: UserRole;
  userName: string;
  departmentCode: string;
}

export function AppShell({
  children,
  userRole,
  userName,
  departmentCode,
}: AppShellProps) {
  const router = useRouter();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  async function handleSignOut() {
    await signOutUniversitySession();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col border-r border-border-default bg-bg-subtle">
        <div className="flex h-16 items-center justify-between border-b border-border-default px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-brand-primary text-bg-surface">
              <Compass className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <span className="text-sm font-semibold tracking-tight text-text-primary">
              ProjectCompass
            </span>
          </Link>
          <Badge variant="neutral">{departmentCode}</Badge>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Workspace Navigation
          </p>
          <nav className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-bg-surface hover:text-text-primary"
                >
                  <Icon className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-border-default bg-bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate pr-1">
              <p className="truncate text-xs font-semibold text-text-primary">{userName}</p>
              <p className="font-mono-tabular text-[11px] text-text-muted">
                {userRole} · {departmentCode}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              data-testid="sidebar-signout-btn"
              className="inline-flex shrink-0 items-center gap-1 rounded-[4px] border border-border-default bg-bg-subtle px-2 py-1 text-[11px] font-medium text-text-secondary hover:border-status-error/40 hover:bg-status-error-tint hover:text-status-error-text"
            >
              <LogOut className="h-3 w-3" strokeWidth={1.75} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col pl-[248px]">
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

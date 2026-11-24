"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Menu,
  X,
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  function isItemActive(href: string): boolean {
    if (!pathname) return false;
    if (href === "/dashboard/roadmaps") {
      return pathname.startsWith("/dashboard/roadmaps");
    }
    return pathname === href;
  }

  async function handleSignOut() {
    await signOutUniversitySession();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-bg-canvas">
      {/* Mobile / Tablet Top Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-default bg-bg-surface px-4 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-brand-primary text-bg-surface">
            <Compass className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-text-primary">
            ProjectCompass
          </span>
          <Badge variant="neutral">{departmentCode}</Badge>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle workspace navigation"
          className="rounded-[6px] border border-border-default bg-bg-subtle p-1.5 text-text-primary"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "z-30 flex w-full flex-col border-b border-border-default bg-bg-subtle lg:fixed lg:inset-y-0 lg:left-0 lg:w-[252px] lg:border-b-0 lg:border-r",
          mobileOpen ? "flex" : "hidden lg:flex"
        )}
      >
        <div className="hidden h-16 items-center justify-between border-b border-border-default px-5 lg:flex">
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
          <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Workspace Navigation
          </p>
          <nav className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm transition-colors duration-150",
                    active
                      ? "bg-brand-tint/70 font-semibold text-brand-primary-hover shadow-[inset_3px_0_0_0_var(--brand-primary)]"
                      : "font-medium text-text-secondary hover:bg-bg-surface hover:text-text-primary"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-brand-primary-hover" : "text-brand-primary"
                    )}
                    strokeWidth={1.75}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-border-default bg-bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 pr-1">
              <p className="truncate text-xs font-semibold text-text-primary">{userName}</p>
              <p className="font-mono-tabular text-[11px] text-text-muted">
                {userRole} · {departmentCode}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              data-testid="sidebar-signout-btn"
              className="inline-flex shrink-0 items-center gap-1 rounded-[6px] border border-border-default bg-bg-subtle px-2.5 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-status-error/40 hover:bg-status-error-tint hover:text-status-error-text"
            >
              <LogOut className="h-3 w-3" strokeWidth={1.75} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col lg:pl-[252px]">
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

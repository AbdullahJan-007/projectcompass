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
import { PortalSessionProvider } from "@/components/layout/portal-session-context";
import { signOutUniversitySession } from "@/actions/auth.actions";
import { clearWorkspaceStorage } from "@/lib/workspace-store";

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
    roles: ["STUDENT"],
  },
  {
    href: "/dashboard/recommendations",
    label: "FYP Recommendations",
    icon: Sparkles,
    roles: ["STUDENT"],
  },
  {
    href: "/dashboard/supervisors",
    label: "Supervisor Matching",
    icon: Users,
    roles: ["STUDENT"],
  },
  {
    href: "/dashboard/roadmaps",
    label: "Execution Roadmaps",
    icon: CalendarRange,
    roles: ["STUDENT"],
  },
  {
    href: "/dashboard/market-trends",
    label: "Industry Demand",
    icon: TrendingUp,
    roles: ["STUDENT", "SUPERVISOR", "COORDINATOR", "ADMIN"],
  },
  {
    href: "/dashboard/supervisor",
    label: "Supervisor Portal",
    icon: Briefcase,
    roles: ["SUPERVISOR"],
  },
  {
    href: "/dashboard/coordinator",
    label: "Archives & Quotas",
    icon: Archive,
    roles: ["COORDINATOR", "ADMIN"],
  },
  {
    href: "/dashboard/admin",
    label: "Department Governance",
    icon: ShieldAlert,
    roles: ["ADMIN"],
  },
];

export interface AppShellProps {
  children: React.ReactNode;
  userRole: UserRole;
  userName: string;
  identifier: string;
  departmentCode: string;
  batchLabel: string;
}

export function AppShell({
  children,
  userRole,
  userName,
  identifier,
  departmentCode,
  batchLabel,
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
    clearWorkspaceStorage();
    await signOutUniversitySession();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <PortalSessionProvider
      value={{ userRole, userName, identifier, departmentCode, batchLabel }}
    >
      <div className="flex min-h-screen flex-col lg:flex-row bg-bg-canvas overflow-x-hidden">
        {/* Mobile & Tablet Sticky Header (< lg) */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border-default bg-bg-surface px-4 lg:hidden">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-brand-primary text-bg-surface">
              <Compass className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <span className="truncate text-sm font-semibold tracking-tight text-text-primary">
              ProjectCompass
            </span>
            <Badge variant="neutral" className="shrink-0 font-mono-tabular">
              {departmentCode}
            </Badge>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle workspace navigation"
            aria-expanded={mobileOpen}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-border-default bg-bg-subtle text-text-primary hover:bg-border-default/60"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </header>

        {/* Mobile / Tablet Backdrop Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-text-primary/35 backdrop-blur-[1px] lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Responsive Sidebar / Slide-over Drawer */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[264px] max-w-[82vw] flex-col border-r border-border-default bg-bg-subtle transition-transform duration-200 ease-out lg:w-[256px] lg:max-w-none lg:translate-x-0",
            mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:shadow-none"
          )}
        >
          <div className="flex h-14 lg:h-16 items-center justify-between border-b border-border-default px-4 lg:px-5 bg-bg-surface/60">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 min-w-0"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-brand-primary text-bg-surface">
                <Compass className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold tracking-tight text-text-primary">
                  ProjectCompass
                </span>
                <span className="block truncate text-[10px] font-medium text-text-muted">
                  IT &amp; Computing Dept
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="neutral" className="font-mono-tabular">
                {departmentCode}
              </Badge>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation drawer"
                className="rounded-[6px] p-1 text-text-muted hover:bg-bg-surface hover:text-text-primary lg:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
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
                      "flex items-center gap-2.5 rounded-[6px] px-3 py-2.5 text-sm transition-colors duration-150",
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
                <p className="truncate font-mono-tabular text-[11px] text-text-muted">
                  {batchLabel}
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

        <div className="flex min-w-0 flex-1 flex-col lg:pl-[256px]">
          <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </PortalSessionProvider>
  );
}

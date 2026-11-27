"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { PortalSessionProvider } from "@/components/layout/portal-session-context";
import { signOutUniversitySession } from "@/actions/auth.actions";
import { clearWorkspaceStorage } from "@/lib/workspace-store";

interface NavItem {
  href: string;
  label: string;
  iconName: string;
  roles: readonly UserRole[];
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/dashboard/profile",
    label: "Skill & Time Profile",
    iconName: "badge",
    roles: ["STUDENT"],
  },
  {
    href: "/dashboard/recommendations",
    label: "FYP Recommendations",
    iconName: "lightbulb",
    roles: ["STUDENT"],
  },
  {
    href: "/dashboard/supervisors",
    label: "Supervisor Matching",
    iconName: "person_search",
    roles: ["STUDENT"],
  },
  {
    href: "/dashboard/roadmaps",
    label: "Execution Roadmaps",
    iconName: "alt_route",
    roles: ["STUDENT"],
  },
  {
    href: "/dashboard/supervisor",
    label: "Supervisor Portal",
    iconName: "assignment_ind",
    roles: ["SUPERVISOR"],
  },
  {
    href: "/dashboard/admin",
    label: "Admin Command Center",
    iconName: "admin_panel_settings",
    roles: ["ADMIN"],
  },
  {
    href: "/dashboard/coordinator",
    label: "Archives & Quotas",
    iconName: "inventory_2",
    roles: ["COORDINATOR", "ADMIN"],
  },
  {
    href: "/dashboard/market-trends",
    label: "Industry Demand",
    iconName: "trending_up",
    roles: ["STUDENT", "SUPERVISOR", "COORDINATOR", "ADMIN"],
  },
];

function getPortalSectionLabel(role: UserRole): string {
  switch (role) {
    case "STUDENT":
      return "Student Portal";
    case "SUPERVISOR":
      return "Faculty Workspace";
    case "ADMIN":
      return "Admin Command";
    case "COORDINATOR":
      return "Coordinator Workspace";
  }
}

function getRoleViewChip(role: UserRole): string {
  switch (role) {
    case "STUDENT":
      return "Student View";
    case "SUPERVISOR":
      return "Faculty View (Active)";
    case "ADMIN":
      return "Admin Console";
    case "COORDINATOR":
      return "Coordinator View";
  }
}

function extractInitials(fullName: string): string {
  const clean = fullName.replace(/\([^)]*\)/g, "").replace(/^(Dr\.|Prof\.|Engr\.)\s*/i, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PC";
  if (parts.length === 1) return (parts[0] ?? "PC").slice(0, 2).toUpperCase();
  const first = parts[0]?.[0] ?? "P";
  const last = parts[parts.length - 1]?.[0] ?? "C";
  return `${first}${last}`.toUpperCase();
}

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
  const initials = extractInitials(userName);

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
      <div className="flex min-h-screen flex-col lg:flex-row bg-[#F9F7F7] text-on-surface overflow-x-hidden">
        {/* Mobile & Tablet Sticky Header (< lg) */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#DBE2EF] bg-[#F9F7F7]/95 backdrop-blur-xl px-4 lg:hidden">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#112D4E] text-white font-headline-sm text-base font-bold shadow-sm">
              P
            </div>
            <div className="min-w-0">
              <span className="block truncate font-headline-sm text-sm font-bold tracking-tight text-[#112D4E]">
                ProjectCompass
              </span>
              <span className="block truncate font-label-sm text-[10px] font-semibold uppercase tracking-wider text-[#3F72AF]">
                {departmentCode}
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle workspace navigation"
            aria-expanded={mobileOpen}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#DBE2EF] bg-surface-container-lowest text-[#112D4E] hover:bg-[#DBE2EF]/60 transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>
        </header>

        {/* Mobile / Tablet Backdrop Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-[#001833]/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Stitch 248px Responsive Sidebar / Slide-over Drawer */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[248px] max-w-[84vw] flex-col justify-between border-r border-[#DBE2EF] bg-[#F5F3F3] transition-transform duration-200 ease-out lg:w-[248px] lg:max-w-none lg:translate-x-0",
            mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:shadow-none"
          )}
        >
          <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">
            {/* Brand Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#DBE2EF]/80 bg-surface-container-lowest/70 px-4">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 min-w-0"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#112D4E] text-white font-headline-sm text-lg font-bold shadow-sm">
                  P
                </div>
                <div className="min-w-0">
                  <span className="block truncate font-headline-sm text-base font-bold tracking-tight text-[#112D4E] leading-tight">
                    ProjectCompass
                  </span>
                  <span className="block truncate font-label-sm text-[10px] font-semibold uppercase tracking-wider text-[#3F72AF]">
                    Academic Capstone
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="rounded bg-[#DBE2EF]/80 px-2 py-0.5 font-mono-tabular text-[11px] font-semibold text-[#112D4E]">
                  {departmentCode}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation drawer"
                  className="rounded-lg p-1 text-on-surface-variant hover:bg-[#DBE2EF]/60 hover:text-[#112D4E] lg:hidden"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              </div>
            </div>

            {/* Active Role Context Pill */}
            <div className="px-4 pt-3.5 pb-1.5">
              <div className="flex items-center justify-between rounded-lg bg-[#DBE2EF]/60 px-3 py-1.5 font-label-sm text-label-sm">
                <span className="font-semibold uppercase tracking-wider text-[#112D4E]">
                  {getPortalSectionLabel(userRole)}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#004f53]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#71C9CE]" />
                  Active
                </span>
              </div>
            </div>

            {/* Strict Role-Isolated Navigation */}
            <nav className="space-y-1 px-3 py-2" aria-label="Workspace navigation">
              {visibleItems.map((item) => {
                const active = isItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-all duration-150",
                      active
                        ? "bg-[#112D4E] font-semibold text-white shadow-sm"
                        : "font-medium text-on-surface-variant hover:bg-[#DBE2EF]/60 hover:text-[#112D4E]"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "material-symbols-outlined text-[18px] shrink-0",
                        active ? "text-[#71C9CE]" : "text-[#3F72AF]"
                      )}
                    >
                      {item.iconName}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Institutional Status & Session Footer */}
          <div className="shrink-0 space-y-2.5 border-t border-[#DBE2EF] bg-[#F5F3F3] p-3.5">
            <div className="rounded-lg border border-[#DBE2EF] bg-surface-container-lowest p-2.5 shadow-xs">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-label-sm text-[11px] font-semibold text-[#3F72AF]">
                  Matching Engine
                </span>
                <span className="inline-flex items-center gap-1 font-label-sm text-[11px] font-semibold text-[#112D4E]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#71C9CE]" />
                  Online
                </span>
              </div>
              <p className="truncate text-[11px] text-on-surface-variant">
                Dept. of IT &amp; Computing
              </p>
            </div>

            <div className="rounded-lg border border-[#DBE2EF] bg-surface-container-lowest p-2.5 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#112D4E] text-white font-headline-sm text-xs font-bold">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[#112D4E]">{userName}</p>
                  <p className="truncate font-mono-tabular text-[10px] text-[#3F72AF]">
                    {batchLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                data-testid="sidebar-signout-btn"
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-[#DBE2EF] bg-[#F9F7F7] px-2.5 py-1.5 text-[11px] font-semibold text-[#112D4E] transition-colors hover:border-error/40 hover:bg-error-container/50 hover:text-on-error-container"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                  logout
                </span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace Container */}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-[248px]">
          {/* Desktop Top Chrome Header (>= lg) */}
          <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-[#DBE2EF] bg-[#F9F7F7]/90 backdrop-blur-xl px-8 lg:flex">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-headline-sm text-base font-semibold text-[#112D4E]">
                Dept of IT &amp; Computing
              </span>
              <span className="rounded-full border border-[#71C9CE]/50 bg-[#E3FDFD] px-2.5 py-0.5 font-label-sm text-label-sm font-semibold text-[#004f53]">
                HEC-NCEAC Verified
              </span>
              <span className="hidden xl:inline-block font-mono-tabular text-xs text-on-surface-variant truncate">
                {identifier}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DBE2EF] bg-surface-container-lowest px-3 py-1 font-label-md text-label-md font-semibold text-[#112D4E] shadow-xs">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[15px] text-[#3F72AF]"
                >
                  verified_user
                </span>
                {getRoleViewChip(userRole)}
              </span>

              <div className="flex items-center gap-2.5 pl-1">
                <div className="text-right leading-tight">
                  <div className="font-label-md text-label-md font-semibold text-[#112D4E] max-w-[200px] truncate">
                    {userName}
                  </div>
                  <div className="font-mono-tabular text-[11px] text-[#3F72AF] max-w-[200px] truncate">
                    {batchLabel}
                  </div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#112D4E] text-white font-headline-sm text-xs font-bold ring-2 ring-[#DBE2EF]">
                  {initials}
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </PortalSessionProvider>
  );
}

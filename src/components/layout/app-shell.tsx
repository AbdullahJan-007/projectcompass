"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { LogOut, PanelLeft, PanelLeftClose, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/ui/app-icon";
import { ProjectCompassLogo } from "@/components/ui/project-compass-logo";
import { PakistanClock } from "@/components/ui/pakistan-clock";
import { NotificationBell, ChangePinButton } from "@/components/layout/portal-utilities";
import { PortalSessionProvider } from "@/components/layout/portal-session-context";
import { signOutUniversitySession } from "@/actions/auth.actions";
import { clearWorkspaceStorage } from "@/lib/workspace-store";

interface NavItem {
  href: string;
  label: string;
  iconName: string;
  roles: readonly UserRole[];
}

const SIDEBAR_STORAGE_KEY = "projectcompass_sidebar_collapsed";

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
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  // Restore saved desktop sidebar preference after mount (hydration-safe)
  useEffect(() => {
    try {
      if (window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true") {
        setDesktopCollapsed(true);
      }
    } catch {
      // Ignore storage access restrictions
    }
  }, []);

  // Support Ctrl+B / Cmd+B shortcut to toggle sidebar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setDesktopCollapsed((prev) => {
          const next = !prev;
          try {
            window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
          } catch {
            // Ignore storage errors
          }
          return next;
        });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleDesktopSidebar() {
    setDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }

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
      <div className="flex min-h-screen flex-col lg:flex-row bg-[#F7F9FC] text-[#0F172A] overflow-x-hidden">
        {/* Mobile & Tablet Sticky Header (< lg) */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#E2E8F0] bg-white/90 backdrop-blur-xl px-4 lg:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle workspace navigation"
              aria-expanded={mobileOpen}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#DBE2EF] bg-surface-container-lowest text-[#112D4E] hover:bg-[#DBE2EF]/60 transition-colors shadow-2xs"
            >
              {mobileOpen ? (
                <X aria-hidden="true" className="h-[18px] w-[18px]" />
              ) : (
                <PanelLeft aria-hidden="true" className="h-[18px] w-[18px]" />
              )}
            </button>

            <Link href="/" className="flex items-center gap-2 min-w-0">
              <ProjectCompassLogo className="h-8 w-8 rounded-lg shadow-xs" />
              <div className="min-w-0">
                <span className="block truncate font-headline-sm text-sm font-bold tracking-tight text-[#112D4E]">
                  ProjectCompass
                </span>
                <span className="block truncate font-label-sm text-[10px] font-semibold uppercase tracking-wider text-[#3F72AF]">
                  {departmentCode}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#112D4E] text-white font-headline-sm text-xs font-bold ring-2 ring-[#DBE2EF]">
            {initials}
          </div>
        </header>

        {/* Mobile / Tablet Backdrop Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-[#001833]/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Collapsible 248px Sidebar (Desktop Toggleable + Mobile Slide-over Drawer) */}
        <aside
          data-collapsed={desktopCollapsed ? "true" : "false"}
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[248px] max-w-[84vw] flex-col justify-between border-r border-[#E2E8F0] bg-white transition-transform duration-200 ease-out lg:z-40 lg:w-[248px] lg:max-w-none",
            mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
            desktopCollapsed
              ? "lg:-translate-x-full lg:shadow-none"
              : "lg:translate-x-0 lg:shadow-[1px_0_0_rgba(15,23,42,0.02)]"
          )}
        >
          <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">
            {/* Brand Header with Dedicated PanelLeft Collapse Toggle */}
            <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-[#DBE2EF]/80 bg-surface-container-lowest/80 px-3.5">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 min-w-0"
              >
                <ProjectCompassLogo className="h-9 w-9 rounded-lg shadow-xs" />
                <div className="min-w-0">
                  <span className="block truncate font-headline-sm text-[15px] font-bold tracking-tight text-[#112D4E] leading-tight">
                    ProjectCompass
                  </span>
                  <span className="block truncate font-label-sm text-[10px] font-semibold uppercase tracking-wider text-[#3F72AF]">
                    Academic Capstone
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-1 shrink-0">
                {/* Desktop Collapse Sidebar Button */}
                <button
                  type="button"
                  onClick={toggleDesktopSidebar}
                  title="Hide sidebar (Ctrl+B)"
                  aria-label="Hide sidebar"
                  data-testid="sidebar-collapse-btn"
                  className="hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#43474E] hover:border-[#DBE2EF] hover:bg-white hover:text-[#112D4E] active:scale-95 transition-all"
                >
                  <PanelLeftClose aria-hidden="true" className="h-[17px] w-[17px]" />
                </button>

                {/* Mobile Close Drawer Button */}
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation drawer"
                  className="inline-flex lg:hidden h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-[#DBE2EF]/60 hover:text-[#112D4E]"
                >
                  <X aria-hidden="true" className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>

            {/* Active Role Context Pill */}
            <div className="px-3.5 pt-3.5 pb-1.5">
              <div className="flex items-center justify-between rounded-lg bg-[#DBE2EF]/65 px-3 py-1.5 font-label-sm text-label-sm">
                <span className="font-semibold uppercase tracking-wider text-[#112D4E] truncate">
                  {getPortalSectionLabel(userRole)}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono-tabular text-[10px] font-semibold text-[#004f53] shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#71C9CE]" />
                  {departmentCode}
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
                      "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-all duration-150",
                      active
                        ? "bg-gradient-to-r from-[#112D4E] to-[#1D4473] font-semibold text-white shadow-[0_2px_8px_rgba(17,45,78,0.22)]"
                        : "font-medium text-[#475569] hover:bg-[#F1F5F9] hover:text-[#112D4E]"
                    )}
                  >
                    <AppIcon
                      name={item.iconName}
                      className={cn(
                        "h-[17px] w-[17px] shrink-0",
                        active ? "text-[#71C9CE]" : "text-[#3F72AF]"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Institutional Status & Session Footer */}
          <div className="shrink-0 space-y-2.5 border-t border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
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
              <div className="mt-2.5 flex items-center gap-1.5">
                <ChangePinButton />
                <button
                  type="button"
                  onClick={handleSignOut}
                  data-testid="sidebar-signout-btn"
                  className="flex flex-1 items-center justify-center gap-1 rounded-md border border-[#DBE2EF] bg-[#F9F7F7] px-2 py-1.5 text-[11px] font-semibold text-[#112D4E] transition-colors hover:border-error/40 hover:bg-error-container/50 hover:text-on-error-container"
                >
                  <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace Container — Synchronized Padding Prevents Any Sidebar Overlap */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out",
            desktopCollapsed ? "lg:pl-0" : "lg:pl-[248px]"
          )}
        >
          {/* Desktop Top Chrome Header (>= lg) */}
          <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-[#E2E8F0] bg-white/85 backdrop-blur-xl px-6 lg:flex">
            <div className="flex items-center gap-3 min-w-0">
              {/* Show single expand button in top bar ONLY when sidebar is hidden */}
              {desktopCollapsed && (
                <>
                  <button
                    type="button"
                    onClick={toggleDesktopSidebar}
                    title="Show sidebar (Ctrl+B)"
                    aria-label="Show sidebar"
                    aria-expanded="false"
                    data-testid="desktop-sidebar-toggle-btn"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#112D4E]/20 bg-[#112D4E] text-white shadow-xs hover:bg-[#001833] transition-all active:scale-95"
                  >
                    <PanelLeft aria-hidden="true" className="h-[17px] w-[17px]" />
                  </button>

                  <Link
                    href="/"
                    className="flex items-center gap-2 pr-2 border-r border-[#DBE2EF] shrink-0"
                  >
                    <ProjectCompassLogo className="h-7 w-7 rounded-md shadow-2xs" />
                    <span className="font-headline-sm text-sm font-bold tracking-tight text-[#112D4E]">
                      ProjectCompass
                    </span>
                  </Link>
                </>
              )}

              <span className="font-headline-sm text-base font-semibold text-[#112D4E] truncate">
                Dept of IT &amp; Computing
              </span>
              <span className="rounded-full border border-[#71C9CE]/50 bg-[#E3FDFD] px-2.5 py-0.5 font-label-sm text-label-sm font-semibold text-[#004f53] shrink-0">
                HEC-NCEAC Verified
              </span>
              <span className="hidden xl:inline-block font-mono-tabular text-xs text-on-surface-variant truncate">
                {identifier}
              </span>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <PakistanClock />
              <NotificationBell />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DBE2EF] bg-surface-container-lowest px-3 py-1 font-label-md text-label-md font-semibold text-[#112D4E] shadow-xs">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-[#3F72AF]" />
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

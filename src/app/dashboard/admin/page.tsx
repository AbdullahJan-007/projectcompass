"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalSession } from "@/components/layout/portal-session-context";
import {
  updateUserRole,
  overrideSupervisorQuota,
  provisionFacultyAccount,
  toggleUserActiveStatus,
  resetAccountPin,
  assignProjectSupervisor,
} from "@/actions/admin.actions";
import {
  createArchiveRecord,
  retryArchiveEmbedding,
  deleteArchiveRecord,
} from "@/actions/archive.actions";
import {
  getAdminWorkspaceData,
  type AdminStudentRow,
  type AdminProjectRow,
  type LiveArchiveItem,
} from "@/actions/workspace.actions";
import { AppIcon } from "@/components/ui/app-icon";
import { BulkCsvImporter } from "@/components/archives/bulk-csv-importer";
import {
  buildAdminAllocationsCsv,
  buildAdminStudentsCsv,
  downloadTextFile,
} from "@/lib/export/csv-and-proposal";
import { getPakistanYear } from "@/lib/time/pakistan-time";

const IT_PROGRAMS = ["BSIT", "BSCS", "BSSE", "BSAI", "BSCY", "BSDS"] as const;
type ItProgram = (typeof IT_PROGRAMS)[number];

const DOMAIN_OPTIONS = [
  "DevTools",
  "Applied AI",
  "Cybersecurity",
  "Cloud & Distributed Systems",
  "Data Engineering",
  "Computer Vision",
  "EdTech",
  "HealthTech",
  "FinTech",
  "IoT & Embedded",
];

type AdminTab = "faculty" | "students" | "projects" | "archives" | "audit";

interface UserDirectoryRow {
  id: string;
  fullName: string;
  email: string;
  role: "STUDENT" | "SUPERVISOR" | "COORDINATOR" | "ADMIN";
  departmentCode: string;
  isActive: boolean;
}

interface SupervisorRow {
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
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
}

function getInitials(name: string): string {
  const cleaned = name.replace(/^(Dr\.|Prof\.|Engr\.)\s*/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FC";
  if (parts.length === 1) return (parts[0] ?? "FC").slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? "F"}${parts[parts.length - 1]?.[0] ?? "C"}`.toUpperCase();
}

export default function AdminDashboardPage() {
  const portalSession = usePortalSession();
  const [activeTab, setActiveTab] = useState<AdminTab>("faculty");
  const [users, setUsers] = useState<UserDirectoryRow[]>([]);
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorRow[]>([]);
  const [projects, setProjects] = useState<AdminProjectRow[]>([]);
  const [archives, setArchives] = useState<LiveArchiveItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hire Faculty form state
  const [facName, setFacName] = useState("");
  const [facEmail, setFacEmail] = useState("");
  const [facProgram, setFacProgram] = useState<ItProgram>("BSIT");
  const [facDesignation, setFacDesignation] = useState("Associate Professor");
  const [facRole, setFacRole] = useState<"SUPERVISOR" | "COORDINATOR">("SUPERVISOR");
  const [facMaxSlots, setFacMaxSlots] = useState(5);
  const [facPin, setFacPin] = useState("");
  const [showFacPin, setShowFacPin] = useState(false);
  const [facDomains, setFacDomains] = useState<string[]>(["Applied AI", "DevTools"]);
  const [isHiring, setIsHiring] = useState(false);

  // Faculty Roster Filter
  const [facultyQuery, setFacultyQuery] = useState("");
  const [facultyProgramFilter, setFacultyProgramFilter] = useState("ALL");

  // Quota Override state
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("");
  const [overrideMaxSlots, setOverrideMaxSlots] = useState(6);
  const [overrideReason, setOverrideReason] = useState("");

  // Student Explorer Filters
  const [studentQuery, setStudentQuery] = useState("");
  const [studentProgramFilter, setStudentProgramFilter] = useState("ALL");

  // Archive Ingestion State (Unified Admin Archive Tab)
  const [archTitle, setArchTitle] = useState("");
  const [archAbstract, setArchAbstract] = useState("");
  const [archYear, setArchYear] = useState(() => getPakistanYear());
  const [archProgram, setArchProgram] = useState<ItProgram>("BSIT");
  const [archDomain, setArchDomain] = useState("DevTools");
  const [archStack, setArchStack] = useState("");
  const [editingArchiveId, setEditingArchiveId] = useState<string | null>(null);
  const [manualAbstractPatch, setManualAbstractPatch] = useState("");

  // Priority 1: Admin PIN Reset & Direct Project Supervisor Assignment
  const [pinModalUser, setPinModalUser] = useState<{ id: string; fullName: string; email: string } | null>(null);
  const [newPinDraft, setNewPinDraft] = useState("");
  const [resettingPin, setResettingPin] = useState(false);
  const [assignSelections, setAssignSelections] = useState<Record<string, string>>({});
  const [assigningProjectId, setAssigningProjectId] = useState<string | null>(null);

  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function handleResetUserPin(e: React.FormEvent) {
    e.preventDefault();
    if (!pinModalUser) return;
    setResettingPin(true);
    setBanner(null);
    const res = await resetAccountPin({
      targetUserId: pinModalUser.id,
      newPin: newPinDraft.trim(),
    });
    setResettingPin(false);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error.message });
      return;
    }
    setPinModalUser(null);
    setNewPinDraft("");
    setBanner({
      type: "success",
      text: `4-digit PIN reset successfully for ${res.data.fullName}.`,
    });
    await refreshAdminData();
  }

  async function handleAssignSupervisorToProject(projectId: string) {
    const supId = assignSelections[projectId] || supervisors.find((s) => s.isActive)?.id;
    if (!supId) {
      setBanner({ type: "error", text: "Hire an active faculty supervisor first." });
      return;
    }
    setAssigningProjectId(projectId);
    setBanner(null);
    const res = await assignProjectSupervisor({
      recommendedIdeaId: projectId,
      supervisorProfileId: supId,
    });
    setAssigningProjectId(null);
    if (!res.ok) {
      setBanner({ type: "error", text: res.error.message });
      return;
    }
    setBanner({
      type: "success",
      text: `Assigned ${res.data.supervisorName} to project successfully (1 slot locked atomically).`,
    });
    await refreshAdminData();
  }

  async function refreshAdminData() {
    const data = await getAdminWorkspaceData();
    setUsers(data.users);
    setStudents(data.students);
    setSupervisors(data.supervisors);
    setProjects(data.projects);
    setArchives(data.archives);
    setAuditLogs(data.auditLogs);
    if (!selectedSupervisorId && data.supervisors[0]) {
      setSelectedSupervisorId(data.supervisors[0].id);
    }
  }

  useEffect(() => {
    refreshAdminData()
      .catch(() => {
        setBanner({
          type: "error",
          text: "Failed to load institutional governance data from PostgreSQL.",
        });
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSupervisors = useMemo(() => {
    const q = facultyQuery.trim().toLowerCase();
    return supervisors.filter((s) => {
      const matchesProg =
        facultyProgramFilter === "ALL" || s.programCode === facultyProgramFilter;
      const matchesQ =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.designation.toLowerCase().includes(q);
      return matchesProg && matchesQ;
    });
  }, [supervisors, facultyProgramFilter, facultyQuery]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return students.filter((s) => {
      const matchesProg =
        studentProgramFilter === "ALL" || s.departmentCode === studentProgramFilter;
      const matchesQuery =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.registrationNo.toLowerCase().includes(q) ||
        s.careerGoal.toLowerCase().includes(q);
      return matchesProg && matchesQuery;
    });
  }, [students, studentQuery, studentProgramFilter]);

  const totalMaxSlots = useMemo(
    () => supervisors.reduce((acc, s) => acc + s.maxSlots, 0),
    [supervisors]
  );
  const totalFilledSlots = useMemo(
    () => supervisors.reduce((acc, s) => acc + s.activeSlots, 0),
    [supervisors]
  );

  function toggleFacDomain(domain: string) {
    setFacDomains((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : prev.length < 6
          ? [...prev, domain]
          : prev
    );
  }

  async function handleHireFaculty(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);

    if (facName.trim().length < 3) {
      setBanner({ type: "error", text: "Faculty full name must be at least 3 characters." });
      return;
    }
    if (!/^\d{4}$/.test(facPin)) {
      setBanner({ type: "error", text: "Initial Portal PIN must be exactly 4 numeric digits." });
      return;
    }
    if (facDomains.length === 0) {
      setBanner({ type: "error", text: "Select at least one research domain." });
      return;
    }

    setIsHiring(true);
    const res = await provisionFacultyAccount({
      fullName: facName.trim(),
      universityEmail: facEmail.trim().toLowerCase(),
      departmentCode: facProgram,
      designation: facDesignation.trim(),
      role: facRole,
      maxSlots: facMaxSlots,
      pin: facPin.trim(),
      researchDomains: facDomains,
    });
    setIsHiring(false);

    if (!res.ok) {
      setBanner({ type: "error", text: res.error.message });
      return;
    }

    setFacName("");
    setFacEmail("");
    setFacPin("");
    setBanner({
      type: "success",
      text: `Provisioned ${res.data.role.toLowerCase()} ${res.data.fullName} (${res.data.universityEmail} · ${res.data.departmentCode}). They can now sign in at /sign-in with their assigned PIN.`,
    });
    await refreshAdminData();
  }

  async function handleQuotaOverride(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);

    if (!selectedSupervisorId) {
      setBanner({ type: "error", text: "Select a provisioned faculty supervisor first." });
      return;
    }
    if (overrideReason.trim().length < 10) {
      setBanner({ type: "error", text: "Audit reason must be at least 10 characters." });
      return;
    }

    const res = await overrideSupervisorQuota({
      supervisorProfileId: selectedSupervisorId,
      maxSlots: overrideMaxSlots,
      reason: overrideReason,
    });

    if (!res.ok) {
      setBanner({ type: "error", text: res.error.message });
      return;
    }

    setOverrideReason("");
    setBanner({
      type: "success",
      text: `Supervisor slot quota updated to ${overrideMaxSlots} and logged to AuditLog.`,
    });
    await refreshAdminData();
  }

  async function handleRoleChange(
    userId: string,
    newRole: "STUDENT" | "SUPERVISOR" | "COORDINATOR" | "ADMIN"
  ) {
    setBanner(null);
    const res = await updateUserRole({ targetUserId: userId, role: newRole });
    if (!res.ok) {
      setBanner({ type: "error", text: res.error.message });
      return;
    }
    setBanner({
      type: "success",
      text: `Updated user role to ${newRole} (recorded in AuditLog by ${portalSession.userName}).`,
    });
    await refreshAdminData();
  }

  async function handleToggleActive(userId: string, nextActive: boolean) {
    setBanner(null);
    const res = await toggleUserActiveStatus({ targetUserId: userId, isActive: nextActive });
    if (!res.ok) {
      setBanner({ type: "error", text: res.error.message });
      return;
    }
    setBanner({
      type: "success",
      text: nextActive ? "Account re-activated." : "Account deactivated.",
    });
    await refreshAdminData();
  }

  async function handleCreateArchive(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    const stack = archStack
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await createArchiveRecord({
      title: archTitle,
      abstract: archAbstract,
      academicYear: archYear,
      programCode: archProgram,
      domain: archDomain,
      techStack: stack.length > 0 ? stack : ["TypeScript"],
    });

    if (!res.ok) {
      setBanner({ type: "error", text: res.error.message });
      return;
    }

    setArchTitle("");
    setArchAbstract("");
    setArchStack("");
    setBanner({
      type: "success",
      text: `Archive record ingested (${res.data.ingestStatus}).`,
    });
    await refreshAdminData();
  }

  async function handleRetryArchive(archiveId: string) {
    setBanner(null);
    const res = await retryArchiveEmbedding({
      archiveId,
      updatedAbstract: manualAbstractPatch.trim().length >= 100 ? manualAbstractPatch : undefined,
    });
    if (!res.ok) {
      setBanner({ type: "error", text: res.error.message });
      return;
    }
    setEditingArchiveId(null);
    setManualAbstractPatch("");
    setBanner({
      type: "success",
      text: `Archive ${archiveId} re-indexed (${res.data.ingestStatus}).`,
    });
    await refreshAdminData();
  }

  async function handleDeleteArchive(archiveId: string) {
    setBanner(null);
    const res = await deleteArchiveRecord({ archiveId });
    if (!res.ok) {
      setBanner({ type: "error", text: res.error.message });
      return;
    }
    setBanner({
      type: "success",
      text: `Deleted archive record ${archiveId} and logged to AuditLog.`,
    });
    await refreshAdminData();
  }

  function handleExportAuditCsv() {
    const header = "Timestamp,Actor,Action,EntityType,EntityId,Summary\n";
    const rows = auditLogs
      .map(
        (l) =>
          `"${l.timestamp}","${l.actor.replace(/"/g, '""')}","${l.action}","${l.entityType}","${l.entityId}","${l.summary.replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ProjectCompass-Institutional-Audit.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Stitch Page Header & Action Bar */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-2">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#112D4E] text-white text-[11px] font-semibold tracking-wide uppercase shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#99F1F6] animate-pulse" />
              Admin Command Center
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-surface-container text-on-surface-variant text-[11px] font-medium">
              <AppIcon name="domain" className="text-[14px] text-[#2A609C]" />
              Department of IT &amp; Computing (All 6 Programs)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E3FDFD] text-[#004F53] border border-[#71C9CE]/50 text-[11px] font-semibold">
              HEC / NCEAC Accredited
            </span>
          </div>

          <h1 className="font-headline-md text-2xl sm:text-[28px] text-[#001833] tracking-tight font-bold">
            Central Institutional Governance &amp; Faculty Provisioning
          </h1>
          <p className="text-sm text-on-surface-variant max-w-4xl leading-relaxed">
            Authoritative administrative console for faculty onboarding, supervision quota
            governance, student cohort compliance, past FYP archives, and immutable audit records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("archives")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest border border-[#DBE2EF] text-[#112D4E] text-xs font-semibold shadow-xs hover:bg-[#DBE2EF]/50 transition-colors"
          >
            <AppIcon name="inventory_2" className="text-[18px] text-[#2A609C]" />
            <span>Manage Past FYP Archives</span>
          </button>

          <button
            type="button"
            onClick={handleExportAuditCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#112D4E] text-white text-xs font-semibold shadow-xs hover:bg-[#001833] transition-colors"
          >
            <AppIcon name="download_for_offline" className="text-[18px]" />
            <span>Export Audit Dossier</span>
          </button>
        </div>
      </header>

      {/* Stitch 4-Card Institutional KPI Strip (100% Live Counts) */}
      <section
        aria-label="Department Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] shadow-xs flex flex-col justify-between gap-2.5">
          <div className="flex items-start justify-between">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-on-surface-variant">
              Registered Students
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#DBE2EF]/60 flex items-center justify-center text-[#2A609C]">
              <AppIcon name="group" className="text-[18px]" />
            </div>
          </div>
          <div>
            <span className="font-mono-tabular text-[28px] font-bold tracking-tight text-[#001833] leading-none">
              {students.length}
            </span>
            <p className="text-xs text-on-surface-variant mt-1.5">
              Verified Student Roll Accounts
            </p>
          </div>
          <div className="h-1 w-full bg-[#DBE2EF] rounded-full overflow-hidden">
            <div className="h-full bg-[#112D4E] rounded-full w-4/5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] shadow-xs flex flex-col justify-between gap-2.5">
          <div className="flex items-start justify-between">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-on-surface-variant">
              Provisioned Faculty
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#DBE2EF]/60 flex items-center justify-center text-[#2A609C]">
              <AppIcon name="how_to_reg" className="text-[18px]" />
            </div>
          </div>
          <div>
            <span className="font-mono-tabular text-[28px] font-bold tracking-tight text-[#001833] leading-none">
              {supervisors.length}
            </span>
            <p className="text-xs text-on-surface-variant mt-1.5">
              {totalFilledSlots} / {totalMaxSlots} Supervision Slots Filled
            </p>
          </div>
          <div className="h-1 w-full bg-[#DBE2EF] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2A609C] rounded-full"
              style={{
                width: `${Math.min(100, Math.round((totalFilledSlots / Math.max(1, totalMaxSlots)) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] shadow-xs flex flex-col justify-between gap-2.5">
          <div className="flex items-start justify-between">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-on-surface-variant">
              Active FYP Proposals
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#DBE2EF]/60 flex items-center justify-center text-[#2A609C]">
              <AppIcon name="description" className="text-[18px]" />
            </div>
          </div>
          <div>
            <span className="font-mono-tabular text-[28px] font-bold tracking-tight text-[#001833] leading-none">
              {projects.length}
            </span>
            <p className="text-xs text-on-surface-variant mt-1.5">
              {archives.length} Historical Archives Indexed
            </p>
          </div>
          <div className="h-1 w-full bg-[#DBE2EF] rounded-full overflow-hidden">
            <div className="h-full bg-[#46A1A6] rounded-full w-3/4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] shadow-xs flex flex-col justify-between gap-2.5">
          <div className="flex items-start justify-between">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-on-surface-variant">
              Governance Audit Events
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#DBE2EF]/60 flex items-center justify-center text-[#2A609C]">
              <AppIcon name="verified" className="text-[18px]" />
            </div>
          </div>
          <div>
            <span className="font-mono-tabular text-[28px] font-bold tracking-tight text-[#001833] leading-none">
              {auditLogs.length}
            </span>
            <p className="text-xs text-on-surface-variant mt-1.5">
              Immutable Institutional Ledger
            </p>
          </div>
          <div className="h-1 w-full bg-[#DBE2EF] rounded-full overflow-hidden">
            <div className="h-full bg-[#71C9CE] rounded-full w-full" />
          </div>
        </div>
      </section>

      {banner && (
        <div
          role="alert"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-medium ${
            banner.type === "success"
              ? "border-[#71C9CE]/60 bg-[#E3FDFD] text-[#004F53]"
              : "border-error/30 bg-error-container/60 text-on-error-container"
          }`}
        >
          <AppIcon name={banner.type === "success" ? "check_circle" : "error"} className="text-[18px] shrink-0" />
          <span>{banner.text}</span>
        </div>
      )}

      {/* Stitch Command Center Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Admin Command Sections"
        className="flex items-center gap-1.5 p-1.5 rounded-xl bg-surface-container-low border border-[#DBE2EF] overflow-x-auto"
      >
        {(
          [
            {
              key: "faculty",
              label: "Hire & Manage Faculty",
              icon: "person_add",
              count: supervisors.length,
            },
            {
              key: "students",
              label: "Student Data",
              icon: "school",
              count: students.length,
            },
            {
              key: "projects",
              label: "Projects",
              icon: "folder_special",
              count: projects.length,
            },
            {
              key: "archives",
              label: "Past FYP Archives",
              icon: "inventory_2",
              count: archives.length,
            },
            {
              key: "audit",
              label: "Roles & Audit Logs",
              icon: "receipt_long",
              count: auditLogs.length,
            },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-[#112D4E] text-white shadow-xs"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-[#112D4E]"
              }`}
            >
              <AppIcon name={tab.icon} className="text-[17px]" />
              <span>{tab.label}</span>
              <span
                className={`font-mono-tabular px-2 py-0.5 rounded-full text-[11px] ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-surface-container-high text-on-surface"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-52 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* TAB 1: HIRE & MANAGE FACULTY */}
          {activeTab === "faculty" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 5 Cols: Provision Faculty Form */}
              <section className="lg:col-span-5 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#DBE2EF]/70">
                  <div>
                    <h2 className="font-title-md text-lg font-bold text-[#112D4E]">
                      Provision Faculty Supervisor
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      Issue statutory supervision or coordinator credentials
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#DBE2EF]/70 text-[#112D4E] text-[11px] font-semibold">
                    <AppIcon name="sync" className="text-[14px]" />
                    Directory Sync
                  </span>
                </div>

                <form onSubmit={handleHireFaculty} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#112D4E]">
                      Full Name &amp; Academic Honorific
                    </label>
                    <Input
                      placeholder="e.g., Dr. Naveed Akhtar"
                      value={facName}
                      onChange={(e) => setFacName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#112D4E]">
                      Official Institutional Email
                    </label>
                    <Input
                      type="email"
                      placeholder="naveed.akhtar@university.edu"
                      value={facEmail}
                      onChange={(e) => setFacEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#112D4E]">
                        IT Department Program
                      </label>
                      <Select
                        aria-label="IT Department Program"
                        value={facProgram}
                        onChange={(e) => setFacProgram(e.target.value as ItProgram)}
                      >
                        {IT_PROGRAMS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#112D4E]">Portal Role</label>
                      <Select
                        aria-label="Faculty Portal Role"
                        value={facRole}
                        onChange={(e) =>
                          setFacRole(e.target.value as "SUPERVISOR" | "COORDINATOR")
                        }
                      >
                        <option value="SUPERVISOR">SUPERVISOR</option>
                        <option value="COORDINATOR">COORDINATOR</option>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#112D4E]">
                      Academic Designation
                    </label>
                    <Input
                      value={facDesignation}
                      onChange={(e) => setFacDesignation(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-surface-container-low border border-[#DBE2EF]/70">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#112D4E]">
                        Capstone Slots
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={15}
                        value={facMaxSlots}
                        onChange={(e) => setFacMaxSlots(Number(e.target.value) || 5)}
                        className="font-mono-tabular bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#112D4E]">
                        Initial 4-Digit PIN
                      </label>
                      <div className="relative flex items-center">
                        <Input
                          type={showFacPin ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="••••"
                          value={facPin}
                          onChange={(e) =>
                            setFacPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                          }
                          className="font-mono-tabular tracking-widest bg-white pr-8"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowFacPin((prev) => !prev)}
                          aria-label="Toggle Faculty PIN visibility"
                          className="absolute right-2 text-on-surface-variant hover:text-[#112D4E]"
                        >
                          <AppIcon name={showFacPin ? "visibility_off" : "visibility"} className="text-[16px]" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-[#112D4E]">Research Domain Tags</label>
                      <span className="text-on-surface-variant">{facDomains.length}/6</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DOMAIN_OPTIONS.map((dom) => {
                        const selected = facDomains.includes(dom);
                        return (
                          <button
                            key={dom}
                            type="button"
                            onClick={() => toggleFacDomain(dom)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                              selected
                                ? "bg-[#112D4E] text-white"
                                : "bg-surface-container text-on-surface hover:bg-[#DBE2EF]/60"
                            }`}
                          >
                            {dom}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isHiring}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#112D4E] hover:bg-[#001833] disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <span>
                      {isHiring
                        ? "Provisioning Faculty Account..."
                        : "Hire & Provision Faculty Supervisor"}
                    </span>
                    <AppIcon name="arrow_forward" className="text-[18px]" />
                  </button>
                </form>
              </section>

              {/* Right 7 Cols: Active Faculty Roster + Slot Quota Override */}
              <section className="lg:col-span-7 space-y-6">
                {/* Faculty Roster Card */}
                <div className="rounded-xl bg-surface-container-lowest border border-[#DBE2EF] p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DBE2EF]/70">
                    <div>
                      <h2 className="font-title-md text-lg font-bold text-[#112D4E]">
                        Department Faculty Roster
                      </h2>
                      <p className="text-xs text-on-surface-variant">
                        {supervisors.length} Provisioned Supervisors · Real-time quota saturation
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={facultyQuery}
                        onChange={(e) => setFacultyQuery(e.target.value)}
                        placeholder="Filter faculty..."
                        aria-label="Filter faculty roster"
                        className="h-9 px-3 rounded-lg bg-[#F9F7F7] border border-[#DBE2EF] text-xs focus:outline-none w-36 sm:w-44"
                      />
                      <Select
                        aria-label="Filter Roster Program"
                        value={facultyProgramFilter}
                        onChange={(e) => setFacultyProgramFilter(e.target.value)}
                        className="w-44"
                      >
                        <option value="ALL">All Programs</option>
                        {IT_PROGRAMS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {filteredSupervisors.length === 0 ? (
                    <div className="p-6 text-center text-xs text-on-surface-variant rounded-lg bg-[#F9F7F7]">
                      No faculty supervisors match this filter.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {filteredSupervisors.map((s) => {
                        const isFull = s.activeSlots >= s.maxSlots;
                        return (
                          <div
                            key={s.id}
                            className="p-3 rounded-lg bg-[#F9F7F7] border border-[#DBE2EF]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-[#DBE2EF] text-[#112D4E] font-headline-sm text-xs font-bold flex items-center justify-center shrink-0">
                                {getInitials(s.fullName)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-[#112D4E]">
                                    {s.fullName}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest border border-[#DBE2EF] text-[#2A609C] text-[11px] font-semibold">
                                    {s.programCode}
                                  </span>
                                  {!s.isActive && (
                                    <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container text-[10px] font-bold">
                                      INACTIVE
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-on-surface-variant truncate">
                                  {s.designation} · {s.email}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                              <span
                                className={`font-mono-tabular px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  isFull
                                    ? "bg-error-container text-on-error-container"
                                    : "bg-[#E3FDFD] text-[#004F53] border border-[#71C9CE]/50"
                                }`}
                              >
                                {s.activeSlots} / {s.maxSlots} {isFull ? "Full" : "Filled"}
                              </span>

                              <Button
                                size="sm"
                                variant={s.isActive ? "outline" : "secondary"}
                                onClick={() => handleToggleActive(s.userId, !s.isActive)}
                              >
                                {s.isActive ? "Deactivate" : "Activate"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Slot Quota Override Governance Card */}
                <div className="rounded-xl bg-surface-container-lowest border border-[#DBE2EF] border-l-4 border-l-[#112D4E] p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AppIcon name="gavel" className="text-[#112D4E] text-[22px]" />
                      <h3 className="font-title-md text-base font-bold text-[#112D4E]">
                        Slot Quota Override Governance
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#DBE2EF]/70 text-[#112D4E] text-[11px] font-semibold">
                      Statutory Override Authority
                    </span>
                  </div>

                  <form onSubmit={handleQuotaOverride} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#112D4E]">
                          Select Faculty Member
                        </label>
                        <Select
                          aria-label="Select Faculty Member for Override"
                          value={selectedSupervisorId}
                          onChange={(e) => setSelectedSupervisorId(e.target.value)}
                        >
                          {supervisors.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.fullName} ({s.programCode} · {s.activeSlots}/{s.maxSlots})
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#112D4E]">
                          New Max Slot Quota
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={overrideMaxSlots}
                          onChange={(e) => setOverrideMaxSlots(Number(e.target.value))}
                          className="font-mono-tabular"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#112D4E] flex items-center justify-between">
                        <span>Mandatory Institutional Audit Reason</span>
                        <span className="text-error text-[11px]">* Min 10 chars</span>
                      </label>
                      <Textarea
                        rows={2}
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Enter Academic Council resolution or co-supervision justification..."
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#112D4E] hover:bg-[#001833] text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        <AppIcon name="verified_user" className="text-[16px]" />
                        <span>Commit Quota Override &amp; Record</span>
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: STUDENT DATA EXPLORER */}
          {activeTab === "students" && (
            <section className="rounded-xl bg-surface-container-lowest border border-[#DBE2EF] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#DBE2EF]/70">
                <div>
                  <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
                    Registered Student Cohort Registry
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Live database directory of student accounts, batches, skill readiness, and
                    generated proposals.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    placeholder="Search name, Reg No, goal..."
                    className="w-full sm:w-56 h-9 text-xs"
                  />
                  <Select
                    aria-label="Filter Student Program"
                    value={studentProgramFilter}
                    onChange={(e) => setStudentProgramFilter(e.target.value)}
                    className="w-full sm:w-44"
                  >
                    <option value="ALL">All Programs</option>
                    {IT_PROGRAMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={filteredStudents.length === 0}
                    onClick={() =>
                      downloadTextFile(
                        `projectcompass-students-${getPakistanYear()}.csv`,
                        buildAdminStudentsCsv(filteredStudents),
                        "text/csv;charset=utf-8"
                      )
                    }
                    className="h-9 text-xs shrink-0"
                  >
                    <AppIcon name="download_for_offline" className="text-[15px] mr-1" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <p className="py-8 text-center text-xs text-on-surface-variant">
                  No matching students found in the database.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant uppercase tracking-wider text-[11px]">
                        <th className="p-3 rounded-l-md">Roll / Reg No</th>
                        <th className="p-3">Candidate Name</th>
                        <th className="p-3">Track &amp; Batch</th>
                        <th className="p-3">Profile Readiness</th>
                        <th className="p-3">Career Goal</th>
                        <th className="p-3 rounded-r-md text-right">Proposals</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DBE2EF]/60">
                      {filteredStudents.map((stu) => (
                        <tr key={stu.userId} className="hover:bg-[#F9F7F7] transition-colors">
                          <td className="p-3 font-mono-tabular font-bold text-[#112D4E]">
                            {stu.registrationNo}
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-on-surface">{stu.fullName}</p>
                            <p className="text-[11px] text-on-surface-variant">{stu.email}</p>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-[#DBE2EF]/60 text-[#112D4E] font-semibold">
                              {stu.departmentCode}
                            </span>
                            <span className="ml-1.5 text-on-surface-variant">{stu.batchLabel}</span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                stu.profileStatus === "READY"
                                  ? "bg-[#E3FDFD] text-[#004F53]"
                                  : "bg-surface-container text-on-surface-variant"
                              }`}
                            >
                              {stu.profileStatus} ({stu.skillsCount} skills)
                            </span>
                          </td>
                          <td className="p-3 text-on-surface-variant max-w-[220px] truncate">
                            {stu.careerGoal}
                          </td>
                          <td className="p-3 text-right font-mono-tabular font-bold text-[#112D4E]">
                            {stu.ideasCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* TAB 3: PROJECTS */}
          {activeTab === "projects" && (
            <section className="rounded-xl bg-surface-container-lowest border border-[#DBE2EF] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#DBE2EF]/70">
                <div>
                  <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
                    Capstone Project Repository &amp; Feasibility Scoring
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Live oversight of generated student proposals, feasibility scores, and direct
                    faculty supervisor assignment.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={projects.length === 0}
                  onClick={() =>
                    downloadTextFile(
                      `projectcompass-allocations-${getPakistanYear()}.csv`,
                      buildAdminAllocationsCsv(projects),
                      "text/csv;charset=utf-8"
                    )
                  }
                  className="h-9 text-xs"
                >
                  <AppIcon name="download_for_offline" className="text-[15px] mr-1" />
                  Export Allocation Matrix (CSV)
                </Button>
              </div>

              {projects.length === 0 ? (
                <p className="py-8 text-center text-xs text-on-surface-variant">
                  No student FYP proposals have been generated yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-4 rounded-xl bg-[#F9F7F7] border border-[#DBE2EF] flex flex-col justify-between gap-3 hover:shadow-xs transition-shadow"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#DBE2EF] text-[#112D4E] text-[11px] font-semibold">
                            {proj.departmentCode} · {proj.track}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#E3FDFD] text-[#004F53] font-mono-tabular text-[11px] font-bold">
                            Score {proj.feasibilityScore}/100
                          </span>
                        </div>
                        <h3 className="font-title-md text-sm font-bold text-[#112D4E] leading-snug">
                          {proj.title}
                        </h3>
                        <p className="text-xs text-on-surface-variant">
                          Student: <strong>{proj.studentName}</strong> ({proj.studentRegNo})
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-[#DBE2EF] space-y-2 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[#112D4E] font-medium truncate">
                            {proj.supervisorName
                              ? `Supervisor: ${proj.supervisorName}`
                              : "Awaiting Supervisor Lock"}
                          </span>
                          <span className="font-semibold text-[#2A609C] shrink-0">{proj.status}</span>
                        </div>
                        {supervisors.filter((s) => s.isActive).length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Select
                              aria-label={`Assign supervisor for ${proj.title}`}
                              value={
                                assignSelections[proj.id] ??
                                supervisors.find((s) => s.isActive)?.id ??
                                ""
                              }
                              onChange={(e) =>
                                setAssignSelections((prev) => ({
                                  ...prev,
                                  [proj.id]: e.target.value,
                                }))
                              }
                              className="h-8 text-[11px] flex-1"
                            >
                              {supervisors
                                .filter((s) => s.isActive)
                                .map((sup) => (
                                  <option key={sup.id} value={sup.id}>
                                    {sup.fullName} ({sup.activeSlots}/{sup.maxSlots})
                                  </option>
                                ))}
                            </Select>
                            <Button
                              type="button"
                              size="sm"
                              disabled={assigningProjectId === proj.id}
                              onClick={() => handleAssignSupervisorToProject(proj.id)}
                              className="h-8 px-2.5 text-[11px] shrink-0"
                            >
                              {assigningProjectId === proj.id ? "..." : "Assign"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB 4: UNIFIED PAST FYP ARCHIVES */}
          {activeTab === "archives" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <section className="lg:col-span-5 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="pb-3 border-b border-[#DBE2EF]/70">
                  <h2 className="font-title-md text-lg font-bold text-[#112D4E]">
                    Ingest Past FYP Archive Record
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Indexes 1536-dim pgvector embeddings for semantic duplicate verification.
                  </p>
                </div>

                <BulkCsvImporter
                  onImported={() => {
                    void refreshAdminData();
                  }}
                />

                <form onSubmit={handleCreateArchive} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#112D4E]">Project Title</label>
                    <Input
                      value={archTitle}
                      onChange={(e) => setArchTitle(e.target.value)}
                      placeholder="e.g., Automated Kubernetes Pod Right-Sizing Controller"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#112D4E]">Academic Year</label>
                      <Input
                        type="number"
                        min={2010}
                        max={2035}
                        value={archYear}
                        onChange={(e) => setArchYear(Number(e.target.value) || getPakistanYear())}
                        className="font-mono-tabular"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#112D4E]">Degree Program</label>
                      <Select
                        aria-label="Archive Degree Program"
                        value={archProgram}
                        onChange={(e) => setArchProgram(e.target.value as ItProgram)}
                      >
                        {IT_PROGRAMS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#112D4E]">Domain</label>
                    <Select
                      aria-label="Archive Domain"
                      value={archDomain}
                      onChange={(e) => setArchDomain(e.target.value)}
                    >
                      {DOMAIN_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#112D4E]">
                      Tech Stack (Comma-Separated)
                    </label>
                    <Input
                      value={archStack}
                      onChange={(e) => setArchStack(e.target.value)}
                      placeholder="Next.js, TypeScript, PostgreSQL"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#112D4E]">
                      Abstract (&gt;= 100 chars for READY embedding)
                    </label>
                    <Textarea
                      rows={4}
                      value={archAbstract}
                      onChange={(e) => setArchAbstract(e.target.value)}
                      placeholder="Paste project abstract..."
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-10 rounded-lg bg-[#112D4E] hover:bg-[#001833] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <AppIcon name="cloud_upload" className="text-[18px]" />
                    <span>Ingest &amp; Index Archive</span>
                  </button>
                </form>
              </section>

              <section className="lg:col-span-7 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="pb-3 border-b border-[#DBE2EF]/70">
                  <h2 className="font-title-md text-lg font-bold text-[#112D4E]">
                    Historical FYP Archive Ledger ({archives.length})
                  </h2>
                </div>

                {archives.length === 0 ? (
                  <p className="py-8 text-center text-xs text-on-surface-variant">
                    No historical archives indexed yet.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                    {archives.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-[#F9F7F7] border border-[#DBE2EF] space-y-2"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono-tabular text-xs font-bold text-[#112D4E]">
                                {item.programCode} · {item.academicYear}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-[#DBE2EF]/70 text-[#112D4E] text-[11px] font-medium">
                                {item.domain}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.ingestStatus === "READY"
                                    ? "bg-[#E3FDFD] text-[#004F53]"
                                    : "bg-[#FEF3C7] text-[#92400E]"
                                }`}
                              >
                                {item.ingestStatus}
                              </span>
                            </div>
                            <h3 className="mt-1 text-sm font-bold text-[#112D4E]">{item.title}</h3>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {item.ingestStatus !== "READY" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingArchiveId(item.id);
                                  setManualAbstractPatch(item.abstract);
                                }}
                              >
                                Fix &amp; Retry
                              </Button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteArchive(item.id)}
                              aria-label={`Delete ${item.title}`}
                              className="p-1.5 rounded text-on-surface-variant hover:text-error hover:bg-error-container/40"
                            >
                              <AppIcon name="delete" className="text-[18px]" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          {item.abstract}
                        </p>

                        {editingArchiveId === item.id && (
                          <div className="p-3 rounded-lg bg-white border border-[#DBE2EF] space-y-2">
                            <Textarea
                              value={manualAbstractPatch}
                              onChange={(e) => setManualAbstractPatch(e.target.value)}
                              placeholder="Enter >= 100 character abstract..."
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingArchiveId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                disabled={manualAbstractPatch.trim().length < 100}
                                onClick={() => handleRetryArchive(item.id)}
                              >
                                Save &amp; Re-Index
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 5: ROLES & AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Role Governance */}
              <section className="lg:col-span-6 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="pb-3 border-b border-[#DBE2EF]/70">
                  <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
                    Institutional Role Directory
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Last-Admin protection blocks demoting or deactivating the final Admin account.
                  </p>
                </div>

                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-[#DBE2EF] bg-[#F9F7F7] p-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[#112D4E] truncate">{u.fullName}</p>
                        <p className="text-on-surface-variant truncate">
                          {u.email} · {u.departmentCode}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          aria-label={`Role for ${u.fullName}`}
                          value={u.role}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value as UserDirectoryRow["role"])
                          }
                          className="w-36"
                        >
                          <option value="STUDENT">STUDENT</option>
                          <option value="SUPERVISOR">SUPERVISOR</option>
                          <option value="COORDINATOR">COORDINATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPinModalUser({ id: u.id, fullName: u.fullName, email: u.email });
                            setNewPinDraft("");
                          }}
                          className="h-9 px-2.5 text-[11px]"
                        >
                          Reset PIN
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Audit Trail Table */}
              <section className="lg:col-span-6 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#DBE2EF]/70">
                  <div>
                    <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
                      Institutional Governance Audit Trail
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      Recorded role updates, faculty onboarding, and quota overrides.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#E3FDFD] text-[#004F53] text-[11px] font-semibold">
                    <AppIcon name="lock" className="text-[14px]" />
                    Verified
                  </span>
                </div>

                {auditLogs.length === 0 ? (
                  <p className="py-8 text-center text-xs text-on-surface-variant">
                    No governance audit events recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg bg-[#F9F7F7] border border-[#DBE2EF] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#DBE2EF] text-[#112D4E] font-mono-tabular text-[11px] font-bold">
                            {log.action}
                          </span>
                          <span className="font-mono-tabular text-[11px] text-on-surface-variant">
                            {log.timestamp}
                          </span>
                        </div>
                        <p className="text-on-surface font-medium">{log.summary}</p>
                        <p className="text-[11px] text-on-surface-variant">Actor: {log.actor}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}

      {/* Admin PIN Reset Modal */}
      {pinModalUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#001833]/50 backdrop-blur-[2px] p-4"
          onClick={() => setPinModalUser(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#DBE2EF] bg-white p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[#DBE2EF] pb-3">
              <h3 className="font-headline-sm text-base font-bold text-[#112D4E]">
                Reset 4-Digit Portal PIN
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {pinModalUser.fullName} ({pinModalUser.email})
              </p>
            </div>
            <form onSubmit={handleResetUserPin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#112D4E] mb-1">
                  New 4-Digit Numeric PIN
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  value={newPinDraft}
                  onChange={(e) => setNewPinDraft(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="e.g., 4829"
                  className="font-mono-tabular tracking-[0.35em] text-center font-bold"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setPinModalUser(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={resettingPin || newPinDraft.length !== 4}
                >
                  {resettingPin ? "Resetting..." : "Confirm PIN Reset"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

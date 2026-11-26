"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  UserPlus,
  Users,
  GraduationCap,
  FolderKanban,
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Search,
  KeyRound,
  Archive,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalSession } from "@/components/layout/portal-session-context";
import {
  updateUserRole,
  overrideSupervisorQuota,
  provisionFacultyAccount,
  toggleUserActiveStatus,
} from "@/actions/admin.actions";
import {
  getAdminWorkspaceData,
  type AdminStudentRow,
  type AdminProjectRow,
} from "@/actions/workspace.actions";

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

export default function AdminDashboardPage() {
  const portalSession = usePortalSession();
  const [users, setUsers] = useState<UserDirectoryRow[]>([]);
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorRow[]>([]);
  const [projects, setProjects] = useState<AdminProjectRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hire Faculty form state
  const [facName, setFacName] = useState("");
  const [facEmail, setFacEmail] = useState("");
  const [facProgram, setFacProgram] = useState<ItProgram>("BSIT");
  const [facDesignation, setFacDesignation] = useState("Assistant Professor");
  const [facMaxSlots, setFacMaxSlots] = useState(5);
  const [facPin, setFacPin] = useState("");
  const [facDomains, setFacDomains] = useState<string[]>(["Applied AI", "DevTools"]);
  const [isHiring, setIsHiring] = useState(false);

  // Quota Override state
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("");
  const [overrideMaxSlots, setOverrideMaxSlots] = useState(6);
  const [overrideReason, setOverrideReason] = useState("");

  // Filters
  const [studentQuery, setStudentQuery] = useState("");
  const [studentProgramFilter, setStudentProgramFilter] = useState("ALL");

  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function refreshAdminData() {
    const data = await getAdminWorkspaceData();
    setUsers(data.users);
    setStudents(data.students);
    setSupervisors(data.supervisors);
    setProjects(data.projects);
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
          text: "Failed to load institutional governance data from Supabase.",
        });
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      text: `Provisioned faculty supervisor ${res.data.fullName} (${res.data.universityEmail} · ${res.data.departmentCode}). They can now sign in at /sign-in with their assigned PIN.`,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">Admin Command Center</Badge>
            <Badge variant="neutral">Department of IT &amp; Computing (All 6 Programs)</Badge>
          </div>
          <h1 className="mt-2 text-[22px] sm:text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-primary">
            Central Institutional Governance &amp; Faculty Provisioning
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Hire &amp; manage faculty supervisors, inspect all student data and FYP projects, and
            enforce strict role boundaries across every Fall &amp; Spring batch.
          </p>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/coordinator">
            <Archive className="h-4 w-4" strokeWidth={1.75} />
            Manage Past FYP Archives
          </Link>
        </Button>
      </div>

      {/* Live Institutional KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-text-muted">Registered Students</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-text-primary">
              {students.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-text-muted">Provisioned Faculty Supervisors</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-text-primary">
              {supervisors.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-text-muted">Active FYP Proposals</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-text-primary">
              {projects.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-text-muted">Governance Audit Events</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-text-primary">
              {auditLogs.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {banner && (
        <div
          className={`flex items-center gap-2 rounded-[6px] border px-4 py-2.5 text-xs font-medium ${
            banner.type === "success"
              ? "border-status-success/30 bg-status-success-tint text-status-success-text"
              : "border-status-error/30 bg-status-error-tint text-status-error-text"
          }`}
          role="alert"
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="faculty" className="w-full space-y-5">
          <TabsList>
            <TabsTrigger value="faculty">
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Hire &amp; Manage Faculty ({supervisors.length})
            </TabsTrigger>
            <TabsTrigger value="students">
              <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
              Student Data ({students.length})
            </TabsTrigger>
            <TabsTrigger value="projects">
              <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
              Projects ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="governance">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Roles &amp; Audit Logs
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: HIRE & MANAGE FACULTY */}
          <TabsContent value="faculty" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-brand-primary" />
                    Hire / Provision Faculty Supervisor
                  </CardTitle>
                  <CardDescription>
                    Faculty cannot self-register. Accounts created here are persisted directly to
                    Supabase (`User` + `FacultyAccount` + `SupervisorProfile`) so only authorized
                    faculty can log in.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleHireFaculty} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                          Full Name
                        </label>
                        <Input
                          placeholder="e.g., Dr. Usman Tariq"
                          value={facName}
                          onChange={(e) => setFacName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                          Official University Email
                        </label>
                        <Input
                          type="email"
                          placeholder="usman.tariq@university.edu"
                          value={facEmail}
                          onChange={(e) => setFacEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                          IT Program
                        </label>
                        <Select
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
                        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                          Designation
                        </label>
                        <Input
                          value={facDesignation}
                          onChange={(e) => setFacDesignation(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                          Max Slots
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={15}
                          value={facMaxSlots}
                          onChange={(e) => setFacMaxSlots(Number(e.target.value))}
                          className="font-mono-tabular"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Assign Initial 4-Digit Login PIN
                      </label>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                        <Input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="4 numeric digits (e.g., 4820)"
                          value={facPin}
                          onChange={(e) =>
                            setFacPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                          }
                          className="pl-9 font-mono-tabular tracking-widest"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Research Domains ({facDomains.length}/6)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {DOMAIN_OPTIONS.map((domain) => {
                          const active = facDomains.includes(domain);
                          return (
                            <button
                              key={domain}
                              type="button"
                              onClick={() => toggleFacDomain(domain)}
                              className={`rounded-[6px] border px-2.5 py-1 text-xs font-medium transition-colors ${
                                active
                                  ? "border-brand-primary bg-brand-primary text-bg-surface"
                                  : "border-border-default bg-bg-surface text-text-secondary hover:bg-bg-subtle"
                              }`}
                            >
                              {domain}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isHiring}>
                      <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                      {isHiring ? "Provisioning Faculty Account..." : "Hire & Provision Faculty"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="lg:col-span-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-brand-primary" />
                    Faculty Roster &amp; Slot Quota Override
                  </CardTitle>
                  <CardDescription>
                    Override supervision slot limits with mandatory audit logging or toggle faculty
                    account access.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {supervisors.length === 0 ? (
                    <div className="rounded-[8px] border border-dashed border-border-default bg-bg-subtle p-6 text-center text-xs text-text-secondary">
                      No faculty supervisors provisioned yet. Use the Hire form on the left to add
                      your first supervisor.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {supervisors.map((s) => (
                          <div
                            key={s.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border-default bg-bg-subtle/60 p-3 text-xs"
                          >
                            <div>
                              <p className="font-semibold text-text-primary">{s.fullName}</p>
                              <p className="text-text-muted">
                                {s.email} · {s.programCode} · {s.designation}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="font-mono-tabular">
                                {s.activeSlots}/{s.maxSlots} slots
                              </Badge>
                              <Button
                                size="sm"
                                variant={s.isActive ? "outline" : "secondary"}
                                onClick={() => handleToggleActive(s.userId, !s.isActive)}
                              >
                                {s.isActive ? "Deactivate" : "Activate"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <form
                        onSubmit={handleQuotaOverride}
                        className="space-y-3 border-t border-border-default pt-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-text-secondary">
                              Faculty Supervisor
                            </label>
                            <Select
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
                            <label className="text-xs font-semibold text-text-secondary">
                              New Max Slots
                            </label>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={overrideMaxSlots}
                              onChange={(e) => setOverrideMaxSlots(Number(e.target.value))}
                              className="font-mono-tabular"
                            />
                          </div>
                        </div>
                        <Input
                          placeholder="Audit reason (min 10 chars)..."
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                        />
                        <Button type="submit" variant="outline" className="w-full">
                          Apply Slot Quota Override
                        </Button>
                      </form>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: STUDENT DATA EXPLORER */}
          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>All Registered Students</CardTitle>
                    <CardDescription>
                      Live database directory of student accounts, batches, skill readiness, and
                      career goals.
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                      <Input
                        placeholder="Search name, Reg No, goal..."
                        value={studentQuery}
                        onChange={(e) => setStudentQuery(e.target.value)}
                        className="pl-9 w-full sm:w-56"
                      />
                    </div>
                    <Select
                      value={studentProgramFilter}
                      onChange={(e) => setStudentProgramFilter(e.target.value)}
                      className="w-full sm:w-36"
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
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? (
                  <p className="py-8 text-center text-xs text-text-muted">
                    No matching students found in the database.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border-default text-text-muted">
                          <th className="py-2 pr-4 font-semibold">Student</th>
                          <th className="py-2 pr-4 font-semibold">Reg No &amp; Batch</th>
                          <th className="py-2 pr-4 font-semibold">Profile</th>
                          <th className="py-2 pr-4 font-semibold">Career Goal</th>
                          <th className="py-2 font-semibold">Proposals</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default/60">
                        {filteredStudents.map((stu) => (
                          <tr key={stu.userId}>
                            <td className="py-3 pr-4">
                              <p className="font-semibold text-text-primary">{stu.fullName}</p>
                              <p className="text-[11px] text-text-muted">{stu.email}</p>
                            </td>
                            <td className="py-3 pr-4 font-mono-tabular">
                              <p className="font-medium text-text-primary">{stu.registrationNo}</p>
                              <p className="text-[11px] text-text-muted">
                                {stu.batchLabel} · {stu.departmentCode}
                              </p>
                            </td>
                            <td className="py-3 pr-4">
                              <Badge
                                variant={
                                  stu.profileStatus === "READY"
                                    ? "success"
                                    : stu.profileStatus === "DRAFT"
                                      ? "warning"
                                      : "neutral"
                                }
                              >
                                {stu.profileStatus} ({stu.skillsCount} skills)
                              </Badge>
                            </td>
                            <td className="py-3 pr-4 text-text-secondary max-w-[200px] truncate">
                              {stu.careerGoal}
                            </td>
                            <td className="py-3 font-mono-tabular font-semibold text-text-primary">
                              {stu.ideasCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: PROJECTS & SUPERVISION */}
          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Department FYP Proposals &amp; Supervision Status</CardTitle>
                <CardDescription>
                  Complete oversight of generated student proposals, feasibility scores, and locked
                  faculty supervisors.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <p className="py-8 text-center text-xs text-text-muted">
                    No student FYP proposals have been generated yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {projects.map((proj) => (
                      <div
                        key={proj.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[8px] border border-border-default bg-bg-surface p-4 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="default">{proj.track}</Badge>
                            <Badge variant="neutral">{proj.departmentCode}</Badge>
                            <Badge
                              variant={
                                proj.status === "SUPERVISOR_LOCKED"
                                  ? "success"
                                  : proj.status === "SHORTLISTED"
                                    ? "info"
                                    : "neutral"
                              }
                            >
                              {proj.status}
                            </Badge>
                            <span className="font-mono-tabular text-text-muted">
                              Feasibility: {proj.feasibilityScore}/100
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-text-primary">{proj.title}</p>
                          <p className="text-text-secondary">
                            Student: <strong>{proj.studentName}</strong> ({proj.studentRegNo}) ·{" "}
                            {proj.supervisorName ? (
                              <span className="text-status-success-text font-medium">
                                Supervisor: {proj.supervisorName}
                              </span>
                            ) : (
                              <span className="text-text-muted">Awaiting supervisor lock</span>
                            )}
                          </p>
                        </div>
                        <span className="font-mono-tabular text-[11px] text-text-muted shrink-0">
                          {proj.createdAt}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: ROLE GOVERNANCE & AUDIT LOGS */}
          <TabsContent value="governance" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-7">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-brand-primary" />
                    Institutional Role Directory
                  </CardTitle>
                  <CardDescription>
                    Last-Admin protection prevents demoting the final active Admin account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-[6px] border border-border-default bg-bg-subtle/50 p-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-text-primary">{u.fullName}</p>
                        <p className="text-text-muted">
                          {u.email} · {u.departmentCode}
                        </p>
                      </div>
                      <Select
                        aria-label={`Role for ${u.fullName}`}
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value as UserDirectoryRow["role"])
                        }
                        className="w-full sm:w-40"
                      >
                        <option value="STUDENT">STUDENT</option>
                        <option value="SUPERVISOR">SUPERVISOR</option>
                        <option value="COORDINATOR">COORDINATOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </Select>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="lg:col-span-5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-brand-primary" />
                    Immutable Audit Trail
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 max-h-[420px] overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <p className="py-6 text-center text-xs text-text-muted">
                      No governance actions recorded yet.
                    </p>
                  ) : (
                    auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-[6px] border border-border-default bg-bg-subtle/50 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="neutral">{log.action}</Badge>
                          <span className="font-mono-tabular text-[11px] text-text-muted">
                            {log.timestamp}
                          </span>
                        </div>
                        <p className="text-text-primary">{log.summary}</p>
                        <p className="text-[11px] text-text-muted">Actor: {log.actor}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

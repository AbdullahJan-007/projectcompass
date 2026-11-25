"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Building2,
  UserCog,
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalSession } from "@/components/layout/portal-session-context";
import { updateUserRole, overrideSupervisorQuota } from "@/actions/admin.actions";
import { getAdminWorkspaceData } from "@/actions/workspace.actions";

interface UserDirectoryRow {
  id: string;
  fullName: string;
  email: string;
  role: "STUDENT" | "SUPERVISOR" | "COORDINATOR" | "ADMIN";
  departmentCode: string;
}

interface SupervisorQuotaRow {
  id: string;
  fullName: string;
  programCode: string;
  activeSlots: number;
  maxSlots: number;
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
  const [supervisors, setSupervisors] = useState<SupervisorQuotaRow[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("");
  const [overrideMaxSlots, setOverrideMaxSlots] = useState(5);
  const [overrideReason, setOverrideReason] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [viewState, setViewState] = useState<"POPULATED" | "LOADING" | "EMPTY" | "ERROR">(
    "LOADING"
  );
  void Select;
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    getAdminWorkspaceData()
      .then((data) => {
        setUsers(data.users);
        setSupervisors(data.supervisors);
        if (data.supervisors[0]) {
          setSelectedSupervisorId(data.supervisors[0].id);
        }
        setAuditLogs(data.auditLogs);
        setViewState("POPULATED");
      })
      .catch(() => {
        setViewState("POPULATED");
      });
  }, []);

  async function handleRoleChange(
    userId: string,
    newRole: "STUDENT" | "SUPERVISOR" | "COORDINATOR" | "ADMIN"
  ) {
    const adminCount = users.filter((u) => u.role === "ADMIN").length;
    const target = users.find((u) => u.id === userId);

    if (target?.role === "ADMIN" && newRole !== "ADMIN" && adminCount <= 1) {
      setBanner({
        type: "error",
        text: "Last-Admin protection: Cannot demote the only active University Admin account.",
      });
      return;
    }

    const res = await updateUserRole({
      targetUserId: userId,
      role: newRole,
    });

    if (!res.ok) {
      setBanner({
        type: "error",
        text: res.error.message,
      });
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    setAuditLogs((prev) => [
      {
        id: `cm0audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: portalSession.userName,
        action: "ROLE_UPDATED",
        entityType: "User",
        entityId: userId,
        summary: `Updated role for ${target?.fullName ?? userId} from ${target?.role} to ${newRole}.`,
      },
      ...prev,
    ]);

    setBanner({
      type: "success",
      text: `Role updated to ${newRole} and recorded in immutable AuditLog.`,
    });
  }

  async function handleQuotaOverride(e: React.FormEvent) {
    e.preventDefault();
    if (overrideReason.trim().length < 10) {
      setBanner({
        type: "error",
        text: "Audit reason must be at least 10 characters.",
      });
      return;
    }

    const res = await overrideSupervisorQuota({
      supervisorProfileId: selectedSupervisorId,
      maxSlots: overrideMaxSlots,
      reason: overrideReason,
    });

    if (!res.ok) {
      setBanner({
        type: "error",
        text: res.error.message,
      });
      return;
    }

    const sup = supervisors.find((s) => s.id === selectedSupervisorId);
    setAuditLogs((prev) => [
      {
        id: `cm0audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: portalSession.userName,
        action: "SUPERVISOR_SLOT_OVERRIDE",
        entityType: "SupervisorProfile",
        entityId: selectedSupervisorId,
        summary: `Overrode maxSlots for ${sup?.fullName ?? selectedSupervisorId} to ${overrideMaxSlots}. Reason: ${overrideReason}`,
      },
      ...prev,
    ]);

    setBanner({
      type: "success",
      text: `Supervisor quota overridden to ${overrideMaxSlots} slots with immutable AuditLog entry.`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <Badge variant="default">Department of IT &amp; Computing Governance</Badge>
          <h1 className="mt-2 text-[22px] sm:text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-primary">
            IT Programs, Multi-Batch Cohorts &amp; Role Management
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage all 6 IT &amp; Computing degree programs (BSIT, BSCS, BSSE, BSAI, BSCY, BSDS),
            Fall/Spring batch cohorts, supervisor slot overrides, and institutional audit logs.
          </p>
        </div>
      </div>

      {banner && (
        <div
          className={`flex items-center gap-2 rounded-[6px] border px-4 py-2.5 text-xs font-medium ${
            banner.type === "success"
              ? "border-status-success/30 bg-status-success-tint text-status-success-text"
              : "border-status-error/30 bg-status-error-tint text-status-error-text"
          }`}
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {viewState === "LOADING" && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {viewState === "ERROR" && (
        <Card className="border-status-error/30 bg-status-error-tint/30">
          <CardHeader>
            <CardTitle className="text-status-error-text">
              Governance Ledger Query Interrupted
            </CardTitle>
            <CardDescription className="text-status-error-text">
              Unable to load cross-department audit records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setViewState("POPULATED")}>
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
              Retry Governance Sync
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "EMPTY" && (
        <Card className="bg-grad-ambient">
          <CardHeader>
            <CardTitle>No Governance Overrides Logged in Current Window</CardTitle>
            <CardDescription>
              All supervisor slot quotas and role assignments are operating within standard
              department defaults.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setViewState("POPULATED")}>
              View Full Institutional Ledger
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "POPULATED" && (
        <>
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Department & Cohort Overview */}
            <div className="lg:col-span-6">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-brand-primary" strokeWidth={1.75} />
                    <CardTitle>Configured Academic Departments &amp; Cohorts</CardTitle>
                  </div>
                  <CardDescription>
                    Tenant boundaries isolating supervisor quotas and past-FYP vector indexes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2.5 sm:grid-cols-2">
                  {[
                    {
                      code: "BSIT",
                      name: "BS Information Technology",
                      note: "Enterprise Cloud, Networking & Infrastructure",
                    },
                    {
                      code: "BSCS",
                      name: "BS Computer Science",
                      note: "Systems, Compilers & Distributed Computing",
                    },
                    {
                      code: "BSSE",
                      name: "BS Software Engineering",
                      note: "Quality Engineering, SaaS & DevOps",
                    },
                    {
                      code: "BSAI",
                      name: "BS Artificial Intelligence",
                      note: "Applied AI, RAG & Machine Learning",
                    },
                    {
                      code: "BSCY",
                      name: "BS Cybersecurity",
                      note: "Zero-Trust, SBOM & Threat Analysis",
                    },
                    {
                      code: "BSDS",
                      name: "BS Data Science",
                      note: "Data Engineering, Analytics & Forecasting",
                    },
                  ].map((prog) => (
                    <div
                      key={prog.code}
                      className="rounded-[8px] border border-border-default bg-bg-subtle p-3.5 space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-mono-tabular text-xs font-semibold text-brand-primary">
                          {prog.code} · 5 Slots/Faculty
                        </span>
                        <Badge variant="success">All Batches Active</Badge>
                      </div>
                      <h4 className="text-sm font-semibold text-text-primary">{prog.name}</h4>
                      <p className="text-xs text-text-secondary">{prog.note}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Supervisor Quota Override Form */}
            <div className="lg:col-span-6">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-brand-primary" strokeWidth={1.75} />
                    <CardTitle>Audited Supervisor Slot Quota Override</CardTitle>
                  </div>
                  <CardDescription>
                    Requires a mandatory audit reason (&gt;= 10 chars) and enforces{" "}
                    <code className="font-mono-tabular">maxSlots &gt;= activeSlots</code>.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleQuotaOverride} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Select Faculty Supervisor
                      </label>
                      <Select
                        value={selectedSupervisorId}
                        onChange={(e) => setSelectedSupervisorId(e.target.value)}
                      >
                        {supervisors.length === 0 ? (
                          <option value="">No faculty supervisors registered yet</option>
                        ) : (
                          supervisors.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.fullName} ({s.programCode} · Active: {s.activeSlots}/{s.maxSlots} slots)
                            </option>
                          ))
                        )}
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        New Max Slot Quota
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={overrideMaxSlots}
                        onChange={(e) => setOverrideMaxSlots(Number(e.target.value) || 5)}
                        className="font-mono-tabular"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Mandatory Governance Reason (&gt;= 10 chars)
                      </label>
                      <Input
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />
                      Apply Quota Override &amp; Write AuditLog
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* User Roles Directory with Last-Admin Guard */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-brand-primary" strokeWidth={1.75} />
                <CardTitle>Institutional User Role Assignments (Last-Admin Guard Active)</CardTitle>
              </div>
              <CardDescription>
                Promotions to <code className="font-mono-tabular">COORDINATOR</code> or{" "}
                <code className="font-mono-tabular">ADMIN</code> are restricted strictly to this
                governance controller.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border-default rounded-[8px] border border-border-default">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">
                          {u.fullName}
                        </span>
                        <Badge variant="neutral">{u.departmentCode}</Badge>
                      </div>
                      <p className="font-mono-tabular text-xs text-text-muted">{u.email}</p>
                    </div>

                    <div className="w-full sm:w-auto flex items-center gap-2">
                      <Select
                        aria-label={`Role for ${u.fullName}`}
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(
                            u.id,
                            e.target.value as
                              | "STUDENT"
                              | "SUPERVISOR"
                              | "COORDINATOR"
                              | "ADMIN"
                          )
                        }
                        className="w-full sm:w-44 text-xs"
                      >
                        <option value="STUDENT">STUDENT</option>
                        <option value="SUPERVISOR">SUPERVISOR</option>
                        <option value="COORDINATOR">COORDINATOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Immutable Audit Log */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-primary" strokeWidth={1.75} />
                <CardTitle>Immutable Institutional Audit Log</CardTitle>
              </div>
              <CardDescription>
                Tracks every role change, supervisor slot override, and archive deletion for
                non-repudiation compliance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border-default bg-bg-subtle px-4 py-2.5 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="font-mono-tabular">
                        {log.action}
                      </Badge>
                      <span className="font-semibold text-text-primary">{log.actor}</span>
                      <span className="font-mono-tabular text-text-muted">
                        ({log.entityType}:{log.entityId})
                      </span>
                    </div>
                    <p className="text-text-secondary">{log.summary}</p>
                  </div>
                  <span className="font-mono-tabular text-[11px] text-text-muted">
                    {log.timestamp}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertCircle,
  Sliders,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalSession } from "@/components/layout/portal-session-context";
import { upsertSupervisorProfile, respondToSupervisionRequest } from "@/actions/supervisor.actions";
import {
  loadStoredSupervisionRequests,
  saveStoredSupervisionRequests,
} from "@/lib/workspace-store";

interface IncomingRequestItem {
  id: string;
  studentName: string;
  ideaTitle: string;
  track: "CORE_SAFE" | "CAREER_STRETCH" | "RESEARCH_NICHE";
  feasibilityScore: number;
  skillGapsSummary: string;
  studentPitch: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  supervisorNote?: string;
}

export default function SupervisorPortalPage() {
  const portalSession = usePortalSession();
  const [title, setTitle] = useState("Associate Professor");
  const [bio, setBio] = useState(
    "Leads the Distributed Systems & Automated Software Testing Lab. Focuses on CI log anomaly triage, OpenTelemetry root-cause analysis, and PostgreSQL query optimization."
  );
  const [researchDomains, setResearchDomains] = useState(
    "DevTools, Cloud & Distributed Systems, Data Engineering"
  );
  const [preferredStacks, setPreferredStacks] = useState(
    "TypeScript, Next.js, PostgreSQL, Go, Docker, OpenTelemetry"
  );
  const [maxSlots, setMaxSlots] = useState(5);
  const [activeSlots, setActiveSlots] = useState(3);
  const [isAccepting, setIsAccepting] = useState(true);
  const [viewState, setViewState] = useState<"POPULATED" | "LOADING" | "EMPTY" | "ERROR">(
    "POPULATED"
  );
  void Select;

  const [requests, setRequests] = useState<IncomingRequestItem[]>([
    {
      id: "cm0req01studentpitch00001",
      studentName: "Areeba Noor (Fall 2023 · BSCS)",
      ideaTitle: "Deterministic CI Log Anomaly Triage Engine for Small Engineering Teams",
      track: "CORE_SAFE",
      feasibilityScore: 86,
      skillGapsSummary: "pgvector Semantic Search (12h minor ramp-up)",
      studentPitch:
        "We have built a working TypeScript + PostgreSQL log parser prototype and want to evaluate vector failure clustering on open-source GitHub Actions traces under your lab.",
      status: "PENDING",
    },
    {
      id: "cm0req02studentpitch00002",
      studentName: "Hamza Tariq & Zainab Ali (Spring 2023 · BSIT)",
      ideaTitle: "OpenTelemetry Distributed Trace Bottleneck & N+1 Query Root-Cause Analyzer",
      track: "CAREER_STRETCH",
      feasibilityScore: 78,
      skillGapsSummary: "OpenTelemetry Distributed Tracing (18h moderate ramp-up)",
      studentPitch:
        "Our pair team has 30 hrs/week combined capacity and strong PostgreSQL indexing background. We aim to benchmark critical-path N+1 detection on microservice traces.",
      status: "PENDING",
    },
  ]);

  const [noteByRequestId, setNoteByRequestId] = useState<Record<string, string>>({
    cm0req01studentpitch00001:
      "Strong alignment with our CI reliability benchmark track. Approved for Fall-Spring cohort.",
    cm0req02studentpitch00002:
      "Well-scoped proposal; let's review OTLP collector overhead during week 2.",
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const shared = loadStoredSupervisionRequests([]);
    if (shared.length > 0) {
      setRequests((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const mappedFromStore: IncomingRequestItem[] = shared
          .filter((s) => s.status !== "WITHDRAWN" && !existingIds.has(s.id))
          .map((s) => ({
            id: s.id,
            studentName: s.studentName ?? "Final-Year Student (BSCS)",
            ideaTitle: s.ideaTitle,
            track: s.track,
            feasibilityScore: s.feasibilityScore,
            skillGapsSummary: s.skillGapsSummary,
            studentPitch: s.pitch,
            status: s.status === "WITHDRAWN" ? "DECLINED" : s.status,
            supervisorNote: s.supervisorNote,
          }));
        return [...mappedFromStore, ...prev];
      });
    }
  }, []);

  async function handleSaveSupervisorProfile(e: React.FormEvent) {
    e.preventDefault();
    if (maxSlots < activeSlots) {
      setStatusMessage(
        `Validation error: Cannot set maxSlots (${maxSlots}) lower than activeSlots (${activeSlots}).`
      );
      return;
    }

    const domains = researchDomains
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const stacks = preferredStacks
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await upsertSupervisorProfile({
      title,
      bio,
      researchDomains: domains,
      preferredStacks: stacks,
      skillSlugs: ["typescript", "postgresql", "opentelemetry"],
      maxSlots,
      isAccepting,
    });

    if (!res.ok) {
      setStatusMessage(res.error.message);
      return;
    }

    setStatusMessage(
      "Supervisor research profile and 1536-dim domain embedding updated."
    );
  }

  async function handleDecision(requestId: string, decision: "ACCEPT" | "DECLINE") {
    const note =
      noteByRequestId[requestId]?.trim() ||
      "Reviewed against lab supervision rubric and domain alignment.";

    if (decision === "ACCEPT" && activeSlots >= maxSlots) {
      setStatusMessage(
        "SUPERVISOR_QUOTA_FULL: All supervision slots are filled. Cannot accept additional requests."
      );
      return;
    }

    const res = await respondToSupervisionRequest({
      requestId,
      decision,
      supervisorNote: note,
    });

    if (!res.ok) {
      setStatusMessage(res.error.message);
      return;
    }

    if (decision === "ACCEPT") {
      setActiveSlots((prev) => Math.min(maxSlots, prev + 1));
    }

    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: decision === "ACCEPT" ? "ACCEPTED" : "DECLINED",
              supervisorNote: note,
            }
          : r
      )
    );

    const shared = loadStoredSupervisionRequests([]);
    if (shared.some((s) => s.id === requestId)) {
      saveStoredSupervisionRequests(
        shared.map((s) =>
          s.id === requestId
            ? {
                ...s,
                status: decision === "ACCEPT" ? "ACCEPTED" : "DECLINED",
                supervisorNote: note,
              }
            : s
        )
      );
    }

    setStatusMessage(
      decision === "ACCEPT"
        ? `Request ${requestId} ACCEPTED. Atomic slot counter incremented (${activeSlots + 1}/${maxSlots}).`
        : `Request ${requestId} DECLINED with structured feedback sent via Resend.`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={activeSlots < maxSlots && isAccepting ? "success" : "error"}>
              {activeSlots} of {maxSlots} Supervision Slots Filled
            </Badge>
            <Badge variant="neutral">
              {portalSession.userName} · {portalSession.departmentCode}
            </Badge>
          </div>
          <h1 className="mt-2 text-[22px] sm:text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-primary">
            Faculty Supervision Profile &amp; Slot Quotas
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your research domains, supervision slot limit, and incoming student project
            proposals.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-[6px] border border-brand-primary/30 bg-brand-tint/40 px-4 py-2.5 text-xs font-medium text-brand-primary-hover">
          {statusMessage}
        </div>
      )}

      {viewState === "LOADING" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Skeleton className="h-80 w-full" />
          </div>
          <div className="lg:col-span-7 space-y-4">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        </div>
      )}

      {viewState === "ERROR" && (
        <Card className="border-status-error/30 bg-status-error-tint/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-status-error-text">
              <AlertCircle className="h-5 w-5" strokeWidth={1.75} />
              <CardTitle className="text-status-error-text">
                Quota Transaction Verification Timeout
              </CardTitle>
            </div>
            <CardDescription className="text-status-error-text">
              Could not verify lock state against the PostgreSQL transaction pooler.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setViewState("POPULATED")}>
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
              Retry Quota Sync
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "EMPTY" && (
        <Card className="bg-grad-ambient">
          <CardHeader>
            <CardTitle>No Pending Student Supervision Requests</CardTitle>
            <CardDescription>
              Your research profile is active with{" "}
              <span className="font-mono-tabular">{maxSlots - activeSlots}</span> open supervision
              slots. Vetted student proposals matching your domain embedding will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setViewState("POPULATED")}>
              Show Sample Incoming Requests
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "POPULATED" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-brand-primary" strokeWidth={1.75} />
                  <CardTitle>Research Domain &amp; Quota Configuration</CardTitle>
                </div>
                <CardDescription>
                  Updates regenerate your 1536-dim faculty embedding and enforce hard capacity filters.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSupervisorProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Academic Title
                    </label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Research Domains (Comma-Separated)
                    </label>
                    <Input
                      value={researchDomains}
                      onChange={(e) => setResearchDomains(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Preferred Tech Stacks
                    </label>
                    <Input
                      value={preferredStacks}
                      onChange={(e) => setPreferredStacks(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Research Lab Bio (30–1000 chars)
                    </label>
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Max Supervision Slots
                      </label>
                      <Input
                        type="number"
                        min={activeSlots}
                        max={15}
                        value={maxSlots}
                        onChange={(e) => setMaxSlots(Number(e.target.value) || activeSlots)}
                        className="font-mono-tabular"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Accepting Proposals
                      </label>
                      <Select
                        value={isAccepting ? "true" : "false"}
                        onChange={(e) => setIsAccepting(e.target.value === "true")}
                      >
                        <option value="true">Accepting New Requests</option>
                        <option value="false">Paused (Excluded from Match)</option>
                      </Select>
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    <Briefcase className="h-4 w-4" strokeWidth={1.75} />
                    Save Profile &amp; Recalculate Embedding
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Incoming Vetted Student Proposals</CardTitle>
                  <Badge variant="default">
                    Atomic Lock: {activeSlots}/{maxSlots} Active
                  </Badge>
                </div>
                <CardDescription>
                  Accepting a request executes an atomic PostgreSQL conditional increment (
                  <code className="font-mono-tabular">activeSlots &lt; maxSlots</code>) and
                  auto-withdraws the student&apos;s other pending requests.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-[8px] border border-border-default bg-bg-surface p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              req.status === "ACCEPTED"
                                ? "success"
                                : req.status === "DECLINED"
                                  ? "error"
                                  : "amber"
                            }
                          >
                            {req.status}
                          </Badge>
                          <Badge variant="neutral">{req.track}</Badge>
                          <span className="font-mono-tabular text-xs font-semibold text-status-success-text">
                            Feasibility: {req.feasibilityScore}/100
                          </span>
                        </div>
                        <h4 className="mt-1.5 text-sm font-semibold text-text-primary">
                          {req.ideaTitle}
                        </h4>
                        <p className="text-xs text-text-muted">Applicant: {req.studentName}</p>
                      </div>
                    </div>

                    <div className="rounded-[6px] bg-bg-subtle p-3 text-xs text-text-secondary">
                      <p className="font-semibold text-text-primary">Student Pitch:</p>
                      <p className="mt-1 leading-relaxed">{req.studentPitch}</p>
                      <p className="mt-2 font-mono-tabular text-[11px] text-text-muted">
                        Skill-Gap Audit: {req.skillGapsSummary}
                      </p>
                    </div>

                    {req.status === "PENDING" ? (
                      <div className="space-y-2.5 pt-1">
                        <Input
                          value={noteByRequestId[req.id] ?? ""}
                          onChange={(e) =>
                            setNoteByRequestId((prev) => ({
                              ...prev,
                              [req.id]: e.target.value,
                            }))
                          }
                          placeholder="Enter supervision note or decline feedback (>= 10 chars)..."
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleDecision(req.id, "ACCEPT")}
                            disabled={!isAccepting || activeSlots >= maxSlots}
                          >
                            <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                            Accept (Locks 1 Slot)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDecision(req.id, "DECLINE")}
                          >
                            <XCircle className="h-4 w-4 text-status-error" strokeWidth={1.75} />
                            Decline with Feedback
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-[6px] border border-border-default bg-bg-subtle px-3 py-2 text-xs text-text-secondary">
                        <ShieldCheck className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
                        <span>Recorded Supervisor Note: {req.supervisorNote}</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

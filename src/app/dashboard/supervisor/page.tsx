"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalSession } from "@/components/layout/portal-session-context";
import {
  upsertSupervisorProfile,
  respondToSupervisionRequest,
} from "@/actions/supervisor.actions";
import { getFacultySupervisorWorkspace } from "@/actions/workspace.actions";
import { formatTrackLabel } from "@/lib/workspace-store";
import { AppIcon } from "@/components/ui/app-icon";

interface IncomingRequestItem {
  id: string;
  studentName: string;
  studentRegNo: string;
  ideaTitle: string;
  track: "CORE_SAFE" | "CAREER_STRETCH" | "RESEARCH_NICHE";
  feasibilityScore: number;
  skillGapsSummary: string;
  studentPitch: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  supervisorNote?: string;
}

type ProposalFilter = "ALL" | "PENDING" | "ACCEPTED" | "DECLINED";

function getInitials(name: string): string {
  const cleaned = name.replace(/^(Dr\.|Prof\.|Engr\.)\s*/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FS";
  if (parts.length === 1) return (parts[0] ?? "FS").slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? "F"}${parts[parts.length - 1]?.[0] ?? "S"}`.toUpperCase();
}

export default function SupervisorPortalPage() {
  const portalSession = usePortalSession();
  const [title, setTitle] = useState("Assistant Professor");
  const [bio, setBio] = useState("");
  const [domainsList, setDomainsList] = useState<string[]>([]);
  const [newDomainInput, setNewDomainInput] = useState("");
  const [stacksList, setStacksList] = useState<string[]>([]);
  const [newStackInput, setNewStackInput] = useState("");
  const [maxSlots, setMaxSlots] = useState(5);
  const [activeSlots, setActiveSlots] = useState(0);
  const [isAccepting, setIsAccepting] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [proposalFilter, setProposalFilter] = useState<ProposalFilter>("ALL");
  const [viewState, setViewState] = useState<"POPULATED" | "LOADING" | "ERROR">("LOADING");

  const [requests, setRequests] = useState<IncomingRequestItem[]>([]);
  const [noteByRequestId, setNoteByRequestId] = useState<Record<string, string>>({});
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    getFacultySupervisorWorkspace()
      .then((ws) => {
        if (ws.profile) {
          setTitle(ws.profile.title);
          setBio(ws.profile.bio);
          setDomainsList(ws.profile.researchDomains);
          setStacksList(ws.profile.preferredStacks);
          setMaxSlots(ws.profile.maxSlots);
          setActiveSlots(ws.profile.activeSlots);
          setIsAccepting(ws.profile.isAccepting);
        }
        setRequests(
          ws.incomingRequests
            .filter((r) => r.status !== "WITHDRAWN" && r.status !== "RELEASED")
            .map((r) => ({
              id: r.id,
              studentName: r.studentName,
              studentRegNo: r.studentRegNo,
              ideaTitle: r.ideaTitle,
              track: (["CORE_SAFE", "CAREER_STRETCH", "RESEARCH_NICHE"].includes(r.track)
                ? r.track
                : "CORE_SAFE") as IncomingRequestItem["track"],
              feasibilityScore: r.feasibilityScore,
              skillGapsSummary: r.skillGapsSummary,
              studentPitch: r.studentPitch,
              status: r.status as IncomingRequestItem["status"],
              supervisorNote: r.supervisorNote,
            }))
        );
        setViewState("POPULATED");
      })
      .catch(() => {
        setViewState("ERROR");
      });
  }, []);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "PENDING").length,
    [requests]
  );

  const visibleRequests = useMemo(() => {
    if (proposalFilter === "ALL") return requests;
    return requests.filter((r) => r.status === proposalFilter);
  }, [proposalFilter, requests]);

  const capacityPercent = Math.min(
    100,
    Math.round((activeSlots / Math.max(1, maxSlots)) * 100)
  );

  function addDomainChip() {
    const cleaned = newDomainInput.trim();
    if (cleaned.length < 2) return;
    if (domainsList.length >= 8) {
      setStatusBanner({
        type: "error",
        text: "Maximum 8 research domains allowed.",
      });
      return;
    }
    if (!domainsList.some((d) => d.toLowerCase() === cleaned.toLowerCase())) {
      setDomainsList((prev) => [...prev, cleaned]);
    }
    setNewDomainInput("");
  }

  function removeDomainChip(target: string) {
    setDomainsList((prev) => prev.filter((d) => d !== target));
  }

  function addStackChip() {
    const cleaned = newStackInput.trim();
    if (cleaned.length < 1) return;
    if (stacksList.length >= 12) return;
    if (!stacksList.some((s) => s.toLowerCase() === cleaned.toLowerCase())) {
      setStacksList((prev) => [...prev, cleaned]);
    }
    setNewStackInput("");
  }

  function removeStackChip(target: string) {
    setStacksList((prev) => prev.filter((s) => s !== target));
  }

  function adjustSlotQuota(delta: number) {
    const next = maxSlots + delta;
    if (next < activeSlots) {
      setStatusBanner({
        type: "error",
        text: `Cannot reduce maxSlots (${next}) below currently locked activeSlots (${activeSlots}).`,
      });
      return;
    }
    if (next >= 0 && next <= 15) {
      setMaxSlots(next);
    }
  }

  async function handleSaveSupervisorProfile(e: React.FormEvent) {
    e.preventDefault();
    setStatusBanner(null);

    if (maxSlots < activeSlots) {
      setStatusBanner({
        type: "error",
        text: `Cannot set maxSlots (${maxSlots}) lower than activeSlots (${activeSlots}).`,
      });
      return;
    }
    if (bio.trim().length < 30) {
      setStatusBanner({
        type: "error",
        text: "Research bio must be at least 30 characters so students can evaluate lab fit.",
      });
      return;
    }
    if (domainsList.length === 0) {
      setStatusBanner({
        type: "error",
        text: "Add at least one research domain before saving your faculty profile.",
      });
      return;
    }

    const effectiveStacks = stacksList.length > 0 ? stacksList : ["TypeScript", "PostgreSQL"];
    const derivedSkillSlugs = effectiveStacks
      .map((s) => s.toLowerCase().replace(/[^a-z0-9+#.-]+/g, "-").replace(/^-|-$/g, ""))
      .filter(Boolean);

    setIsSavingProfile(true);
    const res = await upsertSupervisorProfile({
      title,
      bio,
      researchDomains: domainsList,
      preferredStacks: effectiveStacks,
      skillSlugs: derivedSkillSlugs.length > 0 ? derivedSkillSlugs : ["typescript"],
      maxSlots,
      isAccepting,
    });
    setIsSavingProfile(false);

    if (!res.ok) {
      setStatusBanner({
        type: "error",
        text: res.error.message,
      });
      return;
    }

    setActiveSlots(res.data.activeSlots);
    setStatusBanner({
      type: "success",
      text: "Supervisor research profile and 1536-dim domain embedding saved to database.",
    });
  }

  async function handleDecision(requestId: string, decision: "ACCEPT" | "DECLINE") {
    setStatusBanner(null);
    const note =
      noteByRequestId[requestId]?.trim() ||
      "Reviewed against lab supervision rubric and domain alignment.";

    if (note.length < 10) {
      setStatusBanner({
        type: "error",
        text: "Feedback note must be at least 10 characters.",
      });
      return;
    }

    if (decision === "ACCEPT" && activeSlots >= maxSlots) {
      setStatusBanner({
        type: "error",
        text: "SUPERVISOR_QUOTA_FULL: All supervision slots are filled. Cannot accept additional requests.",
      });
      return;
    }

    const res = await respondToSupervisionRequest({
      requestId,
      decision,
      supervisorNote: note,
    });

    if (!res.ok) {
      setStatusBanner({
        type: "error",
        text: res.error.message,
      });
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

    setStatusBanner({
      type: "success",
      text:
        decision === "ACCEPT"
          ? `Proposal ACCEPTED. Atomic slot counter incremented (${Math.min(maxSlots, activeSlots + 1)}/${maxSlots}).`
          : "Proposal DECLINED with structured feedback returned to student.",
    });
  }

  return (
    <div className="space-y-6">
      {/* Stitch Screen Header & Live Slot Telemetry */}
      <section className="space-y-4 animate-fade-in-up">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded bg-[#DBE2EF] text-[#112D4E] font-semibold uppercase tracking-wide">
                Faculty Workspace
              </span>
              <span className="text-outline">·</span>
              <span className="font-medium text-on-surface-variant">
                Department: {portalSession.departmentCode || "IT & Computing"}
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-[#112D4E] font-bold tracking-tight">
              Faculty Supervisor Portal
            </h1>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Manage supervision capacity, research domains, and atomic slot confirmations for
              vetted student capstone proposals.
            </p>
          </div>

          {/* Live Slot Status Card */}
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-[#DBE2EF] shadow-xs flex items-center justify-between gap-5 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#E3FDFD] text-[#004F53]">
                <AppIcon name="dataset_linked" className="text-[22px]" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#71C9CE] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#004F53]" />
                </span>
              </div>
              <div className="leading-tight">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono-tabular text-base font-bold text-[#112D4E]">
                    {activeSlots} of {maxSlots}
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    Supervision Slots Filled
                  </span>
                </div>
                <span className="text-xs text-[#2A609C] font-semibold">
                  {Math.max(0, maxSlots - activeSlots)} Slots Remaining · Atomic Lock Active
                </span>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-1 bg-surface-container-low rounded-lg p-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                Capacity Fill
              </span>
              <div className="w-24 h-2 bg-[#DBE2EF] rounded-full overflow-hidden">
                <div
                  className="bg-[#2A609C] h-full rounded-full transition-all duration-300"
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Faculty Identity Strip */}
        <div className="w-full bg-surface-container-lowest rounded-xl p-4 border border-[#DBE2EF] shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#112D4E] text-white flex items-center justify-center font-headline-sm text-sm font-bold">
              {getInitials(portalSession.userName)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-title-md text-base font-bold text-[#112D4E]">
                  {portalSession.userName}
                </span>
                <AppIcon name="verified" className="text-[16px] text-[#2A609C]" />
              </div>
              <span className="text-xs text-on-surface-variant">
                {title} · {portalSession.identifier}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#DBE2EF]/70 text-[#112D4E] text-xs font-semibold">
              {portalSession.departmentCode}
            </span>
            <span
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                isAccepting
                  ? "bg-[#E3FDFD] text-[#004F53] border border-[#71C9CE]/50"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              <AppIcon name={isAccepting ? "check_circle" : "pause_circle"} className="text-[14px]" />
              {isAccepting ? "Active Supervisor" : "Paused"}
            </span>
          </div>
        </div>
      </section>

      {statusBanner && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-medium ${
            statusBanner.type === "success"
              ? "border-[#71C9CE]/60 bg-[#E3FDFD] text-[#004F53]"
              : "border-error/30 bg-error-container/60 text-on-error-container"
          }`}
        >
          <AppIcon name={statusBanner.type === "success" ? "check_circle" : "error"} className="text-[18px] shrink-0" />
          <span>{statusBanner.text}</span>
        </div>
      )}

      {viewState === "LOADING" && (
        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <div className="xl:col-span-7 space-y-4">
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
        </div>
      )}

      {viewState === "ERROR" && (
        <div className="rounded-xl border border-error/30 bg-error-container/50 p-6 space-y-3">
          <h2 className="font-headline-sm text-lg font-bold text-on-error-container">
            Unable to Load Faculty Workspace
          </h2>
          <p className="text-xs text-on-error-container">
            Could not verify supervision quota state from PostgreSQL.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry Quota Sync
          </Button>
        </div>
      )}

      {viewState === "POPULATED" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL: Faculty Research Profile & Slot Quotas */}
          <div className="xl:col-span-5 bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-[#DBE2EF] shadow-xs space-y-4">
            <div className="pb-3 border-b border-[#DBE2EF]/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AppIcon name="hub" className="text-[#2A609C] text-[20px]" />
                  <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
                    Faculty Research Profile
                  </h2>
                </div>
                <span className="font-mono-tabular text-[11px] text-[#3F72AF] px-2 py-0.5 rounded bg-[#DBE2EF]/50 font-semibold">
                  1536-dim Vector
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Updates dynamically refresh compatibility scores against student proposals.
              </p>
            </div>

            <form onSubmit={handleSaveSupervisorProfile} className="space-y-4">
              {/* Designation */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#112D4E] flex items-center justify-between">
                  <span>Designation / Lab Role</span>
                  <span className="text-[11px] text-on-surface-variant font-normal">
                    Formal Title
                  </span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full h-10 px-3 bg-surface-container-lowest text-sm text-on-surface rounded-lg border border-[#DBE2EF] focus:outline-none focus:ring-2 focus:ring-[#3F72AF]/40"
                />
              </div>

              {/* Research Bio */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-[#112D4E]">
                    Research Bio &amp; Capstone Directives
                  </label>
                  <span className="font-mono-tabular text-[11px] text-[#3F72AF]">
                    {bio.length}/1000 chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your research laboratory focus, preferred evaluation methodologies, and student supervision expectations (min 30 characters)..."
                  className="w-full p-3 bg-surface-container-lowest text-xs sm:text-sm text-on-surface rounded-lg border border-[#DBE2EF] focus:outline-none focus:ring-2 focus:ring-[#3F72AF]/40 leading-relaxed"
                />
              </div>

              {/* Research Domains Chip Editor */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#112D4E] flex items-center justify-between">
                  <span>Research Domains &amp; Clusters</span>
                  <span className="text-[11px] text-on-surface-variant font-normal">
                    {domainsList.length}/8
                  </span>
                </label>
                <div className="p-2.5 bg-surface-container-low rounded-lg border border-[#DBE2EF]/70 flex flex-wrap gap-1.5 items-center">
                  {domainsList.map((dom) => (
                    <span
                      key={dom}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container-lowest text-[#112D4E] text-xs font-medium border border-[#DBE2EF]"
                    >
                      {dom}
                      <button
                        type="button"
                        onClick={() => removeDomainChip(dom)}
                        aria-label={`Remove ${dom}`}
                        className="text-outline hover:text-error"
                      >
                        <AppIcon name="close" className="text-[14px]" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                    <input
                      type="text"
                      value={newDomainInput}
                      onChange={(e) => setNewDomainInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addDomainChip();
                        }
                      }}
                      placeholder="Add domain..."
                      className="h-7 flex-1 min-w-0 px-2 rounded bg-white border border-[#DBE2EF] text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addDomainChip}
                      className="h-7 px-2 rounded bg-[#DBE2EF] text-[#112D4E] text-xs font-semibold hover:bg-[#3F72AF] hover:text-white transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Preferred Tech Stacks Chip Editor */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#112D4E] flex items-center justify-between">
                  <span>Target Hardware &amp; Libraries</span>
                  <span className="text-[11px] text-on-surface-variant font-normal">
                    Preferred Stack
                  </span>
                </label>
                <div className="p-2.5 bg-surface-container-low rounded-lg border border-[#DBE2EF]/70 flex flex-wrap gap-1.5 items-center">
                  {stacksList.map((st) => (
                    <span
                      key={st}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-lowest text-[#112D4E] font-mono-tabular text-xs font-medium border border-[#DBE2EF]"
                    >
                      {st}
                      <button
                        type="button"
                        onClick={() => removeStackChip(st)}
                        aria-label={`Remove ${st}`}
                        className="text-outline hover:text-error"
                      >
                        <AppIcon name="close" className="text-[14px]" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                    <input
                      type="text"
                      value={newStackInput}
                      onChange={(e) => setNewStackInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addStackChip();
                        }
                      }}
                      placeholder="Add stack..."
                      className="h-7 flex-1 min-w-0 px-2 rounded bg-white border border-[#DBE2EF] text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addStackChip}
                      className="h-7 px-2 rounded bg-[#DBE2EF] text-[#112D4E] text-xs font-semibold hover:bg-[#3F72AF] hover:text-white transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Capacity Stepper & Accepting Switch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-surface-container-low p-3 rounded-lg border border-[#DBE2EF]/70 space-y-1.5">
                  <label className="text-xs font-semibold text-[#112D4E] flex items-center justify-between">
                    <span>Max Capstone Slots</span>
                    <span className="font-mono-tabular text-[11px] text-[#3F72AF]">
                      Min {activeSlots}
                    </span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustSlotQuota(-1)}
                      aria-label="Decrease max slots"
                      className="w-8 h-8 rounded bg-surface-container-lowest text-[#112D4E] font-bold border border-[#DBE2EF] hover:bg-[#DBE2EF]/50"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={activeSlots}
                      max={15}
                      value={maxSlots}
                      onChange={(e) =>
                        setMaxSlots(Math.max(activeSlots, Math.min(15, Number(e.target.value) || activeSlots)))
                      }
                      aria-label="Max Supervision Slots"
                      className="w-full text-center h-8 bg-surface-container-lowest font-mono-tabular text-sm font-bold text-[#112D4E] rounded border border-[#DBE2EF]"
                    />
                    <button
                      type="button"
                      onClick={() => adjustSlotQuota(1)}
                      aria-label="Increase max slots"
                      className="w-8 h-8 rounded bg-surface-container-lowest text-[#112D4E] font-bold border border-[#DBE2EF] hover:bg-[#DBE2EF]/50"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-surface-container-low p-3 rounded-lg border border-[#DBE2EF]/70 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#112D4E]">Accepting Pitches</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isAccepting}
                      aria-label="Toggle accepting pitches"
                      onClick={() => setIsAccepting((prev) => !prev)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                        isAccepting ? "bg-[#2A609C]" : "bg-outline"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ml-0.5 ${
                          isAccepting ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <span className="text-[11px] text-[#2A609C] font-semibold mt-1">
                    {isAccepting ? "Active & Accepting" : "Paused from Student Match"}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full h-11 rounded-lg bg-[#112D4E] hover:bg-[#3F72AF] disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <AppIcon name="auto_awesome" className="text-[18px]" />
                <span>
                  {isSavingProfile
                    ? "Saving & Updating Matches..."
                    : "Save Profile & Update Matches"}
                </span>
              </button>
            </form>
          </div>

          {/* RIGHT PANEL: Incoming Vetted Student Proposals */}
          <div className="xl:col-span-7 space-y-4">
            {/* Panel Header Strip */}
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-[#DBE2EF] shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AppIcon name="inbox" className="text-[#2A609C] text-[22px]" />
                <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
                  Incoming Vetted Proposals
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E3FDFD] border border-[#71C9CE]/50 text-[#004F53] text-xs font-semibold">
                  {pendingCount} Pending
                </span>
              </div>

              <div className="flex items-center gap-3 bg-surface-container-low px-3 py-1.5 rounded-lg border border-[#DBE2EF]/70">
                <span className="font-mono-tabular text-xs text-[#112D4E] font-semibold">
                  Atomic Lock: {activeSlots}/{maxSlots}
                </span>
                <div className="w-16 h-2 bg-[#DBE2EF] rounded-full overflow-hidden">
                  <div
                    className="bg-[#2A609C] h-full transition-all duration-300"
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(
                [
                  { key: "ALL", label: `All (${requests.length})` },
                  { key: "PENDING", label: `Pending Action (${pendingCount})` },
                  {
                    key: "ACCEPTED",
                    label: `Accepted (${requests.filter((r) => r.status === "ACCEPTED").length})`,
                  },
                  {
                    key: "DECLINED",
                    label: `Declined (${requests.filter((r) => r.status === "DECLINED").length})`,
                  },
                ] as const
              ).map((pill) => {
                const active = proposalFilter === pill.key;
                return (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => setProposalFilter(pill.key)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? "bg-[#112D4E] text-white shadow-xs"
                        : "bg-surface-container text-on-surface-variant hover:bg-[#DBE2EF] hover:text-[#112D4E]"
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {/* Proposals List or Clean Empty State */}
            {visibleRequests.length === 0 ? (
              <div className="rounded-xl p-8 bg-surface-container-lowest border border-[#DBE2EF] text-center flex flex-col items-center justify-center gap-2 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-[#E3FDFD] flex items-center justify-center text-[#004F53] mb-1">
                  <AppIcon name="task_alt" className="text-[24px]" />
                </div>
                <h3 className="font-headline-sm text-lg font-bold text-[#112D4E]">
                  No Matching Student Supervision Requests
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant max-w-md">
                  When students submit supervision pitches aligned with your research profile, their
                  vetted proposals and feasibility scores appear here with atomic slot controls.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleRequests.map((req) => (
                  <article
                    key={req.id}
                    className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-[#DBE2EF] shadow-xs space-y-4 transition-all hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pb-3 border-b border-[#DBE2EF]/60">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-title-md text-base font-bold text-[#112D4E]">
                            {req.studentName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              req.status === "ACCEPTED"
                                ? "bg-[#E3FDFD] text-[#004F53] border border-[#71C9CE]/50"
                                : req.status === "DECLINED"
                                  ? "bg-error-container text-on-error-container"
                                  : "bg-[#FEF3C7] text-[#92400E]"
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        {req.studentRegNo && (
                          <span className="font-mono-tabular text-xs text-on-surface-variant">
                            {req.studentRegNo}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 self-start">
                        <span className="px-2.5 py-1 rounded bg-[#DBE2EF] text-[#112D4E] font-mono-tabular text-xs font-bold">
                          {req.feasibilityScore}/100 Feasibility
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface leading-snug">
                        {req.ideaTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#DBE2EF]/70 text-[#112D4E] text-[11px] font-semibold">
                          {formatTrackLabel(req.track)}
                        </span>
                      </div>
                    </div>

                    {/* Skill Gap Strip */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface border border-[#DBE2EF]/60">
                      <AppIcon name="bolt" className="text-[17px] text-[#2A609C]" />
                      <div>
                        <strong className="font-semibold text-[#112D4E]">Skill-Gap Audit: </strong>
                        <span>{req.skillGapsSummary || "Verified profile"}</span>
                      </div>
                    </div>

                    {/* Student Pitch Quote */}
                    <div className="relative bg-surface-container-low rounded-lg p-3.5 pl-9 text-xs sm:text-[13px] text-on-surface-variant leading-relaxed">
                      <AppIcon name="format_quote" className="absolute left-2.5 top-3 text-[#2A609C] text-[18px] opacity-75" />
                      <p>{req.studentPitch}</p>
                    </div>

                    {req.status === "PENDING" ? (
                      <div className="space-y-3 pt-1">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[#112D4E]">
                            Supervisor Endorsement / Feedback Note (10–600 chars)
                          </label>
                          <input
                            type="text"
                            value={noteByRequestId[req.id] ?? ""}
                            onChange={(e) =>
                              setNoteByRequestId((prev) => ({
                                ...prev,
                                [req.id]: e.target.value,
                              }))
                            }
                            placeholder="Add milestone prerequisites or feedback note..."
                            className="w-full h-9 px-3 bg-surface-container-lowest text-xs sm:text-sm text-on-surface rounded-lg border border-[#DBE2EF] focus:outline-none focus:ring-2 focus:ring-[#3F72AF]/40"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleDecision(req.id, "DECLINE")}
                            className="h-9 px-3.5 rounded-lg bg-surface-container-lowest text-error border border-[#DBE2EF] hover:bg-error-container/40 text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <AppIcon name="close" className="text-[16px]" />
                            <span>Decline</span>
                          </button>
                          <button
                            type="button"
                            disabled={!isAccepting || activeSlots >= maxSlots}
                            onClick={() => handleDecision(req.id, "ACCEPT")}
                            className="h-9 px-4 rounded-lg bg-[#112D4E] hover:bg-[#3F72AF] disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <AppIcon name="lock" className="text-[16px]" />
                            <span>Accept (Locks 1 Slot)</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-[#DBE2EF] bg-[#F9F7F7] px-3 py-2 text-xs text-on-surface-variant">
                        <AppIcon name="verified" className="text-[16px] text-[#2A609C]" />
                        <span>
                          <strong className="text-[#112D4E]">Recorded Supervisor Note:</strong>{" "}
                          {req.supervisorNote}
                        </span>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

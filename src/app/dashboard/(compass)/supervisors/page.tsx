"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePortalSession } from "@/components/layout/portal-session-context";
import { rankAvailableSupervisors } from "@/lib/recommendation/supervisor-ranker";
import { generateDeterministicEmbedding } from "@/lib/ai/embeddings";
import {
  createSupervisionRequest,
  withdrawSupervisionRequest,
} from "@/actions/supervisor.actions";
import { getActiveRecommendationsSnapshot } from "@/actions/recommendation.actions";
import {
  getStudentSupervisorsWorkspace,
  type LiveSupervisorDirectoryItem,
} from "@/actions/workspace.actions";
import {
  saveStoredSupervisionRequests,
  formatTrackLabel,
  type StoredSupervisionRequest,
} from "@/lib/workspace-store";
import type { GeneratedIdeaRecord } from "@/lib/recommendation/engine";

function getInitials(name: string): string {
  const cleaned = name.replace(/^(Dr\.|Prof\.|Engr\.)\s*/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FS";
  if (parts.length === 1) return (parts[0] ?? "FS").slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? "F"}${parts[parts.length - 1]?.[0] ?? "S"}`.toUpperCase();
}

function StudentSupervisorsWorkspace() {
  const searchParams = useSearchParams();
  const portalSession = usePortalSession();
  const [supervisors, setSupervisors] = useState<LiveSupervisorDirectoryItem[]>([]);
  const [availableIdeas, setAvailableIdeas] = useState<GeneratedIdeaRecord[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyStrongFit, setOnlyStrongFit] = useState(false);
  const [showFullCapacity, setShowFullCapacity] = useState(false);
  const [modalSupervisor, setModalSupervisor] = useState<{
    id: string;
    fullName: string;
    title: string;
    programCode: string;
  } | null>(null);
  const [pitchText, setPitchText] = useState(
    "We have shortlisted our FYP proposal with verified skill and timeline feasibility and would like to request your supervision within the Department of IT & Computing."
  );
  const [isSubmittingPitch, setIsSubmittingPitch] = useState(false);
  const [sentRequests, setSentRequests] = useState<StoredSupervisionRequest[]>([]);
  const [viewState, setViewState] = useState<"POPULATED" | "LOADING" | "EMPTY" | "ERROR">(
    "LOADING"
  );
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([getStudentSupervisorsWorkspace(), getActiveRecommendationsSnapshot()])
      .then(([supData, recSnap]) => {
        setSupervisors(supData.supervisors);
        setSentRequests(
          supData.sentRequests.map((r) => ({
            id: r.id,
            supervisorProfileId: r.supervisorProfileId,
            supervisorName: r.supervisorName,
            ideaId: r.recommendedIdeaId,
            ideaTitle: r.ideaTitle,
            track: (["CORE_SAFE", "CAREER_STRETCH", "RESEARCH_NICHE"].includes(r.track)
              ? r.track
              : "CORE_SAFE") as StoredSupervisionRequest["track"],
            feasibilityScore: r.feasibilityScore,
            skillGapsSummary: r.skillGapsSummary,
            pitch: r.studentPitch,
            status: r.status === "RELEASED" ? "DECLINED" : r.status,
            supervisorNote: r.supervisorNote,
            createdAt: r.createdAt,
          }))
        );

        const ideas = recSnap.ideas ?? [];
        setAvailableIdeas(ideas);
        const paramIdeaId = searchParams?.get("ideaId");
        if (paramIdeaId && ideas.some((i) => i.id === paramIdeaId)) {
          setSelectedIdeaId(paramIdeaId);
        } else if (ideas[0]) {
          setSelectedIdeaId(ideas[0].id);
        }
        setViewState(supData.supervisors.length > 0 ? "POPULATED" : "EMPTY");
      })
      .catch(() => {
        setSupervisors([]);
        setAvailableIdeas([]);
        setViewState("ERROR");
      });
  }, [searchParams]);

  const activeIdea = useMemo(() => {
    return availableIdeas.find((i) => i.id === selectedIdeaId) ?? availableIdeas[0] ?? null;
  }, [availableIdeas, selectedIdeaId]);

  const ideaContext = useMemo(() => {
    if (!activeIdea) {
      return {
        id: "",
        track: "CORE_SAFE" as const,
        feasibilityScore: 0,
        title: "General IT & Computing FYP Supervision",
        domain: "Software Engineering",
        skills: ["typescript", "postgresql"],
      };
    }
    const gapSlugs = activeIdea.skillGaps.map((g) => g.skillSlug);
    return {
      id: activeIdea.id,
      track: activeIdea.track,
      feasibilityScore: activeIdea.feasibilityScore,
      title: activeIdea.title,
      domain: activeIdea.domain,
      skills:
        gapSlugs.length > 0
          ? ["typescript", "postgresql", ...gapSlugs]
          : ["typescript", "nextjs", "postgresql"],
    };
  }, [activeIdea]);

  const { availableMatches, fullCapacitySupervisors } = useMemo(() => {
    const ideaEmbedding = generateDeterministicEmbedding(
      `${ideaContext.title} ${ideaContext.domain} ${ideaContext.skills.join(" ")}`
    );
    const filteredPool =
      programFilter === "ALL"
        ? supervisors
        : supervisors.filter((s) => s.programCode === programFilter);

    const supInputs = filteredPool.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      title: s.title,
      researchDomains: s.researchDomains,
      preferredStacks: s.preferredStacks,
      skillSlugs: s.skillSlugs,
      maxSlots: s.maxSlots,
      activeSlots: s.activeSlots,
      isAccepting: s.isAccepting,
      embedding: generateDeterministicEmbedding(
        `${s.researchDomains.join(" ")} ${s.preferredStacks.join(" ")} ${s.skillSlugs.join(" ")} ${s.bio}`
      ),
    }));

    return rankAvailableSupervisors(
      ideaContext.domain,
      ideaContext.skills,
      ideaEmbedding,
      supInputs
    );
  }, [ideaContext, programFilter, supervisors]);

  const visibleMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return availableMatches.filter((match) => {
      if (onlyStrongFit && match.matchPercentage < 80) return false;
      if (!q) return true;
      const rawSup = supervisors.find((s) => s.id === match.supervisorProfileId);
      const haystack = [
        match.fullName,
        match.title,
        rawSup?.programCode ?? "",
        ...(rawSup?.researchDomains ?? []),
        ...(rawSup?.preferredStacks ?? []),
        rawSup?.bio ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [availableMatches, onlyStrongFit, searchQuery, supervisors]);

  const totalOpenSlots = useMemo(
    () =>
      supervisors.reduce(
        (acc, s) => acc + (s.isAccepting ? Math.max(0, s.maxSlots - s.activeSlots) : 0),
        0
      ),
    [supervisors]
  );

  const totalMaxSlots = useMemo(
    () => supervisors.reduce((acc, s) => acc + s.maxSlots, 0),
    [supervisors]
  );

  const activePendingCount = sentRequests.filter((r) => r.status === "PENDING").length;

  async function handleSubmitPitch() {
    if (!modalSupervisor) return;

    if (!selectedIdeaId) {
      setBannerMessage({
        type: "error",
        text: "Generate your 3-Track FYP Recommendations first so your supervision pitch links to a vetted proposal.",
      });
      setModalSupervisor(null);
      return;
    }

    if (activePendingCount >= 3) {
      setBannerMessage({
        type: "error",
        text: "You can maintain at most 3 pending supervision requests simultaneously. Withdraw one first.",
      });
      setModalSupervisor(null);
      return;
    }

    if (pitchText.trim().length < 40) {
      setBannerMessage({
        type: "error",
        text: "Student pitch must be at least 40 characters.",
      });
      return;
    }

    setIsSubmittingPitch(true);
    const res = await createSupervisionRequest({
      recommendedIdeaId: selectedIdeaId,
      supervisorProfileId: modalSupervisor.id,
      studentPitch: pitchText.trim(),
    });
    setIsSubmittingPitch(false);

    if (!res.ok) {
      setBannerMessage({
        type: "error",
        text: res.error.message,
      });
      setModalSupervisor(null);
      return;
    }

    const newReq: StoredSupervisionRequest = {
      id: res.data.requestId,
      supervisorProfileId: modalSupervisor.id,
      supervisorName: modalSupervisor.fullName,
      ideaId: selectedIdeaId,
      ideaTitle: ideaContext.title,
      track: ideaContext.track,
      feasibilityScore: ideaContext.feasibilityScore,
      skillGapsSummary:
        activeIdea?.skillGaps
          .map((g) => `${g.skillSlug} (${g.estimatedLearnHours}h)`)
          .join(", ") || "Zero critical skill gaps",
      pitch: pitchText.trim(),
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    const nextRequests = [newReq, ...sentRequests];
    setSentRequests(nextRequests);
    saveStoredSupervisionRequests(nextRequests);

    setBannerMessage({
      type: "success",
      text: `Supervision request dispatched to ${modalSupervisor.fullName} and synced to the Faculty Supervisor Portal.`,
    });
    setModalSupervisor(null);
  }

  async function handleWithdraw(reqId: string) {
    const res = await withdrawSupervisionRequest({ requestId: reqId });
    if (!res.ok) {
      setBannerMessage({
        type: "error",
        text: res.error.message,
      });
      return;
    }
    const nextRequests = sentRequests.map((r) =>
      r.id === reqId ? { ...r, status: "WITHDRAWN" as const } : r
    );
    setSentRequests(nextRequests);
    saveStoredSupervisionRequests(nextRequests);
    setBannerMessage({
      type: "success",
      text: "Pending request withdrawn; 1 request quota slot freed.",
    });
  }

  return (
    <div className="space-y-6">
      {/* Stitch Top Academic Context Header & Telemetry */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#3F72AF]">
          <span className="font-medium">Student Portal</span>
          <span className="text-outline-variant">/</span>
          <span className="font-medium">Supervisor Matching</span>
          <span className="text-outline-variant">/</span>
          <span className="bg-[#DBE2EF] px-2 py-0.5 rounded text-[#112D4E] font-semibold">
            {portalSession.batchLabel || "Department of IT & Computing"}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-[#112D4E] tracking-tight font-bold">
              Find Your Faculty Supervisor
            </h1>
            <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
              Ranked across BSIT, BSCS, BSSE, BSAI, BSCY, and BSDS using{" "}
              <strong className="text-[#112D4E] font-semibold">
                70% Domain · 20% Skill · 10% Capacity
              </strong>{" "}
              alignment with strict quota protection.
            </p>
          </div>

          {/* Telemetry Strip */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-[#DBE2EF] text-xs shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#71C9CE]" />
              <span className="text-on-surface-variant">Faculty Mentors:</span>
              <span className="font-mono-tabular font-semibold text-[#112D4E]">
                {supervisors.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-[#DBE2EF] text-xs shadow-xs">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[16px] text-[#3F72AF]"
              >
                analytics
              </span>
              <span className="text-on-surface-variant">Open Slots:</span>
              <span className="font-mono-tabular font-semibold text-[#112D4E]">
                {totalOpenSlots} <span className="text-outline font-normal">/ {totalMaxSlots}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E3FDFD] border border-[#71C9CE]/50 text-[#004F53] text-xs font-semibold shadow-xs">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                verified_user
              </span>
              <span>Pending Requests: {activePendingCount} / 3 Max</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stitch Filter & Search Bar */}
      <section className="p-4 sm:p-5 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3 flex flex-col gap-1">
            <label className="text-[11px] text-[#3F72AF] uppercase font-semibold tracking-wider">
              Degree Program
            </label>
            <Select
              aria-label="Filter IT Program"
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
            >
              <option value="ALL">All IT &amp; Computing Faculty</option>
              <option value="BSIT">BSIT Faculty</option>
              <option value="BSCS">BSCS Faculty</option>
              <option value="BSSE">BSSE Faculty</option>
              <option value="BSAI">BSAI Faculty</option>
              <option value="BSCY">BSCY Faculty</option>
              <option value="BSDS">BSDS Faculty</option>
            </Select>
          </div>

          <div className="md:col-span-5 flex flex-col gap-1">
            <label className="text-[11px] text-[#3F72AF] uppercase font-semibold tracking-wider">
              Your Capstone Project
            </label>
            {availableIdeas.length > 0 ? (
              <Select
                aria-label="Shortlisted Idea Filter"
                value={selectedIdeaId}
                onChange={(e) => setSelectedIdeaId(e.target.value)}
              >
                {availableIdeas.map((idea) => (
                  <option key={idea.id} value={idea.id}>
                    {formatTrackLabel(idea.track)} — {idea.title}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex h-10 items-center justify-between rounded-lg border border-[#DBE2EF] bg-[#F9F7F7] px-3 text-xs text-on-surface-variant">
                <span className="truncate">No proposal generated yet</span>
                <Link
                  href="/dashboard/recommendations"
                  className="ml-2 shrink-0 font-semibold text-[#2A609C] hover:underline"
                >
                  Generate →
                </Link>
              </div>
            )}
          </div>

          <div className="md:col-span-4 flex flex-col gap-1">
            <label className="text-[11px] text-[#3F72AF] uppercase font-semibold tracking-wider">
              Search Faculty or Topics
            </label>
            <div className="relative flex items-center">
              <span
                aria-hidden="true"
                className="material-symbols-outlined absolute left-3 text-[18px] text-[#3F72AF] pointer-events-none"
              >
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, research area, or stack..."
                aria-label="Search faculty or topics"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#F9F7F7] border border-[#DBE2EF] text-sm text-on-surface placeholder:text-outline focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3F72AF]/40"
              />
            </div>
          </div>
        </div>

        {/* Interactive Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-on-surface-variant mr-1">Filter by:</span>
            <button
              type="button"
              onClick={() => setOnlyStrongFit((prev) => !prev)}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                onlyStrongFit
                  ? "bg-[#112D4E] text-white"
                  : "bg-[#DBE2EF]/70 text-[#112D4E] hover:bg-[#DBE2EF]"
              }`}
            >
              {onlyStrongFit && (
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                  check
                </span>
              )}
              <span>Strong Fit (&gt;= 80%)</span>
            </button>

            <span className="px-3 py-1 rounded-full bg-[#E3FDFD] border border-[#71C9CE]/50 text-[#004F53] text-xs font-semibold flex items-center gap-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                check_circle
              </span>
              <span>Open Capacity Verified ({visibleMatches.length})</span>
            </span>
          </div>

          <span className="text-xs text-[#3F72AF] font-medium">
            Sorted by Composite Compatibility
          </span>
        </div>
      </section>

      {bannerMessage && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-medium ${
            bannerMessage.type === "success"
              ? "border-[#71C9CE]/60 bg-[#E3FDFD] text-[#004F53]"
              : "border-error/30 bg-error-container/60 text-on-error-container"
          }`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px] shrink-0">
            {bannerMessage.type === "success" ? "check_circle" : "error"}
          </span>
          <span>{bannerMessage.text}</span>
        </div>
      )}

      {viewState === "LOADING" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {viewState === "ERROR" && (
        <div className="rounded-xl border border-error/30 bg-error-container/50 p-6 space-y-3">
          <h2 className="font-headline-sm text-lg font-bold text-on-error-container">
            Supervisor Slot Availability Check Failed
          </h2>
          <p className="text-xs text-on-error-container">
            Could not verify live supervision quotas from the department database.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry Faculty Query
          </Button>
        </div>
      )}

      {viewState === "EMPTY" && (
        <div className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest p-6 sm:p-8 space-y-3 shadow-xs">
          <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
            No Provisioned Faculty Supervisors Available Yet
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl">
            Once department faculty supervisors are provisioned by the Admin Command Center and
            publish open supervision capacity, they will appear here ranked by alignment with your
            shortlisted FYP proposal.
          </p>
          <Button asChild>
            <Link href="/dashboard/recommendations">View FYP Recommendations</Link>
          </Button>
        </div>
      )}

      {viewState === "POPULATED" && (
        <>
          {/* Main 2-Column Faculty Match Grid */}
          {visibleMatches.length === 0 ? (
            <div className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest p-6 text-center space-y-2">
              <p className="text-sm font-semibold text-[#112D4E]">
                No open-capacity supervisors match your current filter criteria.
              </p>
              <button
                type="button"
                onClick={() => {
                  setProgramFilter("ALL");
                  setSearchQuery("");
                  setOnlyStrongFit(false);
                }}
                className="text-xs font-semibold text-[#2A609C] hover:underline"
              >
                Reset Program &amp; Search Filters
              </button>
            </div>
          ) : (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {visibleMatches.map((match, idx) => {
                const rawSup = supervisors.find((s) => s.id === match.supervisorProfileId);
                const alreadyRequested = sentRequests.some(
                  (r) =>
                    r.supervisorProfileId === match.supervisorProfileId &&
                    r.ideaId === selectedIdeaId &&
                    r.status === "PENDING"
                );
                const stripClass =
                  idx % 3 === 0
                    ? "bg-[#112D4E]"
                    : idx % 3 === 1
                      ? "bg-[#3F72AF]"
                      : "bg-[#71C9CE]";

                return (
                  <article
                    key={match.supervisorProfileId}
                    className="rounded-xl bg-surface-container-lowest p-5 sm:p-6 border border-[#DBE2EF] shadow-xs flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden animate-fade-in-up"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1 ${stripClass}`} />

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#DBE2EF]/60">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#112D4E] text-white font-mono-tabular text-xs font-semibold">
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined text-[14px] text-[#71C9CE]"
                            >
                              verified
                            </span>
                            {match.matchPercentage}% Match
                          </span>
                          <span className="text-xs text-[#3F72AF] font-medium">
                            Rank #{match.rank}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono-tabular text-xs font-semibold ${
                            match.availabilityAtMatch === 1
                              ? "bg-error-container text-on-error-container"
                              : "bg-[#E3FDFD] border border-[#71C9CE]/50 text-[#004F53]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              match.availabilityAtMatch === 1 ? "bg-error" : "bg-[#004F53]"
                            }`}
                          />
                          {match.availabilityAtMatch} of {match.maxSlots} slots open
                        </span>
                      </div>

                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#112D4E] text-white flex items-center justify-center font-headline-sm text-base sm:text-lg font-bold shrink-0 shadow-xs">
                          {getInitials(match.fullName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-title-md text-base sm:text-[18px] font-bold text-[#112D4E] truncate">
                              {match.fullName}
                            </h2>
                            <span className="px-2 py-0.5 rounded bg-[#DBE2EF]/70 text-[#112D4E] text-[11px] font-semibold">
                              {rawSup?.programCode ?? "BSCS"}
                            </span>
                          </div>
                          <p className="text-xs sm:text-[13px] text-[#3F72AF] font-medium mt-0.5">
                            {match.title}
                          </p>
                          <p className="text-[11px] text-on-surface-variant mt-1 truncate">
                            {rawSup?.email}
                          </p>
                        </div>
                      </div>

                      {/* Research Domain Chips */}
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {(rawSup?.researchDomains ?? match.sharedKeywords).map((dom) => (
                          <span
                            key={dom}
                            className="px-2.5 py-0.5 rounded-md bg-[#DBE2EF]/60 text-[#112D4E] text-[11px] font-semibold"
                          >
                            {dom}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs sm:text-[13px] text-on-surface-variant mt-3 leading-relaxed">
                        {rawSup?.bio ?? match.rationale}
                      </p>

                      {/* Preferred Stacks & Capacity Strip */}
                      <div className="mt-4 p-3 rounded-lg bg-[#F9F7F7] border border-[#DBE2EF]/70 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex items-center gap-1.5 text-[#3F72AF] font-medium shrink-0">
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined text-[16px]"
                            >
                              layers
                            </span>
                            Preferred Stack:
                          </span>
                          <span className="font-mono-tabular text-xs font-semibold text-[#112D4E] truncate">
                            {(rawSup?.preferredStacks ?? []).slice(0, 4).join(" · ") ||
                              "TypeScript · PostgreSQL"}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-on-surface-variant">Slot Saturation</span>
                            <span className="font-mono-tabular font-semibold text-[#112D4E]">
                              {match.activeSlots} / {match.maxSlots} filled
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#DBE2EF]">
                            <div
                              className="h-full bg-[#2A609C] rounded-full"
                              style={{
                                width: `${Math.min(100, (match.activeSlots / Math.max(1, match.maxSlots)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 pt-4 mt-4 border-t border-[#DBE2EF]/60">
                      <button
                        type="button"
                        disabled={alreadyRequested || activePendingCount >= 3}
                        onClick={() =>
                          setModalSupervisor({
                            id: match.supervisorProfileId,
                            fullName: match.fullName,
                            title: match.title,
                            programCode: rawSup?.programCode ?? "BSCS",
                          })
                        }
                        className="flex-1 h-10 px-4 rounded-lg bg-[#112D4E] hover:bg-[#3F72AF] disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[17px]">
                          send
                        </span>
                        <span>
                          {alreadyRequested
                            ? "Supervision Request Pending"
                            : "Request Supervision"}
                        </span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {/* Collapsible Section: Currently at Full Capacity */}
          <section className="rounded-xl bg-surface-container-lowest border border-[#DBE2EF] shadow-xs overflow-hidden">
            <button
              type="button"
              aria-expanded={showFullCapacity}
              onClick={() => setShowFullCapacity((prev) => !prev)}
              className="w-full flex flex-wrap items-center justify-between gap-2 p-4 cursor-pointer bg-[#DBE2EF]/35 hover:bg-[#DBE2EF]/60 transition-colors text-left"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-[20px] text-[#3F72AF] transition-transform duration-200 ${
                    showFullCapacity ? "rotate-180" : ""
                  }`}
                >
                  expand_circle_down
                </span>
                <span className="font-title-md text-sm sm:text-base font-semibold text-[#112D4E]">
                  Currently at Full Capacity
                </span>
                <span className="bg-surface-container-lowest border border-[#DBE2EF] px-2.5 py-0.5 rounded text-[#3F72AF] text-[11px] font-semibold">
                  {fullCapacitySupervisors.length} Faculty Members · 0 Open Slots
                </span>
              </div>
              <span className="text-xs font-medium text-[#3F72AF]">
                {showFullCapacity ? "Hide Full Capacity" : "Inspect Full Capacity"}
              </span>
            </button>

            {showFullCapacity && (
              <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface-container-lowest border-t border-[#DBE2EF]">
                {fullCapacitySupervisors.length === 0 ? (
                  <p className="text-xs text-on-surface-variant md:col-span-3">
                    All faculty supervisors in this filter currently have open supervision slots.
                  </p>
                ) : (
                  fullCapacitySupervisors.map((sup) => (
                    <div
                      key={sup.id}
                      className="p-4 rounded-lg bg-[#F9F7F7] border border-[#DBE2EF] opacity-85 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-mono-tabular text-[11px] font-semibold">
                            {sup.activeSlots}/{sup.maxSlots} Filled (FULL)
                          </span>
                        </div>
                        <h3 className="font-title-md text-sm font-bold text-[#112D4E]">
                          {sup.fullName}
                        </h3>
                        <p className="text-xs text-[#3F72AF] mt-0.5">{sup.title}</p>
                        <p className="text-xs text-on-surface-variant mt-2">
                          Domains: {sup.researchDomains.join(", ")}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-[#DBE2EF] flex items-center justify-between">
                        <span className="text-[11px] text-error font-semibold">
                          Quota Limit Reached
                        </span>
                        <span className="px-2.5 py-1 rounded bg-surface-container text-outline text-[11px] font-medium">
                          Unavailable
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>

          {/* Submitted Supervision Interest Requests Ledger */}
          <section className="rounded-xl bg-surface-container-lowest border border-[#DBE2EF] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-[#DBE2EF]/70 pb-3">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[#3F72AF] text-[20px]"
                >
                  send
                </span>
                <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
                  Your Submitted Supervision Interest Requests
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                Students may maintain up to 3 active PENDING requests simultaneously.
              </p>
            </div>

            {sentRequests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#DBE2EF] bg-[#F9F7F7] p-6 text-center text-xs text-on-surface-variant">
                No supervision requests submitted yet. Choose a matched supervisor above and click{" "}
                <strong className="text-[#112D4E]">Request Supervision</strong> to dispatch your
                proposal pitch.
              </div>
            ) : (
              <div className="space-y-3">
                {sentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#DBE2EF] bg-[#F9F7F7]/60 p-4"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            req.status === "ACCEPTED"
                              ? "bg-[#E3FDFD] text-[#004F53] border border-[#71C9CE]/50"
                              : req.status === "PENDING"
                                ? "bg-[#FEF3C7] text-[#92400E]"
                                : "bg-surface-container text-on-surface-variant"
                          }`}
                        >
                          {req.status}
                        </span>
                        <span className="text-sm font-bold text-[#112D4E]">
                          {req.supervisorName}
                        </span>
                        <span className="text-xs text-[#3F72AF]">· {req.ideaTitle}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant">{req.pitch}</p>
                      {req.supervisorNote && (
                        <p className="text-xs font-medium text-[#112D4E] pt-0.5">
                          Faculty Feedback: {req.supervisorNote}
                        </p>
                      )}
                    </div>

                    {req.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWithdraw(req.id)}
                        className="shrink-0"
                      >
                        Withdraw Request
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Stitch Supervision Pitch Modal */}
      <Dialog
        open={modalSupervisor !== null}
        onOpenChange={(open) => {
          if (!open) setModalSupervisor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#112D4E]">
              Send Supervision Request to {modalSupervisor?.fullName}
            </DialogTitle>
            <DialogDescription>
              Proposal: <strong className="text-[#112D4E]">{ideaContext.title}</strong> (Feasibility{" "}
              {ideaContext.feasibilityScore}/100). Your structured pitch (40–1000 chars) will be
              dispatched to the Faculty Supervisor Portal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-[#112D4E]">
                  Your Pitch &amp; Domain Alignment
                </label>
                <span className="font-mono-tabular text-on-surface-variant">
                  {pitchText.length} / 1000 chars
                </span>
              </div>
              <Textarea
                value={pitchText}
                onChange={(e) => setPitchText(e.target.value)}
                rows={5}
              />
            </div>

            <div className="p-3 rounded-lg bg-[#E3FDFD] border border-[#71C9CE]/50 text-[#004F53] text-xs">
              Submitting this uses <strong>1 of your 3 active pending request slots</strong>.
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalSupervisor(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitPitch}
              disabled={isSubmittingPitch || pitchText.trim().length < 40}
            >
              {isSubmittingPitch ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StudentSupervisorsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <StudentSupervisorsWorkspace />
    </Suspense>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalSession } from "@/components/layout/portal-session-context";
import {
  buildCalibratedProjectRoadmap,
  formatRoadmapAsMarkdown,
  type PlannedMilestoneItem,
  type PlannedRoadmapResult,
} from "@/lib/recommendation/roadmap-planner";
import {
  generateProjectRoadmap,
  toggleMilestoneStatus,
  exportRoadmapMarkdown,
} from "@/actions/roadmap.actions";
import { getActiveRecommendationsSnapshot } from "@/actions/recommendation.actions";
import { getRoadmapWorkspaceData } from "@/actions/workspace.actions";
import {
  loadStoredMilestoneStatuses,
  saveStoredMilestoneStatuses,
  formatTrackLabel,
} from "@/lib/workspace-store";
import type { GeneratedIdeaRecord } from "@/lib/recommendation/engine";
import { AppIcon } from "@/components/ui/app-icon";
import { formatPakistanRoadmapPhaseDates } from "@/lib/time/pakistan-time";
import { openFormalProposalPrintWindow } from "@/lib/export/csv-and-proposal";

export default function RoadmapDetailPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const portalSession = usePortalSession();
  const ideaId = params?.id ?? "";

  const [storedIdeas, setStoredIdeas] = useState<GeneratedIdeaRecord[]>([]);
  const [serverRoadmap, setServerRoadmap] = useState<PlannedRoadmapResult | null>(null);
  const [roadmapId, setRoadmapId] = useState<string>(`roadmap_${ideaId}`);
  const [serverIdeaTitle, setServerIdeaTitle] = useState<string>("");
  const [serverDomain, setServerDomain] = useState<string>("Software Engineering");
  const [durationWeeks, setDurationWeeks] = useState(24);
  const [weeklyHours, setWeeklyHours] = useState(15);
  const [totalSkillGapHours, setTotalSkillGapHours] = useState(0);
  const [milestoneStatusOverrides, setMilestoneStatusOverrides] = useState<
    Record<string, "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED">
  >({});
  const [viewState, setViewState] = useState<"POPULATED" | "LOADING" | "EMPTY" | "ERROR">(
    "LOADING"
  );
  const [exportedMarkdown, setExportedMarkdown] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const localStatuses = loadStoredMilestoneStatuses();
    Promise.all([getRoadmapWorkspaceData(ideaId), getActiveRecommendationsSnapshot()])
      .then(([rmData, snap]) => {
        setDurationWeeks(rmData.roadmap?.durationWeeks ?? snap.durationWeeks);
        setWeeklyHours(rmData.roadmap?.weeklyHours ?? snap.weeklyHours);

        if (snap.ideas && snap.ideas.length > 0) {
          setStoredIdeas(snap.ideas);
          const matched = snap.ideas.find((i) => i.id === ideaId) ?? snap.ideas[0];
          if (matched) {
            const gapSum = matched.skillGaps.reduce(
              (acc, g) => acc + g.estimatedLearnHours,
              0
            );
            setTotalSkillGapHours(gapSum);
          }
        }

        if (rmData.found && rmData.roadmap) {
          setServerRoadmap(rmData.roadmap);
          if (rmData.roadmapId) setRoadmapId(rmData.roadmapId);
          setServerIdeaTitle(rmData.ideaTitle);
          setServerDomain(rmData.domain);
          setMilestoneStatusOverrides({
            ...localStatuses,
            ...rmData.milestoneStatuses,
          });
          setViewState("POPULATED");
        } else if (snap.ideas && snap.ideas.length > 0) {
          setMilestoneStatusOverrides(localStatuses);
          setViewState("POPULATED");
        } else {
          setViewState("EMPTY");
        }
      })
      .catch(() => {
        setViewState("EMPTY");
      });
  }, [ideaId]);

  const activeIdea = useMemo(() => {
    return storedIdeas.find((i) => i.id === ideaId) ?? storedIdeas[0] ?? null;
  }, [storedIdeas, ideaId]);

  const ideaMetadata = useMemo(() => {
    if (activeIdea) {
      return {
        id: activeIdea.id,
        title: activeIdea.title,
        domain: activeIdea.domain,
        track: activeIdea.track,
        feasibilityScore: activeIdea.feasibilityScore,
        skillGapSlugs:
          activeIdea.skillGaps.length > 0
            ? activeIdea.skillGaps.map((g) => g.skillSlug)
            : ["typescript", "postgresql"],
        stack: activeIdea.recommendedStack.map((s) => s.tech),
      };
    }
    return {
      id: ideaId,
      title: serverIdeaTitle || "Selected Capstone Proposal",
      domain: serverDomain,
      track: "CORE_SAFE" as const,
      feasibilityScore: 85,
      skillGapSlugs: ["typescript", "postgresql"],
      stack: ["Next.js", "TypeScript", "PostgreSQL"],
    };
  }, [activeIdea, ideaId, serverDomain, serverIdeaTitle]);

  const computedRoadmap = useMemo(
    () =>
      buildCalibratedProjectRoadmap({
        ideaTitle: ideaMetadata.title,
        domain: ideaMetadata.domain,
        durationWeeks,
        weeklyHours,
        totalSkillGapHours,
        skillGapSlugs: ideaMetadata.skillGapSlugs,
        recommendedStack: ideaMetadata.stack,
      }),
    [ideaMetadata, durationWeeks, weeklyHours, totalSkillGapHours]
  );

  const baseRoadmap =
    serverRoadmap &&
    serverRoadmap.durationWeeks === durationWeeks &&
    serverRoadmap.weeklyHours === weeklyHours
      ? serverRoadmap
      : computedRoadmap;

  const milestones: PlannedMilestoneItem[] = baseRoadmap.milestones.map((m) => ({
    ...m,
    status: milestoneStatusOverrides[m.id] ?? m.status,
  }));

  const progressPercent = useMemo(() => {
    if (milestones.length === 0) return 0;
    const weightedSum = milestones.reduce((acc, m) => {
      if (m.status === "COMPLETED") return acc + 100;
      if (m.status === "IN_PROGRESS") return acc + 50;
      return acc;
    }, 0);
    return Math.round(weightedSum / milestones.length);
  }, [milestones]);

  const completedCount = milestones.filter((m) => m.status === "COMPLETED").length;

  async function handleDurationChange(nextWeeks: number) {
    setDurationWeeks(nextWeeks);
    if (!ideaMetadata.id) return;

    const res = await generateProjectRoadmap({
      recommendedIdeaId: ideaMetadata.id,
      regenerate: true,
      durationWeeks: nextWeeks,
      weeklyHours,
    });

    if (res.ok) {
      setServerRoadmap(res.data.roadmap);
      setRoadmapId(res.data.roadmapId);
      setSyncMessage(`Recalibrated 4-phase sprint plan to ${nextWeeks} weeks.`);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  }

  async function handleCycleStatus(ms: PlannedMilestoneItem) {
    const nextStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" =
      ms.status === "NOT_STARTED"
        ? "IN_PROGRESS"
        : ms.status === "IN_PROGRESS"
          ? "COMPLETED"
          : "NOT_STARTED";

    setMilestoneStatusOverrides((prev) => {
      const updated = {
        ...prev,
        [ms.id]: nextStatus,
      };
      saveStoredMilestoneStatuses(updated);
      return updated;
    });

    const res = await toggleMilestoneStatus({
      milestoneId: ms.id,
      status: nextStatus,
      recommendedIdeaId: ideaMetadata.id || undefined,
    });

    if (res.ok) {
      setSyncMessage(`Phase ${ms.phaseNumber} status saved as ${nextStatus.replace("_", " ")}.`);
      setTimeout(() => setSyncMessage(null), 2500);
    }
  }

  async function handleExportMarkdown() {
    const localMarkdown = formatRoadmapAsMarkdown({
      ideaTitle: ideaMetadata.title,
      roadmap: {
        ...baseRoadmap,
        milestones,
      },
    });
    setExportedMarkdown(localMarkdown);

    const res = await exportRoadmapMarkdown({
      roadmapId: roadmapId || `roadmap_${ideaId}`,
      ideaTitle: ideaMetadata.title,
      durationWeeks,
      weeklyHours,
      totalSkillGapHours,
    });

    if (res.ok) {
      setExportedMarkdown(res.data.markdown);
    }
  }

  function handleDownloadFile() {
    if (!exportedMarkdown) return;
    const blob = new Blob([exportedMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ProjectCompass-Roadmap-${ideaMetadata.track.toLowerCase()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleCopyMarkdown() {
    if (!exportedMarkdown) return;
    try {
      await navigator.clipboard.writeText(exportedMarkdown);
      setCopyStatus("Copied to clipboard!");
      setTimeout(() => setCopyStatus(null), 2500);
    } catch {
      setCopyStatus("Markdown ready below");
    }
  }

  return (
    <div className="space-y-6">
      {/* Stitch Top Deep Navy to Slate Blue Gradient Banner (Strict White High-Contrast Text!) */}
      <section className="relative w-full rounded-xl bg-gradient-to-r from-[#112D4E] to-[#3F72AF] p-5 sm:p-8 text-white overflow-hidden shadow-md">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-[#71C9CE]/20 blur-3xl pointer-events-none"
        />

        <div className="relative z-10 flex flex-col gap-5">
          {/* Top Meta Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3FDFD] text-[#112D4E] text-xs font-semibold shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3F72AF]" />
                {formatTrackLabel(ideaMetadata.track)} (Feasibility {ideaMetadata.feasibilityScore}
                /100)
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-medium">
                {ideaMetadata.domain}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 font-mono-tabular text-xs text-white/95">
              <span className="px-2.5 py-1 rounded bg-white/15">
                {baseRoadmap.durationWeeks} Weeks Total
              </span>
              <span className="px-2.5 py-1 rounded bg-white/15">
                {baseRoadmap.prepWeeksAllocated} Prep Weeks
              </span>
              <span className="px-2.5 py-1 rounded bg-white/15">
                {baseRoadmap.weeklyHours} hrs/wk
              </span>
            </div>
          </div>

          {/* High-Contrast White Headline & Summary */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#E3FDFD] text-xs uppercase tracking-wider font-semibold">
              <AppIcon name="alt_route" className="text-[16px]" />
              <span>Sprint Roadmap · {portalSession.identifier || "Student Workspace"}</span>
            </div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl !text-white font-bold tracking-tight max-w-4xl leading-snug">
              {ideaMetadata.title}
            </h1>
            <p className="text-xs sm:text-sm text-white/90 max-w-3xl leading-relaxed">
              {baseRoadmap.summary}
            </p>
          </div>

          {/* 4-Phase Progress Bar Matrix */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 space-y-3 border border-white/15">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white">
              <span className="flex items-center gap-1.5 font-semibold">
                <AppIcon name="timelapse" className="text-[16px] text-[#71C9CE]" />
                Overall Progress:{" "}
                <strong className="font-mono-tabular text-[#E3FDFD]">
                  {progressPercent}% Complete
                </strong>
              </span>
              <span className="font-mono-tabular text-white/85">
                {completedCount} of {milestones.length} Phases Signed Off
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {milestones.map((ms) => {
                const barWidth =
                  ms.status === "COMPLETED"
                    ? "w-full"
                    : ms.status === "IN_PROGRESS"
                      ? "w-1/2"
                      : "w-0";
                const pctText =
                  ms.status === "COMPLETED"
                    ? "100%"
                    : ms.status === "IN_PROGRESS"
                      ? "Active"
                      : "0%";
                return (
                  <div key={ms.id} className="space-y-1">
                    <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
                      <div
                        className={`h-full bg-[#71C9CE] rounded-full transition-all duration-300 ${barWidth}`}
                      />
                    </div>
                    <div className="flex items-center justify-between font-mono-tabular text-[11px] pt-0.5">
                      <span className="text-white font-semibold">
                        P{ms.phaseNumber}: W{String(ms.weekStart).padStart(2, "0")}–W
                        {String(ms.weekEnd).padStart(2, "0")}
                      </span>
                      <span className="text-[#E3FDFD] font-semibold">{pctText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Banner Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-white/90">
              <AppIcon name="verified" className="text-[16px] text-[#71C9CE]" />
              <span>Deterministic Sum Invariant: Sum(Phase Weeks) = {baseRoadmap.durationWeeks}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeIdea && (
                <button
                  type="button"
                  onClick={() =>
                    openFormalProposalPrintWindow({
                      studentName: portalSession.userName,
                      identifier: portalSession.identifier,
                      batchLabel: portalSession.batchLabel,
                      idea: activeIdea,
                      milestones,
                      durationWeeks: baseRoadmap.durationWeeks,
                      weeklyHours,
                    })
                  }
                  data-testid="print-proposal-pdf-btn"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/30 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                >
                  <AppIcon name="description" className="text-[16px]" />
                  <span>Print Proposal PDF</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExportMarkdown}
                data-testid="export-markdown-btn"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E3FDFD] hover:bg-white text-[#112D4E] text-xs font-bold transition-all shadow-sm"
              >
                <AppIcon name="download_for_offline" className="text-[18px]" />
                <span>Export Markdown (.md)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stitch Control & Adjustment Strip */}
      <section className="bg-surface-container-lowest rounded-xl shadow-xs border border-[#DBE2EF] p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
          {storedIdeas.length > 0 && (
            <div className="flex flex-col gap-1 min-w-0 sm:w-64">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#3F72AF]">
                Active Capstone Track
              </label>
              <Select
                aria-label="Switch Idea Roadmap"
                value={activeIdea?.id ?? ""}
                onChange={(e) => router.push(`/dashboard/roadmaps/${e.target.value}`)}
              >
                {storedIdeas.map((idea) => (
                  <option key={idea.id} value={idea.id}>
                    {formatTrackLabel(idea.track)} — {idea.title}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1 sm:w-44">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#3F72AF]">
              Cycle Timeline Scope
            </label>
            <Select
              aria-label="Semester Length"
              value={String(durationWeeks)}
              onChange={(e) => handleDurationChange(Number(e.target.value))}
              className="font-mono-tabular"
            >
              {![12, 16, 24, 36].includes(durationWeeks) && (
                <option value={String(durationWeeks)}>{durationWeeks} Weeks</option>
              )}
              <option value="12">12 Weeks</option>
              <option value="16">16 Weeks</option>
              <option value="24">24 Weeks</option>
              <option value="36">36 Weeks</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1 sm:w-52">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#3F72AF]">
              Skill-Gap Overhead
            </label>
            <Select
              aria-label="Skill Gap Hours"
              value={String(totalSkillGapHours)}
              onChange={(e) => setTotalSkillGapHours(Number(e.target.value))}
              className="font-mono-tabular"
            >
              {![0, 14, 22, 32, 55].includes(totalSkillGapHours) && (
                <option value={String(totalSkillGapHours)}>
                  {totalSkillGapHours} hrs ({baseRoadmap.prepWeeksAllocated} wks prep)
                </option>
              )}
              <option value="0">0 hrs (1 wk prep)</option>
              <option value="14">14 hrs (2 wks prep)</option>
              <option value="22">22 hrs (3 wks prep)</option>
              <option value="32">32 hrs (4 wks prep)</option>
              <option value="55">55 hrs (6 wks cap)</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#F9F7F7] border border-[#DBE2EF] font-mono-tabular text-xs font-semibold text-[#112D4E]">
            Phase Math: {baseRoadmap.phaseWeekCounts.join(" + ")} = {baseRoadmap.durationWeeks} Wks
          </div>
          {syncMessage && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E3FDFD] text-[#004F53] text-xs font-semibold">
              <AppIcon name="check_circle" className="text-[14px]" />
              {syncMessage}
            </span>
          )}
        </div>
      </section>

      {/* Exported Markdown Card */}
      {exportedMarkdown && (
        <section
          className="rounded-xl border border-[#3F72AF]/50 bg-surface-container-lowest p-5 shadow-sm space-y-3"
          data-testid="exported-markdown-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-headline-sm text-base font-bold text-[#112D4E]">
              Exported Clean Markdown (GitHub README &amp; FYP Proposal Ready)
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {copyStatus && (
                <span className="text-xs font-semibold text-[#004F53]">{copyStatus}</span>
              )}
              <Button size="sm" variant="outline" onClick={handleCopyMarkdown}>
                Copy Markdown
              </Button>
              <Button size="sm" onClick={handleDownloadFile}>
                Download .md File
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setExportedMarkdown(null)}>
                Close
              </Button>
            </div>
          </div>
          <pre className="max-h-72 overflow-y-auto rounded-lg border border-[#DBE2EF] bg-[#F9F7F7] p-4 font-mono-tabular text-xs text-[#112D4E] whitespace-pre-wrap">
            {exportedMarkdown}
          </pre>
        </section>
      )}

      {viewState === "LOADING" && (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      )}

      {viewState === "ERROR" && (
        <div className="rounded-xl border border-error/30 bg-error-container/50 p-6 space-y-3">
          <h2 className="font-headline-sm text-lg font-bold text-on-error-container">
            Roadmap Synchronization Error
          </h2>
          <Button variant="outline" onClick={() => setViewState("POPULATED")}>
            Retry Sync
          </Button>
        </div>
      )}

      {viewState === "EMPTY" && (
        <div className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest p-6 sm:p-8 space-y-3 shadow-xs">
          <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
            No FYP Proposal Selected for Roadmap Yet
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl">
            Generate your 3-Track FYP Recommendations first, then click Build Roadmap on any
            proposal to create and track your calibrated 4-phase semester execution plan.
          </p>
          <Button onClick={() => router.push("/dashboard/recommendations")}>
            Go to FYP Recommendations
          </Button>
        </div>
      )}

      {/* Stitch Vertical 4-Phase Execution Timeline */}
      {viewState === "POPULATED" && (
        <div className="relative pl-7 sm:pl-10 space-y-6">
          {/* Continuous Vertical Track Line */}
          <div
            aria-hidden="true"
            className="absolute left-2.5 sm:left-4 top-4 bottom-8 w-0.5 bg-[#DBE2EF]"
          />

          {milestones.map((ms) => {
            const weekBadge = `W${String(ms.weekStart).padStart(2, "0")}–W${String(ms.weekEnd).padStart(2, "0")}`;
            const isDone = ms.status === "COMPLETED";
            const isActive = ms.status === "IN_PROGRESS";

            return (
              <article
                key={ms.id}
                data-testid={`milestone-card-${ms.phaseNumber}`}
                className="relative flex flex-col gap-3 animate-fade-in-up"
              >
                {/* Timeline Node Marker */}
                <div
                  className={`absolute -left-7 sm:-left-10 top-1 w-6 h-6 rounded-full flex items-center justify-center shadow-xs ring-4 ring-[#F9F7F7] ${
                    isDone
                      ? "bg-[#71C9CE] text-[#112D4E]"
                      : isActive
                        ? "bg-[#3F72AF] text-white"
                        : "bg-[#DBE2EF] text-[#112D4E]"
                  }`}
                >
                  {isDone ? (
                    <AppIcon name="check" className="text-[14px] font-bold" />
                  ) : (
                    <span className="font-mono-tabular text-[11px] font-bold">
                      {ms.phaseNumber}
                    </span>
                  )}
                </div>

                {/* Phase Card */}
                <div
                  className={`bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-[#DBE2EF] shadow-xs hover:shadow-md transition-all ${
                    isActive ? "border-t-2 border-t-[#3F72AF]" : ""
                  }`}
                >
                  {/* Phase Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-[#DBE2EF]/70 mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-mono-tabular text-xs px-2.5 py-0.5 rounded-lg font-semibold ${
                          isActive
                            ? "bg-[#112D4E] text-white"
                            : "bg-[#DBE2EF]/70 text-[#112D4E]"
                        }`}
                      >
                        {weekBadge} ({ms.weeksAllocated} Wks)
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg border border-[#DBE2EF] bg-[#F9F7F7] px-2.5 py-0.5 text-[11px] font-medium text-[#43474E] font-mono-tabular">
                        <AppIcon name="calendar_month" className="text-[13px] text-[#3F72AF]" />
                        {formatPakistanRoadmapPhaseDates(ms.weekStart, ms.weekEnd)} (PKT)
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#3F72AF]">
                        {ms.phaseTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          isDone
                            ? "bg-[#E3FDFD] text-[#004F53] border border-[#71C9CE]/60"
                            : isActive
                              ? "bg-[#DBE2EF] text-[#112D4E]"
                              : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {isDone
                          ? "Completed · Signed Off"
                          : isActive
                            ? "In Progress (Active)"
                            : "Upcoming / Not Started"}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCycleStatus(ms)}
                        data-testid={`toggle-milestone-${ms.phaseNumber}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#DBE2EF] bg-[#F9F7F7] hover:bg-[#DBE2EF]/60 px-2.5 py-1 text-xs font-semibold text-[#112D4E] transition-colors"
                      >
                        <AppIcon name="sync" className="text-[15px] text-[#3F72AF]" />
                        <span>Toggle Status</span>
                      </button>
                    </div>
                  </div>

                  <h2 className="font-title-md text-base sm:text-[18px] font-bold text-[#112D4E] mb-3">
                    {ms.title}
                  </h2>

                  {/* Concrete Deliverables Checklist */}
                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-wider text-[#3F72AF] font-semibold">
                      Concrete Phase Deliverables
                    </div>
                    {ms.deliverables.map((d, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F9F7F7] border border-[#DBE2EF]/60"
                      >
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                            isDone
                              ? "bg-[#71C9CE] text-[#112D4E]"
                              : isActive
                                ? "bg-[#3F72AF] text-white"
                                : "bg-[#DBE2EF] text-[#3F72AF]"
                          }`}
                        >
                          <AppIcon name={isDone ? "check" : isActive ? "pending" : "radio_button_unchecked"} className="text-[13px]" />
                        </div>
                        <p className="text-xs sm:text-sm text-on-surface leading-snug">
                          <strong className="font-mono-tabular text-[#112D4E] font-semibold mr-1.5">
                            DEL-{ms.phaseNumber}.{idx + 1}:
                          </strong>
                          {d}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Verification Criteria & Risk Gate */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-surface-container-low border border-[#DBE2EF]/70 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-[#112D4E]">
                        <AppIcon name="verified" className="text-[16px] text-[#004F53]" />
                        <span>Verification Criteria</span>
                      </div>
                      <p className="text-on-surface-variant leading-relaxed">
                        {ms.verificationCriteria}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-error-container/35 border border-error/20 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-on-error-container">
                        <AppIcon name="warning" className="text-[16px] text-error" />
                        <span>Milestone Risk Checkpoint</span>
                      </div>
                      <p className="text-on-surface-variant leading-relaxed">{ms.riskNote}</p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

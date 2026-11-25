"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarRange,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  RefreshCw,
  ShieldCheck,
  Copy,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildCalibratedProjectRoadmap,
  formatRoadmapAsMarkdown,
  type PlannedMilestoneItem,
} from "@/lib/recommendation/roadmap-planner";
import {
  toggleMilestoneStatus,
  exportRoadmapMarkdown,
} from "@/actions/roadmap.actions";
import { getActiveRecommendationsSnapshot } from "@/actions/recommendation.actions";
import {
  loadStoredMilestoneStatuses,
  saveStoredMilestoneStatuses,
  formatTrackLabel,
} from "@/lib/workspace-store";
import type { GeneratedIdeaRecord } from "@/lib/recommendation/engine";

export default function RoadmapDetailPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const ideaId = params?.id ?? "";

  const [storedIdeas, setStoredIdeas] = useState<GeneratedIdeaRecord[]>([]);
  const [durationWeeks, setDurationWeeks] = useState(24);
  const [weeklyHours, setWeeklyHours] = useState(15);
  const [totalSkillGapHours, setTotalSkillGapHours] = useState(0);
  const [viewState, setViewState] = useState<"POPULATED" | "LOADING" | "EMPTY" | "ERROR">(
    "LOADING"
  );
  const [exportedMarkdown, setExportedMarkdown] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    setMilestoneStatusOverrides(loadStoredMilestoneStatuses());
    getActiveRecommendationsSnapshot()
      .then((snap) => {
        setDurationWeeks(snap.durationWeeks);
        setWeeklyHours(snap.weeklyHours);
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
          setViewState("POPULATED");
        } else {
          setStoredIdeas([]);
          setViewState("EMPTY");
        }
      })
      .catch(() => {
        setStoredIdeas([]);
        setViewState("EMPTY");
      });
  }, [ideaId]);

  const activeIdea = useMemo(() => {
    return storedIdeas.find((i) => i.id === ideaId) ?? storedIdeas[0] ?? null;
  }, [storedIdeas, ideaId]);

  const ideaMetadata = useMemo(() => {
    if (!activeIdea) {
      return {
        title: "No Proposal Selected",
        domain: "Software Engineering",
        skillGapSlugs: [] as string[],
        stack: [] as string[],
      };
    }
    return {
      title: activeIdea.title,
      domain: activeIdea.domain,
      skillGapSlugs:
        activeIdea.skillGaps.length > 0
          ? activeIdea.skillGaps.map((g) => g.skillSlug)
          : ["typescript", "postgresql"],
      stack: activeIdea.recommendedStack.map((s) => s.tech),
    };
  }, [activeIdea]);

  const baseRoadmap = useMemo(
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

  const [milestoneStatusOverrides, setMilestoneStatusOverrides] = useState<
    Record<string, "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED">
  >({});

  const milestones: PlannedMilestoneItem[] = baseRoadmap.milestones.map((m) => ({
    ...m,
    status: milestoneStatusOverrides[m.id] ?? m.status,
  }));

  const completedCount = milestones.filter((m) => m.status === "COMPLETED").length;
  const progressPercent = Math.round((completedCount / milestones.length) * 100);

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

    await toggleMilestoneStatus({
      milestoneId: ms.id,
      status: nextStatus,
    });
  }

  async function handleExportMarkdown() {
    const localMarkdown = formatRoadmapAsMarkdown({
      ideaTitle: ideaMetadata.title,
      roadmap: baseRoadmap,
    });
    setExportedMarkdown(localMarkdown);

    const res = await exportRoadmapMarkdown({
      roadmapId: `roadmap_${ideaId}`,
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
    link.download = `ProjectCompass-Roadmap-${(activeIdea?.track ?? "core_safe").toLowerCase()}.md`;
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
      {/* Contrast Header Banner (--grad-contrast: #0F172A -> #115E59) */}
      <section className="rounded-[8px] bg-grad-contrast p-6 md:p-8 text-bg-surface shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-[6px] bg-bg-surface/15 px-2.5 py-0.5 font-mono-tabular text-xs font-medium text-bg-surface">
                {formatTrackLabel(activeIdea?.track ?? "CORE_SAFE")}
              </span>
              <span className="rounded-[6px] bg-bg-surface/15 px-2.5 py-0.5 font-mono-tabular text-xs font-medium text-bg-surface">
                {baseRoadmap.durationWeeks} Weeks Total
              </span>
              <span className="rounded-[6px] bg-bg-surface/15 px-2.5 py-0.5 font-mono-tabular text-xs font-medium text-bg-surface">
                {baseRoadmap.prepWeeksAllocated} Prep Weeks Allocated
              </span>
              <span className="rounded-[6px] bg-bg-surface/15 px-2.5 py-0.5 font-mono-tabular text-xs font-medium text-bg-surface">
                {baseRoadmap.weeklyHours} hrs/week
              </span>
            </div>
            <h1 className="text-[26px] md:text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-bg-surface">
              {ideaMetadata.title}
            </h1>
            <p className="text-sm text-bg-surface/85">{baseRoadmap.summary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleExportMarkdown}
              data-testid="export-markdown-btn"
            >
              <Download className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>Export Markdown</span>
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-bg-surface/90">
            <span>4-Phase Milestone Execution Progress</span>
            <span className="font-mono-tabular font-semibold">
              {completedCount} of {milestones.length} Phases Completed ({progressPercent}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-surface/20">
            <div
              className="h-full bg-brand-tint transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 rounded-[8px] border border-border-default bg-bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <label className="text-xs font-semibold text-text-secondary shrink-0">
              Switch Idea:
            </label>
            <Select
              aria-label="Switch Idea Roadmap"
              value={activeIdea?.id ?? ""}
              onChange={(e) => router.push(`/dashboard/roadmaps/${e.target.value}`)}
              className="w-full sm:w-64"
            >
              {storedIdeas.map((idea) => (
                <option key={idea.id} value={idea.id}>
                  {formatTrackLabel(idea.track)} â€” {idea.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <label className="text-xs font-semibold text-text-secondary shrink-0">
              Semester Length:
            </label>
            <Select
              aria-label="Semester Length"
              value={String(durationWeeks)}
              onChange={(e) => setDurationWeeks(Number(e.target.value))}
              className="w-full sm:w-40 font-mono-tabular"
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

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 sm:col-span-2 lg:col-span-1">
            <label className="text-xs font-semibold text-text-secondary shrink-0">
              Skill-Gap Hours:
            </label>
            <Select
              aria-label="Skill Gap Hours"
              value={String(totalSkillGapHours)}
              onChange={(e) => setTotalSkillGapHours(Number(e.target.value))}
              className="w-full sm:w-52 font-mono-tabular"
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

        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono-tabular text-xs text-text-muted">
            Phase Breakdown:{" "}
            <strong className="text-text-primary">
              {baseRoadmap.phaseWeekCounts.join(" + ")} = {baseRoadmap.durationWeeks} Weeks
            </strong>
          </span>
        </div>
      </div>

      {exportedMarkdown && (
        <Card className="border-brand-primary/40" data-testid="exported-markdown-card">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>
                Exported Clean Markdown (GitHub README &amp; FYP Proposal Ready)
              </CardTitle>
              <div className="flex items-center gap-2">
                {copyStatus && (
                  <span className="text-xs font-medium text-status-success-text">
                    {copyStatus}
                  </span>
                )}
                <Button size="sm" variant="outline" onClick={handleCopyMarkdown}>
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Copy Markdown
                </Button>
                <Button size="sm" onClick={handleDownloadFile}>
                  <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Download .md File
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setExportedMarkdown(null)}>
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="max-h-72 overflow-y-auto rounded-[6px] border border-border-default bg-bg-subtle p-4 font-mono-tabular text-xs text-text-primary whitespace-pre-wrap">
              {exportedMarkdown}
            </pre>
          </CardContent>
        </Card>
      )}

      {viewState === "LOADING" && (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      )}

      {viewState === "ERROR" && (
        <Card className="border-status-error/30 bg-status-error-tint/30">
          <CardHeader>
            <CardTitle className="text-status-error-text">Roadmap Persistence Error</CardTitle>
            <CardDescription className="text-status-error-text">
              Could not synchronize milestone toggle state with PostgreSQL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setViewState("POPULATED")}>
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
              Retry Sync
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "EMPTY" && (
        <Card className="bg-grad-ambient">
          <CardHeader>
            <CardTitle>No Roadmap Generated for This Idea Yet</CardTitle>
            <CardDescription>
              Click below to allocate deterministic ramp-up weeks and 4 execution phases totaling{" "}
              {durationWeeks} weeks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setViewState("POPULATED")}>
              <CalendarRange className="h-4 w-4" strokeWidth={1.75} />
              Build {durationWeeks}-Week Execution Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "POPULATED" && (
        <div className="space-y-4">
          {milestones.map((ms) => {
            const weekBadge = `W${String(ms.weekStart).padStart(2, "0")}â€“W${String(ms.weekEnd).padStart(2, "0")}`;

            return (
              <Card key={ms.id} data-testid={`milestone-card-${ms.phaseNumber}`}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="font-mono-tabular">
                        {weekBadge} ({ms.weeksAllocated} Wks)
                      </Badge>
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                        {ms.phaseTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          ms.status === "COMPLETED"
                            ? "success"
                            : ms.status === "IN_PROGRESS"
                              ? "amber"
                              : "neutral"
                        }
                      >
                        {ms.status === "COMPLETED"
                          ? "Completed"
                          : ms.status === "IN_PROGRESS"
                            ? "In Progress"
                            : "Not Started"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCycleStatus(ms)}
                        data-testid={`toggle-milestone-${ms.phaseNumber}`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-brand-primary" strokeWidth={1.75} />
                        Toggle Status
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="mt-2">{ms.title}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Concrete Phase Deliverables
                    </p>
                    <ul className="space-y-1.5 text-sm text-text-secondary">
                      {ms.deliverables.map((d, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Clock
                            className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary"
                            strokeWidth={1.75}
                          />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[6px] border border-border-default bg-bg-subtle p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                        <ShieldCheck className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
                        <span>Verification Criteria</span>
                      </div>
                      <p className="mt-1 text-text-secondary">{ms.verificationCriteria}</p>
                    </div>

                    <div className="rounded-[6px] border border-status-warning/30 bg-status-warning-tint p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-status-warning-text">
                        <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
                        <span>Risk Checkpoint</span>
                      </div>
                      <p className="mt-1 text-status-warning-text/90">{ms.riskNote}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

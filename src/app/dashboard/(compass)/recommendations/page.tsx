"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  CalendarRange,
  Users,
  Layers,
  TrendingUp,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalSession } from "@/components/layout/portal-session-context";
import {
  generateRecommendations,
  updateIdeaStatus,
  getActiveRecommendationsSnapshot,
} from "@/actions/recommendation.actions";
import { getActiveStudentProfile } from "@/actions/profile.actions";
import type { GeneratedIdeaRecord } from "@/lib/recommendation/engine";
import {
  saveStoredIdeas,
  saveStoredShortlistedIds,
  type StoredStudentProfile,
} from "@/lib/workspace-store";

const LOADING_STAGES = [
  "Stage 1: Filtering supervisor slot quotas (activeSlots < maxSlots) & effort ceiling...",
  "Stage 2: Querying pgvector HNSW archive embeddings for >= 0.82 duplicate gate...",
  "Stage 2: Computing deterministic 4-factor Feasibility Scores (40/30/20/10)...",
  "Stage 3: Applying MMR diversity selection & synthesizing grounded proposals...",
];

export default function RecommendationsPage() {
  const router = useRouter();
  const portalSession = usePortalSession();
  const [ideas, setIdeas] = useState<GeneratedIdeaRecord[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);
  const [studentProfile, setStudentProfile] = useState<StoredStudentProfile | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedScoreIds, setExpandedScoreIds] = useState<string[]>([]);
  const [focusNote, setFocusNote] = useState("");
  const [usedFallback, setUsedFallback] = useState(false);
  const [runsLeftToday, setRunsLeftToday] = useState(5);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const [viewState, setViewState] = useState<"POPULATED" | "LOADING" | "EMPTY" | "ERROR">(
    "LOADING"
  );

  useEffect(() => {
    Promise.all([getActiveRecommendationsSnapshot(), getActiveStudentProfile()])
      .then(([snap, serverProfile]) => {
        if (serverProfile) {
          setStudentProfile({
            skills: serverProfile.skills,
            interests: serverProfile.interests,
            careerGoal: serverProfile.careerGoal,
            preferredType: serverProfile.preferredType,
            weeklyHours: serverProfile.weeklyHours,
            durationWeeks: serverProfile.durationWeeks,
            teamSize: serverProfile.teamSize,
            gpaBand: serverProfile.gpaBand,
            updatedAt: serverProfile.updatedAt,
          });
        }
        setRunsLeftToday(snap.runsRemainingToday);
        setUsedFallback(snap.usedFallback);
        if (snap.ideas && snap.ideas.length === 3) {
          setIdeas(snap.ideas);
          setExpandedScoreIds(snap.ideas.map((i) => i.id));
          setShortlistedIds(snap.shortlistedIds);
          saveStoredIdeas(snap.ideas);
          saveStoredShortlistedIds(snap.shortlistedIds);
          setViewState("POPULATED");
        } else {
          setIdeas([]);
          setViewState("EMPTY");
        }
      })
      .catch(() => {
        setIdeas([]);
        setViewState("EMPTY");
      });
  }, []);

  async function handleRunAnalysis(simulateFallback = false) {
    if (runsLeftToday <= 0) return;
    setViewState("LOADING");
    setLoadingStageIndex(0);
    setActionToast(null);
    setErrorMessage(null);

    const interval = setInterval(() => {
      setLoadingStageIndex((prev) => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
    }, 350);

    const res = await generateRecommendations({
      focusNote: focusNote.trim() || undefined,
      forceLlmFailure: simulateFallback,
      ...(studentProfile && studentProfile.skills.length >= 3
        ? {
            profileOverride: {
              skills: studentProfile.skills.map((s) => ({
                skillSlug: s.skillSlug,
                proficiency: s.proficiency,
              })),
              interests: studentProfile.interests,
              careerGoal: studentProfile.careerGoal,
              preferredType: studentProfile.preferredType,
              weeklyHours: studentProfile.weeklyHours,
              durationWeeks: studentProfile.durationWeeks,
              teamSize: studentProfile.teamSize,
            },
          }
        : {}),
    });

    clearInterval(interval);

    if (!res.ok) {
      setErrorMessage(res.error.message);
      setViewState("ERROR");
      return;
    }

    setIdeas(res.data.engineResult.ideas);
    saveStoredIdeas(res.data.engineResult.ideas);
    setExpandedScoreIds(res.data.engineResult.ideas.map((i) => i.id));
    setUsedFallback(res.data.usedFallback);
    setRunsLeftToday((prev) => Math.max(0, prev - 1));
    setViewState("POPULATED");
    setActionToast(
      `Generated 3 diversified FYP proposals calibrated to your ${studentProfile?.skills.length ?? 3} skills and ${res.data.engineResult.totalEffortHours}h effort budget.`
    );
  }

  async function handleToggleShortlist(idea: GeneratedIdeaRecord) {
    const isCurrentlyShortlisted = shortlistedIds.includes(idea.id);
    const nextStatus = isCurrentlyShortlisted ? "GENERATED" : "SHORTLISTED";

    const nextIds = isCurrentlyShortlisted
      ? shortlistedIds.filter((id) => id !== idea.id)
      : [...shortlistedIds, idea.id];

    setShortlistedIds(nextIds);
    saveStoredShortlistedIds(nextIds);
    if (ideas.length === 3) {
      saveStoredIdeas(ideas as [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord]);
    }

    setActionToast(
      isCurrentlyShortlisted
        ? `Removed "${idea.title}" from your shortlisted proposals.`
        : `Shortlisted "${idea.title}" (${idea.track}). Ready for Supervisor Matching and Roadmap Generation.`
    );

    await updateIdeaStatus({ ideaId: idea.id, status: nextStatus });
  }

  function handleOpenRoadmap(idea: GeneratedIdeaRecord) {
    if (ideas.length === 3) {
      saveStoredIdeas(ideas as [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord]);
    }
    if (!shortlistedIds.includes(idea.id)) {
      const nextIds = [...shortlistedIds, idea.id];
      setShortlistedIds(nextIds);
      saveStoredShortlistedIds(nextIds);
    }
    router.push(`/dashboard/roadmaps/${idea.id}`);
  }

  function toggleScoreExpand(ideaId: string) {
    setExpandedScoreIds((prev) =>
      prev.includes(ideaId) ? prev.filter((id) => id !== ideaId) : [...prev, ideaId]
    );
  }

  function renderDuplicateAlert(idea: GeneratedIdeaRecord) {
    const topMatch = idea.similarArchives[0];
    if (idea.duplicateRisk === "HIGH") {
      return (
        <div
          className="rounded-[8px] border border-status-error/30 bg-status-error-tint p-4 space-y-2"
          data-testid={`duplicate-banner-${idea.track}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-status-error-text">
              <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>
                High Similarity Detected (&gt;= 0.82) â€” Mandatory Differentiation Enforced
              </span>
            </div>
            <Badge variant="error" className="font-mono-tabular">
              Similarity: {idea.highestArchiveSimilarity.toFixed(2)} (
              {Math.round(idea.highestArchiveSimilarity * 100)}%)
            </Badge>
          </div>
          {topMatch && (
            <p className="text-xs text-status-error-text/90 font-mono-tabular">
              Closest Past FYP: &ldquo;{topMatch.title}&rdquo; (BSCS {topMatch.academicYear})
            </p>
          )}
          {idea.differentiationAngle && (
            <div className="rounded-[6px] bg-bg-surface/90 p-3 text-xs text-text-primary border border-status-error/20">
              <span className="font-semibold text-status-error-text">
                Required Differentiation Angle:{" "}
              </span>
              {idea.differentiationAngle}
            </div>
          )}
        </div>
      );
    }

    if (idea.duplicateRisk === "MODERATE") {
      return (
        <div
          className="rounded-[8px] border border-status-warning/30 bg-status-warning-tint p-3.5 space-y-1.5"
          data-testid={`duplicate-banner-${idea.track}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-status-warning-text">
              <Info className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>Related Past FYPs in Department Archive (0.72 â€“ 0.81)</span>
            </div>
            <Badge variant="warning" className="font-mono-tabular">
              Similarity: {idea.highestArchiveSimilarity.toFixed(2)}
            </Badge>
          </div>
          {topMatch && (
            <p className="text-xs text-status-warning-text/90">
              Reference Context: &ldquo;{topMatch.title}&rdquo; ({topMatch.academicYear})
            </p>
          )}
        </div>
      );
    }

    return (
      <div
        className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-status-success/30 bg-status-success-tint px-4 py-2.5"
        data-testid={`duplicate-banner-${idea.track}`}
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-status-success-text">
          <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>Original Direction â€” Low Archive Overlap (&lt; 0.72)</span>
        </div>
        <Badge variant="success" className="font-mono-tabular">
          Max Archive Similarity: {idea.highestArchiveSimilarity.toFixed(2)}
        </Badge>
      </div>
    );
  }

  function renderIdeaCard(idea: GeneratedIdeaRecord) {
    const isShortlisted = shortlistedIds.includes(idea.id);
    const isExpanded = expandedScoreIds.includes(idea.id);

    const trackBadge =
      idea.track === "CORE_SAFE" ? (
        <Badge variant="default">Track 1 Â· Core &amp; Safe</Badge>
      ) : idea.track === "CAREER_STRETCH" ? (
        <Badge variant="amber">Track 2 Â· Career Stretch</Badge>
      ) : (
        <Badge variant="info">Track 3 Â· Research &amp; Niche</Badge>
      );

    return (
      <Card key={idea.id} className="overflow-hidden" data-testid={`idea-card-${idea.track}`}>
        <CardHeader className="border-b border-border-default bg-bg-surface pb-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {trackBadge}
              <Badge variant="neutral">{idea.domain}</Badge>
              <Badge variant="neutral" className="font-mono-tabular">
                Difficulty: {idea.difficulty}
              </Badge>
              <Badge variant="info">
                <TrendingUp className="mr-1 h-3 w-3" strokeWidth={1.75} />
                {idea.marketDemandTag}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={isShortlisted ? "default" : "outline"}
                onClick={() => handleToggleShortlist(idea)}
                data-testid={`shortlist-btn-${idea.track}`}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 shrink-0 ${isShortlisted ? "fill-current" : ""}`}
                  strokeWidth={1.75}
                />
                <span>{isShortlisted ? "Shortlisted âœ“" : "Shortlist Idea"}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => handleOpenRoadmap(idea)}
                data-testid={`generate-roadmap-btn-${idea.track}`}
              >
                <CalendarRange className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                <span>
                  Generate {studentProfile?.durationWeeks ?? 24}-Wk Roadmap
                </span>
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-1.5">
              <CardTitle className="text-[18px] sm:text-[20px] leading-[1.3]">{idea.title}</CardTitle>
              <CardDescription>{idea.problemStatement}</CardDescription>
            </div>

            <div className="flex w-full sm:w-auto flex-row sm:flex-col items-center sm:items-end justify-between rounded-[8px] border border-brand-primary/30 bg-brand-tint/40 px-4 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-primary-hover">
                Explainable Feasibility
              </span>
              <span
                className="font-mono-tabular text-2xl font-bold text-text-primary"
                data-testid={`feasibility-total-${idea.track}`}
              >
                {idea.feasibilityScore}/100
              </span>
              <span className="font-mono-tabular text-[11px] text-text-muted">
                Est. Effort: {idea.estimatedTotalHours} hrs
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* 1. Anti-Duplicate Banner */}
          {renderDuplicateAlert(idea)}

          {/* 2. Proposed Architecture Deliverable */}
          <div className="rounded-[8px] border border-border-default bg-bg-subtle p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Grounded Engineering Deliverable
            </p>
            <p className="mt-1 text-sm text-text-primary leading-relaxed">
              {idea.proposedSolution}
            </p>
          </div>

          {/* 3. Expandable 4-Factor Feasibility Score Breakdown */}
          <div className="rounded-[8px] border border-border-default bg-bg-surface p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
                <h4 className="text-sm font-semibold text-text-primary">
                  4-Factor Deterministic Feasibility Breakdown ({idea.feasibilityScore}/100)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => toggleScoreExpand(idea.id)}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
              >
                {isExpanded ? (
                  <>
                    Hide Math <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Inspect Sub-Scores <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>

            <p className="mt-1 text-xs text-text-secondary">{idea.feasibilityExplanation}</p>

            {isExpanded && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[6px] border border-border-default bg-bg-subtle p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text-secondary">Skill Overlap (40%)</span>
                    <span className="font-mono-tabular font-semibold text-text-primary">
                      {idea.skillOverlapScore}/40
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border-default">
                    <div
                      className="h-full bg-brand-primary"
                      style={{ width: `${(idea.skillOverlapScore / 40) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-[6px] border border-border-default bg-bg-subtle p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text-secondary">Time Fit (30%)</span>
                    <span className="font-mono-tabular font-semibold text-text-primary">
                      {idea.timeFitScore}/30
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border-default">
                    <div
                      className="h-full bg-brand-primary"
                      style={{ width: `${(idea.timeFitScore / 30) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-[6px] border border-border-default bg-bg-subtle p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text-secondary">
                      Resource Readiness (20%)
                    </span>
                    <span className="font-mono-tabular font-semibold text-text-primary">
                      {idea.resourceReadinessScore}/20
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border-default">
                    <div
                      className="h-full bg-brand-primary"
                      style={{ width: `${(idea.resourceReadinessScore / 20) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-[6px] border border-border-default bg-bg-subtle p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text-secondary">Supervisor Fit (10%)</span>
                    <span className="font-mono-tabular font-semibold text-text-primary">
                      {idea.supervisorFitScore}/10
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border-default">
                    <div
                      className="h-full bg-brand-primary"
                      style={{ width: `${(idea.supervisorFitScore / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Skill-Gap Analysis & Upskilling Plan */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-text-primary">
                Skill-Gap Analysis &amp; Estimated Upskilling Hours
              </h4>
              {idea.skillGaps.length === 0 ? (
                <div className="rounded-[6px] border border-status-success/30 bg-status-success-tint p-3 text-xs text-status-success-text">
                  Zero critical skill gaps â€” your current profile satisfies all required stack
                  proficiencies.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {idea.skillGaps.map((gap) => (
                    <div
                      key={gap.skillSlug}
                      className="rounded-[6px] border border-border-default bg-bg-subtle p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono-tabular text-xs font-semibold text-text-primary">
                          #{gap.skillSlug}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              gap.severity === "CRITICAL"
                                ? "error"
                                : gap.severity === "MODERATE"
                                  ? "amber"
                                  : "neutral"
                            }
                          >
                            {gap.severity}
                          </Badge>
                          <span className="font-mono-tabular text-xs font-medium text-text-secondary">
                            +{gap.estimatedLearnHours} hrs prep
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-text-secondary">{gap.learningAction}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Recommended Tech Stack Table */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
                <h4 className="text-sm font-semibold text-text-primary">
                  Recommended Tech Stack &amp; Architectural Rationale
                </h4>
              </div>
              <div className="divide-y divide-border-default rounded-[8px] border border-border-default">
                {idea.recommendedStack.map((item, idx) => (
                  <div key={idx} className="p-3 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text-muted">{item.layer}</span>
                      <span className="font-mono-tabular font-semibold text-text-primary">
                        {item.tech}
                      </span>
                    </div>
                    <p className="text-text-secondary">{item.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 6. Matched Available Supervisors Strip */}
          <div className="rounded-[8px] border border-border-default bg-bg-subtle p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
                <h4 className="text-sm font-semibold text-text-primary">
                  Matched Department Supervisors with Open Capacity
                </h4>
              </div>
              <Link
                href={`/dashboard/supervisors?ideaId=${encodeURIComponent(idea.id)}`}
                className="text-xs font-medium text-brand-primary hover:underline"
              >
                View All Ranked Faculty &amp; Send Request â†’
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {idea.supervisorMatches.slice(0, 2).map((sup) => (
                <div
                  key={sup.supervisorProfileId}
                  className="flex items-center justify-between rounded-[6px] border border-border-default bg-bg-surface p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-primary">
                        {sup.fullName}
                      </span>
                      <Badge variant="default" className="font-mono-tabular">
                        {sup.matchPercentage}% Match
                      </Badge>
                    </div>
                    <p className="text-[11px] text-text-secondary">{sup.rationale}</p>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <Badge variant="success" className="font-mono-tabular">
                      {sup.availabilityAtMatch} of {sup.maxSlots} slots open
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[8px] border border-border-default bg-grad-ambient p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">
                {portalSession.batchLabel || "Department of IT & Computing"}
              </Badge>
              <span className="font-mono-tabular text-xs text-text-secondary">
                Semester Capacity:{" "}
                {studentProfile
                  ? Math.round(
                      studentProfile.weeklyHours *
                        studentProfile.durationWeeks *
                        (studentProfile.teamSize === 1
                          ? 1
                          : studentProfile.teamSize === 2
                            ? 1.65
                            : 2.2)
                    )
                  : 594}{" "}
                hrs ({studentProfile?.weeklyHours ?? 15}h/wk Ã—{" "}
                {studentProfile?.durationWeeks ?? 24} wks)
              </span>
              <span className="font-mono-tabular text-xs font-semibold text-brand-primary">
                Â· {runsLeftToday} of 5 daily evaluations left
              </span>
            </div>
            <h1 className="text-[22px] sm:text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-primary">
              FYP Proposal Recommendations &amp; Feasibility Breakdown
            </h1>
            <p className="text-sm text-text-secondary">
              Proposals are matched against your technical skills, semester hours, past department
              project archives, and supervisors with open capacity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => handleRunAnalysis(false)} disabled={runsLeftToday <= 0}>
              <Sparkles className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>Refresh Proposals</span>
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 pt-2">
          <Input
            value={focusNote}
            onChange={(e) => setFocusNote(e.target.value)}
            maxLength={240}
            placeholder="Optional topic focus (e.g., Prefer web/backend systems or open-source datasets without dedicated GPU)..."
            className="max-w-xl bg-bg-surface text-xs h-9"
          />
          <span className="font-mono-tabular text-xs text-text-muted">
            {focusNote.length}/240 chars
          </span>
        </div>
      </section>

      {actionToast && (
        <div
          data-testid="recommendation-action-toast"
          className="flex items-center justify-between gap-2 rounded-[8px] border border-status-success/30 bg-status-success-tint px-4 py-3 text-xs font-medium text-status-success-text"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span>{actionToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionToast(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {usedFallback && (
        <div
          className="flex items-center gap-2.5 rounded-[8px] border border-status-info/30 bg-status-info-tint px-4 py-3 text-xs text-status-info-text"
          data-testid="fallback-status-banner"
        >
          <Info className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>
            <strong>Deterministic Matching Notice:</strong> AI narrative refinement was temporarily
            unavailable; recommendations and feasibility scores were generated using our
            deterministic matching engine.
          </span>
        </div>
      )}

      {viewState === "LOADING" && (
        <Card data-testid="recommendations-loading-state">
          <CardHeader>
            <CardTitle>Executing 3-Stage Hybrid Recommendation Pipeline...</CardTitle>
            <CardDescription>{LOADING_STAGES[loadingStageIndex]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
              <div
                className="h-full bg-brand-primary transition-all duration-150"
                style={{ width: `${((loadingStageIndex + 1) / LOADING_STAGES.length) * 100}%` }}
              />
            </div>
            <Skeleton className="h-52 w-full" />
            <Skeleton className="h-52 w-full" />
          </CardContent>
        </Card>
      )}

      {viewState === "EMPTY" && (
        <Card className="bg-grad-ambient" data-testid="recommendations-empty-state">
          <CardHeader>
            <CardTitle>No Recommendation Runs Executed Yet</CardTitle>
            <CardDescription>
              {studentProfile && studentProfile.skills.length >= 3
                ? "Your skill profile is ready. Run your first hybrid analysis to generate 3 personalized FYP proposals (Core/Safe, Career-Stretch, Research/Niche)."
                : "Save at least 3 technical skills and 1 domain interest in your Skill Profile first, then generate personalized FYP recommendations."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {studentProfile && studentProfile.skills.length >= 3 ? (
              <Button onClick={() => handleRunAnalysis(false)}>
                <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                Execute First Hybrid Run
              </Button>
            ) : (
              <Button asChild>
                <Link href="/dashboard/profile">Complete Skill Profile</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {viewState === "ERROR" && (
        <Card
          className="border-status-error/30 bg-status-error-tint/30"
          data-testid="recommendations-error-state"
        >
          <CardHeader>
            <CardTitle className="text-status-error-text">
              Unable to Run Recommendation Analysis
            </CardTitle>
            <CardDescription className="text-status-error-text">
              {errorMessage ??
                "Failed runs do not consume your 5/day student quota. Please verify your skill profile and retry."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard/profile">Update Skill Profile</Link>
            </Button>
            {ideas.length > 0 && (
              <Button variant="outline" onClick={() => setViewState("POPULATED")}>
                <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
                Restore Last Verified Run
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {viewState === "POPULATED" && (
        <Tabs defaultValue="ALL" className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="ALL">All 3 Diversified Tracks</TabsTrigger>
              <TabsTrigger value="CORE_SAFE">Track 1: Core &amp; Safe</TabsTrigger>
              <TabsTrigger value="CAREER_STRETCH">Track 2: Career Stretch</TabsTrigger>
              <TabsTrigger value="RESEARCH_NICHE">Track 3: Research &amp; Niche</TabsTrigger>
            </TabsList>
            <span className="text-xs text-text-muted">
              Shortlisted Ideas:{" "}
              <strong className="font-mono-tabular text-text-primary">
                {shortlistedIds.length}
              </strong>
            </span>
          </div>

          <TabsContent value="ALL" className="space-y-6">
            {ideas.map((idea) => renderIdeaCard(idea))}
          </TabsContent>

          <TabsContent value="CORE_SAFE" className="space-y-6">
            {ideas.filter((i) => i.track === "CORE_SAFE").map((idea) => renderIdeaCard(idea))}
          </TabsContent>

          <TabsContent value="CAREER_STRETCH" className="space-y-6">
            {ideas.filter((i) => i.track === "CAREER_STRETCH").map((idea) => renderIdeaCard(idea))}
          </TabsContent>

          <TabsContent value="RESEARCH_NICHE" className="space-y-6">
            {ideas.filter((i) => i.track === "RESEARCH_NICHE").map((idea) => renderIdeaCard(idea))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

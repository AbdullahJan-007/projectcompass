"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { AppIcon } from "@/components/ui/app-icon";

const LOADING_STAGES = [
  "Stage 1: Filtering supervisor slot quotas (activeSlots < maxSlots) & effort ceiling...",
  "Stage 2: Querying pgvector HNSW archive embeddings for >= 0.82 duplicate gate...",
  "Stage 2: Computing deterministic 4-factor Feasibility Scores (40/30/20/10)...",
  "Stage 3: Applying MMR diversity selection & synthesizing grounded proposals...",
];

type TrackFilter = "ALL" | "CORE_SAFE" | "CAREER_STRETCH" | "RESEARCH_NICHE";

export default function RecommendationsPage() {
  const router = useRouter();
  const portalSession = usePortalSession();
  const [ideas, setIdeas] = useState<GeneratedIdeaRecord[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);
  const [studentProfile, setStudentProfile] = useState<StoredStudentProfile | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusNote, setFocusNote] = useState("");
  const [trackFilter, setTrackFilter] = useState<TrackFilter>("ALL");
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

  function renderOriginalityBanner(idea: GeneratedIdeaRecord) {
    const topMatch = idea.similarArchives[0];
    if (idea.duplicateRisk === "HIGH") {
      return (
        <div
          className="p-4 rounded-xl bg-error-container text-on-error-container space-y-2.5"
          data-testid={`duplicate-banner-${idea.track}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-on-error-container text-white flex items-center justify-center shrink-0">
                <AppIcon name="report_problem" className="text-[18px]" />
              </div>
              <div>
                <div className="text-xs font-bold text-on-error-container">
                  Originality Check: High Overlap (&gt;= 0.82)
                </div>
                {topMatch && (
                  <div className="text-xs text-on-error-container/90">
                    Closest Past FYP: &ldquo;{topMatch.title}&rdquo; ({topMatch.academicYear})
                  </div>
                )}
              </div>
            </div>
            <span className="font-mono-tabular text-xs px-2.5 py-1 rounded bg-white text-error font-bold self-start sm:self-auto shrink-0">
              {Math.round(idea.highestArchiveSimilarity * 100)}% Topic Similarity
            </span>
          </div>

          {idea.differentiationAngle && (
            <div className="p-3 rounded-lg bg-surface-container-lowest text-on-surface text-xs flex items-start gap-2 shadow-xs">
              <AppIcon name="crisis_alert" className="text-error text-[18px] shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-error">
                  Required Thesis Differentiation Angle:{" "}
                </strong>
                {idea.differentiationAngle}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (idea.duplicateRisk === "MODERATE") {
      return (
        <div
          className="p-3.5 rounded-xl bg-surface-container-low border border-[#DBE2EF] space-y-2"
          data-testid={`duplicate-banner-${idea.track}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#DBE2EF] flex items-center justify-center text-[#112D4E] shrink-0">
                <AppIcon name="warning" className="text-[18px]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#112D4E]">
                  Originality Check: Moderate Overlap (0.72 – 0.81)
                </div>
                {topMatch && (
                  <div className="text-xs text-on-surface-variant">
                    Related Archive: &ldquo;{topMatch.title}&rdquo; ({topMatch.academicYear})
                  </div>
                )}
              </div>
            </div>
            <span className="font-mono-tabular text-xs px-2.5 py-1 rounded bg-surface-container-lowest border border-[#DBE2EF] text-[#3F72AF] font-semibold self-start sm:self-auto shrink-0">
              {Math.round(idea.highestArchiveSimilarity * 100)}% Similarity
            </span>
          </div>
          {idea.differentiationAngle && (
            <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-[#DBE2EF]/60 text-xs text-on-surface flex items-start gap-2">
              <AppIcon name="tips_and_updates" className="text-[#3F72AF] text-[17px] shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-[#112D4E]">Differentiation Note: </strong>
                {idea.differentiationAngle}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className="p-3.5 rounded-xl bg-[#E3FDFD]/60 border border-[#71C9CE]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        data-testid={`duplicate-banner-${idea.track}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#71C9CE]/30 flex items-center justify-center text-[#004F53] shrink-0">
            <AppIcon name="verified" className="text-[18px]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#112D4E]">
              Originality Check: Low Overlap (&lt; 0.72)
            </div>
            <div className="text-xs text-on-surface-variant">
              Evaluated against departmental dissertation archives with clean semantic novelty.
            </div>
          </div>
        </div>
        <span className="font-mono-tabular text-xs px-2.5 py-1 rounded bg-surface-container-lowest text-[#004F53] border border-[#71C9CE]/50 font-semibold self-start sm:self-auto shrink-0">
          Max Overlap: {idea.highestArchiveSimilarity.toFixed(2)}
        </span>
      </div>
    );
  }

  function renderIdeaCard(idea: GeneratedIdeaRecord) {
    const isShortlisted = shortlistedIds.includes(idea.id);
    const totalSkillGapHrs = idea.skillGaps.reduce((acc, g) => acc + g.estimatedLearnHours, 0);

    const topStripColor =
      idea.track === "CORE_SAFE"
        ? "bg-[#71C9CE]"
        : idea.track === "CAREER_STRETCH"
          ? "bg-[#3F72AF]"
          : "bg-[#112D4E]";

    const trackMeta =
      idea.track === "CORE_SAFE"
        ? {
            label: "Track 1: Core & Safe",
            icon: "verified",
            pillClass: "bg-[#E3FDFD] text-[#004F53] border border-[#71C9CE]/50",
            scorePillClass: "bg-[#E3FDFD] text-[#004F53] border border-[#71C9CE]/50",
          }
        : idea.track === "CAREER_STRETCH"
          ? {
              label: "Track 2: Career Stretch",
              icon: "trending_up",
              pillClass: "bg-[#DBE2EF] text-[#112D4E]",
              scorePillClass: "bg-[#DBE2EF] text-[#112D4E]",
            }
          : {
              label: "Track 3: Research & Niche",
              icon: "science",
              pillClass: "bg-[#112D4E] text-white",
              scorePillClass: "bg-[#112D4E]/10 text-[#112D4E]",
            };

    return (
      <article
        key={idea.id}
        data-testid={`idea-card-${idea.track}`}
        className="rounded-xl bg-surface-container-lowest border border-[#DBE2EF] shadow-xs hover:shadow-md overflow-hidden transition-all duration-200 animate-fade-in-up"
      >
        {/* Top Strip Indicator */}
        <div className={`h-1.5 w-full ${topStripColor}`} />

        <div className="p-5 sm:p-6 space-y-5">
          {/* Header Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${trackMeta.pillClass}`}
              >
                <AppIcon name={trackMeta.icon} className="text-[15px]" />
                {trackMeta.label}
              </span>
              <span className="text-xs text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-md">
                Difficulty: <strong className="text-[#112D4E] font-semibold">{idea.difficulty}</strong>
              </span>
              <span className="text-xs text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-md">
                <strong className="text-[#112D4E] font-semibold">{idea.marketDemandTag}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono-tabular text-xs px-2.5 py-1 rounded bg-surface-container-low text-[#112D4E] font-semibold">
                Est. {idea.estimatedTotalHours} Hours
              </span>
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${trackMeta.scorePillClass}`}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider">Feasibility</span>
                <span
                  className="font-mono-tabular text-sm font-bold"
                  data-testid={`feasibility-total-${idea.track}`}
                >
                  {idea.feasibilityScore} / 100
                </span>
              </div>
            </div>
          </div>

          {/* Title & Problem Summary */}
          <div className="space-y-1.5">
            <h2 className="font-headline-md text-xl sm:text-2xl text-[#112D4E] font-bold leading-snug">
              {idea.title}
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {idea.problemStatement}
            </p>
          </div>

          {/* Originality Check Banner */}
          {renderOriginalityBanner(idea)}

          {/* Grounded Engineering Deliverable Box */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-[#DBE2EF]/80 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-headline-sm text-sm sm:text-base text-[#112D4E] font-semibold flex items-center gap-1.5">
                <AppIcon name="terminal" className="text-[#3F72AF] text-[18px]" />
                Grounded Engineering Deliverable
              </h3>
              <span className="text-[11px] font-semibold text-[#3F72AF]">{idea.domain}</span>
            </div>
            <p className="text-xs sm:text-sm text-on-surface leading-relaxed">
              {idea.proposedSolution}
            </p>
          </div>

          {/* 4-Factor Feasibility Breakdown Matrix */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#3F72AF]">
                4-Factor Deterministic Feasibility Breakdown
              </span>
              <span className="font-mono-tabular text-xs text-[#112D4E] font-semibold">
                Composite Fit: {idea.feasibilityScore}%
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">{idea.feasibilityExplanation}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-lg bg-surface-container-low border border-[#DBE2EF]/70 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-medium">Skill Overlap</span>
                  <span className="font-mono-tabular font-bold text-[#112D4E]">
                    {idea.skillOverlapScore} / 40
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#DBE2EF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#71C9CE] rounded-full"
                    style={{ width: `${(idea.skillOverlapScore / 40) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-[#DBE2EF]/70 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-medium">Timeline Fit</span>
                  <span className="font-mono-tabular font-bold text-[#112D4E]">
                    {idea.timeFitScore} / 30
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#DBE2EF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#71C9CE] rounded-full"
                    style={{ width: `${(idea.timeFitScore / 30) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-[#DBE2EF]/70 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-medium">Resource Readiness</span>
                  <span className="font-mono-tabular font-bold text-[#112D4E]">
                    {idea.resourceReadinessScore} / 20
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#DBE2EF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3F72AF] rounded-full"
                    style={{ width: `${(idea.resourceReadinessScore / 20) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-[#DBE2EF]/70 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-medium">Supervisor Fit</span>
                  <span className="font-mono-tabular font-bold text-[#112D4E]">
                    {idea.supervisorFitScore} / 10
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#DBE2EF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3F72AF] rounded-full"
                    style={{ width: `${(idea.supervisorFitScore / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Skill-Gap Preparation & Recommended Tech Stack */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-surface-container-low border border-[#DBE2EF]/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3F72AF] flex items-center gap-1.5">
                  <AppIcon name="school" className="text-[16px]" />
                  Skill-Gap Preparation
                </span>
                <span className="font-mono-tabular text-[11px] text-on-surface-variant">
                  ~{totalSkillGapHrs} Hours Needed
                </span>
              </div>

              {idea.skillGaps.length === 0 ? (
                <div className="p-3 rounded-lg bg-[#E3FDFD]/70 border border-[#71C9CE]/40 text-xs text-[#004F53] font-medium">
                  Zero critical skill gaps — your verified profile covers all required stack
                  proficiencies.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {idea.skillGaps.map((gap) => (
                    <div
                      key={gap.skillSlug}
                      className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-surface-container-lowest border border-[#DBE2EF]/60 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-mono-tabular font-semibold text-[#112D4E] block">
                          #{gap.skillSlug} ({gap.severity})
                        </span>
                        <span className="text-on-surface-variant text-[11px]">
                          {gap.learningAction}
                        </span>
                      </div>
                      <span className="font-mono-tabular text-[11px] px-2 py-0.5 rounded bg-[#E3FDFD] text-[#004F53] font-semibold shrink-0">
                        +{gap.estimatedLearnHours}h
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-surface-container-low border border-[#DBE2EF]/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3F72AF] flex items-center gap-1.5">
                  <AppIcon name="layers" className="text-[16px]" />
                  Recommended Technology Stack
                </span>
                <span className="text-[11px] text-on-surface-variant">Grounded Stack</span>
              </div>
              <div className="space-y-1.5">
                {idea.recommendedStack.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-surface-container-lowest border border-[#DBE2EF]/60 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-on-surface-variant font-medium">
                        {item.layer}
                      </span>
                      <span className="font-mono-tabular font-semibold text-[#112D4E]">
                        {item.tech}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">{item.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Matched Supervisors Preview Strip */}
          {idea.supervisorMatches.length > 0 && (
            <div className="rounded-xl bg-[#F9F7F7] border border-[#DBE2EF] p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#112D4E] flex items-center gap-1.5">
                  <AppIcon name="person_search" className="text-[17px] text-[#3F72AF]" />
                  Matched Faculty Supervisors with Open Capacity
                </span>
                <Link
                  href={`/dashboard/supervisors?ideaId=${encodeURIComponent(idea.id)}`}
                  className="font-semibold text-[#2A609C] hover:text-[#112D4E] hover:underline"
                >
                  View All Ranked Faculty →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {idea.supervisorMatches.slice(0, 2).map((sup) => (
                  <div
                    key={sup.supervisorProfileId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#DBE2EF] bg-surface-container-lowest p-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-[#112D4E] truncate">
                          {sup.fullName}
                        </span>
                        <span className="font-mono-tabular text-[11px] rounded bg-[#DBE2EF]/70 px-1.5 py-0.5 font-semibold text-[#112D4E]">
                          {sup.matchPercentage}% Match
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                        {sup.rationale}
                      </p>
                    </div>
                    <span className="font-mono-tabular text-[11px] rounded-full bg-[#E3FDFD] border border-[#71C9CE]/50 px-2 py-0.5 font-semibold text-[#004F53] shrink-0">
                      {sup.availabilityAtMatch}/{sup.maxSlots} open
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#DBE2EF]">
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <AppIcon name="verified" className="text-[17px] text-[#004F53]" />
              <span>Calibrated to Departmental Capstone Guidelines</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleShortlist(idea)}
                data-testid={`shortlist-btn-${idea.track}`}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  isShortlisted
                    ? "bg-[#E3FDFD] text-[#004F53] border border-[#71C9CE]"
                    : "bg-surface-container-low hover:bg-[#DBE2EF] text-[#112D4E] border border-[#DBE2EF]"
                }`}
              >
                <AppIcon name={isShortlisted ? "bookmark_added" : "bookmark"} className="text-[16px]" />
                <span>{isShortlisted ? "Shortlisted ✓" : "Shortlist Idea"}</span>
              </button>

              <Link
                href={`/dashboard/supervisors?ideaId=${encodeURIComponent(idea.id)}`}
                className="px-3.5 py-2 rounded-lg bg-[#DBE2EF]/70 hover:bg-[#DBE2EF] text-[#112D4E] text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <AppIcon name="person_search" className="text-[16px]" />
                <span>Match Supervisor</span>
              </Link>

              <button
                type="button"
                onClick={() => handleOpenRoadmap(idea)}
                data-testid={`generate-roadmap-btn-${idea.track}`}
                className="px-4 py-2 rounded-lg bg-[#112D4E] hover:bg-[#3F72AF] text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
              >
                <AppIcon name="alt_route" className="text-[16px]" />
                <span>Build {studentProfile?.durationWeeks ?? 24}-Wk Roadmap</span>
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  const visibleIdeas =
    trackFilter === "ALL" ? ideas : ideas.filter((i) => i.track === trackFilter);

  return (
    <div className="space-y-6">
      {/* Stitch Top Command & Capstone Exploration Header */}
      <section className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#3F72AF]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#E3FDFD] font-semibold text-[#112D4E]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#71C9CE]" />
              STUDENT PORTAL
            </span>
            <span>/</span>
            <span className="font-semibold text-[#112D4E]">
              {portalSession.batchLabel || "Dept. of IT & Computing"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-[#DBE2EF]/60 text-[#112D4E] font-medium flex items-center gap-1">
              <AppIcon name="bolt" className="text-[15px] text-[#3F72AF]" />
              Daily Proposal Runs:{" "}
              <strong className="font-mono-tabular font-semibold">{runsLeftToday} / 5</strong>{" "}
              remaining
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="font-headline-lg text-2xl sm:text-3xl text-[#112D4E] font-bold tracking-tight">
            3-Track FYP Recommendations &amp; Feasibility
          </h1>
          <p className="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
            Personalized capstone proposals synthesized across historical department dissertation
            archives, faculty supervision capacity, and your verified skill profile.
          </p>
        </div>

        {/* Focus Note Input Strip */}
        <div className="p-2.5 rounded-xl bg-surface-container-low border border-[#DBE2EF] flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <AppIcon name="psychology" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3F72AF] text-[18px]" />
            <input
              type="text"
              value={focusNote}
              onChange={(e) => setFocusNote(e.target.value)}
              maxLength={240}
              placeholder="Optional topic focus (e.g., Prioritize low-resource edge deployment or open-source datasets)..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-lowest border border-[#DBE2EF] text-on-surface text-xs placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-[#3F72AF]/40"
            />
          </div>
          <button
            type="button"
            onClick={() => handleRunAnalysis(false)}
            disabled={runsLeftToday <= 0 || viewState === "LOADING"}
            className="px-4 h-10 rounded-lg bg-[#112D4E] hover:bg-[#3F72AF] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs shrink-0"
          >
            <AppIcon name="auto_awesome" className="text-[18px]" />
            <span>Run Hybrid Analysis</span>
          </button>
        </div>
      </section>

      {actionToast && (
        <div
          data-testid="recommendation-action-toast"
          className="flex items-center justify-between gap-2 rounded-xl border border-[#71C9CE]/60 bg-[#E3FDFD] px-4 py-3 text-xs font-medium text-[#004F53]"
        >
          <div className="flex items-center gap-2">
            <AppIcon name="check_circle" className="text-[18px]" />
            <span>{actionToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionToast(null)}
            className="text-xs font-semibold underline hover:opacity-80 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {usedFallback && (
        <div
          className="flex items-center gap-2.5 rounded-xl border border-[#DBE2EF] bg-surface-container-lowest px-4 py-3 text-xs text-[#112D4E]"
          data-testid="fallback-status-banner"
        >
          <AppIcon name="info" className="text-[18px] text-[#3F72AF] shrink-0" />
          <span>
            <strong>Deterministic Matching Active:</strong> Proposals and 4-factor feasibility
            scores were computed directly by the verified TypeScript hybrid engine.
          </span>
        </div>
      )}

      {viewState === "LOADING" && (
        <div
          className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest p-6 space-y-4"
          data-testid="recommendations-loading-state"
        >
          <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
            Executing 3-Stage Hybrid Recommendation Pipeline...
          </h2>
          <p className="text-xs text-on-surface-variant">{LOADING_STAGES[loadingStageIndex]}</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#DBE2EF]">
            <div
              className="h-full bg-[#112D4E] transition-all duration-150"
              style={{ width: `${((loadingStageIndex + 1) / LOADING_STAGES.length) * 100}%` }}
            />
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}

      {viewState === "EMPTY" && (
        <div
          className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest p-6 sm:p-8 space-y-4 shadow-xs"
          data-testid="recommendations-empty-state"
        >
          <div className="w-11 h-11 rounded-xl bg-[#E3FDFD] text-[#004F53] flex items-center justify-center">
            <AppIcon name="lightbulb" className="text-[24px]" />
          </div>
          <div className="space-y-1">
            <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
              No Recommendation Runs Executed Yet
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl">
              {studentProfile && studentProfile.skills.length >= 3
                ? "Your skill profile is calibrated and ready. Run your first hybrid analysis to synthesize 3 diversified capstone tracks."
                : "Complete at least 3 verified technical skills and 1 domain interest in your Skill Profile first to unlock personalized FYP recommendations."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {studentProfile && studentProfile.skills.length >= 3 ? (
              <Button onClick={() => handleRunAnalysis(false)}>
                Execute First Hybrid Run
              </Button>
            ) : (
              <Button asChild>
                <Link href="/dashboard/profile">Complete Skill Profile</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {viewState === "ERROR" && (
        <div
          className="rounded-xl border border-error/30 bg-error-container/50 p-6 space-y-3"
          data-testid="recommendations-error-state"
        >
          <h2 className="font-headline-sm text-lg font-bold text-on-error-container">
            Unable to Run Recommendation Analysis
          </h2>
          <p className="text-xs text-on-error-container">
            {errorMessage ??
              "Failed runs do not consume your 5/day student quota. Please verify your skill profile and retry."}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild variant="outline">
              <Link href="/dashboard/profile">Update Skill Profile</Link>
            </Button>
            {ideas.length > 0 && (
              <Button variant="outline" onClick={() => setViewState("POPULATED")}>
                Restore Last Verified Run
              </Button>
            )}
          </div>
        </div>
      )}

      {viewState === "POPULATED" && (
        <div className="space-y-5">
          {/* Stitch Track Navigation Strip */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#DBE2EF]/60 overflow-x-auto">
              {(
                [
                  { key: "ALL", label: "All 3 Tracks", dot: null },
                  { key: "CORE_SAFE", label: "Track 1: Core & Safe", dot: "bg-[#71C9CE]" },
                  { key: "CAREER_STRETCH", label: "Track 2: Career Stretch", dot: "bg-[#3F72AF]" },
                  { key: "RESEARCH_NICHE", label: "Track 3: Research & Niche", dot: "bg-[#112D4E]" },
                ] as const
              ).map((tab) => {
                const active = trackFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTrackFilter(tab.key)}
                    className={`px-3.5 py-1.5 rounded-md text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                      active
                        ? "bg-surface-container-lowest text-[#112D4E] font-semibold shadow-xs"
                        : "text-on-surface-variant hover:text-[#112D4E] font-medium"
                    }`}
                  >
                    {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}`} />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-xs text-[#3F72AF]">
              <span>
                Shortlisted Proposals:{" "}
                <strong className="font-mono-tabular text-[#112D4E]">
                  {shortlistedIds.length}
                </strong>
              </span>
            </div>
          </div>

          {/* Proposal Cards */}
          <div className="space-y-6">{visibleIdeas.map((idea) => renderIdeaCard(idea))}</div>
        </div>
      )}
    </div>
  );
}

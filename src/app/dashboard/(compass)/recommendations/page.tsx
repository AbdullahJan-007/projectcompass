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
import {
  generateRecommendations,
  updateIdeaStatus,
  getActiveRecommendationsSnapshot,
} from "@/actions/recommendation.actions";
import type { GeneratedIdeaRecord } from "@/lib/recommendation/engine";
import {
  loadStoredIdeas,
  saveStoredIdeas,
  loadStoredShortlistedIds,
  saveStoredShortlistedIds,
  loadStoredStudentProfile,
  type StoredStudentProfile,
} from "@/lib/workspace-store";

const INITIAL_IDEAS: [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord] = [
  {
    id: "cm0idea_core_safe_1",
    track: "CORE_SAFE",
    seedTemplateId: "cm0seed01cilogtriage00001",
    title: "Deterministic CI Log Anomaly Triage Engine for Small Engineering Teams",
    domain: "DevTools",
    problemStatement:
      "CI build failures generate thousands of lines of noisy console logs, forcing developers to manually grep stack traces and wasting hours on flaky test regressions.",
    proposedSolution:
      "GitHub Actions webhook service that parses build logs, clusters recurring failure signatures using vector embeddings, and posts root-cause PR diffs with benchmarked precision.",
    differentiationAngle:
      "Shifts from passive log visualization in Automated Server Log Visualizer (BSCS 2024 — 84% similarity) to real-time clustering of CI failure traces with GitHub PR root-cause attribution and benchmarked precision on open-source build logs.",
    difficulty: "MODERATE",
    recommendedStack: [
      {
        layer: "Frontend & Workspace",
        tech: "Next.js App Router + TypeScript",
        rationale: "Type-safe server components and fast diff visualization for CI failure clusters.",
      },
      {
        layer: "Application & Ingestion",
        tech: "Node.js + Inngest Webhooks",
        rationale: "Handles asynchronous GitHub Actions log payloads without serverless timeouts.",
      },
      {
        layer: "Data & Vector Persistence",
        tech: "PostgreSQL 16 + pgvector (HNSW)",
        rationale: "Single ACID store for build metadata and 1536-dim failure trace cosine search.",
      },
      {
        layer: "Verification & Eval",
        tech: "Vitest Precision Benchmark Suite",
        rationale: "Measures root-cause clustering F1 score against labeled build failure corpora.",
      },
    ],
    feasibilityScore: 84,
    skillOverlapScore: 34,
    timeFitScore: 26,
    resourceReadinessScore: 16,
    supervisorFitScore: 8,
    feasibilityExplanation:
      "Feasibility 84/100: Skill overlap 34/40 (4/5 core skills present), Time fit 26/30 (572h net budget vs 340h target), Resource readiness 16/20, and Matched open-capacity faculty similarity 84% (8/10).",
    duplicateRisk: "HIGH",
    highestArchiveSimilarity: 0.84,
    similarArchives: [
      {
        archiveId: "cm0arch01logvisualizer001",
        title: "Automated Server Log Visualizer and CI Failure Dashboard",
        academicYear: 2024,
        similarity: 0.84,
      },
    ],
    marketDemandTag: "DevTools · HIGH Demand (2026-Q4)",
    estimatedTotalHours: 340,
    skillGaps: [
      {
        skillSlug: "pgvector",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: "BEGINNER",
        severity: "MINOR",
        estimatedLearnHours: 10,
        learningAction:
          "Build a vertical prototype strengthening pgvector HNSW cosine distance queries and threshold tuning.",
      },
      {
        skillSlug: "github-actions",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: null,
        severity: "MODERATE",
        estimatedLearnHours: 12,
        learningAction:
          "Complete focused webhook signature verification labs and workflow artifact download scripts.",
      },
    ],
    supervisorMatches: [
      {
        supervisorProfileId: "cm0sup01kamransiddiqui001",
        fullName: "Dr. Kamran Siddiqui",
        title: "Associate Professor",
        rank: 1,
        matchPercentage: 88,
        sharedKeywords: ["DevTools", "typescript", "nodejs", "postgresql"],
        availabilityAtMatch: 3,
        maxSlots: 5,
        activeSlots: 2,
        rationale:
          "Dr. Kamran Siddiqui aligns on DevTools, typescript, nodejs, postgresql with 3 of 5 supervision slots currently open.",
      },
      {
        supervisorProfileId: "cm0sup03farhanqureshi0003",
        fullName: "Dr. Farhan Qureshi",
        title: "Assistant Professor",
        rank: 2,
        matchPercentage: 79,
        sharedKeywords: ["DevTools", "typescript"],
        availabilityAtMatch: 4,
        maxSlots: 5,
        activeSlots: 1,
        rationale:
          "Dr. Farhan Qureshi aligns on DevTools, typescript with 4 of 5 supervision slots currently open.",
      },
    ],
  },
  {
    id: "cm0idea_career_stretch_2",
    track: "CAREER_STRETCH",
    seedTemplateId: "cm0seed35llmcostgateway35",
    title: "Multi-Provider AI Gateway with pgvector Semantic Caching & Token Budget Quotas",
    domain: "Applied AI",
    problemStatement:
      "SaaS teams calling LLM APIs suffer runaway token bills on repetitive queries and hard outages when a single model provider hits rate limits.",
    proposedSolution:
      "OpenAI-compatible proxy gateway featuring cosine-threshold semantic caching in pgvector, automatic provider fallback, and per-tenant budget circuit breakers.",
    differentiationAngle: null,
    difficulty: "CHALLENGING",
    recommendedStack: [
      {
        layer: "Gateway Proxy & Routing",
        tech: "Next.js App Router + Node.js Streams",
        rationale: "Low-overhead request interception with streaming token accounting.",
      },
      {
        layer: "Semantic Cache Store",
        tech: "PostgreSQL + pgvector HNSW",
        rationale: "Sub-25ms cosine similarity lookup for semantically equivalent prompts.",
      },
      {
        layer: "AI Provider Abstraction",
        tech: "Vercel AI SDK + Zod Contracts",
        rationale: "Seamless failover across OpenAI-compatible endpoints with typed responses.",
      },
      {
        layer: "Telemetry & Quotas",
        tech: "Prisma ACID Token Ledger",
        rationale: "Enforces per-tenant daily spend caps and audit logging.",
      },
    ],
    feasibilityScore: 79,
    skillOverlapScore: 31,
    timeFitScore: 24,
    resourceReadinessScore: 16,
    supervisorFitScore: 8,
    feasibilityExplanation:
      "Feasibility 79/100: Skill overlap 31/40 (4/5 core skills present), Time fit 24/30 (570h net budget vs 385h target), Resource readiness 16/20, and Matched open-capacity faculty similarity 86% (8/10).",
    duplicateRisk: "MODERATE",
    highestArchiveSimilarity: 0.75,
    similarArchives: [
      {
        archiveId: "cm0arch02examchatbot00002",
        title: "University Course Material Q&A Assistant Using Vector Search",
        academicYear: 2025,
        similarity: 0.75,
      },
    ],
    marketDemandTag: "Applied AI · HIGH Demand (2026-Q4)",
    estimatedTotalHours: 385,
    skillGaps: [
      {
        skillSlug: "llm-evaluation",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: null,
        severity: "MODERATE",
        estimatedLearnHours: 14,
        learningAction:
          "Implement semantic cache hit/miss precision benchmarks and false-positive drift tests.",
      },
      {
        skillSlug: "pgvector",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: "BEGINNER",
        severity: "MINOR",
        estimatedLearnHours: 10,
        learningAction:
          "Tune HNSW ef_search and cosine distance thresholds for cache hit latency < 20ms.",
      },
    ],
    supervisorMatches: [
      {
        supervisorProfileId: "cm0sup02ayesharehman00002",
        fullName: "Dr. Ayesha Rehman",
        title: "Associate Professor",
        rank: 1,
        matchPercentage: 86,
        sharedKeywords: ["Applied AI", "pgvector", "llm-evaluation", "nextjs"],
        availabilityAtMatch: 2,
        maxSlots: 5,
        activeSlots: 3,
        rationale:
          "Dr. Ayesha Rehman aligns on Applied AI, pgvector, llm-evaluation with 2 of 5 supervision slots currently open.",
      },
    ],
  },
  {
    id: "cm0idea_research_niche_3",
    track: "RESEARCH_NICHE",
    seedTemplateId: "cm0seed08sbomguard0000008",
    title: "Reachability-Aware SBOM & Transitive Dependency Exploitability Verifier",
    domain: "Cybersecurity",
    problemStatement:
      "Standard npm/pip audit tools flood developers with hundreds of CVE alerts even when the vulnerable function is never reachable in application code.",
    proposedSolution:
      "Call-graph reachability analyzer that cross-references CycloneDX SBOM advisories against actual imported symbols to prioritize truly exploitable CVEs.",
    differentiationAngle: null,
    difficulty: "CHALLENGING",
    recommendedStack: [
      {
        layer: "Static Call-Graph Engine",
        tech: "TypeScript Compiler AST API",
        rationale: "Traces symbol imports and function call paths across transitive packages.",
      },
      {
        layer: "SBOM & Advisory Parser",
        tech: "CycloneDX + OSV Schema Validator",
        rationale: "Ingests standardized vulnerability feeds with exact affected symbol metadata.",
      },
      {
        layer: "Persistence & Audit Trail",
        tech: "PostgreSQL + Prisma ORM",
        rationale: "Stores repository scan snapshots, reachability proofs, and remediation diffs.",
      },
      {
        layer: "Security Dashboard",
        tech: "Next.js App Router + Tailwind CSS",
        rationale: "Renders interactive dependency call chains and false-positive reduction metrics.",
      },
    ],
    feasibilityScore: 74,
    skillOverlapScore: 24,
    timeFitScore: 22,
    resourceReadinessScore: 20,
    supervisorFitScore: 8,
    feasibilityExplanation:
      "Feasibility 74/100: Skill overlap 24/40 (2/5 core skills present), Time fit 22/30 (552h net budget vs 410h target), Resource readiness 20/20, and Matched open-capacity faculty similarity 85% (8/10).",
    duplicateRisk: "LOW",
    highestArchiveSimilarity: 0.58,
    similarArchives: [
      {
        archiveId: "cm0arch04vulnheaderscan04",
        title: "Web Application HTTP Security Header and OWASP Checklist Scanner",
        academicYear: 2023,
        similarity: 0.58,
      },
    ],
    marketDemandTag: "Cybersecurity · HIGH Demand (2026-Q4)",
    estimatedTotalHours: 410,
    skillGaps: [
      {
        skillSlug: "sbom-supply-chain",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: null,
        severity: "CRITICAL",
        estimatedLearnHours: 18,
        learningAction:
          "Study CycloneDX 1.5 JSON specification and OSV vulnerability advisory matching.",
      },
      {
        skillSlug: "ast-parsing",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: null,
        severity: "MODERATE",
        estimatedLearnHours: 14,
        learningAction:
          "Build a TypeScript ts.createProgram call-graph walker over a sample monorepo.",
      },
    ],
    supervisorMatches: [
      {
        supervisorProfileId: "cm0sup03farhanqureshi0003",
        fullName: "Dr. Farhan Qureshi",
        title: "Assistant Professor",
        rank: 1,
        matchPercentage: 87,
        sharedKeywords: ["Cybersecurity", "sbom-supply-chain", "ast-parsing", "owasp-security"],
        availabilityAtMatch: 4,
        maxSlots: 5,
        activeSlots: 1,
        rationale:
          "Dr. Farhan Qureshi aligns on Cybersecurity, sbom-supply-chain, ast-parsing with 4 of 5 supervision slots currently open.",
      },
    ],
  },
];

const LOADING_STAGES = [
  "Stage 1: Filtering supervisor slot quotas (activeSlots < maxSlots) & effort ceiling...",
  "Stage 2: Querying pgvector HNSW archive embeddings for >= 0.82 duplicate gate...",
  "Stage 2: Computing deterministic 4-factor Feasibility Scores (40/30/20/10)...",
  "Stage 3: Applying MMR diversity selection & synthesizing grounded proposals...",
];

export default function RecommendationsPage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<[GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord]>(
    INITIAL_IDEAS
  );
  const [shortlistedIds, setShortlistedIds] = useState<string[]>(["cm0idea_core_safe_1"]);
  const [studentProfile, setStudentProfile] = useState<StoredStudentProfile | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [expandedScoreIds, setExpandedScoreIds] = useState<string[]>([
    "cm0idea_core_safe_1",
    "cm0idea_career_stretch_2",
    "cm0idea_research_niche_3",
  ]);
  const [focusNote, setFocusNote] = useState("");
  const [usedFallback, setUsedFallback] = useState(false);
  const [runsLeftToday, setRunsLeftToday] = useState(4);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const [viewState, setViewState] = useState<"POPULATED" | "LOADING" | "EMPTY" | "ERROR">(
    "POPULATED"
  );

  useEffect(() => {
    const loadedIdeas = loadStoredIdeas(INITIAL_IDEAS);
    setIdeas(loadedIdeas);
    saveStoredIdeas(loadedIdeas);
    setShortlistedIds(loadStoredShortlistedIds(["cm0idea_core_safe_1"]));
    setStudentProfile(loadStoredStudentProfile());

    getActiveRecommendationsSnapshot()
      .then((snap) => {
        if (snap && Array.isArray(snap.ideas) && snap.ideas.length === 3) {
          setIdeas(snap.ideas);
          saveStoredIdeas(snap.ideas);
          setShortlistedIds(snap.shortlistedIds);
          saveStoredShortlistedIds(snap.shortlistedIds);
          setRunsLeftToday(snap.runsRemainingToday);
          setUsedFallback(snap.usedFallback);
        }
      })
      .catch(() => {
        // Keep local snapshot
      });
  }, []);

  async function handleRunAnalysis(simulateFallback = false) {
    if (runsLeftToday <= 0) return;
    setViewState("LOADING");
    setLoadingStageIndex(0);
    setActionToast(null);

    const activeProfile = loadStoredStudentProfile();
    setStudentProfile(activeProfile);

    const interval = setInterval(() => {
      setLoadingStageIndex((prev) => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
    }, 350);

    const res = await generateRecommendations({
      focusNote: focusNote.trim() || undefined,
      forceLlmFailure: simulateFallback,
      profileOverride: {
        skills: activeProfile.skills.map((s) => ({
          skillSlug: s.skillSlug,
          proficiency: s.proficiency,
        })),
        interests: activeProfile.interests,
        careerGoal: activeProfile.careerGoal,
        preferredType: activeProfile.preferredType,
        weeklyHours: activeProfile.weeklyHours,
        durationWeeks: activeProfile.durationWeeks,
        teamSize: activeProfile.teamSize,
      },
    });

    clearInterval(interval);

    if (!res.ok) {
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
      `Generated 3 diversified FYP proposals calibrated to your ${activeProfile.skills.length} skills and ${res.data.engineResult.totalEffortHours}h effort budget.`
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
    saveStoredIdeas(ideas);

    setActionToast(
      isCurrentlyShortlisted
        ? `Removed "${idea.title}" from your shortlisted proposals.`
        : `Shortlisted "${idea.title}" (${idea.track}). Ready for Supervisor Matching and Roadmap Generation.`
    );

    await updateIdeaStatus({ ideaId: idea.id, status: nextStatus });
  }

  function handleOpenRoadmap(idea: GeneratedIdeaRecord) {
    saveStoredIdeas(ideas);
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
                High Similarity Detected (&gt;= 0.82) — Mandatory Differentiation Enforced
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
              <span>Related Past FYPs in Department Archive (0.72 – 0.81)</span>
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
          <span>Original Direction — Low Archive Overlap (&lt; 0.72)</span>
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
        <Badge variant="default">Track 1 · Core &amp; Safe</Badge>
      ) : idea.track === "CAREER_STRETCH" ? (
        <Badge variant="amber">Track 2 · Career Stretch</Badge>
      ) : (
        <Badge variant="info">Track 3 · Research &amp; Niche</Badge>
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
                <span>{isShortlisted ? "Shortlisted ✓" : "Shortlist Idea"}</span>
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

          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-1.5">
              <CardTitle className="text-[20px] leading-[1.3]">{idea.title}</CardTitle>
              <CardDescription>{idea.problemStatement}</CardDescription>
            </div>

            <div className="flex flex-col items-end rounded-[8px] border border-brand-primary/30 bg-brand-tint/40 px-4 py-2.5">
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
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
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
                  Zero critical skill gaps — your current profile satisfies all required stack
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
                View All Ranked Faculty &amp; Send Request →
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
      <section className="rounded-[8px] border border-border-default bg-grad-ambient p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">Fall 2026 – Spring 2027 Proposals</Badge>
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
                hrs ({studentProfile?.weeklyHours ?? 15}h/wk ×{" "}
                {studentProfile?.durationWeeks ?? 24} wks)
              </span>
              <span className="font-mono-tabular text-xs font-semibold text-brand-primary">
                · {runsLeftToday} of 5 daily evaluations left
              </span>
            </div>
            <h1 className="text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-primary">
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
              Your skill profile is marked READY. Trigger your first hybrid analysis to receive 3
              diversified FYP proposals (`CORE_SAFE`, `CAREER_STRETCH`, `RESEARCH_NICHE`).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleRunAnalysis(false)}>
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
              Execute First Hybrid Run
            </Button>
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
              Recommendation Run Interrupted
            </CardTitle>
            <CardDescription className="text-status-error-text">
              Failed runs do not consume your 5/day student quota. You can retry immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setViewState("POPULATED")}>
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
              Restore Last Verified Run
            </Button>
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

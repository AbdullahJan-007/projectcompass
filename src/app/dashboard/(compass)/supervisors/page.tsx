"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Users,
  Send,
  XCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Lock,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { DEMO_SUPERVISORS } from "@/lib/recommendation/seed-data";
import { rankAvailableSupervisors } from "@/lib/recommendation/supervisor-ranker";
import { generateDeterministicEmbedding } from "@/lib/ai/embeddings";
import {
  createSupervisionRequest,
  withdrawSupervisionRequest,
} from "@/actions/supervisor.actions";
import {
  loadStoredIdeas,
  loadStoredSupervisionRequests,
  saveStoredSupervisionRequests,
  formatTrackLabel,
  type StoredSupervisionRequest,
} from "@/lib/workspace-store";
import type { GeneratedIdeaRecord } from "@/lib/recommendation/engine";

const DEFAULT_IDEAS_FOR_SUPERVISORS: [
  GeneratedIdeaRecord,
  GeneratedIdeaRecord,
  GeneratedIdeaRecord,
] = [
  {
    id: "cm0idea_core_safe_1",
    track: "CORE_SAFE",
    seedTemplateId: "cm0seed01cilogtriage00001",
    title: "Deterministic CI Log Anomaly Triage Engine for Small Engineering Teams",
    domain: "DevTools",
    problemStatement: "",
    proposedSolution: "",
    differentiationAngle: null,
    difficulty: "MODERATE",
    recommendedStack: [],
    feasibilityScore: 84,
    skillOverlapScore: 34,
    timeFitScore: 26,
    resourceReadinessScore: 16,
    supervisorFitScore: 8,
    feasibilityExplanation: "",
    duplicateRisk: "HIGH",
    highestArchiveSimilarity: 0.84,
    similarArchives: [],
    marketDemandTag: "DevTools · HIGH Demand",
    estimatedTotalHours: 340,
    skillGaps: [
      {
        skillSlug: "pgvector",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: "BEGINNER",
        severity: "MINOR",
        estimatedLearnHours: 10,
        learningAction: "",
      },
    ],
    supervisorMatches: [],
  },
  {
    id: "cm0idea_career_stretch_2",
    track: "CAREER_STRETCH",
    seedTemplateId: "cm0seed35llmcostgateway35",
    title: "Multi-Provider AI Gateway with pgvector Semantic Caching & Token Budget Quotas",
    domain: "Applied AI",
    problemStatement: "",
    proposedSolution: "",
    differentiationAngle: null,
    difficulty: "CHALLENGING",
    recommendedStack: [],
    feasibilityScore: 79,
    skillOverlapScore: 31,
    timeFitScore: 24,
    resourceReadinessScore: 16,
    supervisorFitScore: 8,
    feasibilityExplanation: "",
    duplicateRisk: "MODERATE",
    highestArchiveSimilarity: 0.75,
    similarArchives: [],
    marketDemandTag: "Applied AI · HIGH Demand",
    estimatedTotalHours: 385,
    skillGaps: [
      {
        skillSlug: "llm-evaluation",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: null,
        severity: "MODERATE",
        estimatedLearnHours: 14,
        learningAction: "",
      },
    ],
    supervisorMatches: [],
  },
  {
    id: "cm0idea_research_niche_3",
    track: "RESEARCH_NICHE",
    seedTemplateId: "cm0seed08sbomguard0000008",
    title: "Reachability-Aware SBOM & Transitive Dependency Exploitability Verifier",
    domain: "Cybersecurity",
    problemStatement: "",
    proposedSolution: "",
    differentiationAngle: null,
    difficulty: "CHALLENGING",
    recommendedStack: [],
    feasibilityScore: 74,
    skillOverlapScore: 24,
    timeFitScore: 22,
    resourceReadinessScore: 20,
    supervisorFitScore: 8,
    feasibilityExplanation: "",
    duplicateRisk: "LOW",
    highestArchiveSimilarity: 0.58,
    similarArchives: [],
    marketDemandTag: "Cybersecurity · HIGH Demand",
    estimatedTotalHours: 410,
    skillGaps: [
      {
        skillSlug: "sbom-supply-chain",
        requiredProficiency: "INTERMEDIATE",
        currentProficiency: null,
        severity: "CRITICAL",
        estimatedLearnHours: 18,
        learningAction: "",
      },
    ],
    supervisorMatches: [],
  },
];

const INITIAL_SUPERVISION_REQUESTS: StoredSupervisionRequest[] = [];

function StudentSupervisorsWorkspace() {
  const searchParams = useSearchParams();
  const [availableIdeas, setAvailableIdeas] = useState<
    [GeneratedIdeaRecord, GeneratedIdeaRecord, GeneratedIdeaRecord]
  >(DEFAULT_IDEAS_FOR_SUPERVISORS);
  const [selectedIdeaId, setSelectedIdeaId] = useState("cm0idea_core_safe_1");
  const [showFullCapacity, setShowFullCapacity] = useState(false);
  const [modalSupervisor, setModalSupervisor] = useState<{
    id: string;
    fullName: string;
    title: string;
  } | null>(null);
  const [pitchText, setPitchText] = useState(
    "We have shortlisted the Deterministic CI Log Anomaly Triage Engine (Feasibility 84/100) and built an initial TypeScript + PostgreSQL pgvector log parser. We would like to request your supervision for the Fall 2026 - Spring 2027 cohort."
  );
  const [sentRequests, setSentRequests] = useState<StoredSupervisionRequest[]>(
    INITIAL_SUPERVISION_REQUESTS
  );
  const [viewState, setViewState] = useState<"POPULATED" | "LOADING" | "EMPTY" | "ERROR">(
    "POPULATED"
  );
  void setViewState;
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const ideas = loadStoredIdeas(DEFAULT_IDEAS_FOR_SUPERVISORS);
    setAvailableIdeas(ideas);
    const paramIdeaId = searchParams?.get("ideaId");
    if (paramIdeaId && ideas.some((i) => i.id === paramIdeaId)) {
      setSelectedIdeaId(paramIdeaId);
    } else if (ideas[0]) {
      setSelectedIdeaId(ideas[0].id);
    }
    setSentRequests(loadStoredSupervisionRequests(INITIAL_SUPERVISION_REQUESTS));
  }, [searchParams]);

  const activeIdea = useMemo(() => {
    return availableIdeas.find((i) => i.id === selectedIdeaId) ?? availableIdeas[0];
  }, [availableIdeas, selectedIdeaId]);

  const ideaContext = useMemo(() => {
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
    const supInputs = DEMO_SUPERVISORS.map((s) => ({
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
  }, [ideaContext]);

  const activePendingCount = sentRequests.filter((r) => r.status === "PENDING").length;

  async function handleSubmitPitch() {
    if (!modalSupervisor) return;

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

    const res = await createSupervisionRequest({
      recommendedIdeaId: selectedIdeaId,
      supervisorProfileId: modalSupervisor.id,
      studentPitch: pitchText.trim(),
    });

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
        activeIdea.skillGaps.map((g) => `${g.skillSlug} (${g.estimatedLearnHours}h)`).join(", ") ||
        "Zero critical skill gaps",
      pitch: pitchText.trim(),
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    const nextRequests = [...sentRequests, newReq];
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default">Availability-Aware Faculty Ranker</Badge>
            <Badge variant={activePendingCount < 3 ? "success" : "warning"}>
              Active Pending Requests: {activePendingCount} / 3 Max
            </Badge>
          </div>
          <h1 className="mt-2 text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-primary">
            Supervisor Matching &amp; Supervision Requests
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Ranked by 70% research domain similarity, 20% skill overlap, and 10% remaining slot
            capacity balance. Full-capacity faculty are excluded from primary rankings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            aria-label="Shortlisted Idea Filter"
            value={selectedIdeaId}
            onChange={(e) => setSelectedIdeaId(e.target.value)}
            className="w-80"
          >
            {availableIdeas.map((idea) => (
              <option key={idea.id} value={idea.id}>
                {formatTrackLabel(idea.track)} — {idea.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {bannerMessage && (
        <div
          className={`flex items-center gap-2 rounded-[6px] border px-4 py-2.5 text-xs font-medium ${
            bannerMessage.type === "success"
              ? "border-status-success/30 bg-status-success-tint text-status-success-text"
              : "border-status-error/30 bg-status-error-tint text-status-error-text"
          }`}
        >
          {bannerMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{bannerMessage.text}</span>
        </div>
      )}

      {viewState === "LOADING" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      )}

      {viewState === "ERROR" && (
        <Card className="border-status-error/30 bg-status-error-tint/30">
          <CardHeader>
            <CardTitle className="text-status-error-text">
              Supervisor Slot Availability Check Failed
            </CardTitle>
            <CardDescription className="text-status-error-text">
              Could not verify live supervision quotas from the department database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setViewState("POPULATED")}>
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
              Retry Faculty Query
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "EMPTY" && (
        <Card className="bg-grad-ambient">
          <CardHeader>
            <CardTitle>No Supervisors Onboarded for Your Department Yet</CardTitle>
            <CardDescription>
              Your Feasibility Score defaulted to a neutral 6/10 Supervisor Fit baseline. Share the
              recommended specialization profile below with your FYP Coordinator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setViewState("POPULATED")}>
              Load Demo BSCS Faculty Roster
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "POPULATED" && (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            {availableMatches.map((match) => {
              const rawSup = DEMO_SUPERVISORS.find(
                (s) => s.id === match.supervisorProfileId
              );
              const alreadyRequested = sentRequests.some(
                (r) =>
                  r.supervisorProfileId === match.supervisorProfileId &&
                  r.ideaId === selectedIdeaId &&
                  r.status === "PENDING"
              );

              return (
                <Card key={match.supervisorProfileId}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="font-mono-tabular">
                          Rank #{match.rank} · {match.matchPercentage}% Match
                        </Badge>
                        <Badge variant="success" className="font-mono-tabular">
                          {match.availabilityAtMatch} of {match.maxSlots} slots open
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="mt-2">{match.fullName}</CardTitle>
                    <CardDescription>{match.title} · BSCS Department</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {rawSup?.bio ?? match.rationale}
                    </p>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted">Supervision Capacity Bar</span>
                        <span className="font-mono-tabular font-semibold text-text-primary">
                          {match.activeSlots} filled / {match.maxSlots} max
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
                        <div
                          className="h-full bg-brand-primary"
                          style={{
                            width: `${(match.activeSlots / match.maxSlots) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {match.sharedKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="rounded-[4px] bg-brand-tint/60 px-2 py-0.5 font-mono-tabular text-[11px] font-medium text-brand-primary-hover"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2">
                      <Button
                        className="w-full"
                        disabled={alreadyRequested || activePendingCount >= 3}
                        onClick={() =>
                          setModalSupervisor({
                            id: match.supervisorProfileId,
                            fullName: match.fullName,
                            title: match.title,
                          })
                        }
                      >
                        <Send className="h-4 w-4" strokeWidth={1.75} />
                        {alreadyRequested
                          ? "Supervision Request Pending"
                          : "Request Supervision"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Collapsed Full-Capacity Disclosure */}
          <Card className="bg-bg-subtle/60">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
                  <span className="text-sm font-semibold text-text-secondary">
                    Currently at Full Capacity ({fullCapacitySupervisors.length} Faculty Excluded
                    from Primary Ranking)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullCapacity((prev) => !prev)}
                >
                  {showFullCapacity ? (
                    <>
                      Hide Full Capacity <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Inspect Full Capacity <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            {showFullCapacity && (
              <CardContent className="space-y-3 pt-0">
                {fullCapacitySupervisors.map((sup) => (
                  <div
                    key={sup.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border-default bg-bg-surface p-3.5 opacity-75"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">
                          {sup.fullName}
                        </span>
                        <Badge variant="error" className="font-mono-tabular">
                          {sup.activeSlots} of {sup.maxSlots} slots filled (FULL)
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-text-muted">
                        Domains: {sup.researchDomains.join(", ")}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" disabled>
                      Quota Full (Disabled)
                    </Button>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Active Sent Requests Ledger */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-primary" strokeWidth={1.75} />
                <CardTitle>Your Submitted Supervision Interest Requests</CardTitle>
              </div>
              <CardDescription>
                Students can maintain at most 3 simultaneous PENDING requests to prevent faculty
                inbox spam.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sentRequests.length === 0 ? (
                <div className="rounded-[8px] border border-dashed border-border-strong bg-bg-subtle/60 p-6 text-center text-xs text-text-secondary">
                  No supervision requests submitted yet. Choose a matched supervisor above and click{" "}
                  <strong className="text-text-primary">Request Supervision</strong> to send your
                  project pitch.
                </div>
              ) : (
                sentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-border-default bg-bg-surface p-4"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            req.status === "PENDING"
                              ? "amber"
                              : req.status === "ACCEPTED"
                                ? "success"
                                : "neutral"
                          }
                        >
                          {req.status}
                        </Badge>
                        <span className="text-sm font-semibold text-text-primary">
                          {req.supervisorName}
                        </span>
                        <span className="text-xs text-text-muted">· {req.ideaTitle}</span>
                      </div>
                      <p className="text-xs text-text-secondary">{req.pitch}</p>
                    </div>

                    {req.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWithdraw(req.id)}
                      >
                        <XCircle className="h-4 w-4 text-status-error" strokeWidth={1.75} />
                        Withdraw Request
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={modalSupervisor !== null}
        onOpenChange={(open) => {
          if (!open) setModalSupervisor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Submit Supervision Request to {modalSupervisor?.fullName}
            </DialogTitle>
            <DialogDescription>
              Proposal: <strong>{ideaContext.title}</strong>. Your pitch (40–1000 chars) and
              verified 4-factor Feasibility Score will be shared with the supervisor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Structured Student Pitch ({pitchText.length}/1000 chars)
            </label>
            <Textarea
              value={pitchText}
              onChange={(e) => setPitchText(e.target.value)}
              rows={5}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalSupervisor(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitPitch} disabled={pitchText.trim().length < 40}>
              <Send className="h-4 w-4" strokeWidth={1.75} />
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StudentSupervisorsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <StudentSupervisorsWorkspace />
    </Suspense>
  );
}

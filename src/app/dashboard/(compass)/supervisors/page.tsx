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

function StudentSupervisorsWorkspace() {
  const searchParams = useSearchParams();
  const portalSession = usePortalSession();
  const [supervisors, setSupervisors] = useState<LiveSupervisorDirectoryItem[]>([]);
  const [availableIdeas, setAvailableIdeas] = useState<GeneratedIdeaRecord[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("ALL");
  const [showFullCapacity, setShowFullCapacity] = useState(false);
  const [modalSupervisor, setModalSupervisor] = useState<{
    id: string;
    fullName: string;
    title: string;
  } | null>(null);
  const [pitchText, setPitchText] = useState(
    "We have shortlisted our FYP proposal with verified skill and timeline feasibility and would like to request your supervision within the Department of IT & Computing."
  );
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
            status:
              r.status === "RELEASED" ? "DECLINED" : r.status,
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
        setViewState("EMPTY");
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
        activeIdea?.skillGaps.map((g) => `${g.skillSlug} (${g.estimatedLearnHours}h)`).join(", ") ||
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
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">
              {portalSession.batchLabel || "Department of IT & Computing"}
            </Badge>
            <Badge variant={activePendingCount < 3 ? "success" : "warning"}>
              Active Pending Requests: {activePendingCount} / 3 Max
            </Badge>
          </div>
          <h1 className="mt-2 text-[22px] sm:text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-primary">
            Supervisor Matching &amp; Supervision Requests
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Matched across the Department of IT &amp; Computing (BSIT, BSCS, BSSE, BSAI, BSCY, BSDS)
            by 70% domain similarity, 20% skill overlap, and 10% open slot capacity.
          </p>
        </div>

        <div className="grid gap-2.5 sm:flex sm:flex-wrap sm:items-center">
          <Select
            aria-label="Filter IT Program"
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="ALL">All IT &amp; Computing Faculty</option>
            <option value="BSIT">BSIT Faculty</option>
            <option value="BSCS">BSCS Faculty</option>
            <option value="BSSE">BSSE Faculty</option>
            <option value="BSAI">BSAI Faculty</option>
            <option value="BSCY">BSCY Faculty</option>
            <option value="BSDS">BSDS Faculty</option>
          </Select>

          {availableIdeas.length > 0 && (
            <Select
              aria-label="Shortlisted Idea Filter"
              value={selectedIdeaId}
              onChange={(e) => setSelectedIdeaId(e.target.value)}
              className="w-full sm:w-72"
            >
              {availableIdeas.map((idea) => (
                <option key={idea.id} value={idea.id}>
                  {formatTrackLabel(idea.track)} — {idea.title}
                </option>
              ))}
            </Select>
          )}
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
            <CardTitle>No Faculty Supervisors Registered Yet</CardTitle>
            <CardDescription>
              Once faculty supervisors from the Department of IT &amp; Computing register via{" "}
              <code className="font-mono-tabular">/sign-up</code> and publish their research domains
              and slot capacity, they will appear here ranked by alignment with your FYP proposal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/dashboard/recommendations">View FYP Recommendations</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "POPULATED" && (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            {availableMatches.map((match) => {
              const rawSup = supervisors.find(
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
                          Rank #{match.rank} Â· {match.matchPercentage}% Match
                        </Badge>
                        <Badge variant="success" className="font-mono-tabular">
                          {match.availabilityAtMatch} of {match.maxSlots} slots open
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="mt-2">{match.fullName}</CardTitle>
                    <CardDescription>
                      {match.title} Â· {rawSup?.programCode ?? "IT & Computing"} Track
                    </CardDescription>
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
                        <span className="text-xs text-text-muted">Â· {req.ideaTitle}</span>
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
              Proposal: <strong>{ideaContext.title}</strong>. Your pitch (40â€“1000 chars) and
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

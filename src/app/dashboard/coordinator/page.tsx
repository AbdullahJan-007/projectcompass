"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createArchiveRecord,
  retryArchiveEmbedding,
  deleteArchiveRecord,
} from "@/actions/archive.actions";
import { getCoordinatorWorkspaceData } from "@/actions/workspace.actions";
import { AppIcon } from "@/components/ui/app-icon";
import { getPakistanYear } from "@/lib/time/pakistan-time";

type IngestStatus =
  | "READY"
  | "PENDING_EMBEDDING"
  | "PROCESSING"
  | "NEEDS_MANUAL_ABSTRACT"
  | "FAILED";

interface ArchiveRow {
  id: string;
  title: string;
  abstract: string;
  academicYear: number;
  programCode: "BSIT" | "BSCS" | "BSSE" | "BSAI" | "BSCY" | "BSDS";
  domain: string;
  techStack: string[];
  ingestStatus: IngestStatus;
  ingestError?: string;
}

const ARCHIVE_PROGRAMS: Array<"BSIT" | "BSCS" | "BSSE" | "BSAI" | "BSCY" | "BSDS"> = [
  "BSIT",
  "BSCS",
  "BSSE",
  "BSAI",
  "BSCY",
  "BSDS",
];

export default function CoordinatorDashboardPage() {
  const [archives, setArchives] = useState<ArchiveRow[]>([]);
  const [totalSupervisorsSlots, setTotalSupervisorsSlots] = useState(0);
  const [filledSupervisorSlots, setFilledSupervisorSlots] = useState(0);
  const [supervisorCount, setSupervisorCount] = useState(0);

  const [title, setTitle] = useState("");
  const [abstractText, setAbstractText] = useState("");
  const [academicYear, setAcademicYear] = useState(() => getPakistanYear());
  const [programCode, setProgramCode] = useState<
    "BSIT" | "BSCS" | "BSSE" | "BSAI" | "BSCY" | "BSDS"
  >("BSIT");
  const [filterProgram, setFilterProgram] = useState<string>("ALL");
  const [domain, setDomain] = useState("DevTools");
  const [techStackText, setTechStackText] = useState("");
  const [editingArchiveId, setEditingArchiveId] = useState<string | null>(null);
  const [manualAbstractPatch, setManualAbstractPatch] = useState("");
  const [viewState, setViewState] = useState<"POPULATED" | "LOADING" | "ERROR">("LOADING");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    getCoordinatorWorkspaceData()
      .then((data) => {
        setArchives(
          data.archives.map((a) => ({
            ...a,
            programCode: (ARCHIVE_PROGRAMS.includes(
              a.programCode as ArchiveRow["programCode"]
            )
              ? a.programCode
              : "BSCS") as ArchiveRow["programCode"],
          }))
        );
        setTotalSupervisorsSlots(data.totalSupervisorsSlots);
        setFilledSupervisorSlots(data.filledSupervisorSlots);
        setSupervisorCount(data.supervisorCount);
        setViewState("POPULATED");
      })
      .catch(() => {
        setArchives([]);
        setViewState("ERROR");
      });
  }, []);

  const readyCount = archives.filter((a) => a.ingestStatus === "READY").length;
  const attentionCount = archives.filter((a) => a.ingestStatus !== "READY").length;

  async function handleCreateArchive(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (title.trim().length < 8) {
      setFeedback({ type: "error", text: "Archive title must be at least 8 characters." });
      return;
    }
    if (abstractText.trim().length < 10) {
      setFeedback({
        type: "error",
        text: "Please enter a project abstract (100+ chars for immediate indexing).",
      });
      return;
    }

    const stack = techStackText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const isShortAbstract = abstractText.trim().length < 100;
    const newStatus: IngestStatus = isShortAbstract ? "NEEDS_MANUAL_ABSTRACT" : "READY";

    const res = await createArchiveRecord({
      title,
      abstract: abstractText,
      academicYear,
      programCode,
      domain,
      techStack: stack.length > 0 ? stack : ["TypeScript"],
    });

    if (!res.ok) {
      setFeedback({ type: "error", text: res.error.message });
      return;
    }

    const createdId = res.data.archiveId;
    setArchives((prev) => [
      {
        id: createdId,
        title: title.trim(),
        abstract: abstractText.trim(),
        academicYear,
        programCode,
        domain,
        techStack: stack.length > 0 ? stack : ["TypeScript"],
        ingestStatus: newStatus,
        ingestError: isShortAbstract
          ? "Abstract shorter than 100 chars — requires manual abstract completion before pgvector indexing."
          : undefined,
      },
      ...prev,
    ]);

    setTitle("");
    setAbstractText("");
    setTechStackText("");
    setFeedback({
      type: "success",
      text: isShortAbstract
        ? "Record saved in NEEDS_MANUAL_ABSTRACT state (under 100 chars)."
        : "Archive ingested and 1536-dim pgvector embedding indexed.",
    });
  }

  async function handleRetryOrPatch(archiveId: string) {
    setFeedback(null);
    const res = await retryArchiveEmbedding({
      archiveId,
      updatedAbstract: manualAbstractPatch.length >= 100 ? manualAbstractPatch : undefined,
    });

    if (!res.ok) {
      setFeedback({ type: "error", text: res.error.message });
      return;
    }

    setArchives((prev) =>
      prev.map((row) =>
        row.id === archiveId
          ? {
              ...row,
              abstract:
                manualAbstractPatch.length >= 100 ? manualAbstractPatch : row.abstract,
              ingestStatus: "READY",
              ingestError: undefined,
            }
          : row
      )
    );
    setEditingArchiveId(null);
    setManualAbstractPatch("");
    setFeedback({
      type: "success",
      text: `Archive ${archiveId} re-embedded and transitioned to READY.`,
    });
  }

  async function handleDelete(archiveId: string) {
    setFeedback(null);
    const res = await deleteArchiveRecord({ archiveId });
    if (!res.ok) {
      setFeedback({ type: "error", text: res.error.message });
      return;
    }
    setArchives((prev) => prev.filter((a) => a.id !== archiveId));
    setFeedback({
      type: "success",
      text: `Archive record ${archiveId} removed and logged to AuditLog.`,
    });
  }

  function renderStatusBadge(status: IngestStatus) {
    switch (status) {
      case "READY":
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#E3FDFD] border border-[#71C9CE]/50 text-[#004F53] font-mono-tabular text-[11px] font-semibold">
            READY (pgvector Indexed)
          </span>
        );
      case "PENDING_EMBEDDING":
      case "PROCESSING":
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#DBE2EF] text-[#112D4E] font-mono-tabular text-[11px] font-semibold">
            {status}
          </span>
        );
      case "NEEDS_MANUAL_ABSTRACT":
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-mono-tabular text-[11px] font-semibold">
            NEEDS_MANUAL_ABSTRACT
          </span>
        );
      case "FAILED":
        return (
          <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-mono-tabular text-[11px] font-semibold">
            FAILED
          </span>
        );
    }
  }

  const visibleArchives =
    filterProgram === "ALL"
      ? archives
      : archives.filter((a) => a.programCode === filterProgram);

  return (
    <div className="space-y-6">
      {/* Stitch Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-[#DBE2EF]">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#112D4E] text-white text-[11px] font-semibold uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#71C9CE]" />
            FYP Coordinator Portal · Dept. of IT &amp; Computing
          </span>
          <h1 className="font-headline-md text-2xl sm:text-[28px] font-bold tracking-tight text-[#001833]">
            Past Project Archives &amp; Department Supervision Capacity
          </h1>
          <p className="text-sm text-on-surface-variant max-w-3xl">
            Manage historical FYP archives across BSIT, BSCS, BSSE, BSAI, BSCY, and BSDS cohorts
            for semantic duplicate verification.
          </p>
        </div>

        <div className="w-full sm:w-56 shrink-0">
          <Select
            aria-label="Filter Archive Program"
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
          >
            <option value="ALL">All IT &amp; Computing Programs</option>
            <option value="BSIT">BSIT Archives</option>
            <option value="BSCS">BSCS Archives</option>
            <option value="BSSE">BSSE Archives</option>
            <option value="BSAI">BSAI Archives</option>
            <option value="BSCY">BSCY Archives</option>
            <option value="BSDS">BSDS Archives</option>
          </Select>
        </div>
      </header>

      {/* Stitch 4-Card KPI Strip */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
            <span>Indexed Archives (READY)</span>
            <AppIcon name="database" className="text-[18px] text-[#2A609C]" />
          </div>
          <p className="font-mono-tabular text-2xl font-bold text-[#001833]">{readyCount}</p>
          <p className="text-[11px] text-on-surface-variant">HNSW cosine index active</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
            <span>Pending / Needs Abstract</span>
            <AppIcon name="warning" className="text-[18px] text-[#B45309]" />
          </div>
          <p className="font-mono-tabular text-2xl font-bold text-[#001833]">{attentionCount}</p>
          <p className="text-[11px] text-on-surface-variant">Async Inngest remediation queue</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
            <span>Department Slot Utilization</span>
            <AppIcon name="group" className="text-[18px] text-[#2A609C]" />
          </div>
          <p className="font-mono-tabular text-2xl font-bold text-[#001833]">
            {filledSupervisorSlots} / {totalSupervisorsSlots}
          </p>
          <p className="text-[11px] text-on-surface-variant">
            {Math.max(0, totalSupervisorsSlots - filledSupervisorSlots)} open slots across{" "}
            {supervisorCount} faculty
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
            <span>Anti-Duplicate Gate</span>
            <AppIcon name="verified" className="text-[18px] text-[#004F53]" />
          </div>
          <p className="font-mono-tabular text-2xl font-bold text-[#001833]">&gt;= 0.82</p>
          <p className="text-[11px] text-on-surface-variant">Forces mandatory differentiation</p>
        </div>
      </section>

      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-medium ${
            feedback.type === "success"
              ? "border-[#71C9CE]/60 bg-[#E3FDFD] text-[#004F53]"
              : "border-error/30 bg-error-container/60 text-on-error-container"
          }`}
        >
          <AppIcon name={feedback.type === "success" ? "check_circle" : "error"} className="text-[18px] shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {viewState === "LOADING" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-7">
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>
      )}

      {viewState === "ERROR" && (
        <div className="rounded-xl border border-error/30 bg-error-container/50 p-6 space-y-3">
          <h2 className="font-headline-sm text-lg font-bold text-on-error-container">
            Archive Ledger Load Error
          </h2>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry Archive Query
          </Button>
        </div>
      )}

      {viewState === "POPULATED" && (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left 5 Cols: Ingest Form */}
          <section className="lg:col-span-5 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-[#DBE2EF]/70">
              <div className="flex items-center gap-2">
                <AppIcon name="cloud_upload" className="text-[#2A609C] text-[20px]" />
                <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
                  Ingest Past FYP Abstract
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                Triggers <code className="font-mono-tabular">archive/record.created</code> to
                index 1536-dim embeddings asynchronously.
              </p>
            </div>

            <form onSubmit={handleCreateArchive} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#112D4E]">Project Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Automated Kubernetes Pod Right-Sizing Controller"
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#112D4E]">
                    Batch / Academic Year
                  </label>
                  <Input
                    type="number"
                    min={2010}
                    max={2035}
                    value={academicYear}
                    onChange={(e) => setAcademicYear(Number(e.target.value) || getPakistanYear())}
                    className="font-mono-tabular"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#112D4E]">Degree Program</label>
                  <Select
                    aria-label="Degree Program"
                    value={programCode}
                    onChange={(e) =>
                      setProgramCode(
                        e.target.value as
                          | "BSIT"
                          | "BSCS"
                          | "BSSE"
                          | "BSAI"
                          | "BSCY"
                          | "BSDS"
                      )
                    }
                  >
                    <option value="BSIT">BSIT</option>
                    <option value="BSCS">BSCS</option>
                    <option value="BSSE">BSSE</option>
                    <option value="BSAI">BSAI</option>
                    <option value="BSCY">BSCY</option>
                    <option value="BSDS">BSDS</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#112D4E]">
                  Primary Technical Domain
                </label>
                <Select
                  aria-label="Primary Technical Domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                >
                  <option value="DevTools">DevTools</option>
                  <option value="Cybersecurity">Cybersecurity</option>
                  <option value="Applied AI">Applied AI</option>
                  <option value="EdTech">EdTech</option>
                  <option value="HealthTech">HealthTech</option>
                  <option value="FinTech">FinTech</option>
                  <option value="Cloud & Distributed Systems">
                    Cloud &amp; Distributed Systems
                  </option>
                  <option value="Data Engineering">Data Engineering</option>
                  <option value="IoT & Embedded">IoT &amp; Embedded</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#112D4E]">
                  Tech Stack (Comma-Separated)
                </label>
                <Input
                  value={techStackText}
                  onChange={(e) => setTechStackText(e.target.value)}
                  placeholder="Next.js, TypeScript, PostgreSQL, pgvector"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#112D4E]">
                  Project Abstract (&gt;= 100 chars for READY embedding)
                </label>
                <Textarea
                  rows={4}
                  value={abstractText}
                  onChange={(e) => setAbstractText(e.target.value)}
                  placeholder="Paste the 150-word project abstract describing problem statement, architecture, and evaluation dataset..."
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-lg bg-[#112D4E] hover:bg-[#001833] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <AppIcon name="inventory_2" className="text-[18px]" />
                <span>Ingest &amp; Generate pgvector Embedding</span>
              </button>
            </form>
          </section>

          {/* Right 7 Cols: Archive Ingestion Ledger */}
          <section className="lg:col-span-7 rounded-xl bg-surface-container-lowest border border-[#DBE2EF] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-[#DBE2EF]/70">
              <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
                Department Archive Ingestion Ledger
              </h2>
              <p className="text-xs text-on-surface-variant">
                All 5 <code className="font-mono-tabular">ArchiveIngestStatus</code> states
                monitored with one-click manual abstract remediation.
              </p>
            </div>

            {visibleArchives.length === 0 ? (
              <div className="p-8 rounded-lg bg-[#F9F7F7] border border-dashed border-[#DBE2EF] text-center text-xs text-on-surface-variant">
                No historical archives found for this filter.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleArchives.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#DBE2EF] bg-[#F9F7F7]/70 p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono-tabular text-xs font-bold text-[#112D4E]">
                            {item.programCode} · {item.academicYear}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#DBE2EF]/70 text-[#112D4E] text-[11px] font-semibold">
                            {item.domain}
                          </span>
                          {renderStatusBadge(item.ingestStatus)}
                        </div>
                        <h3 className="mt-1.5 text-sm font-bold text-[#112D4E]">{item.title}</h3>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.ingestStatus !== "READY" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingArchiveId(item.id);
                              setManualAbstractPatch(item.abstract);
                            }}
                          >
                            Fix &amp; Retry
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          aria-label={`Delete ${item.title}`}
                          className="p-1.5 rounded text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
                        >
                          <AppIcon name="delete" className="text-[18px]" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {item.abstract}
                    </p>

                    {item.ingestError && (
                      <div className="flex items-center gap-2 rounded-lg border border-[#B45309]/30 bg-[#FEF3C7] px-3 py-2 text-xs text-[#92400E]">
                        <AppIcon name="warning" className="text-[16px] shrink-0" />
                        <span>{item.ingestError}</span>
                      </div>
                    )}

                    {editingArchiveId === item.id && (
                      <div className="space-y-2 rounded-lg border border-[#DBE2EF] bg-white p-3">
                        <label className="text-xs font-semibold text-[#112D4E]">
                          Paste Complete Abstract (&gt;= 100 chars):
                        </label>
                        <Textarea
                          value={manualAbstractPatch}
                          onChange={(e) => setManualAbstractPatch(e.target.value)}
                          placeholder="Enter complete technical abstract so Inngest can generate a 1536-dim embedding..."
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingArchiveId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRetryOrPatch(item.id)}
                            disabled={manualAbstractPatch.trim().length < 100}
                          >
                            Save &amp; Re-Run Embedding
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="rounded bg-white border border-[#DBE2EF] px-2 py-0.5 font-mono-tabular text-[11px] text-[#112D4E]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

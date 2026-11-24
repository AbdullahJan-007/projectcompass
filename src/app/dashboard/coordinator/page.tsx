"use client";

import { useState } from "react";
import {
  Archive,
  UploadCloud,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  Users,
  Database,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_PROJECT_ARCHIVES, DEMO_SUPERVISORS } from "@/lib/recommendation/seed-data";
import {
  createArchiveRecord,
  retryArchiveEmbedding,
  deleteArchiveRecord,
} from "@/actions/archive.actions";

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
  domain: string;
  techStack: string[];
  ingestStatus: IngestStatus;
  ingestError?: string;
}

export default function CoordinatorDashboardPage() {
  const [archives, setArchives] = useState<ArchiveRow[]>(() => [
    ...DEMO_PROJECT_ARCHIVES.map((a) => ({
      ...a,
      ingestStatus: "READY" as IngestStatus,
    })),
    {
      id: "cm0arch11scannedpdf000011",
      title: "Legacy Scanned Thesis: Campus Wi-Fi Rogue AP Monitor",
      abstract: "Scanned PDF upload without OCR text layer.",
      academicYear: 2022,
      domain: "Cybersecurity",
      techStack: ["Python", "Wireshark", "Linux"],
      ingestStatus: "NEEDS_MANUAL_ABSTRACT",
      ingestError:
        "Extracted abstract has fewer than 100 characters (scanned image-only PDF). Paste abstract manually to embed.",
    },
  ]);

  const [title, setTitle] = useState("");
  const [abstractText, setAbstractText] = useState("");
  const [academicYear, setAcademicYear] = useState(2025);
  const [domain, setDomain] = useState("DevTools");
  const [techStackText, setTechStackText] = useState("Next.js, TypeScript, PostgreSQL, pgvector");
  const [editingArchiveId, setEditingArchiveId] = useState<string | null>(null);
  const [manualAbstractPatch, setManualAbstractPatch] = useState("");
  const [viewState, setViewState] = useState<"POPULATED" | "LOADING" | "EMPTY" | "ERROR">(
    "POPULATED"
  );
  void Select;
  const [feedback, setFeedback] = useState<string | null>(null);

  const totalSupervisorsSlots = DEMO_SUPERVISORS.reduce((acc, s) => acc + s.maxSlots, 0);
  const filledSupervisorSlots = DEMO_SUPERVISORS.reduce((acc, s) => acc + s.activeSlots, 0);
  const readyCount = archives.filter((a) => a.ingestStatus === "READY").length;
  const attentionCount = archives.filter((a) => a.ingestStatus !== "READY").length;

  async function handleCreateArchive(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !abstractText.trim()) return;

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
      domain,
      techStack: stack.length > 0 ? stack : ["TypeScript"],
    });

    if (!res.ok) {
      setFeedback(res.error.message);
      return;
    }

    const createdId = res.data.archiveId;
    setArchives((prev) => [
      {
        id: createdId,
        title: title.trim(),
        abstract: abstractText.trim(),
        academicYear,
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
    setFeedback(
      isShortAbstract
        ? "Record saved in NEEDS_MANUAL_ABSTRACT state (under 100 chars)."
        : "Archive ingested and 1536-dim pgvector embedding indexed."
    );
  }

  async function handleRetryOrPatch(archiveId: string) {
    const res = await retryArchiveEmbedding({
      archiveId,
      updatedAbstract: manualAbstractPatch.length >= 100 ? manualAbstractPatch : undefined,
    });

    if (!res.ok) {
      setFeedback(res.error.message);
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
    setFeedback(`Archive ${archiveId} re-embedded and transitioned to READY.`);
  }

  async function handleDelete(archiveId: string) {
    const res = await deleteArchiveRecord({ archiveId });
    if (!res.ok) {
      setFeedback(res.error.message);
      return;
    }
    setArchives((prev) => prev.filter((a) => a.id !== archiveId));
    setFeedback(`Archive record ${archiveId} removed and logged to AuditLog.`);
  }

  function renderStatusBadge(status: IngestStatus) {
    switch (status) {
      case "READY":
        return <Badge variant="success">READY (pgvector Indexed)</Badge>;
      case "PENDING_EMBEDDING":
        return <Badge variant="info">PENDING_EMBEDDING</Badge>;
      case "PROCESSING":
        return <Badge variant="info">PROCESSING</Badge>;
      case "NEEDS_MANUAL_ABSTRACT":
        return <Badge variant="warning">NEEDS_MANUAL_ABSTRACT</Badge>;
      case "FAILED":
        return <Badge variant="error">FAILED</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <Badge variant="default">FYP Coordinator Portal · BSCS</Badge>
          <h1 className="mt-2 text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-primary">
            Past Project Archives &amp; Department Supervision Capacity
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Maintain archived department final-year project abstracts for duplicate similarity
            checks and monitor faculty supervision quotas.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">
                Indexed Archives (READY)
              </span>
              <Database className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
            </div>
            <p className="mt-2 font-mono-tabular text-2xl font-semibold text-text-primary">
              {readyCount}
            </p>
            <p className="mt-1 text-[11px] text-text-muted">HNSW cosine index active</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">
                Pending / Needs Abstract
              </span>
              <FileWarning className="h-4 w-4 text-status-warning" strokeWidth={1.75} />
            </div>
            <p className="mt-2 font-mono-tabular text-2xl font-semibold text-text-primary">
              {attentionCount}
            </p>
            <p className="mt-1 text-[11px] text-text-muted">Async Inngest queue</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">
                Department Slot Utilization
              </span>
              <Users className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
            </div>
            <p className="mt-2 font-mono-tabular text-2xl font-semibold text-text-primary">
              {filledSupervisorSlots} / {totalSupervisorsSlots}
            </p>
            <p className="mt-1 text-[11px] text-text-muted">
              {totalSupervisorsSlots - filledSupervisorSlots} open slots across 5 faculty
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">
                Anti-Duplicate Threshold
              </span>
              <CheckCircle2 className="h-4 w-4 text-status-success" strokeWidth={1.75} />
            </div>
            <p className="mt-2 font-mono-tabular text-2xl font-semibold text-text-primary">
              &gt;= 0.82
            </p>
            <p className="mt-1 text-[11px] text-text-muted">Forces mandatory differentiation</p>
          </CardContent>
        </Card>
      </div>

      {feedback && (
        <div className="rounded-[6px] border border-brand-primary/30 bg-brand-tint/40 px-4 py-2.5 text-xs font-medium text-brand-primary-hover">
          {feedback}
        </div>
      )}

      {viewState === "LOADING" && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {viewState === "ERROR" && (
        <Card className="border-status-error/30 bg-status-error-tint/30">
          <CardHeader>
            <CardTitle className="text-status-error-text">
              Inngest Embedding Worker Unreachable
            </CardTitle>
            <CardDescription className="text-status-error-text">
              Batch archive embedding encountered a transient HTTP 503 from the embedding provider.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setViewState("POPULATED")}>
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
              Resume Queue Inspection
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "EMPTY" && (
        <Card className="bg-grad-ambient">
          <CardHeader>
            <CardTitle>Department Archive Empty — Cold-Start Seed Catalog Active</CardTitle>
            <CardDescription>
              No historical FYPs have been uploaded for this department yet. Student duplicate checks
              currently run against the 42 curated CS archetypes. Follow the 3-step import below to
              enable institutional memory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setViewState("POPULATED")}>
              Upload First Historical Cohort
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "POPULATED" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-brand-primary" strokeWidth={1.75} />
                  <CardTitle>Ingest Past FYP Abstract or PDF/CSV</CardTitle>
                </div>
                <CardDescription>
                  Uploads trigger <code className="font-mono-tabular">archive/record.created</code>{" "}
                  to extract text and index 1536-dim embeddings asynchronously.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateArchive} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Project Title
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Automated Kubernetes Pod Right-Sizing Controller"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Academic Year
                      </label>
                      <Input
                        type="number"
                        min={2015}
                        max={2030}
                        value={academicYear}
                        onChange={(e) => setAcademicYear(Number(e.target.value) || 2025)}
                        className="font-mono-tabular"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Primary Domain
                      </label>
                      <Select value={domain} onChange={(e) => setDomain(e.target.value)}>
                        <option value="DevTools">DevTools</option>
                        <option value="Cybersecurity">Cybersecurity</option>
                        <option value="Applied AI">Applied AI</option>
                        <option value="EdTech">EdTech</option>
                        <option value="HealthTech">HealthTech</option>
                        <option value="FinTech">FinTech</option>
                        <option value="Cloud & Distributed Systems">
                          Cloud &amp; Distributed Systems
                        </option>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Tech Stack (Comma-Separated)
                    </label>
                    <Input
                      value={techStackText}
                      onChange={(e) => setTechStackText(e.target.value)}
                      placeholder="Next.js, TypeScript, PostgreSQL, pgvector"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Project Abstract (&gt;= 100 chars for READY embedding)
                    </label>
                    <Textarea
                      value={abstractText}
                      onChange={(e) => setAbstractText(e.target.value)}
                      placeholder="Paste the 150-word project abstract describing problem statement, architecture, and evaluation dataset..."
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    <Archive className="h-4 w-4" strokeWidth={1.75} />
                    Ingest &amp; Generate pgvector Embedding
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-7">
            <Card>
              <CardHeader>
                <CardTitle>Department Archive Ingestion Ledger</CardTitle>
                <CardDescription>
                  All 5 <code className="font-mono-tabular">ArchiveIngestStatus</code> states are
                  monitored with one-click manual abstract remediation and retry.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {archives.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[8px] border border-border-default bg-bg-surface p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular text-xs font-semibold text-brand-primary">
                            {item.academicYear}
                          </span>
                          <Badge variant="neutral">{item.domain}</Badge>
                          {renderStatusBadge(item.ingestStatus)}
                        </div>
                        <h4 className="mt-1.5 text-sm font-semibold text-text-primary">
                          {item.title}
                        </h4>
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
                            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Fix &amp; Retry
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(item.id)}
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 className="h-4 w-4 text-status-error" strokeWidth={1.75} />
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed">{item.abstract}</p>

                    {item.ingestError && (
                      <div className="flex items-center gap-2 rounded-[6px] border border-status-warning/30 bg-status-warning-tint px-3 py-2 text-xs text-status-warning-text">
                        <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                        <span>{item.ingestError}</span>
                      </div>
                    )}

                    {editingArchiveId === item.id && (
                      <div className="space-y-2 rounded-[6px] border border-border-strong bg-bg-subtle p-3">
                        <label className="text-xs font-semibold text-text-primary">
                          Paste Complete 150-Word Abstract (&gt;= 100 chars):
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
                          className="rounded-[4px] bg-bg-subtle px-2 py-0.5 font-mono-tabular text-[11px] text-text-muted"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

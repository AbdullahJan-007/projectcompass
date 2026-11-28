import {
  formatPakistanDateTime,
  formatPakistanRoadmapPhaseDates,
  getPakistanAcademicCycle,
} from "@/lib/time/pakistan-time";
import type { AdminProjectRow, AdminStudentRow } from "@/actions/workspace.actions";
import type { GeneratedIdeaRecord } from "@/lib/recommendation/engine";
import type { PlannedMilestoneItem } from "@/lib/recommendation/roadmap-planner";

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates an Excel-compatible UTF-8 BOM CSV of Department FYP Allocations.
 */
export function buildAdminAllocationsCsv(projects: AdminProjectRow[]): string {
  const headers = [
    "Project ID",
    "Project Title",
    "Student Name",
    "Registration No",
    "Program",
    "Track",
    "Feasibility Score",
    "Status",
    "Assigned Supervisor",
    "Created Date (PKT)",
  ];
  const rows = projects.map((p) =>
    [
      p.id,
      p.title,
      p.studentName,
      p.studentRegNo,
      p.departmentCode,
      p.track,
      `${p.feasibilityScore}/100`,
      p.status,
      p.supervisorName ?? "Unassigned",
      p.createdAt,
    ]
      .map(escapeCsvCell)
      .join(",")
  );
  return `\uFEFF${[headers.map(escapeCsvCell).join(","), ...rows].join("\r\n")}`;
}

/**
 * Generates an Excel-compatible UTF-8 BOM CSV of Enrolled Students.
 */
export function buildAdminStudentsCsv(students: AdminStudentRow[]): string {
  const headers = [
    "Student Name",
    "Registration No",
    "Email",
    "Program",
    "Intake Batch",
    "Profile Status",
    "Verified Skills",
    "Proposals Generated",
    "Career Goal",
    "Account Status",
  ];
  const rows = students.map((s) =>
    [
      s.fullName,
      s.registrationNo,
      s.email,
      s.departmentCode,
      s.batchLabel,
      s.profileStatus,
      s.skillsCount,
      s.ideasCount,
      s.careerGoal,
      s.isActive ? "ACTIVE" : "DISABLED",
    ]
      .map(escapeCsvCell)
      .join(",")
  );
  return `\uFEFF${[headers.map(escapeCsvCell).join(","), ...rows].join("\r\n")}`;
}

/**
 * Sample CSV template for Bulk Past-FYP Archive Import.
 */
export function buildSampleArchivesCsv(): string {
  const headers = ["title", "academicYear", "programCode", "domain", "techStack", "abstract"];
  const sampleRows = [
    [
      "Autonomous Campus Energy Anomaly Detector Using Edge Telemetry",
      "2025",
      "BSIT",
      "IoT & Embedded",
      "Python;PostgreSQL;Next.js;MQTT",
      "Designed a low-latency telemetry ingestion pipeline and anomaly scoring engine for smart campus power distribution boards with automated fault alerts and 14-day forecasting dashboards.",
    ],
    [
      "Zero-Trust Microservice API Gateway with Live Policy Verification",
      "2024",
      "BSCY",
      "Cybersecurity",
      "TypeScript;Node.js;PostgreSQL;Docker",
      "Engineered a mutual-TLS microservice proxy that enforces least-privilege JWT claims, tracks lateral movement anomalies, and exports real-time audit logs for university enterprise systems.",
    ],
  ];
  return `\uFEFF${[
    headers.join(","),
    ...sampleRows.map((r) => r.map(escapeCsvCell).join(",")),
  ].join("\r\n")}`;
}

export interface ParsedArchiveCsvRow {
  title: string;
  academicYear: number;
  programCode: "BSIT" | "BSCS" | "BSSE" | "BSAI" | "BSCY" | "BSDS";
  domain: string;
  techStack: string[];
  abstract: string;
}

const VALID_PROGRAMS = new Set(["BSIT", "BSCS", "BSSE", "BSAI", "BSCY", "BSDS"]);

/**
 * RFC-4180 quote-aware CSV parser for bulk archive import.
 */
export function parseArchivesCsv(rawText: string, defaultYear: number): ParsedArchiveCsvRow[] {
  const cleaned = rawText.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return [];

  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\r" && next === "\n") {
      row.push(cell.trim());
      if (row.some((c) => c.length > 0)) records.push(row);
      row = [];
      cell = "";
      i++;
    } else if (ch === "\n") {
      row.push(cell.trim());
      if (row.some((c) => c.length > 0)) records.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((c) => c.length > 0)) records.push(row);

  if (records.length < 2) return [];

  const headerRow = records[0]!.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const idx = (candidates: string[]) =>
    headerRow.findIndex((h) => candidates.includes(h));

  const titleIdx = idx(["title", "projecttitle", "name"]);
  const yearIdx = idx(["academicyear", "year", "batchyear"]);
  const progIdx = idx(["programcode", "program", "department", "dept"]);
  const domainIdx = idx(["domain", "area", "category"]);
  const stackIdx = idx(["techstack", "stack", "technologies", "skills"]);
  const absIdx = idx(["abstract", "summary", "description"]);

  const parsed: ParsedArchiveCsvRow[] = [];
  for (let r = 1; r < records.length; r++) {
    const cols = records[r]!;
    const title = (titleIdx >= 0 ? cols[titleIdx] : cols[0])?.trim() ?? "";
    const abstract = (absIdx >= 0 ? cols[absIdx] : cols[5])?.trim() ?? "";
    if (title.length < 8 || abstract.length < 10) continue;

    const rawYear = Number.parseInt((yearIdx >= 0 ? cols[yearIdx] : cols[1]) ?? "", 10);
    const academicYear =
      Number.isFinite(rawYear) && rawYear >= 2010 && rawYear <= 2035 ? rawYear : defaultYear;

    const rawProg = ((progIdx >= 0 ? cols[progIdx] : cols[2]) ?? "BSIT").toUpperCase();
    const programCode = (
      VALID_PROGRAMS.has(rawProg) ? rawProg : "BSIT"
    ) as ParsedArchiveCsvRow["programCode"];

    const domain = ((domainIdx >= 0 ? cols[domainIdx] : cols[3]) ?? "Software Engineering").trim();
    const rawStack = (stackIdx >= 0 ? cols[stackIdx] : cols[4]) ?? "TypeScript";
    const techStack = rawStack
      .split(/[;|]/)
      .map((s) => s.trim())
      .filter(Boolean);

    parsed.push({
      title: title.slice(0, 160),
      academicYear,
      programCode,
      domain: domain.slice(0, 60) || "Software Engineering",
      techStack: techStack.length > 0 ? techStack.slice(0, 15) : ["TypeScript"],
      abstract: abstract.slice(0, 3000),
    });
  }

  return parsed;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Opens a clean, print-ready Formal FYP Proposal Dossier window (`window.print()` -> Save as PDF).
 */
export function openFormalProposalPrintWindow(params: {
  studentName: string;
  identifier: string;
  batchLabel: string;
  idea: Pick<
    GeneratedIdeaRecord,
    | "title"
    | "domain"
    | "track"
    | "problemStatement"
    | "proposedSolution"
    | "differentiationAngle"
    | "feasibilityScore"
    | "skillOverlapScore"
    | "timeFitScore"
    | "resourceReadinessScore"
    | "supervisorFitScore"
    | "feasibilityExplanation"
    | "duplicateRisk"
    | "highestArchiveSimilarity"
    | "recommendedStack"
  >;
  milestones?: PlannedMilestoneItem[];
  durationWeeks?: number;
  weeklyHours?: number;
}) {
  const win = window.open("", "_blank", "noopener,noreferrer,width=960,height=780");
  if (!win) return false;

  const { idea, milestones = [], durationWeeks = 24, weeklyHours = 15 } = params;
  const generatedAt = formatPakistanDateTime(new Date());
  const cycle = getPakistanAcademicCycle();

  const stackRows = idea.recommendedStack
    .map(
      (s) =>
        `<tr><td><strong>${escapeHtml(s.layer)}</strong></td><td>${escapeHtml(s.tech)}</td><td>${escapeHtml(s.rationale)}</td></tr>`
    )
    .join("");

  const milestoneRows = milestones
    .map(
      (m) => `
      <tr>
        <td><strong>Phase ${m.phaseNumber}</strong><br/><span class="muted">W${String(m.weekStart).padStart(2, "0")}–W${String(m.weekEnd).padStart(2, "0")} (${m.weeksAllocated} wks)</span></td>
        <td><strong>${escapeHtml(m.phaseTitle)}</strong><br/><span class="muted">${escapeHtml(formatPakistanRoadmapPhaseDates(m.weekStart, m.weekEnd))} (PKT)</span></td>
        <td>${m.deliverables.map((d) => `• ${escapeHtml(d)}`).join("<br/>")}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>FYP Proposal Dossier — ${escapeHtml(idea.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Inter", "Segoe UI", Arial, sans-serif; color: #1b1c1c; margin: 0; padding: 32px; background: #fff; line-height: 1.5; }
    .header { border-bottom: 3px solid #112d4e; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
    .brand { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #3f72af; font-weight: 700; }
    h1 { font-size: 22px; color: #001833; margin: 6px 0 4px; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #112d4e; border-bottom: 1px solid #dbe2ef; padding-bottom: 6px; margin: 22px 0 10px; }
    .meta { font-size: 12px; color: #43474e; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0 18px; }
    .kpi { border: 1px solid #dbe2ef; border-radius: 8px; padding: 10px 12px; background: #f9f7f7; }
    .kpi-label { font-size: 10px; text-transform: uppercase; color: #3f72af; font-weight: 700; }
    .kpi-val { font-size: 18px; font-weight: 700; color: #112d4e; margin-top: 2px; }
    .box { border: 1px solid #dbe2ef; border-radius: 8px; padding: 12px 14px; background: #fbf9f9; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    th, td { border: 1px solid #dbe2ef; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #112d4e; color: #fff; font-weight: 600; }
    .muted { color: #5a6270; font-size: 11px; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #dbe2ef; font-size: 11px; color: #5a6270; display: flex; justify-content: space-between; }
    @media print { body { padding: 14px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">ProjectCompass · Department of IT &amp; Computing · ${escapeHtml(cycle)}</div>
      <h1>${escapeHtml(idea.title)}</h1>
      <div class="meta">
        <strong>Student:</strong> ${escapeHtml(params.studentName)} (${escapeHtml(params.identifier)}) · ${escapeHtml(params.batchLabel)}
      </div>
    </div>
    <div style="text-align:right">
      <div class="meta"><strong>Domain:</strong> ${escapeHtml(idea.domain)}</div>
      <div class="meta"><strong>Generated:</strong> ${escapeHtml(generatedAt)}</div>
    </div>
  </div>

  <div class="grid">
    <div class="kpi"><div class="kpi-label">Feasibility Index</div><div class="kpi-val">${idea.feasibilityScore} / 100</div></div>
    <div class="kpi"><div class="kpi-label">Skill / Time Fit</div><div class="kpi-val">${idea.skillOverlapScore}/40 · ${idea.timeFitScore}/30</div></div>
    <div class="kpi"><div class="kpi-label">Archive Similarity</div><div class="kpi-val">${Math.round(idea.highestArchiveSimilarity * 100)}% (${escapeHtml(idea.duplicateRisk)})</div></div>
    <div class="kpi"><div class="kpi-label">Execution Scope</div><div class="kpi-val">${durationWeeks} Wks · ${weeklyHours}h/wk</div></div>
  </div>

  <h2>1. Problem Statement &amp; Proposed Architecture</h2>
  <div class="box">
    <p style="margin:0 0 8px"><strong>Problem Statement:</strong> ${escapeHtml(idea.problemStatement)}</p>
    <p style="margin:0 0 8px"><strong>Proposed Solution:</strong> ${escapeHtml(idea.proposedSolution)}</p>
    ${
      idea.differentiationAngle
        ? `<p style="margin:0"><strong>Originality &amp; Differentiation Proof:</strong> ${escapeHtml(idea.differentiationAngle)}</p>`
        : ""
    }
  </div>

  <h2>2. Feasibility Justification</h2>
  <div class="box">${escapeHtml(idea.feasibilityExplanation)}</div>

  <h2>3. Recommended Technology Stack</h2>
  <table>
    <thead><tr><th>Layer</th><th>Technology</th><th>Engineering Rationale</th></tr></thead>
    <tbody>${stackRows}</tbody>
  </table>

  ${
    milestoneRows
      ? `<h2>4. Calibrated Execution Roadmap (${durationWeeks} Weeks · Islamabad PKT Calendar)</h2>
         <table>
           <thead><tr><th>Phase &amp; Weeks</th><th>Milestone &amp; PKT Schedule</th><th>Key Deliverables</th></tr></thead>
           <tbody>${milestoneRows}</tbody>
         </table>`
      : ""
  }

  <div class="footer">
    <span>ProjectCompass HEC-NCEAC Verified FYP Proposal Dossier</span>
    <span>Prepared in Pakistan Standard Time (${escapeHtml(generatedAt)})</span>
  </div>
  <script>window.onload = function() { window.focus(); window.print(); };</script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

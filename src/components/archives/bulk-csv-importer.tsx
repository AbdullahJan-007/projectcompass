"use client";

import { useState } from "react";
import { Upload, Download } from "lucide-react";
import { bulkImportArchives } from "@/actions/archive.actions";
import {
  buildSampleArchivesCsv,
  downloadTextFile,
  parseArchivesCsv,
  type ParsedArchiveCsvRow,
} from "@/lib/export/csv-and-proposal";
import { getPakistanYear } from "@/lib/time/pakistan-time";

export interface BulkCsvImporterProps {
  onImported: () => void;
}

export function BulkCsvImporter({ onImported }: BulkCsvImporterProps) {
  const [parsedRows, setParsedRows] = useState<ParsedArchiveCsvRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const rows = parseArchivesCsv(text, getPakistanYear());
    if (rows.length === 0) {
      setParsedRows([]);
      setStatus({
        type: "error",
        text: "No valid rows found. Download the CSV template to match required columns.",
      });
      return;
    }
    setParsedRows(rows.slice(0, 100));
  }

  async function handleImport() {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setStatus(null);
    const res = await bulkImportArchives({ rows: parsedRows });
    setImporting(false);
    if (!res.ok) {
      setStatus({ type: "error", text: res.error.message });
      return;
    }
    setParsedRows([]);
    setFileName("");
    setStatus({
      type: "success",
      text: `Imported ${res.data.importedCount} archives (${res.data.readyCount} indexed in pgvector, ${res.data.needsManualCount} pending manual abstract).`,
    });
    onImported();
  }

  return (
    <div className="rounded-xl border border-dashed border-[#3F72AF]/50 bg-[#F9F7F7] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-[#112D4E]">
            Bulk CSV Past-FYP Importer (Up to 100 Rows)
          </h3>
          <p className="text-[11px] text-on-surface-variant">
            Import historical department projects in one batch for pgvector originality checks.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            downloadTextFile(
              "projectcompass-archives-template.csv",
              buildSampleArchivesCsv(),
              "text/csv;charset=utf-8"
            )
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#DBE2EF] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#112D4E] hover:bg-[#DBE2EF]/50 transition-colors"
        >
          <Download aria-hidden="true" className="h-3.5 w-3.5 text-[#3F72AF]" />
          <span>CSV Template</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#DBE2EF] bg-white px-3 py-1.5 text-xs font-semibold text-[#112D4E] hover:border-[#3F72AF] transition-colors">
          <Upload aria-hidden="true" className="h-3.5 w-3.5 text-[#3F72AF]" />
          <span>{fileName ? fileName : "Choose CSV File"}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        {parsedRows.length > 0 && (
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#112D4E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#001833] disabled:opacity-50"
          >
            {importing
              ? `Indexing ${parsedRows.length} rows...`
              : `Import ${parsedRows.length} Archive${parsedRows.length > 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {status && (
        <p
          className={`text-xs font-medium ${
            status.type === "success" ? "text-[#004F53]" : "text-on-error-container"
          }`}
        >
          {status.text}
        </p>
      )}
    </div>
  );
}

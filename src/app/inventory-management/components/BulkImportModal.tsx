'use client';

import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import Modal from '@/components/ui/Modal';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, SkipForward, Download, Loader2 } from 'lucide-react';

/**
 * Bulk CSV import for assets.
 *
 * Flow:
 *   1. User picks a CSV file (can be exported from Google Sheets → File → Download → CSV).
 *   2. Client parses with Papa Parse, shows a preview with row count + any parse errors.
 *   3. User clicks Import — client POSTs parsed rows to `/api/assets/bulk`.
 *   4. Server re-validates each row, skips duplicates (existing tags + within-sheet dupes),
 *      inserts the survivors in a single batch, returns per-row outcomes.
 *   5. We render the summary table so the user can see exactly what happened.
 */

interface BulkImportModalProps {
  open:     boolean;
  onClose:  () => void;
  onImported: () => void;           // Parent calls refetch() after successful import
}

// Columns the CSV is allowed to carry — mirrors the server's validateAssetCreate.
// Order here controls what we show in the preview header.
const COLUMNS = [
  'assetTag', 'name', 'category', 'serialNumber', 'purchaseDate',
  'status', 'location', 'school', 'notes', 'supplier', 'purchaseCost',
] as const;

const REQUIRED = new Set(['assetTag', 'name', 'category', 'serialNumber', 'purchaseDate', 'location']);

type ParsedRow = Record<string, string>;

type RowOutcome =
  | { row: number; status: 'inserted'; assetTag: string }
  | { row: number; status: 'skipped';  assetTag: string; reason: string }
  | { row: number; status: 'error';    assetTag: string | null; error: string };

interface ImportResponse {
  summary: { total: number; inserted: number; skipped: number; errored: number };
  results: RowOutcome[];
}

export default function BulkImportModal({ open, onClose, onImported }: BulkImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName,    setFileName]    = useState<string | null>(null);
  const [parsedRows,  setParsedRows]  = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing,   setImporting]   = useState(false);
  const [result,      setResult]      = useState<ImportResponse | null>(null);

  function reset() {
    setFileName(null);
    setParsedRows([]);
    setParseErrors([]);
    setImporting(false);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);
    setParseErrors([]);

    Papa.parse<ParsedRow>(file, {
      header:           true,
      skipEmptyLines:   true,
      transformHeader:  (h) => h.trim(),
      complete: (res) => {
        // Collect warnings — missing required columns, stray columns, parse issues.
        const warnings: string[] = [];
        const headers = res.meta.fields ?? [];
        const missingRequired = [...REQUIRED].filter((c) => !headers.includes(c));
        if (missingRequired.length > 0) {
          warnings.push(`Missing required columns: ${missingRequired.join(', ')}`);
        }
        const unknown = headers.filter((h) => !(COLUMNS as readonly string[]).includes(h));
        if (unknown.length > 0) {
          warnings.push(`Unknown columns will be ignored: ${unknown.join(', ')}`);
        }
        if (res.errors.length > 0) {
          warnings.push(`${res.errors.length} parse warning(s) — check row alignment and quoting.`);
        }

        setParseErrors(warnings);
        setParsedRows(res.data);
      },
      error: (err) => {
        setParseErrors([`Parse error: ${err.message}`]);
        setParsedRows([]);
      },
    });
  }

  async function handleImport() {
    if (parsedRows.length === 0) return;
    setImporting(true);

    // Normalize: trim whitespace, coerce blank strings to undefined so the
    // server's validator sees them as optional instead of empty-string.
    const rows = parsedRows.map((row) => {
      const out: Record<string, string | undefined> = {};
      for (const key of COLUMNS) {
        const v = (row[key] ?? '').trim();
        out[key] = v === '' ? undefined : v;
      }
      return out;
    });

    try {
      const res  = await fetch('/api/assets/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rows }),
      });
      const body = await res.json();

      if (!res.ok) {
        setParseErrors([body?.error ?? `Import failed (HTTP ${res.status})`]);
        setImporting(false);
        return;
      }

      setResult(body as ImportResponse);
      onImported();
    } catch (err) {
      setParseErrors([(err as Error).message ?? 'Import failed']);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bulk Import Assets"
      subtitle="Upload a CSV exported from Google Sheets or Excel. Duplicate tags and invalid rows are skipped."
      size="lg"
    >
      <div className="px-6 py-5 space-y-5">

        {/* Step 1: Pick a file — or show filename after pick */}
        {!result && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                CSV File
              </h3>
              <a
                href="/asset-import-template.csv"
                download
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Download size={12} />
                Download template
              </a>
            </div>

            <label
              className={`block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                fileName ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="hidden"
              />
              {fileName ? (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet size={22} className="text-emerald-600" />
                  <p className="text-sm font-medium text-slate-800">{fileName}</p>
                  <p className="text-xs text-slate-500">
                    {parsedRows.length} row{parsedRows.length !== 1 ? 's' : ''} parsed — click to choose a different file
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud size={22} className="text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">Click to upload CSV</p>
                  <p className="text-xs text-slate-500">
                    Tip: in Google Sheets, use File → Download → Comma-separated values (.csv)
                  </p>
                </div>
              )}
            </label>
          </section>
        )}

        {/* Warnings from parse phase */}
        {!result && parseErrors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800 mb-1">Heads up:</p>
            <ul className="text-xs text-amber-800 space-y-0.5">
              {parseErrors.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Step 2: Preview of parsed rows (pre-import) */}
        {!result && parsedRows.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Preview ({parsedRows.length} row{parsedRows.length !== 1 ? 's' : ''})
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-500 w-10">#</th>
                      {COLUMNS.map((c) => (
                        <th key={c} className="px-2 py-1.5 text-left font-semibold text-slate-500 whitespace-nowrap">
                          {c}
                          {REQUIRED.has(c) && <span className="text-red-400 ml-0.5">*</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-2 py-1.5 text-slate-400 tabular-nums">{i + 2}</td>
                        {COLUMNS.map((c) => (
                          <td key={c} className="px-2 py-1.5 text-slate-700 truncate max-w-[140px]">
                            {row[c] ?? <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 && (
                <div className="px-3 py-1.5 text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
                  Showing first 50 of {parsedRows.length} rows. All rows will be submitted on import.
                </div>
              )}
            </div>
          </section>
        )}

        {/* Step 3: Post-import result */}
        {result && (
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Import Results
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <StatCard label="Total"    value={result.summary.total}    tint="slate"   />
              <StatCard label="Inserted" value={result.summary.inserted} tint="emerald" icon={<CheckCircle2 size={12} />} />
              <StatCard label="Skipped"  value={result.summary.skipped}  tint="amber"   icon={<SkipForward size={12} />} />
              <StatCard label="Errors"   value={result.summary.errored}  tint="red"     icon={<AlertCircle size={12} />} />
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-500 w-12">Row</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-500 w-24">Status</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-500">Asset Tag</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-500">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.results.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-2 py-1.5 text-slate-400 tabular-nums">{r.row}</td>
                        <td className="px-2 py-1.5">
                          {r.status === 'inserted' && (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <CheckCircle2 size={12} /> Inserted
                            </span>
                          )}
                          {r.status === 'skipped' && (
                            <span className="inline-flex items-center gap-1 text-amber-700">
                              <SkipForward size={12} /> Skipped
                            </span>
                          )}
                          {r.status === 'error' && (
                            <span className="inline-flex items-center gap-1 text-red-700">
                              <AlertCircle size={12} /> Error
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-slate-700">
                          {r.assetTag ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-2 py-1.5 text-slate-600">
                          {r.status === 'skipped' ? r.reason : r.status === 'error' ? r.error : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={handleClose} className="btn-secondary">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || parsedRows.length === 0}
              className="btn-primary min-w-[150px] justify-center"
            >
              {importing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Importing…
                </>
              ) : (
                `Import ${parsedRows.length || ''}`
              )}
            </button>
          )}
          {result && (
            <button
              type="button"
              onClick={() => {
                reset();
              }}
              className="btn-primary"
            >
              Import Another
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function StatCard({
  label, value, tint, icon,
}: {
  label: string; value: number; tint: 'slate' | 'emerald' | 'amber' | 'red'; icon?: React.ReactNode;
}) {
  const palette: Record<string, string> = {
    slate:   'bg-slate-50 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber:   'bg-amber-50 text-amber-800 border-amber-200',
    red:     'bg-red-50 text-red-800 border-red-200',
  };
  return (
    <div className={`rounded-lg border p-2 ${palette[tint]}`}>
      <div className="flex items-center gap-1 text-[10px] uppercase font-semibold tracking-wider opacity-80">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

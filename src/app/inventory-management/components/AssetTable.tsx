'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Asset, AssetStatus } from '@/lib/mockData';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Edit3,
  Trash2,
  QrCode,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AssetTableProps {
  assets: Asset[];
  selectedIds: Set<string>;
  onSelectChange: (ids: Set<string>) => void;
  sortKey: keyof Asset;
  sortDir: 'asc' | 'desc';
  onSort: (key: keyof Asset) => void;
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
  onQR: (asset: Asset) => void;
  onStatusChange: (id: string, status: AssetStatus) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Faulty', 'Retired'];

function SortIcon({ col, sortKey, sortDir }: { col: keyof Asset; sortKey: keyof Asset; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== col) return <ChevronsUpDown size={12} className="text-slate-300" />;
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-blue-600" />
    : <ChevronDown size={12} className="text-blue-600" />;
}

/** Renders a status dropdown anchored to a button via a fixed-position portal */
function StatusDropdown({
  asset,
  onStatusChange,
  onClose,
  anchorRef,
}: {
  asset: Asset;
  onStatusChange: (id: string, status: AssetStatus) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
}) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left });
    }
  }, [anchorRef]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [anchorRef, onClose]);

  // Close on scroll
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[140px] py-1 slide-up"
      style={{ top: coords.top, left: coords.left }}
    >
      {STATUSES.map((s) => (
        <button
          key={`status-opt-${asset.id}-${s}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onStatusChange(asset.id, s);
            onClose();
          }}
          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors flex items-center gap-2 ${
            asset.status === s ? 'font-semibold text-blue-600' : 'text-slate-600'
          }`}
        >
          <StatusBadge status={s} size="sm" />
        </button>
      ))}
    </div>,
    document.body
  );
}

export default function AssetTable({
  assets, selectedIds, onSelectChange, sortKey, sortDir, onSort, onEdit, onDelete, onQR, onStatusChange,
}: AssetTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const buttonRefs = useRef<Record<string, React.RefObject<HTMLButtonElement>>>({});

  const totalPages = Math.max(1, Math.ceil(assets.length / pageSize));
  const paginated = assets.slice((page - 1) * pageSize, page * pageSize);

  function getButtonRef(id: string) {
    if (!buttonRefs.current[id]) {
      buttonRefs.current[id] = React.createRef<HTMLButtonElement>();
    }
    return buttonRefs.current[id];
  }

  function toggleAll() {
    if (paginated.every((a) => selectedIds.has(a.id))) {
      const next = new Set(selectedIds);
      paginated.forEach((a) => next.delete(a.id));
      onSelectChange(next);
    } else {
      const next = new Set(selectedIds);
      paginated.forEach((a) => next.add(a.id));
      onSelectChange(next);
    }
  }

  function toggleRow(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectChange(next);
  }

  const allSelected = paginated.length > 0 && paginated.every((a) => selectedIds.has(a.id));
  const someSelected = paginated.some((a) => selectedIds.has(a.id)) && !allSelected;

  const COLS: { key: keyof Asset; label: string; sortable?: boolean }[] = [
    { key: 'assetTag', label: 'Asset Tag', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'serialNumber', label: 'Serial No.', sortable: false },
    { key: 'school', label: 'School', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'location', label: 'Location', sortable: true },
    { key: 'purchaseDate', label: 'Purchased', sortable: true },
    { key: 'assignedTo', label: 'Assigned To', sortable: false },
  ];

  if (assets.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Package size={24} className="text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">No assets found</h3>
        <p className="text-xs text-slate-500 max-w-xs">
          No assets match your current search or filter criteria. Try adjusting your filters or add a new asset.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="table-th w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              {COLS.map((col) => (
                <th
                  key={`th-${col.key}`}
                  className={`table-th ${col.sortable ? 'cursor-pointer select-none hover:text-slate-700' : ''}`}
                  onClick={col.sortable ? () => onSort(col.key) : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.map((asset) => {
              const btnRef = getButtonRef(asset.id);
              return (
                <tr
                  key={asset.id}
                  className={`group transition-colors duration-100 ${
                    selectedIds.has(asset.id) ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                  } ${asset.status === 'Faulty' ? 'bg-red-50/20' : ''}`}
                >
                  <td className="table-td">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(asset.id)}
                      onChange={() => toggleRow(asset.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="table-td">
                    <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">
                      {asset.assetTag}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className="font-medium text-slate-800 text-sm">{asset.name}</span>
                  </td>
                  <td className="table-td">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                      {asset.category}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className="font-mono text-xs text-slate-500">{asset.serialNumber}</span>
                  </td>

                  {/* School Column */}
                  <td className="table-td">
                    {asset.school ? (
                      <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">
                        {asset.school}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>

                  {/* Status with portal dropdown */}
                  <td className="table-td">
                    <button
                      ref={btnRef}
                      onClick={() => setOpenStatusId(openStatusId === asset.id ? null : asset.id)}
                      className="focus:outline-none"
                    >
                      <StatusBadge status={asset.status} />
                    </button>
                    {openStatusId === asset.id && (
                      <StatusDropdown
                        asset={asset}
                        onStatusChange={onStatusChange}
                        onClose={() => setOpenStatusId(null)}
                        anchorRef={btnRef}
                      />
                    )}
                  </td>

                  <td className="table-td text-slate-600">{asset.location}</td>
                  <td className="table-td">
                    <span className="text-slate-500 text-xs tabular-nums">
                      {new Date(asset.purchaseDate).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="table-td">
                    {asset.assignedTo ? (
                      <div>
                        <p className="text-xs font-medium text-slate-700">{asset.assignedTo}</p>
                        {asset.department && (
                          <p className="text-xs text-slate-400">{asset.department}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="table-td">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onQR(asset)}
                        className="icon-btn"
                        title="Generate QR Code"
                      >
                        <QrCode size={15} />
                      </button>
                      <button
                        onClick={() => onEdit(asset)}
                        className="icon-btn"
                        title="Edit asset"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(asset.id)}
                        className="icon-btn hover:text-red-600 hover:bg-red-50"
                        title="Delete asset — this cannot be undone"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={`page-size-${n}`} value={n}>{n}</option>
            ))}
          </select>
          <span className="tabular-nums">
            {Math.min((page - 1) * pageSize + 1, assets.length)}–{Math.min(page * pageSize, assets.length)} of {assets.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="icon-btn disabled:opacity-30"
          >
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
              ) : (
                <button
                  key={`page-btn-${p}`}
                  onClick={() => setPage(p as number)}
                  className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                    page === p ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="icon-btn disabled:opacity-30"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { Assignment } from '@/lib/mockData';
import StatusBadge from '@/components/ui/StatusBadge';
import { RotateCcw, AlertTriangle, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';

interface AssignmentTableProps {
  assignments: Assignment[];
  onReturn: (assignment: Assignment) => void;
}

function daysOverdue(expectedReturn: string): number {
  const today = new Date('2026-04-01');
  const ret = new Date(expectedReturn);
  const diff = Math.floor((today.getTime() - ret.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function AssignmentTable({ assignments, onReturn }: AssignmentTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(assignments.length / pageSize));
  const paginated = assignments.slice((page - 1) * pageSize, page * pageSize);

  if (assignments.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <ClipboardList size={24} className="text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">No assignments found</h3>
        <p className="text-xs text-slate-500 max-w-xs">
          No assignments match your current filters. Try adjusting your search or create a new assignment.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {[
                'Asset Tag',
                'Asset Name',
                'Category',
                'Staff Member',
                'Department',
                'Date Assigned',
                'Expected Return',
                'Status',
                'Actions',
              ].map((h) => (
                <th key={`asgn-th-${h}`} className="table-th">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.map((asgn) => {
              const overdueDays = asgn.status === 'Overdue' ? daysOverdue(asgn.expectedReturn) : 0;
              const isOverdue = asgn.status === 'Overdue';
              return (
                <tr
                  key={asgn.id}
                  className={`group transition-colors duration-100 ${
                    isOverdue
                      ? 'bg-amber-50/40 hover:bg-amber-50'
                      : asgn.status === 'Returned' ?'opacity-70 hover:opacity-100 hover:bg-slate-50' :'hover:bg-slate-50'
                  }`}
                >
                  <td className="table-td">
                    <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">
                      {asgn.assetTag}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className="font-medium text-slate-800 text-sm">{asgn.assetName}</span>
                  </td>
                  <td className="table-td">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                      {asgn.category}
                    </span>
                  </td>
                  <td className="table-td">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{asgn.staffName}</p>
                      <p className="text-xs font-mono text-slate-400">{asgn.staffId}</p>
                    </div>
                  </td>
                  <td className="table-td text-slate-600 text-xs">{asgn.department}</td>
                  <td className="table-td">
                    <span className="text-xs text-slate-600 tabular-nums">
                      {formatDate(asgn.dateAssigned)}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-xs tabular-nums ${
                          isOverdue ? 'text-amber-700 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        {formatDate(asgn.expectedReturn)}
                      </span>
                      {isOverdue && overdueDays > 0 && (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle size={10} />
                          {overdueDays}d overdue
                        </span>
                      )}
                      {asgn.status === 'Returned' && asgn.returnedDate && (
                        <span className="text-xs text-emerald-600">
                          Returned {formatDate(asgn.returnedDate)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-td">
                    <StatusBadge status={asgn.status} />
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(asgn.status === 'Active' || asgn.status === 'Overdue') && (
                        <button
                          onClick={() => onReturn(asgn)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors active:scale-95"
                          title="Check in — mark as returned"
                        >
                          <RotateCcw size={12} />
                          Return
                        </button>
                      )}
                      {asgn.status === 'Returned' && (
                        <span className="text-xs text-slate-400 italic">Closed</span>
                      )}
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
              <option key={`asgn-page-size-${n}`} value={n}>{n}</option>
            ))}
          </select>
          <span className="tabular-nums">
            {Math.min((page - 1) * pageSize + 1, assignments.length)}–{Math.min(page * pageSize, assignments.length)} of {assignments.length}
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
                <span key={`asgn-ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
              ) : (
                <button
                  key={`asgn-page-btn-${p}`}
                  onClick={() => setPage(p as number)}
                  className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                    page === p
                      ? 'bg-blue-600 text-white' :'text-slate-600 hover:bg-slate-200'
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
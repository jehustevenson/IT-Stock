import React from 'react';

export function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-slate-200" />
        <div className="w-16 h-4 rounded bg-slate-200" />
      </div>
      <div className="w-20 h-8 rounded bg-slate-200 mb-2" />
      <div className="w-32 h-3 rounded bg-slate-100" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 8 }: { cols?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={`skel-col-${i}`} className="table-td">
          <div className="h-4 bg-slate-200 rounded" style={{ width: `${60 + (i * 13) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonChart({ height = 200 }: { height?: number }) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="h-full bg-slate-100 rounded-lg" />
    </div>
  );
}
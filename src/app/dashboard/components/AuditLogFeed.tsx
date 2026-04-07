'use client';

import React, { useState, useEffect } from 'react';
import { AuditLog } from '@/lib/mockData';
import { PlusCircle, UserCheck, RotateCcw, AlertTriangle, Edit3, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface AuditLogFeedProps {
  limit?: number;
}

const ACTION_CONFIG: Record<
  'Added' | 'Assigned' | 'Returned' | 'Updated' | 'Deleted' | 'Flagged',
  { icon: React.ElementType; color: string; bg: string }
> = {
  Added:    { icon: PlusCircle,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  Assigned: { icon: UserCheck,     color: 'text-blue-600',    bg: 'bg-blue-50'    },
  Returned: { icon: RotateCcw,     color: 'text-slate-600',   bg: 'bg-slate-100'  },
  Updated:  { icon: Edit3,         color: 'text-amber-600',   bg: 'bg-amber-50'   },
  Deleted:  { icon: Trash2,        color: 'text-red-600',     bg: 'bg-red-50'     },
  Flagged:  { icon: AlertTriangle, color: 'text-red-600',     bg: 'bg-red-50'     },
};

function formatTimestamp(ts: string) {
  // Ensure UTC interpretation by appending Z if missing
  const normalized = ts.endsWith('Z') ? ts : ts + 'Z';
  return new Date(normalized).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function AuditLogFeed({ limit = 10 }: AuditLogFeedProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch(`/api/audit-logs?limit=${limit}&offset=0`);
        if (!res.ok) throw new Error('Failed to fetch audit logs');
        const { data } = await res.json();
        setLogs(data || []);
      } catch (err) {
        console.error('Error fetching audit logs:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [limit]);

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin w-5 h-5 text-blue-500" />
          <p className="text-sm text-slate-500">Loading activity log...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600 font-medium">Failed to load activity log</p>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
          <p className="text-xs text-slate-500 mt-0.5">Last {logs.length} asset actions across the system</p>
        </div>
        <Link href="/inventory-management">
          <span className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
            View Inventory <ArrowRight size={12} />
          </span>
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {logs.length === 0 && (
          <p className="px-5 py-8 text-xs text-slate-400 text-center">No activity yet.</p>
        )}
        {logs.map((log) => {
          const config = ACTION_CONFIG[log.action as keyof typeof ACTION_CONFIG];
          const Icon = config?.icon;
          return (
            <div
              key={log.id}
              className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg ${config?.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <Icon size={14} className={config?.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800">{log.action}</span>
                  <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    {log.assetTag}
                  </span>
                  <span className="text-sm text-slate-600 truncate">{log.assetName}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{log.details}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span className="text-xs text-slate-400">{log.performedBy}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
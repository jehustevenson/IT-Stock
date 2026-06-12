'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { Plus, FileText, ExternalLink } from 'lucide-react';
import { Waybill, WaybillStatus } from '@/lib/supabase/types';
import WaybillFormModal, { WaybillFormData } from './WaybillFormModal';

const STATUS_STYLES: Record<WaybillStatus, string> = {
  'Pending IT Approval':       'bg-amber-50 text-amber-700 border-amber-200',
  'Pending Security Approval': 'bg-blue-50 text-blue-700 border-blue-200',
  'Approved':                  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Rejected':                  'bg-red-50 text-red-700 border-red-200',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function WaybillsClient() {
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<string>('All');
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/waybills');
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const body = await res.json();
      setWaybills(body.data ?? []);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to load waybills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(data: WaybillFormData) {
    const res = await fetch('/api/waybills', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Failed to create waybill');
    }
    const created = (await res.json()) as Waybill;
    setWaybills((prev) => [created, ...prev]);
    setFormOpen(false);
    toast.success(`Waybill ${created.waybillNo} created — sent for IT approval`);
  }

  const filtered = useMemo(
    () => (filter === 'All' ? waybills : waybills.filter((w) => w.status === filter)),
    [waybills, filter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: waybills.length };
    for (const w of waybills) c[w.status] = (c[w.status] ?? 0) + 1;
    return c;
  }, [waybills]);

  const FILTERS = ['All', 'Pending IT Approval', 'Pending Security Approval', 'Approved', 'Rejected'];

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-5">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Waybills</h1>
            <p className="text-sm text-slate-500 mt-1">
              Equipment leaving campus — two-stage approval (IT manager, then Security).
            </p>
          </div>
          <button onClick={() => setFormOpen(true)} className="btn-primary text-xs gap-1.5">
            <Plus size={14} />
            New Waybill
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((s) => (
            <button
              key={`wb-filter-${s}`}
              onClick={() => setFilter(s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                filter === s
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {s}
              <span className={`tabular-nums ${filter === s ? 'opacity-80' : 'text-slate-400'}`}>
                {counts[s] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <p className="text-sm text-slate-500">Loading waybills…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <FileText size={24} className="text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">No waybills</h3>
            <p className="text-xs text-slate-500 max-w-xs">
              Create a waybill when equipment needs to leave campus — it will be routed
              to the IT manager, then Security, for approval.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Waybill No.', 'Date', 'Company', 'Recipient', 'Items', 'Expected Return', 'Status', ''].map((h, i) => (
                      <th key={`wb-th-${i}`} className="table-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((w) => (
                    <tr key={w.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="table-td">
                        <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">
                          {w.waybillNo}
                        </span>
                      </td>
                      <td className="table-td text-xs text-slate-600 tabular-nums">{formatDate(w.date)}</td>
                      <td className="table-td">
                        <p className="text-sm font-medium text-slate-800">{w.companyName}</p>
                        {w.companyAddress && <p className="text-xs text-slate-400">{w.companyAddress}</p>}
                      </td>
                      <td className="table-td text-xs text-slate-600">{w.recipientName}</td>
                      <td className="table-td text-xs text-slate-600 tabular-nums">{w.items.length}</td>
                      <td className="table-td text-xs text-slate-600 tabular-nums">
                        {w.expectedReturn ? formatDate(w.expectedReturn) : '—'}
                      </td>
                      <td className="table-td">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_STYLES[w.status]}`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="table-td">
                        <Link
                          href={`/waybills/${w.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          <ExternalLink size={12} />
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <WaybillFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />
    </>
  );
}

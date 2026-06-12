'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { Waybill, WaybillStatus } from '@/lib/supabase/types';
import { ArrowLeft, Check, Loader2, Printer, X } from 'lucide-react';

type WaybillDetail = Waybill & { viewerCanApprove: boolean; viewerStage: 'IT' | 'Security' | null };

const STATUS_STYLES: Record<WaybillStatus, string> = {
  'Pending IT Approval':       'bg-amber-50 text-amber-700 border-amber-200',
  'Pending Security Approval': 'bg-blue-50 text-blue-700 border-blue-200',
  'Approved':                  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Rejected':                  'bg-red-50 text-red-700 border-red-200',
};

function fmt(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTs(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function WaybillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [wb, setWb] = useState<WaybillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/waybills/${id}`);
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error('Waybill not found');
      setWb(await res.json());
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function decide(action: 'approve' | 'reject') {
    let reason = '';
    if (action === 'reject') {
      reason = window.prompt('Reason for rejection (optional):') ?? '';
    }
    setActing(true);
    try {
      const res = await fetch(`/api/waybills/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Action failed');
      }
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={24} />
      </div>
    );
  }
  if (!wb) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-slate-600">Waybill not found.</p>
        <Link href="/waybills" className="btn-secondary text-xs">Back to waybills</Link>
      </div>
    );
  }

  const dots = '.'.repeat(40);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <Toaster position="bottom-right" richColors />

      {/* Action bar — hidden when printing */}
      <div className="max-w-3xl mx-auto px-4 mb-4 flex items-center justify-between print:hidden">
        <Link href="/waybills" className="btn-secondary text-xs gap-1.5">
          <ArrowLeft size={13} />
          All waybills
        </Link>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${STATUS_STYLES[wb.status]}`}>
            {wb.status}
          </span>
          {wb.viewerCanApprove && (
            <>
              <button onClick={() => decide('reject')} disabled={acting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                <X size={13} /> Reject
              </button>
              <button onClick={() => decide('approve')} disabled={acting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                {acting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Approve ({wb.viewerStage})
              </button>
            </>
          )}
          {wb.status === 'Approved' && (
            <button onClick={() => window.print()} className="btn-primary text-xs gap-1.5">
              <Printer size={13} /> Print
            </button>
          )}
        </div>
      </div>

      {wb.status !== 'Approved' && (
        <div className="max-w-3xl mx-auto px-4 mb-4 print:hidden">
          <div className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            {wb.status === 'Rejected'
              ? `Rejected by ${wb.rejectedBy} on ${fmtTs(wb.rejectedAt)}${wb.rejectionReason ? ` — "${wb.rejectionReason}"` : ''}`
              : 'This waybill is not fully approved yet — printing is enabled once Security signs off.'}
          </div>
        </div>
      )}

      {/* Waybill document */}
      <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none px-10 py-10 print:px-0 print:py-0">
        <div className="text-center space-y-0.5 mb-8">
          <h1 className="text-lg font-bold tracking-wide text-slate-900">GHANA INTERNATIONAL SCHOOL</h1>
          <p className="text-sm font-semibold text-slate-700">ICT SYSTEMS DEPARTMENT</p>
          <p className="text-sm font-bold tracking-[0.3em] text-slate-900 mt-2">WAYBILL</p>
          <p className="text-xs text-slate-500 font-mono">{wb.waybillNo}</p>
        </div>

        <div className="space-y-2 text-sm text-slate-800 mb-6">
          <p><span className="font-semibold">Date:</span> {fmt(wb.date)}</p>
          <p><span className="font-semibold">Company&apos;s Name:</span> {wb.companyName}</p>
          <p><span className="font-semibold">Company&apos;s Address:</span> {wb.companyAddress ?? '—'}</p>
        </div>

        <table className="w-full border border-slate-400 text-sm mb-8">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-400 px-2 py-1.5 text-left w-10">No.</th>
              <th className="border border-slate-400 px-2 py-1.5 text-left">Item Description &amp; Serial No</th>
              <th className="border border-slate-400 px-2 py-1.5 text-left w-14">Qty</th>
              <th className="border border-slate-400 px-2 py-1.5 text-left w-1/3">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {wb.items.map((it, i) => (
              <tr key={it.id}>
                <td className="border border-slate-400 px-2 py-1.5 align-top">{i + 1}.</td>
                <td className="border border-slate-400 px-2 py-1.5 align-top">
                  {it.description}
                  {it.serialNumber && <span className="font-mono text-xs"> — {it.serialNumber}</span>}
                </td>
                <td className="border border-slate-400 px-2 py-1.5 align-top tabular-nums">{it.qty}</td>
                <td className="border border-slate-400 px-2 py-1.5 align-top">{it.purpose ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-5 text-sm text-slate-800">
          <p>
            <span className="font-semibold">Recipient Name:</span> {wb.recipientName}
            <span className="ml-8 font-semibold">Signature:</span> <span className="text-slate-400">{dots}</span>
          </p>
          <p>
            <span className="font-semibold">Approved by: IT &amp; Digital Evolution Manager</span>
            <span className="ml-4 font-semibold">Signature:</span>{' '}
            {wb.itApprovedBy ? (
              <span className="text-emerald-700">
                ✓ {wb.itApprovedBy} — {fmtTs(wb.itApprovedAt)}
              </span>
            ) : (
              <span className="text-slate-400">{dots}</span>
            )}
          </p>
          <p><span className="font-semibold">Expected Date of Return:</span> {wb.expectedReturn ? fmt(wb.expectedReturn) : '—'}</p>
          <p>
            <span className="font-semibold">VERIFIED BY:</span>{' '}
            {wb.securityApprovedBy ? (
              <span className="text-emerald-700">
                ✓ {wb.securityApprovedBy} — {fmtTs(wb.securityApprovedAt)}
              </span>
            ) : (
              <span className="text-slate-400">{dots}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Assignment } from '@/lib/supabase/types';
import { RotateCcw, Loader2 } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';

interface ReturnModalProps {
  open:      boolean;
  onClose:   () => void;
  assignment: Assignment;
  /** Context now owns the API call — just pass the values up. */
  onConfirm: (id: string, returnedDate: string, condition: string, notes: string) => Promise<void>;
}

export default function ReturnModal({ open, onClose, assignment, onConfirm }: ReturnModalProps) {
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [condition,  setCondition]  = useState<'Good' | 'Damaged' | 'Needs Service'>('Good');
  const [notes,      setNotes]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  async function handleConfirm() {
    if (!returnDate) return;
    setLoading(true);
    setError('');
    try {
      // FIX: delegate entirely to onConfirm — no direct fetch here.
      // AppDataContext.returnAssignment() handles the API call and state update.
      await onConfirm(assignment.id, returnDate, condition, notes.trim());
    } catch (err) {
      setError((err as Error).message ?? 'Failed to process return. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Check In Asset"
      subtitle={`Recording return of ${assignment.assetTag} from ${assignment.staffName}`}
      size="md"
    >
      <div className="px-6 py-5 space-y-5">
        {/* Asset Summary */}
        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <RotateCcw size={18} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-semibold">
                {assignment.assetTag}
              </span>
              <StatusBadge status={assignment.status} size="sm" />
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-1">{assignment.assetName}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned to{' '}
              <span className="font-medium text-slate-700">{assignment.staffName}</span>
              {' '}({assignment.staffId}) — {assignment.department}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Originally assigned:{' '}
              {new Date(assignment.dateAssigned).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Return Date */}
        <div>
          <label className="form-label">
            Return Date <span className="text-red-500">*</span>
          </label>
          <p className="form-helper -mt-0.5 mb-1">Date the asset was physically returned</p>
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="form-input"
          />
        </div>

        {/* Condition */}
        <div>
          <label className="form-label">Asset Condition on Return</label>
          <div className="flex items-center gap-2 mt-1">
            {(['Good', 'Damaged', 'Needs Service'] as const).map((c) => (
              <button
                key={`condition-${c}`}
                type="button"
                onClick={() => setCondition(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                  condition === c
                    ? c === 'Good'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : c === 'Damaged'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="form-label">Return Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Device returned in good condition. Charger included."
            className="form-input resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary" disabled={loading}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !returnDate}
            className="btn-primary min-w-[140px] justify-center"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <RotateCcw size={14} />
                Confirm Return
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
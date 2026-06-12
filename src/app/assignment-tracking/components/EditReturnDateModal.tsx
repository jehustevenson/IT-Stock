'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { Assignment } from '@/lib/supabase/types';
import { CalendarClock, Loader2 } from 'lucide-react';

interface EditReturnDateModalProps {
  open: boolean;
  onClose: () => void;
  assignment: Assignment;
  onConfirm: (id: string, expectedReturn: string) => Promise<void> | void;
}

export default function EditReturnDateModal({
  open, onClose, assignment, onConfirm,
}: EditReturnDateModalProps) {
  const [date, setDate] = useState(assignment.expectedReturn);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(assignment.expectedReturn);
      setError('');
    }
  }, [open, assignment]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('Please pick a date.');
      return;
    }
    if (date <= assignment.dateAssigned) {
      setError('Return date must be after the assignment date.');
      return;
    }

    setSaving(true);
    try {
      await onConfirm(assignment.id, date);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Expected Return"
      subtitle={`${assignment.assetTag} — ${assignment.assetName}, held by ${assignment.staffName}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div>
          <label className="form-label">Expected return date</label>
          <p className="form-helper -mt-0.5 mb-1">
            Assigned {assignment.dateAssigned} — currently due {assignment.expectedReturn}
          </p>
          <input
            type="date"
            value={date}
            min={assignment.dateAssigned}
            onChange={(e) => setDate(e.target.value)}
            className="form-input"
            required
          />
        </div>

        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <p className="text-xs text-slate-400">
          If the new date is in the past, the assignment is flagged Overdue; otherwise it
          returns to Active.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary min-w-[120px] justify-center">
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CalendarClock size={14} />
                Save Date
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

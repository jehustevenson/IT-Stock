import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Assignment } from '@/lib/supabase/types';

interface OverdueAlertProps {
  overdueAssignments: Assignment[];
}

export default function OverdueAlert({ overdueAssignments }: OverdueAlertProps) {
  const count = overdueAssignments.length;
  if (count === 0) return null;

  const names = overdueAssignments
    .slice(0, 2)
    .map((a) => `${a.assetName} (${a.staffName})`)
    .join(' and ');

  const suffix = count > 2 ? ` and ${count - 2} more` : '';

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
      <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
      <p className="text-sm text-amber-800 flex-1">
        <span className="font-semibold">
          {count} overdue assignment{count > 1 ? 's' : ''}
        </span>{' '}
        — {names}{suffix} {count === 1 ? 'is' : 'are'} past their expected return dates.
      </p>
      <Link href="/assignment-tracking">
        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors whitespace-nowrap">
          View Assignments <ArrowRight size={12} />
        </span>
      </Link>
    </div>
  );
}
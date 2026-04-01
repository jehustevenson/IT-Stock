import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function OverdueAlert() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
      <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
      <p className="text-sm text-amber-800 flex-1">
        <span className="font-semibold">2 overdue assignments</span> — MacBook Pro 14" (Priya Nair) and Cisco IP Phone 8841 (Aisha Mensah) are past their expected return dates.
      </p>
      <Link href="/assignment-tracking">
        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors whitespace-nowrap">
          View Assignments <ArrowRight size={12} />
        </span>
      </Link>
    </div>
  );
}
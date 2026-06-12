import React from 'react';
import { AssetStatus } from '@/lib/supabase/types';

interface StatusBadgeProps {
  status: AssetStatus | 'Active' | 'Returned' | 'Overdue';
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1 rounded-full font-medium';
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const colorMap: Record<string, string> = {
    Available: 'bg-emerald-50 text-emerald-700',
    Assigned: 'bg-blue-50 text-blue-700',
    Active: 'bg-blue-50 text-blue-700',
    Faulty: 'bg-red-50 text-red-700',
    Retired: 'bg-slate-100 text-slate-500',
    Returned: 'bg-slate-100 text-slate-600',
    Overdue: 'bg-amber-50 text-amber-700',
  };

  const dotMap: Record<string, string> = {
    Available: 'bg-emerald-500',
    Assigned: 'bg-blue-500',
    Active: 'bg-blue-500',
    Faulty: 'bg-red-500',
    Retired: 'bg-slate-400',
    Returned: 'bg-slate-400',
    Overdue: 'bg-amber-500',
  };

  return (
    <span className={`${baseClasses} ${sizeClasses} ${colorMap[status] ?? 'bg-slate-100 text-slate-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotMap[status] ?? 'bg-slate-400'}`} />
      {status}
    </span>
  );
}
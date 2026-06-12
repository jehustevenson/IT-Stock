import React from 'react';
import { Package, CheckCircle, UserCheck, AlertOctagon, Archive } from 'lucide-react';
import { Asset } from '@/lib/supabase/types';

interface KPIBentoGridProps {
  assets: Asset[];
}

export default function KPIBentoGrid({ assets }: KPIBentoGridProps) {
  const total     = assets.length;
  const available = assets.filter((a) => a.status === 'Available').length;
  const assigned  = assets.filter((a) => a.status === 'Assigned').length;
  const faulty    = assets.filter((a) => a.status === 'Faulty').length;
  const retired   = assets.filter((a) => a.status === 'Retired').length;
  const utilizationRate = total > 0 ? Math.round((assigned / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {/* Hero: Total Assets */}
      <div className="card p-5 lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 border-blue-700 text-white">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Package size={20} className="text-white" />
          </div>
          <span className="text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full">All Assets</span>
        </div>
        <p className="text-4xl font-bold tabular-nums">{total}</p>
        <p className="text-sm font-medium text-blue-100 mt-1">Total Tracked Assets</p>
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center justify-between text-xs text-blue-100">
            <span>Utilization Rate</span>
            <span className="font-semibold text-white">{utilizationRate}%</span>
          </div>
          <div className="mt-1.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${utilizationRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Available */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            Ready
          </span>
        </div>
        <p className="text-3xl font-bold text-slate-900 tabular-nums">{available}</p>
        <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wide">Available</p>
        <p className="text-xs text-slate-400 mt-2">Ready to deploy immediately</p>
      </div>

      {/* Assigned */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <UserCheck size={18} className="text-blue-600" />
          </div>
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            In Use
          </span>
        </div>
        <p className="text-3xl font-bold text-slate-900 tabular-nums">{assigned}</p>
        <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wide">Assigned</p>
        <p className="text-xs text-slate-400 mt-2">Currently with staff members</p>
      </div>

      {/* Faulty */}
      <div className="card p-5 border-red-100 bg-red-50/30">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertOctagon size={18} className="text-red-600" />
          </div>
          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            Alert
          </span>
        </div>
        <p className="text-3xl font-bold text-red-700 tabular-nums">{faulty}</p>
        <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wide">Faulty</p>
        <p className="text-xs text-red-400 mt-2">Needs repair or replacement</p>
      </div>

      {/* Retired */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <Archive size={18} className="text-slate-500" />
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            EOL
          </span>
        </div>
        <p className="text-3xl font-bold text-slate-900 tabular-nums">{retired}</p>
        <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wide">Retired</p>
        <p className="text-xs text-slate-400 mt-2">End-of-life, pending disposal</p>
      </div>
    </div>
  );
}
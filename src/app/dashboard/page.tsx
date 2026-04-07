'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from './components/DashboardHeader';
import KPIBentoGrid from './components/KPIBentoGrid';
import CategoryBarChart from './components/CategoryBarChart';
import StatusDonutChart from './components/StatusDonutChart';
import AuditLogFeed from './components/AuditLogFeed';
import OverdueAlert from './components/OverdueAlert';
import { useAppData } from '@/lib/AppDataContext';
import { AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  const { assets, assignments, loading, error } = useAppData();

  // FIX: surface load errors instead of blank dashboard
  if (error) {
    return (
      <AppLayout>
        <div className="px-6 lg:px-8 py-6 max-w-screen-2xl mx-auto">
          <div className="card p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <p className="text-sm font-medium text-slate-800 mb-1">Failed to load dashboard data</p>
            <p className="text-xs text-slate-500 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-secondary text-xs">
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const overdueAssignments = assignments.filter((a) => a.status === 'Overdue');

  return (
    // FIX: AppLayout is only here (not duplicated inside a client component)
    <AppLayout>
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <DashboardHeader />
        {overdueAssignments.length > 0 && (
          <OverdueAlert overdueAssignments={overdueAssignments} />
        )}
        <KPIBentoGrid assets={assets} />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <CategoryBarChart assets={assets} />
          </div>
          <div className="xl:col-span-1">
            <StatusDonutChart assets={assets} />
          </div>
        </div>
        <AuditLogFeed limit={10} />
      </div>
    </AppLayout>
  );
}
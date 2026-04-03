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

export default function DashboardPage() {
  const { assets, assignments } = useAppData();

  const overdueAssignments = assignments.filter((a) => a.status === 'Overdue');

  // Build audit-log-style feed from assignments for recent activity
  const recentLogs = [...assignments]
    .sort((a, b) => b.dateAssigned.localeCompare(a.dateAssigned))
    .slice(0, 8)
    .map((a) => ({
      id:          a.id,
      timestamp:   a.dateAssigned + 'T00:00:00',
      action:      (a.status === 'Returned' ? 'Returned' : 'Assigned') as
                     'Added' | 'Assigned' | 'Returned' | 'Updated' | 'Deleted' | 'Flagged',
      assetTag:    a.assetTag,
      assetName:   a.assetName,
      performedBy: 'Admin (IT)',
      details:
        a.status === 'Returned'
          ? `Returned by ${a.staffName} (${a.staffId}) — ${a.department}`
          : `Assigned to ${a.staffName} (${a.staffId}) — ${a.department}`,
    }));

  return (
    <AppLayout>
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <DashboardHeader />
        {overdueAssignments.length > 0 && (
          <OverdueAlert overdueAssignments={overdueAssignments} />
        )}
        <KPIBentoGrid assets={assets} />
        <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <CategoryBarChart assets={assets} />
          </div>
          <div className="xl:col-span-1">
            <StatusDonutChart assets={assets} />
          </div>
        </div>
        <AuditLogFeed logs={recentLogs} />
      </div>
    </AppLayout>
  );
}
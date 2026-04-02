import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from './components/DashboardHeader';
import KPIBentoGrid from './components/KPIBentoGrid';
import CategoryBarChart from './components/CategoryBarChart';
import StatusDonutChart from './components/StatusDonutChart';
import AuditLogFeed from './components/AuditLogFeed';
import OverdueAlert from './components/OverdueAlert';
import { createClient } from '@/lib/supabase/server';
import { toAsset, toAssignment, toAuditLog } from '@/lib/supabase/types';

export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();

  const [assetsRes, assignmentsRes, logsRes] = await Promise.all([
    supabase.from('assets').select('*').order('asset_tag'),
    supabase.from('assignments').select('*').order('date_assigned', { ascending: false }),
    supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(8),
  ]);

  const assets      = (assetsRes.data     ?? []).map(toAsset);
  const assignments = (assignmentsRes.data ?? []).map(toAssignment);
  const auditLogs   = (logsRes.data        ?? []).map(toAuditLog);

  const overdueAssignments = assignments.filter((a) => a.status === 'Overdue');

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
        <AuditLogFeed logs={auditLogs} />
      </div>
    </AppLayout>
  );
}
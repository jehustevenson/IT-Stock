import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from './components/DashboardHeader';
import KPIBentoGrid from './components/KPIBentoGrid';
import CategoryBarChart from './components/CategoryBarChart';
import StatusDonutChart from './components/StatusDonutChart';
import AuditLogFeed from './components/AuditLogFeed';
import OverdueAlert from './components/OverdueAlert';

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <DashboardHeader />
        <OverdueAlert />
        <KPIBentoGrid />
        {/* Charts + Audit Log row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <CategoryBarChart />
          </div>
          <div className="xl:col-span-1">
            <StatusDonutChart />
          </div>
        </div>
        <AuditLogFeed />
      </div>
    </AppLayout>
  );
}
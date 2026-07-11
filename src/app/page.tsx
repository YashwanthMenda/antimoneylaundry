import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from './components/DashboardHeader';
import MetricsBentoGrid from './components/MetricsBentoGrid';
import AlertVolumeChart from './components/AlertVolumeChart';
import PatternBreakdownChart from './components/PatternBreakdownChart';
import LiveAlertsTable from './components/LiveAlertsTable';
import CasePipelineSidebar from './components/CasePipelineSidebar';

export default function DashboardPage() {
  return (
    <AppLayout>
      <DashboardHeader />
      <MetricsBentoGrid />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Alert Volume — Last 24 Hours
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hourly detection events across all channels
              </p>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
              LIVE · 1h bins
            </span>
          </div>
          <AlertVolumeChart />
        </div>
        <div className="card-elevated p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              Pattern Distribution
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Active alerts by laundering typology
            </p>
          </div>
          <PatternBreakdownChart />
        </div>
      </div>

      {/* Main content + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-4 2xl:grid-cols-4 gap-4 mt-4">
        <div className="xl:col-span-3 2xl:col-span-3">
          <LiveAlertsTable />
        </div>
        <div className="xl:col-span-1 2xl:col-span-1">
          <CasePipelineSidebar />
        </div>
      </div>
    </AppLayout>
  );
}
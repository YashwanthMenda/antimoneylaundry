'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Download } from 'lucide-react';

export default function DashboardHeader() {
  const router = useRouter();

  const handleNewCase = () => {
    router?.push('/case-investigation-detail');
  };

  const handleExportReport = () => {
    const rows = [
      ['AML Investigation Dashboard Report'],
      ['Generated', new Date()?.toLocaleString('en-IN')],
      [],
      ['Metric', 'Value'],
      ['Active Alerts', '247'],
      ['Open Cases', '38'],
      ['SAR Pending', '12'],
      ['High Risk Entities', '94'],
    ];
    const csv = rows?.map((r) => r?.join(','))?.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AML_Dashboard_Report_${new Date()?.toISOString()?.slice(0, 10)}.csv`;
    a?.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity size={16} className="text-primary" />
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            AML Investigation Dashboard
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Real-time transaction monitoring · Temporal GNN detection engine active ·{' '}
          <span className="text-risk-low font-mono">14,521 txns processed today</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleExportReport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-md hover:bg-muted hover:text-foreground transition-all duration-150"
        >
          <Download size={13} />
          Export Report
        </button>
        <button
          onClick={handleNewCase}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-md hover:bg-primary/90 active:scale-95 transition-all duration-150"
        >
          + New Case
        </button>
      </div>
    </div>
  );
}
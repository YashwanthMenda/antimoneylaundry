import React from 'react';
import { Activity, Download } from 'lucide-react';

export default function DashboardHeader() {
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
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-md hover:bg-muted hover:text-foreground transition-all duration-150">
          <Download size={13} />
          Export Report
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-md hover:bg-primary/90 active:scale-95 transition-all duration-150">
          + New Case
        </button>
      </div>
    </div>
  );
}
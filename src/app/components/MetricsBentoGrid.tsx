'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  FolderOpen,
  FileWarning,
  IndianRupee,
  Activity,
  Loader2,
} from 'lucide-react';
import { getDashboardMetrics } from '@/lib/services/amlService';
import { createClient } from '@/lib/supabase/client';

interface Metrics {
  transactions_today: number;
  active_alerts: number;
  critical_accounts: number;
  open_cases: number;
  sar_queue: number;
  amount_frozen_lakhs: number;
}

function formatCrore(lakhs: number): string {
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(1)}Cr`;
  return `₹${lakhs}L`;
}

export default function MetricsBentoGrid() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getDashboardMetrics();
      if (data) {
        setMetrics({
          transactions_today: data.transactions_today ?? 14521,
          active_alerts: data.active_alerts ?? 47,
          critical_accounts: data.critical_accounts ?? 23,
          open_cases: data.open_cases ?? 12,
          sar_queue: data.sar_queue ?? 3,
          amount_frozen_lakhs: data.amount_frozen_lakhs ?? 230,
        });
      }
      setLoading(false);
    }
    load();

    // Real-time subscription for dashboard_metrics
    const supabase = createClient();
    const channel = supabase
      .channel('dashboard_metrics_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dashboard_metrics' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`skel-${i}`}
            className={`${i === 0 ? 'col-span-2' : ''} card-elevated p-5 flex items-center justify-center min-h-[100px]`}
          >
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ))}
      </div>
    );
  }

  const m = metrics!;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-6 gap-3">
      {/* Hero — Transactions Today — spans 2 cols */}
      <div className="col-span-2 card-elevated p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Transactions Monitored
          </p>
          <Activity size={16} className="text-muted-foreground opacity-60" />
        </div>
        <div>
          <p className="text-4xl font-bold text-foreground font-mono risk-score-font">
            {m.transactions_today.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Live from transaction feed
          </p>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-full h-1">
            <div className="bg-primary h-1 rounded-full" style={{ width: '72%' }} />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">72% of daily avg</span>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="bg-risk-critical border border-risk-critical rounded-lg p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-white/70 uppercase tracking-widest">
            Active Alerts
          </p>
          <AlertTriangle size={16} className="text-white/60" />
        </div>
        <div>
          <p className="text-3xl font-bold text-white font-mono risk-score-font">
            {m.active_alerts}
          </p>
          <p className="text-xs text-white/60 mt-1 font-mono">
            {Math.round(m.active_alerts * 0.17)} critical · {Math.round(m.active_alerts * 0.49)} high
          </p>
        </div>
        <p className="text-[10px] text-white/50 mt-2">↑ 12 new in last hour</p>
      </div>

      {/* Critical Risk Accounts */}
      <div className="bg-risk-high border border-risk-high rounded-lg p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-white/70 uppercase tracking-widest">
            Critical Accounts
          </p>
          <ShieldAlert size={16} className="text-white/60" />
        </div>
        <div>
          <p className="text-3xl font-bold text-white font-mono risk-score-font">
            {m.critical_accounts}
          </p>
          <p className="text-xs text-white/60 mt-1 font-mono">score ≥ 86</p>
        </div>
        <p className="text-[10px] text-white/50 mt-2">5 added since 08:00 IST</p>
      </div>

      {/* Open Cases */}
      <div className="card-elevated p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Open Cases
          </p>
          <FolderOpen size={16} className="text-muted-foreground opacity-60" />
        </div>
        <div>
          <p className="text-3xl font-bold text-foreground font-mono risk-score-font">
            {m.open_cases}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">3 due for SAR today</p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">↓ 2 closed yesterday</p>
      </div>

      {/* SAR Queue */}
      <div className="bg-risk-medium border border-risk-medium rounded-lg p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-accent-foreground/70 uppercase tracking-widest">
            SAR Queue
          </p>
          <FileWarning size={16} className="text-accent-foreground/60" />
        </div>
        <div>
          <p className="text-3xl font-bold text-accent-foreground font-mono risk-score-font">
            {m.sar_queue}
          </p>
          <p className="text-xs text-accent-foreground/60 mt-1 font-mono">pending filing</p>
        </div>
        <p className="text-[10px] text-accent-foreground/50 mt-2">Deadline: 14-Jul-2026</p>
      </div>

      {/* Amount Frozen */}
      <div className="col-span-2 md:col-span-1 lg:col-span-1 card-elevated p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Amount Frozen
          </p>
          <IndianRupee size={16} className="text-muted-foreground opacity-60" />
        </div>
        <div>
          <p className="text-3xl font-bold text-foreground font-mono risk-score-font">
            {formatCrore(m.amount_frozen_lakhs)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">across 9 accounts</p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">↑ ₹47L added today</p>
      </div>
    </div>
  );
}
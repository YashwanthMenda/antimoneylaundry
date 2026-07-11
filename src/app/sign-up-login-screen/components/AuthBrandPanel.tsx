import React from 'react';
import AppLogo from '@/components/ui/AppLogo';
import { Shield, Zap, FileText, Network } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const stats = [
  { id: 'stat-txn', value: '2.3M+', label: 'Transactions monitored daily' },
  { id: 'stat-sar', value: '98.4%', label: 'SAR filing accuracy' },
  { id: 'stat-detect', value: '< 100ms', label: 'Real-time detection latency' },
  { id: 'stat-banks', value: '47', label: 'Financial institutions served' },
];

const features = [
  {
    id: 'feat-gnn',
    icon: Network,
    title: 'Temporal GNN Detection',
    desc: 'Graph neural networks trace smurfing, layering, and round-trip patterns across the full transaction network.',
  },
  {
    id: 'feat-shap',
    icon: Zap,
    title: 'SHAP Explainability',
    desc: 'Every risk score backed by feature-level explanation — court-admissible evidence for every SAR.',
  },
  {
    id: 'feat-sar',
    icon: FileText,
    title: 'Automated SAR Generation',
    desc: 'AI-populated SAR reports aligned with FATF guidelines. From alert to filing in under 3 minutes.',
  },
];

export default function AuthBrandPanel() {
  return (
    <div className="hidden lg:flex flex-col w-[52%] xl:w-[55%] bg-card border-r border-border p-10 xl:p-14 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-5 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <AppLogo size={32} />
        <div>
          <span className="text-base font-bold text-foreground tracking-tight">AntiMoneyLaundry</span>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
            AML Intelligence Platform
          </p>
        </div>
      </div>
      {/* Headline */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground leading-tight tracking-tight mb-3">
          Financial crime<br />
          <span className="text-primary">detected before</span><br />
          it moves.
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
          AI-powered transaction monitoring that catches smurfing, layering, and round-trip
          patterns in real time — with explainable risk scores and automated SAR generation.
        </p>
      </div>
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-10">
        {stats?.map((s) => (
          <div key={s?.id} className="bg-muted/40 border border-border rounded-lg p-4">
            <p className="text-2xl font-bold font-mono text-foreground risk-score-font">{s?.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{s?.label}</p>
          </div>
        ))}
      </div>
      {/* Features */}
      <div className="space-y-4">
        {features?.map((f) => {
          const Icon = f?.icon;
          return (
            <div key={f?.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={15} className="text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{f?.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{f?.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
      {/* Compliance badges */}
      <div className="mt-auto pt-8 flex items-center gap-3">
        <Shield size={14} className="text-muted-foreground" />
        <div className="flex items-center gap-2 flex-wrap">
          {['FATF Compliant', 'FIU-IND Ready', 'ISO 27001', 'SOC 2 Type II']?.map((badge) => (
            <span
              key={`badge-${badge}`}
              className="text-[9px] font-semibold text-muted-foreground border border-border rounded px-2 py-0.5 uppercase tracking-wider"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
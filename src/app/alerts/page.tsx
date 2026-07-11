'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import RiskBadge, { getRiskLevel } from '@/components/ui/RiskBadge';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';
import {
  AlertTriangle, Filter, ChevronDown, Eye, FileText, CheckCircle,
  Bell, TrendingUp, Clock, Search, Loader2,
} from 'lucide-react';
import { getAlerts, updateAlertStatus, createSARReport } from '@/lib/services/amlService';
import { createClient } from '@/lib/supabase/client';

interface Alert {
  id: string;
  accountId: string;
  accountHolder: string;
  pattern: string;
  riskScore: number;
  amount: string;
  jurisdiction: string;
  detectedAt: string;
  status: string;
  hops: number;
  assignedTo: string;
  dbId: string;
}

const patternFilters = ['All', 'Smurfing', 'Layering', 'Round-Trip', 'Shell Co.', 'Pass-Thru'];
const statusFilters = ['All', 'New', 'Under Review', 'Escalated', 'Closed'];

export default function AlertsPage() {
  const [patternFilter, setPatternFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortCol, setSortCol] = useState<keyof Alert>('riskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [sarModal, setSarModal] = useState<Alert | null>(null);
  const [sarGenerating, setSarGenerating] = useState(false);
  const [sarGenerated, setSarGenerated] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('Analyst');

  useEffect(() => {
    async function load() {
      const data = await getAlerts();
      setAlerts(data as Alert[]);
      setLoading(false);
    }
    load();

    // Get current user name for SAR officer field
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.full_name) {
        setCurrentUserName(user.user_metadata.full_name);
      }
    });

    const channel = supabase
      .channel('alerts_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setAlerts((prev) =>
            prev.map((a) => a.dbId === payload.new.id ? { ...a, status: payload.new.alert_status } : a)
          );
        } else {
          load();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = alerts
    .filter((a) => {
      const matchPattern = patternFilter === 'All' || a.pattern === patternFilter;
      const matchStatus = statusFilter === 'All' || a.status === statusFilter;
      const matchSearch =
        search === '' ||
        a.id.toLowerCase().includes(search.toLowerCase()) ||
        a.accountId.toLowerCase().includes(search.toLowerCase()) ||
        a.accountHolder.toLowerCase().includes(search.toLowerCase());
      return matchPattern && matchStatus && matchSearch;
    })
    .sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'desc' ? bv - av : av - bv;
      }
      return sortDir === 'desc'
        ? String(bv).localeCompare(String(av))
        : String(av).localeCompare(String(bv));
    });

  const handleSort = (col: keyof Alert) => {
    if (sortCol === col) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const handleResolve = async (alert: Alert) => {
    setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, status: 'Closed' } : a));
    await updateAlertStatus(alert.dbId, 'Closed');
  };

  const handleOpenSAR = (alert: Alert) => {
    setSarGenerated(false);
    setSarModal(alert);
  };

  const handleGenerateSAR = async () => {
    if (!sarModal) return;
    setSarGenerating(true);
    await createSARReport({
      caseRef: `CASE-${sarModal.id.split('-').pop()}`,
      subject: sarModal.accountHolder,
      accountId: sarModal.accountId,
      pattern: sarModal.pattern,
      riskScore: sarModal.riskScore,
      amount: sarModal.amount,
      officer: currentUserName,
    });
    setSarGenerating(false);
    setSarGenerated(true);
  };

  // Derived stat counts from live data
  const totalAlerts = alerts.length;
  const criticalCount = alerts.filter((a) => a.riskScore >= 86).length;
  const newCount = alerts.filter((a) => a.status === 'New').length;
  const escalatedCount = alerts.filter((a) => a.status === 'Escalated').length;

  const statCards = [
    { id: 'stat-total', label: 'Total Alerts', value: String(totalAlerts), sub: 'Active today', icon: Bell, color: 'text-primary' },
    { id: 'stat-critical', label: 'Critical (≥86)', value: String(criticalCount), sub: 'Requires immediate action', icon: AlertTriangle, color: 'text-risk-critical' },
    { id: 'stat-new', label: 'New Unreviewed', value: String(newCount), sub: 'Awaiting assignment', icon: Clock, color: 'text-amber-400' },
    { id: 'stat-escalated', label: 'Escalated', value: String(escalatedCount), sub: 'Senior review required', icon: TrendingUp, color: 'text-orange-400' },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={18} className="text-primary" />
            <h1 className="text-lg font-bold text-foreground tracking-tight">Alert Management</h1>
            <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">LIVE</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Real-time detection events from the GNN engine — sorted by risk score
          </p>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded">
          {loading ? 'Loading…' : `${alerts.length} alerts loaded`}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => {
          const StatIcon = s.icon;
          return (
            <div key={s.id} className="card-elevated p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
                <StatIcon size={14} className={s.color} />
              </div>
              <p className={`text-2xl font-bold font-mono ${s.color}`}>{loading ? '…' : s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Filters + Table */}
      <div className="card-elevated mb-4">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2 bg-muted rounded px-3 py-1.5 flex-1 min-w-[200px] max-w-xs">
            <Search size={12} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search alert ID, account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter size={11} className="text-muted-foreground mr-1" />
            {patternFilters.map((f) => (
              <button
                key={`pf-${f}`}
                onClick={() => setPatternFilter(f)}
                className={`text-[10px] font-semibold px-2 py-1 rounded transition-all duration-150 ${
                  patternFilter === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 border-l border-border pl-3">
            {statusFilters.map((f) => (
              <button
                key={`sf-${f}`}
                onClick={() => setStatusFilter(f)}
                className={`text-[10px] font-semibold px-2 py-1 rounded transition-all duration-150 ${
                  statusFilter === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
            {filtered.length} of {alerts.length} alerts
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {[
                    { key: 'id', label: 'Alert ID' },
                    { key: 'accountId', label: 'Account' },
                    { key: 'pattern', label: 'Pattern' },
                    { key: 'riskScore', label: 'Risk Score' },
                    { key: 'amount', label: 'Amount' },
                    { key: 'jurisdiction', label: 'Jurisdiction' },
                    { key: 'hops', label: 'Hops' },
                    { key: 'status', label: 'Status' },
                    { key: 'assignedTo', label: 'Assigned' },
                    { key: 'detectedAt', label: 'Detected' },
                  ].map((col) => (
                    <th
                      key={`th-${col.key}`}
                      className={`px-4 py-3 text-left font-semibold text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap ${
                        sortCol === col.key ? 'text-foreground' : ''
                      }`}
                      onClick={() => handleSort(col.key as keyof Alert)}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {sortCol === col.key && (
                          <ChevronDown size={10} className={sortDir === 'asc' ? 'rotate-180' : ''} />
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((alert) => {
                  const level = getRiskLevel(alert.riskScore);
                  const isClosed = alert.status === 'Closed';
                  return (
                    <tr
                      key={alert.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-100 group"
                    >
                      <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">{alert.id}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="font-mono text-foreground font-medium">{alert.accountId}</p>
                          <p className="text-muted-foreground text-[10px] truncate max-w-[140px]">{alert.accountHolder}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-medium text-foreground">{alert.pattern}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <RiskBadge level={level} score={alert.riskScore} size="sm" />
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground whitespace-nowrap">{alert.amount}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{alert.jurisdiction}</td>
                      <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                        {alert.hops > 0 ? alert.hops : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={alert.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[10px]">
                        {alert.assignedTo}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap text-[10px]">
                        {alert.detectedAt}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <Link
                            href="/case-investigation-detail"
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 inline-flex"
                            aria-label="Investigate"
                          >
                            <Eye size={13} />
                          </Link>
                          <button
                            onClick={() => handleOpenSAR(alert)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150"
                            aria-label="Generate SAR"
                          >
                            <FileText size={13} />
                          </button>
                          <button
                            onClick={() => !isClosed && handleResolve(alert)}
                            className={`p-1.5 rounded-md transition-all duration-150 ${
                              isClosed
                                ? 'text-risk-low cursor-default' :'hover:bg-muted text-muted-foreground hover:text-risk-low'
                            }`}
                            aria-label="Mark resolved"
                          >
                            <CheckCircle size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SAR Modal */}
      {sarModal && (
        <Modal isOpen={!!sarModal} onClose={() => setSarModal(null)} title={`Generate SAR — ${sarModal.id}`}>
          <div className="space-y-4">
            {!sarGenerated ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Generate a SAR for{' '}
                  <span className="text-foreground font-semibold">{sarModal.accountHolder}</span> — Risk{' '}
                  <span className="text-risk-critical font-mono font-bold">{sarModal.riskScore}</span>
                </p>
                <button
                  onClick={handleGenerateSAR}
                  disabled={sarGenerating}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white text-xs font-semibold py-2.5 rounded-md hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {sarGenerating ? (
                    <><Loader2 size={13} className="animate-spin" /> Generating…</>
                  ) : (
                    'Generate SAR Report'
                  )}
                </button>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={20} className="text-green-400" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">SAR Generated</p>
                <p className="text-xs text-muted-foreground mb-4">Report queued for review</p>
                <Link href="/sar-reports" onClick={() => setSarModal(null)} className="text-xs text-primary hover:underline font-medium">
                  View SAR Reports →
                </Link>
              </div>
            )}
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}

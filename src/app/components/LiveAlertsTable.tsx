'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import RiskBadge, { getRiskLevel } from '@/components/ui/RiskBadge';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import { Eye, FileText, CheckCircle, Filter, ChevronDown, Loader2 } from 'lucide-react';
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
  dbId: string;
}

const patternFilters = ['All', 'Smurfing', 'Layering', 'Round-Trip', 'Shell Co.', 'Pass-Thru'];

export default function LiveAlertsTable() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortCol, setSortCol] = useState<keyof Alert>('riskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [sarModalAlert, setSarModalAlert] = useState<Alert | null>(null);
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
      .channel('live_alerts_table')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const a = payload.new as any;
          setAlerts((prev) => [{
            id: a.alert_id, accountId: a.account_id, accountHolder: a.account_holder,
            pattern: a.pattern, riskScore: a.risk_score, amount: a.amount,
            jurisdiction: a.jurisdiction, detectedAt: new Date(a.detected_at).toLocaleString('en-IN'),
            status: a.alert_status, hops: a.hops, dbId: a.id,
          }, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setAlerts((prev) =>
            prev.map((al) => al.dbId === payload.new.id ? { ...al, status: payload.new.alert_status } : al)
          );
        } else if (payload.eventType === 'DELETE') {
          setAlerts((prev) => prev.filter((al) => al.dbId !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = alerts
    .filter((a) => activeFilter === 'All' || a.pattern === activeFilter)
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

  const handleMarkReviewed = async (alert: Alert) => {
    setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, status: 'Reviewed' } : a));
    await updateAlertStatus(alert.dbId, 'Reviewed');
  };

  const handleOpenSARModal = (alert: Alert) => {
    setSarGenerated(false);
    setSarModalAlert(alert);
  };

  const handleGenerateSAR = async () => {
    if (!sarModalAlert) return;
    setSarGenerating(true);
    await createSARReport({
      caseRef: `CASE-${sarModalAlert.id.split('-').pop()}`,
      subject: sarModalAlert.accountHolder,
      accountId: sarModalAlert.accountId,
      pattern: sarModalAlert.pattern,
      riskScore: sarModalAlert.riskScore,
      amount: sarModalAlert.amount,
      officer: currentUserName,
    });
    setSarGenerating(false);
    setSarGenerated(true);
  };

  return (
    <div className="card-elevated">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">Live Alert Queue</h2>
          <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {loading ? '…' : `${filtered.length} alerts`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-muted-foreground" />
          <div className="flex items-center gap-1">
            {patternFilters.map((f) => (
              <button
                key={`filter-${f}`}
                onClick={() => setActiveFilter(f)}
                className={`text-[10px] font-semibold px-2 py-1 rounded transition-all duration-150 ${
                  activeFilter === f
                    ? 'bg-primary/10 text-primary' :'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
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
                const isReviewed = alert.status === 'Reviewed';
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
                    <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap text-[10px]">
                      {alert.detectedAt}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <div className="relative group/tooltip">
                          <Link
                            href="/case-investigation-detail"
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 inline-flex"
                            aria-label="View case details"
                          >
                            <Eye size={13} />
                          </Link>
                          <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-card border border-border rounded text-[10px] text-foreground whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                            View Investigation
                          </div>
                        </div>
                        <div className="relative group/tooltip">
                          <button
                            onClick={() => handleOpenSARModal(alert)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150"
                            aria-label="Generate SAR"
                          >
                            <FileText size={13} />
                          </button>
                          <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-card border border-border rounded text-[10px] text-foreground whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                            Generate SAR
                          </div>
                        </div>
                        <div className="relative group/tooltip">
                          <button
                            onClick={() => !isReviewed && handleMarkReviewed(alert)}
                            className={`p-1.5 rounded-md transition-all duration-150 ${
                              isReviewed
                                ? 'text-risk-low cursor-default' :'hover:bg-muted text-muted-foreground hover:text-risk-low'
                            }`}
                            aria-label="Mark as reviewed"
                          >
                            <CheckCircle size={13} />
                          </button>
                          <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-card border border-border rounded text-[10px] text-foreground whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                            {isReviewed ? 'Reviewed' : 'Mark Reviewed'}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border">
        <p className="text-[11px] text-muted-foreground font-mono">
          Showing {filtered.length} of {alerts.length} alerts
        </p>
        <div className="flex items-center gap-1">
          <button className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Prev
          </button>
          <button className="text-[10px] px-2 py-1 rounded border border-border bg-primary/10 text-primary font-semibold">
            1
          </button>
          <button className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Next
          </button>
        </div>
      </div>

      {/* SAR Modal */}
      {sarModalAlert && (
        <Modal
          isOpen={!!sarModalAlert}
          onClose={() => setSarModalAlert(null)}
          title={`Generate SAR — ${sarModalAlert.id}`}
        >
          <div className="space-y-4">
            {!sarGenerated ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Generate a Suspicious Activity Report for{' '}
                  <span className="text-foreground font-semibold">{sarModalAlert.accountHolder}</span>{' '}
                  ({sarModalAlert.accountId}) — Risk Score{' '}
                  <span className="text-risk-critical font-mono font-bold">{sarModalAlert.riskScore}</span>
                </p>
                <button
                  onClick={handleGenerateSAR}
                  disabled={sarGenerating}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white text-xs font-semibold py-2.5 rounded-md hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {sarGenerating ? (
                    <><Loader2 size={13} className="animate-spin" /> Generating SAR…</>
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
                <p className="text-xs text-muted-foreground mb-4">
                  Report queued for review in the SAR Reports module
                </p>
                <Link
                  href="/sar-reports"
                  onClick={() => setSarModalAlert(null)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  View SAR Reports →
                </Link>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
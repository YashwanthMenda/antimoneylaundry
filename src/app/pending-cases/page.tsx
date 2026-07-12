'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList, CheckCircle, Send, Loader2, Clock, AlertTriangle, User, DollarSign, FileText, RefreshCw, XCircle, RotateCcw, ChevronDown, ChevronUp,  } from 'lucide-react';
import { getPendingCaseReports, acknowledgeCaseReport, getPendingSARsForOfficer, officerActionSAR } from '@/lib/services/amlService';
import { createClient } from '@/lib/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';

interface PendingCase {
  id: string;
  reportRef: string;
  accountId: string;
  accountHolder: string;
  accountType: string;
  bankName: string;
  activityType: string;
  activityDescription: string;
  transactionAmount: string;
  transactionDate: string | null;
  riskLevel: string;
  jurisdiction: string;
  evidenceNotes: string | null;
  reportStatus: string;
  submittedByName: string;
  createdAt: string;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  dbId: string;
}

interface PendingSAR {
  id: string;
  caseRef: string;
  subject: string;
  accountId: string;
  pattern: string;
  riskScore: number;
  amount: string;
  generatedAt: string;
  sentAt: string | null;
  sentByName: string;
  status: string;
  officer: string;
  fiuRef?: string;
  officerNotes: string | null;
  dbId: string;
}

const riskColors: Record<string, string> = {
  Low: 'bg-green-500/10 text-green-400 border border-green-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  High: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  Critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const caseStatusColors: Record<string, string> = {
  Submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Acknowledged: 'bg-primary/10 text-primary border border-primary/20',
  Closed: 'bg-green-500/10 text-green-400 border border-green-500/20',
};

type ActiveTab = 'cases' | 'sars';

export default function PendingCasesPage() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const [cases, setCases] = useState<PendingCase[]>([]);
  const [sars, setSARs] = useState<PendingSAR[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('sars');
  const [sarNotes, setSarNotes] = useState<Record<string, string>>({});

  const userRole = (user as any)?.user_metadata?.role ?? (user as any)?.role ?? '';
  const officerName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Officer';

  async function load() {
    setLoading(true);
    const [caseData, sarData] = await Promise.all([
      getPendingCaseReports(),
      getPendingSARsForOfficer(),
    ]);
    setCases(caseData as PendingCase[]);
    setSARs(sarData as PendingSAR[]);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const supabase = createClient();
    const channel = supabase
      .channel('pending_review_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'case_reports' }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sar_reports' }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Case actions
  async function handleAcknowledge(c: PendingCase) {
    setActionLoading(c.dbId + '_ack');
    const ok = await acknowledgeCaseReport(c.dbId, user?.id ?? '', officerName, 'Acknowledged');
    if (ok) {
      setSuccessId(c.dbId + '_ack');
      setTimeout(() => setSuccessId(null), 2000);
      await load();
    }
    setActionLoading(null);
  }

  async function handleSubmitCase(c: PendingCase) {
    setActionLoading(c.dbId + '_sub');
    const ok = await acknowledgeCaseReport(c.dbId, user?.id ?? '', officerName, 'Closed');
    if (ok) {
      setSuccessId(c.dbId + '_sub');
      setTimeout(() => setSuccessId(null), 2000);
      await load();
    }
    setActionLoading(null);
  }

  // SAR actions
  async function handleSARAction(sar: PendingSAR, action: 'approve' | 'reject' | 'request_changes') {
    const key = sar.dbId + '_' + action;
    setActionLoading(key);
    const notes = sarNotes[sar.dbId] || '';
    await officerActionSAR(sar.dbId, action, officerName, notes);
    setSuccessId(key);
    setTimeout(() => setSuccessId(null), 2000);
    await load();
    setActionLoading(null);
  }

  const pendingCasesCount = cases.filter((c) => c.reportStatus === 'Submitted').length;
  const acknowledgedCount = cases.filter((c) => c.reportStatus === 'Acknowledged').length;
  const pendingSARsCount = sars.length;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <ClipboardList size={20} className="text-primary" />
              Officer Review Queue
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cases and SAR reports submitted by analysts awaiting your review
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="card-elevated px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">SAR Pending Review</p>
            <p className="text-2xl font-bold font-mono text-blue-400">{pendingSARsCount}</p>
          </div>
          <div className="card-elevated px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Cases Awaiting</p>
            <p className="text-2xl font-bold font-mono text-amber-400">{pendingCasesCount}</p>
          </div>
          <div className="card-elevated px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Cases Acknowledged</p>
            <p className="text-2xl font-bold font-mono text-primary">{acknowledgedCount}</p>
          </div>
          <div className="card-elevated px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Items</p>
            <p className="text-2xl font-bold font-mono text-foreground">{cases.length + sars.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-muted/40 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('sars')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'sars' ?'bg-card text-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText size={13} />
            SAR Reports
            {pendingSARsCount > 0 && (
              <span className="bg-blue-500/20 text-blue-400 text-[10px] font-mono px-1.5 py-0.5 rounded-full">
                {pendingSARsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('cases')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'cases' ?'bg-card text-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardList size={13} />
            Filed Cases
            {pendingCasesCount > 0 && (
              <span className="bg-amber-500/20 text-amber-400 text-[10px] font-mono px-1.5 py-0.5 rounded-full">
                {pendingCasesCount}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* SAR Reports Tab */}
            {activeTab === 'sars' && (
              <div className="space-y-3">
                {sars.length === 0 ? (
                  <div className="card-elevated flex flex-col items-center justify-center py-16 text-center">
                    <FileText size={32} className="text-muted-foreground mb-3 opacity-40" />
                    <p className="text-sm font-medium text-foreground mb-1">No SAR reports pending review</p>
                    <p className="text-xs text-muted-foreground">
                      SAR reports sent by analysts will appear here for your review
                    </p>
                  </div>
                ) : (
                  sars.map((sar) => {
                    const isExpanded = expandedId === 'sar_' + sar.dbId;
                    return (
                      <div key={sar.dbId} className="card-elevated overflow-hidden">
                        {/* SAR Header */}
                        <div
                          className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : 'sar_' + sar.dbId)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[11px] font-mono text-muted-foreground">{sar.id}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Pending Review
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {sar.pattern}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">{sar.subject}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <User size={9} />
                                Sent by {sar.sentByName}
                              </span>
                              {sar.sentAt && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Clock size={9} />
                                  {sar.sentAt}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <DollarSign size={9} />
                                {sar.amount}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <AlertTriangle size={9} />
                                Risk: {sar.riskScore}/100
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 text-muted-foreground">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </div>

                        {/* Expanded SAR Detail + Actions */}
                        {isExpanded && (
                          <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/10">
                            {/* Full SAR Details */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                              <div className="bg-muted/50 rounded-lg p-2.5">
                                <p className="text-muted-foreground mb-0.5">Case Reference</p>
                                <p className="font-mono text-foreground font-semibold">{sar.caseRef}</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-2.5">
                                <p className="text-muted-foreground mb-0.5">Account ID</p>
                                <p className="font-mono text-foreground font-semibold">{sar.accountId}</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-2.5">
                                <p className="text-muted-foreground mb-0.5">Pattern</p>
                                <p className="text-foreground font-semibold">{sar.pattern}</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-2.5">
                                <p className="text-muted-foreground mb-0.5">Risk Score</p>
                                <p className="font-mono text-foreground font-semibold">{sar.riskScore}/100</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-2.5">
                                <p className="text-muted-foreground mb-0.5">Amount</p>
                                <p className="font-mono text-foreground font-semibold">{sar.amount}</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-2.5">
                                <p className="text-muted-foreground mb-0.5">Generated</p>
                                <p className="font-mono text-foreground font-semibold">{sar.generatedAt}</p>
                              </div>
                            </div>

                            {/* Officer Notes Input */}
                            <div>
                              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                                Officer Notes
                              </label>
                              <textarea
                                value={sarNotes[sar.dbId] || ''}
                                onChange={(e) => setSarNotes((prev) => ({ ...prev, [sar.dbId]: e.target.value }))}
                                placeholder="Add notes for the analyst (required for reject / request changes)..."
                                rows={2}
                                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 resize-none"
                              />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => handleSARAction(sar, 'approve')}
                                disabled={!!actionLoading}
                                className="flex items-center gap-1.5 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-semibold hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                              >
                                {actionLoading === sar.dbId + '_approve' ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : successId === sar.dbId + '_approve' ? (
                                  <CheckCircle size={12} />
                                ) : (
                                  <CheckCircle size={12} />
                                )}
                                Approve SAR
                              </button>
                              <button
                                onClick={() => handleSARAction(sar, 'request_changes')}
                                disabled={!!actionLoading}
                                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-semibold hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
                              >
                                {actionLoading === sar.dbId + '_request_changes' ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <RotateCcw size={12} />
                                )}
                                Request Changes
                              </button>
                              <button
                                onClick={() => handleSARAction(sar, 'reject')}
                                disabled={!!actionLoading}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                              >
                                {actionLoading === sar.dbId + '_reject' ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <XCircle size={12} />
                                )}
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Filed Cases Tab */}
            {activeTab === 'cases' && (
              <div className="space-y-3">
                {cases.length === 0 ? (
                  <div className="card-elevated flex flex-col items-center justify-center py-16 text-center">
                    <ClipboardList size={32} className="text-muted-foreground mb-3 opacity-40" />
                    <p className="text-sm font-medium text-foreground mb-1">No pending cases</p>
                    <p className="text-xs text-muted-foreground">
                      Cases filed by analysts will appear here for review
                    </p>
                  </div>
                ) : (
                  cases.map((c) => {
                    const isExpanded = expandedId === c.dbId;
                    const isPending = c.reportStatus === 'Submitted';
                    const isAcknowledged = c.reportStatus === 'Acknowledged';
                    const isClosed = c.reportStatus === 'Closed';

                    return (
                      <div key={c.dbId} className="card-elevated overflow-hidden transition-all duration-200">
                        <div
                          className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : c.dbId)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[11px] font-mono text-muted-foreground">{c.reportRef}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${caseStatusColors[c.reportStatus] ?? 'bg-muted text-muted-foreground'}`}>
                                {c.reportStatus}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${riskColors[c.riskLevel] ?? 'bg-muted text-muted-foreground'}`}>
                                {c.riskLevel} Risk
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">{c.accountHolder}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <User size={9} />
                                {c.submittedByName}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock size={9} />
                                {c.createdAt}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <AlertTriangle size={9} />
                                {c.activityType}
                              </span>
                            </div>
                          </div>

                          {!isClosed && (
                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {isPending && (
                                <button
                                  onClick={() => handleAcknowledge(c)}
                                  disabled={actionLoading === c.dbId + '_ack'}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-medium hover:bg-primary/20 disabled:opacity-50 transition-colors"
                                >
                                  {actionLoading === c.dbId + '_ack' ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                                  Acknowledge
                                </button>
                              )}
                              {isAcknowledged && (
                                <button
                                  onClick={() => handleSubmitCase(c)}
                                  disabled={actionLoading === c.dbId + '_sub'}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-medium hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                                >
                                  {actionLoading === c.dbId + '_sub' ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                  Submit
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="border-t border-border px-4 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] bg-muted/10">
                            <div className="bg-muted/50 rounded-lg p-2.5">
                              <p className="text-muted-foreground mb-0.5">Account ID</p>
                              <p className="font-mono text-foreground font-semibold">{c.accountId}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2.5">
                              <p className="text-muted-foreground mb-0.5">Account Type</p>
                              <p className="text-foreground font-semibold">{c.accountType}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2.5">
                              <p className="text-muted-foreground mb-0.5">Bank</p>
                              <p className="text-foreground font-semibold">{c.bankName}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2.5">
                              <p className="text-muted-foreground mb-0.5">Amount</p>
                              <p className="font-mono text-foreground font-semibold">{c.transactionAmount}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2.5">
                              <p className="text-muted-foreground mb-0.5">Jurisdiction</p>
                              <p className="text-foreground font-semibold">{c.jurisdiction}</p>
                            </div>
                            {c.acknowledgedByName && (
                              <div className="bg-muted/50 rounded-lg p-2.5">
                                <p className="text-muted-foreground mb-0.5">Acknowledged By</p>
                                <p className="text-foreground font-semibold">{c.acknowledgedByName}</p>
                              </div>
                            )}
                            {c.activityDescription && (
                              <div className="col-span-2 sm:col-span-3 bg-muted/50 rounded-lg p-2.5">
                                <p className="text-muted-foreground mb-0.5">Activity Description</p>
                                <p className="text-foreground">{c.activityDescription}</p>
                              </div>
                            )}
                            {c.evidenceNotes && (
                              <div className="col-span-2 sm:col-span-3 bg-muted/50 rounded-lg p-2.5">
                                <p className="text-muted-foreground mb-0.5">Evidence Notes</p>
                                <p className="text-foreground">{c.evidenceNotes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

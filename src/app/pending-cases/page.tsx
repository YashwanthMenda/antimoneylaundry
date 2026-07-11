'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  ClipboardList, CheckCircle, Send, Loader2, Clock, AlertTriangle,
  User, Building2, DollarSign, MapPin, FileText, RefreshCw,
} from 'lucide-react';
import { getPendingCaseReports, acknowledgeCaseReport } from '@/lib/services/amlService';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


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

const riskColors: Record<string, string> = {
  Low: 'bg-green-500/10 text-green-400 border border-green-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  High: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  Critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const statusColors: Record<string, string> = {
  Submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Acknowledged: 'bg-primary/10 text-primary border border-primary/20',
  Closed: 'bg-green-500/10 text-green-400 border border-green-500/20',
};

export default function PendingCasesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<PendingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const userRole = (user as any)?.user_metadata?.role ?? (user as any)?.role ?? '';
  const isOfficer = userRole === 'senior_officer' || userRole === 'admin';
  const officerName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Officer';

  async function load() {
    setLoading(true);
    const data = await getPendingCaseReports();
    setCases(data as PendingCase[]);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const supabase = createClient();
    const channel = supabase
      .channel('pending_cases_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'case_reports' },
        () => { load(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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

  async function handleSubmit(c: PendingCase) {
    setActionLoading(c.dbId + '_sub');
    const ok = await acknowledgeCaseReport(c.dbId, user?.id ?? '', officerName, 'Closed');
    if (ok) {
      setSuccessId(c.dbId + '_sub');
      setTimeout(() => setSuccessId(null), 2000);
      await load();
    }
    setActionLoading(null);
  }

  const pendingCount = cases.filter((c) => c.reportStatus === 'Submitted').length;
  const acknowledgedCount = cases.filter((c) => c.reportStatus === 'Acknowledged').length;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <ClipboardList size={20} className="text-primary" />
              Pending Cases Review
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cases filed by analysts awaiting officer acknowledgement and submission
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="card-elevated px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Awaiting Review</p>
            <p className="text-2xl font-bold font-mono text-amber-400">{pendingCount}</p>
          </div>
          <div className="card-elevated px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Acknowledged</p>
            <p className="text-2xl font-bold font-mono text-primary">{acknowledgedCount}</p>
          </div>
          <div className="card-elevated px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Filed</p>
            <p className="text-2xl font-bold font-mono text-foreground">{cases.length}</p>
          </div>
        </div>

        {/* Cases List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : cases.length === 0 ? (
          <div className="card-elevated flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList size={32} className="text-muted-foreground mb-3 opacity-40" />
            <p className="text-sm font-medium text-foreground mb-1">No pending cases</p>
            <p className="text-xs text-muted-foreground">
              Cases filed by analysts will appear here for review
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => {
              const isExpanded = expandedId === c.dbId;
              const isPending = c.reportStatus === 'Submitted';
              const isAcknowledged = c.reportStatus === 'Acknowledged';
              const isClosed = c.reportStatus === 'Closed';

              return (
                <div
                  key={c.dbId}
                  className="card-elevated overflow-hidden transition-all duration-200"
                >
                  {/* Case Header Row */}
                  <div
                    className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : c.dbId)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[11px] font-mono text-muted-foreground">{c.reportRef}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            statusColors[c.reportStatus] ?? 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {c.reportStatus}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            riskColors[c.riskLevel] ?? 'bg-muted text-muted-foreground'
                          }`}
                        >
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

                    {/* Action Buttons */}
                    {!isClosed && (
                      <div
                        className="flex items-center gap-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isPending && (
                          <button
                            onClick={() => handleAcknowledge(c)}
                            disabled={actionLoading === c.dbId + '_ack'}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-medium hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {actionLoading === c.dbId + '_ack' ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : successId === c.dbId + '_ack' ? (
                              <CheckCircle size={11} />
                            ) : (
                              <CheckCircle size={11} />
                            )}
                            Acknowledge
                          </button>
                        )}
                        {isAcknowledged && (
                          <button
                            onClick={() => handleSubmit(c)}
                            disabled={actionLoading === c.dbId + '_sub'}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-medium hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {actionLoading === c.dbId + '_sub' ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Send size={11} />
                            )}
                            Submit
                          </button>
                        )}
                      </div>
                    )}
                    {isClosed && (
                      <span className="flex items-center gap-1 text-[10px] text-green-400 shrink-0">
                        <CheckCircle size={12} />
                        Completed
                      </span>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-4 bg-muted/10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <DetailRow icon={Building2} label="Bank" value={`${c.bankName} · ${c.accountType}`} />
                        <DetailRow icon={FileText} label="Account ID" value={c.accountId} />
                        <DetailRow icon={DollarSign} label="Amount" value={c.transactionAmount} />
                        <DetailRow icon={MapPin} label="Jurisdiction" value={c.jurisdiction} />
                        {c.transactionDate && (
                          <DetailRow icon={Clock} label="Transaction Date" value={c.transactionDate} />
                        )}
                        {c.acknowledgedByName && (
                          <DetailRow icon={User} label="Acknowledged By" value={`${c.acknowledgedByName}${c.acknowledgedAt ? ` · ${c.acknowledgedAt}` : ''}`} />
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Activity Description</p>
                          <p className="text-xs text-foreground leading-relaxed bg-muted/30 rounded-lg px-3 py-2.5">
                            {c.activityDescription}
                          </p>
                        </div>
                        {c.evidenceNotes && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Evidence Notes</p>
                            <p className="text-xs text-foreground leading-relaxed bg-muted/30 rounded-lg px-3 py-2.5">
                              {c.evidenceNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={12} className="text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';

import {
  ClipboardCheck, Download, Search, Filter, ChevronDown,
  CheckCircle, XCircle, Clock, Send, ShieldCheck, Loader2,
  AlertTriangle, FileText, RotateCcw, Eye,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface AuditEntry {
  id: string;
  caseRef: string;
  subject: string;
  accountId: string;
  pattern: string;
  riskScore: number;
  amount: string;
  generatedAt: string;
  status: string;
  officer: string;
  fiuRef?: string;
  dbId: string;
  // officer workflow fields
  sentByName?: string;
  sentAt?: string;
  officerAction?: string;
  officerActionedBy?: string;
  officerActionedAt?: string;
  officerNotes?: string;
}

const statusColors: Record<string, string> = {
  Draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  'Pending Review': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Submitted: 'bg-primary/10 text-primary border border-primary/20',
  Acknowledged: 'bg-green-500/10 text-green-400 border border-green-500/20',
  Rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const actionIcons: Record<string, React.ReactNode> = {
  approve: <CheckCircle size={11} className="text-green-400" />,
  reject: <XCircle size={11} className="text-red-400" />,
  request_changes: <RotateCcw size={11} className="text-amber-400" />,
};

const actionLabels: Record<string, string> = {
  approve: 'Approved',
  reject: 'Rejected',
  request_changes: 'Changes Requested',
};

function exportAuditPDF(entry: AuditEntry) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  const timeline: string[] = [];
  timeline.push(`<tr><td class="ts">${entry.generatedAt}</td><td class="act">SAR Generated</td><td class="by">System</td><td class="note">—</td></tr>`);
  if (entry.sentAt && entry.sentByName) {
    timeline.push(`<tr><td class="ts">${entry.sentAt}</td><td class="act">Sent to Officer</td><td class="by">${entry.sentByName}</td><td class="note">Forwarded for review</td></tr>`);
  }
  if (entry.officerActionedAt && entry.officerActionedBy) {
    const label = entry.officerAction ? (actionLabels[entry.officerAction] ?? entry.officerAction) : 'Actioned';
    timeline.push(`<tr><td class="ts">${entry.officerActionedAt}</td><td class="act">${label}</td><td class="by">${entry.officerActionedBy}</td><td class="note">${entry.officerNotes ?? '—'}</td></tr>`);
  }
  if (entry.fiuRef) {
    timeline.push(`<tr><td class="ts">${entry.officerActionedAt ?? entry.generatedAt}</td><td class="act">Submitted to FIU-IND</td><td class="by">System</td><td class="note">${entry.fiuRef}</td></tr>`);
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Audit Trail — ${entry.id}</title>
  <style>
    body{font-family:'Courier New',monospace;font-size:11px;color:#111;padding:32px 40px;}
    h1{font-size:14px;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:16px;}
    h2{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#555;margin:20px 0 8px;}
    .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
    .label{color:#888;font-size:9px;text-transform:uppercase;margin-bottom:2px;}
    .value{font-size:11px;font-weight:700;}
    table{width:100%;border-collapse:collapse;font-size:10px;}
    th{text-align:left;padding:6px 8px;background:#f0f0f0;font-size:9px;text-transform:uppercase;letter-spacing:1px;}
    td{padding:6px 8px;border-bottom:1px solid #e0e0e0;}
    td.ts{color:#555;white-space:nowrap;}
    td.act{font-weight:700;}
    .badge{display:inline-block;padding:2px 8px;border:1px solid #c00;color:#c00;font-size:9px;font-weight:700;margin-top:16px;}
    .fiu{background:#f0fff0;border:1px solid #090;padding:8px 12px;margin-top:12px;font-size:10px;}
    @media print{@page{margin:12mm;size:A4;}}
  </style></head>
  <body>
    <h1>COMPLIANCE AUDIT TRAIL — ${entry.id}</h1>
    <div class="meta">
      <div><div class="label">Case Reference</div><div class="value">${entry.caseRef}</div></div>
      <div><div class="label">Subject</div><div class="value">${entry.subject}</div></div>
      <div><div class="label">Account ID</div><div class="value">${entry.accountId}</div></div>
      <div><div class="label">Pattern</div><div class="value">${entry.pattern}</div></div>
      <div><div class="label">Risk Score</div><div class="value">${entry.riskScore}/100</div></div>
      <div><div class="label">Amount</div><div class="value">${entry.amount}</div></div>
      <div><div class="label">Status</div><div class="value">${entry.status}</div></div>
      <div><div class="label">Officer</div><div class="value">${entry.officer}</div></div>
      ${entry.fiuRef ? `<div><div class="label">FIU Reference</div><div class="value">${entry.fiuRef}</div></div>` : ''}
    </div>
    <h2>Action Timeline</h2>
    <table>
      <thead><tr><th>Timestamp</th><th>Action</th><th>By</th><th>Notes / Reference</th></tr></thead>
      <tbody>${timeline.join('')}</tbody>
    </table>
    ${entry.fiuRef ? `<div class="fiu">✓ FIU-IND Submission Reference: <strong>${entry.fiuRef}</strong></div>` : ''}
    <div class="badge">CONFIDENTIAL — COMPLIANCE RECORD — FIU-IND USE ONLY</div>
    <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
  </body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}

const ALL_STATUSES = ['All', 'Draft', 'Pending Review', 'Submitted', 'Acknowledged', 'Rejected'];

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortCol, setSortCol] = useState<keyof AuditEntry>('generatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('sar_reports')
        .select('*')
        .order('generated_at', { ascending: false });

      if (!error && data) {
        const mapped: AuditEntry[] = data.map((r) => ({
          id: r.sar_id,
          caseRef: r.case_ref,
          subject: r.subject,
          accountId: r.account_id,
          pattern: r.pattern,
          riskScore: r.risk_score,
          amount: r.amount,
          generatedAt: new Date(r.generated_at ?? r.created_at).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false,
          }),
          status: r.sar_status,
          officer: r.officer ?? '—',
          fiuRef: r.fiu_ref ?? undefined,
          dbId: r.id,
          sentByName: r.sent_by_name ?? undefined,
          sentAt: r.sent_to_officer_at
            ? new Date(r.sent_to_officer_at).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false,
              })
            : undefined,
          officerAction: r.officer_action ?? undefined,
          officerActionedBy: r.officer_actioned_by ?? undefined,
          officerActionedAt: r.officer_actioned_at
            ? new Date(r.officer_actioned_at).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false,
              })
            : undefined,
          officerNotes: r.officer_notes ?? undefined,
        }));
        setEntries(mapped);
      }
      setLoading(false);
    }

    load();

    const supabase = createClient();
    const channel = supabase
      .channel('audit_trail_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sar_reports' }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = entries
    .filter((e) => {
      const matchStatus = statusFilter === 'All' || e.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.id.toLowerCase().includes(q) ||
        e.caseRef.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        (e.fiuRef ?? '').toLowerCase().includes(q) ||
        (e.officerActionedBy ?? '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    })
    .sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'desc' ? bv - av : av - bv;
      }
      return sortDir === 'desc' ? String(bv ??'').localeCompare(String(av ?? ''))
        : String(av ?? '').localeCompare(String(bv ?? ''));
    });

  const handleSort = (col: keyof AuditEntry) => {
    if (sortCol === col) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const handleDownload = (entry: AuditEntry) => {
    setDownloadingId(entry.id);
    setTimeout(() => { exportAuditPDF(entry); setDownloadingId(null); }, 600);
  };

  // Stats
  const total = entries.length;
  const submitted = entries.filter((e) => e.status === 'Submitted' || e.status === 'Acknowledged').length;
  const pending = entries.filter((e) => e.status === 'Pending Review').length;
  const rejected = entries.filter((e) => e.status === 'Rejected').length;
  const withFIU = entries.filter((e) => !!e.fiuRef).length;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck size={18} className="text-primary" />
            <h1 className="text-lg font-bold text-foreground tracking-tight">Compliance Audit Trail</h1>
            <span className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              SAR Records
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Complete record of all filed SARs — FIU submission status, officer actions, and timestamps
          </p>
        </div>
        <Link
          href="/sar-reports"
          className="flex items-center gap-2 bg-muted text-foreground text-xs font-semibold px-4 py-2 rounded-md hover:bg-muted/80 transition-colors border border-border"
        >
          <FileText size={13} />
          SAR Reports
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total SARs Filed', value: total, sub: 'All time', color: 'text-primary' },
          { label: 'FIU Submitted', value: submitted, sub: 'Submitted or acknowledged', color: 'text-green-400' },
          { label: 'Pending Officer', value: pending, sub: 'Awaiting review', color: 'text-blue-400' },
          { label: 'FIU References', value: withFIU, sub: 'With FIU-IND ref no.', color: 'text-primary' },
        ].map((s, i) => (
          <div key={`stat-${i}`} className="card-elevated p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{s.label}</p>
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{loading ? '…' : s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* FATF notice */}
      <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-6">
        <AlertTriangle size={14} className="text-primary mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          <span className="text-foreground font-semibold">FATF Recommendation 20 — </span>
          This audit trail serves as the official compliance record for all SAR filings. Each entry includes the full action timeline, officer decisions, and FIU-IND submission references.
        </p>
      </div>

      {/* Table */}
      <div className="card-elevated">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2 bg-muted rounded px-3 py-1.5 flex-1 min-w-[200px] max-w-xs">
            <Search size={12} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search SAR ID, case, subject, FIU ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Filter size={11} className="text-muted-foreground mr-1" />
            {ALL_STATUSES.map((f) => (
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
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">{filtered.length} records</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardCheck size={32} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No audit records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {[
                    { key: 'id', label: 'SAR ID' },
                    { key: 'caseRef', label: 'Case Ref' },
                    { key: 'subject', label: 'Subject / Account' },
                    { key: 'status', label: 'FIU Status' },
                    { key: 'fiuRef', label: 'FIU Reference' },
                    { key: 'generatedAt', label: 'Filed At' },
                    { key: 'sentByName', label: 'Submitted By' },
                    { key: 'officerAction', label: 'Officer Action' },
                    { key: 'officerActionedAt', label: 'Actioned At' },
                  ].map((col) => (
                    <th
                      key={`th-${col.key}`}
                      onClick={() => handleSort(col.key as keyof AuditEntry)}
                      className={`px-4 py-3 text-left font-semibold text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap ${
                        sortCol === col.key ? 'text-foreground' : ''
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {sortCol === col.key && (
                          <ChevronDown size={10} className={sortDir === 'asc' ? 'rotate-180' : ''} />
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const isExpanded = expandedId === entry.id;
                  return (
                    <React.Fragment key={entry.id}>
                      <tr
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-100 group cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        {/* SAR ID */}
                        <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap text-[11px]">
                          {entry.id}
                        </td>
                        {/* Case Ref */}
                        <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap text-[11px]">
                          {entry.caseRef}
                        </td>
                        {/* Subject */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-xs font-medium text-foreground truncate max-w-[140px]">{entry.subject}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{entry.accountId}</p>
                        </td>
                        {/* FIU Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[entry.status] ?? ''}`}>
                            {entry.status}
                          </span>
                        </td>
                        {/* FIU Reference */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {entry.fiuRef ? (
                            <span className="font-mono text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                              {entry.fiuRef}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                        {/* Filed At */}
                        <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap text-[10px]">
                          {entry.generatedAt}
                        </td>
                        {/* Submitted By */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {entry.sentByName ? (
                            <div className="flex items-center gap-1.5">
                              <Send size={10} className="text-blue-400 shrink-0" />
                              <span className="text-[11px] text-foreground">{entry.sentByName}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                        {/* Officer Action */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {entry.officerAction ? (
                            <div className="flex items-center gap-1.5">
                              {actionIcons[entry.officerAction] ?? <Clock size={11} className="text-muted-foreground" />}
                              <span className="text-[11px] text-foreground">
                                {actionLabels[entry.officerAction] ?? entry.officerAction}
                              </span>
                            </div>
                          ) : entry.status === 'Pending Review' ? (
                            <div className="flex items-center gap-1.5">
                              <Clock size={10} className="text-blue-400" />
                              <span className="text-[11px] text-blue-400">Awaiting</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                        {/* Actioned At */}
                        <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap text-[10px]">
                          {entry.officerActionedAt ?? <span className="text-muted-foreground/50">—</span>}
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div
                            className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href="/case-investigation-detail"
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 inline-flex"
                              title="View case"
                            >
                              <Eye size={13} />
                            </Link>
                            <button
                              onClick={() => handleDownload(entry)}
                              disabled={downloadingId === entry.id}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-semibold transition-all duration-150 disabled:opacity-50"
                              title="Download compliance PDF"
                            >
                              {downloadingId === entry.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <Download size={11} />
                              )}
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded timeline row */}
                      {isExpanded && (
                        <tr className="border-b border-border/50 bg-muted/20">
                          <td colSpan={10} className="px-6 py-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                              Action Timeline — {entry.id}
                            </p>
                            <div className="flex flex-col gap-0">
                              {/* Step 1: Generated */}
                              <TimelineStep
                                icon={<FileText size={12} className="text-muted-foreground" />}
                                label="SAR Generated"
                                by="System"
                                at={entry.generatedAt}
                                note={`Pattern: ${entry.pattern} · Risk: ${entry.riskScore}/100 · ${entry.amount}`}
                                isLast={!entry.sentAt && !entry.officerActionedAt && !entry.fiuRef}
                              />
                              {/* Step 2: Sent to officer */}
                              {entry.sentAt && (
                                <TimelineStep
                                  icon={<Send size={12} className="text-blue-400" />}
                                  label="Sent to Senior Officer"
                                  by={entry.sentByName ?? 'Analyst'}
                                  at={entry.sentAt}
                                  note="Forwarded for review and approval"
                                  isLast={!entry.officerActionedAt && !entry.fiuRef}
                                />
                              )}
                              {/* Step 3: Officer action */}
                              {entry.officerActionedAt && entry.officerAction && (
                                <TimelineStep
                                  icon={actionIcons[entry.officerAction] ?? <ShieldCheck size={12} className="text-primary" />}
                                  label={actionLabels[entry.officerAction] ?? 'Officer Actioned'}
                                  by={entry.officerActionedBy ?? 'Officer'}
                                  at={entry.officerActionedAt}
                                  note={entry.officerNotes ?? undefined}
                                  isLast={!entry.fiuRef}
                                />
                              )}
                              {/* Step 4: FIU submission */}
                              {entry.fiuRef && (
                                <TimelineStep
                                  icon={<CheckCircle size={12} className="text-green-400" />}
                                  label="Submitted to FIU-IND"
                                  by="System"
                                  at={entry.officerActionedAt ?? entry.generatedAt}
                                  note={`Reference: ${entry.fiuRef}`}
                                  isLast
                                />
                              )}
                            </div>
                            {/* Officer notes */}
                            {entry.officerNotes && (
                              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Officer Notes</p>
                                <p className="text-xs text-foreground">{entry.officerNotes}</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

interface TimelineStepProps {
  icon: React.ReactNode;
  label: string;
  by: string;
  at: string;
  note?: string;
  isLast?: boolean;
}

function TimelineStep({ icon, label, by, at, note, isLast }: TimelineStepProps) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
          {icon}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border my-1" style={{ minHeight: 16 }} />}
      </div>
      <div className="pb-3 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground">{label}</span>
          <span className="text-[10px] text-muted-foreground">by {by}</span>
          <span className="text-[10px] font-mono text-muted-foreground ml-auto">{at}</span>
        </div>
        {note && <p className="text-[11px] text-muted-foreground mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

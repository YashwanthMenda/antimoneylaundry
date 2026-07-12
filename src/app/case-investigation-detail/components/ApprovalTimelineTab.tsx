'use client';

import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, XCircle, Clock, Send, ShieldCheck, RotateCcw, ChevronDown, ChevronUp, Eye, Download, Loader2, AlertTriangle, Calendar, User,  } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SAREntry {
  dbId: string;
  sarId: string;
  caseRef: string;
  subject: string;
  accountId: string;
  pattern: string;
  riskScore: number;
  amount: string;
  officer: string;
  generatedAt: string;
  status: string;
  fiuRef?: string;
  sentByName?: string;
  sentAt?: string;
  officerAction?: string;
  officerActionedBy?: string;
  officerActionedAt?: string;
  officerNotes?: string;
}

interface ApprovalTimelineTabProps {
  caseRef?: string | null;
}

const statusColors: Record<string, string> = {
  Draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  'Pending Review': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Submitted: 'bg-primary/10 text-primary border border-primary/20',
  Acknowledged: 'bg-green-500/10 text-green-400 border border-green-500/20',
  Rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const actionLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  approve: {
    label: 'Approved',
    color: 'text-green-400',
    icon: <CheckCircle size={14} className="text-green-400" />,
  },
  reject: {
    label: 'Rejected',
    color: 'text-red-400',
    icon: <XCircle size={14} className="text-red-400" />,
  },
  request_changes: {
    label: 'Changes Requested',
    color: 'text-amber-400',
    icon: <RotateCcw size={14} className="text-amber-400" />,
  },
};

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function openSARPDFPreview(sar: SAREntry) {
  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (!printWindow) return;

  const actionInfo = sar.officerAction ? actionLabels[sar.officerAction] : null;
  const actionLabel = actionInfo?.label ?? '—';

  const timelineRows: string[] = [];
  timelineRows.push(`
    <tr>
      <td class="ts">${sar.generatedAt}</td>
      <td class="act">SAR Generated &amp; Submitted</td>
      <td class="by">${sar.sentByName ?? sar.officer ?? 'Analyst'}</td>
      <td class="note">Report created and queued for officer review</td>
    </tr>`);

  if (sar.sentAt && sar.sentByName) {
    timelineRows.push(`
    <tr>
      <td class="ts">${sar.sentAt}</td>
      <td class="act">Sent to Officer</td>
      <td class="by">${sar.sentByName}</td>
      <td class="note">Forwarded for review and approval</td>
    </tr>`);
  }

  if (sar.officerActionedAt && sar.officerActionedBy) {
    timelineRows.push(`
    <tr>
      <td class="ts">${sar.officerActionedAt}</td>
      <td class="act">${actionLabel}</td>
      <td class="by">${sar.officerActionedBy}</td>
      <td class="note">${sar.officerNotes ?? '—'}</td>
    </tr>`);
  }

  if (sar.fiuRef) {
    timelineRows.push(`
    <tr>
      <td class="ts">${sar.officerActionedAt ?? sar.generatedAt}</td>
      <td class="act">Submitted to FIU-IND</td>
      <td class="by">System</td>
      <td class="note">${sar.fiuRef}</td>
    </tr>`);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>SAR Report — ${sar.sarId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #111; background: #fff; padding: 32px 40px; line-height: 1.6; }
    .header { text-align: center; border: 2px solid #111; padding: 16px; margin-bottom: 20px; }
    .header h1 { font-size: 15px; font-weight: 700; letter-spacing: 1px; }
    .header p { font-size: 10px; color: #555; margin-top: 4px; }
    .badge { display: inline-block; margin-top: 8px; padding: 3px 12px; border: 1px solid #c00; color: #c00; font-size: 10px; font-weight: 700; letter-spacing: 1px; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; border: 1px solid #ccc; padding: 12px; margin-bottom: 20px; background: #f9f9f9; }
    .meta-item .label { font-size: 8px; text-transform: uppercase; color: #888; letter-spacing: .5px; }
    .meta-item .value { font-size: 11px; font-weight: 700; margin-top: 2px; }
    .section { margin-bottom: 20px; }
    .section-title { border-bottom: 1px solid #111; padding-bottom: 4px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    .section-num { width: 18px; height: 18px; background: #111; color: #fff; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; border-radius: 2px; flex-shrink: 0; }
    .section-title h2 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { text-align: left; padding: 6px 8px; background: #f0f0f0; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
    td { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; }
    td.ts { color: #555; white-space: nowrap; }
    td.act { font-weight: 700; }
    .status-box { display: inline-block; padding: 3px 10px; border-radius: 3px; font-size: 9px; font-weight: 700; letter-spacing: .5px; }
    .status-submitted { background: #e0f0ff; color: #0055aa; border: 1px solid #0055aa; }
    .status-approved { background: #e0ffe0; color: #006600; border: 1px solid #006600; }
    .status-rejected { background: #ffe0e0; color: #cc0000; border: 1px solid #cc0000; }
    .status-pending { background: #fff3e0; color: #cc6600; border: 1px solid #cc6600; }
    .fiu-box { background: #f0fff0; border: 1px solid #090; padding: 10px 14px; margin-top: 12px; font-size: 10px; }
    .officer-decision { padding: 10px 14px; border-radius: 4px; margin-top: 8px; }
    .decision-approved { background: #e0ffe0; border: 1px solid #006600; }
    .decision-rejected { background: #ffe0e0; border: 1px solid #cc0000; }
    .decision-changes { background: #fff3e0; border: 1px solid #cc6600; }
    .footer { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 12px; display: flex; justify-content: space-between; font-size: 8px; color: #888; }
    .sig-block { margin-top: 40px; display: flex; justify-content: space-between; }
    .sig-line { border-top: 1px solid #111; width: 180px; padding-top: 4px; font-size: 9px; }
    @media print { body { padding: 16px 24px; } @page { margin: 12mm; size: A4; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>SUSPICIOUS ACTIVITY REPORT (SAR)</h1>
    <p>Financial Intelligence Unit — India (FIU-IND) | FINnet 2.0 Submission</p>
    <p>Auto-Generated by AML-AI Investigation System</p>
    <div class="badge">⚠ CONFIDENTIAL — FOR OFFICER REVIEW</div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><div class="label">Report ID</div><div class="value">${sar.sarId}</div></div>
    <div class="meta-item"><div class="label">Case Reference</div><div class="value">${sar.caseRef}</div></div>
    <div class="meta-item"><div class="label">Generated At</div><div class="value">${sar.generatedAt}</div></div>
    <div class="meta-item"><div class="label">Subject</div><div class="value">${sar.subject}</div></div>
    <div class="meta-item"><div class="label">Account ID</div><div class="value">${sar.accountId}</div></div>
    <div class="meta-item"><div class="label">Risk Score</div><div class="value">${sar.riskScore}/100</div></div>
    <div class="meta-item"><div class="label">Pattern</div><div class="value">${sar.pattern}</div></div>
    <div class="meta-item"><div class="label">Amount</div><div class="value">${sar.amount || '—'}</div></div>
    <div class="meta-item"><div class="label">Reporting Officer</div><div class="value">${sar.officer}</div></div>
  </div>

  <div class="section">
    <div class="section-title"><div class="section-num">1</div><h2>Current Status</h2></div>
    <p style="padding-left:26px;font-size:11px;">
      Status: <strong>${sar.status}</strong>
      ${sar.fiuRef ? `&nbsp;&nbsp;|&nbsp;&nbsp; FIU Reference: <strong>${sar.fiuRef}</strong>` : ''}
    </p>
    ${sar.officerAction ? `
    <div class="officer-decision ${sar.officerAction === 'approve' ? 'decision-approved' : sar.officerAction === 'reject' ? 'decision-rejected' : 'decision-changes'}" style="margin-left:26px;margin-top:8px;">
      <strong>Officer Decision:</strong> ${actionLabel}<br/>
      <strong>By:</strong> ${sar.officerActionedBy ?? '—'} &nbsp; <strong>At:</strong> ${sar.officerActionedAt ?? '—'}<br/>
      ${sar.officerNotes ? `<strong>Notes:</strong> ${sar.officerNotes}` : ''}
    </div>` : ''}
  </div>

  <div class="section">
    <div class="section-title"><div class="section-num">2</div><h2>Approval Chain Timeline</h2></div>
    <table style="margin-left:26px;width:calc(100% - 26px);">
      <thead><tr><th>Timestamp</th><th>Action</th><th>By</th><th>Notes / Reference</th></tr></thead>
      <tbody>${timelineRows.join('')}</tbody>
    </table>
  </div>

  ${sar.fiuRef ? `
  <div class="fiu-box">
    ✓ <strong>FIU-IND Submission Confirmed</strong> — Reference: <strong>${sar.fiuRef}</strong>
  </div>` : ''}

  <div class="sig-block">
    <div class="sig-line">Reporting Officer Signature</div>
    <div class="sig-line">Senior Officer / Approver</div>
    <div class="sig-line">Date</div>
  </div>

  <div class="footer">
    <span>Generated by AML-AI Platform</span>
    <span>CONFIDENTIAL — FIU-IND USE ONLY</span>
    <span>${sar.sarId} | ${sar.caseRef}</span>
  </div>

  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}

export default function ApprovalTimelineTab({ caseRef }: ApprovalTimelineTabProps) {
  const { user } = useAuth();
  const userRole = (user as any)?.user_metadata?.role ?? (user as any)?.role ?? '';
  const isOfficer = userRole === 'senior_officer' || userRole === 'admin';

  const [sars, setSars] = useState<SAREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  useEffect(() => {
    if (!caseRef) { setLoading(false); return; }

    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('sar_reports')
        .select('*')
        .eq('case_ref', caseRef)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: SAREntry[] = data.map((r) => ({
          dbId: r.id,
          sarId: r.sar_id,
          caseRef: r.case_ref,
          subject: r.subject,
          accountId: r.account_id,
          pattern: r.pattern,
          riskScore: r.risk_score,
          amount: r.amount ?? '',
          officer: r.officer ?? '—',
          generatedAt: formatDate(r.generated_at ?? r.created_at),
          status: r.sar_status,
          fiuRef: r.fiu_ref ?? undefined,
          sentByName: r.sent_by_name ?? undefined,
          sentAt: r.sent_to_officer_at ? formatDate(r.sent_to_officer_at) : undefined,
          officerAction: r.officer_action ?? undefined,
          officerActionedBy: r.officer_actioned_by ?? undefined,
          officerActionedAt: r.officer_actioned_at ? formatDate(r.officer_actioned_at) : undefined,
          officerNotes: r.officer_notes ?? undefined,
        }));
        setSars(mapped);
      }
      setLoading(false);
    }

    load();

    const supabase = createClient();
    const channel = supabase
      .channel(`approval_timeline_${caseRef}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sar_reports' }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [caseRef]);

  const handlePreviewPDF = (sar: SAREntry) => {
    setPreviewingId(sar.sarId);
    setTimeout(() => {
      openSARPDFPreview(sar);
      setPreviewingId(null);
    }, 400);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={22} className="animate-spin text-primary mr-3" />
        <span className="text-sm text-muted-foreground">Loading approval timeline…</span>
      </div>
    );
  }

  if (!caseRef) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={32} className="text-amber-400 mb-3" />
        <p className="text-sm font-medium text-foreground">No case selected</p>
        <p className="text-xs text-muted-foreground mt-1">Open a case to view its SAR approval timeline.</p>
      </div>
    );
  }

  if (sars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText size={32} className="text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground">No SARs filed yet</p>
        <p className="text-xs text-muted-foreground mt-1">Once an analyst submits a SAR for this case, the approval chain will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">SAR Approval Timeline</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full approval chain for all SARs filed under this case — {sars.length} report{sars.length !== 1 ? 's' : ''}
          </p>
        </div>
        <span className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border">
          Case: {caseRef}
        </span>
      </div>

      {/* SAR cards */}
      {sars.map((sar, idx) => {
        const isExpanded = expandedId === sar.sarId;
        const actionInfo = sar.officerAction ? actionLabels[sar.officerAction] : null;

        // Build timeline steps
        const steps: { id: string; icon: React.ReactNode; label: string; by: string; at: string; note?: string; color: string }[] = [];

        steps.push({
          id: 'step-generated',
          icon: <FileText size={13} className="text-blue-400" />,
          label: 'SAR Submitted',
          by: sar.sentByName ?? sar.officer ?? 'Analyst',
          at: sar.generatedAt,
          note: `Pattern: ${sar.pattern} · Risk: ${sar.riskScore}/100`,
          color: 'border-blue-500/30 bg-blue-500/5',
        });

        if (sar.sentAt) {
          steps.push({
            id: 'step-sent',
            icon: <Send size={13} className="text-amber-400" />,
            label: 'Sent to Officer for Review',
            by: sar.sentByName ?? '—',
            at: sar.sentAt,
            note: 'Forwarded for officer decision',
            color: 'border-amber-500/30 bg-amber-500/5',
          });
        }

        if (sar.officerActionedAt && sar.officerActionedBy) {
          steps.push({
            id: 'step-officer',
            icon: actionInfo?.icon ?? <CheckCircle size={13} className="text-green-400" />,
            label: `Officer Decision: ${actionInfo?.label ?? 'Actioned'}`,
            by: sar.officerActionedBy,
            at: sar.officerActionedAt,
            note: sar.officerNotes,
            color: sar.officerAction === 'approve' ?'border-green-500/30 bg-green-500/5'
              : sar.officerAction === 'reject' ?'border-red-500/30 bg-red-500/5' :'border-amber-500/30 bg-amber-500/5',
          });
        }

        if (sar.fiuRef) {
          steps.push({
            id: 'step-fiu',
            icon: <ShieldCheck size={13} className="text-primary" />,
            label: 'Submitted to FIU-IND',
            by: 'System',
            at: sar.officerActionedAt ?? sar.generatedAt,
            note: `Reference: ${sar.fiuRef}`,
            color: 'border-primary/30 bg-primary/5',
          });
        }

        return (
          <div key={sar.sarId} className="card-elevated border border-border rounded-lg overflow-hidden">
            {/* SAR card header */}
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : sar.sarId)}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText size={14} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground font-mono">{sar.sarId}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColors[sar.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {sar.status}
                    </span>
                    {idx === 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar size={10} /> {sar.generatedAt}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <User size={10} /> {sar.sentByName ?? sar.officer}
                    </span>
                    {sar.fiuRef && (
                      <span className="text-[11px] text-green-400 flex items-center gap-1">
                        <ShieldCheck size={10} /> {sar.fiuRef}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {/* PDF Preview button — visible to officers */}
                {isOfficer && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePreviewPDF(sar); }}
                    className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors"
                    title="View SAR as PDF"
                  >
                    {previewingId === sar.sarId ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Eye size={11} />
                    )}
                    View PDF
                  </button>
                )}
                {/* Download PDF — visible to all */}
                <button
                  onClick={(e) => { e.stopPropagation(); handlePreviewPDF(sar); }}
                  className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-md bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border transition-colors"
                  title="Download SAR PDF"
                >
                  <Download size={11} />
                  PDF
                </button>
                <div className="text-muted-foreground">
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </div>
            </div>

            {/* Expanded approval chain */}
            {isExpanded && (
              <div className="border-t border-border px-4 pb-4 pt-3 bg-muted/10">
                {/* SAR meta row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 rounded-md bg-muted/20 border border-border">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Subject</p>
                    <p className="text-xs font-medium text-foreground truncate">{sar.subject}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Account</p>
                    <p className="text-xs font-medium text-foreground font-mono">{sar.accountId}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Risk Score</p>
                    <p className="text-xs font-bold text-red-400">{sar.riskScore}/100</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Amount</p>
                    <p className="text-xs font-medium text-foreground">{sar.amount || '—'}</p>
                  </div>
                </div>

                {/* Timeline steps */}
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Approval Chain</p>
                <div className="relative">
                  {/* Vertical connector line */}
                  <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />

                  <div className="space-y-3">
                    {steps.map((step, stepIdx) => (
                      <div key={step.id} className="flex items-start gap-3 relative">
                        {/* Step icon */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 ${step.color}`}>
                          {step.icon}
                        </div>
                        {/* Step content */}
                        <div className={`flex-1 rounded-md border p-3 ${step.color}`}>
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="text-xs font-semibold text-foreground">{step.label}</p>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <User size={9} /> {step.by}
                                </span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock size={9} /> {step.at}
                                </span>
                              </div>
                            </div>
                            {stepIdx === steps.length - 1 && (
                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                Current
                              </span>
                            )}
                          </div>
                          {step.note && (
                            <p className="text-[11px] text-muted-foreground mt-1.5 border-t border-border/50 pt-1.5">
                              {step.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FIU submission status banner */}
                {sar.fiuRef ? (
                  <div className="mt-4 flex items-center gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20">
                    <ShieldCheck size={14} className="text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-green-400">FIU-IND Submission Confirmed</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Reference: <span className="font-mono font-semibold text-foreground">{sar.fiuRef}</span></p>
                    </div>
                  </div>
                ) : sar.status === 'Rejected' ? (
                  <div className="mt-4 flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20">
                    <XCircle size={14} className="text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-400">Not Submitted to FIU-IND</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {sar.officerNotes ? `Rejection reason: ${sar.officerNotes}` : 'SAR was rejected by the officer.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <Clock size={14} className="text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-400">Pending FIU-IND Submission</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting officer approval before submission to FIU-IND.</p>
                    </div>
                  </div>
                )}

                {/* Officer PDF review prompt */}
                {isOfficer && sar.status === 'Pending Review' && (
                  <div className="mt-3 flex items-center justify-between p-3 rounded-md bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Eye size={13} className="text-primary" />
                      <p className="text-xs text-foreground">Review the full SAR document before taking action</p>
                    </div>
                    <button
                      onClick={() => handlePreviewPDF(sar)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {previewingId === sar.sarId ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />}
                      Open SAR PDF
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

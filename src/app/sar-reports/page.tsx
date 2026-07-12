'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import RiskBadge, { getRiskLevel } from '@/components/ui/RiskBadge';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';
import {
  FileText, Download, Send, CheckCircle, AlertTriangle, Search,
  Filter, ChevronDown, Eye, Plus, Loader2, ShieldCheck, XCircle, RotateCcw,
} from 'lucide-react';
import { getSARReports, updateSARStatus, approveSAR, sendSARToOfficer } from '@/lib/services/amlService';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SARReport {
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
}

const statusFilters = ['All', 'Draft', 'Pending Review', 'Submitted', 'Acknowledged', 'Rejected'];

const statusColors: Record<string, string> = {
  Draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  'Pending Review': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Submitted: 'bg-primary/10 text-primary border border-primary/20',
  Acknowledged: 'bg-green-500/10 text-green-400 border border-green-500/20',
  Rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

function exportSARPDF(sar: SARReport) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${sar.id}</title>
  <style>body{font-family:'Courier New',monospace;font-size:11px;color:#111;padding:32px 40px;}
  h1{font-size:15px;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:16px;}
  .row{display:flex;gap:16px;margin-bottom:8px;}.label{color:#888;font-size:9px;text-transform:uppercase;}.value{font-size:11px;font-weight:700;}
  .badge{display:inline-block;padding:2px 8px;border:1px solid #c00;color:#c00;font-size:9px;font-weight:700;margin-top:8px;}
  @media print{@page{margin:12mm;size:A4;}}</style></head>
  <body><h1>SUSPICIOUS ACTIVITY REPORT — ${sar.id}</h1>
  <div class="row"><div><div class="label">Case Reference</div><div class="value">${sar.caseRef}</div></div>
  <div><div class="label">Subject</div><div class="value">${sar.subject}</div></div>
  <div><div class="label">Account</div><div class="value">${sar.accountId}</div></div></div>
  <div class="row"><div><div class="label">Pattern</div><div class="value">${sar.pattern}</div></div>
  <div><div class="label">Risk Score</div><div class="value">${sar.riskScore}/100</div></div>
  <div><div class="label">Amount</div><div class="value">${sar.amount}</div></div></div>
  <div class="row"><div><div class="label">Officer</div><div class="value">${sar.officer}</div></div>
  <div><div class="label">Generated</div><div class="value">${sar.generatedAt}</div></div>
  <div><div class="label">Status</div><div class="value">${sar.status}</div></div></div>
  ${sar.fiuRef ? `<div class="row"><div><div class="label">FIU Reference</div><div class="value">${sar.fiuRef}</div></div></div>` : ''}
  <div class="badge">CONFIDENTIAL — FIU-IND USE ONLY</div>
  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
  </body></html>`;
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function SARReportsPage() {
  const { user } = useAuth();
  const userRole = (user as any)?.user_metadata?.role ?? (user as any)?.role ?? '';
  const isOfficer = userRole === 'senior_officer' || userRole === 'admin';
  const analystName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Analyst';

  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<keyof SARReport>('generatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [sarReports, setSarReports] = useState<SARReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Send to Officer modal (analyst)
  const [sendModal, setSendModal] = useState<SARReport | null>(null);
  const [sendDone, setSendDone] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Submit to FIU modal (legacy)
  const [submitModal, setSubmitModal] = useState<SARReport | null>(null);
  const [submitDone, setSubmitDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Approve modal (officer)
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveModal, setApproveModal] = useState<SARReport | null>(null);
  const [approveDone, setApproveDone] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getSARReports();
      setSarReports(data as SARReport[]);
      setLoading(false);
    }
    load();

    const supabase = createClient();
    const channel = supabase
      .channel('sar_reports_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sar_reports' }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = sarReports
    .filter((r) => {
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchSearch =
        search === '' ||
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.subject.toLowerCase().includes(search.toLowerCase()) ||
        r.accountId.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
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

  const handleSort = (col: keyof SARReport) => {
    if (sortCol === col) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const handleDownload = (sar: SARReport) => {
    setDownloadingId(sar.id);
    setTimeout(() => { exportSARPDF(sar); setDownloadingId(null); }, 600);
  };

  // Send to Officer
  const handleOpenSend = (sar: SARReport) => {
    setSendDone(false);
    setSendModal(sar);
  };

  const handleConfirmSend = async () => {
    if (!sendModal) return;
    setIsSending(true);
    const ok = await sendSARToOfficer(sendModal.dbId, analystName);
    if (ok) {
      setSarReports((prev) =>
        prev.map((r) => r.id === sendModal.id ? { ...r, status: 'Pending Review' } : r)
      );
    }
    setIsSending(false);
    setSendDone(true);
  };

  // Submit to FIU (legacy direct submit)
  const handleOpenSubmit = (sar: SARReport) => {
    setSubmitDone(false);
    setSubmitModal(sar);
  };

  const handleConfirmSubmit = async () => {
    if (!submitModal) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    const fiuRef = `FIU-IND/2026/SAR/${submitModal.id.split('-')[2]}`;
    setSarReports((prev) =>
      prev.map((r) => r.id === submitModal.id ? { ...r, status: 'Submitted', fiuRef } : r)
    );
    await updateSARStatus(submitModal.dbId, 'Submitted', fiuRef);
    setIsSubmitting(false);
    setSubmitDone(true);
  };

  // Officer Approve
  const handleOpenApprove = (sar: SARReport) => {
    setApproveDone(false);
    setApproveModal(sar);
  };

  const handleConfirmApprove = async () => {
    if (!approveModal) return;
    setIsApproving(true);
    const fiuRef = await approveSAR(approveModal.dbId);
    setSarReports((prev) =>
      prev.map((r) =>
        r.id === approveModal.id
          ? { ...r, status: 'Submitted', fiuRef: fiuRef ?? r.fiuRef }
          : r
      )
    );
    setIsApproving(false);
    setApproveDone(true);
  };

  // Derived stats
  const totalSARs = sarReports.length;
  const drafts = sarReports.filter((r) => r.status === 'Draft').length;
  const submitted = sarReports.filter((r) => r.status === 'Submitted').length;
  const acknowledged = sarReports.filter((r) => r.status === 'Acknowledged').length;
  const pendingReview = sarReports.filter((r) => r.status === 'Pending Review').length;

  const statCards = [
    { id: 'sc-total', label: 'Total SARs', value: String(totalSARs), sub: 'This quarter', color: 'text-primary' },
    { id: 'sc-pending', label: 'Pending Review', value: String(pendingReview), sub: 'Sent to officer', color: 'text-blue-400' },
    { id: 'sc-submitted', label: 'Submitted', value: String(submitted), sub: 'Filed with FIU-IND', color: 'text-green-400' },
    { id: 'sc-ack', label: 'Acknowledged', value: String(acknowledged), sub: 'Confirmed by FIU-IND', color: 'text-green-400' },
  ];

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={18} className="text-primary" />
            <h1 className="text-lg font-bold text-foreground tracking-tight">SAR Reports</h1>
            <span className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              FIU-IND Compliance
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Auto-generated Suspicious Activity Reports — FATF Recommendation 20 compliant
          </p>
        </div>
        <Link
          href="/case-investigation-detail"
          className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus size={13} />
          Generate New SAR
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <div key={s.id} className="card-elevated p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{s.label}</p>
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{loading ? '…' : s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Analyst workflow notice */}
      {!isOfficer && drafts > 0 && (
        <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3 mb-6">
          <Send size={14} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">
              {drafts} Draft SAR{drafts > 1 ? 's' : ''} ready to send
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Use the <span className="text-foreground font-medium">Send to Officer</span> button on each Draft SAR to forward it to the Senior Officer for review and approval.
            </p>
          </div>
        </div>
      )}

      {/* Officer approval notice */}
      {isOfficer && pendingReview > 0 && (
        <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-lg px-4 py-3 mb-6">
          <ShieldCheck size={14} className="text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">
              {pendingReview} SAR{pendingReview > 1 ? 's' : ''} awaiting your review
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Analysts have sent these SARs for your review. You can approve, reject, or request changes from the actions column.
            </p>
          </div>
        </div>
      )}

      {/* FATF notice */}
      <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-6">
        <AlertTriangle size={14} className="text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">FATF Reporting Obligation</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Under FATF Recommendation 20, all suspicious transactions must be reported to FIU-IND within 7 days of detection.
            Draft SARs older than 5 days are highlighted for urgent review.
          </p>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="card-elevated">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2 bg-muted rounded px-3 py-1.5 flex-1 min-w-[200px] max-w-xs">
            <Search size={12} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search SAR ID, subject, account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter size={11} className="text-muted-foreground mr-1" />
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
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">{filtered.length} reports</span>
        </div>

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
                    { key: 'id', label: 'SAR ID' },
                    { key: 'caseRef', label: 'Case Ref' },
                    { key: 'subject', label: 'Subject' },
                    { key: 'pattern', label: 'Pattern' },
                    { key: 'riskScore', label: 'Risk' },
                    { key: 'amount', label: 'Amount' },
                    { key: 'status', label: 'Status' },
                    { key: 'officer', label: 'Officer' },
                    { key: 'generatedAt', label: 'Generated' },
                  ].map((col) => (
                    <th
                      key={`th-${col.key}`}
                      className={`px-4 py-3 text-left font-semibold text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap ${
                        sortCol === col.key ? 'text-foreground' : ''
                      }`}
                      onClick={() => handleSort(col.key as keyof SARReport)}
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
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-100 group">
                    <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">{r.id}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">{r.caseRef}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-medium text-foreground truncate max-w-[160px]">{r.subject}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{r.accountId}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.pattern}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <RiskBadge level={getRiskLevel(r.riskScore)} score={r.riskScore} size="sm" />
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground whitespace-nowrap">{r.amount}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[r.status] || ''}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.officer}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap text-[10px]">
                      {r.generatedAt}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Link
                          href="/case-investigation-detail"
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 inline-flex"
                          aria-label="View case"
                        >
                          <Eye size={13} />
                        </Link>
                        <button
                          onClick={() => handleDownload(r)}
                          disabled={downloadingId === r.id}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 disabled:opacity-50"
                          aria-label="Download PDF"
                        >
                          {downloadingId === r.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Download size={13} />
                          )}
                        </button>

                        {/* Analyst: Send to Officer button for Draft SARs */}
                        {!isOfficer && r.status === 'Draft' && (
                          <button
                            onClick={() => handleOpenSend(r)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[10px] font-semibold transition-all duration-150"
                            title="Send to Officer for review"
                          >
                            <Send size={11} />
                            Send
                          </button>
                        )}

                        {/* Analyst: Pending Review badge */}
                        {!isOfficer && r.status === 'Pending Review' && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-semibold">
                            <ShieldCheck size={11} />
                            Sent
                          </span>
                        )}

                        {/* Officer: Approve button for Pending Review SARs */}
                        {isOfficer && r.status === 'Pending Review' && (
                          <button
                            onClick={() => handleOpenApprove(r)}
                            disabled={approvingId === r.id}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[10px] font-semibold transition-all duration-150 disabled:opacity-50"
                            title="Review SAR"
                          >
                            {approvingId === r.id ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <ShieldCheck size={11} />
                            )}
                            Review
                          </button>
                        )}

                        {(r.status === 'Submitted' || r.status === 'Acknowledged') && (
                          <span className="p-1.5 text-green-400">
                            <CheckCircle size={13} />
                          </span>
                        )}

                        {r.status === 'Rejected' && (
                          <span className="p-1.5 text-red-400" title="Rejected by officer">
                            <XCircle size={13} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Send to Officer Modal (Analyst) */}
      {sendModal && (
        <Modal open={!!sendModal} onClose={() => setSendModal(null)} title="Send SAR to Senior Officer" size="sm">
          <div className="space-y-4">
            {!sendDone ? (
              <>
                <p className="text-xs text-muted-foreground">
                  You are sending{' '}
                  <span className="text-foreground font-semibold">{sendModal.id}</span> for{' '}
                  <span className="text-foreground font-semibold">{sendModal.subject}</span> to the Senior Officer for review and approval.
                </p>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-400 space-y-1">
                  <p className="font-semibold">The Senior Officer will:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-300">
                    <li>Receive this SAR in their Pending Cases review queue</li>
                    <li>Read the full SAR details and evidence</li>
                    <li>Approve, reject, or request changes</li>
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-muted-foreground mb-0.5">Case Ref</p>
                    <p className="font-mono text-foreground font-semibold">{sendModal.caseRef}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-muted-foreground mb-0.5">Risk Score</p>
                    <p className="font-mono text-foreground font-semibold">{sendModal.riskScore}/100</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-muted-foreground mb-0.5">Pattern</p>
                    <p className="font-mono text-foreground font-semibold">{sendModal.pattern}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-muted-foreground mb-0.5">Amount</p>
                    <p className="font-mono text-foreground font-semibold">{sendModal.amount}</p>
                  </div>
                </div>
                <button
                  onClick={handleConfirmSend}
                  disabled={isSending}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-xs font-semibold py-2.5 rounded-md hover:bg-blue-500 disabled:opacity-60 transition-colors"
                >
                  {isSending ? (
                    <><Loader2 size={13} className="animate-spin" /> Sending…</>
                  ) : (
                    <><Send size={13} /> Send to Senior Officer</>
                  )}
                </button>
                <button
                  onClick={() => setSendModal(null)}
                  className="w-full py-2 border border-border text-xs text-muted-foreground rounded-md hover:bg-muted transition-all"
                >
                  Cancel
                </button>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                  <Send size={20} className="text-blue-400" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">SAR Sent to Officer</p>
                <p className="text-xs text-muted-foreground mb-2">
                  The Senior Officer will review and take action on this SAR.
                </p>
                <button
                  onClick={() => setSendModal(null)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Officer Review Modal */}
      {approveModal && (
        <Modal open={!!approveModal} onClose={() => setApproveModal(null)} title="Review SAR Report" size="sm">
          <div className="space-y-4">
            {!approveDone ? (
              <OfficerReviewPanel
                sar={approveModal}
                isApproving={isApproving}
                onApprove={handleConfirmApprove}
                onReject={async (notes) => {
                  setIsApproving(true);
                  const { officerActionSAR } = await import('@/lib/services/amlService');
                  const officerName = analystName;
                  await officerActionSAR(approveModal.dbId, 'reject', officerName, notes);
                  setSarReports((prev) =>
                    prev.map((r) => r.id === approveModal.id ? { ...r, status: 'Rejected' } : r)
                  );
                  setIsApproving(false);
                  setApproveDone(true);
                }}
                onRequestChanges={async (notes) => {
                  setIsApproving(true);
                  const { officerActionSAR } = await import('@/lib/services/amlService');
                  const officerName = analystName;
                  await officerActionSAR(approveModal.dbId, 'request_changes', officerName, notes);
                  setSarReports((prev) =>
                    prev.map((r) => r.id === approveModal.id ? { ...r, status: 'Draft' } : r)
                  );
                  setIsApproving(false);
                  setApproveDone(true);
                }}
                onCancel={() => setApproveModal(null)}
              />
            ) : (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={20} className="text-green-400" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Action Recorded</p>
                <p className="text-xs text-muted-foreground mb-2">
                  The SAR has been updated and the analyst will be notified.
                </p>
                <button
                  onClick={() => setApproveModal(null)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Submit Modal (legacy) */}
      {submitModal && (
        <Modal open={!!submitModal} onClose={() => setSubmitModal(null)} title="Submit SAR to FIU-IND">
          <div className="space-y-4">
            {!submitDone ? (
              <>
                <p className="text-xs text-muted-foreground">
                  You are about to submit{' '}
                  <span className="text-foreground font-semibold">{submitModal.id}</span> for{' '}
                  <span className="text-foreground font-semibold">{submitModal.subject}</span> to FIU-IND.
                  This action cannot be undone.
                </p>
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-400">
                    Ensure all details are verified before submission. FIU-IND will acknowledge within 48 hours.
                  </p>
                </div>
                <button
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white text-xs font-semibold py-2.5 rounded-md hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {isSubmitting ? (
                    <><Loader2 size={13} className="animate-spin" /> Submitting to FIU-IND…</>
                  ) : (
                    <><Send size={13} /> Confirm Submission</>
                  )}
                </button>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={20} className="text-green-400" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">SAR Submitted</p>
                <p className="text-xs text-muted-foreground mb-2">
                  FIU Reference: <span className="font-mono text-foreground">{submitModal.fiuRef || `FIU-IND/2026/SAR/${submitModal.id.split('-')[2]}`}</span>
                </p>
                <button
                  onClick={() => setSubmitModal(null)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}

// ─── Officer Review Panel ─────────────────────────────────────────────────────

interface OfficerReviewPanelProps {
  sar: SARReport;
  isApproving: boolean;
  onApprove: () => void;
  onReject: (notes: string) => void;
  onRequestChanges: (notes: string) => void;
  onCancel: () => void;
}

function OfficerReviewPanel({ sar, isApproving, onApprove, onReject, onRequestChanges, onCancel }: OfficerReviewPanelProps) {
  const [notes, setNotes] = useState('');
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | 'request_changes' | null>(null);

  return (
    <div className="space-y-4">
      {/* SAR Summary */}
      <div className="bg-muted/40 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">{sar.id}</span>
          <span className="text-[10px] font-mono text-muted-foreground">{sar.caseRef}</span>
        </div>
        <p className="text-sm font-semibold text-foreground">{sar.subject}</p>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <p className="text-muted-foreground">Pattern</p>
            <p className="text-foreground font-medium">{sar.pattern}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Risk Score</p>
            <p className="text-foreground font-medium">{sar.riskScore}/100</p>
          </div>
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="text-foreground font-medium">{sar.amount}</p>
          </div>
        </div>
        <div className="text-[11px]">
          <p className="text-muted-foreground">Account</p>
          <p className="font-mono text-foreground">{sar.accountId}</p>
        </div>
      </div>

      {/* Notes field */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
          Officer Notes (optional for approve, required for reject/changes)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes for the analyst..."
          rows={3}
          className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onApprove}
          disabled={isApproving}
          className="flex flex-col items-center gap-1.5 px-3 py-2.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-[11px] font-semibold hover:bg-green-500/20 disabled:opacity-50 transition-colors"
        >
          {isApproving && activeAction === 'approve' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CheckCircle size={14} />
          )}
          Approve
        </button>
        <button
          onClick={() => { setActiveAction('request_changes'); onRequestChanges(notes); }}
          disabled={isApproving}
          className="flex flex-col items-center gap-1.5 px-3 py-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[11px] font-semibold hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
        >
          {isApproving && activeAction === 'request_changes' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RotateCcw size={14} />
          )}
          Request Changes
        </button>
        <button
          onClick={() => { setActiveAction('reject'); onReject(notes); }}
          disabled={isApproving}
          className="flex flex-col items-center gap-1.5 px-3 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[11px] font-semibold hover:bg-red-500/20 disabled:opacity-50 transition-colors"
        >
          {isApproving && activeAction === 'reject' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <XCircle size={14} />
          )}
          Reject
        </button>
      </div>

      <button
        onClick={onCancel}
        className="w-full py-2 border border-border text-xs text-muted-foreground rounded-md hover:bg-muted transition-all"
      >
        Cancel
      </button>
    </div>
  );
}

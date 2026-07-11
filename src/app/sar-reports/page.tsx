'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import RiskBadge, { getRiskLevel } from '@/components/ui/RiskBadge';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';
import {
  FileText, Download, Send, CheckCircle, AlertTriangle, Search,
  Filter, ChevronDown, Eye, Plus, Loader2, ShieldCheck,
} from 'lucide-react';
import { getSARReports, updateSARStatus, approveSAR } from '@/lib/services/amlService';
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

const statusFilters = ['All', 'Draft', 'Pending Review', 'Submitted', 'Acknowledged'];

const statusColors: Record<string, string> = {
  Draft: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  'Pending Review': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Submitted: 'bg-primary/10 text-primary border border-primary/20',
  Acknowledged: 'bg-green-500/10 text-green-400 border border-green-500/20',
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

  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<keyof SARReport>('generatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [sarReports, setSarReports] = useState<SARReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [submitModal, setSubmitModal] = useState<SARReport | null>(null);
  const [submitDone, setSubmitDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    { id: 'sc-pending', label: 'Pending Review', value: String(pendingReview), sub: 'Awaiting officer approval', color: 'text-blue-400' },
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

      {/* Officer approval notice */}
      {isOfficer && pendingReview > 0 && (
        <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-lg px-4 py-3 mb-6">
          <ShieldCheck size={14} className="text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">
              {pendingReview} SAR{pendingReview > 1 ? 's' : ''} awaiting your approval
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              As Senior Officer, you can approve analyst-submitted SARs. Approving will mark the SAR as Submitted and complete the analyst's case timeline.
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

                        {/* Approve button — Senior Officer / Admin only, for Pending Review SARs */}
                        {isOfficer && r.status === 'Pending Review' && (
                          <button
                            onClick={() => handleOpenApprove(r)}
                            disabled={approvingId === r.id}
                            className="p-1.5 rounded-md hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 transition-all duration-150 disabled:opacity-50"
                            aria-label="Approve SAR"
                            title="Approve SAR"
                          >
                            {approvingId === r.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <ShieldCheck size={13} />
                            )}
                          </button>
                        )}

                        {!isOfficer && r.status !== 'Submitted' && r.status !== 'Acknowledged' && (
                          <button
                            onClick={() => handleOpenSubmit(r)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-all duration-150"
                            aria-label="Submit to FIU-IND"
                          >
                            <Send size={13} />
                          </button>
                        )}
                        {(r.status === 'Submitted' || r.status === 'Acknowledged') && (
                          <span className="p-1.5 text-green-400">
                            <CheckCircle size={13} />
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

      {/* Approve Modal — Senior Officer */}
      {approveModal && (
        <Modal open={!!approveModal} onClose={() => setApproveModal(null)} title="Approve SAR Report" size="sm">
          <div className="space-y-4">
            {!approveDone ? (
              <>
                <p className="text-xs text-muted-foreground">
                  You are approving{' '}
                  <span className="text-foreground font-semibold">{approveModal.id}</span> submitted by the analyst for{' '}
                  <span className="text-foreground font-semibold">{approveModal.subject}</span>.
                </p>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-400 space-y-1">
                  <p className="font-semibold">Approving this SAR will:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-300">
                    <li>Mark the SAR as Submitted to FIU-IND</li>
                    <li>Complete the analyst's case timeline (all stages)</li>
                    <li>Generate a FIU reference number</li>
                  </ul>
                </div>
                <button
                  onClick={handleConfirmApprove}
                  disabled={isApproving}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-xs font-semibold py-2.5 rounded-md hover:bg-blue-500 disabled:opacity-60 transition-colors"
                >
                  {isApproving ? (
                    <><Loader2 size={13} className="animate-spin" /> Approving…</>
                  ) : (
                    <><ShieldCheck size={13} /> Approve &amp; Submit SAR</>
                  )}
                </button>
                <button
                  onClick={() => setApproveModal(null)}
                  className="w-full py-2 border border-border text-xs text-muted-foreground rounded-md hover:bg-muted transition-all"
                >
                  Cancel
                </button>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={20} className="text-green-400" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">SAR Approved &amp; Submitted</p>
                <p className="text-xs text-muted-foreground mb-2">
                  The analyst's case timeline has been fully completed.
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

      {/* Submit Modal */}
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

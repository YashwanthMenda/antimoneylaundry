'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import RiskBadge, { getRiskLevel } from '@/components/ui/RiskBadge';
import Modal from '@/components/ui/Modal';
import { ArrowLeft, AlertTriangle, FileText, CheckCircle, Clock, User, Building2, MapPin, Calendar, Loader2, CalendarClock, UserCheck, Upload, Paperclip, X } from 'lucide-react';
import { createSARReport, getSARStatusForCase, getAnalysts, assignCaseToAnalyst, getCaseAssignment, getCases } from '@/lib/services/amlService';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

interface CaseDetailHeaderProps {
  caseRef?: string | null;
  onViewSAR?: () => void;
}

export default function CaseDetailHeader({ caseRef: caseRefProp, onViewSAR }: CaseDetailHeaderProps) {
  const { user } = useAuth();
  const permissions = usePermissions();
  const userRole = (user as any)?.user_metadata?.role ?? (user as any)?.role ?? '';
  const isSeniorOfficer = permissions.isOfficer;

  // Resolved case ref — starts null until auto-loaded if not provided
  const [resolvedCaseRef, setResolvedCaseRef] = useState<string | null>(caseRefProp ?? null);
  const CASE_REF = resolvedCaseRef ?? '';

  // Auto-load first active case when no caseRef is provided
  useEffect(() => {
    if (caseRefProp) {
      setResolvedCaseRef(caseRefProp);
      return;
    }
    async function autoLoadFirstActiveCase() {
      const cases = await getCases();
      // Prefer active (non-closed) cases first
      const active = (cases as any[]).find((c) => c.status && c.status.toLowerCase() !== 'closed');
      const first = active ?? cases[0];
      if (first) setResolvedCaseRef(first.id);
    }
    autoLoadFirstActiveCase();
  }, [caseRefProp]);

  // Reset case-specific state when the resolved case ref changes
  useEffect(() => {
    if (!resolvedCaseRef) return;
    setCaseData(null);
    setSarStatus(null);
    setGenerated(false);
    setEscalated(false);
    setCurrentAssignee(null);
  }, [resolvedCaseRef]);

  // Dynamic case data loaded from DB
  const [caseData, setCaseData] = useState<{
    subject: string;
    pattern: string;
    score: number;
    status: string;
    accountId: string;
    jurisdiction: string;
    assignedAnalystName: string | null;
    assignedTo: string | null;
  } | null>(null);

  const [sarModalOpen, setSarModalOpen] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [sarSubmitError, setSarSubmitError] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionDays, setExtensionDays] = useState('7');
  const [extensionSubmitted, setExtensionSubmitted] = useState(false);
  const [isSubmittingExtension, setIsSubmittingExtension] = useState(false);

  // SAR Upload form state (analyst) — pre-filled from live case data
  const [sarUploadForm, setSarUploadForm] = useState({
    subject: 'Ananya Trading Pvt Ltd',
    accountId: 'HDFC-4521',
    pattern: 'Smurfing · Round-Trip',
    riskScore: '92',
    amount: '₹1,47,32,000',
    notes: '',
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assignment state
  const [analysts, setAnalysts] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [selectedAnalystId, setSelectedAnalystId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentDone, setAssignmentDone] = useState(false);
  const [currentAssignee, setCurrentAssignee] = useState<string | null>(null);

  // Live SAR status from Supabase
  const [sarStatus, setSarStatus] = useState<{
    status: string;
    approvedAt: string | null;
    generatedAt: string | null;
  } | null>(null);

  // Derived timeline flags from live SAR data
  const sarExists = sarStatus !== null || generated;
  const sarApproved = sarStatus?.status === 'Submitted' || sarStatus?.status === 'Acknowledged';

  const sarPendingDate = sarStatus?.generatedAt
    ? new Date(sarStatus.generatedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : generated
    ? '11-Jul 12:10' : '—';

  const sarFiledDate = sarStatus?.approvedAt
    ? new Date(sarStatus.approvedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : sarApproved ? '11 Jul, 20:36' : '—';

  // Load initial SAR status and subscribe to real-time changes
  useEffect(() => {
    async function loadSARStatus() {
      const data = await getSARStatusForCase(CASE_REF);
      if (data) setSarStatus(data);
    }
    loadSARStatus();

    const supabase = createClient();
    const channel = supabase
      .channel(`case_sar_timeline_${CASE_REF}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sar_reports' },
        () => { loadSARStatus(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [CASE_REF]);

  // Load current assignment
  useEffect(() => {
    async function loadAssignment() {
      const data = await getCaseAssignment(CASE_REF);
      if (data?.analystName) setCurrentAssignee(data.analystName);
    }
    loadAssignment();
  }, [CASE_REF]);

  // Load case data dynamically
  useEffect(() => {
    async function loadCase() {
      const cases = await getCases();
      const found = cases.find((c: any) => c.id === CASE_REF);
      if (found) {
        setCaseData({
          subject: found.subject ?? 'Unknown Entity',
          pattern: found.pattern ?? '—',
          score: found.score ?? 0,
          status: found.status ?? 'Investigating',
          accountId: (found as any).accountId ?? '—',
          jurisdiction: (found as any).jurisdiction ?? '—',
          assignedAnalystName: found.assignedAnalystName ?? null,
          assignedTo: found.assignedTo ?? null,
        });
      }
    }
    loadCase();
  }, [CASE_REF]);

  // Sync SAR form defaults when case data loads
  useEffect(() => {
    if (caseData) {
      setSarUploadForm((f) => ({
        ...f,
        subject: caseData.subject,
        accountId: caseData.accountId,
        pattern: caseData.pattern,
        riskScore: String(caseData.score),
      }));
    }
  }, [caseData]);

  const riskScore = caseData?.score ?? 92;
  const riskLevel = getRiskLevel(riskScore);

  // Helper: open SAR modal with fresh state and safe form defaults
  const openSarModal = () => {
    setGenerated(false);
    setSarSubmitError(null);
    setUploadedFile(null);
    setSarUploadForm({
      subject: caseData?.subject ?? '',
      accountId: caseData?.accountId ?? '',
      pattern: caseData?.pattern ?? '',
      riskScore: caseData?.score != null ? String(caseData.score) : '',
      amount: '',
      notes: '',
    });
    setSarModalOpen(true);
  };

  const handleUploadSAR = async () => {
    setSarSubmitError(null);
    if (!sarUploadForm.subject.trim() || !sarUploadForm.accountId.trim()) {
      setSarSubmitError('Subject and Account ID are required before submitting.');
      return;
    }
    setIsGenerating(true);
    try {
      await createSARReport({
        caseRef: CASE_REF,
        subject: sarUploadForm.subject,
        accountId: sarUploadForm.accountId,
        pattern: sarUploadForm.pattern,
        riskScore: parseInt(sarUploadForm.riskScore, 10) || riskScore,
        amount: sarUploadForm.amount,
        officer: (user as any)?.user_metadata?.full_name ?? 'Analyst Sharma',
      });
      setGenerated(true);
      const data = await getSARStatusForCase(CASE_REF);
      if (data) setSarStatus(data);
    } catch (err) {
      setSarSubmitError('Failed to submit SAR. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmEscalation = async () => {
    setIsEscalating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsEscalating(false);
    setEscalated(true);
  };

  const handleSubmitExtension = async () => {
    setIsSubmittingExtension(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSubmittingExtension(false);
    setExtensionSubmitted(true);
  };

  const handleOpenAssignModal = async () => {
    setAssignmentDone(false);
    setSelectedAnalystId('');
    const list = await getAnalysts();
    setAnalysts(list);
    setAssignModalOpen(true);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedAnalystId) return;
    setIsAssigning(true);
    const analyst = analysts.find((a) => a.id === selectedAnalystId);
    const name = analyst?.fullName ?? 'Unknown Analyst';
    const ok = await assignCaseToAnalyst(CASE_REF, selectedAnalystId, name);
    setIsAssigning(false);
    if (ok) {
      setCurrentAssignee(name);
      setAssignmentDone(true);
    }
  };

  // All 6 stages are ticked when officer has approved/acted on the SAR
  const allDone = sarApproved;

  const timelineSteps = [
    { id: 'step-alert', label: 'Alert Generated', date: '10-Jul 09:12', done: true },
    { id: 'step-triage', label: 'Triaged', date: '10-Jul 09:45', done: true },
    { id: 'step-case', label: 'Case Opened', date: '10-Jul 10:03', done: true },
    {
      id: 'step-invest',
      label: 'Investigating',
      date: '11-Jul 08:30',
      active: !allDone && !escalated && !sarExists,
      done: allDone || escalated || sarExists,
    },
    {
      id: 'step-sar',
      label: 'SAR Pending',
      date: allDone ? '11 Jul, 20:32' : sarPendingDate,
      active: !allDone && sarExists,
      done: allDone,
    },
    {
      id: 'step-filed',
      label: 'SAR Filed',
      date: allDone ? '11 Jul, 20:36' : sarFiledDate,
      done: allDone,
    },
  ];

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
          Dashboard
        </Link>
        <span className="text-muted-foreground text-xs">/</span>
        <Link href="/case-investigation-detail" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Case Management</Link>
        <span className="text-muted-foreground text-xs">/</span>
        <span className="text-xs text-foreground font-medium">{CASE_REF}</span>
      </div>

      {/* SAR Approved banner */}
      {sarApproved && (
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 mb-4">
          <CheckCircle size={15} className="text-green-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-green-400">SAR Approved &amp; Filed</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Your SAR has been approved by the Senior Officer and submitted to FIU-IND. All case stages are complete.
            </p>
          </div>
        </div>
      )}

      {/* Upload SAR banner for analysts — always visible */}
      {!isSeniorOfficer && (
        <div className="flex items-center justify-between gap-4 bg-primary/10 border border-primary/40 rounded-lg px-4 py-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Upload size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary">
                {sarApproved ? 'Submit New SAR Report' : 'SAR Required'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {sarApproved
                  ? 'SAR has been approved. You can upload a new SAR report for this case.'
                  : 'This case requires a Suspicious Activity Report. Upload your SAR to send it for officer review.'}
              </p>
            </div>
          </div>
          <button
            onClick={openSarModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary/90 active:scale-95 transition-all duration-150 shadow-md shadow-primary/30 shrink-0"
          >
            <Upload size={13} />
            Upload SAR
          </button>
        </div>
      )}

      <div className="card-elevated p-6 mb-5">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
          {/* Left — Case identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground tracking-tight font-mono">
                {CASE_REF}
              </h1>
              <StatusBadge status={escalated ? 'Escalated' : sarApproved ? 'Closed' : (caseData?.status ?? 'Investigating')} />
              <RiskBadge level={riskLevel} score={riskScore} />
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {caseData?.pattern ?? 'Smurfing · Round-Trip'}
              </span>
            </div>

            <h2 className="text-base font-semibold text-foreground mb-1">
              {caseData?.subject ?? 'Ananya Trading Pvt Ltd'}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Suspected structuring and round-trip layering across 6 jurisdictions via 47 sub-threshold deposits
            </p>

            {/* Metadata row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'meta-account', icon: Building2, label: 'Primary Account', value: caseData?.accountId ?? 'HDFC-4521', mono: true },
                {
                  id: 'meta-officer',
                  icon: User,
                  label: 'Assigned Analyst',
                  value: currentAssignee ?? caseData?.assignedAnalystName ?? (escalated ? 'Senior Director' : 'Priya Mehta'),
                  mono: false,
                },
                { id: 'meta-jurisdiction', icon: MapPin, label: 'Primary Jurisdiction', value: caseData?.jurisdiction ?? 'Mumbai, IN', mono: false },
                { id: 'meta-opened', icon: Calendar, label: 'Case Opened', value: '10-Jul-2026', mono: true },
              ]?.map((m) => {
                const MetaIcon = m?.icon;
                return (
                  <div key={m?.id} className="flex items-start gap-2">
                    <MetaIcon size={13} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{m?.label}</p>
                      <p className={`text-xs font-semibold text-foreground mt-0.5 ${m?.mono ? 'font-mono' : ''}`}>
                        {m?.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — Risk gauge + Actions */}
          <div className="flex flex-col items-center gap-4">
            {/* Risk score display */}
            <div className="flex flex-col items-center">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke="var(--risk-critical)" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(riskScore / 100) * 251.2} 251.2`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold font-mono text-risk-critical risk-score-font">{riskScore}</span>
                  <span className="text-[9px] text-muted-foreground">/100</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 text-center">GNN Risk Score</p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 w-full min-w-[160px]">
              {isSeniorOfficer ? (
                <>
                  {/* Assign Analyst button — Senior Officer / Admin only */}
                  <button
                    onClick={handleOpenAssignModal}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary/90 active:scale-95 transition-all duration-150"
                  >
                    <UserCheck size={13} />
                    {currentAssignee ? 'Reassign Analyst' : 'Assign Analyst'}
                  </button>

                  {/* SAR status indicator (read-only for senior officer — no generate button) */}
                  <div className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md border ${
                    sarApproved
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : sarExists
                      ? 'bg-primary/10 border-primary text-primary' :'bg-muted border-border text-muted-foreground'
                  }`}>
                    {sarApproved ? (
                      <><CheckCircle size={13} />SAR Approved</>
                    ) : sarExists ? (
                      <><FileText size={13} />SAR Pending Review</>
                    ) : (
                      <><FileText size={13} />No SAR Yet</>
                    )}
                  </div>
                </>
              ) : (
                /* Analyst: Upload SAR button — always prominent */
                <>
                  <button
                    onClick={openSarModal}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary/90 active:scale-95 transition-all duration-150 shadow-md shadow-primary/30 ring-2 ring-primary/20"
                  >
                    <Upload size={14} />
                    Upload SAR
                  </button>
                  {sarApproved && (
                    <div className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-semibold rounded-md">
                      <CheckCircle size={11} />
                      Previous SAR Approved
                    </div>
                  )}
                  {!sarApproved && sarExists && (
                    <div className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-primary/10 border border-primary/30 text-primary text-[10px] font-semibold rounded-md">
                      <FileText size={11} />
                      SAR Pending Review
                    </div>
                  )}
                </>
              )}
              <button
                onClick={() => setEscalateModalOpen(true)}
                disabled={escalated || !permissions.canEscalate}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 border text-xs font-semibold rounded-md active:scale-95 transition-all duration-150 ${
                  escalated
                    ? 'bg-risk-critical/10 border-risk-critical text-risk-critical cursor-default' :'bg-muted border-border text-foreground hover:bg-muted/80'
                }`}
              >
                {escalated ? <><CheckCircle size={13} />Escalated</> : <><AlertTriangle size={13} />Escalate Case</>}
              </button>
              <button
                onClick={() => { setExtensionSubmitted(false); setExtensionReason(''); setExtensionModalOpen(true); }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-muted border border-border text-xs font-semibold text-muted-foreground rounded-md hover:bg-muted/80 active:scale-95 transition-all duration-150"
              >
                <Clock size={13} />
                Request Extension
              </button>
            </div>
          </div>
        </div>

        {/* Timeline progress — all 6 stages tick when officer acts on SAR */}
        <div className="mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin pb-1">
            {timelineSteps?.map((step, i) => (
              <React.Fragment key={step?.id}>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      step?.done
                        ? 'bg-risk-low border-risk-low'
                        : step?.active
                        ? 'bg-primary/20 border-primary' :'bg-muted border-border'
                    }`}
                  >
                    {step?.done ? (
                      <CheckCircle size={12} className="text-white" />
                    ) : (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          step?.active ? 'bg-primary' : 'bg-muted-foreground'
                        }`}
                      />
                    )}
                  </div>
                  <p
                    className={`text-[9px] font-medium whitespace-nowrap transition-colors duration-500 ${
                      step?.done
                        ? 'text-risk-low'
                        : step?.active
                        ? 'text-primary' :'text-muted-foreground'
                    }`}
                  >
                    {step?.label}
                  </p>
                  <p className="text-[8px] text-muted-foreground font-mono whitespace-nowrap">
                    {step?.date}
                  </p>
                </div>
                {i < 5 && (
                  <div
                    className={`flex-1 h-px min-w-[20px] transition-colors duration-500 ${
                      step?.done ? 'bg-risk-low' : 'bg-border'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ── Assign Analyst Modal ── */}
      <Modal
        open={assignModalOpen}
        onClose={() => { setAssignModalOpen(false); setAssignmentDone(false); }}
        title={`Assign Analyst — ${CASE_REF}`}
        size="sm"
      >
        {!assignmentDone ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select an AML Analyst to own this case. They will be responsible for investigation and SAR submission.
            </p>

            {analysts.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin mr-2" />
                Loading analysts…
              </div>
            ) : (
              <div className="space-y-2">
                {analysts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAnalystId(a.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-left transition-all ${
                      selectedAnalystId === a.id
                        ? 'bg-primary/10 border-primary' :'border-border hover:bg-muted'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <User size={13} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{a.fullName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{a.email}</p>
                    </div>
                    {selectedAnalystId === a.id && (
                      <CheckCircle size={14} className="text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {currentAssignee && (
              <p className="text-[10px] text-muted-foreground">
                Currently assigned to: <span className="font-semibold text-foreground">{currentAssignee}</span>
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleConfirmAssignment}
                disabled={isAssigning || !selectedAnalystId}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60"
              >
                {isAssigning ? (
                  <><Loader2 size={14} className="animate-spin" />Assigning…</>
                ) : (
                  <><UserCheck size={14} />Confirm Assignment</>
                )}
              </button>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2.5 border border-border text-sm text-muted-foreground rounded-md hover:bg-muted transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
              <UserCheck size={24} className="text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Analyst Assigned</p>
            <p className="text-xs text-muted-foreground mb-1">
              <span className="font-semibold text-foreground">{currentAssignee}</span> is now responsible for {CASE_REF}.
            </p>
            <p className="text-[10px] text-muted-foreground mb-4">
              They can now investigate and submit a SAR for senior officer review.
            </p>
            <button
              onClick={() => { setAssignModalOpen(false); setAssignmentDone(false); }}
              className="px-6 py-2 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary/90 transition-all active:scale-95"
            >
              Done
            </button>
          </div>
        )}
      </Modal>

      {/* ── SAR Upload Modal (Analyst only) ── */}
      <Modal
        open={sarModalOpen}
        onClose={() => { setSarModalOpen(false); setGenerated(false); setSarSubmitError(null); }}
        title={`Upload SAR — ${CASE_REF}`}
        size="md"
      >
        {!generated ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Complete the SAR details below and optionally attach a supporting document. The report will be sent to the Senior Officer for review.
            </p>

            {/* Form fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Subject / Entity <span className="text-risk-critical">*</span></label>
                <input
                  type="text"
                  value={sarUploadForm.subject}
                  onChange={(e) => setSarUploadForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="e.g. Ananya Trading Pvt Ltd"
                  className={`w-full bg-muted border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors ${!sarUploadForm.subject.trim() && sarSubmitError ? 'border-risk-critical' : 'border-border'}`}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Account ID <span className="text-risk-critical">*</span></label>
                <input
                  type="text"
                  value={sarUploadForm.accountId}
                  onChange={(e) => setSarUploadForm((f) => ({ ...f, accountId: e.target.value }))}
                  placeholder="e.g. HDFC-4521"
                  className={`w-full bg-muted border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors ${!sarUploadForm.accountId.trim() && sarSubmitError ? 'border-risk-critical' : 'border-border'}`}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Suspicious Pattern</label>
                <input
                  type="text"
                  value={sarUploadForm.pattern}
                  onChange={(e) => setSarUploadForm((f) => ({ ...f, pattern: e.target.value }))}
                  placeholder="e.g. Smurfing · Round-Trip"
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Risk Score</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={sarUploadForm.riskScore}
                  onChange={(e) => setSarUploadForm((f) => ({ ...f, riskScore: e.target.value }))}
                  placeholder="0–100"
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Total Suspicious Amount</label>
                <input
                  type="text"
                  value={sarUploadForm.amount}
                  onChange={(e) => setSarUploadForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="e.g. ₹1,47,32,000"
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Investigation Notes</label>
                <textarea
                  value={sarUploadForm.notes}
                  onChange={(e) => setSarUploadForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Summarise key findings, evidence, and recommended actions..."
                  rows={3}
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
            </div>

            {/* File attachment */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Attach SAR Document (optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xlsx"
                className="hidden"
                onChange={(e) => setUploadedFile(e.target.files?.[0] ?? null)}
              />
              {uploadedFile ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary rounded-md">
                  <Paperclip size={12} className="text-primary shrink-0" />
                  <span className="text-xs text-foreground flex-1 truncate">{uploadedFile.name}</span>
                  <button onClick={() => setUploadedFile(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-border rounded-md text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Upload size={12} />
                  Click to attach PDF / Word / Excel
                </button>
              )}
            </div>

            {/* Validation / error feedback */}
            {sarSubmitError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-risk-critical/10 border border-risk-critical/30 rounded-md">
                <AlertTriangle size={13} className="text-risk-critical shrink-0" />
                <p className="text-xs text-risk-critical">{sarSubmitError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleUploadSAR}
                disabled={isGenerating}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold py-2.5 rounded-md hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-60"
              >
                {isGenerating ? (
                  <><Loader2 size={14} className="animate-spin" />Submitting SAR…</>
                ) : (
                  <><Upload size={14} />Submit SAR for Review</>
                )}
              </button>
              <button
                onClick={() => { setSarModalOpen(false); setSarSubmitError(null); }}
                className="px-4 py-2.5 border border-border text-sm text-muted-foreground rounded-md hover:bg-muted transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-risk-low/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={24} className="text-risk-low" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">SAR Submitted Successfully</p>
            <p className="text-xs text-muted-foreground mb-1">
              SAR is now pending Senior Officer review.
            </p>
            <p className="text-[10px] text-muted-foreground mb-4">
              Once the officer acts on it, all case timeline stages will be marked complete.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setSarModalOpen(false); onViewSAR?.(); }}
                className="px-6 py-2 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary/90 transition-all active:scale-95"
              >
                View SAR Report
              </button>
              <button
                onClick={() => setSarModalOpen(false)}
                className="px-4 py-2 border border-border text-sm text-muted-foreground rounded-md hover:bg-muted transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Escalate Modal */}
      <Modal
        open={escalateModalOpen}
        onClose={() => setEscalateModalOpen(false)}
        title={`Escalate Case — ${CASE_REF}`}
        size="sm"
      >
        {!escalated ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Escalating will assign this case to the Senior Compliance Director and
              trigger a 24-hour response SLA.
            </p>
            <div className="p-3 rounded-lg bg-risk-critical/10 border border-risk-critical/30 text-xs text-risk-critical">
              This action cannot be undone. The account will be flagged for enhanced
              due diligence and potential freeze.
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmEscalation}
                disabled={isEscalating}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-risk-critical text-white text-sm font-semibold rounded-md hover:bg-risk-critical/90 transition-all active:scale-95 disabled:opacity-60"
              >
                {isEscalating ? (
                  <><Loader2 size={14} className="animate-spin" />Escalating…</>
                ) : (
                  'Confirm Escalation'
                )}
              </button>
              <button
                onClick={() => setEscalateModalOpen(false)}
                className="px-4 py-2.5 border border-border text-sm text-muted-foreground rounded-md hover:bg-muted transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-risk-critical/20 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={24} className="text-risk-critical" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Case Escalated Successfully</p>
            <p className="text-xs text-muted-foreground mb-1">
              {CASE_REF} has been escalated to the Senior Compliance Director.
            </p>
            <p className="text-[10px] font-mono text-muted-foreground mb-4">
              SLA: 24-hour response required · Ref: ESC-2026-0847
            </p>
            <button
              onClick={() => setEscalateModalOpen(false)}
              className="px-6 py-2 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary/90 transition-all active:scale-95"
            >
              Done
            </button>
          </div>
        )}
      </Modal>

      {/* Request Extension Modal */}
      <Modal
        open={extensionModalOpen}
        onClose={() => setExtensionModalOpen(false)}
        title={`Request Deadline Extension — ${CASE_REF}`}
        size="sm"
      >
        {!extensionSubmitted ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Request additional time for investigation. Extensions require senior officer approval.
            </p>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                Extension Duration
              </label>
              <div className="flex gap-2">
                {['3', '7', '14', '30'].map((d) => (
                  <button
                    key={`ext-${d}`}
                    onClick={() => setExtensionDays(d)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md border transition-all ${
                      extensionDays === d
                        ? 'bg-primary/10 border-primary text-primary' :'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                Reason for Extension
              </label>
              <textarea
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                placeholder="Describe why additional time is needed..."
                rows={3}
                className="w-full bg-muted border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSubmitExtension}
                disabled={isSubmittingExtension || !extensionReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60"
              >
                {isSubmittingExtension ? (
                  <><Loader2 size={14} className="animate-spin" />Submitting…</>
                ) : (
                  <><CalendarClock size={14} />Submit Request</>
                )}
              </button>
              <button
                onClick={() => setExtensionModalOpen(false)}
                className="px-4 py-2.5 border border-border text-sm text-muted-foreground rounded-md hover:bg-muted transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={24} className="text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Extension Request Submitted</p>
            <p className="text-xs text-muted-foreground mb-1">
              {extensionDays}-day extension request sent to Senior Officer for approval.
            </p>
            <p className="text-[10px] font-mono text-muted-foreground mb-4">
              Ref: EXT-2026-0847 · Response within 4 hours
            </p>
            <button
              onClick={() => setExtensionModalOpen(false)}
              className="px-6 py-2 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary/90 transition-all active:scale-95"
            >
              Done
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}
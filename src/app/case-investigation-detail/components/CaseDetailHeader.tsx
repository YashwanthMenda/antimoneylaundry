'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import RiskBadge, { getRiskLevel } from '@/components/ui/RiskBadge';
import Modal from '@/components/ui/Modal';
import {
  ArrowLeft,
  AlertTriangle,
  FileText,
  CheckCircle,
  Clock,
  User,
  Building2,
  MapPin,
  Calendar,
  Loader2,
  CalendarClock,
} from 'lucide-react';
import { createSARReport, getSARStatusForCase } from '@/lib/services/amlService';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CaseDetailHeaderProps {
  onViewSAR?: () => void;
}

const CASE_REF = 'CASE-0847';

export default function CaseDetailHeader({ onViewSAR }: CaseDetailHeaderProps) {
  const { user } = useAuth();
  const userRole = (user as any)?.user_metadata?.role ?? (user as any)?.role ?? '';
  const isSeniorOfficer = userRole === 'senior_officer' || userRole === 'admin';

  const [sarModalOpen, setSarModalOpen] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionDays, setExtensionDays] = useState('7');
  const [extensionSubmitted, setExtensionSubmitted] = useState(false);
  const [isSubmittingExtension, setIsSubmittingExtension] = useState(false);

  // Live SAR status from Supabase
  const [sarStatus, setSarStatus] = useState<{
    status: string;
    approvedAt: string | null;
    generatedAt: string | null;
  } | null>(null);

  // Derived timeline flags from live SAR data
  const sarExists = generated || sarStatus !== null;
  const sarApproved = sarStatus?.status === 'Submitted' || sarStatus?.status === 'Acknowledged';

  const sarPendingDate = sarStatus?.generatedAt
    ? new Date(sarStatus.generatedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : generated
    ? '11-Jul 12:10' :'—';

  const sarFiledDate = sarStatus?.approvedAt
    ? new Date(sarStatus.approvedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : '—';

  // Load initial SAR status and subscribe to real-time changes
  useEffect(() => {
    async function loadSARStatus() {
      const data = await getSARStatusForCase(CASE_REF);
      if (data) setSarStatus(data);
    }
    loadSARStatus();

    const supabase = createClient();
    const channel = supabase
      .channel('case_sar_timeline')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sar_reports' },
        () => { loadSARStatus(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const riskScore = 92;
  const riskLevel = getRiskLevel(riskScore);

  const handleGenerateSAR = async () => {
    setIsGenerating(true);
    await createSARReport({
      caseRef: CASE_REF,
      subject: 'Ananya Trading Pvt Ltd',
      accountId: 'HDFC-4521',
      pattern: 'Smurfing · Round-Trip',
      riskScore: 92,
      amount: '₹1,47,32,000',
      officer: (user as any)?.user_metadata?.full_name ?? 'Analyst Sharma',
    });
    setIsGenerating(false);
    setGenerated(true);
    // Reload SAR status after creation
    const data = await getSARStatusForCase(CASE_REF);
    if (data) setSarStatus(data);
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

  const timelineSteps = [
    { id: 'step-alert', label: 'Alert Generated', date: '10-Jul 09:12', done: true },
    { id: 'step-triage', label: 'Triaged', date: '10-Jul 09:45', done: true },
    { id: 'step-case', label: 'Case Opened', date: '10-Jul 10:03', done: true },
    {
      id: 'step-invest',
      label: 'Investigating',
      date: '11-Jul 08:30',
      active: !escalated && !sarApproved && !sarExists,
      done: sarApproved || escalated || sarExists,
    },
    {
      id: 'step-sar',
      label: 'SAR Pending',
      date: sarPendingDate,
      active: sarExists && !sarApproved,
      done: sarApproved,
    },
    {
      id: 'step-filed',
      label: 'SAR Filed',
      date: sarFiledDate,
      done: sarApproved,
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
        <span className="text-xs text-muted-foreground">Case Management</span>
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

      <div className="card-elevated p-6 mb-5">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
          {/* Left — Case identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground tracking-tight font-mono">
                {CASE_REF}
              </h1>
              <StatusBadge status={escalated ? 'Escalated' : sarApproved ? 'Closed' : 'Investigating'} />
              <RiskBadge level={riskLevel} score={riskScore} />
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                Smurfing · Round-Trip
              </span>
            </div>

            <h2 className="text-base font-semibold text-foreground mb-1">
              Ananya Trading Pvt Ltd
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Suspected structuring and round-trip layering across 6 jurisdictions via 47 sub-threshold deposits
            </p>

            {/* Metadata row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'meta-account', icon: Building2, label: 'Primary Account', value: 'HDFC-4521', mono: true },
                { id: 'meta-officer', icon: User, label: 'Assigned Officer', value: escalated ? 'Senior Director' : 'Priya Mehta', mono: false },
                { id: 'meta-jurisdiction', icon: MapPin, label: 'Primary Jurisdiction', value: 'Mumbai, IN', mono: false },
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
                /* Senior Officer: show Approve SAR info, not Generate SAR */
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
              ) : (
                <button
                  onClick={() => { setGenerated(false); setSarModalOpen(true); }}
                  disabled={sarApproved}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md active:scale-95 transition-all duration-150 ${
                    sarApproved
                      ? 'bg-green-500/10 border border-green-500/30 text-green-400 cursor-default' :'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {sarApproved ? <CheckCircle size={13} /> : <FileText size={13} />}
                  {sarApproved ? 'SAR Filed' : 'Generate SAR'}
                </button>
              )}
              <button
                onClick={() => setEscalateModalOpen(true)}
                disabled={escalated}
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

        {/* Timeline progress */}
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

      {/* SAR Modal */}
      <Modal
        open={sarModalOpen}
        onClose={() => { setSarModalOpen(false); setGenerated(false); }}
        title={`Generate SAR — ${CASE_REF}`}
        size="md"
      >
        {!generated ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will auto-generate a Suspicious Activity Report pre-populated with
              SHAP analysis, transaction chain, and FATF guideline references.
            </p>
            <div className="space-y-2">
              {[
                'FATF Recommendation 20 — Reporting obligation',
                'FATF Recommendation 10 — Customer due diligence',
                '47 structuring transactions identified',
                'SHAP explanation included',
                'Transaction chain: 6 hops across 3 jurisdictions',
              ]?.map((item, index) => (
                <div key={`sar-item-${index}`} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle size={12} className="text-risk-low shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleGenerateSAR}
                disabled={isGenerating}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold py-2.5 rounded-md hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-60"
              >
                {isGenerating ? (
                  <><Loader2 size={14} className="animate-spin" />Generating SAR…</>
                ) : (
                  'Generate & Preview SAR'
                )}
              </button>
              <button
                onClick={() => setSarModalOpen(false)}
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
            <p className="text-sm font-semibold text-foreground mb-1">SAR Generated Successfully</p>
            <p className="text-xs text-muted-foreground mb-1">
              SAR is now pending Senior Officer review.
            </p>
            <p className="text-[10px] text-muted-foreground mb-4">
              Once approved, your case timeline will show SAR Filed as complete.
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
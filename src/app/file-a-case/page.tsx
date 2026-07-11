'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { FileText, User, AlertTriangle, DollarSign, Paperclip, ChevronRight, CheckCircle, Loader2, ArrowLeft,  } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const ACTIVITY_TYPES = [
  'Structuring / Smurfing',
  'Layering via Shell Companies',
  'Trade-Based Money Laundering',
  'Hawala / Informal Value Transfer',
  'Real Estate Manipulation',
  'Cryptocurrency Laundering',
  'Loan-Back Scheme',
  'Unusual Cash Transactions',
  'Rapid Movement of Funds',
  'Other Suspicious Activity',
];

const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const ACCOUNT_TYPES = ['Savings', 'Current', 'NRE', 'NRO', 'FCNR', 'Overdraft', 'Corporate'];
const JURISDICTIONS = [
  'Mumbai, IN', 'Delhi, IN', 'Bangalore, IN', 'Chennai, IN',
  'Hyderabad, IN', 'Kolkata, IN', 'Pune, IN', 'Ahmedabad, IN',
  'Dubai, UAE', 'Singapore, SG', 'London, UK', 'New York, US',
];

interface FormData {
  accountId: string;
  accountHolder: string;
  accountType: string;
  bankName: string;
  ifscCode: string;
  activityType: string;
  activityDescription: string;
  transactionAmount: string;
  transactionDate: string;
  transactionIds: string;
  riskLevel: string;
  jurisdiction: string;
  evidenceNotes: string;
}

const initialForm: FormData = {
  accountId: '',
  accountHolder: '',
  accountType: 'Savings',
  bankName: '',
  ifscCode: '',
  activityType: '',
  activityDescription: '',
  transactionAmount: '',
  transactionDate: '',
  transactionIds: '',
  riskLevel: 'Medium',
  jurisdiction: 'Mumbai, IN',
  evidenceNotes: '',
};

const steps = [
  { id: 1, label: 'Account Info', icon: User },
  { id: 2, label: 'Suspicious Activity', icon: AlertTriangle },
  { id: 3, label: 'Transaction Details', icon: DollarSign },
  { id: 4, label: 'Evidence & Submit', icon: Paperclip },
];

function generateReportRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CR-${ts}-${rand}`;
}

export default function FileACasePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportRef, setReportRef] = useState('');

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validateStep(s: number): boolean {
    const errs: Partial<FormData> = {};
    if (s === 1) {
      if (!form.accountId.trim()) errs.accountId = 'Account ID is required';
      if (!form.accountHolder.trim()) errs.accountHolder = 'Account holder name is required';
      if (!form.bankName.trim()) errs.bankName = 'Bank name is required';
    }
    if (s === 2) {
      if (!form.activityType) errs.activityType = 'Select an activity type';
      if (!form.activityDescription.trim() || form.activityDescription.length < 20)
        errs.activityDescription = 'Provide a detailed description (min 20 characters)';
    }
    if (s === 3) {
      if (!form.transactionAmount.trim()) errs.transactionAmount = 'Transaction amount is required';
      if (!form.transactionDate) errs.transactionDate = 'Transaction date is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, 4));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    if (!validateStep(4)) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const ref = generateReportRef();
      const { error } = await supabase.from('case_reports').insert({
        report_ref: ref,
        account_id: form.accountId,
        account_holder: form.accountHolder,
        account_type: form.accountType,
        bank_name: form.bankName,
        ifsc_code: form.ifscCode,
        activity_type: form.activityType,
        activity_description: form.activityDescription,
        transaction_amount: form.transactionAmount.startsWith('₹')
          ? form.transactionAmount
          : `₹${form.transactionAmount}`,
        transaction_date: form.transactionDate || null,
        transaction_ids: form.transactionIds,
        risk_level: form.riskLevel,
        jurisdiction: form.jurisdiction,
        evidence_notes: form.evidenceNotes,
        report_status: 'Submitted',
        submitted_by: user?.id ?? null,
        submitted_by_name:
          user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Unknown',
      });
      if (error) throw error;
      setReportRef(ref);
      setSubmitted(true);
    } catch (e: any) {
      console.error('File a case error:', e.message);
      setErrors({ activityDescription: 'Submission failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <div className="bg-card border border-border rounded-xl p-10 max-w-md w-full text-center shadow-xl">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Case Report Filed</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Your report has been submitted and is under review by the compliance team.
            </p>
            <div className="bg-muted rounded-lg px-4 py-3 mb-6 font-mono text-sm text-primary font-semibold tracking-wider">
              {reportRef}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setSubmitted(false); setForm(initialForm); setStep(1); }}
                className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                File Another Case
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-2.5 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              File a Case Report
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submit a new suspicious activity case for investigation
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-0 mb-8">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                      isDone
                        ? 'bg-primary border-primary text-primary-foreground'
                        : isActive
                        ? 'bg-primary/10 border-primary text-primary' :'bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    {isDone ? <CheckCircle size={16} /> : <Icon size={15} />}
                  </div>
                  <span
                    className={`text-[10px] font-medium hidden sm:block ${
                      isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mb-5 transition-all duration-300 ${
                      step > s.id ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {/* Step 1: Account Info */}
          {step === 1 && (
            <div className="space-y-5">
              <SectionTitle icon={User} title="Account Information" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Account ID / Number"
                  required
                  value={form.accountId}
                  onChange={(v) => update('accountId', v)}
                  placeholder="e.g. ACC-00123456"
                  error={errors.accountId}
                />
                <Field
                  label="Account Holder Name"
                  required
                  value={form.accountHolder}
                  onChange={(v) => update('accountHolder', v)}
                  placeholder="Full legal name"
                  error={errors.accountHolder}
                />
                <SelectField
                  label="Account Type"
                  value={form.accountType}
                  onChange={(v) => update('accountType', v)}
                  options={ACCOUNT_TYPES}
                />
                <Field
                  label="Bank Name"
                  required
                  value={form.bankName}
                  onChange={(v) => update('bankName', v)}
                  placeholder="e.g. State Bank of India"
                  error={errors.bankName}
                />
                <Field
                  label="IFSC Code"
                  value={form.ifscCode}
                  onChange={(v) => update('ifscCode', v.toUpperCase())}
                  placeholder="e.g. SBIN0001234"
                />
                <SelectField
                  label="Jurisdiction"
                  value={form.jurisdiction}
                  onChange={(v) => update('jurisdiction', v)}
                  options={JURISDICTIONS}
                />
              </div>
            </div>
          )}

          {/* Step 2: Suspicious Activity */}
          {step === 2 && (
            <div className="space-y-5">
              <SectionTitle icon={AlertTriangle} title="Suspicious Activity Details" />
              <SelectField
                label="Activity Type"
                required
                value={form.activityType}
                onChange={(v) => update('activityType', v)}
                options={ACTIVITY_TYPES}
                placeholder="Select activity type..."
                error={errors.activityType}
              />
              <SelectField
                label="Risk Level"
                value={form.riskLevel}
                onChange={(v) => update('riskLevel', v)}
                options={RISK_LEVELS}
              />
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Activity Description <span className="text-primary">*</span>
                </label>
                <textarea
                  rows={5}
                  value={form.activityDescription}
                  onChange={(e) => update('activityDescription', e.target.value)}
                  placeholder="Describe the suspicious activity in detail — include dates, patterns, parties involved, and any other relevant observations..."
                  className={`w-full bg-input border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none transition-colors ${
                    errors.activityDescription ? 'border-red-500' : 'border-border'
                  }`}
                />
                {errors.activityDescription && (
                  <p className="text-red-400 text-xs mt-1">{errors.activityDescription}</p>
                )}
                <p className="text-muted-foreground text-[10px] mt-1">
                  {form.activityDescription.length} characters (min 20)
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Transaction Details */}
          {step === 3 && (
            <div className="space-y-5">
              <SectionTitle icon={DollarSign} title="Transaction Details" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Transaction Amount"
                  required
                  value={form.transactionAmount}
                  onChange={(v) => update('transactionAmount', v)}
                  placeholder="e.g. 25,00,000"
                  prefix="₹"
                  error={errors.transactionAmount}
                />
                <Field
                  label="Transaction Date"
                  required
                  type="date"
                  value={form.transactionDate}
                  onChange={(v) => update('transactionDate', v)}
                  error={errors.transactionDate}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Transaction IDs / References
                </label>
                <textarea
                  rows={3}
                  value={form.transactionIds}
                  onChange={(e) => update('transactionIds', e.target.value)}
                  placeholder="List transaction IDs separated by commas or new lines..."
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <p className="text-muted-foreground text-[10px] mt-1">Optional — include all related transaction references</p>
              </div>
            </div>
          )}

          {/* Step 4: Evidence & Submit */}
          {step === 4 && (
            <div className="space-y-5">
              <SectionTitle icon={Paperclip} title="Supporting Evidence & Review" />
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Evidence Notes
                </label>
                <textarea
                  rows={4}
                  value={form.evidenceNotes}
                  onChange={(e) => update('evidenceNotes', e.target.value)}
                  placeholder="Describe any supporting evidence — documents, witness accounts, digital trails, prior alerts, etc."
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Summary */}
              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Case Summary</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <SummaryRow label="Account ID" value={form.accountId} />
                  <SummaryRow label="Account Holder" value={form.accountHolder} />
                  <SummaryRow label="Bank" value={form.bankName} />
                  <SummaryRow label="Account Type" value={form.accountType} />
                  <SummaryRow label="Activity Type" value={form.activityType} />
                  <SummaryRow label="Risk Level" value={form.riskLevel} />
                  <SummaryRow label="Amount" value={form.transactionAmount ? `₹${form.transactionAmount}` : '—'} />
                  <SummaryRow label="Date" value={form.transactionDate || '—'} />
                  <SummaryRow label="Jurisdiction" value={form.jurisdiction} />
                </div>
              </div>

              <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300/80">
                  By submitting, you confirm this report is accurate and filed in good faith under AML compliance obligations.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
            <button
              onClick={back}
              disabled={step === 1}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            {step < 4 ? (
              <button
                onClick={next}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Continue
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FileText size={14} />
                    Submit Case Report
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
        <Icon size={14} className="text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  type?: string;
  prefix?: string;
}

function Field({ label, value, onChange, placeholder, required, error, type = 'text', prefix }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-input border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors ${
            prefix ? 'pl-7' : ''
          } ${error ? 'border-red-500' : 'border-border'}`}
        />
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
  error?: string;
  placeholder?: string;
}

function SelectField({ label, value, onChange, options, required, error, placeholder }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-input border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors appearance-none ${
          error ? 'border-red-500' : 'border-border'
        }`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground font-medium">{value || '—'}</span>
    </div>
  );
}

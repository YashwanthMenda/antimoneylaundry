'use client';

import React, { useState, useRef } from 'react';
import { Download, Printer, Send, CheckCircle, FileText, AlertTriangle } from 'lucide-react';

// ─── SAR data ────────────────────────────────────────────────────────────────
const sarMeta = [
  { id: 'sar-id', label: 'Report ID', value: 'SAR-2026-0847' },
  { id: 'sar-date', label: 'Date Generated', value: '11-Jul-2026 12:10:03 IST' },
  { id: 'sar-score', label: 'Risk Score', value: '92/100 — CRITICAL' },
  { id: 'sar-case', label: 'Case Reference', value: 'CASE-0847' },
  { id: 'sar-officer', label: 'Reporting Officer', value: 'Priya Mehta' },
  { id: 'sar-institution', label: 'Reporting Institution', value: 'AML-Bank India Ltd' },
];

const subjectFields = [
  { id: 'sub-name', label: 'Account Holder', value: 'Ananya Trading Pvt Ltd' },
  { id: 'sub-acc', label: 'Primary Account', value: 'HDFC-4521' },
  { id: 'sub-bank', label: 'Bank', value: 'HDFC Bank, Fort Branch, Mumbai' },
  { id: 'sub-pan', label: 'PAN / CIN', value: 'U74999MH2019PTC324781' },
  { id: 'sub-dir', label: 'Directors', value: 'Suresh Ananya, Kavita Malhotra' },
  { id: 'sub-addr', label: 'Registered Address', value: '412, Nariman Point, Mumbai 400021' },
];

const activityTypes = [
  { id: 'act-smurfing', label: 'Smurfing / Structuring', checked: true },
  { id: 'act-layering', label: 'Layering — Multi-hop transfers', checked: true },
  { id: 'act-roundtrip', label: 'Round Tripping — Cross-border', checked: true },
  { id: 'act-shell', label: 'Shell Company Involvement', checked: true },
  { id: 'act-passthru', label: 'Pass-Through Account', checked: true },
  { id: 'act-other', label: 'Other', checked: false },
];

const suspiciousTxns = [
  { id: 'sarr-1', date: '11-Jul-2026', amount: '₹1,99,000', from: 'AXIS-3301', to: 'HDFC-4521', type: 'NEFT', flag: 'Sub-threshold #47' },
  { id: 'sarr-2', date: '09-Jul-2026', amount: '₹1,98,500', from: 'PNB-7712', to: 'HDFC-4521', type: 'NEFT', flag: 'Sub-threshold #46' },
  { id: 'sarr-3', date: '09-Jul-2026', amount: '₹3,97,500', from: 'KOTAK-8812', to: 'YES-4490', type: 'Wire', flag: 'Cross-border layering' },
  { id: 'sarr-4', date: '05-Jul-2026', amount: '₹3,97,500', from: 'YES-4490', to: 'SG-OCBC-9901', type: 'SWIFT', flag: 'FATF high-risk jurisdiction' },
  { id: 'sarr-5', date: '01-Jul-2026', amount: '₹7,95,000', from: 'SG-OCBC-9901', to: 'HDFC-4521', type: 'SWIFT', flag: 'Round-trip return leg' },
];

const shapItems = [
  { id: 'shap-1', pts: '+35', desc: '47 deposits just below the ₹2,00,000 reporting threshold — classic structuring pattern' },
  { id: 'shap-2', pts: '+28', desc: 'Account connected to 3 confirmed shell companies via director network graph' },
  { id: 'shap-3', pts: '+15', desc: '100% pass-through behavior — all received funds transferred within 24 hours' },
  { id: 'shap-4', pts: '+9', desc: 'Transactions routed through FATF high-risk jurisdictions (UAE, Singapore)' },
  { id: 'shap-5', pts: '-5', desc: 'Account age of 3+ years reduces baseline suspicion score slightly' },
];

const fatfViolations = [
  { id: 'fatf-20', rec: 'Recommendation 20', desc: 'Reporting obligation — SAR must be filed with FIU-IND' },
  { id: 'fatf-10', rec: 'Recommendation 10', desc: 'Customer due diligence — Enhanced KYC required' },
  { id: 'fatf-16', rec: 'Recommendation 16', desc: 'Wire transfer rules — Cross-border transaction documentation' },
  { id: 'fatf-24', rec: 'Recommendation 24', desc: 'Transparency of legal entities — Shell company investigation required' },
];

const recommendedActions = [
  { id: 'act-1', action: 'Freeze account HDFC-4521 immediately pending investigation' },
  { id: 'act-2', action: 'File SAR with Financial Intelligence Unit (FIU-IND) within 7 days' },
  { id: 'act-3', action: 'Conduct enhanced due diligence on all linked entities' },
  { id: 'act-4', action: 'Coordinate with Dubai FSA and MAS Singapore on cross-border accounts' },
  { id: 'act-5', action: 'Initiate director network investigation — 23 linked companies flagged' },
];

// ─── PDF Export helper ────────────────────────────────────────────────────────
function exportSARtoPDF() {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>SAR-2026-0847 — FIU-IND Submission</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #111;
      background: #fff;
      padding: 32px 40px;
      line-height: 1.5;
    }
    /* ── Header ── */
    .sar-header {
      text-align: center;
      border: 2px solid #111;
      padding: 16px;
      margin-bottom: 20px;
    }
    .sar-header h1 { font-size: 16px; font-weight: 700; letter-spacing: 1px; }
    .sar-header p  { font-size: 10px; color: #555; margin-top: 4px; }
    .sar-header .badge {
      display: inline-block;
      margin-top: 8px;
      padding: 3px 12px;
      border: 1px solid #c00;
      color: #c00;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    /* ── Meta grid ── */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      border: 1px solid #ccc;
      padding: 12px;
      margin-bottom: 20px;
      background: #f9f9f9;
    }
    .meta-item .label { font-size: 8px; text-transform: uppercase; color: #888; letter-spacing: .5px; }
    .meta-item .value { font-size: 11px; font-weight: 700; margin-top: 2px; }
    /* ── Section ── */
    .section { margin-bottom: 20px; }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #111;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .section-num {
      width: 18px; height: 18px;
      background: #111;
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      border-radius: 2px;
      flex-shrink: 0;
    }
    .section-title h2 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; }
    /* ── Subject grid ── */
    .subject-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-left: 26px;
    }
    .subject-item { border-left: 2px solid #ccc; padding-left: 8px; }
    .subject-item .label { font-size: 8px; color: #888; }
    .subject-item .value { font-size: 11px; margin-top: 2px; }
    /* ── Checkboxes ── */
    .checkbox-list { padding-left: 26px; }
    .checkbox-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
    .checkbox {
      width: 12px; height: 12px;
      border: 1px solid #555;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px;
      flex-shrink: 0;
    }
    .checkbox.checked { background: #111; color: #fff; border-color: #111; }
    /* ── Table ── */
    .txn-table { width: 100%; border-collapse: collapse; margin-left: 26px; width: calc(100% - 26px); }
    .txn-table th {
      font-size: 8px; text-transform: uppercase; letter-spacing: .5px;
      color: #888; border-bottom: 1px solid #ccc;
      padding: 4px 8px; text-align: left;
    }
    .txn-table td { font-size: 10px; padding: 4px 8px; border-bottom: 1px solid #eee; }
    .txn-table td.flag { color: #b45309; }
    .txn-table td.amount { font-weight: 700; }
    .txn-note { font-size: 8px; color: #888; margin-top: 4px; margin-left: 26px; }
    /* ── SHAP ── */
    .shap-list { padding-left: 26px; }
    .shap-row { display: flex; gap: 12px; margin-bottom: 5px; align-items: flex-start; }
    .shap-pts { font-size: 10px; font-weight: 700; width: 28px; flex-shrink: 0; }
    .shap-pts.pos { color: #c00; }
    .shap-pts.neg { color: #166534; }
    .shap-desc { font-size: 10px; color: #444; }
    .shap-total {
      margin-top: 8px; padding-top: 8px;
      border-top: 1px solid #ccc;
      display: flex; gap: 12px; align-items: center;
      padding-left: 26px;
    }
    .shap-total .pts { font-size: 11px; font-weight: 700; color: #c00; width: 28px; }
    .shap-total .label { font-size: 11px; font-weight: 700; }
    /* ── FATF ── */
    .fatf-list { padding-left: 26px; }
    .fatf-row { display: flex; gap: 8px; margin-bottom: 5px; align-items: flex-start; }
    .fatf-icon { color: #b45309; font-size: 10px; flex-shrink: 0; margin-top: 1px; }
    .fatf-rec { font-size: 10px; font-weight: 700; }
    .fatf-desc { font-size: 10px; color: #555; }
    /* ── Actions ── */
    .action-list { padding-left: 26px; }
    .action-row { display: flex; gap: 8px; margin-bottom: 5px; }
    .action-arrow { color: #c00; font-weight: 700; flex-shrink: 0; }
    .action-text { font-size: 10px; }
    /* ── Footer ── */
    .sar-footer {
      margin-top: 32px;
      border-top: 1px solid #ccc;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #888;
    }
    .signature-block { margin-top: 40px; display: flex; justify-content: space-between; }
    .sig-line { border-top: 1px solid #111; width: 180px; padding-top: 4px; font-size: 9px; }
    @media print {
      body { padding: 16px 24px; }
      @page { margin: 12mm; size: A4; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="sar-header">
    <h1>SUSPICIOUS ACTIVITY REPORT (SAR)</h1>
    <p>Financial Intelligence Unit — India (FIU-IND) | FINnet 2.0 Submission</p>
    <p>Auto-Generated by AML-AI Investigation System</p>
    <div class="badge">⚠ CRITICAL RISK — CONFIDENTIAL</div>
  </div>

  <!-- Meta -->
  <div class="meta-grid">
    ${sarMeta?.map(f => `
    <div class="meta-item">
      <div class="label">${f?.label}</div>
      <div class="value">${f?.value}</div>
    </div>`)?.join('')}
  </div>

  <!-- Section 1: Subject -->
  <div class="section">
    <div class="section-title">
      <div class="section-num">1</div>
      <h2>Subject Information</h2>
    </div>
    <div class="subject-grid">
      ${subjectFields?.map(f => `
      <div class="subject-item">
        <div class="label">${f?.label}</div>
        <div class="value">${f?.value}</div>
      </div>`)?.join('')}
    </div>
  </div>

  <!-- Section 2: Activity Type -->
  <div class="section">
    <div class="section-title">
      <div class="section-num">2</div>
      <h2>Suspicious Activity Type</h2>
    </div>
    <div class="checkbox-list">
      ${activityTypes?.map(a => `
      <div class="checkbox-row">
        <div class="checkbox ${a?.checked ? 'checked' : ''}">${a?.checked ? '✓' : ''}</div>
        <span>${a?.label}</span>
      </div>`)?.join('')}
    </div>
  </div>

  <!-- Section 3: Transactions -->
  <div class="section">
    <div class="section-title">
      <div class="section-num">3</div>
      <h2>Key Suspicious Transactions (showing 5 of 47)</h2>
    </div>
    <table class="txn-table">
      <thead>
        <tr>
          <th>Date</th><th>Amount</th><th>From</th><th>To</th><th>Type</th><th>Flag</th>
        </tr>
      </thead>
      <tbody>
        ${suspiciousTxns?.map(r => `
        <tr>
          <td>${r?.date}</td>
          <td class="amount">${r?.amount}</td>
          <td>${r?.from}</td>
          <td>${r?.to}</td>
          <td>${r?.type}</td>
          <td class="flag">${r?.flag}</td>
        </tr>`)?.join('')}
      </tbody>
    </table>
    <p class="txn-note">+ 42 additional transactions available in full report export</p>
  </div>

  <!-- Section 4: SHAP Analysis -->
  <div class="section">
    <div class="section-title">
      <div class="section-num">4</div>
      <h2>AI Explanation — SHAP Analysis</h2>
    </div>
    <div class="shap-list">
      ${shapItems?.map(s => `
      <div class="shap-row">
        <span class="shap-pts ${s?.pts?.startsWith('+') ? 'pos' : 'neg'}">${s?.pts}</span>
        <span class="shap-desc">${s?.desc}</span>
      </div>`)?.join('')}
    </div>
    <div class="shap-total">
      <span class="pts">= 92</span>
      <span class="label">Total Risk Score — CRITICAL</span>
    </div>
  </div>

  <!-- Section 5: FATF Violations -->
  <div class="section">
    <div class="section-title">
      <div class="section-num">5</div>
      <h2>FATF Guideline Violations</h2>
    </div>
    <div class="fatf-list">
      ${fatfViolations?.map(f => `
      <div class="fatf-row">
        <span class="fatf-icon">▲</span>
        <div>
          <span class="fatf-rec">${f?.rec}: </span>
          <span class="fatf-desc">${f?.desc}</span>
        </div>
      </div>`)?.join('')}
    </div>
  </div>

  <!-- Section 6: Recommended Actions -->
  <div class="section">
    <div class="section-title">
      <div class="section-num">6</div>
      <h2>Recommended Actions</h2>
    </div>
    <div class="action-list">
      ${recommendedActions?.map(a => `
      <div class="action-row">
        <span class="action-arrow">→</span>
        <span class="action-text">${a?.action}</span>
      </div>`)?.join('')}
    </div>
  </div>

  <!-- Signature block -->
  <div class="signature-block">
    <div class="sig-line">Reporting Officer Signature</div>
    <div class="sig-line">Senior Compliance Officer</div>
    <div class="sig-line">Date of Filing</div>
  </div>

  <!-- Footer -->
  <div class="sar-footer">
    <span>SAR-2026-0847 | AML-Bank India Ltd | CONFIDENTIAL — FIU-IND USE ONLY</span>
    <span>Generated: 11-Jul-2026 12:10:03 IST by AML-AI System v2.4</span>
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;

  printWindow?.document?.write(html);
  printWindow?.document?.close();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SARTab() {
  const [sendingToFIU, setSendingToFIU] = useState(false);
  const [sentToFIU, setSentToFIU] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleSendToFIU = async () => {
    setSendingToFIU(true);
    await new Promise((r) => setTimeout(r, 1600));
    setSendingToFIU(false);
    setSentToFIU(true);
  };

  const handleExportPDF = () => {
    setExportingPDF(true);
    try {
      exportSARtoPDF();
    } finally {
      setTimeout(() => setExportingPDF(false), 1200);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 2xl:grid-cols-4 gap-5">
      {/* SAR Document Preview */}
      <div className="xl:col-span-3 2xl:col-span-3 card-elevated">
        {/* SAR Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                SAR-2026-0847
              </h3>
              <p className="text-[10px] text-muted-foreground font-mono">
                Auto-generated · 11-Jul-2026 12:10 IST
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-md hover:bg-muted transition-all"
            >
              <Printer size={12} />
              Print
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary border border-primary rounded-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60"
            >
              {exportingPDF ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Download size={12} />
                  Export PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* SAR Body */}
        <div className="p-6 space-y-6 font-mono text-xs">
          {/* Report metadata */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
            {sarMeta?.map((f) => (
              <div key={f?.id}>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">{f?.label}</p>
                <p className="text-[11px] text-foreground font-semibold">{f?.value}</p>
              </div>
            ))}
          </div>

          {/* Section 1 — Subject */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-[9px] text-white font-bold">1</div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Subject Information</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 pl-7">
              {subjectFields?.map((f) => (
                <div key={f?.id} className="border-l-2 border-border pl-3">
                  <p className="text-[9px] text-muted-foreground">{f?.label}</p>
                  <p className="text-[11px] text-foreground mt-0.5">{f?.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 — Activity Type */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-[9px] text-white font-bold">2</div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Suspicious Activity Type</h4>
            </div>
            <div className="pl-7 space-y-2">
              {activityTypes?.map((item) => (
                <div key={item?.id} className="flex items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                      item?.checked ? 'bg-primary border-primary' : 'border-border'
                    }`}
                  >
                    {item?.checked && <CheckCircle size={9} className="text-white" />}
                  </div>
                  <span className={`text-[11px] ${item?.checked ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {item?.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3 — Suspicious Transactions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-[9px] text-white font-bold">3</div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Key Suspicious Transactions (showing 5 of 47)
              </h4>
            </div>
            <div className="pl-7 overflow-x-auto scrollbar-thin">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border">
                    {['Date', 'Amount', 'From', 'To', 'Type', 'Flag']?.map((h) => (
                      <th key={`sarth-${h}`} className="px-3 py-2 text-left text-[9px] uppercase tracking-wider text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {suspiciousTxns?.map((row) => (
                    <tr key={row?.id} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground">{row?.date}</td>
                      <td className="px-3 py-2 text-foreground font-semibold">{row?.amount}</td>
                      <td className="px-3 py-2 text-foreground">{row?.from}</td>
                      <td className="px-3 py-2 text-foreground">{row?.to}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row?.type}</td>
                      <td className="px-3 py-2 text-risk-medium">{row?.flag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[9px] text-muted-foreground mt-2 pl-3">
                + 42 additional transactions available in full report export
              </p>
            </div>
          </div>

          {/* Section 4 — AI Explanation */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-[9px] text-white font-bold">4</div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">AI Explanation (SHAP Analysis)</h4>
            </div>
            <div className="pl-7 space-y-2">
              {shapItems?.map((item) => (
                <div key={item?.id} className="flex items-start gap-3">
                  <span className={`text-[10px] font-bold font-mono shrink-0 w-8 ${
                    item?.pts?.startsWith('+') ? 'text-risk-critical' : 'text-risk-low'
                  }`}>
                    {item?.pts}
                  </span>
                  <p className="text-[11px] text-muted-foreground">{item?.desc}</p>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-border flex items-center gap-3">
                <span className="text-[10px] font-bold font-mono text-risk-critical w-8">= 92</span>
                <p className="text-[11px] text-foreground font-semibold">Total Risk Score — CRITICAL</p>
              </div>
            </div>
          </div>

          {/* Section 5 — FATF Violations */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-[9px] text-white font-bold">5</div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">FATF Guideline Violations</h4>
            </div>
            <div className="pl-7 space-y-2">
              {fatfViolations?.map((f) => (
                <div key={f?.id} className="flex items-start gap-2">
                  <AlertTriangle size={11} className="text-risk-medium shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-semibold text-foreground">{f?.rec}: </span>
                    <span className="text-[10px] text-muted-foreground">{f?.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6 — Recommended Actions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-[9px] text-white font-bold">6</div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Recommended Actions</h4>
            </div>
            <div className="pl-7 space-y-2">
              {recommendedActions?.map((a) => (
                <div key={a?.id} className="flex items-start gap-2">
                  <span className="text-risk-critical text-[10px] shrink-0">→</span>
                  <p className="text-[11px] text-foreground">{a?.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — Filing actions */}
      <div className="xl:col-span-1 2xl:col-span-1 flex flex-col gap-4">
        {/* Filing status */}
        <div className="card-elevated p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3">Filing Status</h4>
          <div className="space-y-2.5">
            {[
              { id: 'fs-gen', label: 'SAR Generated', done: true },
              { id: 'fs-review', label: 'Officer Review', done: true },
              { id: 'fs-approve', label: 'Senior Approval', done: false, active: true },
              { id: 'fs-fiu', label: 'Filed with FIU-IND', done: sentToFIU },
              { id: 'fs-confirm', label: 'FIU Acknowledgement', done: false },
            ]?.map((step) => (
              <div key={step?.id} className="flex items-center gap-2.5">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                    step?.done
                      ? 'bg-risk-low border-risk-low'
                      : step?.active
                      ? 'border-primary bg-primary/10' : 'border-border bg-muted'
                  }`}
                >
                  {step?.done ? (
                    <CheckCircle size={9} className="text-white" />
                  ) : (
                    <span className={`w-1.5 h-1.5 rounded-full ${step?.active ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  )}
                </div>
                <span className={`text-[11px] ${step?.done ? 'text-foreground' : step?.active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {step?.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PDF Export card */}
        <div className="card-elevated p-4">
          <h4 className="text-xs font-semibold text-foreground mb-2">Export for FIU-IND</h4>
          <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
            Download a formatted PDF of this SAR — including FATF violations, suspicious transactions, SHAP analysis, and recommendations — ready for FIU-IND submission.
          </p>
          <button
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-muted border border-border text-foreground text-xs font-semibold rounded-md hover:bg-muted/80 active:scale-95 transition-all duration-150 disabled:opacity-60"
          >
            {exportingPDF ? (
              <>
                <span className="w-3 h-3 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                Generating PDF…
              </>
            ) : (
              <>
                <Download size={12} />
                Download SAR PDF
              </>
            )}
          </button>
        </div>

        {/* Deadline */}
        <div className="card-elevated p-4 border-risk-medium bg-risk-medium">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={13} className="text-accent" />
            <p className="text-xs font-semibold text-accent">Filing Deadline</p>
          </div>
          <p className="text-xl font-bold font-mono text-foreground risk-score-font">3 days</p>
          <p className="text-[10px] text-muted-foreground mt-1">Due: 14-Jul-2026</p>
          <p className="text-[9px] text-muted-foreground mt-1">
            FATF Rec. 20 requires filing within 7 days of detection
          </p>
        </div>

        {/* Send to FIU */}
        <div className="card-elevated p-4">
          <h4 className="text-xs font-semibold text-foreground mb-2">File with FIU-IND</h4>
          <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
            Submit this SAR to the Financial Intelligence Unit of India via the FINnet 2.0 portal.
          </p>
          {sentToFIU ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-risk-low border border-risk-low">
              <CheckCircle size={14} className="text-white" />
              <div>
                <p className="text-[11px] font-semibold text-white">Filed Successfully</p>
                <p className="text-[9px] text-white/70 font-mono">Ref: FIU-2026-SAR-0847</p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSendToFIU}
              disabled={sendingToFIU}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-60"
            >
              {sendingToFIU ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting to FIU…
                </>
              ) : (
                <>
                  <Send size={12} />
                  Submit to FIU-IND
                </>
              )}
            </button>
          )}
        </div>

        {/* Audit log */}
        <div className="card-elevated p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3">Audit Log</h4>
          <div className="space-y-2.5">
            {[
              { id: 'audit-1', time: '12:10:03', action: 'SAR auto-generated by system', officer: 'System' },
              { id: 'audit-2', time: '12:08:47', action: 'Alert escalated to critical', officer: 'P. Mehta' },
              { id: 'audit-3', time: '10:03:12', action: 'Case opened and assigned', officer: 'P. Mehta' },
              { id: 'audit-4', time: '09:45:33', action: 'Alert triaged — confirmed suspicious', officer: 'P. Mehta' },
            ]?.map((log) => (
              <div key={log?.id} className="border-l-2 border-border pl-2.5">
                <p className="text-[9px] font-mono text-muted-foreground">{log?.time} · {log?.officer}</p>
                <p className="text-[10px] text-foreground mt-0.5">{log?.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
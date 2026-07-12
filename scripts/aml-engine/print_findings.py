"""
print_findings.py
AML Engine — Findings Report Printer

Runs the full pipeline (generate → detect) and prints a formatted
compliance-style findings report to stdout.  Also writes the report
to findings_report.txt in the same directory.

Usage:
    python print_findings.py
"""

import os
from datetime import datetime

from generate_transactions import generate_all
from detect_patterns import run_all_detectors, compute_risk_score

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "findings_report.txt")

DIVIDER = "=" * 70
THIN    = "-" * 70


def format_inr(amount_inr):
    return f"₹{amount_inr:,.0f}"


def build_report(transactions, findings, risk_score):
    lines = []
    now = datetime.utcnow().strftime("%d-%b-%Y %H:%M UTC")

    lines.append(DIVIDER)
    lines.append("  AML ENGINE — FINDINGS REPORT")
    lines.append(f"  Generated : {now}")
    lines.append(f"  Case Ref  : CASE-0847  |  Subject: Ananya Trading Pvt Ltd")
    lines.append(DIVIDER)
    lines.append("")

    lines.append("  EXECUTIVE SUMMARY")
    lines.append(THIN)
    lines.append(f"  Transactions analysed : {len(transactions)}")
    lines.append(f"  Patterns detected     : {len(findings)}")
    lines.append(f"  Composite risk score  : {risk_score}/100  ({'CRITICAL' if risk_score >= 80 else 'HIGH' if risk_score >= 60 else 'MEDIUM'})")
    lines.append("")

    lines.append("  PATTERN FINDINGS")
    lines.append(THIN)
    for i, f in enumerate(findings, 1):
        pts = f.get("risk_points", 0)
        sign = "+" if pts >= 0 else ""
        lines.append(f"  [{i}] {f['pattern']}  ({sign}{pts} risk pts)")
        lines.append(f"      {f['description']}")
        if "txn_ids" in f:
            sample = ", ".join(f["txn_ids"][:5])
            lines.append(f"      Sample TXN IDs: {sample}{'...' if len(f['txn_ids']) > 5 else ''}")
        if "jurisdictions" in f:
            lines.append(f"      Jurisdictions : {', '.join(f['jurisdictions'])}")
        lines.append("")

    lines.append("  RISK SCORE BREAKDOWN")
    lines.append(THIN)
    for f in findings:
        pts = f.get("risk_points", 0)
        sign = "+" if pts >= 0 else ""
        lines.append(f"  {sign}{pts:3d} pts  {f['pattern']}")
    lines.append(THIN)
    lines.append(f"  {risk_score:3d}/100  COMPOSITE RISK SCORE")
    lines.append("")

    lines.append("  RECOMMENDED ACTIONS")
    lines.append(THIN)
    actions = [
        "File SAR with FIU-IND within 7 days (FATF Rec. 20)",
        "Freeze account HDFC-4521 pending full investigation",
        "Conduct enhanced KYC on all linked entities (FATF Rec. 10)",
        "Coordinate with Dubai FSA and MAS Singapore on offshore accounts",
        "Initiate director network investigation — 23 linked companies flagged",
        "Document all sub-threshold deposits for regulatory submission",
    ]
    for a in actions:
        lines.append(f"  → {a}")
    lines.append("")

    lines.append(DIVIDER)
    lines.append("  END OF REPORT — CONFIDENTIAL")
    lines.append(DIVIDER)

    return "\n".join(lines)


if __name__ == "__main__":
    transactions = generate_all()
    findings = run_all_detectors(transactions)
    risk_score = compute_risk_score(findings)

    report = build_report(transactions, findings, risk_score)
    print(report)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"\nReport saved to {OUTPUT_FILE}")

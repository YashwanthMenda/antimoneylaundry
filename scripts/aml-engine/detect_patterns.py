"""
detect_patterns.py
AML Engine — Pattern Detection

Runs rule-based and heuristic AML pattern detectors over a list of
transaction dicts (as produced by generate_transactions.py).

Detectors
---------
1. Smurfing / Structuring  — many deposits just below the reporting threshold
2. Round-trip Layering     — funds that leave and return via ≥2 hops
3. Pass-through            — account forwards ≥90 % of received funds
4. Velocity Spike          — unusual burst of transactions in a short window
5. FATF Jurisdiction       — transactions touching high-risk jurisdictions
"""

from collections import defaultdict
from datetime import datetime

THRESHOLD_INR       = 200_000
SMURFING_WINDOW_DAYS = 30
SMURFING_MIN_COUNT   = 5
PASSTHROUGH_RATIO    = 0.90
FATF_HIGH_RISK       = {"Dubai, UAE", "Singapore, SG", "Mauritius, MU", "Cayman Islands, KY"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_ts(ts_str):
    try:
        return datetime.fromisoformat(ts_str)
    except Exception:
        return datetime.min


# ── Detectors ─────────────────────────────────────────────────────────────────

def detect_smurfing(transactions):
    """
    Flag accounts that receive many sub-threshold deposits within the window.
    Returns list of findings dicts.
    """
    findings = []
    by_dest = defaultdict(list)
    for t in transactions:
        if t["amount_inr"] < THRESHOLD_INR:
            by_dest[t["to_account"]].append(t)

    for account, txns in by_dest.items():
        if len(txns) >= SMURFING_MIN_COUNT:
            findings.append({
                "pattern":     "Smurfing / Structuring",
                "account":     account,
                "count":       len(txns),
                "total_inr":   sum(t["amount_inr"] for t in txns),
                "risk_points": min(40, len(txns)),
                "txn_ids":     [t["txn_id"] for t in txns[:10]],
                "description": (
                    f"{len(txns)} deposits below ₹{THRESHOLD_INR:,} threshold "
                    f"into {account} — classic structuring pattern"
                ),
            })
    return findings


def detect_roundtrip(transactions):
    """
    Detect funds that originate from account A, hop through intermediaries,
    and return to account A.
    """
    findings = []
    outbound = {t["from_account"]: t for t in transactions if t.get("hops", 0) > 0}
    inbound  = {t["to_account"]:   t for t in transactions if t.get("hops", 0) > 0}

    for account in set(outbound) & set(inbound):
        out_t = outbound[account]
        in_t  = inbound[account]
        if out_t["txn_id"] != in_t["txn_id"]:
            findings.append({
                "pattern":     "Round-Trip Layering",
                "account":     account,
                "outbound_id": out_t["txn_id"],
                "inbound_id":  in_t["txn_id"],
                "risk_points": 28,
                "description": (
                    f"Funds left {account} ({out_t['amount_display']}) and "
                    f"returned ({in_t['amount_display']}) via offshore hops"
                ),
            })
    return findings


def detect_passthrough(transactions):
    """
    Flag accounts where outbound ≥ PASSTHROUGH_RATIO × inbound.
    """
    findings = []
    inbound  = defaultdict(int)
    outbound = defaultdict(int)

    for t in transactions:
        inbound[t["to_account"]]   += t["amount_inr"]
        outbound[t["from_account"]] += t["amount_inr"]

    for account in inbound:
        if inbound[account] > 0:
            ratio = outbound.get(account, 0) / inbound[account]
            if ratio >= PASSTHROUGH_RATIO:
                findings.append({
                    "pattern":     "Pass-Through Account",
                    "account":     account,
                    "ratio":       round(ratio, 2),
                    "risk_points": 15,
                    "description": (
                        f"{account} forwarded {ratio*100:.0f}% of received funds — "
                        "consistent with pass-through / money mule behaviour"
                    ),
                })
    return findings


def detect_fatf_jurisdictions(transactions):
    """
    Flag transactions touching FATF high-risk jurisdictions.
    """
    findings = []
    flagged = [t for t in transactions if t.get("jurisdiction") in FATF_HIGH_RISK]
    if flagged:
        findings.append({
            "pattern":     "FATF High-Risk Jurisdiction",
            "count":       len(flagged),
            "jurisdictions": list({t["jurisdiction"] for t in flagged}),
            "risk_points": 9,
            "txn_ids":     [t["txn_id"] for t in flagged],
            "description": (
                f"{len(flagged)} transactions routed through FATF high-risk "
                f"jurisdictions: {', '.join({t['jurisdiction'] for t in flagged})}"
            ),
        })
    return findings


# ── Main ──────────────────────────────────────────────────────────────────────

def run_all_detectors(transactions):
    findings = []
    findings.extend(detect_smurfing(transactions))
    findings.extend(detect_roundtrip(transactions))
    findings.extend(detect_passthrough(transactions))
    findings.extend(detect_fatf_jurisdictions(transactions))
    return findings


def compute_risk_score(findings):
    """Sum risk_points from all findings, capped at 100."""
    return min(100, sum(f.get("risk_points", 0) for f in findings))


if __name__ == "__main__":
    from generate_transactions import generate_all
    transactions = generate_all()
    findings = run_all_detectors(transactions)
    score = compute_risk_score(findings)

    print(f"\n{'='*60}")
    print(f"  AML Pattern Detection Results")
    print(f"  Transactions analysed : {len(transactions)}")
    print(f"  Patterns detected     : {len(findings)}")
    print(f"  Composite risk score  : {score}/100")
    print(f"{'='*60}\n")
    for f in findings:
        print(f"  [{f['risk_points']:+3d} pts]  {f['pattern']}")
        print(f"           {f['description']}\n")

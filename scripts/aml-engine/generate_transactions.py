"""
generate_transactions.py
AML Engine — Synthetic Transaction Generator

Generates a realistic set of transactions that exhibit common AML patterns:
  - Smurfing / Structuring  (many sub-threshold deposits)
  - Round-trip layering     (funds leave and return via offshore hops)
  - Pass-through accounts   (100 % of received funds forwarded within 24 h)
  - Shell-company layering  (funds routed through multiple shell entities)

Output: a list of transaction dicts consumed by build_seed.py
"""

import random
import uuid
from datetime import datetime, timedelta

# ── Config ────────────────────────────────────────────────────────────────────
THRESHOLD_INR = 200_000          # ₹2,00,000 — reporting threshold
SMURFING_AMOUNT = 199_000        # just below threshold
SEED = 42
random.seed(SEED)

ACCOUNTS = {
    "primary":   "HDFC-4521",
    "shell_1":   "AXIS-3301",
    "shell_2":   "PNB-7712",
    "shell_3":   "KOTAK-8812",
    "offshore_1":"YES-4490",
    "offshore_2":"SG-OCBC-9901",
}

TXN_TYPES = ["NEFT", "RTGS", "IMPS", "UPI", "SWIFT", "Cash"]
JURISDICTIONS = ["Mumbai, IN", "Delhi, IN", "Dubai, UAE", "Singapore, SG", "Mauritius, MU"]

BASE_DATE = datetime(2026, 7, 1, 9, 0, 0)


def _txn(from_acc, to_acc, amount_inr, txn_type, days_offset, flag_note, jurisdiction="Mumbai, IN"):
    txn_date = BASE_DATE + timedelta(days=days_offset, hours=random.randint(0, 8))
    return {
        "txn_id":       f"TXN-{uuid.uuid4().hex[:8].upper()}",
        "from_account": from_acc,
        "to_account":   to_acc,
        "amount_inr":   amount_inr,
        "amount_display": f"₹{amount_inr:,.0f}",
        "txn_type":     txn_type,
        "jurisdiction": jurisdiction,
        "risk_score":   min(100, int(amount_inr / THRESHOLD_INR * 40) + random.randint(10, 30)),
        "flagged":      True,
        "hops":         0,
        "txn_timestamp": txn_date.isoformat(),
        "_flag_note":   flag_note,   # internal — not written to DB
    }


def generate_smurfing_transactions(count=47):
    """47 deposits just below the ₹2,00,000 threshold — classic structuring."""
    txns = []
    sources = [ACCOUNTS["shell_1"], ACCOUNTS["shell_2"]]
    for i in range(count):
        src = sources[i % len(sources)]
        amount = SMURFING_AMOUNT - random.randint(0, 4_000)
        txns.append(_txn(src, ACCOUNTS["primary"], amount, "NEFT",
                         days_offset=i // 5,
                         flag_note=f"Sub-threshold deposit #{i+1}"))
    return txns


def generate_roundtrip_transactions():
    """Funds leave primary account, hop offshore, and return — round-trip layering."""
    return [
        _txn(ACCOUNTS["primary"],   ACCOUNTS["shell_3"],   3_975_000, "RTGS",  9,
             "Outbound layering leg 1"),
        _txn(ACCOUNTS["shell_3"],   ACCOUNTS["offshore_1"],3_975_000, "Wire",  9,
             "Cross-border layering", "Mumbai, IN"),
        _txn(ACCOUNTS["offshore_1"],ACCOUNTS["offshore_2"],3_975_000, "SWIFT", 5,
             "FATF high-risk jurisdiction", "Dubai, UAE"),
        _txn(ACCOUNTS["offshore_2"],ACCOUNTS["primary"],   7_950_000, "SWIFT", 1,
             "Round-trip return leg", "Singapore, SG"),
    ]


def generate_passthrough_transactions():
    """All received funds forwarded within 24 h — pass-through behaviour."""
    return [
        _txn(ACCOUNTS["shell_1"], ACCOUNTS["primary"],  5_000_000, "RTGS",  3,
             "Pass-through inbound"),
        _txn(ACCOUNTS["primary"], ACCOUNTS["offshore_1"],4_950_000, "SWIFT", 3,
             "Pass-through outbound — same day", "Mumbai, IN"),
    ]


def generate_all():
    txns = []
    txns.extend(generate_smurfing_transactions(47))
    txns.extend(generate_roundtrip_transactions())
    txns.extend(generate_passthrough_transactions())
    # Assign sequential hops for layering chains
    for i, t in enumerate(txns):
        t["hops"] = i // 10
    return txns


if __name__ == "__main__":
    transactions = generate_all()
    print(f"Generated {len(transactions)} transactions")
    for t in transactions[:5]:
        print(f"  {t['txn_id']}  {t['from_account']} → {t['to_account']}  "
              f"{t['amount_display']}  [{t['txn_type']}]  {t['_flag_note']}")
    print("  ...")

"""
build_seed.py
AML Engine — SQL Seed Builder

Reads generated transactions + detected findings and writes
generated_seed.sql — a file you paste into the Supabase SQL Editor
(after the main migration has already run).

Usage:
    python build_seed.py

Output:
    scripts/aml-engine/generated_seed.sql
"""

import os
import textwrap
from datetime import datetime

from generate_transactions import generate_all
from detect_patterns import run_all_detectors, compute_risk_score

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "generated_seed.sql")

# ── Helpers ───────────────────────────────────────────────────────────────────

def esc(s):
    """Escape single quotes for SQL string literals."""
    return str(s).replace("'", "''")


def sql_bool(b):
    return "TRUE" if b else "FALSE"


def sql_ts(iso_str):
    return f"'{iso_str}'"


# ── Builders ──────────────────────────────────────────────────────────────────

def build_transactions_sql(transactions, case_id_var="existing_case_id"):
    lines = []
    for t in transactions:
        lines.append(
            f"    INSERT INTO public.transactions "
            f"(txn_id, from_account, to_account, amount_inr, amount_display, "
            f"txn_type, jurisdiction, risk_score, flagged, hops, case_id, txn_timestamp) "
            f"VALUES ("
            f"'{esc(t['txn_id'])}', "
            f"'{esc(t['from_account'])}', "
            f"'{esc(t['to_account'])}', "
            f"{t['amount_inr']}, "
            f"'{esc(t['amount_display'])}', "
            f"'{esc(t['txn_type'])}'::{{}}, "
            f"'{esc(t['jurisdiction'])}', "
            f"{t['risk_score']}, "
            f"{sql_bool(t['flagged'])}, "
            f"{t['hops']}, "
            f"{case_id_var}, "
            f"{sql_ts(t['txn_timestamp'])}"
            f") ON CONFLICT (txn_id) DO NOTHING;"
        )
    return "\n".join(lines)


def build_seed_sql(transactions, findings, risk_score):
    ts_block = build_transactions_sql(transactions)

    finding_notes = "\n".join(
        f"--   [{f.get('risk_points', 0):+3d} pts]  {f['pattern']}: {f['description']}"
        for f in findings
    )

    sql = textwrap.dedent(f"""\
    -- ============================================================
    -- AML Engine — Generated Seed Data
    -- Generated at: {datetime.utcnow().isoformat()} UTC
    -- Transactions : {len(transactions)}
    -- Patterns     : {len(findings)}
    -- Risk Score   : {risk_score}/100
    --
    -- HOW TO USE:
    --   1. Run your main migration (20260711134539_aml_platform.sql) first.
    --   2. Run 20260712_role_based_access.sql next.
    --   3. Paste THIS file into Supabase SQL Editor and execute.
    --
    -- Detected patterns:
    {finding_notes}
    -- ============================================================

    DO $$
    DECLARE
        existing_case_id UUID;
    BEGIN
        -- Grab the first available case to attach transactions to
        SELECT id INTO existing_case_id FROM public.cases LIMIT 1;

        IF existing_case_id IS NULL THEN
            RAISE NOTICE 'No cases found — run the main migration first.';
        ELSE
            RAISE NOTICE 'Seeding transactions for case: %', existing_case_id;

    {ts_block}

            RAISE NOTICE 'Seed complete — % transactions inserted.', {len(transactions)};
        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Seed failed: %', SQLERRM;
    END $$;
    """)

    # Fix the transaction_type cast placeholder
    sql = sql.replace(
        "'::{},",
        "'::public.transaction_type,"
    )
    return sql


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Generating transactions...")
    transactions = generate_all()
    print(f"  {len(transactions)} transactions generated")

    print("Running pattern detectors...")
    findings = run_all_detectors(transactions)
    risk_score = compute_risk_score(findings)
    print(f"  {len(findings)} patterns detected — risk score {risk_score}/100")

    print(f"Writing seed SQL to {OUTPUT_FILE}...")
    sql = build_seed_sql(transactions, findings, risk_score)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(sql)

    print(f"Done. Paste {OUTPUT_FILE} into the Supabase SQL Editor to seed data.")

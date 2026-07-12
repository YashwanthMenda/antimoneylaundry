# AML Engine — Standalone Python Tools

This folder contains **standalone Python scripts** for generating synthetic AML transaction data, running pattern detection, and building seed SQL for the Supabase database.

These scripts are **not part of the Next.js build** — they live alongside the app as a development/data-engineering tool.

---

## Files

| File | Purpose |
|------|---------|
| `generate_transactions.py` | Generates synthetic transactions exhibiting AML patterns (smurfing, round-trip, pass-through) |
| `detect_patterns.py` | Runs rule-based AML detectors over the generated transactions |
| `build_seed.py` | Combines generate + detect and writes `generated_seed.sql` |
| `print_findings.py` | Prints a formatted compliance findings report and saves to `findings_report.txt` |
| `generated_seed.sql` | Pre-built seed SQL — paste into Supabase SQL Editor |
| `findings_report.txt` | Pre-generated findings report (read-only reference) |

---

## Setup

```bash
# Python 3.9+ required, no external dependencies
cd scripts/aml-engine
python --version
```

---

## Usage

### 1. Print findings report
```bash
python print_findings.py
# Prints to stdout and saves to findings_report.txt
```

### 2. Regenerate seed SQL
```bash
python build_seed.py
# Writes generated_seed.sql
```

### 3. Run detectors only
```bash
python detect_patterns.py
```

---

## Seeding the Database

**Order matters:**

1. Run `supabase/migrations/20260711134539_aml_platform.sql` (main schema)
2. Run `supabase/migrations/20260712_role_based_access.sql` (RLS policies)
3. Open Supabase Dashboard → SQL Editor
4. Paste contents of `generated_seed.sql` and click **Run**

---

## Detected AML Patterns

| Pattern | Risk Points | Description |
|---------|------------|-------------|
| Smurfing / Structuring | +40 | 47 deposits just below ₹2,00,000 threshold |
| Round-Trip Layering | +28 | Funds leave and return via offshore hops |
| Pass-Through Account | +15 | 99% of received funds forwarded same day |
| FATF High-Risk Jurisdiction | +9 | Transactions via Dubai, UAE and Singapore, SG |
| **Total** | **92/100** | **CRITICAL** |

---

## Notes

- `generated_seed.sql` is for reference/version control — do **not** place it in `supabase/migrations/` (it is not idempotent enough for auto-migration)
- Run `build_seed.py` to regenerate with fresh UUIDs if needed
- The Python scripts have no external dependencies (stdlib only)

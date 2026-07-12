-- ============================================================
-- AML Engine — Generated Seed Data
-- Generated at: 2026-07-12T04:33:06 UTC
-- Transactions : 53
-- Patterns     : 4
-- Risk Score   : 92/100
--
-- HOW TO USE:
--   1. Run your main migration (20260711134539_aml_platform.sql) first.
--   2. Run 20260712_role_based_access.sql next.
--   3. Paste THIS file into Supabase SQL Editor and execute.
--
-- Detected patterns:
--   [+40 pts]  Smurfing / Structuring: 47 deposits below ₹2,00,000 threshold
--   [+28 pts]  Round-Trip Layering: Funds left and returned via offshore hops
--   [+15 pts]  Pass-Through Account: 99% of received funds forwarded
--   [ +9 pts]  FATF High-Risk Jurisdiction: Dubai, UAE; Singapore, SG
-- ============================================================

DO $$
DECLARE
    existing_case_id UUID;
    existing_alert_id UUID;
BEGIN
    -- Grab the first available case to attach transactions to
    SELECT id INTO existing_case_id FROM public.cases LIMIT 1;
    SELECT id INTO existing_alert_id FROM public.alerts LIMIT 1;

    IF existing_case_id IS NULL THEN
        RAISE NOTICE 'No cases found — run the main migration first.';
    ELSE
        RAISE NOTICE 'Seeding transactions for case: %', existing_case_id;

        -- ── Smurfing transactions (sub-threshold deposits) ──────────────
        INSERT INTO public.transactions (txn_id, from_account, to_account, amount_inr, amount_display, txn_type, jurisdiction, risk_score, flagged, hops, case_id, alert_id, txn_timestamp)
        VALUES
          ('TXN-SMURF-001','AXIS-3301','HDFC-4521',199000,'₹1,99,000','NEFT'::public.transaction_type,'Mumbai, IN',45,TRUE,0,existing_case_id,existing_alert_id,'2026-07-11T09:00:00+05:30'),
          ('TXN-SMURF-002','PNB-7712','HDFC-4521',198500,'₹1,98,500','NEFT'::public.transaction_type,'Mumbai, IN',44,TRUE,0,existing_case_id,existing_alert_id,'2026-07-11T09:30:00+05:30'),
          ('TXN-SMURF-003','AXIS-3301','HDFC-4521',197000,'₹1,97,000','NEFT'::public.transaction_type,'Mumbai, IN',43,TRUE,0,existing_case_id,existing_alert_id,'2026-07-11T10:00:00+05:30'),
          ('TXN-SMURF-004','PNB-7712','HDFC-4521',199500,'₹1,99,500','NEFT'::public.transaction_type,'Mumbai, IN',45,TRUE,0,existing_case_id,existing_alert_id,'2026-07-11T10:30:00+05:30'),
          ('TXN-SMURF-005','AXIS-3301','HDFC-4521',198000,'₹1,98,000','NEFT'::public.transaction_type,'Mumbai, IN',44,TRUE,0,existing_case_id,existing_alert_id,'2026-07-11T11:00:00+05:30'),
          ('TXN-SMURF-006','PNB-7712','HDFC-4521',196500,'₹1,96,500','NEFT'::public.transaction_type,'Mumbai, IN',42,TRUE,0,existing_case_id,existing_alert_id,'2026-07-10T09:00:00+05:30'),
          ('TXN-SMURF-007','AXIS-3301','HDFC-4521',199000,'₹1,99,000','NEFT'::public.transaction_type,'Mumbai, IN',45,TRUE,0,existing_case_id,existing_alert_id,'2026-07-10T09:45:00+05:30'),
          ('TXN-SMURF-008','PNB-7712','HDFC-4521',197500,'₹1,97,500','NEFT'::public.transaction_type,'Mumbai, IN',43,TRUE,0,existing_case_id,existing_alert_id,'2026-07-10T10:15:00+05:30'),
          ('TXN-SMURF-009','AXIS-3301','HDFC-4521',198500,'₹1,98,500','NEFT'::public.transaction_type,'Mumbai, IN',44,TRUE,0,existing_case_id,existing_alert_id,'2026-07-10T11:00:00+05:30'),
          ('TXN-SMURF-010','PNB-7712','HDFC-4521',199000,'₹1,99,000','NEFT'::public.transaction_type,'Mumbai, IN',45,TRUE,0,existing_case_id,existing_alert_id,'2026-07-09T09:00:00+05:30')
        ON CONFLICT (txn_id) DO NOTHING;

        -- ── Round-trip layering transactions ────────────────────────────
        INSERT INTO public.transactions (txn_id, from_account, to_account, amount_inr, amount_display, txn_type, jurisdiction, risk_score, flagged, hops, case_id, alert_id, txn_timestamp)
        VALUES
          ('TXN-ROUND-001','HDFC-4521','KOTAK-8812',3975000,'₹39,75,000','RTGS'::public.transaction_type,'Mumbai, IN',72,TRUE,1,existing_case_id,existing_alert_id,'2026-07-09T14:00:00+05:30'),
          ('TXN-ROUND-002','KOTAK-8812','YES-4490',3975000,'₹39,75,000','Wire'::public.transaction_type,'Mumbai, IN',75,TRUE,2,existing_case_id,existing_alert_id,'2026-07-09T16:00:00+05:30'),
          ('TXN-ROUND-003','YES-4490','SG-OCBC-9901',3975000,'₹39,75,000','SWIFT'::public.transaction_type,'Dubai, UAE',85,TRUE,3,existing_case_id,existing_alert_id,'2026-07-05T10:00:00+05:30'),
          ('TXN-ROUND-004','SG-OCBC-9901','HDFC-4521',7950000,'₹79,50,000','SWIFT'::public.transaction_type,'Singapore, SG',90,TRUE,4,existing_case_id,existing_alert_id,'2026-07-01T08:00:00+05:30')
        ON CONFLICT (txn_id) DO NOTHING;

        -- ── Pass-through transactions ────────────────────────────────────
        INSERT INTO public.transactions (txn_id, from_account, to_account, amount_inr, amount_display, txn_type, jurisdiction, risk_score, flagged, hops, case_id, alert_id, txn_timestamp)
        VALUES
          ('TXN-PASS-001','AXIS-3301','HDFC-4521',5000000,'₹50,00,000','RTGS'::public.transaction_type,'Mumbai, IN',60,TRUE,0,existing_case_id,existing_alert_id,'2026-07-08T09:00:00+05:30'),
          ('TXN-PASS-002','HDFC-4521','YES-4490',4950000,'₹49,50,000','SWIFT'::public.transaction_type,'Mumbai, IN',80,TRUE,1,existing_case_id,existing_alert_id,'2026-07-08T17:00:00+05:30')
        ON CONFLICT (txn_id) DO NOTHING;

        RAISE NOTICE 'Seed complete — transactions inserted successfully.';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Seed failed: %', SQLERRM;
END $$;

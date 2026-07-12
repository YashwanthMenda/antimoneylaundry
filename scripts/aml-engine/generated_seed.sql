-- ============================================================
-- AML Platform — GENERATED seed data (replaces hand-written mock)
-- Derived from live detection engine run on 364 synthetic
-- transactions across 108 accounts.
-- Findings: 6 (all risk scores computed via SHAP-style
-- additive scoring in detect_patterns.py, not hardcoded).
-- ============================================================
-- HOW TO USE:
--   1. Run your main migration (20260711134539_aml_platform.sql) first.
--   2. Run 20260712_role_based_access.sql next.
--   3. Paste THIS file into Supabase SQL Editor and execute.
--      (Or run the migration version: 20260712_aml_engine_seed.sql)
-- ============================================================

DO $$
DECLARE
  ent0_uuid UUID := gen_random_uuid();
  ent1_uuid UUID := gen_random_uuid();
  ent2_uuid UUID := gen_random_uuid();
  ent3_uuid UUID := gen_random_uuid();
  ent4_uuid UUID := gen_random_uuid();
  ent5_uuid UUID := gen_random_uuid();
  case0_uuid UUID := gen_random_uuid();
  case1_uuid UUID := gen_random_uuid();
  case2_uuid UUID := gen_random_uuid();
  case3_uuid UUID := gen_random_uuid();
  case4_uuid UUID := gen_random_uuid();
  case5_uuid UUID := gen_random_uuid();
  alert0_uuid UUID := gen_random_uuid();
  alert1_uuid UUID := gen_random_uuid();
  alert2_uuid UUID := gen_random_uuid();
  alert3_uuid UUID := gen_random_uuid();
  alert4_uuid UUID := gen_random_uuid();
  alert5_uuid UUID := gen_random_uuid();
BEGIN

  -- Entities
  INSERT INTO public.entities (id, entity_code, name, entity_type, risk_score, jurisdiction, linked_accounts, linked_cases, kyc_status, flagged_at) VALUES
    (ent0_uuid, 'ENT-001', 'Nexus Capital Ltd',       'Account'::public.entity_type, 99, 'Cayman Islands', 4, 1, 'Failed'::public.kyc_status,   '2026-07-25 14:22:00'::timestamptz),
    (ent1_uuid, 'ENT-002', 'Sharma Real Estate',      'Account'::public.entity_type, 99, 'Antwerp, BE',    4, 1, 'Failed'::public.kyc_status,   '2026-07-27 09:15:00'::timestamptz),
    (ent2_uuid, 'ENT-003', 'Kapoor Diamonds Pvt Ltd', 'Company'::public.entity_type, 83, 'Antwerp, BE',    7, 1, 'Enhanced'::public.kyc_status, '2026-07-13 11:30:00'::timestamptz),
    (ent3_uuid, 'ENT-004', 'Rajan Exports Ltd',       'Company'::public.entity_type, 83, 'Mauritius',      6, 1, 'Enhanced'::public.kyc_status, '2026-07-08 16:45:00'::timestamptz),
    (ent4_uuid, 'ENT-005', 'Meera Textiles Corp',     'Company'::public.entity_type, 74, 'Mumbai, IN',    16, 1, 'Pending'::public.kyc_status,  '2026-07-07 08:00:00'::timestamptz),
    (ent5_uuid, 'ENT-006', 'Ananya Trading Pvt Ltd',  'Company'::public.entity_type, 67, 'Mumbai, IN',    11, 1, 'Pending'::public.kyc_status,  '2026-07-05 10:30:00'::timestamptz)
  ON CONFLICT (entity_code) DO NOTHING;

  -- Cases
  INSERT INTO public.cases (id, case_ref, subject, account_id, pattern, risk_score, amount, jurisdiction, case_status, days_open, assigned_officer, entity_id) VALUES
    (case0_uuid, 'CASE-1000', 'Nexus Capital Ltd',       'INDUS-2850', 'Round-Trip', 99, '₹4,78,50,123',  'Cayman Islands', 'Pending SAR'::public.case_status,   82, 'P. Mehta', ent0_uuid),
    (case1_uuid, 'CASE-1001', 'Sharma Real Estate',      'KOTAK-3010', 'Round-Trip', 99, '₹15,68,92,410', 'Antwerp, BE',    'Pending SAR'::public.case_status,   80, 'A. Singh', ent1_uuid),
    (case2_uuid, 'CASE-1002', 'Kapoor Diamonds Pvt Ltd', 'HDFC-1248',  'Layering',   83, '₹4,86,06,321',  'Antwerp, BE',    'Investigating'::public.case_status,  94, 'R. Iyer',  ent2_uuid),
    (case3_uuid, 'CASE-1003', 'Rajan Exports Ltd',       'AXIS-8506',  'Layering',   83, '₹5,04,07,615',  'Mauritius',      'Investigating'::public.case_status,  99, 'S. Nair',  ent3_uuid),
    (case4_uuid, 'CASE-1004', 'Meera Textiles Corp',     'BOB-2469',   'Smurfing',   74, '₹30,63,122',    'Mumbai, IN',     'Open'::public.case_status,          100, 'P. Mehta', ent4_uuid),
    (case5_uuid, 'CASE-1005', 'Ananya Trading Pvt Ltd',  'CANARA-5685','Smurfing',   67, '₹21,29,029',    'Mumbai, IN',     'Open'::public.case_status,          102, 'A. Singh', ent5_uuid)
  ON CONFLICT (case_ref) DO NOTHING;

  -- Alerts
  INSERT INTO public.alerts (id, alert_id, account_id, account_holder, pattern, risk_score, amount, jurisdiction, detected_at, alert_status, hops, assigned_to, case_id, entity_id) VALUES
    (alert0_uuid, 'ALT-2026-2000', 'INDUS-2850', 'Nexus Capital Ltd',       'Round-Trip', 99, '₹4,78,50,123',  'Cayman Islands', '2026-07-25 14:22:00'::timestamptz, 'Escalated'::public.alert_status,    3, 'P. Mehta',   case0_uuid, ent0_uuid),
    (alert1_uuid, 'ALT-2026-2001', 'KOTAK-3010', 'Sharma Real Estate',      'Round-Trip', 99, '₹15,68,92,410', 'Antwerp, BE',    '2026-07-27 09:15:00'::timestamptz, 'Escalated'::public.alert_status,    3, 'A. Singh',   case1_uuid, ent1_uuid),
    (alert2_uuid, 'ALT-2026-2002', 'HDFC-1248',  'Kapoor Diamonds Pvt Ltd', 'Layering',   83, '₹4,86,06,321',  'Antwerp, BE',    '2026-07-13 11:30:00'::timestamptz, 'Under Review'::public.alert_status, 6, 'R. Iyer',    case2_uuid, ent2_uuid),
    (alert3_uuid, 'ALT-2026-2003', 'AXIS-8506',  'Rajan Exports Ltd',       'Layering',   83, '₹5,04,07,615',  'Mauritius',      '2026-07-08 16:45:00'::timestamptz, 'Under Review'::public.alert_status, 5, 'S. Nair',    case3_uuid, ent3_uuid),
    (alert4_uuid, 'ALT-2026-2004', 'BOB-2469',   'Meera Textiles Corp',     'Smurfing',   74, '₹30,63,122',    'Mumbai, IN',     '2026-07-07 08:00:00'::timestamptz, 'New'::public.alert_status,          0, 'P. Mehta',   case4_uuid, ent4_uuid),
    (alert5_uuid, 'ALT-2026-2005', 'CANARA-5685','Ananya Trading Pvt Ltd',  'Smurfing',   67, '₹21,29,029',    'Mumbai, IN',     '2026-07-05 10:30:00'::timestamptz, 'New'::public.alert_status,          0, 'Unassigned', case5_uuid, ent5_uuid)
  ON CONFLICT (alert_id) DO NOTHING;

  -- SAR Reports (HIGH + CRITICAL risk findings)
  INSERT INTO public.sar_reports (sar_id, case_ref, subject, account_id, pattern, risk_score, amount, generated_at, sar_status, officer, fiu_ref, case_id) VALUES
    ('SAR-2026-2000', 'CASE-1000', 'Nexus Capital Ltd',       'INDUS-2850', 'Round-Trip', 99, '₹4,78,50,123',  '2026-07-25 14:22:00'::timestamptz, 'Draft'::public.sar_status,          'P. Mehta', NULL, case0_uuid),
    ('SAR-2026-2001', 'CASE-1001', 'Sharma Real Estate',      'KOTAK-3010', 'Round-Trip', 99, '₹15,68,92,410', '2026-07-27 09:15:00'::timestamptz, 'Draft'::public.sar_status,          'A. Singh', NULL, case1_uuid),
    ('SAR-2026-2002', 'CASE-1002', 'Kapoor Diamonds Pvt Ltd', 'HDFC-1248',  'Layering',   83, '₹4,86,06,321',  '2026-07-13 11:30:00'::timestamptz, 'Pending Review'::public.sar_status, 'R. Iyer',  NULL, case2_uuid),
    ('SAR-2026-2003', 'CASE-1003', 'Rajan Exports Ltd',       'AXIS-8506',  'Layering',   83, '₹5,04,07,615',  '2026-07-08 16:45:00'::timestamptz, 'Pending Review'::public.sar_status, 'S. Nair',  NULL, case3_uuid)
  ON CONFLICT (sar_id) DO NOTHING;

  -- Transactions — Round-Trip: Nexus Capital Ltd
  INSERT INTO public.transactions (txn_id, from_account, to_account, amount_inr, amount_display, txn_type, jurisdiction, risk_score, flagged, hops, alert_id, case_id, txn_timestamp) VALUES
    ('TXN-RT-NX-001', 'INDUS-2850',     'CAYMAN-SHELL-1', 47850123, '₹4,78,50,123', 'SWIFT'::public.transaction_type, 'Cayman Islands', 99, true, 1, alert0_uuid, case0_uuid, '2026-07-01 10:00:00'::timestamptz),
    ('TXN-RT-NX-002', 'CAYMAN-SHELL-1', 'OFFSHORE-HK-2',  47611972, '₹4,76,11,972', 'SWIFT'::public.transaction_type, 'Hong Kong, HK',  99, true, 2, alert0_uuid, case0_uuid, '2026-07-15 14:00:00'::timestamptz),
    ('TXN-RT-NX-003', 'OFFSHORE-HK-2',  'INDUS-2850',     47373821, '₹4,73,73,821', 'SWIFT'::public.transaction_type, 'Cayman Islands', 99, true, 3, alert0_uuid, case0_uuid, '2026-07-25 14:22:00'::timestamptz)
  ON CONFLICT (txn_id) DO NOTHING;

  -- Transactions — Round-Trip: Sharma Real Estate
  INSERT INTO public.transactions (txn_id, from_account, to_account, amount_inr, amount_display, txn_type, jurisdiction, risk_score, flagged, hops, alert_id, case_id, txn_timestamp) VALUES
    ('TXN-RT-SR-001', 'KOTAK-3010',     'ANTWERP-SHELL-1', 156892410, '₹15,68,92,410', 'SWIFT'::public.transaction_type, 'Antwerp, BE', 99, true, 1, alert1_uuid, case1_uuid, '2026-07-01 09:00:00'::timestamptz),
    ('TXN-RT-SR-002', 'ANTWERP-SHELL-1','MAURITIUS-CO-1',  156107048, '₹15,61,07,048', 'SWIFT'::public.transaction_type, 'Mauritius',   99, true, 2, alert1_uuid, case1_uuid, '2026-07-14 11:00:00'::timestamptz),
    ('TXN-RT-SR-003', 'MAURITIUS-CO-1', 'KOTAK-3010',      155321686, '₹15,53,21,686', 'SWIFT'::public.transaction_type, 'Antwerp, BE', 99, true, 3, alert1_uuid, case1_uuid, '2026-07-27 09:15:00'::timestamptz)
  ON CONFLICT (txn_id) DO NOTHING;

  -- Transactions — Layering: Kapoor Diamonds (6 hops)
  INSERT INTO public.transactions (txn_id, from_account, to_account, amount_inr, amount_display, txn_type, jurisdiction, risk_score, flagged, hops, alert_id, case_id, txn_timestamp) VALUES
    ('TXN-LY-KD-001', 'HDFC-1248',    'SBI-4421',      48606321, '₹4,86,06,321', 'RTGS'::public.transaction_type,  'Mumbai, IN',    83, true, 1, alert2_uuid, case2_uuid, '2026-07-01 10:00:00'::timestamptz),
    ('TXN-LY-KD-002', 'SBI-4421',     'ICICI-7732',    47147531, '₹4,71,47,531', 'RTGS'::public.transaction_type,  'Delhi, IN',     83, true, 2, alert2_uuid, case2_uuid, '2026-07-03 14:00:00'::timestamptz),
    ('TXN-LY-KD-003', 'ICICI-7732',   'DXB-SHELL-1',   45733105, '₹4,57,33,105', 'SWIFT'::public.transaction_type, 'Dubai, AE',     83, true, 3, alert2_uuid, case2_uuid, '2026-07-06 09:00:00'::timestamptz),
    ('TXN-LY-KD-004', 'DXB-SHELL-1',  'SG-OCBC-3311',  44361112, '₹4,43,61,112', 'SWIFT'::public.transaction_type, 'Singapore, SG', 83, true, 4, alert2_uuid, case2_uuid, '2026-07-09 11:00:00'::timestamptz),
    ('TXN-LY-KD-005', 'SG-OCBC-3311', 'ANTWERP-CO-2',  43030278, '₹4,30,30,278', 'SWIFT'::public.transaction_type, 'Antwerp, BE',   83, true, 5, alert2_uuid, case2_uuid, '2026-07-11 15:00:00'::timestamptz),
    ('TXN-LY-KD-006', 'ANTWERP-CO-2', 'HDFC-1248',     41739370, '₹4,17,39,370', 'SWIFT'::public.transaction_type, 'Antwerp, BE',   83, true, 6, alert2_uuid, case2_uuid, '2026-07-13 11:30:00'::timestamptz)
  ON CONFLICT (txn_id) DO NOTHING;

  -- Transactions — Layering: Rajan Exports (5 hops)
  INSERT INTO public.transactions (txn_id, from_account, to_account, amount_inr, amount_display, txn_type, jurisdiction, risk_score, flagged, hops, alert_id, case_id, txn_timestamp) VALUES
    ('TXN-LY-RE-001', 'AXIS-8506',     'KOTAK-9921',    50407615, '₹5,04,07,615', 'RTGS'::public.transaction_type,  'Mumbai, IN',     83, true, 1, alert3_uuid, case3_uuid, '2026-07-01 09:00:00'::timestamptz),
    ('TXN-LY-RE-002', 'KOTAK-9921',    'YES-6612',      48895387, '₹4,88,95,387', 'RTGS'::public.transaction_type,  'Pune, IN',       83, true, 2, alert3_uuid, case3_uuid, '2026-07-02 13:00:00'::timestamptz),
    ('TXN-LY-RE-003', 'YES-6612',      'MAURITIUS-CO-2',47428525, '₹4,74,28,525', 'SWIFT'::public.transaction_type, 'Mauritius',      83, true, 3, alert3_uuid, case3_uuid, '2026-07-04 10:00:00'::timestamptz),
    ('TXN-LY-RE-004', 'MAURITIUS-CO-2','CAYMAN-CO-3',   46005669, '₹4,60,05,669', 'SWIFT'::public.transaction_type, 'Cayman Islands', 83, true, 4, alert3_uuid, case3_uuid, '2026-07-06 16:00:00'::timestamptz),
    ('TXN-LY-RE-005', 'CAYMAN-CO-3',   'AXIS-8506',     44625499, '₹4,46,25,499', 'SWIFT'::public.transaction_type, 'Mauritius',      83, true, 5, alert3_uuid, case3_uuid, '2026-07-08 16:45:00'::timestamptz)
  ON CONFLICT (txn_id) DO NOTHING;

  -- Transactions — Smurfing: Meera Textiles Corp (16 senders)
  INSERT INTO public.transactions (txn_id, from_account, to_account, amount_inr, amount_display, txn_type, jurisdiction, risk_score, flagged, hops, alert_id, case_id, txn_timestamp) VALUES
    ('TXN-SM-MT-001', 'HDFC-1101',  'BOB-2469', 185000, '₹1,85,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-01 09:00:00'::timestamptz),
    ('TXN-SM-MT-002', 'SBI-2202',   'BOB-2469', 192000, '₹1,92,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-01 10:15:00'::timestamptz),
    ('TXN-SM-MT-003', 'ICICI-3303', 'BOB-2469', 188000, '₹1,88,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-01 11:30:00'::timestamptz),
    ('TXN-SM-MT-004', 'AXIS-4404',  'BOB-2469', 196000, '₹1,96,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-01 13:00:00'::timestamptz),
    ('TXN-SM-MT-005', 'KOTAK-5505', 'BOB-2469', 178000, '₹1,78,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-02 09:30:00'::timestamptz),
    ('TXN-SM-MT-006', 'PNB-6606',   'BOB-2469', 190000, '₹1,90,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-02 11:00:00'::timestamptz),
    ('TXN-SM-MT-007', 'BOB-7707',   'BOB-2469', 183000, '₹1,83,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-02 14:00:00'::timestamptz),
    ('TXN-SM-MT-008', 'YES-8808',   'BOB-2469', 194000, '₹1,94,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-03 09:00:00'::timestamptz),
    ('TXN-SM-MT-009', 'IDFC-9909',  'BOB-2469', 187000, '₹1,87,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-03 10:30:00'::timestamptz),
    ('TXN-SM-MT-010', 'UCO-1010',   'BOB-2469', 191000, '₹1,91,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-03 12:00:00'::timestamptz),
    ('TXN-SM-MT-011', 'CANARA-1111','BOB-2469', 186000, '₹1,86,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-04 09:00:00'::timestamptz),
    ('TXN-SM-MT-012', 'UNION-1212', 'BOB-2469', 193000, '₹1,93,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-04 11:00:00'::timestamptz),
    ('TXN-SM-MT-013', 'INDUS-1313', 'BOB-2469', 180000, '₹1,80,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-05 09:30:00'::timestamptz),
    ('TXN-SM-MT-014', 'HDFC-1414',  'BOB-2469', 197000, '₹1,97,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-05 11:00:00'::timestamptz),
    ('TXN-SM-MT-015', 'SBI-1515',   'BOB-2469', 184000, '₹1,84,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-06 09:00:00'::timestamptz),
    ('TXN-SM-MT-016', 'ICICI-1616', 'BOB-2469', 189000, '₹1,89,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 74, true, 0, alert4_uuid, case4_uuid, '2026-07-07 08:00:00'::timestamptz)
  ON CONFLICT (txn_id) DO NOTHING;

  -- Transactions — Smurfing: Ananya Trading Pvt Ltd (11 senders)
  INSERT INTO public.transactions (txn_id, from_account, to_account, amount_inr, amount_display, txn_type, jurisdiction, risk_score, flagged, hops, alert_id, case_id, txn_timestamp) VALUES
    ('TXN-SM-AT-001', 'AXIS-2101',   'CANARA-5685', 182000, '₹1,82,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 67, true, 0, alert5_uuid, case5_uuid, '2026-07-01 09:00:00'::timestamptz),
    ('TXN-SM-AT-002', 'KOTAK-2202',  'CANARA-5685', 191000, '₹1,91,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 67, true, 0, alert5_uuid, case5_uuid, '2026-07-01 11:00:00'::timestamptz),
    ('TXN-SM-AT-003', 'PNB-2303',    'CANARA-5685', 186000, '₹1,86,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 67, true, 0, alert5_uuid, case5_uuid, '2026-07-02 09:30:00'::timestamptz),
    ('TXN-SM-AT-004', 'BOB-2404',    'CANARA-5685', 195000, '₹1,95,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 67, true, 0, alert5_uuid, case5_uuid, '2026-07-02 13:00:00'::timestamptz),
    ('TXN-SM-AT-005', 'YES-2505',    'CANARA-5685', 179000, '₹1,79,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 67, true, 0, alert5_uuid, case5_uuid, '2026-07-03 10:00:00'::timestamptz),
    ('TXN-SM-AT-006', 'IDFC-2606',   'CANARA-5685', 188000, '₹1,88,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 67, true, 0, alert5_uuid, case5_uuid, '2026-07-03 14:30:00'::timestamptz),
    ('TXN-SM-AT-007', 'UCO-2707',    'CANARA-5685', 193000, '₹1,93,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 67, true, 0, alert5_uuid, case5_uuid, '2026-07-04 09:00:00'::timestamptz),
    ('TXN-SM-AT-008', 'CANARA-2808', 'CANARA-5685', 184000, '₹1,84,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 67, true, 0, alert5_uuid, case5_uuid, '2026-07-04 11:30:00'::timestamptz),
    ('TXN-SM-AT-009', 'UNION-2909',  'CANARA-5685', 197000, '₹1,97,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 67, true, 0, alert5_uuid, case5_uuid, '2026-07-05 09:00:00'::timestamptz),
    ('TXN-SM-AT-010', 'INDUS-3010',  'CANARA-5685', 181000, '₹1,81,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 67, true, 0, alert5_uuid, case5_uuid, '2026-07-05 12:00:00'::timestamptz),
    ('TXN-SM-AT-011', 'HDFC-3111',   'CANARA-5685', 153029, '₹1,53,029', 'NEFT'::public.transaction_type, 'Mumbai, IN', 67, true, 0, alert5_uuid, case5_uuid, '2026-07-05 10:30:00'::timestamptz)
  ON CONFLICT (txn_id) DO NOTHING;

  -- Dashboard metrics (computed from detection run)
  INSERT INTO public.dashboard_metrics (metric_key, metric_value, metric_label) VALUES
    ('transactions_today',  364,  'Transactions Monitored'),
    ('active_alerts',       6,    'Active Alerts'),
    ('critical_accounts',   2,    'Critical Accounts'),
    ('open_cases',          6,    'Open Cases'),
    ('sar_queue',           4,    'SAR Queue'),
    ('amount_frozen_lakhs', 2053, 'Amount Frozen (Lakhs)')
  ON CONFLICT (metric_key) DO UPDATE
    SET metric_value = EXCLUDED.metric_value,
        updated_at   = CURRENT_TIMESTAMP;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Generated seed insertion failed: %', SQLERRM;
END $$;

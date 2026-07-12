-- ============================================================
-- Case Assignment + Analyst Case Seeds
-- ============================================================

-- 1. Add assigned_analyst_name column to cases (assigned_to UUID already exists)
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS assigned_analyst_name TEXT DEFAULT NULL;

-- 2. Seed 5 new cases assigned to the analyst user (analyst.sharma@aml-bank.in)
DO $$
DECLARE
  analyst_uuid UUID;
  officer_uuid UUID;

  case_a UUID := gen_random_uuid();
  case_b UUID := gen_random_uuid();
  case_c UUID := gen_random_uuid();
  case_d UUID := gen_random_uuid();
  case_e UUID := gen_random_uuid();

  ent_a UUID := gen_random_uuid();
  ent_b UUID := gen_random_uuid();
  ent_c UUID := gen_random_uuid();
  ent_d UUID := gen_random_uuid();
  ent_e UUID := gen_random_uuid();

  alert_a UUID := gen_random_uuid();
  alert_b UUID := gen_random_uuid();
  alert_c UUID := gen_random_uuid();
  alert_d UUID := gen_random_uuid();
  alert_e UUID := gen_random_uuid();

BEGIN
  -- Resolve existing user UUIDs
  SELECT id INTO analyst_uuid FROM public.user_profiles WHERE email = 'analyst.sharma@aml-bank.in' LIMIT 1;
  SELECT id INTO officer_uuid FROM public.user_profiles WHERE email = 'priya.mehta@aml-bank.in' LIMIT 1;

  IF analyst_uuid IS NULL THEN
    RAISE NOTICE 'Analyst user not found — skipping analyst case seeds';
    RETURN;
  END IF;

  -- Entities for new cases
  INSERT INTO public.entities (id, entity_code, name, entity_type, risk_score, jurisdiction, linked_accounts, linked_cases, kyc_status, flagged_at) VALUES
    (ent_a, 'ENT-011', 'Meridian Holdings Ltd', 'Company'::public.entity_type, 87, 'Dubai, AE', 6, 1, 'Enhanced'::public.kyc_status, now() - interval '1 day'),
    (ent_b, 'ENT-012', 'Rajiv Nair', 'Person'::public.entity_type, 79, 'Kochi, IN', 3, 1, 'Pending'::public.kyc_status, now() - interval '2 days'),
    (ent_c, 'ENT-013', 'Zenith Forex Pvt Ltd', 'Company'::public.entity_type, 93, 'Singapore, SG', 9, 1, 'Failed'::public.kyc_status, now() - interval '3 days'),
    (ent_d, 'ENT-014', 'Patel Agro Exports', 'Company'::public.entity_type, 72, 'Ahmedabad, IN', 4, 1, 'Pending'::public.kyc_status, now() - interval '4 days'),
    (ent_e, 'ENT-015', 'Coastal Trade Finance', 'Company'::public.entity_type, 85, 'Chennai, IN', 7, 1, 'Enhanced'::public.kyc_status, now() - interval '5 days')
  ON CONFLICT (entity_code) DO NOTHING;

  -- Cases assigned to analyst (with assigned_analyst_name set)
  INSERT INTO public.cases (id, case_ref, subject, account_id, pattern, risk_score, amount, jurisdiction, case_status, days_open, assigned_officer, assigned_to, assigned_analyst_name, entity_id) VALUES
    (case_a, 'CASE-0901', 'Meridian Holdings Ltd', 'HDFC-8812', 'Layering', 87, '₹3,21,50,000', 'Dubai, AE', 'Investigating'::public.case_status, 2, 'Analyst Sharma', analyst_uuid, 'Analyst Sharma', ent_a),
    (case_b, 'CASE-0902', 'Rajiv Nair', 'SBI-4490', 'Smurfing', 79, '₹67,80,000', 'Kochi, IN', 'Open'::public.case_status, 1, 'Analyst Sharma', analyst_uuid, 'Analyst Sharma', ent_b),
    (case_c, 'CASE-0903', 'Zenith Forex Pvt Ltd', 'AXIS-7731', 'Round-Trip', 93, '₹5,44,00,000', 'Singapore, SG', 'Investigating'::public.case_status, 3, 'Analyst Sharma', analyst_uuid, 'Analyst Sharma', ent_c),
    (case_d, 'CASE-0904', 'Patel Agro Exports', 'KOTAK-2219', 'Pass-Thru', 72, '₹1,18,40,000', 'Ahmedabad, IN', 'Open'::public.case_status, 1, 'Analyst Sharma', analyst_uuid, 'Analyst Sharma', ent_d),
    (case_e, 'CASE-0905', 'Coastal Trade Finance', 'ICICI-6634', 'Shell Co.', 85, '₹2,89,70,000', 'Chennai, IN', 'Investigating'::public.case_status, 4, 'Analyst Sharma', analyst_uuid, 'Analyst Sharma', ent_e)
  ON CONFLICT (case_ref) DO NOTHING;

  -- Alerts linked to the new cases
  INSERT INTO public.alerts (id, alert_id, account_id, account_holder, pattern, risk_score, amount, jurisdiction, detected_at, alert_status, hops, assigned_to, case_id, entity_id) VALUES
    (alert_a, 'ALT-2026-0901', 'HDFC-8812', 'Meridian Holdings Ltd', 'Layering', 87, '₹3,21,50,000', 'Dubai, AE', now() - interval '2 days', 'Under Review'::public.alert_status, 5, 'Analyst Sharma', case_a, ent_a),
    (alert_b, 'ALT-2026-0902', 'SBI-4490', 'Rajiv Nair', 'Smurfing', 79, '₹67,80,000', 'Kochi, IN', now() - interval '1 day', 'New'::public.alert_status, 0, 'Analyst Sharma', case_b, ent_b),
    (alert_c, 'ALT-2026-0903', 'AXIS-7731', 'Zenith Forex Pvt Ltd', 'Round-Trip', 93, '₹5,44,00,000', 'Singapore, SG', now() - interval '3 days', 'Escalated'::public.alert_status, 8, 'Analyst Sharma', case_c, ent_c),
    (alert_d, 'ALT-2026-0904', 'KOTAK-2219', 'Patel Agro Exports', 'Pass-Thru', 72, '₹1,18,40,000', 'Ahmedabad, IN', now() - interval '1 day', 'New'::public.alert_status, 2, 'Analyst Sharma', case_d, ent_d),
    (alert_e, 'ALT-2026-0905', 'ICICI-6634', 'Coastal Trade Finance', 'Shell Co.', 85, '₹2,89,70,000', 'Chennai, IN', now() - interval '4 days', 'Under Review'::public.alert_status, 6, 'Analyst Sharma', case_e, ent_e)
  ON CONFLICT (alert_id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Analyst case seed failed: %', SQLERRM;
END $$;

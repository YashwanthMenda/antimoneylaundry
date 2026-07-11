-- ============================================================
-- AML Platform — Full Schema Migration
-- ============================================================

-- 1. ENUMS
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('analyst', 'senior_officer', 'admin');

DROP TYPE IF EXISTS public.alert_status CASCADE;
CREATE TYPE public.alert_status AS ENUM ('New', 'Under Review', 'Escalated', 'Closed', 'Reviewed');

DROP TYPE IF EXISTS public.case_status CASCADE;
CREATE TYPE public.case_status AS ENUM ('Open', 'Investigating', 'Pending SAR', 'Escalated', 'Closed');

DROP TYPE IF EXISTS public.sar_status CASCADE;
CREATE TYPE public.sar_status AS ENUM ('Draft', 'Pending Review', 'Submitted', 'Acknowledged');

DROP TYPE IF EXISTS public.entity_type CASCADE;
CREATE TYPE public.entity_type AS ENUM ('Person', 'Company', 'Account');

DROP TYPE IF EXISTS public.kyc_status CASCADE;
CREATE TYPE public.kyc_status AS ENUM ('Verified', 'Pending', 'Failed', 'Enhanced');

DROP TYPE IF EXISTS public.transaction_type CASCADE;
CREATE TYPE public.transaction_type AS ENUM ('NEFT', 'RTGS', 'IMPS', 'UPI', 'SWIFT', 'Cash');

-- 2. CORE TABLES

-- User profiles (linked to auth.users via trigger)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role public.user_role DEFAULT 'analyst'::public.user_role,
  department TEXT DEFAULT 'Compliance',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Entities (persons, companies, accounts)
CREATE TABLE IF NOT EXISTS public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  entity_type public.entity_type NOT NULL DEFAULT 'Company'::public.entity_type,
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  jurisdiction TEXT NOT NULL DEFAULT 'Mumbai, IN',
  linked_accounts INTEGER DEFAULT 0,
  linked_cases INTEGER DEFAULT 0,
  kyc_status public.kyc_status DEFAULT 'Pending'::public.kyc_status,
  flagged_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Cases
CREATE TABLE IF NOT EXISTS public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_ref TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  account_id TEXT NOT NULL,
  pattern TEXT NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  amount TEXT NOT NULL DEFAULT '₹0',
  jurisdiction TEXT NOT NULL DEFAULT 'Mumbai, IN',
  case_status public.case_status DEFAULT 'Open'::public.case_status,
  days_open INTEGER DEFAULT 0,
  assigned_officer TEXT DEFAULT 'Unassigned',
  assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  pattern TEXT NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  amount TEXT NOT NULL DEFAULT '₹0',
  jurisdiction TEXT NOT NULL DEFAULT 'Mumbai, IN',
  detected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  alert_status public.alert_status DEFAULT 'New'::public.alert_status,
  hops INTEGER DEFAULT 0,
  assigned_to TEXT DEFAULT 'Unassigned',
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- SAR Reports
CREATE TABLE IF NOT EXISTS public.sar_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sar_id TEXT NOT NULL UNIQUE,
  case_ref TEXT NOT NULL,
  subject TEXT NOT NULL,
  account_id TEXT NOT NULL,
  pattern TEXT NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  amount TEXT NOT NULL DEFAULT '₹0',
  generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  sar_status public.sar_status DEFAULT 'Draft'::public.sar_status,
  officer TEXT NOT NULL DEFAULT 'Unassigned',
  fiu_ref TEXT,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_id TEXT NOT NULL UNIQUE,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount_inr BIGINT NOT NULL DEFAULT 0,
  amount_display TEXT NOT NULL DEFAULT '₹0',
  txn_type public.transaction_type DEFAULT 'NEFT'::public.transaction_type,
  jurisdiction TEXT NOT NULL DEFAULT 'Mumbai, IN',
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  flagged BOOLEAN DEFAULT false,
  hops INTEGER DEFAULT 0,
  alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  txn_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard metrics snapshot (for real-time counters)
CREATE TABLE IF NOT EXISTS public.dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL UNIQUE,
  metric_value BIGINT NOT NULL DEFAULT 0,
  metric_label TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(alert_status);
CREATE INDEX IF NOT EXISTS idx_alerts_risk_score ON public.alerts(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_detected_at ON public.alerts(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(case_status);
CREATE INDEX IF NOT EXISTS idx_cases_risk_score ON public.cases(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_sar_reports_status ON public.sar_reports(sar_status);
CREATE INDEX IF NOT EXISTS idx_transactions_flagged ON public.transactions(flagged);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON public.transactions(txn_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_entities_risk_score ON public.entities(risk_score DESC);

-- 4. FUNCTIONS

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Handle new auth user → create user_profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'analyst')::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Role check helper (safe — queries auth.users not user_profiles)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(raw_user_meta_data->>'role', 'analyst')
  FROM auth.users
  WHERE id = auth.uid();
$$;

-- 5. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sar_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_metrics ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- user_profiles: own row only
DROP POLICY IF EXISTS "users_manage_own_profile" ON public.user_profiles;
CREATE POLICY "users_manage_own_profile"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_view_all_profiles" ON public.user_profiles;
CREATE POLICY "users_view_all_profiles"
ON public.user_profiles FOR SELECT TO authenticated
USING (true);

-- entities: all authenticated users can read/write
DROP POLICY IF EXISTS "authenticated_access_entities" ON public.entities;
CREATE POLICY "authenticated_access_entities"
ON public.entities FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- cases: all authenticated users can read/write
DROP POLICY IF EXISTS "authenticated_access_cases" ON public.cases;
CREATE POLICY "authenticated_access_cases"
ON public.cases FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- alerts: all authenticated users can read/write
DROP POLICY IF EXISTS "authenticated_access_alerts" ON public.alerts;
CREATE POLICY "authenticated_access_alerts"
ON public.alerts FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- sar_reports: all authenticated users can read/write
DROP POLICY IF EXISTS "authenticated_access_sar_reports" ON public.sar_reports;
CREATE POLICY "authenticated_access_sar_reports"
ON public.sar_reports FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- transactions: all authenticated users can read/write
DROP POLICY IF EXISTS "authenticated_access_transactions" ON public.transactions;
CREATE POLICY "authenticated_access_transactions"
ON public.transactions FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- dashboard_metrics: all authenticated users can read/write
DROP POLICY IF EXISTS "authenticated_access_dashboard_metrics" ON public.dashboard_metrics;
CREATE POLICY "authenticated_access_dashboard_metrics"
ON public.dashboard_metrics FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- 7. TRIGGERS

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cases_updated_at ON public.cases;
CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_alerts_updated_at ON public.alerts;
CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sar_reports_updated_at ON public.sar_reports;
CREATE TRIGGER update_sar_reports_updated_at
  BEFORE UPDATE ON public.sar_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. MOCK DATA
DO $$
DECLARE
  analyst_uuid UUID := gen_random_uuid();
  officer_uuid UUID := gen_random_uuid();
  admin_uuid   UUID := gen_random_uuid();

  case1_uuid UUID := gen_random_uuid();
  case2_uuid UUID := gen_random_uuid();
  case3_uuid UUID := gen_random_uuid();
  case4_uuid UUID := gen_random_uuid();
  case5_uuid UUID := gen_random_uuid();

  ent1_uuid UUID := gen_random_uuid();
  ent2_uuid UUID := gen_random_uuid();
  ent3_uuid UUID := gen_random_uuid();
  ent4_uuid UUID := gen_random_uuid();
  ent5_uuid UUID := gen_random_uuid();
  ent6_uuid UUID := gen_random_uuid();
  ent7_uuid UUID := gen_random_uuid();
  ent8_uuid UUID := gen_random_uuid();
  ent9_uuid UUID := gen_random_uuid();
  ent10_uuid UUID := gen_random_uuid();

  alert1_uuid UUID := gen_random_uuid();
  alert2_uuid UUID := gen_random_uuid();
  alert3_uuid UUID := gen_random_uuid();
  alert4_uuid UUID := gen_random_uuid();
  alert5_uuid UUID := gen_random_uuid();
  alert6_uuid UUID := gen_random_uuid();
  alert7_uuid UUID := gen_random_uuid();
  alert8_uuid UUID := gen_random_uuid();
  alert9_uuid UUID := gen_random_uuid();
  alert10_uuid UUID := gen_random_uuid();
  alert11_uuid UUID := gen_random_uuid();
  alert12_uuid UUID := gen_random_uuid();

BEGIN
  -- Auth users
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES
    (analyst_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'analyst.sharma@aml-bank.in', crypt('Analyst@AML2026', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Analyst Sharma', 'role', 'analyst'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (officer_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'priya.mehta@aml-bank.in', crypt('Sr0fficer@AML26', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Priya Mehta', 'role', 'senior_officer'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'admin.iyer@aml-bank.in', crypt('Admin#Comply2026', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Admin Iyer', 'role', 'admin'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null)
  ON CONFLICT (id) DO NOTHING;

  -- Entities
  INSERT INTO public.entities (id, entity_code, name, entity_type, risk_score, jurisdiction, linked_accounts, linked_cases, kyc_status, flagged_at) VALUES
    (ent1_uuid, 'ENT-001', 'Ananya Trading Pvt Ltd', 'Company'::public.entity_type, 92, 'Mumbai, IN', 5, 2, 'Enhanced'::public.kyc_status, now()),
    (ent2_uuid, 'ENT-002', 'Suresh Ananya', 'Person'::public.entity_type, 88, 'Mumbai, IN', 8, 2, 'Enhanced'::public.kyc_status, now()),
    (ent3_uuid, 'ENT-003', 'YES-4490 (Shell Co X)', 'Account'::public.entity_type, 95, 'Cayman Islands', 12, 3, 'Failed'::public.kyc_status, now() - interval '2 days'),
    (ent4_uuid, 'ENT-004', 'Rajan Exports Ltd', 'Company'::public.entity_type, 78, 'Dubai, AE', 4, 1, 'Pending'::public.kyc_status, now() - interval '3 days'),
    (ent5_uuid, 'ENT-005', 'Offshore Ventures Ltd', 'Company'::public.entity_type, 83, 'Singapore, SG', 7, 1, 'Enhanced'::public.kyc_status, now() - interval '18 days'),
    (ent6_uuid, 'ENT-006', 'Kavita Malhotra', 'Person'::public.entity_type, 71, 'Mumbai, IN', 3, 1, 'Pending'::public.kyc_status, now()),
    (ent7_uuid, 'ENT-007', 'Kapoor Diamonds Pvt Ltd', 'Company'::public.entity_type, 86, 'Antwerp, BE', 6, 1, 'Enhanced'::public.kyc_status, now() - interval '23 days'),
    (ent8_uuid, 'ENT-008', 'Sharma Real Estate', 'Company'::public.entity_type, 74, 'Mumbai, IN', 9, 1, 'Verified'::public.kyc_status, now() - interval '12 days'),
    (ent9_uuid, 'ENT-009', 'Nexus Capital Ltd', 'Company'::public.entity_type, 95, 'Mauritius', 15, 2, 'Failed'::public.kyc_status, now()),
    (ent10_uuid, 'ENT-010', 'Vikram Sharma', 'Person'::public.entity_type, 55, 'Ahmedabad, IN', 2, 1, 'Verified'::public.kyc_status, now())
  ON CONFLICT (entity_code) DO NOTHING;

  -- Cases
  INSERT INTO public.cases (id, case_ref, subject, account_id, pattern, risk_score, amount, jurisdiction, case_status, days_open, assigned_officer, assigned_to, entity_id) VALUES
    (case1_uuid, 'CASE-0847', 'Ananya Trading Pvt Ltd', 'HDFC-4521', 'Smurfing', 92, '₹1,47,32,000', 'Mumbai, IN', 'Open'::public.case_status, 1, 'P. Mehta', officer_uuid, ent1_uuid),
    (case2_uuid, 'CASE-0831', 'Rajan Exports Ltd', 'SBI-7823', 'Layering', 78, '₹89,15,500', 'Dubai, AE', 'Investigating'::public.case_status, 4, 'A. Singh', analyst_uuid, ent4_uuid),
    (case3_uuid, 'CASE-0819', 'Suresh Finserv Pvt Ltd', 'AXIS-9102', 'Shell Co.', 88, '₹2,15,60,000', 'Cayman Islands', 'Pending SAR'::public.case_status, 9, 'R. Iyer', analyst_uuid, ent2_uuid),
    (case4_uuid, 'CASE-0807', 'Sharma Real Estate', 'BOB-4478', 'Round-Trip', 74, '₹4,70,00,000', 'Mumbai, IN', 'Investigating'::public.case_status, 12, 'P. Mehta', officer_uuid, ent8_uuid),
    (case5_uuid, 'CASE-0793', 'Offshore Ventures Ltd', 'YES-8891', 'Layering', 83, '₹1,02,30,000', 'Singapore, SG', 'Pending SAR'::public.case_status, 18, 'S. Nair', analyst_uuid, ent5_uuid)
  ON CONFLICT (case_ref) DO NOTHING;

  -- Alerts
  INSERT INTO public.alerts (id, alert_id, account_id, account_holder, pattern, risk_score, amount, jurisdiction, detected_at, alert_status, hops, assigned_to, case_id, entity_id) VALUES
    (alert1_uuid, 'ALT-2026-0847', 'HDFC-4521', 'Ananya Trading Pvt Ltd', 'Smurfing', 92, '₹1,47,32,000', 'Mumbai, IN', now() - interval '2 hours', 'New'::public.alert_status, 0, 'P. Mehta', case1_uuid, ent1_uuid),
    (alert2_uuid, 'ALT-2026-0846', 'SBI-7823', 'Rajan Exports Ltd', 'Layering', 78, '₹89,15,500', 'Dubai, AE', now() - interval '2.5 hours', 'Under Review'::public.alert_status, 4, 'A. Singh', case2_uuid, ent4_uuid),
    (alert3_uuid, 'ALT-2026-0845', 'ICICI-3341', 'Vikram Commodities', 'Round-Trip', 55, '₹32,80,000', 'Ahmedabad, IN', now() - interval '3 hours', 'Under Review'::public.alert_status, 6, 'R. Iyer', null, ent10_uuid),
    (alert4_uuid, 'ALT-2026-0844', 'AXIS-9102', 'Suresh Finserv Pvt Ltd', 'Shell Co.', 88, '₹2,15,60,000', 'Cayman Islands', now() - interval '3.5 hours', 'Escalated'::public.alert_status, 7, 'P. Mehta', case3_uuid, ent2_uuid),
    (alert5_uuid, 'ALT-2026-0843', 'KOTAK-5567', 'Meera Textiles Corp', 'Smurfing', 91, '₹73,45,000', 'Surat, IN', now() - interval '4 hours', 'New'::public.alert_status, 0, 'S. Nair', null, null),
    (alert6_uuid, 'ALT-2026-0842', 'PNB-2234', 'Gupta Infrastructure', 'Pass-Thru', 47, '₹18,90,000', 'Delhi, IN', now() - interval '4.5 hours', 'Under Review'::public.alert_status, 2, 'A. Singh', null, null),
    (alert7_uuid, 'ALT-2026-0841', 'YES-8891', 'Offshore Ventures Ltd', 'Layering', 83, '₹1,02,30,000', 'Singapore, SG', now() - interval '5 hours', 'Escalated'::public.alert_status, 5, 'R. Iyer', case5_uuid, ent5_uuid),
    (alert8_uuid, 'ALT-2026-0840', 'BOB-4478', 'Sharma Real Estate', 'Round-Trip', 74, '₹4,70,00,000', 'Mumbai, IN', now() - interval '5.5 hours', 'Under Review'::public.alert_status, 8, 'P. Mehta', case4_uuid, ent8_uuid),
    (alert9_uuid, 'ALT-2026-0839', 'IDFC-6612', 'Priya Agro Industries', 'Smurfing', 68, '₹51,20,000', 'Pune, IN', now() - interval '6 hours', 'Under Review'::public.alert_status, 0, 'S. Nair', null, null),
    (alert10_uuid, 'ALT-2026-0838', 'UCO-3390', 'Nexus Capital Ltd', 'Shell Co.', 95, '₹3,88,00,000', 'Mauritius', now() - interval '7 hours', 'Escalated'::public.alert_status, 9, 'P. Mehta', null, ent9_uuid),
    (alert11_uuid, 'ALT-2026-0837', 'CANARA-7712', 'Bharat Logistics', 'Pass-Thru', 42, '₹9,50,000', 'Chennai, IN', now() - interval '8 hours', 'Closed'::public.alert_status, 1, 'A. Singh', null, null),
    (alert12_uuid, 'ALT-2026-0836', 'UNION-5521', 'Kapoor Diamonds Pvt Ltd', 'Layering', 86, '₹6,23,00,000', 'Antwerp, BE', now() - interval '12 hours', 'New'::public.alert_status, 6, 'Unassigned', null, ent7_uuid)
  ON CONFLICT (alert_id) DO NOTHING;

  -- SAR Reports
  INSERT INTO public.sar_reports (sar_id, case_ref, subject, account_id, pattern, risk_score, amount, generated_at, sar_status, officer, fiu_ref, case_id, created_by) VALUES
    ('SAR-2026-0847', 'CASE-0847', 'Ananya Trading Pvt Ltd', 'HDFC-4521', 'Smurfing + Layering', 92, '₹1,47,32,000', now() - interval '2 hours', 'Draft'::public.sar_status, 'P. Mehta', null, case1_uuid, officer_uuid),
    ('SAR-2026-0831', 'CASE-0831', 'Rajan Exports Ltd', 'SBI-7823', 'Layering', 78, '₹89,15,500', now() - interval '3 days', 'Pending Review'::public.sar_status, 'A. Singh', null, case2_uuid, analyst_uuid),
    ('SAR-2026-0819', 'CASE-0819', 'Suresh Finserv Pvt Ltd', 'AXIS-9102', 'Shell Company', 88, '₹2,15,60,000', now() - interval '9 days', 'Submitted'::public.sar_status, 'R. Iyer', 'FIU-IND/2026/SAR/00819', case3_uuid, analyst_uuid),
    ('SAR-2026-0807', 'CASE-0807', 'Sharma Real Estate', 'BOB-4478', 'Round Tripping', 74, '₹4,70,00,000', now() - interval '12 days', 'Acknowledged'::public.sar_status, 'P. Mehta', 'FIU-IND/2026/SAR/00807', case4_uuid, officer_uuid),
    ('SAR-2026-0793', 'CASE-0793', 'Offshore Ventures Ltd', 'YES-8891', 'Layering + Cross-border', 83, '₹1,02,30,000', now() - interval '18 days', 'Submitted'::public.sar_status, 'S. Nair', 'FIU-IND/2026/SAR/00793', case5_uuid, analyst_uuid),
    ('SAR-2026-0778', 'CASE-0778', 'Kapoor Diamonds Pvt Ltd', 'UNION-5521', 'Layering', 86, '₹6,23,00,000', now() - interval '23 days', 'Acknowledged'::public.sar_status, 'R. Iyer', 'FIU-IND/2026/SAR/00778', null, analyst_uuid)
  ON CONFLICT (sar_id) DO NOTHING;

  -- Transactions
  INSERT INTO public.transactions (txn_id, from_account, to_account, amount_inr, amount_display, txn_type, jurisdiction, risk_score, flagged, hops, alert_id, case_id, txn_timestamp) VALUES
    ('TXN-2026-001', 'HDFC-4521', 'SBI-7823', 14732000, '₹1,47,32,000', 'NEFT'::public.transaction_type, 'Mumbai, IN', 92, true, 0, alert1_uuid, case1_uuid, now() - interval '2 hours'),
    ('TXN-2026-002', 'SBI-7823', 'AXIS-9102', 8915500, '₹89,15,500', 'RTGS'::public.transaction_type, 'Dubai, AE', 78, true, 4, alert2_uuid, case2_uuid, now() - interval '2.5 hours'),
    ('TXN-2026-003', 'ICICI-3341', 'PNB-2234', 3280000, '₹32,80,000', 'IMPS'::public.transaction_type, 'Ahmedabad, IN', 55, true, 6, alert3_uuid, null, now() - interval '3 hours'),
    ('TXN-2026-004', 'AXIS-9102', 'YES-8891', 21560000, '₹2,15,60,000', 'SWIFT'::public.transaction_type, 'Cayman Islands', 88, true, 7, alert4_uuid, case3_uuid, now() - interval '3.5 hours'),
    ('TXN-2026-005', 'KOTAK-5567', 'UCO-3390', 7345000, '₹73,45,000', 'NEFT'::public.transaction_type, 'Surat, IN', 91, true, 0, alert5_uuid, null, now() - interval '4 hours'),
    ('TXN-2026-006', 'PNB-2234', 'CANARA-7712', 1890000, '₹18,90,000', 'UPI'::public.transaction_type, 'Delhi, IN', 47, false, 2, alert6_uuid, null, now() - interval '4.5 hours'),
    ('TXN-2026-007', 'YES-8891', 'HDFC-4521', 10230000, '₹1,02,30,000', 'SWIFT'::public.transaction_type, 'Singapore, SG', 83, true, 5, alert7_uuid, case5_uuid, now() - interval '5 hours'),
    ('TXN-2026-008', 'BOB-4478', 'ICICI-3341', 47000000, '₹4,70,00,000', 'RTGS'::public.transaction_type, 'Mumbai, IN', 74, true, 8, alert8_uuid, case4_uuid, now() - interval '5.5 hours'),
    ('TXN-2026-009', 'IDFC-6612', 'KOTAK-5567', 5120000, '₹51,20,000', 'NEFT'::public.transaction_type, 'Pune, IN', 68, true, 0, alert9_uuid, null, now() - interval '6 hours'),
    ('TXN-2026-010', 'UCO-3390', 'BOB-4478', 38800000, '₹3,88,00,000', 'SWIFT'::public.transaction_type, 'Mauritius', 95, true, 9, alert10_uuid, null, now() - interval '7 hours'),
    ('TXN-2026-011', 'CANARA-7712', 'IDFC-6612', 950000, '₹9,50,000', 'UPI'::public.transaction_type, 'Chennai, IN', 42, false, 1, alert11_uuid, null, now() - interval '8 hours'),
    ('TXN-2026-012', 'UNION-5521', 'YES-8891', 62300000, '₹6,23,00,000', 'SWIFT'::public.transaction_type, 'Antwerp, BE', 86, true, 6, alert12_uuid, null, now() - interval '12 hours')
  ON CONFLICT (txn_id) DO NOTHING;

  -- Dashboard metrics
  INSERT INTO public.dashboard_metrics (metric_key, metric_value, metric_label) VALUES
    ('transactions_today', 14521, 'Transactions Monitored'),
    ('active_alerts', 47, 'Active Alerts'),
    ('critical_accounts', 23, 'Critical Accounts'),
    ('open_cases', 12, 'Open Cases'),
    ('sar_queue', 3, 'SAR Queue'),
    ('amount_frozen_lakhs', 230, 'Amount Frozen (Lakhs)')
  ON CONFLICT (metric_key) DO UPDATE SET metric_value = EXCLUDED.metric_value, updated_at = CURRENT_TIMESTAMP;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;

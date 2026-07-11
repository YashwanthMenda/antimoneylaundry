-- ============================================================
-- AML Platform — File a Case (case_reports) Migration
-- ============================================================

-- case_reports table for submitted case filings
CREATE TABLE IF NOT EXISTS public.case_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_ref TEXT NOT NULL UNIQUE,
  -- Account Info
  account_id TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'Savings',
  bank_name TEXT NOT NULL DEFAULT '',
  ifsc_code TEXT NOT NULL DEFAULT '',
  -- Suspicious Activity
  activity_type TEXT NOT NULL,
  activity_description TEXT NOT NULL,
  -- Transaction Details
  transaction_amount TEXT NOT NULL DEFAULT '₹0',
  transaction_date DATE,
  transaction_ids TEXT,
  -- Risk & Classification
  risk_level TEXT NOT NULL DEFAULT 'Medium',
  jurisdiction TEXT NOT NULL DEFAULT 'Mumbai, IN',
  -- Supporting Evidence
  evidence_notes TEXT,
  -- Status & Ownership
  report_status TEXT NOT NULL DEFAULT 'Submitted',
  submitted_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  submitted_by_name TEXT NOT NULL DEFAULT '',
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_case_reports_status ON public.case_reports(report_status);
CREATE INDEX IF NOT EXISTS idx_case_reports_submitted_by ON public.case_reports(submitted_by);
CREATE INDEX IF NOT EXISTS idx_case_reports_created_at ON public.case_reports(created_at DESC);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_case_reports_updated_at ON public.case_reports;
CREATE TRIGGER update_case_reports_updated_at
  BEFORE UPDATE ON public.case_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.case_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_users_can_view_case_reports" ON public.case_reports;
CREATE POLICY "authenticated_users_can_view_case_reports"
  ON public.case_reports
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_users_can_insert_case_reports" ON public.case_reports;
CREATE POLICY "authenticated_users_can_insert_case_reports"
  ON public.case_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

DROP POLICY IF EXISTS "users_can_update_own_case_reports" ON public.case_reports;
CREATE POLICY "users_can_update_own_case_reports"
  ON public.case_reports
  FOR UPDATE
  TO authenticated
  USING (submitted_by = auth.uid())
  WITH CHECK (submitted_by = auth.uid());

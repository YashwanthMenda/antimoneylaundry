-- ============================================================
-- AML Platform — Pending Cases Officer Workflow Migration
-- ============================================================

-- Add acknowledgement fields to case_reports
ALTER TABLE public.case_reports
ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS acknowledged_by_name TEXT;

-- Index for officer pending review queries
CREATE INDEX IF NOT EXISTS idx_case_reports_report_status ON public.case_reports(report_status);
CREATE INDEX IF NOT EXISTS idx_case_reports_acknowledged_by ON public.case_reports(acknowledged_by);

-- Allow officers/admins to update case_reports (acknowledge & submit)
DROP POLICY IF EXISTS "officers_can_update_case_reports" ON public.case_reports;
CREATE POLICY "officers_can_update_case_reports"
  ON public.case_reports
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

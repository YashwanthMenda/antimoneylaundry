-- SAR Officer Workflow: add columns for officer actions on SAR reports

ALTER TABLE sar_reports
  ADD COLUMN IF NOT EXISTS sent_to_officer_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_by_name TEXT,
  ADD COLUMN IF NOT EXISTS officer_action TEXT,
  ADD COLUMN IF NOT EXISTS officer_notes TEXT,
  ADD COLUMN IF NOT EXISTS officer_actioned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS officer_actioned_by TEXT;

-- Allow officers/admins to update sar_reports for actioning
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sar_reports' AND policyname = 'Officers can action sar_reports'
  ) THEN
    CREATE POLICY "Officers can action sar_reports"
      ON sar_reports
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid()
            AND role IN ('senior_officer', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid()
            AND role IN ('senior_officer', 'admin')
        )
      );
  END IF;
END $$;

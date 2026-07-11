-- Migration: SAR Approval Flow
-- Adds approved_at timestamp to sar_reports and updates RLS so senior officers can approve SARs

-- 1. Add approved_at column to sar_reports
ALTER TABLE public.sar_reports
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 2. Helper function: check if current user has a given role (safe for non-user tables)
CREATE OR REPLACE FUNCTION public.current_user_has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role::TEXT = required_role
  )
$$;

-- 3. Update RLS on sar_reports to allow senior officers and admins to update any SAR
--    (existing policy only allows the creator to manage their own SAR)

-- Drop existing policies on sar_reports so we can replace them
DROP POLICY IF EXISTS "users_manage_own_sar_reports" ON public.sar_reports;
DROP POLICY IF EXISTS "sar_reports_select_all" ON public.sar_reports;
DROP POLICY IF EXISTS "sar_reports_insert_own" ON public.sar_reports;
DROP POLICY IF EXISTS "sar_reports_update_own" ON public.sar_reports;
DROP POLICY IF EXISTS "sar_reports_update_officer" ON public.sar_reports;
DROP POLICY IF EXISTS "sar_reports_all_authenticated" ON public.sar_reports;
DROP POLICY IF EXISTS "sar_reports_officer_update" ON public.sar_reports;

-- Allow all authenticated users to read all SARs (officers need to see analyst submissions)
CREATE POLICY "sar_reports_select_all"
ON public.sar_reports
FOR SELECT
TO authenticated
USING (true);

-- Allow analysts to insert their own SARs
CREATE POLICY "sar_reports_insert_own"
ON public.sar_reports
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Allow the creator OR a senior_officer/admin to update a SAR
CREATE POLICY "sar_reports_update_own"
ON public.sar_reports
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.current_user_has_role('senior_officer')
  OR public.current_user_has_role('admin')
)
WITH CHECK (
  created_by = auth.uid()
  OR public.current_user_has_role('senior_officer')
  OR public.current_user_has_role('admin')
);

-- Allow creator to delete their own SAR
DROP POLICY IF EXISTS "sar_reports_delete_own" ON public.sar_reports;
CREATE POLICY "sar_reports_delete_own"
ON public.sar_reports
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

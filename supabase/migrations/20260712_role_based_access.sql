-- ============================================================
-- Role-Based Access Control Migration
-- AML Platform — Role-gated RLS policies
-- ============================================================

-- ── Helper functions (MUST be created before RLS policies) ──

-- Check if current user has a specific role (safe for non-user_profiles tables)
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role::TEXT = required_role
      AND up.is_active = true
  )
$$;

-- Check if current user is admin or senior_officer
CREATE OR REPLACE FUNCTION public.is_officer_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role::TEXT IN ('senior_officer', 'admin')
      AND up.is_active = true
  )
$$;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role::TEXT = 'admin'
      AND up.is_active = true
  )
$$;

-- ── user_profiles ──────────────────────────────────────────
-- Users can read/update their own profile; admins can read all

DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "admin_read_all_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_read_all_user_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin() OR id = auth.uid());

-- ── cases ──────────────────────────────────────────────────
-- Analysts: read cases assigned to them; officers/admins: read all
-- Only officers/admins can update case status (escalate, close)

DROP POLICY IF EXISTS "analysts_read_assigned_cases" ON public.cases;
CREATE POLICY "analysts_read_assigned_cases"
ON public.cases
FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid()
  OR public.is_officer_or_admin()
);

DROP POLICY IF EXISTS "analysts_insert_cases" ON public.cases;
CREATE POLICY "analysts_insert_cases"
ON public.cases
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "officers_update_cases" ON public.cases;
CREATE POLICY "officers_update_cases"
ON public.cases
FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid()
  OR public.is_officer_or_admin()
)
WITH CHECK (
  assigned_to = auth.uid()
  OR public.is_officer_or_admin()
);

DROP POLICY IF EXISTS "admin_delete_cases" ON public.cases;
CREATE POLICY "admin_delete_cases"
ON public.cases
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ── alerts ─────────────────────────────────────────────────
-- All authenticated users can read alerts; only officers/admins can update/delete

DROP POLICY IF EXISTS "authenticated_read_alerts" ON public.alerts;
CREATE POLICY "authenticated_read_alerts"
ON public.alerts
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_alerts" ON public.alerts;
CREATE POLICY "authenticated_insert_alerts"
ON public.alerts
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "officers_update_alerts" ON public.alerts;
CREATE POLICY "officers_update_alerts"
ON public.alerts
FOR UPDATE
TO authenticated
USING (public.is_officer_or_admin())
WITH CHECK (public.is_officer_or_admin());

DROP POLICY IF EXISTS "admin_delete_alerts" ON public.alerts;
CREATE POLICY "admin_delete_alerts"
ON public.alerts
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ── sar_reports ────────────────────────────────────────────
-- Analysts: create SARs and read their own; officers: read all, approve/reject
-- Admins: full access

DROP POLICY IF EXISTS "analysts_read_own_sars" ON public.sar_reports;
CREATE POLICY "analysts_read_own_sars"
ON public.sar_reports
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_officer_or_admin()
);

DROP POLICY IF EXISTS "analysts_create_sars" ON public.sar_reports;
CREATE POLICY "analysts_create_sars"
ON public.sar_reports
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "officers_update_sars" ON public.sar_reports;
CREATE POLICY "officers_update_sars"
ON public.sar_reports
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_officer_or_admin()
)
WITH CHECK (
  created_by = auth.uid()
  OR public.is_officer_or_admin()
);

DROP POLICY IF EXISTS "admin_delete_sars" ON public.sar_reports;
CREATE POLICY "admin_delete_sars"
ON public.sar_reports
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ── transactions ───────────────────────────────────────────
-- All authenticated users can read; only officers/admins can modify

DROP POLICY IF EXISTS "authenticated_read_transactions" ON public.transactions;
CREATE POLICY "authenticated_read_transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_transactions" ON public.transactions;
CREATE POLICY "authenticated_insert_transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "officers_update_transactions" ON public.transactions;
CREATE POLICY "officers_update_transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (public.is_officer_or_admin())
WITH CHECK (public.is_officer_or_admin());

DROP POLICY IF EXISTS "admin_delete_transactions" ON public.transactions;
CREATE POLICY "admin_delete_transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ── entities ───────────────────────────────────────────────
-- All authenticated users can read; only officers/admins can modify

DROP POLICY IF EXISTS "authenticated_read_entities" ON public.entities;
CREATE POLICY "authenticated_read_entities"
ON public.entities
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_entities" ON public.entities;
CREATE POLICY "authenticated_insert_entities"
ON public.entities
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "officers_update_entities" ON public.entities;
CREATE POLICY "officers_update_entities"
ON public.entities
FOR UPDATE
TO authenticated
USING (public.is_officer_or_admin())
WITH CHECK (public.is_officer_or_admin());

DROP POLICY IF EXISTS "admin_delete_entities" ON public.entities;
CREATE POLICY "admin_delete_entities"
ON public.entities
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ── case_reports ───────────────────────────────────────────
-- Analysts: create and read their own; officers: read all, acknowledge

DROP POLICY IF EXISTS "analysts_read_own_case_reports" ON public.case_reports;
CREATE POLICY "analysts_read_own_case_reports"
ON public.case_reports
FOR SELECT
TO authenticated
USING (
  submitted_by = auth.uid()
  OR public.is_officer_or_admin()
);

DROP POLICY IF EXISTS "analysts_create_case_reports" ON public.case_reports;
CREATE POLICY "analysts_create_case_reports"
ON public.case_reports
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "officers_update_case_reports" ON public.case_reports;
CREATE POLICY "officers_update_case_reports"
ON public.case_reports
FOR UPDATE
TO authenticated
USING (
  submitted_by = auth.uid()
  OR public.is_officer_or_admin()
)
WITH CHECK (
  submitted_by = auth.uid()
  OR public.is_officer_or_admin()
);

DROP POLICY IF EXISTS "admin_delete_case_reports" ON public.case_reports;
CREATE POLICY "admin_delete_case_reports"
ON public.case_reports
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ── dashboard_metrics ──────────────────────────────────────
-- All authenticated users can read; only admins can modify

DROP POLICY IF EXISTS "authenticated_read_dashboard_metrics" ON public.dashboard_metrics;
CREATE POLICY "authenticated_read_dashboard_metrics"
ON public.dashboard_metrics
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "admin_manage_dashboard_metrics" ON public.dashboard_metrics;
CREATE POLICY "admin_manage_dashboard_metrics"
ON public.dashboard_metrics
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

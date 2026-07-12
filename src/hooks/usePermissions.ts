'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export type UserRole = 'analyst' | 'senior_officer' | 'admin' | '';

export interface Permissions {
  /** Raw role string */
  role: UserRole;

  /** True for senior_officer or admin */
  isOfficer: boolean;

  /** True only for admin */
  isAdmin: boolean;

  /** True for analyst (default role) */
  isAnalyst: boolean;

  /** Can escalate a case to senior review */
  canEscalate: boolean;

  /** Can submit / upload a SAR report */
  canSubmitSAR: boolean;

  /** Can approve or reject a SAR */
  canApproveSAR: boolean;

  /** Can delete cases, alerts, or SARs */
  canDelete: boolean;

  /** Can assign analysts to cases */
  canAssignAnalyst: boolean;

  /** Can acknowledge filed case reports */
  canAcknowledge: boolean;

  /** Can view the compliance audit trail */
  canViewAuditTrail: boolean;

  /** Can file a new case */
  canFileCase: boolean;
}

/**
 * usePermissions
 *
 * Returns a stable Permissions object derived from the current user's role.
 * Role is read from Supabase auth user_metadata (set at sign-up) and falls
 * back to the user_profiles table role via AuthContext.getUserProfile().
 *
 * Usage:
 *   const { canEscalate, canSubmitSAR, isOfficer } = usePermissions();
 */
export function usePermissions(): Permissions {
  const { user } = useAuth();

  const role: UserRole = useMemo(() => {
    if (!user) return '';
    // Prefer user_metadata (set at sign-up), fall back to app_metadata
    const meta =
      user?.user_metadata?.role ??
      user?.app_metadata?.role ??
      (user as any)?.role ??
      '';
    return (meta as UserRole) || 'analyst';
  }, [user]);

  return useMemo<Permissions>(() => {
    const isAdmin = role === 'admin';
    const isOfficer = role === 'senior_officer' || isAdmin;
    const isAnalyst = role === 'analyst' || role === '';

    return {
      role,
      isOfficer,
      isAdmin,
      isAnalyst,

      // Escalate: analysts escalate cases; officers can also escalate
      canEscalate: true,

      // Submit SAR: analysts upload SARs
      canSubmitSAR: isAnalyst || isAdmin,

      // Approve / reject SAR: officers and admins only
      canApproveSAR: isOfficer,

      // Delete: admins only
      canDelete: isAdmin,

      // Assign analyst to case: officers and admins
      canAssignAnalyst: isOfficer,

      // Acknowledge case reports: officers and admins
      canAcknowledge: isOfficer,

      // Audit trail: all authenticated users
      canViewAuditTrail: true,

      // File a new case: analysts and admins
      canFileCase: isAnalyst || isAdmin,
    };
  }, [role]);
}

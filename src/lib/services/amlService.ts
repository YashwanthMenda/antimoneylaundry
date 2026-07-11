// AML Platform — Supabase service layer
// All DB snake_case ↔ app camelCase conversions happen here

import { createClient } from '@/lib/supabase/client';

function isSchemaError(error: any): boolean {
  if (!error) return false;
  if (error.code && typeof error.code === 'string') {
    const cls = error.code.substring(0, 2);
    if (cls === '42' || cls === '08') return true;
    if (cls === '23') return false;
  }
  if (error.message) {
    const patterns = [
      /relation.*does not exist/i,
      /column.*does not exist/i,
      /function.*does not exist/i,
      /syntax error/i,
      /type.*does not exist/i,
    ];
    return patterns.some((p) => p.test(error.message));
  }
  return false;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export async function getDashboardMetrics() {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('dashboard_metrics')
      .select('metric_key, metric_value, metric_label');
    if (error) {
      if (isSchemaError(error)) throw error;
      return null;
    }
    const map: Record<string, number> = {};
    data?.forEach((row) => { map[row.metric_key] = row.metric_value; });
    return map;
  } catch (e: any) {
    console.error('getDashboardMetrics:', e.message);
    return null;
  }
}

export async function getAlertVolume() {
  const supabase = createClient();
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('alerts')
      .select('risk_score, detected_at')
      .gte('detected_at', since)
      .order('detected_at', { ascending: true });
    if (error) {
      if (isSchemaError(error)) throw error;
      return null;
    }
    // Bucket into 24 hourly bins
    const bins: Record<string, { critical: number; high: number; medium: number }> = {};
    for (let h = 0; h < 24; h++) {
      const label = `${String(h).padStart(2, '0')}:00`;
      bins[label] = { critical: 0, high: 0, medium: 0 };
    }
    data?.forEach((a) => {
      let h = new Date(a.detected_at).getHours();
      const label = `${String(h).padStart(2, '0')}:00`;
      if (a.risk_score >= 86) bins[label].critical++;
      else if (a.risk_score >= 71) bins[label].high++;
      else bins[label].medium++;
    });
    return Object.entries(bins).map(([time, v]) => ({ time, ...v }));
  } catch (e: any) {
    console.error('getAlertVolume:', e.message);
    return null;
  }
}

export async function getPatternBreakdown() {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('pattern')
      .neq('alert_status', 'Closed');
    if (error) {
      if (isSchemaError(error)) throw error;
      return null;
    }
    const counts: Record<string, number> = {};
    data?.forEach((a) => { counts[a.pattern] = (counts[a.pattern] || 0) + 1; });
    const colorMap: Record<string, string> = {
      Smurfing: 'var(--risk-critical)',
      Layering: 'var(--risk-high)',
      'Round-Trip': 'var(--risk-medium)',
      'Shell Co.': '#8b5cf6',
      'Pass-Thru': 'var(--muted-foreground)',
    };
    return Object.entries(counts).map(([pattern, count]) => ({
      pattern,
      count,
      color: colorMap[pattern] || 'var(--muted-foreground)',
    }));
  } catch (e: any) {
    console.error('getPatternBreakdown:', e.message);
    return null;
  }
}

// ─── ALERTS ───────────────────────────────────────────────────────────────────

export async function getAlerts() {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('risk_score', { ascending: false });
    if (error) {
      if (isSchemaError(error)) throw error;
      return [];
    }
    return (data || []).map((a) => ({
      id: a.alert_id,
      accountId: a.account_id,
      accountHolder: a.account_holder,
      pattern: a.pattern,
      riskScore: a.risk_score,
      amount: a.amount,
      jurisdiction: a.jurisdiction,
      detectedAt: new Date(a.detected_at).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }),
      status: a.alert_status as string,
      hops: a.hops,
      assignedTo: a.assigned_to,
      dbId: a.id,
    }));
  } catch (e: any) {
    console.error('getAlerts:', e.message);
    return [];
  }
}

export async function updateAlertStatus(dbId: string, status: string) {
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from('alerts')
      .update({ alert_status: status })
      .eq('id', dbId);
    if (error && isSchemaError(error)) throw error;
  } catch (e: any) {
    console.error('updateAlertStatus:', e.message);
  }
}

// ─── CASES ────────────────────────────────────────────────────────────────────

export async function getCases() {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .order('risk_score', { ascending: false });
    if (error) {
      if (isSchemaError(error)) throw error;
      return [];
    }
    return (data || []).map((c) => ({
      id: c.case_ref,
      subject: c.subject,
      pattern: c.pattern,
      score: c.risk_score,
      status: c.case_status as string,
      daysOpen: c.days_open,
      officer: c.assigned_officer,
      amount: c.amount,
      accountId: c.account_id,
      jurisdiction: c.jurisdiction,
      dbId: c.id,
    }));
  } catch (e: any) {
    console.error('getCases:', e.message);
    return [];
  }
}

export async function updateCaseStatus(dbId: string, status: string) {
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from('cases')
      .update({ case_status: status })
      .eq('id', dbId);
    if (error && isSchemaError(error)) throw error;
  } catch (e: any) {
    console.error('updateCaseStatus:', e.message);
  }
}

// ─── SAR REPORTS ──────────────────────────────────────────────────────────────

export async function getSARReports() {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('sar_reports')
      .select('*')
      .order('generated_at', { ascending: false });
    if (error) {
      if (isSchemaError(error)) throw error;
      return [];
    }
    return (data || []).map((r) => ({
      id: r.sar_id,
      caseRef: r.case_ref,
      subject: r.subject,
      accountId: r.account_id,
      pattern: r.pattern,
      riskScore: r.risk_score,
      amount: r.amount,
      generatedAt: new Date(r.generated_at).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }),
      status: r.sar_status as string,
      officer: r.officer,
      fiuRef: r.fiu_ref,
      dbId: r.id,
    }));
  } catch (e: any) {
    console.error('getSARReports:', e.message);
    return [];
  }
}

export async function updateSARStatus(dbId: string, status: string, fiuRef?: string) {
  const supabase = createClient();
  try {
    const update: any = { sar_status: status };
    if (fiuRef) update.fiu_ref = fiuRef;
    const { error } = await supabase.from('sar_reports').update(update).eq('id', dbId);
    if (error && isSchemaError(error)) throw error;
  } catch (e: any) {
    console.error('updateSARStatus:', e.message);
  }
}

export async function createSARReport(params: {
  alertId?: string;
  caseRef: string;
  subject: string;
  accountId: string;
  pattern: string;
  riskScore: number;
  amount: string;
  officer: string;
}) {
  const supabase = createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const sarId = `SAR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const { data, error } = await supabase
      .from('sar_reports')
      .insert({
        sar_id: sarId,
        case_ref: params.caseRef,
        subject: params.subject,
        account_id: params.accountId,
        pattern: params.pattern,
        risk_score: params.riskScore,
        amount: params.amount,
        sar_status: 'Pending Review',
        officer: params.officer,
        created_by: user?.id ?? null,
      })
      .select()
      .single();
    if (error) {
      if (isSchemaError(error)) throw error;
      console.error('createSARReport insert error:', error.message);
      return null;
    }
    return data;
  } catch (e: any) {
    console.error('createSARReport:', e.message);
    return null;
  }
}

// ─── ENTITIES ─────────────────────────────────────────────────────────────────

export async function getEntities() {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('entities')
      .select('*')
      .order('risk_score', { ascending: false });
    if (error) {
      if (isSchemaError(error)) throw error;
      return [];
    }
    return (data || []).map((e) => ({
      id: e.entity_code,
      name: e.name,
      type: e.entity_type as string,
      riskScore: e.risk_score,
      jurisdiction: e.jurisdiction,
      linkedAccounts: e.linked_accounts,
      linkedCases: e.linked_cases,
      kycStatus: e.kyc_status as string,
      flaggedAt: new Date(e.flagged_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      }),
      dbId: e.id,
    }));
  } catch (e: any) {
    console.error('getEntities:', e.message);
    return [];
  }
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

export async function getTransactions(limit = 50) {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('txn_timestamp', { ascending: false })
      .limit(limit);
    if (error) {
      if (isSchemaError(error)) throw error;
      return [];
    }
    return (data || []).map((t) => ({
      id: t.txn_id,
      fromAccount: t.from_account,
      toAccount: t.to_account,
      amountInr: t.amount_inr,
      amount: t.amount_display,
      type: t.txn_type,
      jurisdiction: t.jurisdiction,
      riskScore: t.risk_score,
      flagged: t.flagged,
      hops: t.hops,
      timestamp: new Date(t.txn_timestamp).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }),
      dbId: t.id,
    }));
  } catch (e: any) {
    console.error('getTransactions:', e.message);
    return [];
  }
}

// ─── USER PROFILES ────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string) {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      if (isSchemaError(error)) throw error;
      return null;
    }
    return data;
  } catch (e: any) {
    console.error('getUserProfile:', e.message);
    return null;
  }
}

export async function getAllUserProfiles() {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('full_name');
    if (error) {
      if (isSchemaError(error)) throw error;
      return [];
    }
    return data || [];
  } catch (e: any) {
    console.error('getAllUserProfiles:', e.message);
    return [];
  }
}

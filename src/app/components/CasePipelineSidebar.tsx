'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import RiskBadge, { getRiskLevel } from '@/components/ui/RiskBadge';
import { ArrowRight, Clock, Loader2 } from 'lucide-react';
import { getCases } from '@/lib/services/amlService';
import { createClient } from '@/lib/supabase/client';

interface CaseItem {
  id: string;
  subject: string;
  pattern: string;
  score: number;
  status: string;
  daysOpen: number;
  officer: string;
  dbId: string;
}

interface TopRiskAccount {
  id: string;
  score: number;
  holder: string;
}

export default function CasePipelineSidebar() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [topRisk, setTopRisk] = useState<TopRiskAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getCases();
      setCases((data as CaseItem[]).slice(0, 5));
      setLoading(false);
    }
    load();

    const supabase = createClient();
    const channel = supabase
      .channel('case_pipeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, async () => {
        const { data } = await supabase
          .from('alerts')
          .select('account_id, risk_score, account_holder')
          .gte('risk_score', 80)
          .order('risk_score', { ascending: false })
          .limit(4);
        if (data) {
          setTopRisk(data.map((a) => ({ id: a.account_id, score: a.risk_score, holder: a.account_holder })));
        }
      })
      .subscribe();

    // Load top risk accounts
    supabase
      .from('alerts')
      .select('account_id, risk_score, account_holder')
      .gte('risk_score', 80)
      .order('risk_score', { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (data) {
          setTopRisk(data.map((a) => ({ id: a.account_id, score: a.risk_score, holder: a.account_holder })));
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Case Pipeline */}
      <div className="card-elevated">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Case Pipeline</h2>
          <Link
            href="/case-investigation-detail"
            className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight size={10} />
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {cases.map((c) => (
              <div key={c.id} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-mono text-muted-foreground">{c.id}</p>
                    <p className="text-xs font-medium text-foreground truncate mt-0.5">{c.subject}</p>
                  </div>
                  <RiskBadge level={getRiskLevel(c.score)} score={c.score} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge status={c.status} />
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock size={9} />
                    <span className="font-mono">{c.daysOpen}d · {c.officer}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Risk Accounts */}
      <div className="card-elevated">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Top Risk Accounts</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Score ≥ 80 · Requires immediate review</p>
        </div>
        <div className="divide-y divide-border/50">
          {topRisk.map((acc) => (
            <div key={acc.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
              <div>
                <p className="text-xs font-mono text-foreground font-medium">{acc.id}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]">{acc.holder}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold font-mono text-risk-critical risk-score-font">{acc.score}</p>
                <p className="text-[9px] text-muted-foreground">/100</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
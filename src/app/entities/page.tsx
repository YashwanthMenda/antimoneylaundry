'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import RiskBadge, { getRiskLevel } from '@/components/ui/RiskBadge';
import { Users, Search, Filter, Building2, User, Globe, ChevronDown, Loader2 } from 'lucide-react';
import { getEntities } from '@/lib/services/amlService';
import { createClient } from '@/lib/supabase/client';

interface Entity {
  id: string;
  name: string;
  type: string;
  riskScore: number;
  jurisdiction: string;
  linkedAccounts: number;
  linkedCases: number;
  kycStatus: string;
  flaggedAt: string;
  dbId: string;
}

const typeFilters = ['All', 'Person', 'Company', 'Account'];
const kycFilters = ['All', 'Verified', 'Pending', 'Failed', 'Enhanced'];

const kycColors: Record<string, string> = {
  Verified: 'bg-green-500/10 text-green-400 border border-green-500/20',
  Pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  Failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
  Enhanced: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

const typeIcons: Record<string, React.ElementType> = {
  Person: User,
  Company: Building2,
  Account: Globe,
};

export default function EntitiesPage() {
  const [typeFilter, setTypeFilter] = useState('All');
  const [kycFilter, setKycFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<keyof Entity>('riskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getEntities();
      setEntities(data as Entity[]);
      setLoading(false);
    }
    load();

    const supabase = createClient();
    const channel = supabase
      .channel('entities_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entities' }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = entities
    .filter((e) => {
      const matchType = typeFilter === 'All' || e.type === typeFilter;
      const matchKyc = kycFilter === 'All' || e.kycStatus === kycFilter;
      const matchSearch =
        search === '' ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toLowerCase().includes(search.toLowerCase());
      return matchType && matchKyc && matchSearch;
    })
    .sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'desc' ? bv - av : av - bv;
      }
      return sortDir === 'desc'
        ? String(bv).localeCompare(String(av))
        : String(av).localeCompare(String(bv));
    });

  const handleSort = (col: keyof Entity) => {
    if (sortCol === col) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const highRiskCount = entities.filter((e) => e.riskScore >= 71).length;
  const kycFailedCount = entities.filter((e) => e.kycStatus === 'Failed').length;
  const enhancedCount = entities.filter((e) => e.kycStatus === 'Enhanced').length;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} className="text-primary" />
            <h1 className="text-lg font-bold text-foreground tracking-tight">Entity Registry</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Persons, companies, and accounts flagged by the AML detection engine
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Entities', value: entities.length, color: 'text-primary' },
          { label: 'High Risk (≥71)', value: highRiskCount, color: 'text-risk-critical' },
          { label: 'KYC Failed', value: kycFailedCount, color: 'text-red-400' },
          { label: 'Enhanced DD', value: enhancedCount, color: 'text-blue-400' },
        ].map((s, i) => (
          <div key={`stat-${i}`} className="card-elevated p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{s.label}</p>
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{loading ? '…' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card-elevated">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2 bg-muted rounded px-3 py-1.5 flex-1 min-w-[200px] max-w-xs">
            <Search size={12} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search entity name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter size={11} className="text-muted-foreground mr-1" />
            {typeFilters.map((f) => (
              <button
                key={`tf-${f}`}
                onClick={() => setTypeFilter(f)}
                className={`text-[10px] font-semibold px-2 py-1 rounded transition-all duration-150 ${
                  typeFilter === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 border-l border-border pl-3">
            {kycFilters.map((f) => (
              <button
                key={`kf-${f}`}
                onClick={() => setKycFilter(f)}
                className={`text-[10px] font-semibold px-2 py-1 rounded transition-all duration-150 ${
                  kycFilter === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
            {filtered.length} entities
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {[
                    { key: 'id', label: 'Entity ID' },
                    { key: 'name', label: 'Name' },
                    { key: 'type', label: 'Type' },
                    { key: 'riskScore', label: 'Risk Score' },
                    { key: 'jurisdiction', label: 'Jurisdiction' },
                    { key: 'linkedAccounts', label: 'Accounts' },
                    { key: 'linkedCases', label: 'Cases' },
                    { key: 'kycStatus', label: 'KYC Status' },
                    { key: 'flaggedAt', label: 'Flagged' },
                  ].map((col) => (
                    <th
                      key={`th-${col.key}`}
                      className={`px-4 py-3 text-left font-semibold text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap ${
                        sortCol === col.key ? 'text-foreground' : ''
                      }`}
                      onClick={() => handleSort(col.key as keyof Entity)}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {sortCol === col.key && (
                          <ChevronDown size={10} className={sortDir === 'asc' ? 'rotate-180' : ''} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const TypeIcon = typeIcons[e.type] || Globe;
                  return (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-100">
                      <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">{e.id}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-medium text-foreground">{e.name}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <TypeIcon size={12} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{e.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <RiskBadge level={getRiskLevel(e.riskScore)} score={e.riskScore} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{e.jurisdiction}</td>
                      <td className="px-4 py-3 text-center font-mono text-foreground">{e.linkedAccounts}</td>
                      <td className="px-4 py-3 text-center font-mono text-foreground">{e.linkedCases}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${kycColors[e.kycStatus] || ''}`}>
                          {e.kycStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap text-[10px]">
                        {e.flaggedAt}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

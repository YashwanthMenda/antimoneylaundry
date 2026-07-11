'use client';

import React, { useState } from 'react';
import RiskBadge, { getRiskLevel } from '@/components/ui/RiskBadge';
import { ChevronDown, ArrowRight } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  fromAccount: string;
  fromHolder: string;
  toAccount: string;
  toHolder: string;
  amount: string;
  amountNum: number;
  type: string;
  riskScore: number;
  jurisdiction: string;
  hop: number;
  flagged: string;
}

const transactions: Transaction[] = [
  {
    id: 'TXN-2026-44821',
    date: '11-Jul-2026 12:08',
    fromAccount: 'AXIS-3301',
    fromHolder: 'Kavita Malhotra',
    toAccount: 'HDFC-4521',
    toHolder: 'Ananya Trading',
    amount: '₹1,99,000',
    amountNum: 199000,
    type: 'NEFT',
    riskScore: 89,
    jurisdiction: 'Delhi → Mumbai',
    hop: 1,
    flagged: 'Sub-threshold deposit #47',
  },
  {
    id: 'TXN-2026-44819',
    date: '11-Jul-2026 11:45',
    fromAccount: 'HDFC-4521',
    fromHolder: 'Ananya Trading',
    toAccount: 'KOTAK-8812',
    toHolder: 'Sunrise Exports',
    amount: '₹1,99,000',
    amountNum: 199000,
    type: 'RTGS',
    riskScore: 91,
    jurisdiction: 'Mumbai → Mumbai',
    hop: 2,
    flagged: 'Immediate pass-through',
  },
  {
    id: 'TXN-2026-44780',
    date: '09-Jul-2026 15:22',
    fromAccount: 'PNB-7712',
    fromHolder: 'Raj Commodities',
    toAccount: 'HDFC-4521',
    toHolder: 'Ananya Trading',
    amount: '₹1,98,500',
    amountNum: 198500,
    type: 'NEFT',
    riskScore: 87,
    jurisdiction: 'Chennai → Mumbai',
    hop: 1,
    flagged: 'Sub-threshold deposit #46',
  },
  {
    id: 'TXN-2026-44775',
    date: '09-Jul-2026 16:01',
    fromAccount: 'KOTAK-8812',
    fromHolder: 'Sunrise Exports',
    toAccount: 'YES-4490',
    toHolder: 'Gulf Ventures FZE',
    amount: '₹3,97,500',
    amountNum: 397500,
    type: 'Wire',
    riskScore: 94,
    jurisdiction: 'Mumbai → Dubai',
    hop: 3,
    flagged: 'Cross-border layering',
  },
  {
    id: 'TXN-2026-44731',
    date: '07-Jul-2026 09:18',
    fromAccount: 'BOB-5521',
    fromHolder: 'Suresh Ananya',
    toAccount: 'HDFC-4521',
    toHolder: 'Ananya Trading',
    amount: '₹1,99,900',
    amountNum: 199900,
    type: 'IMPS',
    riskScore: 88,
    jurisdiction: 'Pune → Mumbai',
    hop: 1,
    flagged: 'Sub-threshold deposit #45',
  },
  {
    id: 'TXN-2026-44698',
    date: '05-Jul-2026 22:47',
    fromAccount: 'YES-4490',
    fromHolder: 'Gulf Ventures FZE',
    toAccount: 'SG-OCBC-9901',
    toHolder: 'Pacific Holdings Ltd',
    amount: '₹3,97,500',
    amountNum: 397500,
    type: 'SWIFT',
    riskScore: 96,
    jurisdiction: 'Dubai → Singapore',
    hop: 4,
    flagged: 'FATF high-risk jurisdiction',
  },
  {
    id: 'TXN-2026-44601',
    date: '02-Jul-2026 14:30',
    fromAccount: 'ICICI-2209',
    fromHolder: 'Mehta Constructions',
    toAccount: 'HDFC-4521',
    toHolder: 'Ananya Trading',
    amount: '₹1,97,800',
    amountNum: 197800,
    type: 'NEFT',
    riskScore: 85,
    jurisdiction: 'Ahmedabad → Mumbai',
    hop: 1,
    flagged: 'Sub-threshold deposit #44',
  },
  {
    id: 'TXN-2026-44590',
    date: '01-Jul-2026 03:12',
    fromAccount: 'SG-OCBC-9901',
    fromHolder: 'Pacific Holdings Ltd',
    toAccount: 'HDFC-4521',
    toHolder: 'Ananya Trading',
    amount: '₹7,95,000',
    amountNum: 795000,
    type: 'SWIFT',
    riskScore: 97,
    jurisdiction: 'Singapore → Mumbai',
    hop: 5,
    flagged: 'Round-trip return leg',
  },
  {
    id: 'TXN-2026-44512',
    date: '28-Jun-202611:05',
    fromAccount: 'AXIS-7731',
    fromHolder: 'Deepak Logistics',
    toAccount: 'HDFC-4521',
    toHolder: 'Ananya Trading',
    amount: '₹1,98,000',
    amountNum: 198000,
    type: 'NEFT',
    riskScore: 86,
    jurisdiction: 'Surat → Mumbai',
    hop: 1,
    flagged: 'Sub-threshold deposit #43',
  },
  {
    id: 'TXN-2026-44489',
    date: '26-Jun-2026 19:33',
    fromAccount: 'HDFC-4521',
    fromHolder: 'Ananya Trading',
    toAccount: 'KOTAK-8812',
    toHolder: 'Sunrise Exports',
    amount: '₹5,93,800',
    amountNum: 593800,
    type: 'RTGS',
    riskScore: 90,
    jurisdiction: 'Mumbai → Mumbai',
    hop: 2,
    flagged: 'Aggregated pass-through',
  },
];

export default function TransactionsTab() {
  const [sortCol, setSortCol] = useState<keyof Transaction>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [hopFilter, setHopFilter] = useState<number | null>(null);

  const filtered = transactions
    .filter((t) => hopFilter === null || t.hop === hopFilter)
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

  const handleSort = (col: keyof Transaction) => {
    if (sortCol === col) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const totalAmount = filtered.reduce((s, t) => s + t.amountNum, 0);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { id: 'ts-total', label: 'Total Transactions', value: '47 flagged' },
          { id: 'ts-amount', label: 'Cumulative Amount', value: '₹1,47,32,000' },
          { id: 'ts-hops', label: 'Max Chain Depth', value: '6 hops' },
          { id: 'ts-jurisdictions', label: 'Jurisdictions', value: '4 countries' },
        ].map((s) => (
          <div key={s.id} className="card-elevated px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className="text-sm font-bold font-mono text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Hop filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Filter by hop:</span>
        {[null, 1, 2, 3, 4, 5].map((h) => (
          <button
            key={`hop-${h ?? 'all'}`}
            onClick={() => setHopFilter(h)}
            className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded transition-all duration-150 ${
              hopFilter === h
                ? 'bg-primary/10 text-primary' :'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {h === null ? 'All' : `Hop ${h}`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card-elevated overflow-x-auto scrollbar-thin">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {[
                { key: 'id', label: 'TXN ID' },
                { key: 'date', label: 'Date & Time' },
                { key: 'fromAccount', label: 'From' },
                { key: 'toAccount', label: 'To' },
                { key: 'amount', label: 'Amount' },
                { key: 'type', label: 'Type' },
                { key: 'hop', label: 'Hop' },
                { key: 'riskScore', label: 'Risk' },
                { key: 'jurisdiction', label: 'Jurisdiction' },
                { key: 'flagged', label: 'Flag Reason' },
              ].map((col) => (
                <th
                  key={`txth-${col.key}`}
                  onClick={() => handleSort(col.key as keyof Transaction)}
                  className={`px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors ${
                    sortCol === col.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
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
            {filtered.map((txn) => {
              const level = getRiskLevel(txn.riskScore);
              return (
                <tr
                  key={txn.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap text-[10px]">
                    {txn.id}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap text-[10px]">
                    {txn.date}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-mono text-foreground font-medium">{txn.fromAccount}</p>
                    <p className="text-muted-foreground text-[10px] truncate max-w-[110px]">{txn.fromHolder}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <ArrowRight size={10} className="text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-mono text-foreground font-medium">{txn.toAccount}</p>
                        <p className="text-muted-foreground text-[10px] truncate max-w-[110px]">{txn.toHolder}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-foreground font-semibold whitespace-nowrap">
                    {txn.amount}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-[10px] font-mono font-semibold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {txn.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted w-6 h-6 rounded-full inline-flex items-center justify-center">
                      {txn.hop}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <RiskBadge level={level} score={txn.riskScore} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[10px]">
                    {txn.jurisdiction}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] text-risk-medium font-medium leading-snug">
                      {txn.flagged}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/20">
              <td colSpan={4} className="px-4 py-3 text-[10px] font-semibold text-muted-foreground">
                Showing {filtered.length} transactions · Total value
              </td>
              <td className="px-4 py-3 font-mono font-bold text-foreground text-xs">
                ₹{(totalAmount / 100000).toFixed(2)}L
              </td>
              <td colSpan={5} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
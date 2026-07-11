'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getPatternBreakdown } from '@/lib/services/amlService';
import { createClient } from '@/lib/supabase/client';

interface PatternEntry {
  pattern: string;
  count: number;
  color: string;
}

const fallback: PatternEntry[] = [
  { pattern: 'Smurfing', count: 18, color: 'var(--risk-critical)' },
  { pattern: 'Layering', count: 12, color: 'var(--risk-high)' },
  { pattern: 'Round-Trip', count: 9, color: 'var(--risk-medium)' },
  { pattern: 'Shell Co.', count: 6, color: '#8b5cf6' },
  { pattern: 'Pass-Thru', count: 2, color: 'var(--muted-foreground)' },
];

interface TooltipPayload {
  payload: { pattern: string; count: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="text-foreground font-semibold">{d.pattern}</p>
      <p className="text-muted-foreground font-mono mt-1">{d.count} active alerts</p>
    </div>
  );
}

export default function PatternBreakdownChart() {
  const [data, setData] = useState<PatternEntry[]>(fallback);

  useEffect(() => {
    async function load() {
      const result = await getPatternBreakdown();
      if (result && result.length > 0) setData(result);
    }
    load();

    const supabase = createClient();
    const channel = supabase
      .channel('alerts_pattern')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="pattern"
            tick={{ fontSize: 11, fill: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((entry) => (
              <Cell key={`cell-${entry.pattern}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 space-y-1.5">
        {data.map((entry) => (
          <div key={`legend-${entry.pattern}`} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.pattern}</span>
            </div>
            <span className="font-mono text-foreground">{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
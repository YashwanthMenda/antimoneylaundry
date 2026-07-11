'use client';

import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getAlertVolume } from '@/lib/services/amlService';
import { createClient } from '@/lib/supabase/client';

interface HourlyBin {
  time: string;
  critical: number;
  high: number;
  medium: number;
}

const fallbackData: HourlyBin[] = Array.from({ length: 24 }, (_, h) => ({
  time: `${String(h).padStart(2, '0')}:00`,
  critical: Math.floor(Math.random() * 8),
  high: Math.floor(Math.random() * 14),
  medium: Math.floor(Math.random() * 20),
}));

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="text-muted-foreground font-mono mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={`tip-${entry.name}`} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-foreground font-medium capitalize">{entry.name}</span>
          <span className="font-mono text-foreground ml-auto pl-4">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AlertVolumeChart() {
  const [data, setData] = useState<HourlyBin[]>(fallbackData);

  useEffect(() => {
    async function load() {
      const result = await getAlertVolume();
      if (result && result.length > 0) setData(result);
    }
    load();

    const supabase = createClient();
    const channel = supabase
      .channel('alerts_volume')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--risk-critical)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--risk-critical)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--risk-high)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--risk-high)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradMedium" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--risk-medium)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--risk-medium)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          interval={3}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="medium" stroke="var(--risk-medium)" strokeWidth={1.5} fill="url(#gradMedium)" stackId="1" />
        <Area type="monotone" dataKey="high" stroke="var(--risk-high)" strokeWidth={1.5} fill="url(#gradHigh)" stackId="1" />
        <Area type="monotone" dataKey="critical" stroke="var(--risk-critical)" strokeWidth={2} fill="url(#gradCritical)" stackId="1" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
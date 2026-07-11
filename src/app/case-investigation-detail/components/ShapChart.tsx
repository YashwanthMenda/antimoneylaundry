'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

const shapData = [
  { feature: 'Below-threshold deposits (×47)', value: 35, positive: true },
  { feature: 'Connected to shell companies (×3)', value: 28, positive: true },
  { feature: 'Pass-through behavior (100%)', value: 15, positive: true },
  { feature: 'High-risk jurisdiction (AE/SG)', value: 9, positive: true },
  { feature: 'Transaction velocity spike', value: 8, positive: true },
  { feature: 'Director network risk score', value: 7, positive: true },
  { feature: 'Unusual hours activity (02-04h)', value: 5, positive: true },
  { feature: 'Account age (3+ years)', value: -5, positive: false },
  { feature: 'KYC verification (partial)', value: -5, positive: false },
  { feature: 'Business registration valid', value: -5, positive: false },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { feature: string; value: number; positive: boolean } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs max-w-[260px]">
      <p className="text-foreground font-medium mb-1 leading-snug">{d.feature}</p>
      <p className={`font-mono font-bold ${d.positive ? 'text-risk-critical' : 'text-risk-low'}`}>
        {d.positive ? '+' : ''}{d.value} pts
      </p>
    </div>
  );
}

export default function ShapChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={shapData}
        layout="vertical"
        margin={{ top: 0, right: 40, left: 4, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          domain={[-10, 40]}
        />
        <YAxis
          type="category"
          dataKey="feature"
          tick={{ fontSize: 10, fill: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}
          axisLine={false}
          tickLine={false}
          width={210}
        />
        <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
          {shapData.map((entry) => (
            <Cell
              key={`shap-${entry.feature.slice(0, 15)}`}
              fill={entry.positive ? 'var(--risk-critical)' : 'var(--risk-low)'}
              fillOpacity={entry.positive ? 0.85 : 0.7}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
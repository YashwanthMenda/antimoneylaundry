import React from 'react';

type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md';
}

const levelConfig: Record<RiskLevel, { label: string; className: string }> = {
  CRITICAL: {
    label: 'CRITICAL',
    className: 'bg-risk-critical border border-risk-critical text-white',
  },
  HIGH: {
    label: 'HIGH',
    className: 'bg-risk-high border border-risk-high text-white',
  },
  MEDIUM: {
    label: 'MEDIUM',
    className: 'bg-risk-medium border border-risk-medium text-accent-foreground',
  },
  LOW: {
    label: 'LOW',
    className: 'bg-risk-low border border-risk-low text-white',
  },
};

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 86) return 'CRITICAL';
  if (score >= 71) return 'HIGH';
  if (score >= 41) return 'MEDIUM';
  return 'LOW';
}

export default function RiskBadge({ level, score, size = 'md' }: RiskBadgeProps) {
  const config = levelConfig[level];
  const sizeClass = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono font-semibold tracking-wider ${sizeClass} ${config.className}`}
    >
      {level === 'CRITICAL' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
      {config.label}
      {score !== undefined && <span className="opacity-80">·{score}</span>}
    </span>
  );
}
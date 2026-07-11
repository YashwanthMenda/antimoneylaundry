import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  trendLabel?: string;
  variant?: 'default' | 'critical' | 'warning' | 'positive';
  icon?: React.ReactNode;
  mono?: boolean;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'card-elevated',
  critical: 'bg-risk-critical border border-risk-critical rounded-lg',
  warning: 'bg-risk-medium border border-risk-medium rounded-lg',
  positive: 'bg-risk-low border border-risk-low rounded-lg',
};

export default function MetricCard({
  label,
  value,
  subValue,
  trend,
  trendValue,
  trendLabel,
  variant = 'default',
  icon,
  mono = false,
  className = '',
}: MetricCardProps) {
  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up' ?'text-risk-critical'
      : trend === 'down' ?'text-risk-low' :'text-muted-foreground';

  return (
    <div className={`p-5 ${variantStyles[variant]} ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {label}
        </p>
        {icon && (
          <div className="text-muted-foreground opacity-60">{icon}</div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p
            className={`text-3xl font-bold text-foreground risk-score-font ${
              mono ? 'font-mono' : ''
            }`}
          >
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">{subValue}</p>
          )}
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon size={14} />
            <span className="text-xs font-semibold font-mono">{trendValue}</span>
          </div>
        )}
      </div>
      {trendLabel && (
        <p className="text-[10px] text-muted-foreground mt-2">{trendLabel}</p>
      )}
    </div>
  );
}
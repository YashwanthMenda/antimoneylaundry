import React from 'react';

type CaseStatus = 'Open' | 'Investigating' | 'Pending SAR' | 'SAR Filed' | 'Closed';
type AlertStatus = 'New' | 'Under Review' | 'Escalated' | 'Closed' | 'False Positive';

type StatusType = CaseStatus | AlertStatus;

interface StatusBadgeProps {
  status: StatusType;
}

const statusConfig: Record<StatusType, string> = {
  Open: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  Investigating: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  'Pending SAR': 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
  'SAR Filed': 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
  Closed: 'bg-muted text-muted-foreground border border-border',
  New: 'bg-primary/10 text-primary border border-primary/30',
  'Under Review': 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  Escalated: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
  'False Positive': 'bg-muted text-muted-foreground border border-border',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded font-mono tracking-wide ${statusConfig[status]}`}
    >
      {status}
    </span>
  );
}
'use client';

import React, { useState } from 'react';
import CaseOverviewTab from './CaseOverviewTab';
import TransactionsTab from './TransactionsTab';
import SARTab from './SARTab';
import ApprovalTimelineTab from './ApprovalTimelineTab';

const tabs = [
  { id: 'tab-overview', label: 'Overview', key: 'overview' },
  { id: 'tab-transactions', label: 'Transaction Chain', key: 'transactions' },
  { id: 'tab-sar', label: 'SAR Report', key: 'sar' },
  { id: 'tab-approval', label: 'Approval Timeline', key: 'approval' },
];

interface CaseDetailTabsProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  caseRef?: string | null;
}

export default function CaseDetailTabs({ activeTab: externalTab, setActiveTab: externalSetTab, caseRef }: CaseDetailTabsProps) {
  const [internalTab, setInternalTab] = useState('overview');

  const activeTab = externalTab ?? internalTab;
  const setActiveTab = externalSetTab ?? setInternalTab;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border mb-5">
        {tabs?.map((tab) => (
          <button
            key={tab?.id}
            onClick={() => setActiveTab(tab?.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-all duration-150 border-b-2 -mb-px ${
              activeTab === tab?.key
                ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab?.label}
          </button>
        ))}
      </div>
      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'overview' && <CaseOverviewTab />}
        {activeTab === 'transactions' && <TransactionsTab />}
        {activeTab === 'sar' && <SARTab />}
        {activeTab === 'approval' && <ApprovalTimelineTab caseRef={caseRef} />}
      </div>
    </div>
  );
}
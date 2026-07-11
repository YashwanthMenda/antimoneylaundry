'use client';

import React, { useState } from 'react';
import CaseOverviewTab from './CaseOverviewTab';
import TransactionsTab from './TransactionsTab';
import SARTab from './SARTab';

const tabs = [
  { id: 'tab-overview', label: 'Overview', key: 'overview' },
  { id: 'tab-transactions', label: 'Transaction Chain', key: 'transactions' },
  { id: 'tab-sar', label: 'SAR Report', key: 'sar' },
];

interface CaseDetailTabsProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export default function CaseDetailTabs({ activeTab: externalTab, setActiveTab: externalSetTab }: CaseDetailTabsProps) {
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
      </div>
    </div>
  );
}
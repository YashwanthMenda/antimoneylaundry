'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import CaseDetailHeader from './components/CaseDetailHeader';
import CaseDetailTabs from './components/CaseDetailTabs';

export default function CaseInvestigationDetailPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <AppLayout>
      <CaseDetailHeader onViewSAR={() => setActiveTab('sar')} />
      <CaseDetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />
    </AppLayout>
  );
}
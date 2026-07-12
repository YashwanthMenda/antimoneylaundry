'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import CaseDetailHeader from './components/CaseDetailHeader';
import CaseDetailTabs from './components/CaseDetailTabs';

function CaseInvestigationDetailContent() {
  const searchParams = useSearchParams();
  const caseRef = searchParams?.get('case') ?? null;
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <AppLayout>
      <CaseDetailHeader caseRef={caseRef} onViewSAR={() => setActiveTab('sar')} />
      <CaseDetailTabs activeTab={activeTab} setActiveTab={setActiveTab} caseRef={caseRef} />
    </AppLayout>
  );
}

export default function CaseInvestigationDetailPage() {
  return (
    <Suspense fallback={null}>
      <CaseInvestigationDetailContent />
    </Suspense>
  );
}
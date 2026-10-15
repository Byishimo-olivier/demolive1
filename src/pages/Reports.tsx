import React from 'react';
import { FinancialOverview } from '@/components/reports/FinancialOverview';
import { TimelineOverview } from '@/components/reports/TimelineOverview';
import { AlertsOverview } from '@/components/reports/AlertsOverview';

type ReportsProps = {
  projectId?: string;
};

export function Reports({ projectId }: ReportsProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Overview</h1>
          <p className="text-gray-500 mt-1">
            Comprehensive project analytics and insights
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <FinancialOverview projectId={projectId} />
        <TimelineOverview projectId={projectId} />
        <AlertsOverview projectId={projectId} />
      </div>
    </div>
  );
}

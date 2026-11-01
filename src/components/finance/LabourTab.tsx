import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Permissions } from '@/constants/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { approvalsApi } from '@/lib/approvals-api';
import { presetRange, type DateRange } from '@/lib/date-range';
import { DailyRegister } from './labour/DailyRegister';
import { WorkersList } from './labour/WorkersList';
import { LabourTotals } from './labour/LabourTotals';
import { PayRuns } from './labour/PayRuns';

interface LabourTabProps {
  projectId: string;
  // Called after a pay run adds or removes labour expenses
  onExpensesChanged?: () => void;
}

const SUB_TAB = 'rounded-lg px-3 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm';

export function LabourTab({ projectId, onExpensesChanged }: LabourTabProps) {
  const { can } = useAuth();
  const [tab, setTab] = useState('register');
  // Shared by totals and pay runs: this month by default
  const [period, setPeriod] = useState<DateRange>(presetRange('month'));

  const { data: access } = useQuery({
    queryKey: ['md-approvals', projectId],
    queryFn: async () => (await approvalsApi.getProjectSettings(projectId)).data,
    staleTime: 60_000,
  });
  const canRecord = can(Permissions.RECORD_LABOUR) || !!access?.isOwner || !!access?.isMd;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-900">Labour</h2>
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
          <TabsTrigger value="register" className={SUB_TAB}>Daily register</TabsTrigger>
          <TabsTrigger value="totals" className={SUB_TAB}>Totals</TabsTrigger>
          <TabsTrigger value="pay-runs" className={SUB_TAB}>Pay runs</TabsTrigger>
          <TabsTrigger value="workers" className={SUB_TAB}>Workers</TabsTrigger>
        </TabsList>
        <TabsContent value="register" className="mt-0">
          <DailyRegister projectId={projectId} canRecord={canRecord} />
        </TabsContent>
        <TabsContent value="totals" className="mt-0">
          <LabourTotals projectId={projectId} period={period} onPeriodChange={setPeriod} />
        </TabsContent>
        <TabsContent value="pay-runs" className="mt-0">
          <PayRuns
            projectId={projectId}
            period={period}
            onPeriodChange={setPeriod}
            canPost={!!access?.canRecordManualExpense}
            onExpensesChanged={onExpensesChanged}
          />
        </TabsContent>
        <TabsContent value="workers" className="mt-0">
          <WorkersList projectId={projectId} canRecord={canRecord} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

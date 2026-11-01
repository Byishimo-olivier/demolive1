import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Permissions } from '@/constants/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { approvalsApi } from '@/lib/approvals-api';
import { presetRange, type DateRange } from '@/lib/date-range';
import { DailyWorkSheet } from './work/DailyWorkSheet';
import { WorkPeriod } from './work/WorkPeriod';
import { PrepareInvoiceDialog } from './work/PrepareInvoiceDialog';

interface WorkDoneTabProps {
  projectId: string;
  // Called after an invoice is prepared
  onInvoicesChanged?: () => void;
}

const SUB_TAB = 'rounded-lg px-3 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm';

/** Quantities of work completed each day, and invoices prepared from them (daily or accumulated) */
export function WorkDoneTab({ projectId, onInvoicesChanged }: WorkDoneTabProps) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('day');
  const [period, setPeriod] = useState<DateRange>(presetRange('month'));
  const [invoicing, setInvoicing] = useState<{ startDate: string; endDate: string; amount: number } | null>(null);

  const { data: access } = useQuery({
    queryKey: ['md-approvals', projectId],
    queryFn: async () => (await approvalsApi.getProjectSettings(projectId)).data,
    staleTime: 60_000,
  });
  const owner = !!access?.isOwner || !!access?.isMd;
  const canRecord = can(Permissions.UPDATE_BOQ_PROGRESS) || owner;
  const canInvoice = can(Permissions.CREATE_INVOICE) || owner;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-gray-900">Work done</h2>
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
          <TabsTrigger value="day" className={SUB_TAB}>Daily sheet</TabsTrigger>
          <TabsTrigger value="period" className={SUB_TAB}>By period</TabsTrigger>
        </TabsList>
        <TabsContent value="day" className="mt-0">
          <DailyWorkSheet
            projectId={projectId}
            canRecord={canRecord}
            canInvoice={canInvoice}
            onPrepareInvoice={(date, amount) => setInvoicing({ startDate: date, endDate: date, amount })}
          />
        </TabsContent>
        <TabsContent value="period" className="mt-0">
          <WorkPeriod
            projectId={projectId}
            period={period}
            onPeriodChange={setPeriod}
            canInvoice={canInvoice}
            onPrepareInvoice={(startDate, endDate, amount) => setInvoicing({ startDate, endDate, amount })}
          />
        </TabsContent>
      </Tabs>

      <PrepareInvoiceDialog
        period={invoicing ? { startDate: invoicing.startDate, endDate: invoicing.endDate } : null}
        amount={invoicing?.amount ?? 0}
        projectId={projectId}
        onOpenChange={(open) => !open && setInvoicing(null)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['work-day', projectId] });
          queryClient.invalidateQueries({ queryKey: ['work-summary', projectId] });
          onInvoicesChanged?.();
        }}
      />
    </div>
  );
}

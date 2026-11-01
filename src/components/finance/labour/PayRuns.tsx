import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Loader2, Receipt, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { describeRange, type DateRange } from '@/lib/date-range';
import { labourApi, type PayRun } from '@/lib/labour-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';

interface Props {
  projectId: string;
  period: DateRange;
  onPeriodChange: (range: DateRange) => void;
  // Owner, or roles the Client authorized in writing
  canPost: boolean;
  onExpensesChanged?: () => void;
}

const day = (d: string) => format(new Date(d), 'MMM d, yyyy');

export function PayRuns({ projectId, period, onPeriodChange, canPost, onExpensesChanged }: Props) {
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['labour-pay-runs', projectId],
    queryFn: () => labourApi.listPayRuns(projectId),
  });
  const ready = !!(period.startDate && period.endDate);
  const { data: preview, isFetching: loadingPreview } = useQuery({
    queryKey: ['labour-attendance', projectId, period.startDate ?? '', period.endDate ?? '', 'all'],
    queryFn: () => labourApi.summary(projectId, period),
    enabled: ready,
  });
  const unpaid = preview?.totals.unpaidAmount ?? 0;
  const unpaidCount = preview?.totals.unpaidCount ?? 0;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['labour-pay-runs', projectId] });
    queryClient.invalidateQueries({ queryKey: ['labour-attendance', projectId] });
    onExpensesChanged?.();
  };

  const post = async () => {
    if (!period.startDate || !period.endDate) return;
    setBusy('post');
    try {
      const res = await labourApi.createPayRun(projectId, period.startDate, period.endDate);
      toast.success(`${res.data.reference} recorded as a labour expense`);
      setConfirming(false);
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not record the pay run'));
    } finally {
      setBusy(null);
    }
  };

  const undo = async (run: PayRun) => {
    if (!confirm(`Undo ${run.reference}? Its expense is removed and the days can be edited again.`)) return;
    setBusy(run._id);
    try {
      await labourApi.deletePayRun(run._id);
      toast.success(`${run.reference} undone`);
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not undo the pay run'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {canPost && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <DateRangeFilter value={period} onChange={onPeriodChange} label="Pay period" />
            <div className="flex items-center gap-3">
              {ready && (
                <span className="text-sm text-gray-600">
                  Unpaid {loadingPreview ? '…' : <span className="font-semibold text-gray-900">{formatAmount(unpaid)}</span>}
                </span>
              )}
              <Button
                onClick={() => setConfirming(true)}
                disabled={!ready || unpaid <= 0 || loadingPreview}
                className="bg-gray-900 text-white hover:bg-gray-800"
              >
                <Receipt className="mr-2 h-4 w-4" />
                Record as expense
              </Button>
            </div>
          </div>
          {!ready && <p className="mt-2 text-xs text-gray-500">Pick the start and end of the pay period.</p>}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-500">No pay runs yet</CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Reference</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Workers</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Recorded</TableHead>
                {canPost && <TableHead className="w-[1%]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run._id}>
                  <TableCell className="font-medium text-gray-900">{run.reference}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-gray-600">
                    {day(run.startDate)} – {day(run.endDate)}
                  </TableCell>
                  <TableCell className="text-right">{run.workerCount}</TableCell>
                  <TableCell className="text-right">{run.attendanceCount}</TableCell>
                  <TableCell className="whitespace-nowrap text-right font-semibold">{formatAmount(run.totalAmount)}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {run.createdByName ? `${run.createdByName} · ` : ''}
                    {format(new Date(run.createdAt), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  {canPost && (
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => undo(run)} disabled={!!busy} title="Undo pay run">
                        {busy === run._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record labour as an expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-gray-700">
            <p>{describeRange(period)}</p>
            <p>
              <span className="text-2xl font-semibold text-gray-900">{formatAmount(unpaid)}</span>
              <span className="ml-2 text-gray-500">{unpaidCount} unpaid attendance lines</span>
            </p>
            <p className="text-gray-500">These days are locked once recorded. Undo the pay run to correct them.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy === 'post'}>
              Cancel
            </Button>
            <Button onClick={post} disabled={busy === 'post'} className="bg-gray-900 text-white hover:bg-gray-800">
              {busy === 'post' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

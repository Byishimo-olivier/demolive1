import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Loader2, Lock, Save, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ATTENDANCE_STATUSES,
  DEFAULT_PERIOD_DAYS,
  isPeriodRate,
  labourApi,
  lineAmount,
  rateUnit,
  workedUnit,
  type AttendanceStatus,
  type RegisterEntry,
  type Worker,
} from '@/lib/labour-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getErrorMessage } from '@/utils/error-handler';

interface Props {
  projectId: string;
  canRecord: boolean;
}

// Days for daily and period rates; hours and units are entered
const countsDays = (worker: Worker) => worker.rateType === 'Daily' || isPeriodRate(worker.rateType);
const defaultUnits = (worker: Worker, status: AttendanceStatus): number | '' => {
  if (!countsDays(worker)) return status === 'Present' || status === 'Half day' ? '' : 0;
  return status === 'Present' ? 1 : status === 'Half day' ? 0.5 : 0;
};

const unitLabel = (worker: Worker) => workedUnit(worker.rateType, worker.unitLabel);
// Days a worker's rate covers (1 unless paid per week / 10 days / 15 days / month)
const periodDaysOf = (worker: Worker) => (isPeriodRate(worker.rateType) ? worker.periodDays ?? DEFAULT_PERIOD_DAYS[worker.rateType] ?? 1 : 1);

export function DailyRegister({ projectId, canRecord }: Props) {
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [entries, setEntries] = useState<Record<string, RegisterEntry>>({});
  const [saving, setSaving] = useState(false);

  const { data: workers = [], isLoading: loadingWorkers } = useQuery({
    queryKey: ['labour-workers', projectId],
    queryFn: () => labourApi.listWorkers(projectId),
  });
  const { data: day, isLoading: loadingDay } = useQuery({
    queryKey: ['labour-attendance', projectId, date, date],
    queryFn: () => labourApi.summary(projectId, { startDate: date, endDate: date }),
  });

  const rowsByWorker = useMemo(() => new Map((day?.rows ?? []).map((r) => [r.workerId, r])), [day]);
  // Active workers, plus inactive ones who already have a line that day
  const listed = useMemo(
    () => workers.filter((w) => w.active || rowsByWorker.has(w._id)).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [workers, rowsByWorker]
  );

  useEffect(() => {
    const next: Record<string, RegisterEntry> = {};
    for (const worker of listed) {
      const row = rowsByWorker.get(worker._id);
      next[worker._id] = row
        ? { workerId: worker._id, status: row.status, units: row.units, remarks: row.remarks ?? '' }
        : { workerId: worker._id, status: 'Present', units: defaultUnits(worker, 'Present'), remarks: '' };
    }
    setEntries(next);
  }, [listed, rowsByWorker]);

  const setEntry = (worker: Worker, patch: Partial<RegisterEntry>) =>
    setEntries((prev) => {
      const current = prev[worker._id];
      const status = patch.status ?? current.status;
      return {
        ...prev,
        [worker._id]: {
          ...current,
          ...patch,
          ...(patch.status && patch.units === undefined ? { units: defaultUnits(worker, status) } : {}),
        },
      };
    });

  const total = listed.reduce((sum, w) => {
    const e = entries[w._id];
    const units = e?.units === '' || e?.units === undefined ? 0 : Number(e.units);
    const row = rowsByWorker.get(w._id);
    return sum + lineAmount(units, row?.rate ?? w.rate, row ? row.periodDays ?? 1 : periodDaysOf(w));
  }, 0);

  const save = async () => {
    const open = listed.filter((w) => !rowsByWorker.get(w._id)?.paid);
    const missing = open.filter((w) => !countsDays(w) && ['Present', 'Half day'].includes(entries[w._id]?.status) && entries[w._id]?.units === '');
    if (missing.length) {
      toast.error(`Enter the ${unitLabel(missing[0])} for ${missing[0].fullName}`);
      return;
    }
    setSaving(true);
    try {
      const res = await labourApi.saveRegister(projectId, date, open.map((w) => entries[w._id]));
      toast.success(res.data.saved ? `Register saved (${res.data.saved} updated)` : 'No changes to save');
      queryClient.invalidateQueries({ queryKey: ['labour-attendance', projectId] });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save the register'));
    } finally {
      setSaving(false);
    }
  };

  if (loadingWorkers) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-9 w-[170px] bg-white"
            aria-label="Register date"
          />
          {loadingDay && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Day total <span className="font-semibold text-gray-900">{formatAmount(total)}</span>
          </span>
          {canRecord && listed.length > 0 && (
            <Button onClick={save} disabled={saving} className="bg-gray-900 text-white hover:bg-gray-800">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save register
            </Button>
          )}
        </div>
      </div>

      {listed.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">Add workers first, then record their attendance here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Worker</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Worked</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listed.map((worker) => {
                const entry = entries[worker._id];
                const row = rowsByWorker.get(worker._id);
                const locked = !!row?.paid || !canRecord;
                const rate = row?.rate ?? worker.rate;
                const periodDays = row ? row.periodDays ?? 1 : periodDaysOf(worker);
                const units = entry?.units === '' || entry?.units === undefined ? 0 : Number(entry.units);
                if (!entry) return null;
                return (
                  <TableRow key={worker._id}>
                    <TableCell className="min-w-[180px]">
                      <p className="font-medium text-gray-900">{worker.fullName}</p>
                      <p className="text-xs text-gray-500">
                        {worker.trade ? `${worker.trade} · ` : ''}
                        {formatAmount(rate)} / {rateUnit(worker.rateType, worker.unitLabel)}
                        {periodDays > 1 && ` (${periodDays} days)`}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Select value={entry.status} onValueChange={(v) => setEntry(worker, { status: v as AttendanceStatus })} disabled={locked}>
                        <SelectTrigger className="h-9 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ATTENDANCE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={entry.units}
                          onChange={(e) => setEntry(worker, { units: e.target.value === '' ? '' : Number(e.target.value) })}
                          disabled={locked}
                          className="h-9 w-[90px]"
                        />
                        <span className="text-xs text-gray-500">{unitLabel(worker)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={entry.remarks ?? ''}
                        onChange={(e) => setEntry(worker, { remarks: e.target.value })}
                        disabled={locked}
                        className="h-9 min-w-[160px]"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <span className="font-medium text-gray-900">{formatAmount(lineAmount(units, rate, periodDays))}</span>
                      {row?.paid && (
                        <span className="mt-0.5 flex items-center justify-end gap-1 text-xs text-gray-500" title="Included in a pay run">
                          <Lock className="h-3 w-3" />
                          {row.payRunReference ?? 'Paid'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

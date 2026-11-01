import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Loader2, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { describeRange, type DateRange } from '@/lib/date-range';
import { labourApi, rateUnit } from '@/lib/labour-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
  period: DateRange;
  onPeriodChange: (range: DateRange) => void;
}

const dayLabel = (d: string) => format(new Date(`${d}T00:00:00`), 'EEE, MMM d, yyyy');

export function LabourTotals({ projectId, period, onPeriodChange }: Props) {
  const { formatAmount } = useCurrency();
  const [workerId, setWorkerId] = useState('all');
  const [view, setView] = useState<'worker' | 'date'>('worker');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: workers = [] } = useQuery({
    queryKey: ['labour-workers', projectId],
    queryFn: () => labourApi.listWorkers(projectId),
  });
  const { data, isLoading } = useQuery({
    queryKey: ['labour-attendance', projectId, period.startDate ?? '', period.endDate ?? '', workerId],
    queryFn: () => labourApi.summary(projectId, { ...period, workerId: workerId === 'all' ? undefined : workerId }),
    placeholderData: (previous) => previous,
  });

  const totals = data?.totals;
  const rows = data?.rows ?? [];

  const tiles = [
    { label: 'Total labour cost', value: formatAmount(totals?.amount ?? 0) },
    { label: 'Not yet paid', value: formatAmount(totals?.unpaidAmount ?? 0), tone: (totals?.unpaidAmount ?? 0) > 0 ? 'text-amber-700' : undefined },
    { label: 'Worker-days', value: String(totals?.presentDays ?? 0) },
    { label: 'Workers', value: String(totals?.workerCount ?? 0) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <DateRangeFilter value={period} onChange={onPeriodChange} />
        <div className="flex gap-2">
          <Select value={workerId} onValueChange={setWorkerId}>
            <SelectTrigger className="h-9 w-[180px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All workers</SelectItem>
              {workers.map((w) => (
                <SelectItem key={w._id} value={w._id}>
                  {w.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={view} onValueChange={(v) => setView(v as 'worker' | 'date')}>
            <SelectTrigger className="h-9 w-[140px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="worker">By worker</SelectItem>
              <SelectItem value="date">By date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-gray-500">{t.label}</p>
            <p className={cn('mt-1 text-lg font-semibold text-gray-900', t.tone)}>{t.value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500">{describeRange(period)}</p>

      {isLoading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-500">No attendance recorded for this period</CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-8" />
                <TableHead>{view === 'worker' ? 'Worker' : 'Date'}</TableHead>
                <TableHead className="text-right">{view === 'worker' ? 'Days worked' : 'Workers present'}</TableHead>
                {view === 'worker' && <TableHead className="text-right">Rate</TableHead>}
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Unpaid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(view === 'worker'
                ? (data?.byWorker ?? []).map((w) => ({
                    key: w.workerId,
                    title: w.workerName,
                    subtitle: [w.trade, `${w.present} present · ${w.halfDay} half · ${w.absent} absent · ${w.leave} leave`].filter(Boolean).join(' · '),
                    count: w.rateType === 'Hourly' || w.rateType === 'Unit' ? `${w.units} ${w.rateType === 'Hourly' ? 'h' : w.unitLabel || 'units'}` : String(w.days),
                    rate: `${formatAmount(w.rate)} / ${rateUnit(w.rateType, w.unitLabel)}${(w.periodDays ?? 1) > 1 ? ` (${w.periodDays} days)` : ''}`,
                    amount: w.amount,
                    unpaid: w.unpaidAmount,
                    details: rows.filter((r) => r.workerId === w.workerId),
                  }))
                : (data?.byDate ?? []).map((d) => ({
                    key: d.date,
                    title: dayLabel(d.date),
                    subtitle: '',
                    count: String(d.workers),
                    rate: '',
                    amount: d.amount,
                    unpaid: d.unpaidAmount,
                    details: rows.filter((r) => r.date === d.date),
                  }))
              ).map((group) => (
                <Fragment key={group.key}>
                  <TableRow className="cursor-pointer" onClick={() => setExpanded(expanded === group.key ? null : group.key)}>
                    <TableCell>
                      {expanded === group.key ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{group.title}</p>
                      {group.subtitle && <p className="text-xs text-gray-500">{group.subtitle}</p>}
                    </TableCell>
                    <TableCell className="text-right">{group.count}</TableCell>
                    {view === 'worker' && <TableCell className="whitespace-nowrap text-right text-sm text-gray-600">{group.rate}</TableCell>}
                    <TableCell className="whitespace-nowrap text-right font-semibold text-gray-900">{formatAmount(group.amount)}</TableCell>
                    <TableCell className={cn('whitespace-nowrap text-right', group.unpaid > 0 ? 'text-amber-700' : 'text-gray-400')}>
                      {formatAmount(group.unpaid)}
                    </TableCell>
                  </TableRow>
                  {expanded === group.key && (
                    <TableRow className="bg-gray-50/60 hover:bg-gray-50/60">
                      <TableCell />
                      <TableCell colSpan={view === 'worker' ? 5 : 4} className="py-3">
                        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium">{view === 'worker' ? 'Date' : 'Worker'}</th>
                                <th className="px-3 py-2 text-left font-medium">Status</th>
                                <th className="px-3 py-2 text-right font-medium">Worked</th>
                                <th className="px-3 py-2 text-right font-medium">Rate</th>
                                <th className="px-3 py-2 text-right font-medium">Amount</th>
                                <th className="px-3 py-2 text-left font-medium">Remarks</th>
                                <th className="px-3 py-2 text-left font-medium">Recorded by</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {group.details.map((r) => (
                                <tr key={r._id}>
                                  <td className="whitespace-nowrap px-3 py-2">{view === 'worker' ? dayLabel(r.date) : r.workerName}</td>
                                  <td className="px-3 py-2">{r.status}</td>
                                  <td className="px-3 py-2 text-right">
                                    {r.units} {r.rateType === 'Hourly' ? 'h' : r.rateType === 'Unit' ? r.unitLabel || 'u' : 'd'}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-right">
                                    {formatAmount(r.rate)}
                                    <span className="text-xs text-gray-500"> / {rateUnit(r.rateType, r.unitLabel)}</span>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium">
                                    {formatAmount(r.amount)}
                                    {r.paid && <Lock className="ml-1 inline h-3 w-3 text-gray-400" aria-label={`Paid in ${r.payRunReference ?? 'a pay run'}`} />}
                                  </td>
                                  <td className="px-3 py-2 text-gray-600">{r.remarks || '—'}</td>
                                  <td className="px-3 py-2 text-gray-600">{r.recordedByName || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

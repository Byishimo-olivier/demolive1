import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { format, parse } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, Loader2, Scale, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { describeRange, type DateRange } from '@/lib/date-range';
import { dashboardApi } from '@/lib/dashboard-api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

interface Props {
  // The selected project, or all the user's projects when empty
  projectId?: string;
  projectName?: string;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const monthLabel = (key: string) => format(parse(key, 'yyyy-MM', new Date()), 'MMM yyyy');

/** Income, expenses and profit / loss, for one project or all of them */
export function ProfitLossPanel({ projectId, projectName }: Props) {
  const { formatAmount } = useCurrency();
  const [period, setPeriod] = useState<DateRange>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['profit-loss', projectId ?? 'all', period.startDate ?? '', period.endDate ?? ''],
    queryFn: () => dashboardApi.getProfitLoss(projectId, period),
    placeholderData: (previous) => previous,
  });

  // The dashboard's Refresh button
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener('dashboard-refresh', handler);
    return () => window.removeEventListener('dashboard-refresh', handler);
  }, [refetch]);

  const chart = useMemo(() => {
    if (!data?.trend.labels.length) return null;
    const options: ApexOptions = {
      chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit', stacked: false },
      colors: ['#059669', '#dc2626', '#111827'],
      stroke: { width: [0, 0, 3], curve: 'smooth' },
      plotOptions: { bar: { columnWidth: '45%', borderRadius: 3 } },
      dataLabels: { enabled: false },
      xaxis: { categories: data.trend.labels.map(monthLabel) },
      yaxis: { labels: { formatter: (v: number) => formatAmount(v) } },
      tooltip: { y: { formatter: (v: number) => formatAmount(v) } },
      legend: { position: 'top', horizontalAlign: 'left' },
      grid: { borderColor: '#f3f4f6' },
    };
    const series = [
      { name: 'Income', type: 'column', data: data.trend.income },
      { name: 'Expenses', type: 'column', data: data.trend.expenses },
      { name: 'Profit / loss', type: 'line', data: data.trend.profitLoss },
    ];
    return { options, series };
  }, [data, formatAmount]);

  const profit = data?.profitLoss ?? 0;
  const tiles = [
    {
      label: 'Income',
      value: data?.income.earned ?? 0,
      icon: ArrowDownCircle,
      tone: 'text-emerald-700',
      note: `Received ${formatAmount(data?.income.received ?? 0)} · outstanding ${formatAmount(data?.income.outstanding ?? 0)}`,
    },
    {
      label: 'Expenses',
      value: data?.expenses.approved ?? 0,
      icon: ArrowUpCircle,
      tone: 'text-red-600',
      note: data?.expenses.pendingCount
        ? `${formatAmount(data.expenses.pending)} awaiting approval (${data.expenses.pendingCount})`
        : 'Approved expenses',
    },
    {
      label: profit < 0 ? 'Loss' : 'Profit',
      value: profit,
      icon: Scale,
      tone: profit < 0 ? 'text-red-600' : 'text-emerald-700',
      note: data?.marginPercent != null ? `${data.marginPercent}% of income` : 'Income minus expenses',
    },
    {
      label: 'Cash position',
      value: data?.cashPosition ?? 0,
      icon: Wallet,
      tone: (data?.cashPosition ?? 0) < 0 ? 'text-red-600' : 'text-gray-900',
      note: 'Money received minus expenses',
    },
  ];

  const scope = projectName ?? (data ? `All projects (${data.projectCount})` : 'All projects');
  const maxCategory = Math.max(1, ...(data?.expenses.byCategory ?? []).map((c) => c.amount));

  return (
    <Card className="border-gray-200">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Profit &amp; Loss</h2>
            <p className="text-sm text-gray-500">
              {scope} · {describeRange(period)}
            </p>
          </div>
          <DateRangeFilter value={period} onChange={setPeriod} />
        </div>

        {isLoading && !data ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {tiles.map((tile) => (
                <div key={tile.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <tile.icon className="h-3.5 w-3.5" />
                    {tile.label}
                  </p>
                  <p className={cn('mt-1 text-xl font-semibold', tile.tone)}>{formatAmount(tile.value)}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{tile.note}</p>
                </div>
              ))}
            </div>

            {!!data?.income.awaitingApprovalCount && (
              <p className="-mt-2 text-xs text-gray-500">
                {data.income.awaitingApprovalCount} submitted invoice{data.income.awaitingApprovalCount > 1 ? 's' : ''} (
                {formatAmount(data.income.awaitingApproval)}) count as income once approved.
              </p>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h3 className="mb-2 text-sm font-medium text-gray-900">Month by month</h3>
                {chart ? (
                  <ReactApexChart options={chart.options} series={chart.series} type="line" height={280} />
                ) : (
                  <p className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                    No income or expenses in this period
                  </p>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-900">Expenses by category</h3>
                {data?.expenses.byCategory.length ? (
                  <ul className="space-y-3">
                    {data.expenses.byCategory.map((c) => (
                      <li key={c.category}>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">{capitalize(c.category)}</span>
                          <span className="font-medium text-gray-900">{formatAmount(c.amount)}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                          <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${(c.amount / maxCategory) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No approved expenses in this period</p>
                )}
              </div>
            </div>

            {!projectId && data && data.byProject.length > 1 && (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Profit / loss</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byProject.map((p) => (
                      <TableRow key={p.projectId}>
                        <TableCell className="font-medium text-gray-900">{p.name}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">{formatAmount(p.income)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right text-gray-600">{formatAmount(p.received)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">{formatAmount(p.expenses)}</TableCell>
                        <TableCell
                          className={cn('whitespace-nowrap text-right font-semibold', p.profitLoss < 0 ? 'text-red-600' : 'text-emerald-700')}
                        >
                          {formatAmount(p.profitLoss)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

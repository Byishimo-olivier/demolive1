import { useEffect, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { format, parse } from 'date-fns';
import { BarChart3, CalendarRange, Loader2, Scale, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi } from '@/lib/dashboard-api';
import { projectApi } from '@/lib/project-api';
import { timelineApi, type ProjectStage } from '@/lib/timeline-api';
import { overallTimelineProgress, stageProgress } from '@/components/timeline/timeline-utils';
import { CATEGORY_LABELS } from '@/components/finance/expense-details';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

// Chart colours (reference palette): income and expenses keep the same colour in every chart
const INCOME = '#2a78d6';
const EXPENSES = '#eb6834';
const BUDGET = '#c4c3bd';
const PROGRESS = '#2a78d6';
const PROFIT_LINE = '#0b0b0b';
const GRID = '#f1f0ec';
const AXIS_TEXT = '#6b6a65';

const monthLabel = (key: string) => {
  try {
    return format(parse(key, 'yyyy-MM', new Date()), 'MMM yy');
  } catch {
    return key;
  }
};
const categoryLabel = (key: string) => CATEGORY_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// Short money on axes: 1.2M, 850K
const compact = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${+(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${+(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${+(value / 1e3).toFixed(0)}K`;
  return String(Math.round(value));
};

const baseChart = (formatAmount: (n: number) => string): ApexOptions => ({
  chart: { toolbar: { show: false }, fontFamily: 'inherit', zoom: { enabled: false }, animations: { speed: 300 } },
  dataLabels: { enabled: false },
  grid: { borderColor: GRID, strokeDashArray: 0, padding: { left: 8, right: 8 } },
  legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px', labels: { colors: AXIS_TEXT }, markers: { size: 6 } },
  tooltip: { y: { formatter: (v: number) => formatAmount(v) } },
  states: { hover: { filter: { type: 'darken' } } },
});

interface Props {
  project: Project;
}

/** One project at a glance: four headline figures and the charts behind them */
export function ProjectDashboard({ project }: Props) {
  const { formatAmount } = useCurrency();
  const projectId = project._id;

  const financialsQuery = useQuery({
    queryKey: ['project-financials', projectId],
    queryFn: () => projectApi.getProjectFinancials(projectId).then((r) => r.data),
    retry: false,
  });
  const profitQuery = useQuery({
    queryKey: ['profit-loss', projectId, '', ''],
    queryFn: () => dashboardApi.getProfitLoss(projectId),
    retry: false,
  });
  const stagesQuery = useQuery({
    queryKey: ['project-stages', projectId],
    queryFn: () => timelineApi.getProjectStages(projectId).then((r) => r.data ?? []),
    retry: false,
  });

  // The page's Refresh button
  useEffect(() => {
    const handler = () => {
      financialsQuery.refetch();
      profitQuery.refetch();
      stagesQuery.refetch();
    };
    window.addEventListener('dashboard-refresh', handler);
    return () => window.removeEventListener('dashboard-refresh', handler);
  }, [financialsQuery, profitQuery, stagesQuery]);

  const fin = financialsQuery.data;
  const pl = profitQuery.data;
  const stages: ProjectStage[] = stagesQuery.data ?? [];

  const progress = Math.round(stages.length ? overallTimelineProgress(stages) : project.progress || 0);
  const budget = fin?.budget || project.budget || 0;
  const spent = fin?.expenses.approved ?? pl?.expenses.approved ?? 0;
  const income = pl?.income.earned ?? fin?.invoices.invoiced ?? 0;
  const received = pl?.income.received ?? fin?.invoices.paid ?? 0;
  const profit = pl?.profitLoss ?? fin?.profitLoss ?? 0;
  const margin = pl?.marginPercent ?? fin?.marginPercent ?? null;
  const used = pct(spent, budget);

  // ---------------------------------------------------------------- charts
  const monthly = useMemo(() => {
    if (!pl?.trend.labels.length) return null;
    const options: ApexOptions = {
      ...baseChart(formatAmount),
      chart: { ...baseChart(formatAmount).chart, type: 'line', stacked: false },
      colors: [INCOME, EXPENSES, PROFIT_LINE],
      stroke: { width: [2, 2, 2], colors: ['transparent', 'transparent', PROFIT_LINE], curve: 'smooth' },
      plotOptions: { bar: { columnWidth: '42%', borderRadius: 4, borderRadiusApplication: 'end' } },
      markers: { size: [0, 0, 4], strokeWidth: 2, strokeColors: '#ffffff', hover: { size: 6 } },
      xaxis: {
        categories: pl.trend.labels.map(monthLabel),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: AXIS_TEXT } },
      },
      yaxis: { labels: { formatter: compact, style: { colors: [AXIS_TEXT] } } },
      tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => formatAmount(v) } },
    };
    const series = [
      { name: 'Income', type: 'column', data: pl.trend.income },
      { name: 'Expenses', type: 'column', data: pl.trend.expenses },
      { name: 'Profit / loss', type: 'line', data: pl.trend.profitLoss },
    ];
    return { options, series };
  }, [pl, formatAmount]);

  const byCategory = useMemo(() => {
    const rows = (fin?.expenses.byCategory ?? []).filter((c) => c.planned > 0 || c.spent > 0);
    if (!rows.length) return null;
    rows.sort((a, b) => Math.max(b.planned, b.spent) - Math.max(a.planned, a.spent));
    const options: ApexOptions = {
      ...baseChart(formatAmount),
      chart: { ...baseChart(formatAmount).chart, type: 'bar' },
      colors: [BUDGET, EXPENSES],
      plotOptions: { bar: { horizontal: true, barHeight: '62%', borderRadius: 4, borderRadiusApplication: 'end' } },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: {
        categories: rows.map((r) => categoryLabel(r.category)),
        labels: { formatter: (v: string) => compact(Number(v)), style: { colors: AXIS_TEXT } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { style: { colors: [AXIS_TEXT] } } },
      tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => formatAmount(v) } },
    };
    const series = [
      { name: 'Budget', data: rows.map((r) => r.planned) },
      { name: 'Spent', data: rows.map((r) => r.spent) },
    ];
    return { options, series, height: Math.max(220, rows.length * 56 + 70) };
  }, [fin, formatAmount]);

  const timeline = useMemo(() => {
    if (!stages.length) return null;
    const ordered = [...stages].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).slice(0, 12);
    const options: ApexOptions = {
      ...baseChart(formatAmount),
      chart: { ...baseChart(formatAmount).chart, type: 'bar' },
      colors: [PROGRESS],
      plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 4, borderRadiusApplication: 'end' } },
      xaxis: {
        categories: ordered.map((s) => s.stage),
        max: 100,
        tickAmount: 4,
        labels: { formatter: (v: string) => `${Math.round(Number(v))}%`, style: { colors: AXIS_TEXT } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { maxWidth: 180, style: { colors: [AXIS_TEXT] } } },
      legend: { show: false },
      tooltip: {
        y: {
          formatter: (v: number, opts?: { dataPointIndex: number }) => {
            const stage = opts ? ordered[opts.dataPointIndex] : undefined;
            const dates = stage ? ` · ${format(new Date(stage.startDate), 'd MMM')} – ${format(new Date(stage.endDate), 'd MMM yyyy')}` : '';
            return `${Math.round(v)}%${dates}`;
          },
        },
      },
    };
    const series = [{ name: 'Progress', data: ordered.map((s) => Math.round(stageProgress(s))) }];
    return { options, series, height: Math.max(200, ordered.length * 40 + 50), more: stages.length - ordered.length };
  }, [stages, formatAmount]);

  const loading = financialsQuery.isLoading || profitQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Headline figures */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard icon={CalendarRange} label="Progress" value={`${progress}%`} note={stages.length ? `${stages.length} stages planned` : 'No timeline yet'}>
          <Meter value={progress} />
        </KpiCard>
        <KpiCard
          icon={Wallet}
          label="Budget used"
          value={budget > 0 ? `${used}%` : '—'}
          note={budget > 0 ? `${formatAmount(spent)} of ${formatAmount(budget)}` : `${formatAmount(spent)} spent, no budget set`}
        >
          {budget > 0 && <Meter value={used} warn={used > 90} />}
        </KpiCard>
        <KpiCard icon={TrendingUp} label="Income" value={formatAmount(income)} note={`Received ${formatAmount(received)}`} money />
        <KpiCard
          icon={profit < 0 ? TrendingDown : Scale}
          label={profit < 0 ? 'Loss' : 'Profit'}
          value={formatAmount(profit)}
          note={margin != null ? `${margin}% of income` : 'Income minus expenses'}
          tone={profit < 0 ? 'text-red-600' : 'text-emerald-700'}
          money
        />
      </div>

      {/* Money over time + where it goes */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-3"
          title="Income and expenses"
          subtitle="By month, with the profit or loss of each month"
          loading={loading}
          empty={!monthly}
          emptyText="No income or expenses recorded yet"
        >
          {monthly && <ReactApexChart options={monthly.options} series={monthly.series} type="line" height={300} />}
        </ChartCard>
        <ChartCard
          className="xl:col-span-2"
          title="Budget and spending"
          subtitle="Planned budget against approved expenses, by category"
          loading={loading}
          empty={!byCategory}
          emptyText="No budget or expenses by category yet"
        >
          {byCategory && <ReactApexChart options={byCategory.options} series={byCategory.series} type="bar" height={byCategory.height} />}
        </ChartCard>
      </div>

      {/* Timeline + money position */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-3"
          title="Timeline progress"
          subtitle={timeline?.more ? `First 12 stages by start date (${timeline.more} more on the timeline)` : 'Actual progress of each stage'}
          loading={stagesQuery.isLoading}
          empty={!timeline}
          emptyText="No stages planned yet"
        >
          {timeline && <ReactApexChart options={timeline.options} series={timeline.series} type="bar" height={timeline.height} />}
        </ChartCard>

        <Card className="border-gray-200 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Money position</CardTitle>
            <p className="text-sm text-gray-500">Contract, invoices and cash</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Spinner />
            ) : (
              <dl className="divide-y divide-gray-100 text-sm">
                {(
                  [
                    ['Contract value', fin?.contractAmount ?? 0],
                    ['Invoiced (income)', income],
                    ['Received', received],
                    ['Outstanding', fin?.invoices.outstanding ?? pl?.income.outstanding ?? 0],
                    ['Awaiting approval', fin?.invoices.awaitingApproval ?? pl?.income.awaitingApproval ?? 0],
                    ['Expenses pending approval', fin?.expenses.pending ?? pl?.expenses.pending ?? 0],
                  ] as [string, number][]
                ).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <dt className="text-gray-600">{label}</dt>
                    <dd className="font-medium text-gray-900">{formatAmount(value)}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between py-3">
                  <dt className="font-medium text-gray-900">Cash position</dt>
                  <dd className={cn('text-base font-semibold', (fin?.cashPosition ?? pl?.cashPosition ?? 0) < 0 ? 'text-red-600' : 'text-emerald-700')}>
                    {formatAmount(fin?.cashPosition ?? pl?.cashPosition ?? 0)}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  note,
  tone,
  money,
  children,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  note: string;
  tone?: string;
  money?: boolean;
  children?: ReactNode;
}) {
  return (
    <Card className="border-gray-200">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Icon className="h-4 w-4 text-gray-400" />
          {label}
        </div>
        <p className={cn('mt-2 break-words font-semibold', money ? 'text-xl' : 'text-2xl', tone ?? 'text-gray-900')}>{value}</p>
        {children}
        <p className="mt-1.5 text-xs text-gray-500">{note}</p>
      </CardContent>
    </Card>
  );
}

function Meter({ value, warn }: { value: number; warn?: boolean }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full', warn ? 'bg-amber-500' : 'bg-gray-900')} style={{ width: `${width}%` }} />
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  loading,
  empty,
  emptyText,
  className,
  children,
}: {
  title: string;
  subtitle: string;
  loading?: boolean;
  empty?: boolean;
  emptyText: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn('border-gray-200', className)}>
      <CardHeader className="pb-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <Spinner />
        ) : empty ? (
          <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
            <BarChart3 className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">{emptyText}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function Spinner() {
  return (
    <div className="flex h-[220px] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );
}

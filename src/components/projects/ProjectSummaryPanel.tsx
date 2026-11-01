import { useEffect, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  Loader2,
  Mail,
  Phone,
  Receipt,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn, humanizeLabel } from '@/lib/utils';
import { projectApi, type PeriodFinancials, type ProjectFinancials } from '@/lib/project-api';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { describeRange, hasRange, presetRange, type DateRange } from '@/lib/date-range';
import type { Project } from '@/types';

interface ProjectSummaryPanelProps {
  project: Project;
  progress: number;
  timeline: { startDate: string | null; endDate: string | null };
}

/**
 * Small summary cards for the project (client, contract, expenses, profit/loss,
 * timeline, progress). "View details" opens the full information and profit & loss.
 */
export function ProjectSummaryPanel({ project, progress, timeline }: ProjectSummaryPanelProps) {
  // Money on this page is always shown in Rwandan francs
  const { formatAmount } = useCurrency();
  const rwf = (n: number) => formatAmount(n, 'RWF');
  const [financials, setFinancials] = useState<ProjectFinancials | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  // Profit / loss for a chosen period (this month by default)
  const [period, setPeriod] = useState<DateRange>(presetRange('month'));
  const [periodFigures, setPeriodFigures] = useState<PeriodFinancials | null>(null);
  const [periodLoading, setPeriodLoading] = useState(false);

  useEffect(() => {
    if (!open || !hasRange(period)) {
      setPeriodFigures(null);
      return;
    }
    let cancelled = false;
    setPeriodLoading(true);
    projectApi
      .getProjectFinancials(project._id, period)
      .then((res) => !cancelled && setPeriodFigures(res.data.period ?? null))
      .catch(() => !cancelled && setPeriodFigures(null))
      .finally(() => !cancelled && setPeriodLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, project._id, period.startDate, period.endDate]);

  useEffect(() => {
    let cancelled = false;
    setFinancials(null);
    setFailed(false);
    projectApi
      .getProjectFinancials(project._id)
      .then((res) => !cancelled && setFinancials(res.data))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [project._id, project.updatedAt]);

  const contract = financials?.contractAmount ?? project.contractAmount ?? 0;
  const isProfit = (financials?.profitLoss ?? 0) >= 0;
  const loading = !financials && !failed;
  const pct = Math.min(100, Math.round(progress));
  const timelineText =
    timeline.startDate && timeline.endDate
      ? `${format(new Date(timeline.startDate), 'MMM d')} – ${format(new Date(timeline.endDate), 'MMM d, yyyy')}`
      : null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Project summary</h2>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="h-8 border-gray-200">
          View details
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile icon={Building2} label="Client" onClick={() => setOpen(true)}>
          {project.clientName || <Muted>Not set</Muted>}
          <Sub>{project.contactName ? project.contactName : 'No contact person'}</Sub>
        </Tile>

        <Tile icon={Briefcase} label="Contract" onClick={() => setOpen(true)}>
          {contract ? rwf(contract) : <Muted>Not set</Muted>}
          <Sub>Contract amount</Sub>
        </Tile>

        <Tile icon={Receipt} label="Expenses" onClick={() => setOpen(true)}>
          {financials ? rwf(financials.expenses.approved) : loading ? <Spinner /> : <Muted>—</Muted>}
          <Sub>
            {financials?.expenses.pending
              ? `+ ${rwf(financials.expenses.pending)} pending`
              : financials
                ? `of ${rwf(financials.budget)} budget`
                : 'Approved'}
          </Sub>
        </Tile>

        <Tile
          icon={isProfit ? TrendingUp : TrendingDown}
          label={isProfit ? 'Profit' : 'Loss'}
          tone={financials ? (isProfit ? 'good' : 'bad') : undefined}
          onClick={() => setOpen(true)}
        >
          {financials ? rwf(Math.abs(financials.profitLoss)) : loading ? <Spinner /> : <Muted>—</Muted>}
          <Sub>{financials?.marginPercent != null ? `${financials.marginPercent}% margin` : 'To date'}</Sub>
        </Tile>

        <Tile icon={CalendarDays} label="Timeline" onClick={() => setOpen(true)}>
          {timelineText || <Muted>No stages yet</Muted>}
          <Sub>
            {timeline.startDate && timeline.endDate
              ? `${Math.max(1, Math.round((new Date(timeline.endDate).getTime() - new Date(timeline.startDate).getTime()) / 86400000) + 1)} days`
              : 'Plan the stages'}
          </Sub>
        </Tile>

        <Tile icon={TrendingUp} label="Progress" onClick={() => setOpen(true)}>
          {pct}%
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-gray-100">
            <span className="block h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
          </span>
        </Tile>
      </div>

      {/* Full details */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
          <div className="min-w-0 shrink-0 border-b border-gray-100 px-6 pb-4 pt-6">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="truncate">{project.name}</DialogTitle>
              <DialogDescription>Project information and profit &amp; loss</DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Information */}
              <section className="space-y-4">
                <SectionTitle icon={Briefcase}>Project information</SectionTitle>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                  <Info label="Project">{project.name}</Info>
                  <Info label="Client">{project.clientName || <Muted>Not set</Muted>}</Info>
                  <Info label="Contract amount">{contract ? rwf(contract) : <Muted>Not set</Muted>}</Info>
                  <Info label="Timeline">{timelineText || <Muted>No stages yet</Muted>}</Info>
                  <Info label="Contact person" wide>
                    {project.contactName ? (
                      <span className="flex flex-wrap gap-x-4 gap-y-1 font-normal">
                        <span className="flex items-center gap-1.5 font-medium">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          {project.contactName}
                        </span>
                        {project.contactPhone && (
                          <a href={`tel:${project.contactPhone}`} className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            {project.contactPhone}
                          </a>
                        )}
                        {project.contactEmail && (
                          <a href={`mailto:${project.contactEmail}`} className="flex items-center gap-1.5 break-all text-gray-600 hover:text-gray-900">
                            <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                            {project.contactEmail}
                          </a>
                        )}
                      </span>
                    ) : (
                      <Muted>Not set</Muted>
                    )}
                  </Info>
                  <Info label="Overall progress" wide>
                    <span className="flex items-center gap-3">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <span className="block h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="tabular-nums">{pct}%</span>
                    </span>
                  </Info>
                </dl>

                {financials && financials.expenses.byCategory.some((c) => c.planned || c.spent) && (
                  <div className="pt-2">
                    <SectionTitle icon={Receipt}>Spent vs budget by category</SectionTitle>
                    <div className="mt-3 space-y-2.5">
                      {financials.expenses.byCategory
                        .filter((c) => c.planned || c.spent)
                        .map((c) => {
                          const used = c.planned > 0 ? Math.round((c.spent / c.planned) * 100) : c.spent > 0 ? 100 : 0;
                          const over = c.planned > 0 && c.spent > c.planned;
                          return (
                            <div key={c.category}>
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-medium text-gray-700">{humanizeLabel(c.category)}</span>
                                <span className={cn('tabular-nums', over ? 'text-red-700' : 'text-gray-500')}>
                                  {rwf(c.spent)} / {rwf(c.planned)}
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className={cn('h-full rounded-full', over ? 'bg-red-500' : used >= 90 ? 'bg-amber-500' : 'bg-emerald-500')}
                                  style={{ width: `${Math.min(100, used)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </section>

              {/* Profit & loss */}
              <section className="space-y-4">
                <SectionTitle icon={Wallet}>Profit &amp; loss</SectionTitle>
                {!financials ? (
                  <p className="flex items-center gap-2 text-sm text-gray-500">
                    {failed ? 'Financial figures are not available to you.' : <><Spinner /> Loading…</>}
                  </p>
                ) : (
                  <>
                    <div className={cn('rounded-xl p-4', isProfit ? 'bg-emerald-50' : 'bg-red-50')}>
                      <p className="text-xs font-medium text-gray-600">{isProfit ? 'Profit to date' : 'Loss to date'}</p>
                      <p className={cn('mt-1 break-words text-2xl font-bold', isProfit ? 'text-emerald-700' : 'text-red-700')}>
                        {rwf(Math.abs(financials.profitLoss))}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-600">
                        Contract amount minus approved expenses
                        {financials.marginPercent !== null && ` · ${financials.marginPercent}% margin`}
                      </p>
                    </div>
                    <dl className="divide-y divide-gray-100 text-sm">
                      <Row label="Contract amount">{rwf(financials.contractAmount)}</Row>
                      <Row label="Budget (category total)">{rwf(financials.budget)}</Row>
                      <Row label="Approved expenses">{rwf(financials.expenses.approved)}</Row>
                      <Row label="Budget remaining" tone={financials.budgetRemaining < 0 ? 'bad' : undefined}>
                        {financials.budgetRemaining < 0 ? `Over by ${rwf(-financials.budgetRemaining)}` : rwf(financials.budgetRemaining)}
                      </Row>
                      <Row label="Projected profit" hint="Contract − budget" tone={financials.projectedProfit < 0 ? 'bad' : 'good'}>
                        {rwf(financials.projectedProfit)}
                      </Row>
                      <Row label="Invoiced to client">{rwf(financials.invoices.invoiced)}</Row>
                      <Row label="Received">{rwf(financials.invoices.paid)}</Row>
                      <Row label="Outstanding">{rwf(financials.invoices.outstanding)}</Row>
                      <Row label="Cash position" hint="Received − spent" tone={financials.cashPosition < 0 ? 'bad' : 'good'}>
                        {rwf(financials.cashPosition)}
                      </Row>
                    </dl>

                    {/* The same figures for a chosen period */}
                    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-gray-900">By period</p>
                        <DateRangeFilter value={period} onChange={setPeriod} label="" />
                      </div>
                      {!hasRange(period) ? (
                        <p className="text-sm text-gray-500">Choose a period.</p>
                      ) : periodLoading && !periodFigures ? (
                        <p className="flex items-center gap-2 text-sm text-gray-500">
                          <Spinner /> Loading…
                        </p>
                      ) : periodFigures ? (
                        <>
                          <p className="text-xs text-gray-500">{describeRange(period)}</p>
                          <dl className="divide-y divide-gray-100 text-sm">
                            <Row label="Invoiced (approved and paid)" hint={`${periodFigures.invoiceCount} invoices`}>
                              {rwf(periodFigures.invoiced)}
                            </Row>
                            <Row label="Approved expenses" hint={`${periodFigures.expenseCount} expenses`}>
                              {rwf(periodFigures.expenses)}
                            </Row>
                            <Row label={periodFigures.profitLoss >= 0 ? 'Profit' : 'Loss'} hint="Invoiced − expenses" tone={periodFigures.profitLoss < 0 ? 'bad' : 'good'}>
                              {rwf(Math.abs(periodFigures.profitLoss))}
                            </Row>
                            <Row label="Received from client">{rwf(periodFigures.paid)}</Row>
                            <Row label="Cash flow" hint="Received − expenses" tone={periodFigures.cashFlow < 0 ? 'bad' : 'good'}>
                              {rwf(periodFigures.cashFlow)}
                            </Row>
                          </dl>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">Figures for this period are not available.</p>
                      )}
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Tile({
  icon: Icon,
  label,
  tone,
  onClick,
  children,
}: {
  icon: typeof Wallet;
  label: string;
  tone?: 'good' | 'bad';
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="border-gray-200 transition-colors hover:border-gray-300">
      <button type="button" onClick={onClick} className="block h-full w-full p-3.5 text-left">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <Icon className={cn('h-3.5 w-3.5', tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-gray-400')} />
          {label}
        </span>
        <span
          className={cn(
            'mt-1 block break-words text-sm font-semibold leading-snug [overflow-wrap:anywhere]',
            tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-gray-900'
          )}
        >
          {children}
        </span>
      </button>
    </Card>
  );
}

const Sub = ({ children }: { children: ReactNode }) => (
  <span className="mt-0.5 block truncate text-xs font-normal text-gray-500">{children}</span>
);

function SectionTitle({ icon: Icon, children }: { icon: typeof Wallet; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </h3>
  );
}

function Info({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-gray-900">{children}</dd>
    </div>
  );
}

function Row({ label, hint, tone, children }: { label: string; hint?: string; tone?: 'good' | 'bad'; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-gray-600">
        {label}
        {hint && <span className="ml-1 text-xs text-gray-400">({hint})</span>}
      </dt>
      <dd
        className={cn(
          'text-right font-medium tabular-nums',
          tone === 'bad' ? 'text-red-700' : tone === 'good' ? 'text-emerald-700' : 'text-gray-900'
        )}
      >
        {children}
      </dd>
    </div>
  );
}

const Muted = ({ children }: { children: ReactNode }) => <span className="font-normal text-gray-400">{children}</span>;

const Spinner = () => <Loader2 className="inline h-3.5 w-3.5 animate-spin text-gray-400" />;

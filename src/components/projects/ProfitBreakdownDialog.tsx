import type { ReactNode } from 'react';
import { ArrowRight, Calculator, TrendingDown, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn, humanizeLabel } from '@/lib/utils';
import type { ProjectFinancials } from '@/lib/project-api';

interface Props {
  financials: ProjectFinancials | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Open Finance on the given sub-tab (invoices or expenses)
  onOpenFinance: (section: 'invoices' | 'expenses') => void;
}

/** How the profit (or loss) is worked out: income minus expenses, and where each figure comes from */
export function ProfitBreakdownDialog({ financials: f, open, onOpenChange, onOpenFinance }: Props) {
  const { formatAmount } = useCurrency();
  const rwf = (n: number) => formatAmount(n, 'RWF');
  if (!f) return null;

  const income = f.invoices.invoiced;
  const expenses = f.expenses.approved;
  const profit = f.profitLoss;
  const isProfit = profit >= 0;
  const categories = f.expenses.byCategory.filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-orange-500" />
            How the {isProfit ? 'profit' : 'loss'} is worked out
          </DialogTitle>
          <DialogDescription>From the invoices and expenses recorded on this project, in Rwandan francs.</DialogDescription>
        </DialogHeader>

        {/* The formula */}
        <div className="rounded-xl bg-stone-950 p-4 text-white">
          <p className="text-xs uppercase tracking-wide text-white/50">Formula</p>
          <p className="mt-1 text-sm text-white/80">{isProfit ? 'Profit' : 'Loss'} = Total income − Total expenses</p>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center">
            <Figure label="Total income" value={rwf(income)} />
            <span className="text-lg text-white/50">−</span>
            <Figure label="Total expenses" value={rwf(expenses)} />
            <span className="text-lg text-white/50">=</span>
            <Figure
              label={isProfit ? 'Profit' : 'Loss'}
              value={`${isProfit ? '' : '−'}${rwf(Math.abs(profit))}`}
              tone={isProfit ? 'text-emerald-400' : 'text-red-400'}
            />
          </div>
          <p className="mt-3 text-xs text-white/60">
            Margin = {isProfit ? 'profit' : 'loss'} ÷ income × 100 ={' '}
            <span className="font-semibold text-white">{f.marginPercent != null ? `${f.marginPercent}%` : 'n/a (no income yet)'}</span>
          </p>
        </div>

        {/* Where the income comes from */}
        <Section
          title="Total income"
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          total={rwf(income)}
          rule="Invoices the client approved or paid. Drafts, rejected and voided invoices are left out."
          action={<GoTo onClick={() => onOpenFinance('invoices')}>Open invoices</GoTo>}
        >
          <Line label="Paid invoices (money received)" value={rwf(f.invoices.paid)} />
          <Line label="Approved, not paid yet (outstanding)" value={rwf(f.invoices.outstanding)} />
          <Line label="Total income" value={rwf(income)} strong />
          {!!f.invoices.awaitingApproval && (
            <Line label="Submitted, awaiting the client's approval (not counted)" value={rwf(f.invoices.awaitingApproval)} muted />
          )}
        </Section>

        {/* Where the expenses come from */}
        <Section
          title="Total expenses"
          icon={<TrendingDown className="h-4 w-4 text-red-600" />}
          total={rwf(expenses)}
          rule="Approved expenses: recorded by hand and from deliveries, labour pay runs, petty cash and subcontractor payments. Pending or rejected ones are left out."
          action={<GoTo onClick={() => onOpenFinance('expenses')}>Open expenses</GoTo>}
        >
          {categories.length === 0 ? (
            <p className="py-1 text-sm text-gray-500">No approved expenses yet.</p>
          ) : (
            categories.map((c) => (
              <Line
                key={c.category}
                label={humanizeLabel(c.category)}
                value={rwf(c.spent)}
                hint={expenses > 0 ? `${Math.round((c.spent / expenses) * 100)}%` : undefined}
              />
            ))
          )}
          <Line label="Total expenses" value={rwf(expenses)} strong />
          {!!f.expenses.pending && <Line label="Awaiting approval (not counted)" value={rwf(f.expenses.pending)} muted />}
        </Section>

        {/* Other ways to read the numbers */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Other
            label="Cash position"
            value={rwf(f.cashPosition)}
            negative={f.cashPosition < 0}
            rule="Money received (paid invoices) − total expenses"
          />
          <Other
            label="Expected profit at the end"
            value={f.contractAmount && f.budget ? rwf(f.projectedProfit) : 'Needs contract and budget'}
            negative={!!f.contractAmount && !!f.budget && f.projectedProfit < 0}
            rule="Contract amount − whole budget, if the budget is fully spent"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className={cn('break-words text-sm font-semibold sm:text-base', tone ?? 'text-white')}>{value}</p>
      <p className="text-[11px] text-white/50">{label}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  total,
  rule,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  total: string;
  rule: string;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-black/[0.07] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            {icon}
            {title} · {total}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">{rule}</p>
        </div>
        {action}
      </div>
      <div className="mt-3 divide-y divide-black/[0.05]">{children}</div>
    </section>
  );
}

function Line({ label, value, hint, strong, muted }: { label: string; value: string; hint?: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 py-1.5 text-sm', muted && 'text-gray-400', strong && 'font-semibold text-gray-900')}>
      <span className={cn('min-w-0', !strong && !muted && 'text-gray-600')}>{label}</span>
      <span className="shrink-0 tabular-nums">
        {hint && <span className="mr-2 text-xs font-normal text-gray-400">{hint}</span>}
        {value}
      </span>
    </div>
  );
}

function Other({ label, value, rule, negative }: { label: string; value: string; rule: string; negative?: boolean }) {
  return (
    <div className="rounded-xl bg-black/[0.03] p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn('mt-0.5 text-sm font-semibold', negative ? 'text-red-700' : 'text-gray-900')}>{value}</p>
      <p className="mt-0.5 text-[11px] text-gray-500">{rule}</p>
    </div>
  );
}

const GoTo = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <Button variant="outline" size="sm" onClick={onClick} className="h-8 shrink-0 border-gray-200 text-xs">
    {children}
    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
  </Button>
);

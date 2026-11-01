import { AlertTriangle } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { budgetUsage } from './timeline-utils';

interface BudgetUsageProps {
  budget?: number;
  used?: number;
  // Show the usage bar under the text
  showBar?: boolean;
  className?: string;
}

/** "Used X of Y" with a bar; spending above the budget is shown as "Over budget by Z" */
export function BudgetUsage({ budget = 0, used = 0, showBar = false, className }: BudgetUsageProps) {
  const { formatAmount } = useCurrency();
  const usage = budgetUsage(budget, used);

  return (
    <div className={cn('min-w-0', className)}>
      <p className="break-words [overflow-wrap:anywhere]">
        <span className={cn('font-medium', usage.isOver ? 'text-red-700' : 'text-gray-900')}>{formatAmount(usage.used)}</span>
        <span className="text-gray-500"> used of {formatAmount(usage.budget)}</span>
      </p>
      {showBar && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div
            className={cn('h-full rounded-full', usage.isOver ? 'bg-red-500' : usage.percent >= 90 ? 'bg-amber-500' : 'bg-emerald-500')}
            style={{ width: `${Math.min(100, usage.percent)}%` }}
          />
        </div>
      )}
      {usage.isOver ? (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-700">
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          Over budget by {formatAmount(usage.over)}
        </p>
      ) : (
        usage.budget > 0 && (
          <p className="mt-1 text-xs text-gray-500">{formatAmount(usage.remaining)} remaining</p>
        )
      )}
    </div>
  );
}

import type { Expense, ExpenseSourceKind } from '@/lib/finance-api';

export const EXPENSE_SOURCES: { value: ExpenseSourceKind; label: string }[] = [
  { value: 'Manual', label: 'Added manually' },
  { value: 'GRN', label: 'Goods received (GRN)' },
  { value: 'Request', label: 'Approved request' },
  { value: 'PettyCash', label: 'Petty cash' },
  { value: 'Labour', label: 'Labour pay run' },
  { value: 'Subcontractor', label: 'Subcontractor payment' },
  { value: 'PurchaseOrder', label: 'Purchase order' },
];

export function expenseSourceKind(expense: Expense): ExpenseSourceKind {
  if (expense.source?.kind) return expense.source.kind;
  // Older expenses booked when a purchase order was created
  return expense.description?.startsWith('Expense from Purchase Order') ? 'PurchaseOrder' : 'Manual';
}

/** "From GRN GRN-2610-0004", "Petty cash PC-2610-0002", "Added manually" … */
export function expenseSourceLabel(expense: Expense): string {
  const kind = expenseSourceKind(expense);
  const ref = expense.source?.reference ? ` ${expense.source.reference}` : '';
  switch (kind) {
    case 'GRN':
      return `From GRN${ref}`;
    case 'Request':
      return 'From approved request';
    case 'PettyCash':
      return `Petty cash${ref}`;
    case 'Labour':
      return `Labour${ref}`;
    case 'Subcontractor':
      return `Subcontractor${ref}`;
    case 'PurchaseOrder':
      return 'From purchase order';
    default:
      return 'Added manually';
  }
}

export const EXPENSE_SOURCE_STYLES: Record<ExpenseSourceKind, string> = {
  Manual: 'bg-gray-100 text-gray-700',
  GRN: 'bg-emerald-50 text-emerald-700',
  Request: 'bg-indigo-50 text-indigo-700',
  PettyCash: 'bg-amber-50 text-amber-700',
  Labour: 'bg-sky-50 text-sky-700',
  Subcontractor: 'bg-rose-50 text-rose-700',
  PurchaseOrder: 'bg-violet-50 text-violet-700',
};

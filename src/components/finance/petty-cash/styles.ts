import type { PettyCashStatus } from '@/lib/petty-cash-api';

export const PETTY_CASH_STATUS_STYLES: Record<PettyCashStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-700',
};

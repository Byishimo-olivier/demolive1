import type { ReceivingStatus } from '@/lib/receiving-api';

export const RECEIVING_STATUS_STYLES: Record<ReceivingStatus, string> = {
  'Pending Inspection': 'bg-gray-100 text-gray-700',
  'Submitted for Approval': 'bg-blue-50 text-blue-700',
  'Discrepancy Reported': 'bg-amber-50 text-amber-700',
  'Clarification Requested': 'bg-violet-50 text-violet-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-700',
};

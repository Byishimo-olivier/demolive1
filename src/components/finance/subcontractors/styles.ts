import type { SubcontractorPaymentStatus, SubcontractorStatus } from '@/lib/subcontractor-api';

export const PAYMENT_STATUS_STYLES: Record<SubcontractorPaymentStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-700',
};

export const SUBCONTRACTOR_STATUS_STYLES: Record<SubcontractorStatus, string> = {
  Active: 'bg-sky-50 text-sky-700',
  Completed: 'bg-gray-100 text-gray-700',
  Terminated: 'bg-red-50 text-red-700',
};

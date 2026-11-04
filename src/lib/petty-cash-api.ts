import { api } from './axios';
import { Permissions } from '../constants/permissions';
import { rangeParams, type DateRange } from './date-range';

export type PettyCashType = 'Payment' | 'Top-up';
export type PettyCashStatus = 'Pending' | 'Approved' | 'Rejected';

export interface PettyCashReceipt {
  _id?: string;
  url: string;
  fileName: string;
  fileType?: string;
  uploadedByName?: string;
  uploadedAt: string;
}

export interface PettyCashHistoryEntry {
  action: string;
  byName?: string;
  at: string;
  comment?: string;
}

export interface PettyCashRecord {
  _id: string;
  projectId: string;
  voucherNumber: string;
  type: PettyCashType;
  transactionDate: string;
  amount: number;
  description: string;
  category?: string;
  payee?: string;
  receiptNumber?: string;
  responsiblePerson: { userId?: string; name: string };
  // Top-ups: who sent the money, who received it, and the phone it went to
  sentBy?: { userId?: string; name: string };
  receivedBy?: { userId?: string; name: string };
  phone?: string;
  documents: PettyCashReceipt[];
  status: PettyCashStatus;
  approval?: { reviewedByName?: string; reviewedAt?: string; comment?: string };
  expenseRecorded: boolean;
  history: PettyCashHistoryEntry[];
  createdBy?: { _id: string; fullName?: string } | string;
  createdAt: string;
}

export interface PettyCashSummary {
  openingBalance: number;
  toppedUp: number;
  paidOut: number;
  closingBalance: number;
  pendingCount: number;
  pendingAmount: number;
  pendingTopUpAmount: number;
  byCategory: { category: string; amount: number; count: number }[];
}

export interface PettyCashList {
  transactions: PettyCashRecord[];
  summary: PettyCashSummary;
  people: { userId: string; name: string }[];
}

export interface PettyCashInput {
  projectId?: string;
  type: PettyCashType;
  transactionDate: string;
  amount: number;
  description: string;
  category?: string;
  payee?: string;
  receiptNumber?: string;
  responsiblePersonId?: string;
  responsiblePersonName?: string;
  sentById?: string;
  sentByName?: string;
  receivedById?: string;
  receivedByName?: string;
  phone?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const toFormData = (data: Record<string, unknown>, receipts?: File[]) => {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') form.append(key, String(value));
  });
  receipts?.forEach((file) => form.append('receipts', file));
  return form;
};

export const pettyCashApi = {
  list: async (
    projectId: string,
    filters: DateRange & { type?: string; status?: string; category?: string } = {}
  ) => {
    const { startDate, endDate, ...rest } = filters;
    const params = { ...rangeParams({ startDate, endDate }), ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v)) };
    const response = await api.get<ApiResponse<PettyCashList>>(`/finance/petty-cash/project/${projectId}`, {
      requiresPermission: Permissions.VIEW_PETTY_CASH,
      params,
    });
    return response.data.data;
  },

  get: async (id: string) => {
    const response = await api.get<ApiResponse<PettyCashRecord>>(`/finance/petty-cash/${id}`);
    return response.data.data;
  },

  create: async (data: PettyCashInput, receipts?: File[]) => {
    const response = await api.post<ApiResponse<PettyCashRecord>>(
      '/finance/petty-cash',
      toFormData({ ...data }, receipts),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  update: async (id: string, data: Partial<PettyCashInput>) => {
    const { projectId: _projectId, ...changes } = data;
    const response = await api.patch<ApiResponse<PettyCashRecord>>(`/finance/petty-cash/${id}`, changes);
    return response.data;
  },

  // The server checks the approver
  review: async (id: string, status: 'Approved' | 'Rejected', comment?: string) => {
    const response = await api.patch<ApiResponse<PettyCashRecord>>(`/finance/petty-cash/${id}/review`, { status, comment });
    return response.data;
  },

  addReceipts: async (id: string, receipts: File[]) => {
    const response = await api.post<ApiResponse<PettyCashRecord>>(
      `/finance/petty-cash/${id}/receipts`,
      toFormData({}, receipts),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  remove: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/finance/petty-cash/${id}`);
    return response.data;
  },
};

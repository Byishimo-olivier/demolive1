import { api } from './axios';
import { Permissions } from '../constants/permissions';
import { rangeParams, type DateRange } from './date-range';

export type SubcontractorStatus = 'Active' | 'Completed' | 'Terminated';
export type SubcontractorPaymentStatus = 'Pending' | 'Approved' | 'Rejected';

export interface SubcontractorTotals {
  contractAmount: number;
  paid: number;
  pending: number;
  // Contract amount not yet paid (negative when paid beyond the contract)
  remaining: number;
  paymentCount: number;
}

export interface Subcontractor {
  _id: string;
  projectId: string;
  name: string;
  trade: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  tin?: string;
  contractAmount: number;
  startDate?: string;
  endDate?: string;
  status: SubcontractorStatus;
  notes?: string;
  createdBy?: string;
  totals: SubcontractorTotals;
}

export interface SubcontractorInput {
  projectId?: string;
  name: string;
  trade: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  tin?: string;
  contractAmount?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  status?: SubcontractorStatus;
}

export interface SubcontractorPayment {
  _id: string;
  projectId: string;
  subcontractorId: string;
  subcontractorName: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  description: string;
  reference?: string;
  documents: { _id?: string; url: string; fileName: string; fileType?: string; uploadedByName?: string; uploadedAt: string }[];
  status: SubcontractorPaymentStatus;
  approval?: { reviewedByName?: string; reviewedAt?: string; comment?: string };
  expenseRecorded: boolean;
  history: { action: string; byName?: string; at: string; comment?: string }[];
  createdBy?: { _id: string; fullName?: string } | string;
  createdAt: string;
}

export interface SubcontractorPaymentInput {
  subcontractorId: string;
  paymentDate: string;
  amount: number;
  description: string;
  reference?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const toFormData = (data: Record<string, unknown>, documents?: File[]) => {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') form.append(key, String(value));
  });
  documents?.forEach((file) => form.append('documents', file));
  return form;
};

export const subcontractorApi = {
  list: async (projectId: string) => {
    const response = await api.get<ApiResponse<{ subcontractors: Subcontractor[]; summary: SubcontractorTotals }>>(
      `/finance/subcontractors/project/${projectId}`,
      { requiresPermission: Permissions.VIEW_SUBCONTRACTORS }
    );
    return response.data.data;
  },

  create: async (data: SubcontractorInput) => {
    const response = await api.post<ApiResponse<Subcontractor>>('/finance/subcontractors', data);
    return response.data;
  },

  update: async (id: string, data: Partial<SubcontractorInput>) => {
    const { projectId: _projectId, ...changes } = data;
    const response = await api.patch<ApiResponse<Subcontractor>>(`/finance/subcontractors/${id}`, changes);
    return response.data;
  },

  remove: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/finance/subcontractors/${id}`);
    return response.data;
  },

  listPayments: async (
    projectId: string,
    filters: DateRange & { subcontractorId?: string; status?: string } = {}
  ) => {
    const { startDate, endDate, ...rest } = filters;
    const params = { ...rangeParams({ startDate, endDate }), ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v)) };
    const response = await api.get<ApiResponse<SubcontractorPayment[]>>(`/finance/subcontractors/payments/project/${projectId}`, {
      requiresPermission: Permissions.VIEW_SUBCONTRACTORS,
      params,
    });
    return response.data.data;
  },

  createPayment: async (data: SubcontractorPaymentInput, documents?: File[]) => {
    const response = await api.post<ApiResponse<SubcontractorPayment>>(
      '/finance/subcontractors/payments',
      toFormData({ ...data }, documents),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  updatePayment: async (id: string, data: Partial<Omit<SubcontractorPaymentInput, 'subcontractorId'>>) => {
    const response = await api.patch<ApiResponse<SubcontractorPayment>>(`/finance/subcontractors/payments/${id}`, data);
    return response.data;
  },

  // The server checks the approver
  reviewPayment: async (id: string, status: 'Approved' | 'Rejected', comment?: string) => {
    const response = await api.patch<ApiResponse<SubcontractorPayment>>(`/finance/subcontractors/payments/${id}/review`, {
      status,
      comment,
    });
    return response.data;
  },

  removePayment: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/finance/subcontractors/payments/${id}`);
    return response.data;
  },
};

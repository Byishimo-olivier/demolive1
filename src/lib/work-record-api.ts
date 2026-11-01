import { api } from './axios';
import { Permissions } from '../constants/permissions';
import { rangeParams, type DateRange } from './date-range';
import type { Invoice } from './finance-api';

export interface WorkSheetItem {
  boqItemId: string;
  sectionName: string;
  description: string;
  unit: string;
  rate: number;
  boqQuantity: number;
  // Done on other days
  doneBefore: number;
  // Done this day, and its value
  quantity: number;
  amount: number;
  // Set once this day's quantity is on an invoice
  invoiceId: string | null;
}

export interface WorkSheet {
  date: string;
  remarks: string;
  recordedByName?: string;
  updatedByName?: string;
  updatedAt?: string;
  items: WorkSheetItem[];
}

export interface WorkSummary {
  startDate: string | null;
  endDate: string | null;
  totals: { amount: number; invoiced: number; uninvoiced: number; days: number };
  items: {
    boqItemId: string;
    sectionName: string;
    description: string;
    unit: string;
    rate: number;
    quantity: number;
    amount: number;
    invoicedQuantity: number;
    invoicedAmount: number;
    uninvoicedQuantity: number;
    uninvoicedAmount: number;
  }[];
  days: { date: string; items: number; amount: number; invoicedAmount: number; uninvoicedAmount: number; invoiceNumbers: string[]; recordedByName?: string }[];
  invoices: { _id: string; invoiceNumber: string; status: string; totalAmount: number }[];
}

export interface PrepareInvoiceInput {
  startDate: string;
  endDate?: string;
  invoiceDate?: string;
  dueDate: string;
  paymentTerms: string;
  paymentDetails: { bankName: string; accountNumber: string; accountName: string };
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const workRecordApi = {
  getDay: async (projectId: string, date: string) => {
    const response = await api.get<ApiResponse<WorkSheet>>(`/finance/work-records/project/${projectId}/day`, {
      requiresPermission: Permissions.VIEW_BOQ,
      params: { date },
    });
    return response.data.data;
  },

  saveDay: async (projectId: string, date: string, lines: { boqItemId: string; quantity: number }[], remarks?: string) => {
    const response = await api.put<ApiResponse<WorkSheet>>(`/finance/work-records/project/${projectId}/day/${date}`, { lines, remarks });
    return response.data;
  },

  summary: async (projectId: string, range: DateRange) => {
    const response = await api.get<ApiResponse<WorkSummary>>(`/finance/work-records/project/${projectId}/summary`, {
      requiresPermission: Permissions.VIEW_BOQ,
      params: rangeParams(range),
    });
    return response.data.data;
  },

  prepareInvoice: async (projectId: string, data: PrepareInvoiceInput) => {
    const response = await api.post<ApiResponse<Invoice>>(`/finance/work-records/project/${projectId}/invoice`, data);
    return response.data;
  },
};

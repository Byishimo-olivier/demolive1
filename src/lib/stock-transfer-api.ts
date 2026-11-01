import { api } from './axios';
import { Permissions } from '../constants/permissions';
import { rangeParams, type DateRange } from './date-range';

import type { EndpointRef } from './stock-location-api';

export type TransferDirection = 'MainToProject' | 'ProjectToMain' | 'Other';
export type TransferStatus = 'Pending Approval' | 'Approved' | 'Received' | 'Rejected' | 'Cancelled';

export const TRANSFER_STATUSES: TransferStatus[] = ['Pending Approval', 'Approved', 'Received', 'Rejected', 'Cancelled'];

export interface TransferItem {
  _id: string;
  sourceItemId: string;
  destinationItemId?: string;
  materialCode?: string;
  name: string;
  unit: string;
  category: string;
  unitPrice: number;
  quantity: number;
  receivedQuantity?: number;
  shortfallReason?: string;
}

export interface StockTransfer {
  _id: string;
  transferNumber: string;
  projectId: string;
  direction: TransferDirection;
  source: { location: 'Main' | 'Project' | 'Named'; label: string; projectId?: string; locationId?: string };
  destination: { location: 'Main' | 'Project' | 'Named'; label: string; projectId?: string; locationId?: string };
  items: TransferItem[];
  transferDate: string;
  responsiblePerson: { userId?: string; name: string };
  requestedByName?: string;
  reason?: string;
  status: TransferStatus;
  approval?: { reviewedByName?: string; reviewedAt?: string; comment?: string };
  receipt?: { receivedByName?: string; receivedAt?: string; comment?: string };
  history: { action: string; byName?: string; at: string; comment?: string }[];
  createdAt: string;
  // On a single transfer: what the current user may do
  access?: { canApprove: boolean; canReceive: boolean };
}

export interface CreateTransferInput {
  projectId: string;
  // Where the stock comes from and goes to
  from: EndpointRef;
  to: EndpointRef;
  transferDate: string;
  items: { sourceItemId: string; quantity: number }[];
  responsiblePersonId?: string;
  responsiblePersonName?: string;
  reason?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const stockTransferApi = {
  list: async (projectId: string, filters: DateRange & { status?: string } = {}) => {
    const { status, ...range } = filters;
    const response = await api.get<ApiResponse<StockTransfer[]>>(`/finance/stock-transfers/project/${projectId}`, {
      requiresPermission: Permissions.VIEW_STOCK_TRANSFER,
      params: { ...rangeParams(range), ...(status ? { status } : {}) },
    });
    return response.data.data;
  },

  get: async (id: string) => {
    const response = await api.get<ApiResponse<StockTransfer>>(`/finance/stock-transfers/${id}`);
    return response.data.data;
  },

  create: async (data: CreateTransferInput) => {
    const response = await api.post<ApiResponse<StockTransfer>>('/finance/stock-transfers', data);
    return response.data;
  },

  // One source, several destinations: one transfer per destination (all or none)
  createBatch: async (data: Omit<CreateTransferInput, 'to' | 'items'> & {
    destinations: { to: EndpointRef; items: { sourceItemId: string; quantity: number }[] }[];
  }) => {
    const response = await api.post<ApiResponse<StockTransfer[]>>('/finance/stock-transfers/batch', data);
    return response.data;
  },

  // The server checks the approver
  approve: async (id: string, comment?: string) => {
    const response = await api.patch<ApiResponse<StockTransfer>>(`/finance/stock-transfers/${id}/approve`, { comment });
    return response.data;
  },

  reject: async (id: string, comment: string) => {
    const response = await api.patch<ApiResponse<StockTransfer>>(`/finance/stock-transfers/${id}/reject`, { comment });
    return response.data;
  },

  receive: async (
    id: string,
    items: { itemId: string; receivedQuantity: number; shortfallReason?: string }[],
    comment?: string
  ) => {
    const response = await api.patch<ApiResponse<StockTransfer>>(`/finance/stock-transfers/${id}/receive`, { items, comment });
    return response.data;
  },

  cancel: async (id: string, comment?: string) => {
    const response = await api.patch<ApiResponse<StockTransfer>>(`/finance/stock-transfers/${id}/cancel`, { comment });
    return response.data;
  },
};

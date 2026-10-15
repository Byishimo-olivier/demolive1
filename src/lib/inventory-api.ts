import { api } from './axios';
import { Permissions } from '../constants/permissions';
import { ExpenseCategory, UnitOfMeasurement } from '../types';

// Types
export interface InventoryItem {
  _id: string;
  name: string;
  materialCode: string;
  category: ExpenseCategory;
  unit: UnitOfMeasurement;
  currentStock: number;
  unitPrice: number;
  minimumStock: number;
  isCustom: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemDTO {
  name: string;
  materialCode: string;
  category: ExpenseCategory;
  unit: UnitOfMeasurement;
  currentStock: number;
  unitPrice: number;
  minimumStock: number;
  isCustom?: boolean;
  projectId: string;
}

export interface UpdateInventoryItemDTO {
  name?: string;
  materialCode?: string;
  category?: ExpenseCategory;
  unit?: UnitOfMeasurement;
  currentStock?: number;
  unitPrice?: number;
  minimumStock?: number;
  isCustom?: boolean;
}

export interface InventoryTransaction {
  _id: string;
  inventoryItemId: string;
  transactionType: 'received' | 'issued' | 'adjusted' | 'returned';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reference: string;
  remarks?: string;
  createdBy: string;
  createdAt: string;
}

export interface RelatedDocument {
  filePath: string;
  description: string;
  documentType: 'GRN' | 'ISSUE';
}

// API Functions
export const inventoryApi = {
  // Inventory Items
  createInventoryItem: async (data: CreateInventoryItemDTO) => {
    const response = await api.post('/finance/inventory', data, {
      requiresPermission: Permissions.MANAGE_INVENTORY
    });
    return response.data;
  },

  getInventoryItems: async (projectId: string, category?: string, search?: string) => {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    if (search) params.search = search;
    
    const response = await api.get(`/finance/inventory/project/${projectId}`, {
      requiresPermission: Permissions.VIEW_INVENTORY,
      params
    });
    return response.data;
  },

  getInventoryItem: async (id: string) => {
    const response = await api.get(`/finance/inventory/${id}`, {
      requiresPermission: Permissions.VIEW_INVENTORY
    });
    return response.data;
  },

  updateInventoryItem: async (id: string, data: UpdateInventoryItemDTO) => {
    const response = await api.put(`/finance/inventory/${id}`, data, {
      requiresPermission: Permissions.MANAGE_INVENTORY
    });
    return response.data;
  },

  deleteInventoryItem: async (id: string) => {
    const response = await api.delete(`/finance/inventory/${id}`, {
      requiresPermission: Permissions.MANAGE_INVENTORY
    });
    return response.data;
  },

  // Inventory Transactions
  getInventoryTransactions: async (
    id: string, 
    filters?: {
      startDate?: Date;
      endDate?: Date;
      transactionType?: string;
    }
  ) => {
    const params: Record<string, string> = {};
    if (filters?.startDate) params.startDate = filters.startDate.toISOString();
    if (filters?.endDate) params.endDate = filters.endDate.toISOString();
    if (filters?.transactionType) params.transactionType = filters.transactionType;

    const response = await api.get(`/finance/inventory/${id}/transactions`, {
      requiresPermission: Permissions.VIEW_INVENTORY,
      params
    });
    return response.data;
  },

  // Related Documents
  getRelatedDocuments: async (id: string, documentType?: string) => {
    const params: Record<string, string> = {};
    if (documentType) params.documentType = documentType;

    const response = await api.get(`/finance/inventory/${id}/documents`, {
      requiresPermission: Permissions.VIEW_INVENTORY,
      params
    });
    return response.data;
  }
}; 
import { api } from './axios';
import { Permissions } from '../constants/permissions';
import { ExpenseCategory, UnitOfMeasurement } from '../types';
import { rangeParams, type DateRange } from './date-range';

// Types
export interface InventoryItem {
  _id: string;
  // Main store, a project site, or a named store / site
  location?: 'Main' | 'Project' | 'Named';
  locationId?: string;
  projectId?: string;
  name: string;
  materialCode: string;
  description?: string;
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

/** Descriptive fields only: stock changes through movements (opening balance, adjustments, deliveries, transfers) */
export interface InventoryItemInput {
  name: string;
  materialCode?: string;
  description?: string;
  category: ExpenseCategory;
  unit: UnitOfMeasurement;
  unitPrice: number;
  minimumStock: number;
  // Creation only: recorded as an "Opening balance" movement
  openingStock?: number;
}

export interface CreateInventoryItemDTO extends InventoryItemInput {
  projectId: string;
}

export type UpdateInventoryItemDTO = Partial<Omit<InventoryItemInput, 'openingStock'>>;

export type MovementType = 'received' | 'issued' | 'adjusted' | 'returned' | 'transfer_out' | 'transfer_in';
/** What a manual entry at the office or a named store records */
export type StockEntryKind = 'received' | 'issued' | 'adjusted';

export interface InventoryTransaction {
  _id: string;
  type: MovementType;
  direction: 'in' | 'out';
  quantity: number;
  balanceAfter: number;
  sourceDocument: { type: string; id: string };
  reference?: string;
  remarks?: string;
  createdBy: { _id: string; fullName?: string; email?: string } | null;
  createdAt: string;
}

export interface StockAccess {
  canAdjustProjectStock: boolean;
  canManageMainStock: boolean;
  canApproveStockTransfers: boolean;
  isOwner: boolean;
  mainStore: { label: string };
}

export interface RelatedDocument {
  filePath: string;
  description: string;
  documentType: 'GRN' | 'ISSUE';
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const listParams = (category?: string, search?: string) => {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (search) params.search = search;
  return params;
};

// API Functions
export const inventoryApi = {
  // Project (site) stock
  createInventoryItem: async (data: CreateInventoryItemDTO) => {
    const response = await api.post<ApiResponse<InventoryItem>>('/finance/inventory', data, {
      requiresPermission: Permissions.MANAGE_INVENTORY
    });
    return response.data;
  },

  getInventoryItems: async (projectId: string, category?: string, search?: string) => {
    const response = await api.get<ApiResponse<InventoryItem[]>>(`/finance/inventory/project/${projectId}`, {
      requiresPermission: Permissions.VIEW_INVENTORY,
      params: listParams(category, search),
    });
    return response.data;
  },

  getInventoryItem: async (id: string) => {
    const response = await api.get<ApiResponse<InventoryItem>>(`/finance/inventory/${id}`, {
      requiresPermission: Permissions.VIEW_INVENTORY
    });
    return response.data;
  },

  updateInventoryItem: async (id: string, data: UpdateInventoryItemDTO) => {
    const response = await api.patch<ApiResponse<InventoryItem>>(`/finance/inventory/${id}`, data, {
      requiresPermission: Permissions.MANAGE_INVENTORY
    });
    return response.data;
  },

  deleteInventoryItem: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/finance/inventory/${id}`, {
      requiresPermission: Permissions.MANAGE_INVENTORY
    });
    return response.data;
  },

  // Stock count / correction (owner or MD; the server checks)
  adjustStock: async (id: string, quantity: number, reason: string) => {
    const response = await api.post<ApiResponse<InventoryItem>>(`/finance/inventory/${id}/adjust`, { quantity, reason });
    return response.data;
  },

  getInventoryTransactions: async (id: string, filters: DateRange & { type?: MovementType } = {}) => {
    const { type, ...range } = filters;
    const response = await api.get<ApiResponse<InventoryTransaction[]>>(`/finance/inventory/${id}/transactions`, {
      requiresPermission: Permissions.VIEW_INVENTORY,
      params: { ...rangeParams(range), ...(type ? { type } : {}) },
    });
    return response.data.data;
  },

  // Import items from a spreadsheet; items already in stock are skipped or topped up
  importItems: async (
    projectId: string,
    place: 'Project' | 'Main',
    rows: Record<string, string>[],
    mode: 'skip' | 'add'
  ) => {
    const base = place === 'Main' ? `/finance/inventory/main/${projectId}` : `/finance/inventory/project/${projectId}`;
    const response = await api.post<ApiResponse<{ created: number; added: number; skipped: number; skippedNames: string[] }>>(
      `${base}/import`,
      { rows, mode }
    );
    return response.data;
  },

  // Stock in / out per item for a period: site stock, or the main store
  getMovementTotals: async (projectId: string, place: 'Project' | 'Main', range: DateRange) => {
    const base = place === 'Main' ? `/finance/inventory/main/${projectId}` : `/finance/inventory/project/${projectId}`;
    const response = await api.get<ApiResponse<{ itemId: string; in: number; out: number; movements: number }[]>>(
      `${base}/movement-totals`,
      { params: rangeParams(range) }
    );
    return response.data.data;
  },

  getAccess: async (projectId: string) => {
    const response = await api.get<ApiResponse<StockAccess>>(`/finance/inventory/access/${projectId}`);
    return response.data.data;
  },

  // Main store (the company's, or the owner's for personal projects), reached through a project
  getMainStockItems: async (projectId: string, category?: string, search?: string) => {
    const response = await api.get<ApiResponse<InventoryItem[]>>(`/finance/inventory/main/${projectId}`, {
      params: listParams(category, search),
    });
    return response.data;
  },

  createMainStockItem: async (projectId: string, data: InventoryItemInput) => {
    const response = await api.post<ApiResponse<InventoryItem>>(`/finance/inventory/main/${projectId}`, data);
    return response.data;
  },

  updateMainStockItem: async (projectId: string, id: string, data: UpdateInventoryItemDTO) => {
    const response = await api.patch<ApiResponse<InventoryItem>>(`/finance/inventory/main/${projectId}/items/${id}`, data);
    return response.data;
  },

  deleteMainStockItem: async (projectId: string, id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/finance/inventory/main/${projectId}/items/${id}`);
    return response.data;
  },

  adjustMainStock: async (projectId: string, id: string, quantity: number, reason: string, movement?: StockEntryKind) => {
    const response = await api.post<ApiResponse<InventoryItem>>(`/finance/inventory/main/${projectId}/items/${id}/adjust`, {
      quantity,
      reason,
      movement,
    });
    return response.data;
  },

  getMainStockTransactions: async (projectId: string, id: string, filters: DateRange & { type?: MovementType } = {}) => {
    const { type, ...range } = filters;
    const response = await api.get<ApiResponse<InventoryTransaction[]>>(
      `/finance/inventory/main/${projectId}/items/${id}/transactions`,
      { params: { ...rangeParams(range), ...(type ? { type } : {}) } }
    );
    return response.data.data;
  },

  // Named stores and sites, reached through a project
  getNamedStockItems: async (projectId: string, locationId: string, category?: string, search?: string) => {
    const response = await api.get<ApiResponse<InventoryItem[]>>(`/finance/inventory/named/${projectId}/${locationId}`, {
      params: listParams(category, search),
    });
    return response.data;
  },

  createNamedStockItem: async (projectId: string, locationId: string, data: InventoryItemInput) => {
    const response = await api.post<ApiResponse<InventoryItem>>(`/finance/inventory/named/${projectId}/${locationId}`, data);
    return response.data;
  },

  updateNamedStockItem: async (projectId: string, locationId: string, id: string, data: UpdateInventoryItemDTO) => {
    const response = await api.patch<ApiResponse<InventoryItem>>(`/finance/inventory/named/${projectId}/${locationId}/items/${id}`, data);
    return response.data;
  },

  deleteNamedStockItem: async (projectId: string, locationId: string, id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/finance/inventory/named/${projectId}/${locationId}/items/${id}`);
    return response.data;
  },

  adjustNamedStock: async (
    projectId: string,
    locationId: string,
    id: string,
    quantity: number,
    reason: string,
    movement?: StockEntryKind
  ) => {
    const response = await api.post<ApiResponse<InventoryItem>>(
      `/finance/inventory/named/${projectId}/${locationId}/items/${id}/adjust`,
      { quantity, reason, movement }
    );
    return response.data;
  },

  getNamedStockTransactions: async (
    projectId: string,
    locationId: string,
    id: string,
    filters: DateRange & { type?: MovementType } = {}
  ) => {
    const { type, ...range } = filters;
    const response = await api.get<ApiResponse<InventoryTransaction[]>>(
      `/finance/inventory/named/${projectId}/${locationId}/items/${id}/transactions`,
      { params: { ...rangeParams(range), ...(type ? { type } : {}) } }
    );
    return response.data.data;
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

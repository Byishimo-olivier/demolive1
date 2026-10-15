import { api } from './axios';
import { Permissions } from '../constants/permissions';
import { Department, ExpenseCategory, PaymentTerms, UnitOfMeasurement, PriorityLevel } from '../types';

// Types
export interface MaterialDetail {
  materialName: string;
  quantity: number;
  unit: UnitOfMeasurement;
  requiredByDate: string;
  specifications?: string;
  estimatedCost: number;
  category: ExpenseCategory;
}

export interface MaterialRequest {
  _id: string;
  projectId: string;
  requesterName: string;
  department: Department;
  requestDate: string;
  materialDetails: MaterialDetail[];
  purpose: string;
  priorityLevel: PriorityLevel;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialRequestRequest {
  projectId: string;
  requesterName: string;
  department: Department;
  requestDate?: string;
  materialDetails: MaterialDetail[];
  purpose: string;
  priorityLevel: PriorityLevel;
}

export interface MaterialListItem {
  _id: string;
  materialName: string;
  quantity: number;
  unit: UnitOfMeasurement;
  category: ExpenseCategory;
  unitPrice: number;
}

export interface PurchaseOrder {
  _id: string;
  projectId: string;
  poNumber: string;
  supplierDetails: string;
  orderDate: string;
  deliveryDate: string;
  materialRequestId?: string;
  materialList: MaterialListItem[];
  expenseRecorded: boolean;
  totalCost: number;
  paymentTerms: PaymentTerms;
  specialInstructions?: string;
  documentFilePath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderRequest {
  projectId: string;
  poNumber: string;
  supplierDetails: string;
  orderDate?: string;
  deliveryDate: string;
  materialRequestId?: string;
  materialList: MaterialListItem[];
  totalCost: number;
  paymentTerms: PaymentTerms;
  specialInstructions?: string;
  file?: File;
}

// Paginated response types
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    docs: T[];
    totalDocs: number;
    limit: number;
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// API Functions
export const procurementApi = {
  // Material Requests
  createMaterialRequest: async (data: CreateMaterialRequestRequest) => {
    const response = await api.post('/procurement/material-requests', data, {
      requiresPermission: Permissions.CREATE_MATERIAL_REQUEST
    });
    return response.data;
  },

  getMaterialRequests: async (projectId: string) => {
    const response = await api.get(`/procurement/material-requests/project/${projectId}`, {
      requiresPermission: Permissions.VIEW_MATERIAL_REQUEST
    });
    return response.data as PaginatedResponse<MaterialRequest>;
  },

  getMaterialRequest: async (id: string) => {
    const response = await api.get(`/procurement/material-requests/${id}`, {
      requiresPermission: Permissions.VIEW_MATERIAL_REQUEST
    });
    return response.data;
  },

  updateMaterialRequest: async (id: string, data: Partial<CreateMaterialRequestRequest>) => {
    const response = await api.patch(`/procurement/material-requests/${id}`, data, {
      requiresPermission: Permissions.UPDATE_MATERIAL_REQUEST
    });
    return response.data;
  },

  deleteMaterialRequest: async (id: string) => {
    const response = await api.delete(`/procurement/material-requests/${id}`, {
      requiresPermission: Permissions.DELETE_MATERIAL_REQUEST
    });
    return response.data;
  },

  // Purchase Orders
  createPurchaseOrder: async (data: CreatePurchaseOrderRequest) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'file' && value instanceof File) {
        formData.append('file', value);
      } else if (key === 'materialList' && value) {
        formData.append(key, JSON.stringify(value));
      } else if (key !== 'file' && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await api.post('/procurement/purchase-orders', formData, {
      requiresPermission: Permissions.CREATE_PURCHASE_ORDER,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getPurchaseOrders: async (projectId: string) => {
    const response = await api.get(`/procurement/purchase-orders/project/${projectId}`, {
      requiresPermission: Permissions.VIEW_PURCHASE_ORDER
    });
    return response.data as PaginatedResponse<PurchaseOrder>;
  },

  getPurchaseOrder: async (id: string) => {
    const response = await api.get(`/procurement/purchase-orders/${id}`, {
      requiresPermission: Permissions.VIEW_PURCHASE_ORDER
    });
    return response.data;
  },

  updatePurchaseOrder: async (id: string, data: Partial<CreatePurchaseOrderRequest>) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'file' && value instanceof File) {
        formData.append('file', value);
      } else if (key === 'materialList') {
        formData.append(key, JSON.stringify(value));
      } else if (key !== 'file' && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await api.patch(`/procurement/purchase-orders/${id}`, formData, {
      requiresPermission: Permissions.UPDATE_PURCHASE_ORDER,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deletePurchaseOrder: async (id: string) => {
    const response = await api.delete(`/procurement/purchase-orders/${id}`, {
      requiresPermission: Permissions.DELETE_PURCHASE_ORDER
    });
    return response.data;
  }
}; 
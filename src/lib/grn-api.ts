import { api } from './axios';
import { Permissions } from '../constants/permissions';
import { GRNStatus } from '../types';

// Types
export interface GRNItem {
  materialId: string | {
    _id: string;
    name: string;
    unit: string;
  };
  quantity: number;
  receivedQuantity: number;
  pendingQuantity?: number;
  remarks?: string;
}

export interface GRN {
  _id: string;
  projectId: string;
  purchaseOrderId: string;
  grnNumber: string;
  receivedDate: string;
  items: GRNItem[];
  status: GRNStatus;
  documents: {
    filePath: string;
    description: string;
  }[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGRNDTO {
  projectId: string;
  purchaseOrderId: string;
  receivedDate: string;
  items: {
    materialId: string;
    quantity: number;
    receivedQuantity: number;
    pendingQuantity?: number;
    remarks?: string;
  }[];
  documents?: File[];
}

// API Functions
export const grnApi = {
  createGRN: async (data: CreateGRNDTO) => {
    const formData = new FormData();
    
    // Add basic fields
    formData.append('projectId', data.projectId);
    formData.append('purchaseOrderId', data.purchaseOrderId);
    formData.append('receivedDate', data.receivedDate);
    formData.append('items', JSON.stringify(data.items));
    
    // Add documents if any
    if (data.documents) {
      data.documents.forEach((file, index) => {
        formData.append('documents', file);
      });
    }

    const response = await api.post('/finance/grn', formData, {
      requiresPermission: Permissions.VIEW_PURCHASE_ORDER,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getGRN: async (id: string) => {
    const response = await api.get(`/finance/grn/${id}`, {
      requiresPermission: Permissions.VIEW_PURCHASE_ORDER
    });
    return response.data;
  },

  getGRNs: async (projectId: string) => {
    const response = await api.get(`/finance/grn/project/${projectId}`, {
      requiresPermission: Permissions.VIEW_PURCHASE_ORDER
    });
    return response.data;
  }
}; 

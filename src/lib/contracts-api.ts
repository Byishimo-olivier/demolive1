import { axiosInstance } from './axios';

// Types
export interface Contract {
  _id: string;
  projectId: string;
  contractNumber: string;
  title: string;
  description: string;
  contractorId: string;
  startDate: string;
  endDate: string;
  amount: number;
  currency: string;
  status: 'draft' | 'active' | 'completed' | 'terminated';
  type: 'fixed_price' | 'time_and_materials' | 'cost_plus';
  paymentTerms: string;
  documents: string[];
  milestones: {
    title: string;
    description: string;
    dueDate: string;
    amount: number;
    status: 'pending' | 'completed' | 'overdue';
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractDTO {
  projectId: string;
  contractNumber: string;
  title: string;
  description: string;
  contractorId: string;
  startDate: string;
  endDate: string;
  amount: number;
  currency: string;
  type: 'fixed_price' | 'time_and_materials' | 'cost_plus';
  paymentTerms: string;
  documents?: File[];
  milestones?: {
    title: string;
    description: string;
    dueDate: string;
    amount: number;
  }[];
}

export interface UpdateContractDTO {
  title?: string;
  description?: string;
  endDate?: string;
  amount?: number;
  status?: 'draft' | 'active' | 'completed' | 'terminated';
  paymentTerms?: string;
  documents?: File[];
  milestones?: {
    title: string;
    description: string;
    dueDate: string;
    amount: number;
  }[];
}

export interface ContractVariant {
  _id: string;
  contractId: string;
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  documents: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractVariantDTO {
  contractId: string;
  description: string;
  amount: number;
  documents?: File[];
}

// API Functions
export const contractsApi = {
  // Contracts
  createContract: async (data: CreateContractDTO) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'documents' && Array.isArray(value)) {
        value.forEach(file => formData.append('documents', file));
      } else if (key === 'milestones') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value.toString());
      }
    });

    const response = await axiosInstance.post('/api/v1/contracts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getContracts: async (projectId: string) => {
    const response = await axiosInstance.get(`/api/v1/contracts/${projectId}`);
    return response.data;
  },

  getContract: async (id: string) => {
    const response = await axiosInstance.get(`/api/v1/contracts/${id}`);
    return response.data;
  },

  updateContract: async (id: string, data: UpdateContractDTO) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'documents' && Array.isArray(value)) {
        value.forEach(file => formData.append('documents', file));
      } else if (key === 'milestones') {
        formData.append(key, JSON.stringify(value));
      } else if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    const response = await axiosInstance.patch(`/api/v1/contracts/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteContract: async (id: string) => {
    const response = await axiosInstance.delete(`/api/v1/contracts/${id}`);
    return response.data;
  },

  // Contract Variants
  createVariant: async (data: CreateContractVariantDTO) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'documents' && Array.isArray(value)) {
        value.forEach(file => formData.append('documents', file));
      } else {
        formData.append(key, value.toString());
      }
    });

    const response = await axiosInstance.post('/api/v1/contracts/variants', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getVariants: async (contractId: string) => {
    const response = await axiosInstance.get(`/api/v1/contracts/${contractId}/variants`);
    return response.data;
  },

  getVariant: async (id: string) => {
    const response = await axiosInstance.get(`/api/v1/contracts/variants/${id}`);
    return response.data;
  },

  updateVariantStatus: async (id: string, status: 'approved' | 'rejected') => {
    const response = await axiosInstance.patch(`/api/v1/contracts/variants/${id}/status`, { status });
    return response.data;
  },

  deleteVariant: async (id: string) => {
    const response = await axiosInstance.delete(`/api/v1/contracts/variants/${id}`);
    return response.data;
  }
}; 
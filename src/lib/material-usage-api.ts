import { axiosInstance } from './axios';
import { UnitOfMeasurement, ReportingPeriod } from '../types';

// Types
export interface MaterialUsageItem {
  materialId: string;
  quantity: number;
  location: string;
  purpose: string;
}

export interface MaterialUsage {
  _id: string;
  projectId: string;
  date: string;
  reportingPeriod: ReportingPeriod;
  items: {
    materialId: string;
    quantity: number;
    location: string;
    purpose: string;
  }[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialUsageDTO {
  projectId: string;
  date: string;
  reportingPeriod: ReportingPeriod;
  items: MaterialUsageItem[];
}

export interface MaterialUsageReport {
  materialId: string;
  materialName: string;
  totalQuantity: number;
  unit: UnitOfMeasurement;
  usageByDate: {
    date: string;
    quantity: number;
  }[];
}

// API Functions
export const materialUsageApi = {
  createMaterialUsage: async (data: CreateMaterialUsageDTO) => {
    const response = await axiosInstance.post('/finance/material-usage', data);
    return response.data;
  },

  getProjectMaterialUsage: async (
    projectId: string,
    params?: {
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const response = await axiosInstance.get(`/finance/material-usage/${projectId}`, { params });
    return response.data;
  },

  getMaterialUsageReport: async (
    projectId: string,
    params: {
      startDate: string;
      endDate: string;
      sendEmail?: boolean;
    }
  ) => {
    // Ensure dates are in the correct format (YYYY-MM-DD or ISO string)
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    if (params.sendEmail !== undefined) {
      queryParams.append('sendEmail', String(params.sendEmail));
    }
    
    const response = await axiosInstance.get(
      `/finance/material-usage/${projectId}/report?${queryParams.toString()}`
    );
    return response.data;
  }
};
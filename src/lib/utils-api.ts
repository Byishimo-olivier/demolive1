import { axiosInstance } from './axios';

// Types
export interface Document {
  _id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentDTO {
  file: File;
  name?: string;
  type?: string;
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export interface CreateNotificationDTO {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface EnumValues {
  ProjectType: string[];
  ProjectStatus: string[];
  ExpenseCategory: string[];
}

// API Functions
export const utilsApi = {
  // Documents
  uploadDocument: async (data: UploadDocumentDTO) => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.name) formData.append('name', data.name);
    if (data.type) formData.append('type', data.type);

    const response = await axiosInstance.post('/api/v1/utils/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getDocuments: async () => {
    const response = await axiosInstance.get('/api/v1/utils/documents');
    return response.data;
  },

  getDocument: async (id: string) => {
    const response = await axiosInstance.get(`/api/v1/utils/documents/${id}`);
    return response.data;
  },

  deleteDocument: async (id: string) => {
    const response = await axiosInstance.delete(`/api/v1/utils/documents/${id}`);
    return response.data;
  },

  // Notifications
  createNotification: async (data: CreateNotificationDTO) => {
    const response = await axiosInstance.post('/api/v1/utils/notifications', data);
    return response.data;
  },

  getNotifications: async (userId: string) => {
    const response = await axiosInstance.get(`/api/v1/utils/notifications/${userId}`);
    return response.data;
  },

  getNotification: async (id: string) => {
    const response = await axiosInstance.get(`/api/v1/utils/notifications/${id}`);
    return response.data;
  },

  markNotificationAsRead: async (id: string) => {
    const response = await axiosInstance.patch(`/api/v1/utils/notifications/${id}/read`);
    return response.data;
  },

  deleteNotification: async (id: string) => {
    const response = await axiosInstance.delete(`/api/v1/utils/notifications/${id}`);
    return response.data;
  },

  // Enums
  getEnums: async (): Promise<EnumValues> => {
    const response = await axiosInstance.get('/api/v1/utils/enums');
    return response.data;
  }
}; 
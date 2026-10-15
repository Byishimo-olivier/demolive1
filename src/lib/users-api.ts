import { api } from './axios';
import { Permissions } from '../constants/permissions';
import { User } from '../types';

// Types
export interface UpdateUserDTO {
  fullName?: string;
  email?: string;
  contactNumber?: string;
  profilePicture?: string; // Expect a URL or base64 string
}

export interface UserSearchResponse {
  success: boolean;
  message: string;
  data: Array<{
    _id: string;
    fullName: string;
    email: string;
    role: string;
  }>;
}

export interface AdminStatsResponse {
  success: boolean;
  data: Array<{
    _id: string;
    fullName: string;
    email: string;
    plan: string;
    subscriptionStatus: string;
    totalStorageUsed: number;
    documentCount: number;
    companyCount: number;
    companies: Array<{
      _id: string;
      name: string;
      type: string;
      plan: string;
      subscriptionStatus: string;
      teamMemberCount: number;
    }>;
  }>;
}

// API Functions
export const usersApi = {
  getProfile: async (): Promise<{ success: boolean; message: string; data: User }> => {
    const response = await api.get('/users/profile', {
      requiresPermission: Permissions.VIEW_USER
    });
    return response.data;
  },

  updateProfile: async (data: UpdateUserDTO) => {
    // Backend expects JSON body; profilePicture should be a URL or base64 string
    const response = await api.patch('/users/profile', data, {
      requiresPermission: Permissions.VIEW_USER
    });
    return response.data;
  },

  deleteProfile: async () => {
    const response = await api.delete('/users/profile', {
      requiresPermission: Permissions.VIEW_USER
    });
    return response.data;
  },

  searchUsers: async (email: string): Promise<UserSearchResponse> => {
    const response = await api.get('/users/search', {
      requiresPermission: Permissions.ADMIN_MANAGE_USERS,
      params: { email }
    });
    return response.data;
  },

  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/users/upload', formData, {
      requiresPermission: Permissions.VIEW_USER,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getAdminStats: async (): Promise<AdminStatsResponse> => {
    const response = await api.get('/users/admin/stats');
    return response.data;
  }
}; 
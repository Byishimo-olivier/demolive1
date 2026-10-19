import { api } from './axios';
import { Permissions } from '../constants/permissions';
import { UserRole, CreateCompanyData, InviteMemberData, Project } from '../types';

// API Functions
export const companiesApi = {
  createCompany: async (data: CreateCompanyData) => {
    // Check if we have files to upload
    const hasFiles = data.experienceDocuments?.length || data.certificationDocuments?.length;
    
    if (hasFiles) {
      const formData = new FormData();
      
      // Add regular fields
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'experienceDocuments' || key === 'certificationDocuments') {
          // Skip file arrays, we'll handle them separately
          return;
        } else if (key === 'experience' || key === 'certifications') {
          // For FormData, we need to send arrays properly
          if (Array.isArray(value) && value.length > 0) {
            formData.append(key, JSON.stringify(value));
          } else {
            // Send empty array as JSON string
            formData.append(key, JSON.stringify([]));
          }
        } else if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      
      // Add experience documents
      if (data.experienceDocuments) {
        data.experienceDocuments.forEach((file) => {
          formData.append('experienceDocuments', file);
        });
      }
      
      // Add certification documents
      if (data.certificationDocuments) {
        data.certificationDocuments.forEach((file) => {
          formData.append('certificationDocuments', file);
        });
      }
      
      const response = await api.post('/companies', formData, {
        requiresPermission: Permissions.COMPANY_CREATE,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } else {
      // No files, send as JSON
      const response = await api.post('/companies', data, {
        requiresPermission: Permissions.COMPANY_CREATE
      });
      return response.data;
    }
  },

  getCompany: async (id: string) => {
    const response = await api.get(`/companies/${id}`, {
      requiresPermission: Permissions.COMPANY_VIEW
    });
    return response.data;
  },

  updateCompany: async (id: string, data: Partial<CreateCompanyData>) => {
    // Check if we have files to upload
    const hasFiles = data.experienceDocuments?.length || data.certificationDocuments?.length;
    
    if (hasFiles) {
      const formData = new FormData();
      
      // Add regular fields
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'experienceDocuments' || key === 'certificationDocuments') {
          // Skip file arrays, we'll handle them separately
          return;
        } else if (key === 'experience' || key === 'certifications') {
          // For FormData, we need to send arrays properly
          if (Array.isArray(value) && value.length > 0) {
            formData.append(key, JSON.stringify(value));
          } else {
            // Send empty array as JSON string
            formData.append(key, JSON.stringify([]));
          }
        } else if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      
      // Add experience documents
      if (data.experienceDocuments) {
        data.experienceDocuments.forEach((file) => {
          formData.append('experienceDocuments', file);
        });
      }
      
      // Add certification documents
      if (data.certificationDocuments) {
        data.certificationDocuments.forEach((file) => {
          formData.append('certificationDocuments', file);
        });
      }
      
      const response = await api.patch(`/companies/${id}`, formData, {
        requiresPermission: Permissions.COMPANY_UPDATE,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } else {
      // No files, send as JSON
      const response = await api.patch(`/companies/${id}`, data, {
        requiresPermission: Permissions.COMPANY_UPDATE
      });
      return response.data;
    }
  },

  getUserCompanies: async () => {
    const response = await api.get('/companies/user/me');
    return response.data;
  },

  getCompanyProjects: async (companyId: string) => {
    const response = await api.get<{ success: boolean; data: Project[] }>(
      `/companies/${companyId}/projects`,
      { requiresPermission: Permissions.COMPANY_VIEW_PROJECTS }
    );
    return response.data;
  },

  inviteMember: async (data: InviteMemberData) => {
    const response = await api.post('/companies/invitation', data, {
      requiresPermission: Permissions.COMPANY_INVITE_MEMBER
    });
    return response.data;
  },

  getPendingInvitations: async (companyId: string) => {
    const response = await api.get(`/companies/${companyId}/invitations/pending`, {
      requiresPermission: Permissions.COMPANY_MANAGE_MEMBERS
    });
    return response.data;
  },

  acceptInvitation: async (token: string) => {
    const response = await api.post('/companies/invitation/accept', { token });
    return response.data;
  },

  deleteMember: async (companyId: string, memberId: string) => {
    const response = await api.delete(`/companies/${companyId}/members/${memberId}`, {
      requiresPermission: Permissions.COMPANY_MANAGE_MEMBERS
    });
    return response.data;
  },

  updateMemberRole: async (companyId: string, memberId: string, role: UserRole) => {
    const response = await api.patch(`/companies/${companyId}/members/${memberId}/role`, { role }, {
      requiresPermission: Permissions.COMPANY_MANAGE_MEMBERS
    });
    return response.data;
  }
};

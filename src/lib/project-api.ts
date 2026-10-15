import { api } from './axios';
import { Permissions } from '../constants/permissions';
import type { Project, UserRole } from '../types';

// Types
export interface ProjectCreateRequest {
  projectDescription: string;
  budget: number;
  projectCode: string;
  name: string;
  progress: number;
  status: string;
  type: 'Capital' | 'Maintenance';
  file?: File;
  description: string;
  team: string[];
}

export interface ProjectInviteRequest {
  projectId: string;
  email: string;
  role: UserRole;
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

export interface ProjectResponse {
  success: boolean;
  message: string;
  data: Project;
}

export interface ProjectsResponse {
  success: boolean;
  message: string;
  data: Project[];
}

// API Functions
export const projectApi = {
  searchUsers: async (email: string): Promise<UserSearchResponse> => {
    const response = await api.get<UserSearchResponse>(`/users/search?email=${email}`, {
      requiresPermission: Permissions.VIEW_USER
    });
    return response.data;
  },

  createProject: async (data: ProjectCreateRequest): Promise<ProjectResponse> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'team') {
        formData.append(key, JSON.stringify(value));
      } else if (key === 'file' && value instanceof File) {
        formData.append(key, value);
      } else if (typeof value === 'number') {
        formData.append(key, value.toString());
      } else if (typeof value === 'string' && value.trim() !== '') {
        formData.append(key, value);
      }
    });

    const response = await api.post<ProjectResponse>('/projects', formData, {
      requiresPermission: Permissions.CREATE_PROJECT,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getProjects: async (companyId?: string): Promise<ProjectsResponse> => {
    const endpoint = companyId 
      ? `/companies/${companyId}/projects`
      : '/projects/user/me';
    
    const permission = companyId 
      ? Permissions.COMPANY_VIEW_PROJECTS 
      : Permissions.VIEW_PROJECT;
      console.log(permission, companyId);
    
    const response = await api.get<ProjectsResponse>(endpoint, {
      requiresPermission: permission
    });
    return response.data;
  },

  getAdminProjects: async (): Promise<ProjectsResponse> => {
    const response = await api.get<ProjectsResponse>('/projects/admin', {
      requiresPermission: Permissions.ADMIN_VIEW_ALL
    });
    return response.data;
  },

  getProject: async (id: string): Promise<ProjectResponse> => {
    const response = await api.get<ProjectResponse>(`/projects/${id}`, {
      requiresPermission: [Permissions.VIEW_PROJECT, Permissions.COMPANY_VIEW_PROJECTS]
    });
    return response.data;
  },

  updateProject: async (id: string, data: Partial<ProjectCreateRequest>): Promise<ProjectResponse> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'team') {
        formData.append(key, JSON.stringify(value));
      } else if (key === 'file' && value instanceof File) {
        formData.append(key, value);
      } else if (typeof value === 'number') {
        formData.append(key, value.toString());
      } else if (typeof value === 'string' && value.trim() !== '') {
        formData.append(key, value);
      }
    });

    const response = await api.patch<ProjectResponse>(`/projects/${id}`, formData, {
      requiresPermission: Permissions.UPDATE_PROJECT,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteProject: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/projects/${id}`, {
      requiresPermission: Permissions.DELETE_PROJECT
    });
    return response.data;
  },

  inviteToProject: async (data: ProjectInviteRequest) => {
    const response = await api.post('/projects/invitation', data, {
      requiresPermission: Permissions.MANAGE_PROJECT_TEAM
    });
    return response.data;
  },

  invite: async (data: { projectId: string; email: string; role: UserRole }) => {
    const response = await api.post('/projects/invitation', data, {
      requiresPermission: Permissions.MANAGE_PROJECT_TEAM
    });
    return response.data;
  },

  acceptInvitation: async (token: string) => {
    const response = await api.post('/projects/invitation/accept', { token });
    return response.data;
  },

  getPendingInvitations: async (projectId: string) => {
    const response = await api.get(`/projects/invitation/pending/${projectId}`, {
      requiresPermission: Permissions.MANAGE_PROJECT_TEAM
    });
    return response.data;
  },

  // Document management
  async getProjectDocuments(projectId: string, filters?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    return api.get(`/projects/${projectId}/documents?${params.toString()}`, {
      requiresPermission: Permissions.VIEW_DOCUMENT
    });
  },

  async reviewDocument(documentId: string, status: 'approved' | 'rejected', comments?: string, projectId?: string) {
    return api.patch('/projects/documents/review', {
      documentId,
      status,
      comments,
      projectId
    }, {
      requiresPermission: Permissions.REVIEW_DOCUMENT
    });
  },

  async deleteProjectDocument(projectId: string, documentId: string, documentType: string, documentPath: string) {
    return api.delete(`/projects/${projectId}/documents`, {
      requiresPermission: Permissions.DELETE_DOCUMENT,
      data: {
        documentId,
        documentType,
        documentPath
      }
    });
  },
}; 
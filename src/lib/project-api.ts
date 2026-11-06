import { api } from './axios';
import { Permissions } from '../constants/permissions';
import type { Project, UserRole } from '../types';

// Types
export interface ProjectCreateRequest {
  projectDescription: string;
  budget: number;
  // Client and contract
  clientName?: string;
  contractAmount?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  projectCode: string;
  name: string;
  progress: number;
  status: string;
  type: 'Capital' | 'Maintenance';
  file?: File;
  description: string;
  team: string[];
}

export interface ClientDetailsRequest {
  clientName?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  clientAddress?: string;
  clientTin?: string;
}

// Dates as YYYY-MM-DD; an empty date clears it
export interface ContractRequest {
  reference?: string;
  title?: string;
  signedDate?: string;
  startDate?: string;
  endDate?: string;
  amount: number;
  advancePayment?: number;
  retentionPercent?: number;
  paymentTerms?: string;
  scope?: string;
  notes?: string;
  removeDocument?: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ProjectInvitationDetails {
  email: string;
  role: string;
  projectId: string;
  projectName: string;
  expiresAt: string;
  accountExists: boolean;
}

export interface ProjectFinancials {
  contractAmount: number;
  budget: number;
  expenses: {
    approved: number;
    pending: number;
    byCategory: { category: string; planned: number; spent: number }[];
  };
  // invoiced: approved and paid invoices (income); awaitingApproval: submitted, not approved yet
  invoices: { invoiced: number; paid: number; outstanding: number; awaitingApproval?: number };
  // Income minus approved expenses
  profitLoss: number;
  marginPercent: number | null;
  // Contract value minus the whole budget
  projectedProfit: number;
  budgetRemaining: number;
  // Paid invoices minus approved expenses
  cashPosition: number;
  // Only when a date range was asked for
  period?: PeriodFinancials;
}

/** Totals for a selected period: approved expenses dated in it, invoices issued / paid in it */
export interface PeriodFinancials {
  startDate: string | null;
  endDate: string | null;
  expenses: number;
  expenseCount: number;
  expensesByCategory: { category: string; spent: number }[];
  invoiced: number;
  invoiceCount: number;
  paid: number;
  // Invoiced minus expenses
  profitLoss: number;
  // Paid minus expenses
  cashFlow: number;
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

  // The projects the user can open in the active company (sent in the company header): all of
  // them for the owner / MD, only the ones they are on for everyone else
  getProjects: async (_companyId?: string): Promise<ProjectsResponse> => {
    const response = await api.get<ProjectsResponse>('/projects/user/me');
    return response.data;
  },

  getAdminProjects: async (): Promise<ProjectsResponse> => {
    const response = await api.get<ProjectsResponse>('/projects/admin', {
      requiresPermission: Permissions.ADMIN_VIEW_ALL
    });
    return response.data;
  },

  // Contract value, budget, expenses, invoicing and profit / loss
  getProjectFinancials: async (
    id: string,
    range?: { startDate?: string; endDate?: string }
  ): Promise<{ success: boolean; message: string; data: ProjectFinancials }> => {
    const params: Record<string, string> = {};
    if (range?.startDate) params.startDate = range.startDate;
    if (range?.endDate) params.endDate = range.endDate;
    const response = await api.get(`/projects/${id}/financials`, { params });
    return response.data as { success: boolean; message: string; data: ProjectFinancials };
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

  /** Change the client's details (empty text clears a field) */
  updateClient: async (id: string, data: ClientDetailsRequest): Promise<ProjectResponse> => {
    const response = await api.patch<ProjectResponse>(`/projects/${id}`, data, {
      requiresPermission: Permissions.UPDATE_PROJECT,
    });
    return response.data;
  },

  /** Create or update the contract with the client; a file is attached as the signed contract */
  saveContract: async (id: string, data: ContractRequest, file?: File | null): Promise<ProjectResponse> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, String(value));
    });
    if (file) formData.append('file', file);
    const response = await api.put<ProjectResponse>(`/projects/${id}/contract`, formData, {
      requiresPermission: Permissions.UPDATE_PROJECT,
      headers: { 'Content-Type': 'multipart/form-data' },
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
    const response = await api.post<ApiEnvelope<{ email: string; role: string; emailSent: boolean; inviteLink?: string }>>('/projects/invitation', data, {
      requiresPermission: Permissions.MANAGE_PROJECT_TEAM
    });
    return response.data;
  },

  // Public: what an invitation is for, shown on the sign-up page
  getInvitationDetails: async (token: string): Promise<ProjectInvitationDetails> => {
    const response = await api.get<ApiEnvelope<ProjectInvitationDetails>>(`/projects/invitation/details/${encodeURIComponent(token)}`);
    return response.data.data;
  },

  acceptInvitation: async (token: string) => {
    const response = await api.post<ApiEnvelope<{ projectId: string; projectName: string; role: string }>>('/projects/invitation/accept', { token });
    return response.data;
  },

  // Cancel an invitation that was not accepted yet
  cancelInvitation: async (projectId: string, invitationId: string) => {
    const response = await api.delete(`/projects/invitation/${projectId}/${invitationId}`, {
      requiresPermission: Permissions.MANAGE_PROJECT_TEAM
    });
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
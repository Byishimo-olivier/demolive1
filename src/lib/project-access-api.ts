import { api } from './axios';

export type AccessLevel = 'none' | 'view' | 'edit';

// A page, tab or sub-tab of a project
export interface AccessArea {
  key: string;
  label: string;
  group: string;
}

export interface MemberAccess {
  userId: string;
  fullName?: string;
  email?: string;
  role: string;
  // Level per area (the owner's choice, or the role's)
  access: Record<string, AccessLevel>;
  // What the role alone gives
  fromRole: Record<string, AccessLevel>;
  // Areas the owner changed
  customised: string[];
}

export interface ProjectAccess {
  areas: AccessArea[];
  // The current user may change members' access (owner, MD, Company Admin)
  canManage: boolean;
  me: { role: string; actions: string[]; scopeActions: string[] };
  members?: MemberAccess[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const projectAccessApi = {
  get: async (projectId: string) => {
    const response = await api.get<ApiResponse<ProjectAccess>>(`/projects/${projectId}/access`);
    return response.data.data;
  },

  // null resets the member to their role's access
  set: async (projectId: string, userId: string, access: Record<string, AccessLevel> | null) => {
    const response = await api.put<ApiResponse<MemberAccess>>(`/projects/${projectId}/team/${userId}/access`, { access });
    return response.data;
  },
};

import { api } from './axios';
import { Permissions } from '../constants/permissions';

// Types
export interface ProjectStage {
  _id: string;
  projectId: string;
  stage: string;
  startDate: string;
  endDate: string;
  status: string;
  alertSettings: {
    email: boolean;
    sms: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StageProgress {
  stage: string;
  progressPercentage: number;
}

export interface ProgressTracking {
  _id: string;
  projectId: string;
  reportingPeriod: string;
  stageProgress: StageProgress[];
  comments?: string;
  supportingDocumentation?: string[];
  delayDocumentation?: string[];
  correctiveActions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectStageRequest {
  projectId: string;
  stage: string;
  startDate: string;
  endDate: string;
  status: string;
  alertSettings: {
    email: boolean;
    sms: boolean;
  };
}

export interface CreateProgressTrackingRequest {
  projectId: string;
  reportingPeriod: string;
  stageProgress: StageProgress[];
  comments?: string;
  supportingDocumentation?: string[];
  delayDocumentation?: string[];
  correctiveActions?: string[];
}

// API Functions
export const timelineApi = {
  createProjectStage: async (data: CreateProjectStageRequest) => {
    const response = await api.post('/timeline/project-stage', data, {
      requiresPermission: Permissions.CREATE_PROJECT_STAGE
    });
    return response.data;
  },

  getProjectStages: async (projectId: string) => {
    if (!projectId) throw new Error('Project ID is required');
    const response = await api.get(`/timeline/project-stages/${projectId}`, {
      requiresPermission: Permissions.VIEW_TIMELINE
    });
    return response.data;
  },

  createProgressTracking: async (formData: FormData) => {
    const response = await api.post('/timeline/progress-tracking', formData, {
      requiresPermission: Permissions.UPDATE_PROGRESS_TRACKING,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getProgressTracking: async (projectId: string) => {
    if (!projectId) throw new Error('Project ID is required');
    const response = await api.get(`/timeline/progress-tracking/${projectId}`, {
      requiresPermission: Permissions.VIEW_TIMELINE
    });
    return response.data;
  },

  updateProjectStage: async (id: string, data: Partial<CreateProjectStageRequest>) => {
    try {
      const response = await api.patch(`/timeline/project-stage/${id}`, data, {
        requiresPermission: Permissions.UPDATE_PROJECT_STAGE
      });
      return response.data;
    } catch (error) {
      console.error('Error updating project stage:', error);
      throw error;
    }
  },

  updateProgressTracking: async (id: string, formData: FormData) => {
    try {
      const response = await api.patch(`/timeline/progress-tracking/${id}`, formData, {
        requiresPermission: Permissions.UPDATE_PROGRESS_TRACKING,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error updating progress tracking:', error);
      throw error;
    }
  },

  deleteProjectStage: async (id: string) => {
    const response = await api.delete(`/timeline/project-stage/${id}`, {
      requiresPermission: Permissions.DELETE_PROJECT_STAGE
    });
    return response.data;
  },

  deleteProgressTracking: async (id: string) => {
    const response = await api.delete(`/timeline/progress-tracking/${id}`, {
      requiresPermission: Permissions.DELETE_PROGRESS_TRACKING
    });
    return response.data;
  },
};
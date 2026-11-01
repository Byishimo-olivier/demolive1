import { api } from './axios';
import { Permissions } from '../constants/permissions';

// Types
export interface UserRef {
  _id: string;
  fullName?: string;
  email?: string;
}

export type TimelineApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export interface TimelineApproval {
  status: TimelineApprovalStatus;
  reviewedBy?: UserRef | string | null;
  reviewedAt?: string;
  comment?: string;
}

// Fields shared by sub-stages and tasks
export interface WorkItem {
  _id: string;
  name: string;
  wbsCode?: string;
  description?: string;
  startDate: string;
  endDate: string;
  plannedDuration: number;
  responsiblePerson?: UserRef | string | null;
  responsiblePersonName?: string;
  requestedBy?: UserRef | string | null;
  requestedByName?: string;
  status: string;
  progressPercentage: number;
  budget?: number;
  // Budget used so far
  actualCost?: number;
  approval?: TimelineApproval;
  createdAt?: string;
  updatedAt?: string;
}

export type Task = WorkItem;

export interface SubStage extends WorkItem {
  tasks?: Task[];
}

export interface TimelineAccessInfo {
  // Approve whole stages (project owner, Company Admin / Managing Director)
  canApproveStages: boolean;
  // Approve sub-stages and tasks (also team members the owner delegated)
  canApproveItems: boolean;
  // Choose who else may approve sub-stages and tasks
  canManageApprovers: boolean;
  approvers: UserRef[];
  // The current user acts as the Managing Director on this project
  isMd?: boolean;
  lock?: TimelineLock;
}

export type TimelineLockStatus = 'Draft' | 'Submitted' | 'Locked';

export interface TimelineLock {
  status: TimelineLockStatus;
  submittedBy?: UserRef | string | null;
  submittedAt?: string;
  decidedBy?: UserRef | string | null;
  decidedAt?: string;
  note?: string;
  // The project requires the Managing Director to agree the timeline
  mdRequired: boolean;
  // The current user can approve & lock, return, unlock and edit a locked plan
  canDecide: boolean;
}

export interface StageTemplate {
  stage: string;
  wbsCode: string;
  subStages: { name: string; tasks?: string[] }[];
}

export interface ProjectStage {
  _id: string;
  projectId: string;
  stage: string;
  wbsCode?: string;
  budget?: number;
  actualCost?: number;
  description?: string;
  startDate: string;
  endDate: string;
  plannedDuration?: number;
  responsiblePerson?: UserRef | string | null;
  responsiblePersonName?: string;
  requestedBy?: UserRef | string | null;
  requestedByName?: string;
  status: string;
  progressPercentage?: number;
  subStages?: SubStage[];
  approval?: TimelineApproval;
  alertSettings: {
    email: boolean;
    sms: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SubStageRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  responsiblePerson?: string;
  responsiblePersonName?: string;
  requestedByName?: string;
  status?: string;
  progressPercentage?: number;
  budget?: number;
  actualCost?: number;
}

export type TaskRequest = SubStageRequest;

export interface PlannedItem {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  budget?: number;
  actualCost?: number;
}

export interface PlannedSubStage extends PlannedItem {
  tasks?: PlannedItem[];
}

export interface ReviewRequest {
  status: 'Approved' | 'Rejected';
  comment?: string;
  // updatedAt of the copy the reviewer saw; the backend rejects the review (409) if it changed since
  reviewedUpdatedAt?: string;
}

// Display name for a person stored as a user reference and/or free-text name
export const personName = (ref?: UserRef | string | null, fallbackName?: string): string => {
  if (ref && typeof ref === 'object' && ref.fullName) return ref.fullName;
  return fallbackName || '';
};

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
  description?: string;
  budget?: number;
  actualCost?: number;
  // Create only: add the standard sub-stages (and tasks) for this stage
  applyTemplate?: boolean;
  // Create only: the sub-stages (and tasks) as planned in the form
  subStages?: PlannedSubStage[];
  responsiblePerson?: string;
  responsiblePersonName?: string;
  requestedByName?: string;
  progressPercentage?: number;
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

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Stage and sub-stage mutations all return the updated (populated) stage
export type StageResponse = ApiResponse<ProjectStage>;

// API Functions
export const timelineApi = {
  createProjectStage: async (data: CreateProjectStageRequest) => {
    const response = await api.post<StageResponse>('/timeline/project-stage', data, {
      requiresPermission: Permissions.CREATE_PROJECT_STAGE
    });
    return response.data;
  },

  getProjectStages: async (projectId: string) => {
    if (!projectId) throw new Error('Project ID is required');
    const response = await api.get<ApiResponse<ProjectStage[]>>(`/timeline/project-stages/${projectId}`, {
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
    const response = await api.get<ApiResponse<ProgressTracking[]>>(`/timeline/progress-tracking/${projectId}`, {
      requiresPermission: Permissions.VIEW_TIMELINE
    });
    return response.data;
  },

  updateProjectStage: async (id: string, data: Partial<CreateProjectStageRequest>) => {
    try {
      const response = await api.patch<StageResponse>(`/timeline/project-stage/${id}`, data, {
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

  // Approval is enforced by the backend (project owner or company Admin/MD),
  // so no client-side permission gate here: the project owner may not hold a company role.
  reviewProjectStage: async (id: string, data: ReviewRequest) => {
    const response = await api.patch<StageResponse>(`/timeline/project-stage/${id}/review`, data);
    return response.data;
  },

  createSubStage: async (stageId: string, data: SubStageRequest) => {
    const response = await api.post<StageResponse>(`/timeline/project-stage/${stageId}/sub-stages`, data, {
      requiresPermission: Permissions.UPDATE_PROJECT_STAGE
    });
    return response.data;
  },

  updateSubStage: async (stageId: string, subStageId: string, data: Partial<SubStageRequest>) => {
    const response = await api.patch<StageResponse>(`/timeline/project-stage/${stageId}/sub-stages/${subStageId}`, data, {
      requiresPermission: Permissions.UPDATE_PROJECT_STAGE
    });
    return response.data;
  },

  deleteSubStage: async (stageId: string, subStageId: string) => {
    const response = await api.delete<StageResponse>(`/timeline/project-stage/${stageId}/sub-stages/${subStageId}`, {
      requiresPermission: Permissions.UPDATE_PROJECT_STAGE
    });
    return response.data;
  },

  getTimelineAccess: async (projectId: string) => {
    const response = await api.get<ApiResponse<TimelineAccessInfo>>(`/timeline/access/${projectId}`);
    return response.data;
  },

  updateTimelineApprovers: async (projectId: string, userIds: string[]) => {
    const response = await api.put<ApiResponse<TimelineAccessInfo>>(`/timeline/approvers/${projectId}`, { userIds });
    return response.data;
  },

  setSubStageCompletion: async (stageId: string, subStageId: string, done: boolean) => {
    const response = await api.patch<StageResponse>(
      `/timeline/project-stage/${stageId}/sub-stages/${subStageId}/completion`,
      { done },
      { requiresPermission: Permissions.UPDATE_PROJECT_STAGE }
    );
    return response.data;
  },

  setTaskCompletion: async (stageId: string, subStageId: string, taskId: string, done: boolean) => {
    const response = await api.patch<StageResponse>(
      `/timeline/project-stage/${stageId}/sub-stages/${subStageId}/tasks/${taskId}/completion`,
      { done },
      { requiresPermission: Permissions.UPDATE_PROJECT_STAGE }
    );
    return response.data;
  },

  submitTimeline: async (projectId: string) => {
    const response = await api.post<ApiResponse<TimelineLock>>(`/timeline/lock/${projectId}/submit`, {});
    return response.data;
  },

  approveTimeline: async (projectId: string, note?: string) => {
    const response = await api.post<ApiResponse<TimelineLock>>(`/timeline/lock/${projectId}/approve`, { note });
    return response.data;
  },

  returnTimeline: async (projectId: string, note: string) => {
    const response = await api.post<ApiResponse<TimelineLock>>(`/timeline/lock/${projectId}/return`, { note });
    return response.data;
  },

  unlockTimeline: async (projectId: string, note: string) => {
    const response = await api.post<ApiResponse<TimelineLock>>(`/timeline/lock/${projectId}/unlock`, { note });
    return response.data;
  },

  getStageTemplates: async () => {
    const response = await api.get<ApiResponse<StageTemplate[]>>('/timeline/stage-templates');
    return response.data;
  },

  applyStageTemplate: async (stageId: string) => {
    const response = await api.post<StageResponse>(`/timeline/project-stage/${stageId}/apply-template`, {}, {
      requiresPermission: Permissions.UPDATE_PROJECT_STAGE
    });
    return response.data;
  },

  reorderSubStages: async (stageId: string, ids: string[]) => {
    const response = await api.put<StageResponse>(`/timeline/project-stage/${stageId}/sub-stages/order`, { ids }, {
      requiresPermission: Permissions.UPDATE_PROJECT_STAGE
    });
    return response.data;
  },

  createTask: async (stageId: string, subStageId: string, data: TaskRequest) => {
    const response = await api.post<StageResponse>(`/timeline/project-stage/${stageId}/sub-stages/${subStageId}/tasks`, data, {
      requiresPermission: Permissions.UPDATE_PROJECT_STAGE
    });
    return response.data;
  },

  updateTask: async (stageId: string, subStageId: string, taskId: string, data: Partial<TaskRequest>) => {
    const response = await api.patch<StageResponse>(
      `/timeline/project-stage/${stageId}/sub-stages/${subStageId}/tasks/${taskId}`,
      data,
      { requiresPermission: Permissions.UPDATE_PROJECT_STAGE }
    );
    return response.data;
  },

  deleteTask: async (stageId: string, subStageId: string, taskId: string) => {
    const response = await api.delete<StageResponse>(
      `/timeline/project-stage/${stageId}/sub-stages/${subStageId}/tasks/${taskId}`,
      { requiresPermission: Permissions.UPDATE_PROJECT_STAGE }
    );
    return response.data;
  },

  reorderTasks: async (stageId: string, subStageId: string, ids: string[]) => {
    const response = await api.put<StageResponse>(
      `/timeline/project-stage/${stageId}/sub-stages/${subStageId}/tasks/order`,
      { ids },
      { requiresPermission: Permissions.UPDATE_PROJECT_STAGE }
    );
    return response.data;
  },

  reviewTask: async (stageId: string, subStageId: string, taskId: string, data: ReviewRequest) => {
    const response = await api.patch<StageResponse>(
      `/timeline/project-stage/${stageId}/sub-stages/${subStageId}/tasks/${taskId}/review`,
      data
    );
    return response.data;
  },

  reviewSubStage: async (stageId: string, subStageId: string, data: ReviewRequest) => {
    const response = await api.patch<StageResponse>(`/timeline/project-stage/${stageId}/sub-stages/${subStageId}/review`, data);
    return response.data;
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
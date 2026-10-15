import { axiosInstance } from './axios';
import { PriorityLevel } from '../types';

// Types
export interface MaintenanceTask {
  _id: string;
  projectId: string;
  title: string;
  description: string;
  priority: PriorityLevel;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo: string;
  dueDate: string;
  completedDate?: string;
  documents: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceTaskDTO {
  projectId: string;
  title: string;
  description: string;
  priority: PriorityLevel;
  assignedTo: string;
  dueDate: string;
  documents?: File[];
}

export interface UpdateMaintenanceTaskDTO {
  title?: string;
  description?: string;
  priority?: PriorityLevel;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  dueDate?: string;
  completedDate?: string;
  documents?: File[];
}

export interface MaintenanceSchedule {
  _id: string;
  projectId: string;
  equipmentId: string;
  taskType: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  lastPerformed: string;
  nextDue: string;
  assignedTo: string;
  status: 'pending' | 'completed' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceScheduleDTO {
  projectId: string;
  equipmentId: string;
  taskType: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  lastPerformed: string;
  assignedTo: string;
}

// API Functions
export const maintenanceApi = {
  // Tasks
  createTask: async (data: CreateMaintenanceTaskDTO) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'documents' && Array.isArray(value)) {
        value.forEach(file => formData.append('documents', file));
      } else {
        formData.append(key, value.toString());
      }
    });

    const response = await axiosInstance.post('/api/v1/maintenance/tasks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getTasks: async (projectId: string) => {
    const response = await axiosInstance.get(`/api/v1/maintenance/tasks/${projectId}`);
    return response.data;
  },

  updateTask: async (id: string, data: UpdateMaintenanceTaskDTO) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'documents' && Array.isArray(value)) {
        value.forEach(file => formData.append('documents', file));
      } else if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    const response = await axiosInstance.patch(`/api/v1/maintenance/tasks/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Schedules
  createSchedule: async (data: CreateMaintenanceScheduleDTO) => {
    const response = await axiosInstance.post('/api/v1/maintenance/schedules', data);
    return response.data;
  },

  getSchedules: async (projectId: string) => {
    const response = await axiosInstance.get(`/api/v1/maintenance/schedules/${projectId}`);
    return response.data;
  },

  updateSchedule: async (id: string, data: Partial<CreateMaintenanceScheduleDTO>) => {
    const response = await axiosInstance.patch(`/api/v1/maintenance/schedules/${id}`, data);
    return response.data;
  },

  markScheduleComplete: async (id: string) => {
    const response = await axiosInstance.post(`/api/v1/maintenance/schedules/${id}/complete`);
    return response.data;
  },

  // Additional endpoints from OpenAPI spec
  getTask: async (id: string) => {
    const response = await axiosInstance.get(`/api/v1/maintenance/tasks/${id}`);
    return response.data;
  },

  deleteTask: async (id: string) => {
    const response = await axiosInstance.delete(`/api/v1/maintenance/tasks/${id}`);
    return response.data;
  },

  getSchedule: async (id: string) => {
    const response = await axiosInstance.get(`/api/v1/maintenance/schedules/${id}`);
    return response.data;
  },

  deleteSchedule: async (id: string) => {
    const response = await axiosInstance.delete(`/api/v1/maintenance/schedules/${id}`);
    return response.data;
  }
}; 
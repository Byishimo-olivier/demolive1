import { User } from './index';

export type MaintenanceCategory = 'IT' | 'Plumbing' | 'Electrical' | 'Civil';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'emergency';
export type MaintenanceStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type QualityCheckStatus = 'pending' | 'passed' | 'failed';

export interface MaintenanceRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  department: string;
  description: string;
  priority: MaintenancePriority;
  location: string;
  category: MaintenanceCategory;
  attachments: string[];
  preferredStartDate: string;
  preferredEndDate: string;
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RepairRecord {
  id: string;
  requestId: string;
  assignedTeamId: string;
  assignedTeamName: string;
  statusUpdates: {
    status: MaintenanceStatus;
    note: string;
    timestamp: string;
  }[];
  materialsUsed: {
    name: string;
    quantity: number;
    unit: string;
    cost: number;
  }[];
  workHours: number;
  totalCost: number;
  completionNotes: string;
  qualityCheckStatus: QualityCheckStatus;
  qualityCheckNotes?: string;
  checkedBy?: string;
  checkedAt?: string;
  createdAt: string;
  updatedAt: string;
}
import { User } from './index';

export type ProjectStage = 
  | 'preliminaries'
  | 'design'
  | 'engineering'
  | 'procurement'
  | 'mobilization'
  | 'construction'
  | 'testing'
  | 'handover';

export type StageStatus = 
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'delayed'
  | 'on_hold';

export interface StageSchedule {
  stage: ProjectStage;
  startDate: string;
  endDate: string;
  status: StageStatus;
  alerts: {
    type: 'warning' | 'critical' | 'info';
    message: string;
    createdAt: string;
  }[];
  dependencies: ProjectStage[];
}

export interface ProjectSchedule {
  id: string;
  projectId: string;
  stages: StageSchedule[];
  lastUpdated: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressReport {
  id: string;
  projectId: string;
  reportingPeriod: {
    startDate: string;
    endDate: string;
  };
  stageProgress: {
    stage: ProjectStage;
    completion: number;
    plannedCompletion: number;
    variance: number;
    comments: string;
  }[];
  delays: {
    stage: ProjectStage;
    reason: string;
    impact: string;
    documents: string[];
  }[];
  correctiveActions: {
    action: string;
    responsible: string;
    deadline: string;
    status: 'pending' | 'in_progress' | 'completed';
  }[];
  overallProgress: number;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
}
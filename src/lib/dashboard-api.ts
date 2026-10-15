import { api } from './axios';
import { Permissions } from '../constants/permissions';

export interface DashboardSummary {
  totalProjects: number;
  projectsByStatus: {
    [key: string]: number;
  };
  financials: {
    totalBudget: number;
    totalExpenses: number;
    totalRemainingBudget: number;
    overallBudgetUtilization: number;
  };
}

export interface ProjectsHealth {
  projects: Array<{
    projectId: string;
    projectName: string;
    status: string;
    progress: number;
    budget: number;
    expenses: number;
    remainingBudget: number;
    variance: number;
    budgetUtilization: number;
    healthScore: string;
  }>;
  overallHealthPercentage: string;
}

export interface ProcurementAnalytics {
  materialRequestCount: number;
  purchaseOrderCount: number;
  supplierPerformance: {
    onTimeDeliveryPercentage: string;
  };
}

export interface DocumentWorkflowAnalytics {
  totalDocuments: number;
  approved: number;
  pending: number;
  approvalRate: string;
  averageApprovalTimeDays: string;
}

export interface PerformanceMatrix {
  riskScore: string;
  onTimeDeliveryPercentage: string;
  stockHealthPercentage: string;
  predictedCompletionDate: string;
}

export interface TimelineTrends {
  totalStages: number;
  completedStages: number;
  averageProgress: string;
  averageDelayDays: string;
}

export interface AdvancedAnalytics {
  budgetEfficiencyPercentage: string;
  costVariancePercentage: string;
  procurementVelocityPercentage: string;
  projectsOnTrackPercentage: string;
}

export interface CashFlowData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

export interface BiddingAnalytics {
  totalTenders: number;
  activeTenders: number;
  totalBids: number;
  awardedBids: number;
  avgBidsPerTender: string;
}

class DashboardApi {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await api.get('/dashboard/summary', {
      requiresPermission: [Permissions.VIEW_PROJECT, Permissions.COMPANY_VIEW_PROJECTS]
    });
    return response.data.data;
  }

  async getProjectsHealth(status?: string): Promise<ProjectsHealth> {
    const params = status ? { status } : {};
    const response = await api.get('/dashboard/projects-health', {
      requiresPermission: [Permissions.VIEW_PROJECT, Permissions.COMPANY_VIEW_PROJECTS],
      params
    });
    return response.data.data;
  }

  async getProcurementAnalytics(): Promise<ProcurementAnalytics> {
    const response = await api.get('/dashboard/procurement-analytics', {
      requiresPermission: [Permissions.VIEW_PROJECT, Permissions.COMPANY_VIEW_PROJECTS]
    });
    return response.data.data;
  }

  async getDocumentWorkflowAnalytics(): Promise<DocumentWorkflowAnalytics> {
    const response = await api.get('/dashboard/document-workflow', {
      requiresPermission: [Permissions.VIEW_PROJECT, Permissions.COMPANY_VIEW_PROJECTS]
    });
    return response.data.data;
  }

  async getPerformanceMatrix(): Promise<PerformanceMatrix> {
    const response = await api.get('/dashboard/performance-matrix', {
      requiresPermission: [Permissions.VIEW_PROJECT, Permissions.COMPANY_VIEW_PROJECTS]
    });
    return response.data.data;
  }

  async getTimelineTrends(): Promise<TimelineTrends> {
    const response = await api.get('/dashboard/timeline-trends', {
      requiresPermission: [Permissions.VIEW_PROJECT, Permissions.COMPANY_VIEW_PROJECTS]
    });
    return response.data.data;
  }

  async getAdvancedAnalytics(): Promise<AdvancedAnalytics> {
    const response = await api.get('/dashboard/advanced-analytics', {
      requiresPermission: [Permissions.VIEW_PROJECT, Permissions.COMPANY_VIEW_PROJECTS]
    });
    return response.data.data;
  }

  async getCashFlow(period: 'monthly' | 'weekly' = 'monthly'): Promise<CashFlowData> {
    const response = await api.get('/dashboard/cash-flow', {
      requiresPermission: [Permissions.VIEW_PROJECT, Permissions.COMPANY_VIEW_PROJECTS], 
      params: { period } 
    });
    return response.data.data;
  }

  async getBiddingAnalytics(): Promise<BiddingAnalytics> {
    const response = await api.get('/dashboard/bidding-analytics', {
      requiresPermission: [Permissions.VIEW_PROJECT, Permissions.COMPANY_VIEW_PROJECTS]
    });
    return response.data.data;
  }
}

export const dashboardApi = new DashboardApi();
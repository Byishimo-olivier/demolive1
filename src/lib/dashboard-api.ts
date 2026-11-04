import { api } from './axios';
import { Permissions } from '../constants/permissions';
import { rangeParams, type DateRange } from './date-range';

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

// Income = invoices approved or paid; received = paid invoices; expenses = approved expenses
export interface ProfitLoss {
  projectId: string | null;
  projectCount: number;
  startDate: string | null;
  endDate: string | null;
  income: {
    earned: number;
    received: number;
    outstanding: number;
    awaitingApproval: number;
    awaitingApprovalCount: number;
  };
  expenses: {
    approved: number;
    pending: number;
    pendingCount: number;
    byCategory: { category: string; amount: number }[];
  };
  // Income minus expenses
  profitLoss: number;
  marginPercent: number | null;
  // Money received minus expenses
  cashPosition: number;
  byProject: { projectId: string; name: string; income: number; received: number; expenses: number; profitLoss: number }[];
  trend: { labels: string[]; income: number[]; expenses: number[]; profitLoss: number[] };
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

  // One project, or every project the user can see when projectId is left out
  async getProfitLoss(projectId?: string, range?: DateRange): Promise<ProfitLoss> {
    const response = await api.get<{ data: ProfitLoss }>('/dashboard/profit-loss', {
      requiresPermission: [Permissions.VIEW_PROJECT, Permissions.COMPANY_VIEW_PROJECTS],
      params: { ...(projectId ? { projectId } : {}), ...rangeParams(range) },
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
import { api } from './axios';

export type MdApprovalAction =
  | 'timeline'
  | 'budgets'
  | 'expenses'
  | 'invoices'
  | 'requests'
  | 'otherRequests'
  | 'purchaseOrders'
  | 'receiving'
  | 'stockTransfers'
  | 'pettyCash'
  | 'subcontractorPayments';

export type MdApprovalSettings = Record<MdApprovalAction, boolean>;

export interface MdApprovalActionInfo {
  key: MdApprovalAction;
  label: string;
  description: string;
  // false while the module has no approval step yet
  available: boolean;
}

export interface MdApprovalInfo {
  settings: MdApprovalSettings;
  actions: MdApprovalActionInfo[];
  // The current user acts as the Managing Director on this project
  isMd: boolean;
  canManage: boolean;
  // The current user may approve or reject material / other requests (never their own)
  canApproveRequests: boolean;
  canApproveOtherRequests: boolean;
  // The current user may approve and sign purchase orders
  canApprovePurchaseOrders: boolean;
  // The current user may accept, reject or query site receiving notes
  canReviewReceiving: boolean;
  canApproveStockTransfers: boolean;
  canApprovePettyCash: boolean;
  canApproveSubcontractorPayments: boolean;
  // The current user is the project owner (creator)
  isOwner: boolean;
  // May approve requests and deliveries they raised themselves (personal project owner, or MD / Company Admin)
  canApproveOwn: boolean;
  // Manual expenses are approved by the owner or the MD
  canApproveExpenses: boolean;
  // Manual expenses: owner only, unless the Client authorized other roles in writing
  canRecordManualExpense: boolean;
  canManageManualExpenses: boolean;
  manualExpenses: ManualExpenseAuthorization;
}

export interface ManualExpenseAuthorization {
  roles: string[];
  // Reference of the Client's written authorization
  reference: string;
  authorizedByName?: string;
  authorizedAt?: string;
  roleOptions: string[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Which actions on a project only the Managing Director may approve
export const approvalsApi = {
  getProjectSettings: async (projectId: string) => {
    const response = await api.get<ApiResponse<MdApprovalInfo>>(`/approvals/projects/${projectId}`);
    return response.data;
  },

  updateProjectSettings: async (projectId: string, settings: Partial<MdApprovalSettings>) => {
    const response = await api.put<ApiResponse<MdApprovalInfo>>(`/approvals/projects/${projectId}`, settings);
    return response.data;
  },

  updateManualExpenseAuthorization: async (projectId: string, data: { roles: string[]; reference?: string }) => {
    const response = await api.put<ApiResponse<MdApprovalInfo>>(
      `/approvals/projects/${projectId}/manual-expenses`,
      data
    );
    return response.data;
  },
};

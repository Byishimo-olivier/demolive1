import { api } from './axios';
import { Permissions } from '../constants/permissions';
import { ExpenseCategory, BoQItemStatus, GRNStatus, UnitOfMeasurement } from '../types';

export enum BoQCategory {
  EXCAVATION = "Excavation",
  FOUNDATION = "Foundation",
  WALLING = "Walling",
  PLASTERING = "Plastering",
  PAINTING = "Painting",
  IT = "IT",
  MEP = "MEP",
  LANDSCAPE = "Landscape",
  GENERAL = "General",
  OTHER = "Other",
}

// Types
export interface BoQLineItem {
  _id?: string;
  description: string;
  unit: UnitOfMeasurement;
  quantity: number;
  rate: number;
  amount?: number; // Calculated by backend
  completedQuantity?: number;
  // The Excel import this item came from (none = entered by hand)
  importId?: string;
}

// One Excel file imported into the BoQ
export interface BoQImportRecord {
  _id: string;
  fileName: string;
  sheets: string[];
  importedBy?: { _id: string; fullName?: string; email?: string } | string | null;
  importedAt: string;
}

export interface BoQSection {
  _id?: string;
  sectionName: BoQCategory;
  items: BoQLineItem[];
  subTotal?: number; // Calculated by backend
}

export interface BoQ {
  _id: string;
  projectId: string;
  sections: BoQSection[];
  grandTotal: number;
  imports?: BoQImportRecord[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrUpdateBoQDTO {
  projectId: string;
  sections: {
    sectionName: BoQCategory;
    items: {
      // Sent back when editing so items keep their identity, progress and import
      _id?: string;
      description: string;
      unit: UnitOfMeasurement;
      quantity: number;
      rate: number;
      completedQuantity?: number;
      importId?: string;
    }[];
  }[];
}

export interface ImportBoQDTO {
  fileName: string;
  sheets?: string[];
  // Add to the current BoQ or replace it
  mode: 'add' | 'replace';
  sections: {
    sectionName: BoQCategory;
    items: { description: string; unit: UnitOfMeasurement; quantity: number; rate: number }[];
  }[];
}

// Legacy types for backward compatibility
export interface BoQItem {
  _id: string;
  projectId: string;
  itemCode: string;
  description: string;
  unit: UnitOfMeasurement;
  quantity: number;
  rate: number;
  amount: number;
  completedQuantity: number;
  completionPercentage: number;
  status: BoQItemStatus;
  documentFilePath?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoQItemDTO {
  projectId: string;
  itemCode: string;
  description: string;
  unit: UnitOfMeasurement;
  quantity: number;
  rate: number;
  document?: File;
}

export interface UpdateBoQItemDTO {
  completedQuantity: number;
  status?: BoQItemStatus;
}

export interface Budget {
  _id: string;
  projectId: string;
  fiscalYear: number;
  materialsBudget: number;
  laborBudget: number;
  equipmentBudget: number;
  fuelBudget: number;
  overheadsBudget: number;
  subcontractorsBudget?: number;
  totalPlannedBudget: number;
  notes?: string;
  approvalStatus: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetRequest {
  projectId: string;
  fiscalYear: number;
  materialsBudget: number;
  laborBudget: number;
  equipmentBudget: number;
  fuelBudget: number;
  overheadsBudget: number;
  subcontractorsBudget?: number;
  totalPlannedBudget: number;
  notes?: string;
  approvalStatus?: string;
}

export interface Expense {
  _id: string;
  projectId: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  documents: { filePath: string; description: string }[];
  approvalStatus: string;
  // Added by hand, or created from a GRN, an approved request, petty cash or a labour pay run
  source?: { kind: ExpenseSourceKind; refId?: string; reference?: string };
  // Who approved or rejected it, when, and why
  approval?: { reviewedBy?: string; reviewedByName?: string; reviewedAt?: string; comment?: string };
  // Recorded by a role the Client authorized in writing (not the owner)
  authorizedUnder?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseSourceKind = 'Manual' | 'GRN' | 'Request' | 'PurchaseOrder' | 'PettyCash' | 'Labour' | 'Subcontractor';

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  status?: string;
  source?: ExpenseSourceKind;
}

export interface CreateExpenseRequest {
  projectId: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  document?: File;
}

export interface InvoiceItem {
  // BOQ_BASED fields
  boqItemId?: string;
  claimedQuantity?: number;
  // SERVICE_BASED fields
  description?: string;
  quantity?: number;
  unitPrice?: number;
  // Populated by backend
  rate?: number;
  amount: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  type: string;
  projectId: string;
  issuerId: string;
  workPeriod: {
    start: string;
    end: string;
  };
  invoiceItems: InvoiceItem[]; // Array of items
  totalAmount: number; // Calculated from items
  documents: { filePath: string; description: string }[];
  status: string;
  paymentTerms: string;
  dueDate: string;
  paymentDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  approvalWorkflow: {
    approvedBy?: string;
    approvedAt?: string;
    comments?: string;
  };
  invoiceDate?: string;
  paidAt?: string;
  voidedAt?: string;
  voidReason?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceRequest {
  projectId: string;
  type: string;
  workPeriod: {
    start: string;
    end: string;
  };
  invoiceItems: InvoiceItem[];
  paymentTerms: string;
  dueDate: string;
  // Defaults to today on the server
  invoiceDate?: string;
  paymentDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  documents?: File[];
}

export interface BudgetSummary {
  budget: {
    totalPlanned: number;
    materials: number;
    labor: number;
    equipment: number;
    fuel: number;
    overheads: number;
    subcontractors?: number;
  };
  expenses: {
    total: number;
    byCategory: Record<string, number>;
  };
  remaining: number;
  utilizationPercentage: number;
}

export interface ExpenseReport {
  totalExpenses: number;
  expensesByCategory: {
    category: string;
  amount: number;
    percentage: number;
  }[];
  expensesByDate: {
  date: string;
  amount: number;
  }[];
}

export interface GRN {
  _id: string;
  projectId: string;
  purchaseOrderId: string;
  grnNumber: string;
  receivedDate: string;
  items: {
    materialId: string;
    quantity: number;
    receivedQuantity: number;
    pendingQuantity: number;
    remarks: string;
  }[];
  status: GRNStatus;
  documents: {
    filePath: string;
    description: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGRNDTO {
  projectId: string;
  purchaseOrderId: string;
  receivedDate: string;
  items: {
    materialId: string;
    quantity: number;
    receivedQuantity: number;
    remarks?: string;
  }[];
  documents?: File[];
}

export interface InventoryItem {
  _id: string;
  name: string;
  materialCode: string;
  category: ExpenseCategory;
  unit: UnitOfMeasurement;
  currentStock: number;
  unitPrice: number;
  minimumStock: number;
  isCustom: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemDTO {
  name: string;
  materialCode: string;
  category: ExpenseCategory;
  unit: UnitOfMeasurement;
  currentStock: number;
  unitPrice: number;
  minimumStock: number;
  isCustom?: boolean;
}

export interface UpdateInventoryItemDTO {
  name?: string;
  materialCode?: string;
  category?: ExpenseCategory;
  unit?: UnitOfMeasurement;
  currentStock?: number;
  unitPrice?: number;
  minimumStock?: number;
  isCustom?: boolean;
}

// API Functions
export const financeApi = {
  // BOQ
  createOrUpdateBoQ: async (data: CreateOrUpdateBoQDTO) => {
    const response = await api.post('/finance/boq', data, {
      requiresPermission: [Permissions.CREATE_BOQ, Permissions.UPDATE_BOQ_PROGRESS],
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  // Alias for convenience
  createBoQ: async (data: CreateOrUpdateBoQDTO) => {
    return financeApi.createOrUpdateBoQ(data);
  },

  // Legacy method for backward compatibility
  createBoQItem: async (data: CreateBoQItemDTO) => {
    const formData = new FormData();
    formData.append('projectId', data.projectId);
    formData.append('itemCode', data.itemCode);
    formData.append('description', data.description);
    formData.append('unit', data.unit);
    formData.append('quantity', data.quantity.toString());
    formData.append('rate', data.rate.toString());

    if (data.document) {
      formData.append('document', data.document);
    }

    const response = await api.post('/finance/boq', formData, {
      requiresPermission: Permissions.CREATE_BOQ,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateBoQProgress: async (id: string, data: UpdateBoQItemDTO) => {
    const response = await api.patch(`/finance/boq/${id}/progress`, data, {
      requiresPermission: Permissions.UPDATE_BOQ_PROGRESS
    });
    return response.data;
  },

  getProjectBoQ: async (projectId: string): Promise<{ data: BoQ }> => {
    const response = await api.get(`/finance/boq/${projectId}`, {
      requiresPermission: Permissions.VIEW_BOQ
    });
    return response.data;
  },

  importBoQ: async (projectId: string, data: ImportBoQDTO): Promise<{ data: BoQ; message: string }> => {
    const response = await api.post(`/finance/boq/${projectId}/import`, data, {
      requiresPermission: Permissions.CREATE_BOQ
    });
    return response.data as { data: BoQ; message: string };
  },

  deleteBoQImport: async (projectId: string, importId: string): Promise<{ data: BoQ; message: string }> => {
    const response = await api.delete(`/finance/boq/${projectId}/imports/${importId}`, {
      requiresPermission: Permissions.CREATE_BOQ
    });
    return response.data as { data: BoQ; message: string };
  },

  deleteBoQ: async (projectId: string) => {
    const response = await api.delete(`/finance/boq/${projectId}`, {
      requiresPermission: Permissions.CREATE_BOQ
    });
    return response.data;
  },

  // Budget
  createBudget: async (data: CreateBudgetRequest) => {
    const response = await api.post('/finance/budget', data, {
      requiresPermission: Permissions.CREATE_BUDGET
    });
    return response.data;
  },

  updateBudget: async (budgetId: string, data: Partial<CreateBudgetRequest>) => {
    const response = await api.patch(`/finance/budget/${budgetId}`, data, {
      requiresPermission: Permissions.UPDATE_BUDGET
    });
    return response.data;
  },

  getBudget: async (projectId: string, fiscalYear?: number) => {
    const params = fiscalYear ? { fiscalYear } : {};
    const response = await api.get(`/finance/budget/${projectId}`, {
      requiresPermission: Permissions.VIEW_BUDGET,
      params
    });
    return response.data;
  },

  getBudgetSummary: async (projectId: string) => {
    const response = await api.get(`/finance/budget/${projectId}/summary`, {
      requiresPermission: Permissions.VIEW_BUDGET
    });
    return response.data;
  },

  updateBudgetApprovalStatus: async (budgetId: string, status: string) => {
    const response = await api.patch(`/finance/budget/${budgetId}/approval-status`, { status }, {
      requiresPermission: Permissions.UPDATE_BUDGET
    });
    return response.data;
  },

  checkBudgetThresholds: async (projectId: string) => {
    const response = await api.post(`/finance/budget/${projectId}/check-thresholds`, {}, {
      requiresPermission: Permissions.VIEW_BUDGET
    });
    return response.data;
  },

  generateFinanceReport: async (projectId: string) => {
    const response = await api.get(`/finance/budget/${projectId}/report`, {
      requiresPermission: Permissions.VIEW_BUDGET
    });
    return response.data;
  },

  sendFinanceReport: async (projectId: string, email?: string) => {
    const params = email ? { email } : {};
    const response = await api.post(`/finance/budget/${projectId}/send-report`, {}, {
      requiresPermission: Permissions.VIEW_BUDGET,
      params
    });
    return response.data;
  },

  // Expenses
  createExpense: async (data: CreateExpenseRequest) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'document' && value instanceof File) {
        formData.append('document', value);
      } else if (key !== 'document') {
        formData.append(key, value.toString());
      }
    });

    const response = await api.post('/finance/expense', formData, {
      // Owner only unless the Client authorized other roles: the server checks
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  updateExpense: async (expenseId: string, data: Partial<CreateExpenseRequest>) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'document' && value instanceof File) {
        formData.append('document', value);
      } else if (key !== 'document') {
        formData.append(key, value.toString());
      }
    });

    const response = await api.patch(`/finance/expense/${expenseId}`, formData, {
      requiresPermission: Permissions.UPDATE_EXPENSE,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getExpenses: async (projectId: string, filters?: ExpenseFilters) => {
    const response = await api.get(`/finance/expense/${projectId}`, {
      requiresPermission: Permissions.VIEW_EXPENSE,
      params: filters
    });
    return response.data;
  },

  getExpenseReport: async (projectId: string, groupBy?: 'category' | 'date') => {
    const params = groupBy ? { groupBy } : {};
    const response = await api.get(`/finance/expense/${projectId}/report`, {
      requiresPermission: Permissions.VIEW_EXPENSE,
      params
    });
    return response.data;
  },

  deleteExpense: async (expenseId: string) => {
    const response = await api.delete(`/finance/expense/${expenseId}`, {
      requiresPermission: Permissions.DELETE_EXPENSE
    });
    return response.data;
  },

  // The server checks the approver (owner or MD)
  updateExpenseApprovalStatus: async (expenseId: string, status: string, comments?: string) => {
    const response = await api.patch(`/finance/expense/${expenseId}/approval-status`, { status, comments });
    return response.data;
  },

  // Invoices
  createInvoice: async (data: CreateInvoiceRequest) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'documents' && Array.isArray(value)) {
        value.forEach(file => formData.append('documents', file));
      } else if (key === 'workPeriod' || key === 'paymentDetails') {
        formData.append(key, JSON.stringify(value));
      } else if (key === 'invoiceItems') {
        formData.append(key, JSON.stringify(value)); // Send as JSON string
      } else if (key !== 'documents') {
        formData.append(key, value.toString());
      }
    });

    const response = await api.post('/finance/invoice', formData, {
      requiresPermission: Permissions.CREATE_INVOICE,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getInvoices: async (projectId: string, filters?: {
    status?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await api.get(`/finance/invoice/${projectId}`, {
      requiresPermission: Permissions.VIEW_INVOICE,
      params: filters
    });
    return response.data;
  },

  updateInvoiceStatus: async (invoiceId: string, status: string, comments?: string) => {
    const response = await api.patch(`/finance/invoice/${invoiceId}/status`, { status, comments }, {
      requiresPermission: Permissions.UPDATE_INVOICE_STATUS
    });
    return response.data;
  },

  voidInvoice: async (invoiceId: string, reason: string) => {
    const response = await api.post(`/finance/invoice/${invoiceId}/void`, { reason }, {
      requiresPermission: Permissions.UPDATE_INVOICE_STATUS
    });
    return response.data;
  },

  // GRN
  createGRN: async (data: CreateGRNDTO) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'documents' && Array.isArray(value)) {
        value.forEach(file => formData.append('documents', file));
      } else if (key === 'items') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value.toString());
      }
    });

    const response = await api.post('/finance/grn', formData, {
      requiresPermission: Permissions.VIEW_PURCHASE_ORDER,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getGRN: async (id: string) => {
    const response = await api.get(`/finance/grn/${id}`, {
      requiresPermission: Permissions.VIEW_PURCHASE_ORDER
    });
    return response.data;
  },

  // Inventory
  createInventoryItem: async (data: CreateInventoryItemDTO) => {
    const response = await api.post('/finance/inventory', data, {
      requiresPermission: Permissions.MANAGE_INVENTORY
    });
    return response.data;
  },

  getInventoryItems: async (params?: {
    category?: ExpenseCategory;
    search?: string;
  }) => {
    const response = await api.get('/finance/inventory', {
      requiresPermission: Permissions.VIEW_INVENTORY,
      params
    });
    return response.data;
  },

  getInventoryItem: async (id: string) => {
    const response = await api.get(`/finance/inventory/${id}`, {
      requiresPermission: Permissions.VIEW_INVENTORY
    });
    return response.data;
  },

  updateInventoryItem: async (id: string, data: UpdateInventoryItemDTO) => {
    const response = await api.put(`/finance/inventory/${id}`, data, {
      requiresPermission: Permissions.MANAGE_INVENTORY
    });
    return response.data;
  },

  deleteInventoryItem: async (id: string) => {
    const response = await api.delete(`/finance/inventory/${id}`, {
      requiresPermission: Permissions.MANAGE_INVENTORY
    });
    return response.data;
  },

  getInventoryTransactions: async (
    id: string,
    params?: {
      transactionType?: 'received' | 'issued' | 'adjusted' | 'returned';
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const response = await api.get(`/finance/inventory/${id}/transactions`, {
      requiresPermission: Permissions.VIEW_INVENTORY,
      params
    });
    return response.data;
  },

  getInventoryDocuments: async (
    id: string,
    params?: {
      documentType?: 'GRN' | 'ISSUE';
    }
  ) => {
    const response = await api.get(`/finance/inventory/${id}/documents`, {
      requiresPermission: Permissions.VIEW_INVENTORY,
      params
    });
    return response.data;
  }
}; 
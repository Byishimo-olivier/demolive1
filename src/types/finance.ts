import { User } from './index';

export type BudgetCategory = 'Materials' | 'Labor' | 'Equipment' | 'Fuel' | 'Overheads';
export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type ExpenseCategory = BudgetCategory;
export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'rejected';
export type InvoiceType = 'contractor' | 'consultant';

export interface BudgetItem {
  category: BudgetCategory;
  amount: number;
  description: string;
}

export interface BudgetPlan {
  id: string;
  projectId: string;
  fiscalYear: string;
  items: BudgetItem[];
  totalPlannedBudget: number;
  notes: string;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  projectId: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  supportingDocs: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  projectId: string;
  issuedBy: string;
  issuedTo: string;
  workPeriodStart: string;
  workPeriodEnd: string;
  items: {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  supportingDocs: string[];
  notes: string;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}
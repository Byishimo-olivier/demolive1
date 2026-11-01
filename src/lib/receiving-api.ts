import { api } from './axios';
import { Permissions } from '../constants/permissions';
import { rangeParams, type DateRange } from './date-range';

export type ReceivingStatus =
  | 'Pending Inspection'
  | 'Submitted for Approval'
  | 'Discrepancy Reported'
  | 'Clarification Requested'
  | 'Approved'
  | 'Rejected';

export const RECEIVING_STATUSES: ReceivingStatus[] = [
  'Pending Inspection',
  'Submitted for Approval',
  'Discrepancy Reported',
  'Clarification Requested',
  'Approved',
  'Rejected',
];

// The site manager can still change the note
export const EDITABLE_STATUSES: ReceivingStatus[] = ['Pending Inspection', 'Clarification Requested'];
// Waiting for the owner / authorized manager
export const REVIEW_STATUSES: ReceivingStatus[] = ['Submitted for Approval', 'Discrepancy Reported'];

export type LineCondition = 'Good' | 'Damaged' | 'Partially damaged';
export const LINE_CONDITIONS: LineCondition[] = ['Good', 'Damaged', 'Partially damaged'];

export interface ReceivingLine {
  _id: string;
  poLineId: string;
  materialName: string;
  materialCode?: string;
  unit: string;
  category: string;
  unitPrice: number;
  orderedQuantity: number;
  previouslyAccepted: number;
  deliveredQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  condition: LineCondition;
  arrivedSafely: boolean;
  comments?: string;
  acceptedQuantity?: number;
}

export interface ReceivingAttachment {
  _id: string;
  url: string;
  fileName: string;
  fileType: string;
  kind: 'photo' | 'document';
  uploadedAt: string;
}

type Ref<T> = string | (T & { _id: string });

export interface ReceivingNote {
  _id: string;
  noteNumber: string;
  projectId: string;
  purchaseOrderId: Ref<{ poNumber: string; supplierDetails?: string; status?: string }>;
  poNumber: string;
  supplier: string;
  deliveryDate: string;
  deliveryReference?: string;
  vehicleOrDriver?: string;
  receivedByName: string;
  siteLocation?: string;
  lines: ReceivingLine[];
  inspection?: { inspectedByName?: string; inspectedAt?: string; notes?: string };
  attachments: ReceivingAttachment[];
  status: ReceivingStatus;
  hasDiscrepancy: boolean;
  submittedAt?: string;
  review?: { reviewedByName?: string; reviewedAt?: string; comment?: string; discrepancyAccepted?: boolean };
  grnId?: Ref<{ grnNumber: string; status?: string }>;
  expenseStatus?: 'Recorded' | 'Not applicable' | 'Failed';
  history: { action: string; byName?: string; at: string; comment?: string }[];
  createdBy: Ref<{ fullName?: string }>;
  createdAt: string;
}

export interface ReceivingLineInput {
  poLineId: string;
  deliveredQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  condition: LineCondition;
  arrivedSafely: boolean;
  comments?: string;
}

export interface ReceivingNoteInput {
  projectId: string;
  purchaseOrderId: string;
  deliveryDate: string;
  deliveryReference?: string;
  vehicleOrDriver?: string;
  receivedByName?: string;
  siteLocation?: string;
  inspectionNotes?: string;
  lines: ReceivingLineInput[];
}

export interface PurchaseOrderReceiving {
  purchaseOrderId: string;
  poNumber: string;
  status: string;
  fullyReceived: boolean;
  lines: {
    poLineId: string;
    materialName: string;
    materialCode?: string;
    unit: string;
    category: string;
    unitPrice: number;
    orderedQuantity: number;
    acceptedQuantity: number;
    // On deliveries not decided yet
    pendingQuantity: number;
    outstandingQuantity: number;
  }[];
  notes: { _id: string; noteNumber: string; status: ReceivingStatus; deliveryDate: string; hasDiscrepancy: boolean; receivedByName?: string; grnId?: Ref<{ grnNumber: string }> }[];
  grns: { _id: string; grnNumber: string; status: string; receivedDate: string }[];
}

export interface ReviewInput {
  decision: 'approve' | 'reject' | 'clarify';
  comment?: string;
  discrepancyAccepted?: boolean;
  lines?: { lineId: string; acceptedQuantity: number }[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const refNumber = <T extends object>(ref: Ref<T> | undefined, key: keyof T): string | undefined =>
  ref && typeof ref === 'object' ? (ref[key] as unknown as string) : undefined;

const toFormData = (data: Record<string, unknown>, attachments: File[]) => {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(key, key === 'lines' ? JSON.stringify(value) : String(value));
  });
  attachments.forEach((file) => form.append('attachments', file));
  return form;
};

export const receivingApi = {
  list: async (projectId: string, filters: DateRange & { status?: string } = {}) => {
    const { startDate, endDate, status } = filters;
    const params: Record<string, string> = { ...rangeParams({ startDate, endDate }) };
    if (status) params.status = status;
    const response = await api.get<ApiResponse<ReceivingNote[]>>(`/finance/receiving-notes/project/${projectId}`, {
      requiresPermission: Permissions.VIEW_RECEIVING_NOTE,
      params,
    });
    return response.data.data;
  },

  get: async (id: string) => {
    const response = await api.get<ApiResponse<ReceivingNote>>(`/finance/receiving-notes/${id}`);
    return response.data.data;
  },

  purchaseOrderProgress: async (purchaseOrderId: string) => {
    const response = await api.get<ApiResponse<PurchaseOrderReceiving>>(
      `/finance/receiving-notes/purchase-order/${purchaseOrderId}`
    );
    return response.data.data;
  },

  create: async (data: ReceivingNoteInput, attachments: File[] = []) => {
    const response = await api.post<ApiResponse<ReceivingNote>>(
      '/finance/receiving-notes',
      toFormData({ ...data }, attachments),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  update: async (id: string, data: Partial<Omit<ReceivingNoteInput, 'projectId' | 'purchaseOrderId'>> & { removeAttachments?: string[] }) => {
    const response = await api.patch<ApiResponse<ReceivingNote>>(`/finance/receiving-notes/${id}`, data);
    return response.data;
  },

  addAttachments: async (id: string, attachments: File[]) => {
    const response = await api.post<ApiResponse<ReceivingNote>>(
      `/finance/receiving-notes/${id}/attachments`,
      toFormData({}, attachments),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  submit: async (id: string, inspectionNotes?: string) => {
    const response = await api.post<ApiResponse<ReceivingNote>>(`/finance/receiving-notes/${id}/submit`, { inspectionNotes });
    return response.data;
  },

  // The server checks the reviewer (owner, MD or authorized manager)
  review: async (id: string, input: ReviewInput) => {
    const response = await api.patch<ApiResponse<ReceivingNote>>(`/finance/receiving-notes/${id}/review`, input);
    return response.data;
  },

  remove: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/finance/receiving-notes/${id}`);
    return response.data;
  },
};

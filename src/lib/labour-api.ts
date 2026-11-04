import { api } from './axios';
import { Permissions } from '../constants/permissions';
import { rangeParams, type DateRange } from './date-range';

export type RateType = 'Daily' | 'Hourly' | 'Unit' | 'Weekly' | 'TenDays' | 'Fortnightly' | 'Monthly';

// How a worker is paid, in the order offered on the worker form
export const RATE_TYPE_LABELS: Record<RateType, string> = {
  Daily: 'Per day',
  Hourly: 'Per hour',
  Unit: 'Per unit of work',
  Weekly: 'Per week',
  TenDays: 'Per 10 days',
  Fortnightly: 'Per 15 days',
  Monthly: 'Per month',
};

// Paid a fixed amount for a period; attendance is counted in days
export const PERIOD_RATE_TYPES: RateType[] = ['Weekly', 'TenDays', 'Fortnightly', 'Monthly'];
export const isPeriodRate = (rateType: RateType) => PERIOD_RATE_TYPES.includes(rateType);

// Working days a period's pay covers, unless set on the worker
export const DEFAULT_PERIOD_DAYS: Partial<Record<RateType, number>> = { Weekly: 6, TenDays: 10, Fortnightly: 15, Monthly: 26 };

/** "day", "hour", "m²", "week", "10 days", "15 days", "month" */
export const rateUnit = (rateType: RateType, unitLabel?: string) =>
  ({ Daily: 'day', Hourly: 'hour', Unit: unitLabel || 'unit', Weekly: 'week', TenDays: '10 days', Fortnightly: '15 days', Monthly: 'month' })[rateType];

/** What the worked units are counted in */
export const workedUnit = (rateType: RateType, unitLabel?: string) =>
  rateType === 'Hourly' ? 'hours' : rateType === 'Unit' ? unitLabel || 'units' : 'days';

/** Amount for some units: a period rate is spread over its working days */
export const lineAmount = (units: number, rate: number, periodDays = 1) =>
  Math.round(((units * rate) / (periodDays || 1)) * 100) / 100;
export type AttendanceStatus = 'Present' | 'Half day' | 'Absent' | 'Leave';

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Present', 'Half day', 'Absent', 'Leave'];

export interface Worker {
  _id: string;
  projectId: string;
  fullName: string;
  nationalId?: string;
  phone?: string;
  trade?: string;
  rateType: RateType;
  rate: number;
  // Period rates: working days the pay covers
  periodDays?: number;
  unitLabel?: string;
  // Days of work one payment covers (paid every 1, 2, 5… days)
  payEveryDays?: number;
  active: boolean;
}

export interface WorkerInput {
  fullName: string;
  nationalId?: string;
  phone?: string;
  trade?: string;
  rateType: RateType;
  rate: number;
  periodDays?: number;
  unitLabel?: string;
  payEveryDays?: number;
  active?: boolean;
}

export interface AttendanceRow {
  _id: string;
  date: string;
  workerId: string;
  workerName: string;
  trade?: string;
  status: AttendanceStatus;
  units: number;
  rateType: RateType;
  rate: number;
  periodDays?: number;
  unitLabel?: string;
  amount: number;
  siteLocation?: string;
  remarks?: string;
  recordedByName?: string;
  paid: boolean;
  payRunReference?: string;
}

export interface WorkerTotal {
  workerId: string;
  workerName: string;
  trade?: string;
  rateType: RateType;
  rate: number;
  periodDays?: number;
  unitLabel?: string;
  days: number;
  units: number;
  amount: number;
  unpaidAmount: number;
  present: number;
  halfDay: number;
  absent: number;
  leave: number;
}

export interface AttendanceSummary {
  rows: AttendanceRow[];
  totals: {
    amount: number;
    paidAmount: number;
    unpaidAmount: number;
    units: number;
    presentDays: number;
    workerCount: number;
    rowCount: number;
    unpaidCount: number;
  };
  byWorker: WorkerTotal[];
  byDate: { date: string; workers: number; units: number; amount: number; unpaidAmount: number }[];
}

export interface RegisterEntry {
  workerId: string;
  status: AttendanceStatus;
  units?: number | '';
  remarks?: string;
}

export interface PayRun {
  _id: string;
  reference: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  attendanceCount: number;
  workerCount: number;
  createdByName?: string;
  createdAt: string;
  expense: { _id: string; amount: number; approvalStatus: string } | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const labourApi = {
  listWorkers: async (projectId: string, active?: boolean) => {
    const response = await api.get<ApiResponse<Worker[]>>(`/finance/labour/workers/project/${projectId}`, {
      requiresPermission: Permissions.VIEW_LABOUR,
      params: active === undefined ? {} : { active: String(active) },
    });
    return response.data.data;
  },

  createWorker: async (projectId: string, data: WorkerInput) => {
    const response = await api.post<ApiResponse<Worker>>('/finance/labour/workers', { ...data, projectId });
    return response.data;
  },

  importWorkers: async (projectId: string, workers: Partial<WorkerInput>[]) => {
    const response = await api.post<
      ApiResponse<{ created: number; skipped: { row: number; fullName: string; reason: string }[] }>
    >('/finance/labour/workers/import', { projectId, workers });
    return response.data;
  },

  updateWorker: async (id: string, data: Partial<WorkerInput>) => {
    const response = await api.patch<ApiResponse<Worker>>(`/finance/labour/workers/${id}`, data);
    return response.data;
  },

  saveRegister: async (projectId: string, date: string, entries: RegisterEntry[]) => {
    const response = await api.post<ApiResponse<{ date: string; saved: number }>>('/finance/labour/attendance/bulk', {
      projectId,
      date,
      entries: entries.map((e) => ({ ...e, units: e.units === '' ? undefined : e.units })),
    });
    return response.data;
  },

  summary: async (projectId: string, filters: DateRange & { workerId?: string; status?: string } = {}) => {
    const { startDate, endDate, workerId, status } = filters;
    const params: Record<string, string> = { ...rangeParams({ startDate, endDate }) };
    if (workerId) params.workerId = workerId;
    if (status) params.status = status;
    const response = await api.get<ApiResponse<AttendanceSummary>>(`/finance/labour/attendance/project/${projectId}`, {
      requiresPermission: Permissions.VIEW_LABOUR,
      params,
    });
    return response.data.data;
  },

  deleteAttendance: async (id: string) => {
    const response = await api.delete<ApiResponse<null>>(`/finance/labour/attendance/${id}`);
    return response.data;
  },

  listPayRuns: async (projectId: string) => {
    const response = await api.get<ApiResponse<PayRun[]>>(`/finance/labour/pay-runs/project/${projectId}`, {
      requiresPermission: Permissions.VIEW_LABOUR,
    });
    return response.data.data;
  },

  // Owner (or roles the Client authorized in writing) only: the server checks
  createPayRun: async (projectId: string, startDate: string, endDate: string) => {
    const response = await api.post<ApiResponse<PayRun>>('/finance/labour/pay-runs', { projectId, startDate, endDate });
    return response.data;
  },

  deletePayRun: async (id: string) => {
    const response = await api.delete<ApiResponse<unknown>>(`/finance/labour/pay-runs/${id}`);
    return response.data;
  },
};

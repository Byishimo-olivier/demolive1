import { api } from './axios';
import type { InventoryItem } from './inventory-api';

/** A place stock can move between, as seen from one project */
export interface StockEndpoint {
  key: string;
  kind: 'Main' | 'Project' | 'Named';
  // For Named: a store, or a site within the project
  namedKind?: 'Store' | 'Site';
  label: string;
  projectId?: string;
  locationId?: string;
  // This project's own places (vs. the company's other projects)
  isCurrentProject: boolean;
}

export interface Person {
  userId: string;
  name: string;
  email?: string;
  role?: string;
  group: 'Project' | 'Company';
}

export interface EndpointRef {
  kind: 'Main' | 'Project' | 'Named';
  projectId?: string;
  locationId?: string;
}

export interface StockReportRow {
  itemId: string;
  name: string;
  materialCode: string;
  unit: string;
  category: string;
  stock: number;
  minimumStock: number;
  unitPrice: number;
  value: number;
  // Received / issued over the period
  in: number;
  out: number;
}

export interface StockReportPlace {
  key: string;
  label: string;
  kind: 'Store' | 'Site';
  items: StockReportRow[];
  totals: { items: number; value: number; in: number; out: number };
}

export interface StockReportMaterial {
  name: string;
  materialCode: string;
  unit: string;
  stock: number;
  value: number;
  in: number;
  out: number;
  // Stock at each place, by place key
  byPlace: Record<string, number>;
}

/** Stock of every store and site of the company */
export interface StockReport {
  startDate: string | null;
  endDate: string | null;
  places: StockReportPlace[];
  materials: StockReportMaterial[];
  totals: { places: number; value: number; in: number; out: number };
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const toRef = (e: StockEndpoint): EndpointRef => ({ kind: e.kind, projectId: e.projectId, locationId: e.locationId });

export const stockLocationApi = {
  list: async (projectId: string) => {
    const response = await api.get<ApiResponse<StockEndpoint[]>>(`/finance/stock-locations/project/${projectId}`);
    return response.data.data;
  },

  // Items in stock at a place (key: main, project:<id> or named:<id>), for transfers
  items: async (projectId: string, key: string) => {
    const response = await api.get<ApiResponse<InventoryItem[]>>(`/finance/stock-locations/project/${projectId}/items`, {
      params: { key },
    });
    return response.data.data;
  },

  // Project team and company members who can be made responsible for goods
  people: async (projectId: string) => {
    const response = await api.get<ApiResponse<Person[]>>(`/finance/stock-locations/project/${projectId}/people`);
    return response.data.data;
  },

  // Consolidated stock of all stores and sites, with in / out over the period (owner, MD, Procurement Manager)
  report: async (projectId: string, range: { startDate?: string; endDate?: string } = {}) => {
    const response = await api.get<ApiResponse<StockReport>>(`/finance/stock-locations/project/${projectId}/report`, {
      params: range,
    });
    return response.data.data;
  },

  // Store: main store managers; Site: the project team (the server checks)
  create: async (projectId: string, kind: 'Store' | 'Site', name: string) => {
    const response = await api.post<ApiResponse<StockEndpoint>>('/finance/stock-locations', { projectId, kind, name });
    return response.data;
  },
};

export enum Resource {
  PROJECT = 'project',
  MATERIAL_REQUEST = 'material-request',
  PURCHASE_ORDER = 'purchase-order',
  INVOICE = 'invoice',
  BUDGET = 'budget',
  EXPENSE = 'expense',
  BOQ = 'boq',
  INVENTORY = 'inventory',
  TIMELINE = 'timeline',
  DOCUMENT = 'document',
  COMPANY = 'company',
  USER = 'user',
  TENDER = 'tender',
  BID = 'bid',
  GRN = 'grn',
  MATERIAL_USAGE = 'material-usage',
  QUALITY = 'quality',
  ADMIN = 'admin',
}

export enum Action {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  MANAGE = 'manage',
}

export type Permission = `${Resource}:${Action}`;

export interface PermissionCheck {
  resource: Resource;
  action: Action;
}

export const createPermission = (resource: Resource, action: Action): Permission => 
  `${resource}:${action}`;

export const parsePermission = (permission: Permission): PermissionCheck => {
  const [resource, action] = permission.split(':') as [Resource, Action];
  return { resource, action };
};

export const HTTP_METHOD_TO_ACTION = {
  GET: Action.VIEW,
  POST: Action.CREATE,
  PUT: Action.UPDATE,
  PATCH: Action.UPDATE,
  DELETE: Action.DELETE,
} as const;

export type HttpMethod = keyof typeof HTTP_METHOD_TO_ACTION;

export class PermissionError extends Error {
  constructor(
    public resource: Resource,
    public action: Action,
    message?: string
  ) {
    super(message || `Permission denied: Cannot ${action} ${resource}`);
    this.name = 'PermissionError';
  }
}
import { PermissionError, Resource, Action } from '../types/permissions';
import { projectAccessStore } from '../lib/project-access-store';

/** Someone invited to projects only: everything but running the company */
export const projectOnlyAllows = (permission: string) =>
  !permission.startsWith('company:') || permission === 'company:view-projects';

export class PermissionService {
  private permissions: Set<string> = new Set();
  // On some of the company's projects only: project pages follow the project role (checked by the
  // server); company management pages stay closed
  private isProjectOnly: boolean = false;

  setPermissions(permissions: string[]): void {
    this.permissions = new Set(permissions);
  }

  setProjectOnly(projectOnly: boolean): void {
    this.isProjectOnly = projectOnly;
  }

  hasPermission(permission: string): boolean {
    // The selected project's page access decides its pages and tabs
    const decided = projectAccessStore.decides(permission);
    if (decided !== null) return decided;
    if (this.isProjectOnly) return projectOnlyAllows(permission);
    return this.permissions.has(permission);
  }

  validatePermission(permission: string): void {
    if (!this.hasPermission(permission)) {
      throw new PermissionError(Resource.ADMIN, Action.VIEW, `Missing permission: ${permission}`);
    }
  }

  getAllPermissions(): string[] {
    return Array.from(this.permissions);
  }

  clearPermissions(): void {
    this.permissions.clear();
    this.isProjectOnly = false;
  }
}

export const permissionService = new PermissionService();
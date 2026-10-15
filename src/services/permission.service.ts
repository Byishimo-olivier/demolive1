import { PermissionError, Resource, Action } from '../types/permissions';

export class PermissionService {
  private permissions: Set<string> = new Set();
  private isPersonalProfile: boolean = false;

  setPermissions(permissions: string[]): void {
    this.permissions = new Set(permissions);
  }

  setProfileType(isPersonal: boolean): void {
    this.isPersonalProfile = isPersonal;
  }

  hasPermission(permission: string): boolean {
    if (this.isPersonalProfile) {
      return true;
    }
    return this.permissions.has(permission);
  }

  validatePermission(permission: string): void {
    if (this.isPersonalProfile) {
      return;
    }

    if (!this.permissions.has(permission)) {
      throw new PermissionError(Resource.ADMIN, Action.VIEW, `Missing permission: ${permission}`);
    }
  }

  getAllPermissions(): string[] {
    return Array.from(this.permissions);
  }

  clearPermissions(): void {
    this.permissions.clear();
    this.isPersonalProfile = false;
  }
}

export const permissionService = new PermissionService();
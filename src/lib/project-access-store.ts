/**
 * What the current user may do on the selected project: their role, adjusted by the pages and
 * tabs the owner opened or closed for them. Loaded by AuthProvider when the project changes;
 * permission checks (useAuth().can, request pre-checks) use it for the actions it covers.
 */
export interface ProjectAccessState {
  projectId: string | null;
  // The actions the user may do; null until loaded (then the usual role checks apply)
  actions: Set<string> | null;
  // The actions page access decides
  scope: Set<string>;
}

let state: ProjectAccessState = { projectId: null, actions: null, scope: new Set() };
const listeners = new Set<() => void>();

export const projectAccessStore = {
  get: (): ProjectAccessState => state,
  set(next: ProjectAccessState) {
    state = next;
    listeners.forEach((listener) => listener());
  },
  clear() {
    this.set({ projectId: null, actions: null, scope: new Set() });
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** true / false when page access decides this action on the selected project, otherwise null */
  decides(permission: string): boolean | null {
    if (!state.actions || !state.scope.has(permission)) return null;
    return state.actions.has(permission);
  },
};

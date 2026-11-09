import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../lib/auth-api';
import { companiesApi } from '../lib/companies-api';
import type { User, Company } from '../types';
import { getCompanyPermissionsForRole } from '../constants/permissions';
import { permissionService, projectOnlyAllows } from '../services/permission.service';
import { useProject } from './ProjectContext';
import { projectAccessStore } from '../lib/project-access-store';
import { projectAccessApi } from '../lib/project-access-api';
import { session, type SignOutReason } from '../lib/session';
import toast from 'react-hot-toast';

// There is no personal workspace: everyone works in a company
type ProfileType = 'organization';

type ActiveProfile = {
  type: ProfileType;
  id: string;
  name: string;
  data: Company;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  // null when the user has no company yet (they are sent to register one)
  activeProfile: ActiveProfile | null;
  organizationProfiles: Company[];
  currentCompanyRole: string | null;
  signIn: (email: string, password: string, redirectTo?: string, remember?: boolean) => Promise<void>;
  signOut: (options?: SignOutOptions) => Promise<void>;
  switchToProfile: (profileType: ProfileType, profileId: string) => Promise<void>;
  refreshUserCompanies: (activateCompanyId?: string) => Promise<void>;
  updateUser: (user: User) => void;
  can: (permission: string) => boolean;
};

export type SignOutOptions = {
  /** Why the session ended; shown on the sign-in page. Defaults to 'manual'. */
  reason?: SignOutReason;
  /** Tell other tabs to sign out too. Defaults to true. */
  broadcast?: boolean;
};

const SIGN_OUT_MESSAGES: Partial<Record<SignOutReason, string>> = {
  idle: 'You were signed out after a period of inactivity.',
  expired: 'Your session has expired. Please sign in again.',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Only in-app paths, so a crafted link can't send the user to another site
function safeRedirect(path?: string | null): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null;
  return path;
}

// The ?redirect= the user was sent to login with
function redirectTarget(): string | null {
  return safeRedirect(new URLSearchParams(window.location.search).get('redirect'));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProfile, setActiveProfile] = useState<ActiveProfile | null>(null);
  const [organizationProfiles, setOrganizationProfiles] = useState<Company[]>([]);
  const [currentCompanyRole, setCurrentCompanyRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProject } = useProject();
  // Re-render permission checks when the selected project's access arrives
  const projectAccess = useSyncExternalStore(projectAccessStore.subscribe, projectAccessStore.get);

  // What the user may do on the selected project (role + the pages the owner opened for them)
  const accessProjectId = user ? currentProject?._id : undefined;
  useEffect(() => {
    if (!accessProjectId) {
      projectAccessStore.clear();
      return;
    }
    let cancelled = false;
    projectAccessApi
      .get(accessProjectId)
      .then((access) => {
        if (!cancelled) {
          projectAccessStore.set({
            projectId: accessProjectId,
            actions: new Set(access.me.actions),
            scope: new Set(access.me.scopeActions),
          });
        }
      })
      // Not on the project (or offline): fall back to the role checks
      .catch(() => !cancelled && projectAccessStore.clear());
    return () => {
      cancelled = true;
    };
  }, [accessProjectId, activeProfile?.id]);

  // Restore the session once, when the app opens
  useEffect(() => {
    let cancelled = false;
    const initAuth = async () => {
      try {
        // A new tab of a non-remembered session: borrow it from an open tab
        if (!session.getToken()) {
          await session.borrowFromOpenTab();
        }
        const token = session.getToken();
        if (!token) return;

        if (session.isExpired(token)) {
          session.clear('expired', false);
          toast.error(SIGN_OUT_MESSAGES.expired!);
          return;
        }

        const storedUser = session.getUser();
        if (!storedUser) {
          session.clear('manual', false);
          return;
        }
        if (cancelled) return;
        setUser(storedUser);
        await loadUserCompaniesAndProfile(storedUser);
      } catch (error) {
        console.error('Error initializing auth:', error);
        clearAuthData('manual', false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initAuth();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Signed-in users skip the sign-in and landing pages. Runs when the restored session is
  // ready or the page changes, not when `user` changes: signIn navigates by itself once
  // the user's companies have loaded.
  useEffect(() => {
    if (loading || !user) return;
    const authPages = ['/login', '/register', '/'];
    if (authPages.includes(location.pathname)) {
      navigate(redirectTarget() ?? '/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, location.pathname, navigate]);

  const clearAuthData = (reason: SignOutReason = 'manual', broadcast = true) => {
    session.clear(reason, broadcast);
    setUser(null);
    setActiveProfile(null);
    setOrganizationProfiles([]);
    setCurrentCompanyRole(null);

    // Clear permission service
    permissionService.clearPermissions();
  };

  const loadUserCompaniesAndProfile = async (user: User) => {
    try {
      const companies = await companiesApi.getUserCompanies();
      setOrganizationProfiles(companies.data);

      // The company used last, else a company the user is a member of, else one reached through a project
      let stored: { type?: string; id?: string } | null = null;
      try {
        stored = JSON.parse(localStorage.getItem('infrasoko_active_profile') || 'null');
      } catch {
        stored = null;
      }
      const list: Company[] = companies.data;
      const org =
        list.find((c) => c._id === stored?.id) ??
        list.find((c) => !c.projectAccessOnly) ??
        list[0];
      if (org) {
        await setOrganizationActiveProfile(user, org);
        return;
      }
      clearActiveProfile();
    } catch (error) {
      console.error('Error loading companies:', error);
      clearActiveProfile();
    }
  };

  // No company yet: the app sends the user to register one
  const clearActiveProfile = () => {
    setCurrentCompanyRole(null);
    setActiveProfile(null);
    localStorage.removeItem('infrasoko_active_profile');
    permissionService.clearPermissions();
  };

  const setOrganizationActiveProfile = async (user: User, org: Company) => {
    const userMember = (org.members ?? []).find(member => {
      const userId = typeof member.userId === 'string' ? member.userId : member.userId._id;
      return userId === user._id;
    });

    const role = userMember ? userMember.role : null;
    setCurrentCompanyRole(role);
    setActiveProfile({
      type: 'organization',
      id: org._id,
      name: org.name,
      data: org
    });
    localStorage.setItem('infrasoko_active_profile', JSON.stringify({
      type: 'organization',
      id: org._id
    }));

    // Company members follow their company role; people on some projects only follow their project roles
    permissionService.setProjectOnly(!role && !!org.projectAccessOnly);
    if (role) {
      const rolePermissions = getCompanyPermissionsForRole(role);
      permissionService.setPermissions(rolePermissions);
    } else {
      permissionService.clearPermissions();
    }
  };

  const handleSignIn = async (email: string, password: string, redirectTo?: string, remember = false) => {
    const response = await authApi.login({ email, password });
    session.start(response.data.token, response.data.user, remember);
    setUser(response.data.user);
    await loadUserCompaniesAndProfile(response.data.user);
    // Back to where the user was going (e.g. accepting an invitation)
    navigate(safeRedirect(redirectTo) ?? redirectTarget() ?? '/dashboard');
  };

  const handleSignOut = async ({ reason = 'manual', broadcast = true }: SignOutOptions = {}) => {
    clearAuthData(reason, broadcast);
    const message = SIGN_OUT_MESSAGES[reason];
    if (message) toast.error(message, { id: 'session-ended' });
    // When the session ended on its own, come back to the same page after signing in.
    // (The sign-in page reads the reason from session storage, set by clearAuthData.)
    if (reason === 'manual') {
      navigate('/login');
    } else {
      const back = location.pathname + location.search;
      navigate(`/login?redirect=${encodeURIComponent(back)}`);
    }
  };

  const switchToProfile = async (profileType: ProfileType, profileId: string) => {
    localStorage.removeItem('infrasoko_active_project');

    const org = organizationProfiles.find(c => c._id === profileId);
    if (!org || profileType !== 'organization') return;
    await setOrganizationActiveProfile(user!, org);
    toast.success(`Switched to ${org.name}`);
    navigate('/dashboard');
  };

  const refreshUserCompanies = async (activateCompanyId?: string) => {
    if (!user) return;
    try {
      const companies = await companiesApi.getUserCompanies();
      setOrganizationProfiles(companies.data);
      if (activateCompanyId) {
        const joinedCompany = companies.data.find(
          (company: Company) => company._id === activateCompanyId
        );
        if (joinedCompany) {
          await setOrganizationActiveProfile(user, joinedCompany);
        }
      }
    } catch (error) {
      console.error('Error refreshing user companies:', error);
    }
  };

  const can = (permission: string) => {
    // Pages and tabs of the selected project follow the user's access on it
    if (projectAccess.actions && projectAccess.scope.has(permission)) {
      return projectAccess.actions.has(permission);
    }
    if (!activeProfile) return false;
    // On some of the company's projects only
    if (!currentCompanyRole) return activeProfile.data.projectAccessOnly ? projectOnlyAllows(permission) : false;

    const rolePermissions = getCompanyPermissionsForRole(currentCompanyRole);
    // console.log("Role Permissions", rolePermissions)

    return rolePermissions.includes(permission);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    session.updateUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeProfile,
        organizationProfiles,
        currentCompanyRole,
        signIn: handleSignIn,
        signOut: handleSignOut,
        switchToProfile,
        refreshUserCompanies,
        updateUser: handleUpdateUser,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

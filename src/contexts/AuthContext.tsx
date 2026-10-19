import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../lib/auth-api';
import { companiesApi } from '../lib/companies-api';
import type { User, Company } from '../types';
import { getCompanyPermissionsForRole } from '../constants/permissions';
import { permissionService } from '../services/permission.service';
import toast from 'react-hot-toast';

type ProfileType = 'personal' | 'organization';

type ActiveProfile = {
  type: ProfileType;
  id: string;
  name: string;
  data: User | Company;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  activeProfile: ActiveProfile | null;
  personalProfile: User | null;
  organizationProfiles: Company[];
  currentCompanyRole: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchToProfile: (profileType: ProfileType, profileId: string) => Promise<void>;
  refreshUserCompanies: (activateCompanyId?: string) => Promise<void>;
  updateUser: (user: User) => void;
  can: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProfile, setActiveProfile] = useState<ActiveProfile | null>(null);
  const [personalProfile, setPersonalProfile] = useState<User | null>(null);
  const [organizationProfiles, setOrganizationProfiles] = useState<Company[]>([]);
  const [currentCompanyRole, setCurrentCompanyRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('infrasoko_auth_token');
        if (!token) {
          setLoading(false);
          return;
        }

        // Validate JWT token
        try {
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Date.now() / 1000;
          
          if (tokenPayload.exp && tokenPayload.exp < currentTime) {
            clearAuthData();
            toast.error('Your session has expired. Please log in again.');
            navigate('/login');
            return;
          }
        } catch (parseError) {
          console.error('Invalid token:', parseError);
          clearAuthData();
          navigate('/login');
          return;
        }

        // Get user data
        const userData = localStorage.getItem('infrasoko_user');
        if (!userData) {
          setLoading(false);
          return;
        }

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setPersonalProfile(parsedUser);

        // Load companies and set active profile
        await loadUserCompaniesAndProfile(parsedUser);

        // Redirect if on auth pages
        const authPages = ['/login', '/register', '/'];
        if (authPages.includes(location.pathname)) {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [navigate, location.pathname]);

  const clearAuthData = () => {
    localStorage.removeItem('infrasoko_auth_token');
    localStorage.removeItem('infrasoko_user');
    localStorage.removeItem('infrasoko_active_profile');
    localStorage.removeItem('infrasoko_active_project');
    setUser(null);
    setActiveProfile(null);
    setPersonalProfile(null);
    setOrganizationProfiles([]);
    setCurrentCompanyRole(null);
    
    // Clear permission service
    permissionService.clearPermissions();
  };

  const loadUserCompaniesAndProfile = async (user: User) => {
    try {
      const companies = await companiesApi.getUserCompanies();
      setOrganizationProfiles(companies.data);

      const storedActiveProfile = localStorage.getItem('infrasoko_active_profile');
      if (storedActiveProfile) {
        const profile = JSON.parse(storedActiveProfile);
        if (profile.type === 'organization') {
          const org = companies.data.find((c: Company) => c._id === profile.id);
          if (org) {
            await setOrganizationActiveProfile(user, org);
            return;
          }
        }
      } else if (companies.data.length > 0) {
        // Invited members should land in the company workspace so they can see
        // the shared company data immediately. Their membership role still
        // controls which actions are available there.
        await setOrganizationActiveProfile(user, companies.data[0]);
        return;
      }
      
      // Default to personal profile
      await setPersonalActiveProfile(user);
    } catch (error) {
      console.error('Error loading companies:', error);
      await setPersonalActiveProfile(user);
    }
  };

  const setPersonalActiveProfile = async (user: User) => {
    setCurrentCompanyRole(null);
    setActiveProfile({
      type: 'personal',
      id: user._id,
      name: user.fullName,
      data: user
    });
    localStorage.setItem('infrasoko_active_profile', JSON.stringify({
      type: 'personal',
      id: user._id
    }));
    
    permissionService.setProfileType(true);
  };

  const setOrganizationActiveProfile = async (user: User, org: Company) => {
    const userMember = org.members.find(member => {
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
    
    // Update permission service for organization profile
    permissionService.setProfileType(false);
    if (role) {
      const rolePermissions = getCompanyPermissionsForRole(role);
      permissionService.setPermissions(rolePermissions);
    } else {
      permissionService.clearPermissions();
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    localStorage.setItem('infrasoko_auth_token', response.data.token);
    localStorage.setItem('infrasoko_user', JSON.stringify(response.data.user));
    setUser(response.data.user);
    await loadUserCompaniesAndProfile(response.data.user);
    navigate('/dashboard');
  };

  const handleSignOut = async () => {
    clearAuthData();
    navigate('/login');
  };

  const switchToProfile = async (profileType: ProfileType, profileId: string) => {
    localStorage.removeItem('infrasoko_active_project');
    
    if (profileType === 'personal') {
      await setPersonalActiveProfile(user!);
    } else if (profileType === 'organization') {
      const org = organizationProfiles.find(c => c._id === profileId);
      if (org) {
        await setOrganizationActiveProfile(user!, org);
      }
    }
    
    const profileName = profileType === 'personal' 
      ? user!.fullName 
      : organizationProfiles.find(c => c._id === profileId)?.name;
    toast.success(`Switched to ${profileName} workspace`);
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
    if (activeProfile?.type !== 'organization') return true;
    
    if (!currentCompanyRole) return false;
    
    const rolePermissions = getCompanyPermissionsForRole(currentCompanyRole);
    // console.log("Role Permissions", rolePermissions)
    
    return rolePermissions.includes(permission);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    setPersonalProfile(updatedUser);
    if (activeProfile?.type === 'personal') {
      setActiveProfile({
        ...activeProfile,
        name: updatedUser.fullName,
        data: updatedUser,
      });
    }
    localStorage.setItem('infrasoko_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        activeProfile,
        personalProfile,
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

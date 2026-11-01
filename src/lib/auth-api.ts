import { axiosInstance } from './axios';
import { User } from '../types';

// Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  profilePicture?: File;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

// API Functions
export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('fullName', data.fullName);
    if (data.profilePicture) {
      formData.append('profilePicture', data.profilePicture);
    }

    const response = await axiosInstance.post<AuthResponse>('/auth/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/login', data);
    console.log("[auth-api] login", response.data);
    return (response.data);
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.post('/auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.post('/auth/reset-password', data);
    return response.data;
  },

  // NEW: Email verification
  verifyEmail: async (token: string): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.get(`/auth/verify-email/${token}`);
    return response.data;
  },

  resendVerification: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.post('/auth/resend-verification', { email });
    return response.data;
  },

  // Register from a project invitation: the account is verified and joins the project
  registerWithInvitation: async (
    data: Omit<RegisterRequest, 'profilePicture'> & { invitationToken: string }
  ): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/register-with-invitation', data);
    return response.data;
  },

  // NEW: Register with company invitation
  registerWithCompanyInvitation: async (
    data: Omit<RegisterRequest, 'role' | 'profilePicture'> & { companyInvitationToken: string }
  ): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>(
      '/auth/register-with-company-invitation',
      data
    );
    return response.data;
  },
}; 
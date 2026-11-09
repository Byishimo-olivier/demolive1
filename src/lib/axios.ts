import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import { permissionService } from '../services/permission.service';
import { isEmailNotVerifiedError } from '../utils/error-handler';
import { session } from './session';

// Use Vite's same-origin dev proxy locally so browser requests do not need
// cross-origin CORS permission. Production builds continue using VITE_BASE_URL.
const baseURL = import.meta.env.DEV
  ? ''
  : import.meta.env.VITE_BASE_URL || 'http://localhost:4000';
const apiBaseURL = `${baseURL.replace(/\/$/, '')}/api/v1`;

/** Address of a file the API serves (e.g. "/uploads/photo.jpg"); full addresses are kept as they are */
export const apiFileUrl = (path: string) => (/^https?:\/\//i.test(path) ? path : `${baseURL.replace(/\/$/, '')}${path}`);
const PROXY_URL = "https://api.ivainqueur.dev/nocors";
//  const PROXY_URL = "http://localhost:3500/nocors";

// Define the error response type
interface ErrorResponse {
  message: string;
  success: boolean;
}

// Define the proxy response type
interface ProxyResponse<T = unknown> {
  data: {
    data: T;
    success: boolean;
    message?: string;
  };
  isJson: boolean;
  headers: Record<string, string>;
}

interface RequestConfig {
  requiresPermission?: string | string[]; // Single permission or array of permissions (OR logic)
  [key: string]: any;
}

export const axiosInstance = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to enable/disable the proxy
const USE_PROXY = false;

// Request interceptor
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token
    const token = session.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // NEW: Inject active context header for company switching
    try {
      const activeProfileRaw = localStorage.getItem('infrasoko_active_profile');
      if (activeProfileRaw) {
        const activeProfile = JSON.parse(activeProfileRaw) as { type?: string; id?: string };
        // The company workspace (there is no personal one)
        const activeContextHeader = activeProfile.type === 'organization' ? activeProfile.id : undefined;
        if (activeContextHeader) {
          (config.headers as Record<string, string>)['x-active-company-id'] = activeContextHeader;
        }
      }
    } catch (error) {
      console.error('Failed to parse infrasoko_active_profile:', error);
    }

    // Inject active project header
    try {
      const activeProjectRaw = localStorage.getItem('infrasoko_active_project');
      if (activeProjectRaw) {
        const activeProject = JSON.parse(activeProjectRaw) as { _id?: string; id?: string };
        const projectId = activeProject._id || activeProject.id;
        if (projectId) {
          (config.headers as Record<string, string>)['x-active-project-id'] = projectId;
        }
      }
    } catch (err) {
      console.error('Failed to parse active project', err);
    }

    // Proxy interceptor to bypass CORS
    if (USE_PROXY) {
      // Store the original config
      const originalConfig = { ...config };

      // Set the proxy URL
      config.url = PROXY_URL;
      config.method = 'POST';

      // Handle different content types
      if (config.data instanceof FormData) {
        // For FormData, we need to add the original URL and method to the FormData
        const formData = config.data as FormData;
        formData.append('url', `${apiBaseURL}${originalConfig.url}`);
        formData.append('method', originalConfig.method || 'GET');

        // Add headers as a JSON string
        const headersObj: Record<string, string> = {};
        Object.keys(originalConfig.headers || {}).forEach(key => {
          headersObj[key] = originalConfig.headers[key] as string;
        });
        formData.append('headers', JSON.stringify(headersObj));

        // Set the content type to undefined to let the browser set it with the boundary
        config.headers['Content-Type'] = undefined;
      } else {
        // For JSON data
        config.data = {
          url: `${apiBaseURL}${originalConfig.url}`,
          method: originalConfig.method || 'GET',
          headers: originalConfig.headers || {},
          body: originalConfig.method?.toUpperCase() === 'GET' ? undefined : originalConfig.data || {}
        };
      }
    }

    return config;
  },
  (error: AxiosError) => {
    console.log("errorrrrrrrr");
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Handle proxy response
    if (USE_PROXY) {
      const proxyResponse = response.data as ProxyResponse;

      // Check if the proxy response indicates an error
      if (!proxyResponse.data.success) {
        const error = new AxiosError<ErrorResponse>(
          proxyResponse.data.message || 'An error occurred',
          'ERROR',
          response.config,
          response.request,
          {
            data: {
              message: proxyResponse.data.message || 'An error occurred',
              success: false
            },
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            config: response.config
          }
        );
        // Don't show toast for expected errors (like 404 for bidder profile check)
        return Promise.reject(error);
      }

      return {
        ...response,
        data: proxyResponse.data,
        headers: proxyResponse.headers
      };
    }
    return response;
  },
  (error: AxiosError<ErrorResponse>) => {
    // Handle proxy error response
    if (USE_PROXY && error.response?.data) {
      try {
        const proxyResponse = error.response.data as unknown as ProxyResponse;
        if (proxyResponse.data && typeof proxyResponse.data === 'object' && 'message' in proxyResponse.data) {
          error.response.data = proxyResponse.data as ErrorResponse;
        }
      } catch (parseErr: unknown) {
        // If parsing fails, keep the original error
        console.error('Error parsing proxy response:', parseErr);
      }
    }

    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401) {
      // The session ran out (a request made while signed in): sign in again and come back to
      // this page (e.g. the invitation being accepted). A wrong password at sign-in is not this.
      const sentToken = !!error.config?.headers?.Authorization;
      const path = window.location.pathname;
      const infoPage = ['/', '/features', '/pricing', '/contact', '/privacy-policy', '/terms-of-service', '/invite/register', '/forgot-password', '/reset-password'].includes(path)
        || path.startsWith('/verify-email');
      if (sentToken) {
        // The server no longer accepts this session: end it in every tab
        session.clear('expired');
      }
      if (sentToken && !path.startsWith('/login') && !infoPage) {
        toast.error('Your session has expired. Please sign in again.', { id: 'session-ended' });
        const back = window.location.pathname + window.location.search;
        window.location.href = `/login?reason=expired&redirect=${encodeURIComponent(back)}`;
      }
      return Promise.reject(error);
    }

    // A session belonging to an unverified account: every request will fail, so send
    // the user back to sign-in where they can request a new verification link
    if (
      error.response?.status === 403 &&
      isEmailNotVerifiedError(error) &&
      !error.config?.url?.includes('/auth/')
    ) {
      session.clear('manual');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?verify=required';
      }
      return Promise.reject(error);
    }

    const errorMessage = error.response?.data?.message || 'An error occurred';
    // We'll handle success messages in the components
    if (error.response?.status !== 401) {
      // Don't show toast for 401 as it's handled above
      // toast.error(errorMessage);
    }
    return Promise.reject(error);
  }
);

// Permission-guarded API methods
export const api = {
  get: async <T>(url: string, config?: RequestConfig) => {
    if (config?.requiresPermission) {
      const permissions = Array.isArray(config.requiresPermission) ? config.requiresPermission : [config.requiresPermission];
      const hasPermission = permissions.some(permission => permissionService.hasPermission(permission));
      if (!hasPermission) {
        throw new Error(`Missing required permission(s): ${permissions.join(' or ')}`);
      }
    }
    const { requiresPermission, ...axiosConfig } = config || {};
    return axiosInstance.get<T>(url, axiosConfig);
  },

  post: async <T>(url: string, data?: any, config?: RequestConfig) => {
    if (config?.requiresPermission) {
      const permissions = Array.isArray(config.requiresPermission) ? config.requiresPermission : [config.requiresPermission];
      const hasPermission = permissions.some(permission => permissionService.hasPermission(permission));
      if (!hasPermission) {
        throw new Error(`Missing required permission(s): ${permissions.join(' or ')}`);
      }
    }
    const { requiresPermission, ...axiosConfig } = config || {};
    return axiosInstance.post<T>(url, data, axiosConfig);
  },

  put: async <T>(url: string, data?: any, config?: RequestConfig) => {
    if (config?.requiresPermission) {
      const permissions = Array.isArray(config.requiresPermission) ? config.requiresPermission : [config.requiresPermission];
      const hasPermission = permissions.some(permission => permissionService.hasPermission(permission));
      if (!hasPermission) {
        throw new Error(`Missing required permission(s): ${permissions.join(' or ')}`);
      }
    }
    const { requiresPermission, ...axiosConfig } = config || {};
    return axiosInstance.put<T>(url, data, axiosConfig);
  },

  patch: async <T>(url: string, data?: any, config?: RequestConfig) => {
    if (config?.requiresPermission) {
      const permissions = Array.isArray(config.requiresPermission) ? config.requiresPermission : [config.requiresPermission];
      const hasPermission = permissions.some(permission => permissionService.hasPermission(permission));
      if (!hasPermission) {
        throw new Error(`Missing required permission(s): ${permissions.join(' or ')}`);
      }
    }
    const { requiresPermission, ...axiosConfig } = config || {};
    return axiosInstance.patch<T>(url, data, axiosConfig);
  },

  delete: async <T>(url: string, config?: RequestConfig) => {
    if (config?.requiresPermission) {
      const permissions = Array.isArray(config.requiresPermission) ? config.requiresPermission : [config.requiresPermission];
      const hasPermission = permissions.some(permission => permissionService.hasPermission(permission));
      if (!hasPermission) {
        throw new Error(`Missing required permission(s): ${permissions.join(' or ')}`);
      }
    }
    const { requiresPermission, ...axiosConfig } = config || {};
    return axiosInstance.delete<T>(url, axiosConfig);
  },
};

import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import { clearAccessToken, getAccessToken, setAccessToken } from './authSession';

interface ApiErrorPayload {
  error?: string | { message?: string };
}

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

const apiBaseUrl = getApiBaseUrl();

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const apiError = error.response?.data?.error;
    if (typeof apiError === 'string' && apiError) {
      return apiError;
    }
    if (typeof apiError?.message === 'string' && apiError.message) {
      return apiError.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

// Create axios instance with security configurations
const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable for CSRF cookies
});

// Clear auth storage
function clearAuth(): void {
  clearAccessToken();
  localStorage.removeItem('auth-storage');
  sessionStorage.clear();
}

// Track if we're currently refreshing to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

// Refresh access token
async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await axios.post(
      `${apiBaseUrl}/auth/refresh`,
      {},
      { timeout: 10000, withCredentials: true }
    );

    const { accessToken } = response.data.data.tokens;
    setAccessToken(accessToken);
    return accessToken;
  } catch {
    return null;
  }
}

// Request interceptor - add auth token and CSRF
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token if available (from meta tag)
    const csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute('content');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Check if this is a refresh token request that failed
      if (originalRequest.url?.includes('/auth/refresh')) {
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Wait for the ongoing refresh to complete
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();

        if (newToken) {
          isRefreshing = false;
          onTokenRefreshed(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }

        // Refresh failed - logout
        isRefreshing = false;
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      } catch (refreshError) {
        isRefreshing = false;
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

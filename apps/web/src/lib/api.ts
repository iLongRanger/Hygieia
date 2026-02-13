import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

const apiBaseUrl = getApiBaseUrl();

// Create axios instance with security configurations
const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable for CSRF cookies
});

// Get tokens from storage
function getTokens(): { token: string | null; refreshToken: string | null } {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return { token: null, refreshToken: null };
    const parsed = JSON.parse(stored);
    return {
      token: parsed?.state?.token || null,
      refreshToken: parsed?.state?.refreshToken || null,
    };
  } catch {
    return { token: null, refreshToken: null };
  }
}

// Update tokens in storage
function setTokens(accessToken: string, refreshToken: string): void {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.state.token = accessToken;
      parsed.state.refreshToken = refreshToken;
      localStorage.setItem('auth-storage', JSON.stringify(parsed));
    }
  } catch {
    // Ignore storage errors
  }
}

// Clear auth storage
function clearAuth(): void {
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
  const { refreshToken } = getTokens();
  if (!refreshToken) return null;

  try {
    const response = await axios.post(
      `${apiBaseUrl}/auth/refresh`,
      { refreshToken },
      { timeout: 10000 }
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
    setTokens(accessToken, newRefreshToken);
    return accessToken;
  } catch {
    return null;
  }
}

// Request interceptor - add auth token and CSRF
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { token } = getTokens();
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

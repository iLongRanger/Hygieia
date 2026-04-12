import { create } from 'zustand';
import api from '../lib/api';
import { canUserAnyPermission, hasUserPermission } from '../lib/permissions';
import { clearAccessToken, setAccessToken } from '../lib/authSession';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions?: Record<string, boolean>;
  teamId?: string | null;
}

interface TwoFactorChallenge {
  challengeId: string;
  maskedEmail: string;
  expiresInSeconds: number;
}

function isTwoFactorChallenge(value: unknown): value is TwoFactorChallenge {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const challenge = value as Partial<TwoFactorChallenge>;
  return (
    typeof challenge.challengeId === 'string' &&
    challenge.challengeId.length > 0 &&
    typeof challenge.maskedEmail === 'string' &&
    typeof challenge.expiresInSeconds === 'number'
  );
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  authInitialized: boolean;
  login: (email: string, password: string) => Promise<TwoFactorChallenge>;
  verifyLoginCode: (challengeId: string, code: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setTokens: (accessToken: string, refreshToken?: string | null) => void;
  initializeAuth: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  clearAuth: () => void;
}

function normalizeUser(user: User): User {
  const permissions =
    user.permissions && typeof user.permissions === 'object'
      ? user.permissions
      : undefined;

  return {
    ...user,
    permissions,
  };
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  authInitialized: false,
  login: async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const response = await api.post('/auth/login', { email: normalizedEmail, password });
    const payload = response.data?.data;
    const challenge = payload?.verification ?? payload;

    if (!isTwoFactorChallenge(challenge)) {
      throw new Error('Email verification challenge was not returned by the server');
    }

    return challenge;
  },
  verifyLoginCode: async (challengeId, code) => {
    const response = await api.post('/auth/login/verify', { challengeId, code });
    const { user, tokens } = response.data.data;
    setAccessToken(tokens.accessToken);
    set({
      user: normalizeUser(user),
      token: tokens.accessToken,
      refreshToken: null,
      isAuthenticated: true,
      authInitialized: true,
    });
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout failures and clear client state regardless.
    } finally {
      clearAccessToken();
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        authInitialized: true,
      });
      localStorage.removeItem('auth-storage');
      sessionStorage.clear();
    }
  },
  setUser: (user) => set({ user: normalizeUser(user) }),
  setToken: (token) => {
    setAccessToken(token);
    set({ token, isAuthenticated: !!token });
  },
  setTokens: (accessToken, refreshToken = null) => {
    setAccessToken(accessToken);
    set({ token: accessToken, refreshToken, isAuthenticated: true });
  },
  initializeAuth: async () => {
    if (get().authInitialized) {
      return;
    }

    try {
      const refreshResponse = await api.post('/auth/refresh');
      const accessToken = refreshResponse.data.data.tokens.accessToken as string;
      setAccessToken(accessToken);

      const meResponse = await api.get('/auth/me');
      set({
        user: normalizeUser(meResponse.data.data.user),
        token: accessToken,
        refreshToken: null,
        isAuthenticated: true,
        authInitialized: true,
      });
    } catch {
      clearAccessToken();
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        authInitialized: true,
      });
      localStorage.removeItem('auth-storage');
      sessionStorage.clear();
    }
  },
  hasPermission: (permission) => hasUserPermission(permission, get().user),
  canAny: (permissions) => canUserAnyPermission(permissions, get().user),
  clearAuth: () => {
    clearAccessToken();
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      authInitialized: true,
    });
    localStorage.removeItem('auth-storage');
    sessionStorage.clear();
  },
}));

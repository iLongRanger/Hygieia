import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { user, tokens } = response.data.data;
        set({
          user,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        });
      },
      logout: async () => {
        const refreshToken = get().refreshToken;

        // Clear state immediately
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });

        // Clear all storage
        localStorage.removeItem('auth-storage');
        sessionStorage.clear();

        // Revoke token on server (fire and forget)
        if (refreshToken) {
          api.post('/auth/logout', { refreshToken }).catch(() => {});
        }
      },
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token, isAuthenticated: !!token }),
      setTokens: (accessToken, refreshToken) =>
        set({ token: accessToken, refreshToken, isAuthenticated: true }),
      clearAuth: () => {
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
        localStorage.removeItem('auth-storage');
        sessionStorage.clear();
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

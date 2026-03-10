# Hygieia Mobile App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a cross-platform mobile app (iOS + Android) for field-facing roles — cleaners, subcontractors, managers, and inspectors — with offline-first capability, push notifications, and app store distribution.

**Architecture:** Expo (React Native) app in `apps/mobile/` workspace. Shares `@hygieia/types`, `@hygieia/shared`, `@hygieia/utils` packages. Zustand for state (mirrors web pattern). WatermelonDB for offline-first local storage with background sync. Expo Notifications for push. Same JWT auth flow as web app, token stored in `expo-secure-store`. Role-based navigation: cleaners/subcontractors see field views, managers see approvals + oversight, inspectors see inspection workflows.

**Tech Stack:** Expo SDK 52, React Native, TypeScript, Zustand, WatermelonDB, Expo Router (file-based routing), Expo Notifications, Expo Location, Expo Camera, Expo SecureStore, Nativewind (Tailwind for RN)

---

## Phase 1: Project Scaffold & Auth

### Task 1: Initialize Expo Project in Monorepo

**Files:**
- Create: `apps/mobile/` (Expo project)
- Modify: `pnpm-workspace.yaml` (already covers `apps/*`, no change needed)
- Modify: `turbo.json` (add mobile pipeline tasks)

**Step 1: Create the Expo project**

```bash
cd A:/Projects/Hygieia
npx create-expo-app@latest apps/mobile --template blank-typescript
```

**Step 2: Clean up generated files**

Remove default App.tsx boilerplate. Delete `assets/` placeholder images if present.

**Step 3: Install core dependencies**

```bash
cd apps/mobile
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated
npx expo install expo-secure-store expo-location expo-camera expo-image-picker expo-notifications expo-device expo-file-system
npx expo install zustand axios
npx expo install nativewind tailwindcss react-native-css-interop
npx expo install @expo/vector-icons
```

**Step 4: Add workspace package references to `apps/mobile/package.json`**

```json
{
  "dependencies": {
    "@hygieia/types": "workspace:*",
    "@hygieia/shared": "workspace:*",
    "@hygieia/utils": "workspace:*"
  }
}
```

**Step 5: Configure `app.json`**

```json
{
  "expo": {
    "name": "Hygieia",
    "slug": "hygieia",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "hygieia",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0f172a"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.hygieia.mobile",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Location is used to verify you are at the job site when clocking in/out.",
        "NSLocationAlwaysUsageDescription": "Location is used to track your position during active jobs.",
        "NSCameraUsageDescription": "Camera is used to take photos for job notes and inspection reports."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0f172a"
      },
      "package": "com.hygieia.mobile",
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-location",
        { "locationAlwaysAndWhenInUsePermission": "Location is used to verify job site presence." }
      ],
      [
        "expo-camera",
        { "cameraPermission": "Camera is used for job photos and inspections." }
      ],
      [
        "expo-notifications",
        { "icon": "./assets/notification-icon.png", "color": "#0f172a" }
      ]
    ]
  }
}
```

**Step 6: Configure Expo Router**

Create `apps/mobile/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**Step 7: Add turbo pipeline for mobile**

In `turbo.json`, the existing `dev` and `build` tasks already apply to all `apps/*`. No changes needed — Expo uses its own build system (`npx expo start`, `eas build`).

**Step 8: Verify it runs**

```bash
cd apps/mobile
npx expo start
```

Expected: Expo dev server starts, QR code appears, app loads blank screen on phone/emulator.

**Step 9: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): initialize Expo project in monorepo"
```

---

### Task 2: Configure Nativewind (Tailwind CSS for React Native)

**Files:**
- Create: `apps/mobile/tailwind.config.js`
- Create: `apps/mobile/global.css`
- Modify: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/metro.config.js`
- Create: `apps/mobile/nativewind-env.d.ts`

**Step 1: Create `apps/mobile/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
};
```

**Step 2: Create `apps/mobile/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 3: Create `apps/mobile/metro.config.js`**

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
```

**Step 4: Create `apps/mobile/nativewind-env.d.ts`**

```ts
/// <reference types="nativewind/types" />
```

**Step 5: Import global.css in root layout**

Update `apps/mobile/app/_layout.tsx`:

```tsx
import '../global.css';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**Step 6: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): configure Nativewind for Tailwind styling"
```

---

### Task 3: API Client & Auth Store

**Files:**
- Create: `apps/mobile/src/lib/api.ts`
- Create: `apps/mobile/src/stores/authStore.ts`
- Create: `apps/mobile/src/lib/secureStorage.ts`

**Step 1: Create secure storage wrapper — `apps/mobile/src/lib/secureStorage.ts`**

```ts
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'hygieia_access_token',
  REFRESH_TOKEN: 'hygieia_refresh_token',
  USER: 'hygieia_user',
} as const;

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken);
  await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken);
}

export async function getStoredUser(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.USER);
}

export async function setStoredUser(user: object): Promise<void> {
  await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
}

export async function clearAll(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.USER);
}
```

**Step 2: Create API client — `apps/mobile/src/lib/api.ts`**

Mirrors `apps/web/src/lib/api.ts` but uses SecureStore instead of localStorage.

```ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearAll,
} from './secureStorage';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3101/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 10000 }
    );
    const { accessToken, refreshToken: newRefresh } = response.data.data.tokens;
    await setTokens(accessToken, newRefresh);
    return accessToken;
  } catch {
    return null;
  }
}

// Request interceptor — attach JWT
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 with refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh')) {
        await clearAll();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token: string) => {
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
        isRefreshing = false;
        await clearAll();
        return Promise.reject(error);
      } catch (refreshError) {
        isRefreshing = false;
        await clearAll();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

**Step 3: Create auth store — `apps/mobile/src/stores/authStore.ts`**

```ts
import { create } from 'zustand';
import api from '../lib/api';
import {
  setTokens,
  setStoredUser,
  getAccessToken,
  getStoredUser,
  clearAll,
} from '../lib/secureStorage';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions?: Record<string, boolean>;
  teamId?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const response = await api.post('/auth/login', {
      email: normalizedEmail,
      password,
    });
    const { user, tokens } = response.data.data;
    await setTokens(tokens.accessToken, tokens.refreshToken);
    await setStoredUser(user);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    set({ user: null, isAuthenticated: false });
    await clearAll();
    api.post('/auth/logout', {}).catch(() => {});
  },

  restore: async () => {
    try {
      const token = await getAccessToken();
      const userJson = await getStoredUser();
      if (token && userJson) {
        const user = JSON.parse(userJson);
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  hasPermission: (permission: string) => {
    const user = get().user;
    if (!user) return false;
    if (user.role === 'owner') return true;
    return user.permissions?.[permission] === true;
  },
}));
```

**Step 4: Commit**

```bash
git add apps/mobile/src/
git commit -m "feat(mobile): add API client and auth store with SecureStore"
```

---

### Task 4: Login Screen

**Files:**
- Create: `apps/mobile/app/login.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Step 1: Create login screen — `apps/mobile/app/login.tsx`**

```tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-900"
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-3xl font-bold text-white text-center mb-2">
          Hygieia
        </Text>
        <Text className="text-slate-400 text-center mb-10">
          Field Operations
        </Text>

        {error ? (
          <View className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
            <Text className="text-red-400 text-center">{error}</Text>
          </View>
        ) : null}

        <TextInput
          className="bg-slate-800 text-white rounded-lg px-4 py-3.5 mb-3 text-base"
          placeholder="Email"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextInput
          className="bg-slate-800 text-white rounded-lg px-4 py-3.5 mb-6 text-base"
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity
          className={`rounded-lg py-3.5 ${loading ? 'bg-primary-400' : 'bg-primary-600'}`}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold text-base">
              Sign In
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
```

**Step 2: Update root layout with auth gate — `apps/mobile/app/_layout.tsx`**

```tsx
import '../global.css';
import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, restore } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    restore();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && !inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthGate>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthGate>
  );
}
```

**Step 3: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): add login screen with auth gate routing"
```

---

### Task 5: Tab Navigation (Role-Based)

**Files:**
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/index.tsx` (Dashboard/Today)
- Create: `apps/mobile/app/(tabs)/jobs.tsx`
- Create: `apps/mobile/app/(tabs)/time.tsx`
- Create: `apps/mobile/app/(tabs)/more.tsx`

**Step 1: Create tab layout — `apps/mobile/app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabLayout() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'cleaner';
  const isManager = role === 'owner' || role === 'admin' || role === 'manager';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: '#1e293b' },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="today-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="time"
        options={{
          title: 'Time',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="menu-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

**Step 2: Create placeholder screens**

`apps/mobile/app/(tabs)/index.tsx` (Today dashboard):
```tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';

export default function TodayScreen() {
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="px-4 pt-4">
        <Text className="text-2xl font-bold text-white">
          Hey, {user?.fullName?.split(' ')[0]}
        </Text>
        <Text className="text-slate-400 mt-1">Here's your day</Text>
      </View>
    </SafeAreaView>
  );
}
```

`apps/mobile/app/(tabs)/jobs.tsx`:
```tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JobsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="px-4 pt-4">
        <Text className="text-2xl font-bold text-white">Jobs</Text>
      </View>
    </SafeAreaView>
  );
}
```

`apps/mobile/app/(tabs)/time.tsx`:
```tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TimeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="px-4 pt-4">
        <Text className="text-2xl font-bold text-white">Time Tracking</Text>
      </View>
    </SafeAreaView>
  );
}
```

`apps/mobile/app/(tabs)/more.tsx`:
```tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';

export default function MoreScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="px-4 pt-4">
        <Text className="text-2xl font-bold text-white">More</Text>
        <View className="mt-6 bg-slate-800 rounded-lg p-4">
          <Text className="text-white font-medium">{user?.fullName}</Text>
          <Text className="text-slate-400 text-sm">{user?.email}</Text>
          <Text className="text-slate-500 text-xs mt-1 capitalize">{user?.role}</Text>
        </View>
        <TouchableOpacity
          className="mt-4 bg-red-600/20 border border-red-600 rounded-lg py-3"
          onPress={logout}
        >
          <Text className="text-red-400 text-center font-medium">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

**Step 3: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): add role-based tab navigation with placeholder screens"
```

---

## Phase 2: Jobs System

### Task 6: Jobs List Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/jobs.tsx`
- Create: `apps/mobile/src/hooks/useJobs.ts`

**Step 1: Create jobs hook — `apps/mobile/src/hooks/useJobs.ts`**

```ts
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export interface Job {
  id: string;
  jobNumber: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'canceled' | 'missed';
  jobType: string;
  scheduledDate: string;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  estimatedHours: number | null;
  notes: string | null;
  facility: { id: string; name: string } | null;
  account: { id: string; name: string } | null;
  contract: { id: string; contractNumber: string } | null;
  assignedTo: { id: string; fullName: string } | null;
}

interface UseJobsOptions {
  status?: string;
  date?: string;
}

export function useJobs(options: UseJobsOptions = {}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = { limit: '50' };
      if (options.status) params.status = options.status;
      if (options.date) params.scheduledDate = options.date;
      const response = await api.get('/jobs', { params });
      setJobs(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [options.status, options.date]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, loading, error, refetch: fetchJobs };
}
```

**Step 2: Build the jobs list screen — `apps/mobile/app/(tabs)/jobs.tsx`**

```tsx
import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJobs, Job } from '../../src/hooks/useJobs';

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-green-500/20 text-green-400',
  canceled: 'bg-slate-500/20 text-slate-400',
  missed: 'bg-red-500/20 text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  canceled: 'Canceled',
  missed: 'Missed',
};

function JobCard({ job }: { job: Job }) {
  return (
    <TouchableOpacity
      className="bg-slate-800 rounded-lg p-4 mb-3"
      onPress={() => router.push(`/jobs/${job.id}`)}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-white font-semibold">{job.jobNumber}</Text>
        <View className={`px-2 py-1 rounded ${STATUS_COLORS[job.status]?.split(' ')[0] || 'bg-slate-700'}`}>
          <Text className={`text-xs font-medium ${STATUS_COLORS[job.status]?.split(' ')[1] || 'text-slate-300'}`}>
            {STATUS_LABELS[job.status] || job.status}
          </Text>
        </View>
      </View>
      {job.facility && (
        <Text className="text-slate-300 text-sm">{job.facility.name}</Text>
      )}
      {job.scheduledStartTime && (
        <View className="flex-row items-center mt-2">
          <Ionicons name="time-outline" size={14} color="#94a3b8" />
          <Text className="text-slate-400 text-xs ml-1">
            {new Date(job.scheduledStartTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function JobsScreen() {
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const { jobs, loading, refetch } = useJobs({ status: filter });

  const filters = [
    { label: 'All', value: undefined },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="px-4 pt-4">
        <Text className="text-2xl font-bold text-white">Jobs</Text>
        <View className="flex-row mt-3 mb-4 gap-2">
          {filters.map((f) => (
            <TouchableOpacity
              key={f.label}
              className={`px-3 py-1.5 rounded-full ${
                filter === f.value ? 'bg-primary-600' : 'bg-slate-800'
              }`}
              onPress={() => setFilter(f.value)}
            >
              <Text
                className={`text-sm ${
                  filter === f.value ? 'text-white' : 'text-slate-400'
                }`}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobCard job={item} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          !loading ? (
            <View className="items-center mt-20">
              <Ionicons name="briefcase-outline" size={48} color="#475569" />
              <Text className="text-slate-500 mt-3">No jobs found</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
```

**Step 3: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): add jobs list screen with status filters"
```

---

### Task 7: Job Detail & Start/Complete Actions

**Files:**
- Create: `apps/mobile/app/jobs/[id].tsx`
- Create: `apps/mobile/src/lib/geolocation.ts`

**Step 1: Create geolocation wrapper — `apps/mobile/src/lib/geolocation.ts`**

Mirrors `apps/web/src/lib/geolocation.ts` interface but uses `expo-location`.

```ts
import * as Location from 'expo-location';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export async function requestGeolocation(): Promise<GeoPosition> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied. Please enable location access in Settings.');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? 0,
  };
}
```

**Step 2: Create job detail screen — `apps/mobile/app/jobs/[id].tsx`**

```tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { requestGeolocation } from '../../src/lib/geolocation';

interface JobDetail {
  id: string;
  jobNumber: string;
  status: string;
  jobType: string;
  scheduledDate: string;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  notes: string | null;
  completionNotes: string | null;
  facility: { id: string; name: string; address?: any } | null;
  account: { id: string; name: string } | null;
  contract: { id: string; contractNumber: string } | null;
  assignedTo: { id: string; fullName: string } | null;
  tasks: Array<{
    id: string;
    taskName: string;
    status: string;
    completedAt: string | null;
  }>;
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/jobs/${id}`);
      setJob(response.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  const handleStartJob = async () => {
    try {
      setActionLoading(true);
      const geo = await requestGeolocation();
      await api.post(`/jobs/${id}/start`, { geoLocation: geo });
      await fetchJob();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to start job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJob = async () => {
    Alert.prompt
      ? Alert.prompt('Complete Job', 'Add completion notes (optional)', async (notes) => {
          try {
            setActionLoading(true);
            const geo = await requestGeolocation();
            await api.post(`/jobs/${id}/complete`, {
              geoLocation: geo,
              completionNotes: notes || undefined,
            });
            await fetchJob();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to complete job');
          } finally {
            setActionLoading(false);
          }
        })
      : (async () => {
          try {
            setActionLoading(true);
            const geo = await requestGeolocation();
            await api.post(`/jobs/${id}/complete`, { geoLocation: geo });
            await fetchJob();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to complete job');
          } finally {
            setActionLoading(false);
          }
        })();
  };

  if (loading || !job) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold ml-3">
          {job.jobNumber}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Status */}
        <View className="bg-slate-800 rounded-lg p-4 mb-3">
          <Text className="text-slate-400 text-xs uppercase mb-1">Status</Text>
          <Text className="text-white font-medium capitalize">
            {job.status.replace('_', ' ')}
          </Text>
        </View>

        {/* Facility */}
        {job.facility && (
          <View className="bg-slate-800 rounded-lg p-4 mb-3">
            <Text className="text-slate-400 text-xs uppercase mb-1">Facility</Text>
            <Text className="text-white font-medium">{job.facility.name}</Text>
            {job.account && (
              <Text className="text-slate-400 text-sm mt-1">{job.account.name}</Text>
            )}
          </View>
        )}

        {/* Schedule */}
        <View className="bg-slate-800 rounded-lg p-4 mb-3">
          <Text className="text-slate-400 text-xs uppercase mb-1">Schedule</Text>
          <Text className="text-white">
            {new Date(job.scheduledDate).toLocaleDateString()}
          </Text>
          {job.scheduledStartTime && (
            <Text className="text-slate-400 text-sm mt-1">
              {new Date(job.scheduledStartTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {job.scheduledEndTime &&
                ` — ${new Date(job.scheduledEndTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`}
            </Text>
          )}
          {job.estimatedHours && (
            <Text className="text-slate-500 text-xs mt-1">
              Est. {job.estimatedHours}h
            </Text>
          )}
        </View>

        {/* Tasks */}
        {job.tasks && job.tasks.length > 0 && (
          <View className="bg-slate-800 rounded-lg p-4 mb-3">
            <Text className="text-slate-400 text-xs uppercase mb-2">Tasks</Text>
            {job.tasks.map((task) => (
              <View key={task.id} className="flex-row items-center py-2 border-b border-slate-700 last:border-b-0">
                <Ionicons
                  name={task.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={task.status === 'completed' ? '#22c55e' : '#64748b'}
                />
                <Text className="text-white ml-2 flex-1">{task.taskName}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {job.notes && (
          <View className="bg-slate-800 rounded-lg p-4 mb-3">
            <Text className="text-slate-400 text-xs uppercase mb-1">Notes</Text>
            <Text className="text-white">{job.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View className="px-4 pb-4">
        {job.status === 'scheduled' && (
          <TouchableOpacity
            className="bg-green-600 rounded-lg py-4"
            onPress={handleStartJob}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-base">
                Start Job
              </Text>
            )}
          </TouchableOpacity>
        )}
        {job.status === 'in_progress' && (
          <TouchableOpacity
            className="bg-primary-600 rounded-lg py-4"
            onPress={handleCompleteJob}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-base">
                Complete Job
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
```

**Step 3: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): add job detail screen with start/complete actions and geolocation"
```

---

## Phase 3: Time Tracking

### Task 8: Time Tracking Screen — Clock In/Out

**Files:**
- Modify: `apps/mobile/app/(tabs)/time.tsx`
- Create: `apps/mobile/src/hooks/useTimeTracking.ts`

**Step 1: Create time tracking hook — `apps/mobile/src/hooks/useTimeTracking.ts`**

```ts
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export interface TimeEntry {
  id: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  totalHours: number | null;
  status: 'active' | 'completed';
  notes: string | null;
  job: { id: string; jobNumber: string } | null;
  facility: { id: string; name: string } | null;
}

export function useTimeTracking() {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/time-tracking', {
        params: { limit: 20, date: new Date().toISOString().split('T')[0] },
      });
      const entries: TimeEntry[] = response.data.data;
      setTodayEntries(entries);
      setActiveEntry(entries.find((e) => e.status === 'active') || null);
    } catch {
      // silent fail, will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { activeEntry, todayEntries, loading, refetch: fetch };
}
```

**Step 2: Build the time tracking screen — `apps/mobile/app/(tabs)/time.tsx`**

```tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { requestGeolocation } from '../../src/lib/geolocation';
import { useTimeTracking, TimeEntry } from '../../src/hooks/useTimeTracking';

function ActiveTimer({ entry, onStop }: { entry: TimeEntry; onStop: () => void }) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const start = new Date(entry.clockIn).getTime();
    const interval = setInterval(() => {
      const diff = Date.now() - start;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [entry.clockIn]);

  return (
    <View className="bg-green-900/30 border border-green-700 rounded-lg p-5 mb-4">
      <Text className="text-green-400 text-xs uppercase font-medium mb-1">
        Clocked In
      </Text>
      <Text className="text-white text-4xl font-bold text-center my-3">
        {elapsed}
      </Text>
      {entry.facility && (
        <Text className="text-slate-400 text-center text-sm mb-3">
          {entry.facility.name}
        </Text>
      )}
      <TouchableOpacity
        className="bg-red-600 rounded-lg py-3 mt-2"
        onPress={onStop}
      >
        <Text className="text-white text-center font-semibold">Clock Out</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TimeScreen() {
  const { activeEntry, todayEntries, loading, refetch } = useTimeTracking();
  const [actionLoading, setActionLoading] = useState(false);

  const handleClockIn = async () => {
    try {
      setActionLoading(true);
      const geo = await requestGeolocation();
      await api.post('/time-tracking/clock-in', { geoLocation: geo });
      await refetch();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to clock in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setActionLoading(true);
      const geo = await requestGeolocation();
      await api.post('/time-tracking/clock-out', { geoLocation: geo });
      await refetch();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to clock out');
    } finally {
      setActionLoading(false);
    }
  };

  const completedToday = todayEntries.filter((e) => e.status === 'completed');
  const totalHours = completedToday.reduce((sum, e) => sum + (e.totalHours || 0), 0);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="px-4 pt-4">
        <Text className="text-2xl font-bold text-white">Time Tracking</Text>
        <Text className="text-slate-400 text-sm mt-1">
          Today — {totalHours.toFixed(1)}h logged
        </Text>
      </View>

      <View className="px-4 mt-4">
        {activeEntry ? (
          <ActiveTimer entry={activeEntry} onStop={handleClockOut} />
        ) : (
          <TouchableOpacity
            className="bg-green-600 rounded-lg py-5 mb-4"
            onPress={handleClockIn}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="items-center">
                <Ionicons name="play-circle-outline" size={32} color="white" />
                <Text className="text-white text-center font-semibold text-lg mt-1">
                  Clock In
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View className="px-4 mt-2">
        <Text className="text-slate-400 text-sm font-medium mb-2">Today's Entries</Text>
      </View>
      <FlatList
        data={completedToday}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-slate-800 rounded-lg p-3 mb-2 mx-4">
            <View className="flex-row justify-between">
              <Text className="text-white text-sm">
                {new Date(item.clockIn).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {item.clockOut &&
                  ` — ${new Date(item.clockOut).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`}
              </Text>
              <Text className="text-slate-400 text-sm">
                {item.totalHours?.toFixed(1)}h
              </Text>
            </View>
            {item.facility && (
              <Text className="text-slate-500 text-xs mt-1">{item.facility.name}</Text>
            )}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          !loading ? (
            <Text className="text-slate-500 text-center mt-4">No entries today</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
```

**Step 3: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): add time tracking screen with live timer and clock in/out"
```

---

## Phase 4: Today Dashboard

### Task 9: Today Screen — Daily Overview

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

**Step 1: Build the Today dashboard — `apps/mobile/app/(tabs)/index.tsx`**

This screen combines: active time entry, today's jobs summary, upcoming appointments.

```tsx
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import api from '../../src/lib/api';

interface TodaySummary {
  activeTimeEntry: any | null;
  jobs: any[];
  appointments: any[];
}

export default function TodayScreen() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<TodaySummary>({
    activeTimeEntry: null,
    jobs: [],
    appointments: [],
  });
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [jobsRes, timeRes, apptRes] = await Promise.all([
        api.get('/jobs', { params: { scheduledDate: today, limit: 20 } }),
        api.get('/time-tracking', { params: { date: today, limit: 5 } }),
        api.get('/appointments', { params: { startDate: today, endDate: today, limit: 10 } }).catch(() => ({ data: { data: [] } })),
      ]);

      const timeEntries = timeRes.data.data || [];

      setData({
        jobs: jobsRes.data.data || [],
        activeTimeEntry: timeEntries.find((e: any) => e.status === 'active') || null,
        appointments: apptRes.data.data || [],
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const scheduledJobs = data.jobs.filter((j) => j.status === 'scheduled').length;
  const inProgressJobs = data.jobs.filter((j) => j.status === 'in_progress').length;
  const completedJobs = data.jobs.filter((j) => j.status === 'completed').length;

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#3b82f6" />
        }
      >
        <View className="px-4 pt-4 pb-6">
          <Text className="text-2xl font-bold text-white">
            Hey, {user?.fullName?.split(' ')[0]}
          </Text>
          <Text className="text-slate-400 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>

          {/* Active Clock-In Banner */}
          {data.activeTimeEntry && (
            <TouchableOpacity
              className="bg-green-900/30 border border-green-700 rounded-lg p-4 mt-4"
              onPress={() => router.push('/(tabs)/time')}
            >
              <View className="flex-row items-center">
                <View className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                <Text className="text-green-400 font-medium">Clocked In</Text>
              </View>
              <Text className="text-slate-400 text-sm mt-1">
                Since{' '}
                {new Date(data.activeTimeEntry.clockIn).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
          )}

          {/* Jobs Summary */}
          <View className="mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-semibold text-lg">Today's Jobs</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
                <Text className="text-primary-500 text-sm">See All</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 items-center">
                <Text className="text-blue-400 text-2xl font-bold">{scheduledJobs}</Text>
                <Text className="text-blue-400 text-xs mt-1">Scheduled</Text>
              </View>
              <View className="flex-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 items-center">
                <Text className="text-yellow-400 text-2xl font-bold">{inProgressJobs}</Text>
                <Text className="text-yellow-400 text-xs mt-1">In Progress</Text>
              </View>
              <View className="flex-1 bg-green-500/10 border border-green-500/30 rounded-lg p-3 items-center">
                <Text className="text-green-400 text-2xl font-bold">{completedJobs}</Text>
                <Text className="text-green-400 text-xs mt-1">Done</Text>
              </View>
            </View>
          </View>

          {/* Upcoming Jobs List */}
          {data.jobs
            .filter((j) => j.status === 'scheduled' || j.status === 'in_progress')
            .slice(0, 5)
            .map((job) => (
              <TouchableOpacity
                key={job.id}
                className="bg-slate-800 rounded-lg p-3 mt-2"
                onPress={() => router.push(`/jobs/${job.id}`)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white font-medium">{job.facility?.name || job.jobNumber}</Text>
                    {job.scheduledStartTime && (
                      <Text className="text-slate-400 text-sm mt-0.5">
                        {new Date(job.scheduledStartTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#64748b" />
                </View>
              </TouchableOpacity>
            ))}

          {/* Appointments */}
          {data.appointments.length > 0 && (
            <View className="mt-6">
              <Text className="text-white font-semibold text-lg mb-3">Appointments</Text>
              {data.appointments.map((appt: any) => (
                <View key={appt.id} className="bg-slate-800 rounded-lg p-3 mb-2">
                  <Text className="text-white font-medium capitalize">
                    {appt.type?.replace('_', ' ')}
                  </Text>
                  <Text className="text-slate-400 text-sm mt-0.5">
                    {new Date(appt.scheduledStart).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {appt.location && ` — ${appt.location}`}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): build Today dashboard with jobs summary and active time entry"
```

---

## Phase 5: Inspections

### Task 10: Inspections List & Workflow

**Files:**
- Create: `apps/mobile/app/inspections/index.tsx`
- Create: `apps/mobile/app/inspections/[id].tsx`
- Create: `apps/mobile/src/hooks/useInspections.ts`

**Step 1: Create inspections hook — `apps/mobile/src/hooks/useInspections.ts`**

```ts
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export interface Inspection {
  id: string;
  inspectionNumber: string;
  status: string;
  scheduledDate: string;
  completedAt: string | null;
  overallScore: number | null;
  facility: { id: string; name: string } | null;
  inspector: { id: string; fullName: string } | null;
}

export interface InspectionDetail extends Inspection {
  notes: string | null;
  summary: string | null;
  items: Array<{
    id: string;
    areaName: string;
    itemName: string;
    score: number | null;
    status: string;
    notes: string | null;
    photoUrl: string | null;
  }>;
  correctiveActions: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    dueDate: string | null;
  }>;
}

export function useInspections() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/inspections', { params: { limit: 30 } });
      setInspections(response.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { inspections, loading, refetch: fetch };
}

export async function getInspectionById(id: string): Promise<InspectionDetail> {
  const response = await api.get(`/inspections/${id}`);
  return response.data.data;
}
```

**Step 2: Create inspections list — `apps/mobile/app/inspections/index.tsx`**

```tsx
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInspections } from '../../src/hooks/useInspections';

export default function InspectionsScreen() {
  const { inspections, loading, refetch } = useInspections();

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-3">Inspections</Text>
      </View>
      <FlatList
        data={inspections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-slate-800 rounded-lg p-4 mb-2 mx-4"
            onPress={() => router.push(`/inspections/${item.id}`)}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-white font-medium">{item.inspectionNumber}</Text>
              <Text className="text-slate-400 text-xs capitalize">{item.status}</Text>
            </View>
            {item.facility && (
              <Text className="text-slate-400 text-sm mt-1">{item.facility.name}</Text>
            )}
            <Text className="text-slate-500 text-xs mt-1">
              {new Date(item.scheduledDate).toLocaleDateString()}
            </Text>
            {item.overallScore != null && (
              <Text className="text-primary-400 text-sm mt-1">
                Score: {item.overallScore}%
              </Text>
            )}
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          !loading ? (
            <View className="items-center mt-20">
              <Ionicons name="clipboard-outline" size={48} color="#475569" />
              <Text className="text-slate-500 mt-3">No inspections</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
```

**Step 3: Create inspection detail with scoring — `apps/mobile/app/inspections/[id].tsx`**

```tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { InspectionDetail, getInspectionById } from '../../src/hooks/useInspections';

export default function InspectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetch = async () => {
    try {
      setLoading(true);
      const data = await getInspectionById(id!);
      setInspection(data);
    } catch {
      Alert.alert('Error', 'Failed to load inspection');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [id]);

  const handleUpdateItem = async (itemId: string, score: number, status: string) => {
    try {
      await api.patch(`/inspections/${id}/items/${itemId}`, { score, status });
      await fetch();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update');
    }
  };

  const handleComplete = async () => {
    try {
      setActionLoading(true);
      await api.post(`/inspections/${id}/complete`);
      await fetch();
      Alert.alert('Success', 'Inspection completed');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to complete');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !inspection) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold ml-3">
          {inspection.inspectionNumber}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="bg-slate-800 rounded-lg p-4 mb-3">
          <Text className="text-slate-400 text-xs uppercase mb-1">Status</Text>
          <Text className="text-white capitalize">{inspection.status}</Text>
          {inspection.overallScore != null && (
            <Text className="text-primary-400 mt-1">Score: {inspection.overallScore}%</Text>
          )}
        </View>

        {inspection.facility && (
          <View className="bg-slate-800 rounded-lg p-4 mb-3">
            <Text className="text-slate-400 text-xs uppercase mb-1">Facility</Text>
            <Text className="text-white">{inspection.facility.name}</Text>
          </View>
        )}

        {/* Inspection Items */}
        <Text className="text-white font-semibold text-lg mb-2 mt-2">Items</Text>
        {inspection.items.map((item) => (
          <View key={item.id} className="bg-slate-800 rounded-lg p-4 mb-2">
            <Text className="text-white font-medium">{item.itemName}</Text>
            {item.areaName && (
              <Text className="text-slate-400 text-xs mt-0.5">{item.areaName}</Text>
            )}
            {inspection.status !== 'completed' ? (
              <View className="flex-row gap-2 mt-3">
                <TouchableOpacity
                  className={`flex-1 py-2 rounded ${item.status === 'pass' ? 'bg-green-600' : 'bg-slate-700'}`}
                  onPress={() => handleUpdateItem(item.id, 100, 'pass')}
                >
                  <Text className="text-white text-center text-sm">Pass</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-2 rounded ${item.status === 'fail' ? 'bg-red-600' : 'bg-slate-700'}`}
                  onPress={() => handleUpdateItem(item.id, 0, 'fail')}
                >
                  <Text className="text-white text-center text-sm">Fail</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="mt-2">
                <Text
                  className={`text-sm ${item.status === 'pass' ? 'text-green-400' : 'text-red-400'}`}
                >
                  {item.status === 'pass' ? 'Passed' : 'Failed'}
                  {item.score != null && ` (${item.score}%)`}
                </Text>
              </View>
            )}
          </View>
        ))}

        {/* Corrective Actions */}
        {inspection.correctiveActions.length > 0 && (
          <>
            <Text className="text-white font-semibold text-lg mb-2 mt-4">
              Corrective Actions
            </Text>
            {inspection.correctiveActions.map((ca) => (
              <View key={ca.id} className="bg-slate-800 rounded-lg p-3 mb-2">
                <Text className="text-white">{ca.title}</Text>
                <Text className="text-slate-400 text-xs mt-1 capitalize">
                  {ca.severity} — {ca.status}
                </Text>
              </View>
            ))}
          </>
        )}

        <View className="h-20" />
      </ScrollView>

      {inspection.status !== 'completed' && (
        <View className="px-4 pb-4">
          <TouchableOpacity
            className="bg-primary-600 rounded-lg py-4"
            onPress={handleComplete}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-base">
                Complete Inspection
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
```

**Step 4: Add inspections link to More screen — `apps/mobile/app/(tabs)/more.tsx`**

Add a navigation link above the sign out button:

```tsx
<TouchableOpacity
  className="bg-slate-800 rounded-lg p-4 mt-3 flex-row items-center justify-between"
  onPress={() => router.push('/inspections')}
>
  <View className="flex-row items-center">
    <Ionicons name="clipboard-outline" size={20} color="#94a3b8" />
    <Text className="text-white ml-3">Inspections</Text>
  </View>
  <Ionicons name="chevron-forward" size={18} color="#64748b" />
</TouchableOpacity>
```

**Step 5: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): add inspections list and pass/fail scoring workflow"
```

---

## Phase 6: Expenses

### Task 11: Expense Submission

**Files:**
- Create: `apps/mobile/app/expenses/index.tsx`
- Create: `apps/mobile/app/expenses/new.tsx`
- Create: `apps/mobile/src/hooks/useExpenses.ts`

**Step 1: Create expenses hook — `apps/mobile/src/hooks/useExpenses.ts`**

```ts
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export interface Expense {
  id: string;
  date: string;
  amount: number;
  description: string;
  vendor: string | null;
  receiptUrl: string | null;
  status: string;
  category: { id: string; name: string } | null;
  job: { id: string; jobNumber: string } | null;
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/expenses', { params: { limit: 30 } });
      setExpenses(response.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { expenses, loading, refetch: fetch };
}
```

**Step 2: Create expenses list — `apps/mobile/app/expenses/index.tsx`**

```tsx
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExpenses } from '../../src/hooks/useExpenses';

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400',
  approved: 'text-green-400',
  rejected: 'text-red-400',
};

export default function ExpensesScreen() {
  const { expenses, loading, refetch } = useExpenses();

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold ml-3">Expenses</Text>
        </View>
        <TouchableOpacity
          className="bg-primary-600 rounded-full w-10 h-10 items-center justify-center"
          onPress={() => router.push('/expenses/new')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-slate-800 rounded-lg p-4 mb-2 mx-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-white font-medium">{item.description}</Text>
              <Text className="text-white font-semibold">
                ${Number(item.amount).toFixed(2)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-slate-400 text-xs">
                {new Date(item.date).toLocaleDateString()}
                {item.vendor && ` — ${item.vendor}`}
              </Text>
              <Text className={`text-xs capitalize ${STATUS_COLORS[item.status] || 'text-slate-400'}`}>
                {item.status}
              </Text>
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          !loading ? (
            <View className="items-center mt-20">
              <Ionicons name="receipt-outline" size={48} color="#475569" />
              <Text className="text-slate-500 mt-3">No expenses</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
```

**Step 3: Create expense submission form — `apps/mobile/app/expenses/new.tsx`**

```tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/lib/api';

export default function NewExpenseScreen() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/expenses/categories').then((res) => {
      setCategories(res.data.data || []);
    }).catch(() => {});
  }, []);

  const pickReceipt = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!description || !amount || !categoryId) {
      Alert.alert('Error', 'Description, amount, and category are required');
      return;
    }

    try {
      setLoading(true);

      const formData: Record<string, any> = {
        description,
        amount: parseFloat(amount),
        categoryId,
        date: new Date().toISOString().split('T')[0],
      };
      if (vendor) formData.vendor = vendor;

      // TODO: If receiptUri, upload to file storage first, then attach URL
      await api.post('/expenses', formData);
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold ml-3">New Expense</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <Text className="text-slate-400 text-sm mb-1 mt-4">Description *</Text>
        <TextInput
          className="bg-slate-800 text-white rounded-lg px-4 py-3 mb-3"
          placeholder="What was this expense for?"
          placeholderTextColor="#64748b"
          value={description}
          onChangeText={setDescription}
        />

        <Text className="text-slate-400 text-sm mb-1">Amount *</Text>
        <TextInput
          className="bg-slate-800 text-white rounded-lg px-4 py-3 mb-3"
          placeholder="0.00"
          placeholderTextColor="#64748b"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Text className="text-slate-400 text-sm mb-1">Vendor</Text>
        <TextInput
          className="bg-slate-800 text-white rounded-lg px-4 py-3 mb-3"
          placeholder="Where was the purchase made?"
          placeholderTextColor="#64748b"
          value={vendor}
          onChangeText={setVendor}
        />

        <Text className="text-slate-400 text-sm mb-1">Category *</Text>
        <View className="flex-row flex-wrap gap-2 mb-3">
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              className={`px-3 py-2 rounded-lg ${
                categoryId === cat.id ? 'bg-primary-600' : 'bg-slate-800'
              }`}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text className={categoryId === cat.id ? 'text-white' : 'text-slate-400'}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          className="bg-slate-800 rounded-lg p-4 mb-3 flex-row items-center"
          onPress={pickReceipt}
        >
          <Ionicons
            name={receiptUri ? 'checkmark-circle' : 'camera-outline'}
            size={24}
            color={receiptUri ? '#22c55e' : '#94a3b8'}
          />
          <Text className="text-slate-300 ml-3">
            {receiptUri ? 'Receipt captured' : 'Take receipt photo'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View className="px-4 pb-4">
        <TouchableOpacity
          className="bg-primary-600 rounded-lg py-4"
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold text-base">
              Submit Expense
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

**Step 4: Add expenses link to More screen**

In `apps/mobile/app/(tabs)/more.tsx`, add a navigation link:

```tsx
<TouchableOpacity
  className="bg-slate-800 rounded-lg p-4 mt-3 flex-row items-center justify-between"
  onPress={() => router.push('/expenses')}
>
  <View className="flex-row items-center">
    <Ionicons name="receipt-outline" size={20} color="#94a3b8" />
    <Text className="text-white ml-3">Expenses</Text>
  </View>
  <Ionicons name="chevron-forward" size={18} color="#64748b" />
</TouchableOpacity>
```

**Step 5: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): add expense list and submission with receipt photo capture"
```

---

## Phase 7: Manager Features

### Task 12: Manager Approvals Screen

**Files:**
- Create: `apps/mobile/app/approvals/index.tsx`

**Step 1: Create approvals screen — `apps/mobile/app/approvals/index.tsx`**

This screen shows pending timesheets and expenses that managers can approve/reject.

```tsx
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';

interface PendingTimesheet {
  id: string;
  user: { fullName: string };
  period: string;
  totalHours: number;
  status: string;
}

interface PendingExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  createdBy: { fullName: string };
  status: string;
}

export default function ApprovalsScreen() {
  const [timesheets, setTimesheets] = useState<PendingTimesheet[]>([]);
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tsRes, expRes] = await Promise.all([
        api.get('/time-tracking/timesheets', { params: { status: 'submitted', limit: 20 } }).catch(() => ({ data: { data: [] } })),
        api.get('/expenses', { params: { status: 'pending', limit: 20 } }).catch(() => ({ data: { data: [] } })),
      ]);
      setTimesheets(tsRes.data.data || []);
      setExpenses(expRes.data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const approveTimesheet = async (id: string) => {
    try {
      await api.post(`/time-tracking/timesheets/${id}/approve`);
      await fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to approve');
    }
  };

  const approveExpense = async (id: string) => {
    try {
      await api.post(`/expenses/${id}/approve`);
      await fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to approve');
    }
  };

  const totalPending = timesheets.length + expenses.length;

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-3">
          Approvals ({totalPending})
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#3b82f6" />
        }
      >
        {/* Timesheets */}
        {timesheets.length > 0 && (
          <>
            <Text className="text-white font-semibold text-lg mb-2">Timesheets</Text>
            {timesheets.map((ts) => (
              <View key={ts.id} className="bg-slate-800 rounded-lg p-4 mb-2">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-white font-medium">{ts.user?.fullName}</Text>
                    <Text className="text-slate-400 text-sm">{ts.period}</Text>
                    <Text className="text-slate-500 text-xs mt-0.5">
                      {ts.totalHours?.toFixed(1)}h total
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="bg-green-600 rounded-lg px-4 py-2"
                    onPress={() => approveTimesheet(ts.id)}
                  >
                    <Text className="text-white font-medium text-sm">Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Expenses */}
        {expenses.length > 0 && (
          <>
            <Text className="text-white font-semibold text-lg mb-2 mt-4">Expenses</Text>
            {expenses.map((exp) => (
              <View key={exp.id} className="bg-slate-800 rounded-lg p-4 mb-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-white font-medium">{exp.description}</Text>
                    <Text className="text-slate-400 text-sm">
                      {exp.createdBy?.fullName} — ${Number(exp.amount).toFixed(2)}
                    </Text>
                    <Text className="text-slate-500 text-xs mt-0.5">
                      {new Date(exp.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="bg-green-600 rounded-lg px-4 py-2"
                    onPress={() => approveExpense(exp.id)}
                  >
                    <Text className="text-white font-medium text-sm">Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {totalPending === 0 && !loading && (
          <View className="items-center mt-20">
            <Ionicons name="checkmark-circle-outline" size={48} color="#22c55e" />
            <Text className="text-slate-400 mt-3">All caught up!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

**Step 2: Add approvals link to More screen (manager-only)**

In `apps/mobile/app/(tabs)/more.tsx`, add a conditional link:

```tsx
const isManager = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'manager';

// Render before inspections link:
{isManager && (
  <TouchableOpacity
    className="bg-slate-800 rounded-lg p-4 mt-3 flex-row items-center justify-between"
    onPress={() => router.push('/approvals')}
  >
    <View className="flex-row items-center">
      <Ionicons name="checkmark-done-outline" size={20} color="#94a3b8" />
      <Text className="text-white ml-3">Approvals</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#64748b" />
  </TouchableOpacity>
)}
```

**Step 3: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): add manager approvals screen for timesheets and expenses"
```

---

## Phase 8: Push Notifications

### Task 13: Push Notification Registration

**Files:**
- Create: `apps/mobile/src/lib/notifications.ts`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/api/src/routes/auth.ts` (add push token registration endpoint)

**Step 1: Create notification service — `apps/mobile/src/lib/notifications.ts`**

```ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const pushToken = tokenData.data;

  // Register token with backend
  try {
    await api.post('/auth/push-token', { token: pushToken, platform: Platform.OS });
  } catch {
    // non-critical, will retry next app open
  }

  return pushToken;
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
```

**Step 2: Register on app launch — update `apps/mobile/app/_layout.tsx`**

Add to the `AuthGate` component, inside `useEffect` after `restore()`:

```tsx
import { registerForPushNotifications, addNotificationResponseListener } from '../src/lib/notifications';
import { router } from 'expo-router';

// Inside AuthGate, after restore:
useEffect(() => {
  if (!isAuthenticated) return;

  registerForPushNotifications();

  const subscription = addNotificationResponseListener((response) => {
    const data = response.notification.request.content.data;
    if (data?.screen === 'job' && data?.id) {
      router.push(`/jobs/${data.id}`);
    } else if (data?.screen === 'inspection' && data?.id) {
      router.push(`/inspections/${data.id}`);
    }
  });

  return () => subscription.remove();
}, [isAuthenticated]);
```

**Step 3: Add push token endpoint to API**

In `apps/api/src/routes/auth.ts`, add:

```ts
router.post(
  '/push-token',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, platform } = req.body;
      if (!token) throw new ValidationError('Token is required');

      await prisma.pushToken.upsert({
        where: {
          userId_token: { userId: req.user!.id, token },
        },
        create: {
          userId: req.user!.id,
          token,
          platform: platform || 'unknown',
        },
        update: {
          updatedAt: new Date(),
        },
      });

      res.json({ data: { success: true } });
    } catch (error) {
      next(error);
    }
  }
);
```

**Step 4: Add PushToken model to Prisma schema**

In `packages/database/prisma/schema.prisma`, add:

```prisma
model PushToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String
  platform  String   @default("unknown")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([userId, token])
  @@map("push_tokens")
}
```

Add `pushTokens PushToken[]` relation to the `User` model.

**Step 5: Run migration**

```bash
cd packages/database
npx prisma db push
```

**Step 6: Commit**

```bash
git add apps/mobile/ apps/api/src/routes/auth.ts packages/database/prisma/schema.prisma
git commit -m "feat(mobile): add push notification registration with Expo and backend token storage"
```

---

## Phase 9: Offline Support

### Task 14: Offline Queue for Critical Actions

**Files:**
- Create: `apps/mobile/src/lib/offlineQueue.ts`
- Create: `apps/mobile/src/lib/networkStatus.ts`

**Step 1: Create network status hook — `apps/mobile/src/lib/networkStatus.ts`**

```ts
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  return isOnline;
}
```

Install dependency:
```bash
cd apps/mobile
npx expo install @react-native-community/netinfo
```

**Step 2: Create offline queue — `apps/mobile/src/lib/offlineQueue.ts`**

Queues API calls when offline and replays them when connectivity returns.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import api from './api';

interface QueuedRequest {
  id: string;
  method: 'post' | 'patch' | 'put' | 'delete';
  url: string;
  data?: any;
  createdAt: string;
}

const QUEUE_KEY = 'hygieia_offline_queue';

async function getQueue(): Promise<QueuedRequest[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveQueue(queue: QueuedRequest[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueue(
  method: QueuedRequest['method'],
  url: string,
  data?: any
): Promise<void> {
  const queue = await getQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    method,
    url,
    data,
    createdAt: new Date().toISOString(),
  });
  await saveQueue(queue);
}

export async function processQueue(): Promise<{ processed: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  const state = await NetInfo.fetch();
  if (!state.isConnected) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;
  const remaining: QueuedRequest[] = [];

  for (const req of queue) {
    try {
      await api({ method: req.method, url: req.url, data: req.data });
      processed++;
    } catch {
      // Keep failed items unless they're older than 24h
      const age = Date.now() - new Date(req.createdAt).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        remaining.push(req);
      }
      failed++;
    }
  }

  await saveQueue(remaining);
  return { processed, failed };
}

export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
```

Install dependency:
```bash
cd apps/mobile
npx expo install @react-native-async-storage/async-storage
```

**Step 3: Auto-process queue on connectivity restore**

In `apps/mobile/app/_layout.tsx`, add to `AuthGate`:

```tsx
import NetInfo from '@react-native-community/netinfo';
import { processQueue } from '../src/lib/offlineQueue';

// Inside AuthGate:
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      const result = await processQueue();
      if (result.processed > 0) {
        console.log(`Synced ${result.processed} offline actions`);
      }
    }
  });
  return unsubscribe;
}, []);
```

**Step 4: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): add offline queue with automatic sync on connectivity restore"
```

---

## Phase 10: More Screen & Contracts

### Task 15: Complete More Screen with All Navigation Links

**Files:**
- Modify: `apps/mobile/app/(tabs)/more.tsx`
- Create: `apps/mobile/app/contracts/index.tsx`

**Step 1: Create contracts list — `apps/mobile/app/contracts/index.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';

interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  status: string;
  facility: { id: string; name: string } | null;
  account: { id: string; name: string } | null;
  startDate: string;
  endDate: string | null;
  monthlyValue: number | null;
}

export default function ContractsScreen() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      setLoading(true);
      const response = await api.get('/contracts', { params: { limit: 30 } });
      setContracts(response.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-3">Contracts</Text>
      </View>
      <FlatList
        data={contracts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-slate-800 rounded-lg p-4 mb-2 mx-4">
            <Text className="text-white font-medium">{item.contractNumber}</Text>
            <Text className="text-slate-300 text-sm mt-0.5">{item.title}</Text>
            {item.facility && (
              <Text className="text-slate-400 text-xs mt-1">{item.facility.name}</Text>
            )}
            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-slate-500 text-xs capitalize">{item.status}</Text>
              {item.monthlyValue && (
                <Text className="text-primary-400 text-sm">
                  ${Number(item.monthlyValue).toFixed(0)}/mo
                </Text>
              )}
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetch} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          !loading ? (
            <View className="items-center mt-20">
              <Ionicons name="document-text-outline" size={48} color="#475569" />
              <Text className="text-slate-500 mt-3">No contracts</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
```

**Step 2: Finalize More screen — `apps/mobile/app/(tabs)/more.tsx`**

```tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuLink {
  label: string;
  icon: IconName;
  route: string;
  managerOnly?: boolean;
}

const MENU_LINKS: MenuLink[] = [
  { label: 'Approvals', icon: 'checkmark-done-outline', route: '/approvals', managerOnly: true },
  { label: 'Inspections', icon: 'clipboard-outline', route: '/inspections' },
  { label: 'Contracts', icon: 'document-text-outline', route: '/contracts' },
  { label: 'Expenses', icon: 'receipt-outline', route: '/expenses' },
];

export default function MoreScreen() {
  const { user, logout } = useAuthStore();
  const isManager = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'manager';

  const visibleLinks = MENU_LINKS.filter((link) => !link.managerOnly || isManager);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="px-4 pt-4">
        <Text className="text-2xl font-bold text-white">More</Text>

        {/* User Profile Card */}
        <View className="mt-4 bg-slate-800 rounded-lg p-4">
          <Text className="text-white font-medium text-lg">{user?.fullName}</Text>
          <Text className="text-slate-400 text-sm">{user?.email}</Text>
          <Text className="text-slate-500 text-xs mt-1 capitalize">{user?.role}</Text>
        </View>

        {/* Navigation Links */}
        {visibleLinks.map((link) => (
          <TouchableOpacity
            key={link.route}
            className="bg-slate-800 rounded-lg p-4 mt-3 flex-row items-center justify-between"
            onPress={() => router.push(link.route as any)}
          >
            <View className="flex-row items-center">
              <Ionicons name={link.icon} size={20} color="#94a3b8" />
              <Text className="text-white ml-3">{link.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748b" />
          </TouchableOpacity>
        ))}

        {/* Sign Out */}
        <TouchableOpacity
          className="mt-6 bg-red-600/20 border border-red-600 rounded-lg py-3"
          onPress={logout}
        >
          <Text className="text-red-400 text-center font-medium">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

**Step 3: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): add contracts list and finalize More screen navigation"
```

---

## Phase 11: API CORS & Environment

### Task 16: Configure API for Mobile Client Access

**Files:**
- Modify: `apps/api/src/index.ts` (CORS config)
- Create: `apps/mobile/app.config.ts` (dynamic Expo config for env vars)
- Create: `apps/mobile/.env.example`

**Step 1: Update CORS in API**

In `apps/api/src/index.ts`, find the `cors()` setup and ensure it allows the mobile app's requests:

```ts
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) return callback(null, true);

      const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
```

**Step 2: Create `apps/mobile/app.config.ts`**

```ts
import 'dotenv/config';

export default {
  expo: {
    name: 'Hygieia',
    slug: 'hygieia',
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3101/api/v1',
    },
  },
};
```

**Step 3: Create `apps/mobile/.env.example`**

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3101/api/v1
```

**Step 4: Update API client to use config**

In `apps/mobile/src/lib/api.ts`, ensure the base URL reads from the correct source:

```ts
import Constants from 'expo-constants';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3101/api/v1';
```

**Step 5: Commit**

```bash
git add apps/mobile/ apps/api/src/index.ts
git commit -m "feat(mobile): configure CORS for mobile access and environment variables"
```

---

## Phase 12: EAS Build & App Store Prep

### Task 17: Configure EAS Build

**Files:**
- Create: `apps/mobile/eas.json`

**Step 1: Install EAS CLI and initialize**

```bash
npm install -g eas-cli
cd apps/mobile
eas init
```

**Step 2: Create `apps/mobile/eas.json`**

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "",
        "ascAppId": "",
        "appleTeamId": ""
      },
      "android": {
        "serviceAccountKeyPath": "",
        "track": "internal"
      }
    }
  }
}
```

**Step 3: Build for testing**

```bash
cd apps/mobile
eas build --profile preview --platform all
```

**Step 4: Commit**

```bash
git add apps/mobile/eas.json
git commit -m "feat(mobile): add EAS build configuration for app store distribution"
```

---

## Summary of All Tasks

| # | Task | Phase |
|---|------|-------|
| 1 | Initialize Expo project in monorepo | Scaffold |
| 2 | Configure Nativewind (Tailwind) | Scaffold |
| 3 | API client & auth store with SecureStore | Auth |
| 4 | Login screen with auth gate | Auth |
| 5 | Tab navigation (role-based) | Navigation |
| 6 | Jobs list screen with filters | Jobs |
| 7 | Job detail with start/complete + geolocation | Jobs |
| 8 | Time tracking with live timer | Time |
| 9 | Today dashboard (daily overview) | Dashboard |
| 10 | Inspections list & pass/fail workflow | Inspections |
| 11 | Expense submission with receipt photos | Expenses |
| 12 | Manager approvals screen | Manager |
| 13 | Push notification registration | Notifications |
| 14 | Offline queue with auto-sync | Offline |
| 15 | Contracts list & More screen | Navigation |
| 16 | CORS & environment config | Infrastructure |
| 17 | EAS build config for app stores | Distribution |

## Key API Endpoints Used (Already Exist)

All these endpoints are **already built** in the API — no backend changes needed except Task 13 (push token) and Task 16 (CORS):

- `POST /auth/login` — login
- `POST /auth/refresh` — token refresh
- `GET /jobs` — list jobs (auto-scoped by role)
- `GET /jobs/:id` — job detail
- `POST /jobs/:id/start` — start job with geolocation
- `POST /jobs/:id/complete` — complete job
- `GET /time-tracking` — list time entries
- `POST /time-tracking/clock-in` — clock in
- `POST /time-tracking/clock-out` — clock out
- `GET /appointments` — list appointments
- `GET /inspections` — list inspections
- `GET /inspections/:id` — inspection detail
- `PATCH /inspections/:id/items/:itemId` — update inspection item
- `POST /inspections/:id/complete` — complete inspection
- `GET /expenses` — list expenses
- `POST /expenses` — create expense
- `GET /contracts` — list contracts
- `GET /time-tracking/timesheets` — list timesheets
- `POST /time-tracking/timesheets/:id/approve` — approve timesheet
- `POST /expenses/:id/approve` — approve expense

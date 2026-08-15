import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { getTokens, saveTokens, clearTokens } from '@/lib/token-storage';
import type { TokenPair } from '@/types';

const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

// Android emulator uses 10.0.2.2 to reach host localhost
const DEV_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

const BASE_URL = ENV_BASE_URL || (__DEV__ ? DEV_BASE_URL : 'http://167.86.98.204:4050');
export const API_BASE_URL = BASE_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Called when token refresh fails — wired up by AuthProvider
let onAuthFailure: (() => void) | null = null;
export function setAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler;
}

// Endpoints that should never carry an Authorization header
const PUBLIC_PATHS = [
  '/auth/google/token',
  '/auth/facebook/token',
];

// ─── Request Interceptor ─────────────────────────────────
apiClient.interceptors.request.use(async (config) => {
  const isPublic = PUBLIC_PATHS.some((p) => config.url?.includes(p));
  if (isPublic) return config;

  const tokens = await getTokens();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

// ─── Token Refresh (shared by HTTP interceptor and WebSocket) ───
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, newToken: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(newToken!);
  });
  refreshQueue = [];
}

// Exported so the WebSocket layer can also trigger a silent refresh
export async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const tokens = await getTokens();
    if (!tokens?.refreshToken) throw new Error('No refresh token');

    const { data } = await axios.post<TokenPair>(
      `${BASE_URL}/auth/refresh`,
      null,
      {
        headers: {
          Authorization: `Bearer ${tokens.refreshToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    await saveTokens(data);
    processQueue(null, data.accessToken);
    return data.accessToken;
  } catch (error) {
    processQueue(error, null);
    await clearTokens();
    onAuthFailure?.();
    throw error;
  } finally {
    isRefreshing = false;
  }
}

// ─── Response Interceptor (silent token refresh on 401) ─────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh on 401 and not already retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't refresh for auth endpoints themselves
    const isAuthEndpoint = PUBLIC_PATHS.some((p) =>
      originalRequest.url?.includes(p),
    );
    if (isAuthEndpoint) return Promise.reject(error);

    originalRequest._retry = true;

    try {
      const newToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

// Helper to extract a human-readable error message from Axios errors
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message[0] : data.message;
    }
    if (error.code === 'ECONNABORTED') return 'Request timed out';
    if (!error.response) return 'Network error — check your connection';
    return `Request failed (${error.response.status})`;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export function resolveApiUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

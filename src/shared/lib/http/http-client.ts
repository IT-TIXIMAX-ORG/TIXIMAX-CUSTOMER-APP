import axios, { type InternalAxiosRequestConfig } from 'axios';

import { clearAuthAndRedirectToLogin } from '@/src/shared/lib/auth/auth-session';
import {
  persistAuthTokens,
  readStoredRefreshToken,
  readStoredToken,
} from '@/src/shared/lib/auth/auth-storage';
import { ENV_CONFIG } from '@/src/shared/constants/env.constants';
import { notify } from '@/src/shared/lib/notify/notify';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retryAuth?: boolean;
}

interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'];

const createJsonClient = () =>
  axios.create({
    baseURL: ENV_CONFIG.apiBaseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 300000,
  });

const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return {};
};

const readString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
};

const extractTokenPair = (rawData: unknown): AuthTokenPair => {
  const data = toRecord(rawData);
  const result = toRecord(data.result ?? data.data);
  const source = Object.keys(result).length ? result : data;
  const accessToken = readString(
    source.accessToken ?? source.access_token ?? source.jwt ?? source.token,
  );
  const refreshToken = readString(source.refreshToken ?? source.refresh_token);

  if (!accessToken || !refreshToken) {
    throw new Error('Invalid auth token response');
  }

  return { accessToken, refreshToken };
};

const isAuthRequest = (url?: string) => {
  const normalizedUrl = String(url || '');
  return AUTH_ENDPOINTS.some((endpoint) => normalizedUrl.includes(endpoint));
};

export const authHttpClient = createJsonClient();
export const httpClient = createJsonClient();

let refreshPromise: Promise<AuthTokenPair> | null = null;
let isSessionExpiredNotified = false;

export const resetAuthSessionExpiredNotice = () => {
  isSessionExpiredNotified = false;
};

const requestTokenRefresh = async (): Promise<AuthTokenPair> => {
  const refreshToken = readStoredRefreshToken();
  if (!refreshToken) throw new Error('Missing refresh token');

  const response = await authHttpClient.post('/auth/refresh', { refreshToken });
  const tokenPair = extractTokenPair(response.data);
  persistAuthTokens(tokenPair);
  return tokenPair;
};

httpClient.interceptors.request.use((config) => {
  const token = readStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config as RetryableRequestConfig | undefined;
    const status = error?.response?.status;

    if (
      ![401, 403].includes(status) ||
      !originalRequest ||
      originalRequest._retryAuth ||
      isAuthRequest(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retryAuth = true;

    try {
      if (!refreshPromise) {
        refreshPromise = requestTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const tokenPair = await refreshPromise;
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${tokenPair.accessToken}`;
      return httpClient(originalRequest);
    } catch (refreshError) {
      if (!isSessionExpiredNotified) {
        isSessionExpiredNotified = true;
        notify.error({
          key: 'auth-session-expired',
          message: 'Phiên đăng nhập đã hết hạn',
          description: 'Vui lòng đăng nhập lại để tiếp tục thao tác.',
        });
        clearAuthAndRedirectToLogin();
      }

      return Promise.reject(refreshError);
    }
  },
);

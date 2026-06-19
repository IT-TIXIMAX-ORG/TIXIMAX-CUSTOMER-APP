// Auth Store - adapted from web for React Native.

import { create } from 'zustand';
import {
  clearAuthTokens,
  hydrateAuthTokens,
  persistAuthTokens,
  persistUserData,
  readStoredRefreshToken,
  readStoredToken,
  readStoredUserData,
} from '@/src/shared/lib/auth/auth-storage';
import {
  authHttpClient,
  registerSessionExpiredHandler,
  resetAuthSessionExpiredNotice,
} from '@/src/shared/lib/http/http-client';
import { queryClient } from '@/src/shared/lib/query/query-client';
import { getCustomerProfile } from '@/src/features/customer-portal/shared/services/customer-portal.service';
import type { CustomerProfile } from '@/src/features/customer-portal/shared/types/customer-portal.types';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  customerCode?: string;
  avatarUrl?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isHydrated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
  hydrate: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return {};
};

const readString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
};

const extractAuthSource = (rawData: unknown) => {
  const data = toRecord(rawData);
  const result = toRecord(data.result ?? data.data);
  return Object.keys(result).length ? result : data;
};

const extractUser = (rawData: unknown): User => {
  const source = extractAuthSource(rawData);
  const account = toRecord(source.account);
  const customer = toRecord(source.customer);
  const userSource = Object.keys(account).length ? account : source;

  return {
    id: readString(userSource.accountId ?? userSource.id ?? customer.accountId),
    email: readString(userSource.email ?? customer.email),
    name: readString(userSource.name ?? userSource.fullName ?? customer.name),
    role: readString(userSource.role ?? userSource.accountRole),
    customerCode: readString(customer.customerCode ?? customer.code ?? userSource.customerCode ?? userSource.code) || undefined,
    avatarUrl: readString(userSource.avatarUrl ?? userSource.avatar ?? customer.avatarUrl ?? customer.avatar) || undefined,
  };
};

const profileToUser = (profile: CustomerProfile): User => ({
  id: profile.accountId,
  email: profile.email,
  name: profile.name,
  role: 'CUSTOMER',
  customerCode: profile.customerCode || undefined,
  avatarUrl: profile.avatarUrl,
});

const extractTokens = (rawData: unknown) => {
  const source = extractAuthSource(rawData);
  const accessToken = readString(
    source.accessToken ?? source.access_token ?? source.jwt ?? source.token,
  );
  const refreshToken = readString(source.refreshToken ?? source.refresh_token);

  if (!accessToken || !refreshToken) {
    throw new Error('Invalid auth token response');
  }

  return { accessToken, refreshToken, source };
};

const persistSession = async (rawData: unknown) => {
  const { accessToken, refreshToken, source } = extractTokens(rawData);
  const user = extractUser(source);

  persistAuthTokens({ accessToken, refreshToken });
  await persistUserData(user);

  return user;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isHydrated: false,
  user: null,
  isLoading: false,

  hydrate: async () => {
    try {
      const { accessToken } = await hydrateAuthTokens();
      const userData = await readStoredUserData();
      const user = userData ? extractUser(userData) : null;

      set({
        isAuthenticated: Boolean(accessToken),
        isHydrated: true,
        user,
      });
      if (accessToken) {
        resetAuthSessionExpiredNotice();
      }
    } catch {
      set({ isAuthenticated: false, isHydrated: true, user: null });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await authHttpClient.post('/auth/login-email', { email, password });
      const user = await persistSession(response.data);
      resetAuthSessionExpiredNotice();
      // Xóa cache React Query của phiên trước để account mới không đọc nhầm data cũ.
      queryClient.clear();
      set({ isAuthenticated: true, user });
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithGoogle: async ({ accessToken, refreshToken }) => {
    set({ isLoading: true });
    try {
      persistAuthTokens({ accessToken, refreshToken });
      const profile = await getCustomerProfile();
      const user = profileToUser(profile);
      await persistUserData(user);
      resetAuthSessionExpiredNotice();
      // Xóa cache React Query của phiên trước để account mới không đọc nhầm data cũ.
      queryClient.clear();
      set({ isAuthenticated: true, user });
    } catch (error) {
      clearAuthTokens();
      set({ isAuthenticated: false, user: null });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const token = readStoredToken();
    const refreshToken = readStoredRefreshToken();

    clearAuthTokens();
    // Xóa cache React Query để không rò data của tài khoản vừa logout.
    queryClient.clear();
    set({ isAuthenticated: false, user: null });

    if (refreshToken) {
      void authHttpClient.post('/auth/logout', { refreshToken }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }).catch(() => {
        // Ignore logout API errors; local session cleanup is authoritative on mobile.
      });
    }
  },

  // Reset phiên đăng nhập cục bộ (không gọi API logout).
  // Dùng khi phiên hết hạn được phát hiện từ interceptor HTTP.
  clearSession: () => {
    clearAuthTokens();
    // Xóa cache React Query khi phiên hết hạn để phiên kế tiếp bắt đầu sạch.
    queryClient.clear();
    set({ isAuthenticated: false, user: null });
  },

  setUser: (user: User | null) => set({ user }),
}));

// Khi interceptor phát hiện phiên hết hạn (refresh thất bại), reset state store
// để route guard nhận biết người dùng đã đăng xuất.
registerSessionExpiredHandler(() => {
  useAuthStore.getState().clearSession();
});

// Auth Storage Adapter for React Native
// Uses SecureStore for persisted session data and in-memory cache for sync interceptors.

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'tiximax_access_token';
const REFRESH_TOKEN_KEY = 'tiximax_refresh_token';
const USER_KEY = 'tiximax_user_data';

let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;
let cachedUserData: unknown = null;

const isWeb = Platform.OS === 'web';

const webStorage = () => {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }
  return globalThis.localStorage;
};

const setPersistentItem = async (key: string, value: string): Promise<void> => {
  if (isWeb) {
    webStorage()?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
};

const getPersistentItem = async (key: string): Promise<string | null> => {
  if (isWeb) {
    return webStorage()?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
};

const deletePersistentItem = async (key: string): Promise<void> => {
  if (isWeb) {
    webStorage()?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
};

export const readStoredToken = (): string | null => cachedAccessToken;

export const readStoredRefreshToken = (): string | null => cachedRefreshToken;

export const persistAuthTokens = (tokens: {
  accessToken: string;
  refreshToken: string;
}): void => {
  cachedAccessToken = tokens.accessToken;
  cachedRefreshToken = tokens.refreshToken;

  void setPersistentItem(TOKEN_KEY, tokens.accessToken);
  void setPersistentItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

export const clearAuthTokens = (): void => {
  cachedAccessToken = null;
  cachedRefreshToken = null;
  cachedUserData = null;

  void deletePersistentItem(TOKEN_KEY);
  void deletePersistentItem(REFRESH_TOKEN_KEY);
  void deletePersistentItem(USER_KEY);
};

export const persistUserData = async (data: unknown): Promise<void> => {
  cachedUserData = data;
  await setPersistentItem(USER_KEY, JSON.stringify(data));
};

export const readStoredUserData = async (): Promise<unknown> => {
  if (cachedUserData) {
    return cachedUserData;
  }

  const raw = await getPersistentItem(USER_KEY);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    cachedUserData = data;
    return data;
  } catch {
    return null;
  }
};

export const hydrateAuthTokens = async (): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> => {
  const [accessToken, refreshToken, userData] = await Promise.all([
    getPersistentItem(TOKEN_KEY),
    getPersistentItem(REFRESH_TOKEN_KEY),
    readStoredUserData(),
  ]);

  cachedAccessToken = accessToken;
  cachedRefreshToken = refreshToken;
  cachedUserData = userData;

  return { accessToken, refreshToken };
};

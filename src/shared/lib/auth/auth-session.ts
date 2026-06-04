// Auth Session utilities for React Native
// Replaces web redirect with expo-router navigation

import { clearAuthTokens } from './auth-storage';
import { router } from 'expo-router';

export const clearAuthAndRedirectToLogin = (): void => {
  clearAuthTokens();

  // Use setTimeout to avoid navigation during render
  setTimeout(() => {
    try {
      router.replace('/(auth)/login');
    } catch {
      // Fallback: router might not be ready
      console.warn('[Auth] Could not navigate to login screen');
    }
  }, 0);
};

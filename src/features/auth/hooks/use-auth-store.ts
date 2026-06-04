// Auth hooks - convenience selectors for auth store

import { useMemo } from 'react';

import { useAuthStore } from '../stores/auth.store';

export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthHydrated = () => useAuthStore((state) => state.isHydrated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthActions = () => {
  const login = useAuthStore((state) => state.login);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const logout = useAuthStore((state) => state.logout);
  const hydrate = useAuthStore((state) => state.hydrate);
  const setUser = useAuthStore((state) => state.setUser);

  return useMemo(
    () => ({ login, loginWithGoogle, logout, hydrate, setUser }),
    [hydrate, login, loginWithGoogle, logout, setUser],
  );
};

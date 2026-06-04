// Auth group layout
import { Redirect, Stack } from 'expo-router';
import { useIsAuthenticated, useIsAuthHydrated } from '@/src/features/auth/hooks/use-auth-store';

export default function AuthLayout() {
  const isAuthenticated = useIsAuthenticated();
  const isHydrated = useIsAuthHydrated();

  // If already logged in, redirect to main tabs
  if (isHydrated && isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}

// Root Layout - App entry point with providers.

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_800ExtraBold,
  Geist_900Black,
  useFonts,
} from '@expo-google-fonts/geist';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { paperTheme } from '@/src/theme/paper-theme';
import { useAuthStore } from '@/src/features/auth/stores/auth.store';
import { colors, typography, fontFamilyForWeight } from '@/src/theme/tokens';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

let isDefaultFontConfigured = false;

const configureDefaultFont = () => {
  if (isDefaultFontConfigured) return;

  const defaultTextStyle = { fontFamily: typography.fontFamily.regular };
  const defaultText = Text as typeof Text & { defaultProps?: { style?: unknown } };
  const defaultTextInput = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };

  defaultText.defaultProps = defaultText.defaultProps ?? {};
  defaultText.defaultProps.style = [defaultTextStyle, defaultText.defaultProps.style].filter(Boolean);

  defaultTextInput.defaultProps = defaultTextInput.defaultProps ?? {};
  defaultTextInput.defaultProps.style = [
    defaultTextStyle,
    defaultTextInput.defaultProps.style,
  ].filter(Boolean);

  isDefaultFontConfigured = true;
};

function AppContent() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="orders/[id]"
          options={{
            headerShown: true,
            title: 'Chi tiết đơn hàng',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: {
              fontWeight: '800',
              fontFamily: fontFamilyForWeight('800'),
              fontSize: 16,
            },
          }}
        />
      </Stack>
      <StatusBar style="dark" />
      <Toast />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Geist_800ExtraBold,
    Geist_900Black,
  });

  if (fontError) {
    throw fontError;
  }

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  configureDefaultFont();

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={paperTheme}>
            <AppContent />
          </PaperProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

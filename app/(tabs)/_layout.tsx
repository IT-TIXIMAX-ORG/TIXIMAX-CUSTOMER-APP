import { Redirect, Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useIsAuthenticated, useIsAuthHydrated } from '@/src/features/auth/hooks/use-auth-store';
import { colors, fontFamilyForWeight } from '@/src/theme/tokens';

type FeatherIconName = ComponentProps<typeof Feather>['name'];

export default function TabLayout() {
  const isAuthenticated = useIsAuthenticated();
  const isHydrated = useIsAuthHydrated();

  if (isHydrated && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          fontFamily: fontFamilyForWeight('800'),
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Đơn hàng',
          tabBarIcon: ({ color }) => <TabIcon name="package" color={color} />,
        }}
      />
      <Tabs.Screen
        name="create-order"
        options={{
          title: 'Tạo đơn',
          tabBarIcon: ({ color }) => <TabIcon name="plus-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Giao dịch',
          tabBarIcon: ({ color }) => <TabIcon name="credit-card" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color }) => <TabIcon name="user" color={color} />,
        }}
      />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}

function TabIcon({ name, color }: { name: FeatherIconName; color: ColorValue }) {
  return <Feather name={name} size={22} color={color} />;
}

// React Native Paper theme configuration
import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { colors, typography } from './tokens';

const fontConfig = {
  displayLarge: { fontFamily: typography.fontFamily.black, fontWeight: '900' as const },
  displayMedium: { fontFamily: typography.fontFamily.black, fontWeight: '900' as const },
  displaySmall: { fontFamily: typography.fontFamily.black, fontWeight: '900' as const },
  headlineLarge: { fontFamily: typography.fontFamily.extrabold, fontWeight: '800' as const },
  headlineMedium: { fontFamily: typography.fontFamily.extrabold, fontWeight: '800' as const },
  headlineSmall: { fontFamily: typography.fontFamily.bold, fontWeight: '700' as const },
  titleLarge: { fontFamily: typography.fontFamily.bold, fontWeight: '700' as const },
  titleMedium: { fontFamily: typography.fontFamily.semibold, fontWeight: '600' as const },
  titleSmall: { fontFamily: typography.fontFamily.semibold, fontWeight: '600' as const },
  bodyLarge: { fontFamily: typography.fontFamily.regular, fontWeight: '400' as const },
  bodyMedium: { fontFamily: typography.fontFamily.regular, fontWeight: '400' as const },
  bodySmall: { fontFamily: typography.fontFamily.regular, fontWeight: '400' as const },
  labelLarge: { fontFamily: typography.fontFamily.bold, fontWeight: '700' as const },
  labelMedium: { fontFamily: typography.fontFamily.semibold, fontWeight: '600' as const },
  labelSmall: { fontFamily: typography.fontFamily.semibold, fontWeight: '600' as const },
};

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryLight,
    secondary: colors.black,
    secondaryContainer: colors.background,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
    onPrimary: colors.black,
    onPrimaryContainer: colors.black,
    onBackground: colors.textPrimary,
    onSurface: colors.textPrimary,
    outline: colors.borderLight,
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: colors.surface,
      level1: colors.surface,
      level2: colors.surface,
    },
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 16,
};

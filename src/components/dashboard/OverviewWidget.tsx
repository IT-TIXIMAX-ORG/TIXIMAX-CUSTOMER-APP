import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { AppCard } from '../ui/AppCard';
import { type ReactNode } from 'react';

interface OverviewWidgetProps {
  title: string;
  value: string | number;
  suffix?: string;
  icon: ReactNode;
  colorScheme?: 'yellow' | 'royalBlue' | 'graphite' | 'emerald';
  style?: StyleProp<ViewStyle>;
}

export function OverviewWidget({ title, value, suffix, icon, colorScheme = 'yellow', style }: OverviewWidgetProps) {
  const getIconColor = () => {
    switch (colorScheme) {
      case 'yellow': return colors.primaryDark;
      case 'royalBlue': return colors.info;
      case 'graphite': return colors.textSecondary;
      case 'emerald': return colors.success;
      default: return colors.primaryDark;
    }
  };

  const getIconBg = () => {
    switch (colorScheme) {
      case 'yellow': return colors.primaryLight;
      case 'royalBlue': return colors.infoLight;
      case 'graphite': return colors.background;
      case 'emerald': return colors.successLight;
      default: return colors.primaryLight;
    }
  };

  return (
    <AppCard style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={[styles.iconWrapper, { backgroundColor: getIconBg() }]}>
          {icon}
        </View>
      </View>
      <View style={styles.valueContainer}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Text>
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    marginRight: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: typography.fontSize.xl,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  suffix: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textMuted,
    marginLeft: spacing.xs,
  }
});

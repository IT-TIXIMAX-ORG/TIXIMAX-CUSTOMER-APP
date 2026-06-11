// Nhóm menu có tiêu đề (vd. "Thiết lập chung") trên màn hình Tài khoản.

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';

type Props = {
  title: string;
  children: ReactNode;
};

export function MenuSection({ title, children }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.header}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  header: {
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
});

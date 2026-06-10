// Row menu trên màn hình Tài khoản. variant="danger" dùng cho hành động nguy hiểm (Đăng xuất):
// chữ + icon màu đỏ, ẩn chevron (là hành động, không phải điều hướng).

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, typography, spacing, fontFamilyForWeight } from '@/src/theme/tokens';

type Props = {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  isLast?: boolean;
  variant?: 'default' | 'danger';
  disabled?: boolean;
};

export function MenuItem({ title, icon, onPress, isLast = false, variant = 'default', disabled = false }: Props) {
  const isDanger = variant === 'danger';

  return (
    <Pressable
      style={[styles.menuItem, !isLast && styles.menuItemBorder, disabled && styles.menuItemDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconBg, isDanger && styles.menuIconBgDanger]}>
          <Feather name={icon} size={18} color={isDanger ? colors.error : colors.textSecondary} />
        </View>
        <Text style={[styles.menuTitle, isDanger && styles.menuTitleDanger]}>{title}</Text>
      </View>
      {!isDanger ? <Feather name="chevron-right" size={20} color={colors.border} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItemDisabled: {
    opacity: 0.65,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuIconBgDanger: {
    backgroundColor: colors.errorLight,
  },
  menuTitle: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textPrimary,
  },
  menuTitleDanger: {
    color: colors.error,
  },
});

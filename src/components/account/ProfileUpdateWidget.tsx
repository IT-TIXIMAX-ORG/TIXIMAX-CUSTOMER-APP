// Widget "Cập nhật thông tin" gọn (≤110px) thay dải tiến trình cũ trên màn hình Tài khoản.
// Cấp độ là dữ liệu backend-authoritative; số mục hoàn thành chỉ là tiến độ thao tác (guidance).

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';

type Props = {
  completedCount: number;
  totalCount: number;
  nextTaskTitle?: string;
  onPress: () => void;
};

export function ProfileUpdateWidget({ completedCount, totalCount, nextTaskTitle, onPress }: Props) {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Cập nhật thông tin, ${completedCount} trên ${totalCount} mục hoàn thành`}
      accessibilityHint="Mở danh sách các mục cần cập nhật"
    >
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Feather name="user-check" size={18} color={colors.primaryDark} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>
            Cập nhật thông tin
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {completedCount}/{totalCount} mục hoàn thành
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.border} />
      </View>
      <View style={styles.track} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.hint} numberOfLines={1}>
        {nextTaskTitle ? `Tiếp theo: ${nextTaskTitle}` : 'Hệ thống sẽ tự cập nhật cấp độ.'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  cardPressed: {
    opacity: 0.85,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  track: {
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textSecondary,
    lineHeight: 14,
    marginTop: spacing.xs,
  },
});

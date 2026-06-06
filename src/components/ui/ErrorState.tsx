import { Feather } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { AppButton } from '@/src/components/ui/AppButton';

interface ErrorStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title?: string;
  description?: string;
  /** Khi có onRetry sẽ hiển thị nút "Thử lại". */
  onRetry?: () => void;
  retryLabel?: string;
  /** true khi đang retry để hiển thị loading trên nút. */
  isRetrying?: boolean;
}

/**
 * Trạng thái lỗi dùng chung cho các màn hình list/detail.
 * KHÁC với EmptyState: dùng khi request thất bại (không phải "không có dữ liệu"),
 * luôn cung cấp hành động thử lại để người dùng không hiểu nhầm là mất dữ liệu.
 */
export function ErrorState({
  icon = 'wifi-off',
  title = 'Không tải được dữ liệu',
  description = 'Đã có lỗi xảy ra hoặc mất kết nối mạng. Vui lòng thử lại.',
  onRetry,
  retryLabel = 'Thử lại',
  isRetrying = false,
}: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.icon}>
        <Feather name={icon} size={32} color={colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {onRetry ? (
        <View style={styles.action}>
          <AppButton
            title={retryLabel}
            variant="outline"
            size="sm"
            onPress={onRetry}
            isLoading={isRetrying}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    marginTop: spacing.lg,
  },
});

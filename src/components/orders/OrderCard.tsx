import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { StatusBadge } from '../ui/StatusBadge';
import { formatCurrency, formatDate } from '@/src/shared/lib/utils';

export type FeatherIconName = ComponentProps<typeof Feather>['name'];

/** Icon đại diện theo loại đơn — dùng cho ảnh placeholder khi đơn chưa có hình sản phẩm. */
export const orderTypeIcon = (orderType?: string | null): FeatherIconName => {
  switch (orderType) {
    case 'DAU_GIA':
      return 'award';
    case 'KY_GUI':
    case 'CONSIGNMENT':
      return 'truck';
    default:
      return 'shopping-bag';
  }
};

export interface OrderCardProps {
  orderCode: string;
  status?: string | null;
  createdAt?: string | null;
  /** Tên sản phẩm; ẩn dòng nếu không có (vd. tab Lịch sử API không trả). */
  productName?: string | null;
  /** URL ảnh sản phẩm đã chuẩn hóa; không có thì hiện icon placeholder. */
  imageUrl?: string | null;
  placeholderIcon?: FeatherIconName;
  orderTypeText: string;
  productCount: number | string;
  amount: number;
  /** Mã vận đơn; ẩn hàng copy nếu không có. */
  trackingCode?: string | null;
  hasUnpaidPayment?: boolean;
  cancelReason?: string | null;
  onPress: () => void;
}

export function OrderCard({
  orderCode,
  status,
  createdAt,
  productName,
  imageUrl,
  placeholderIcon = 'package',
  orderTypeText,
  productCount,
  amount,
  trackingCode,
  hasUnpaidPayment,
  cancelReason,
  onPress,
}: OrderCardProps) {
  const handleCopyTracking = async () => {
    if (!trackingCode) return;
    await Clipboard.setStringAsync(trackingCode);
    Toast.show({ type: 'success', text1: 'Đã sao chép mã vận đơn' });
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={
        hasUnpaidPayment
          ? `Xem chi tiết đơn ${orderCode}, có thanh toán chưa hoàn tất`
          : `Xem chi tiết đơn ${orderCode}`
      }
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.thumb}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumbImage} resizeMode="cover" />
          ) : (
            <Feather name={placeholderIcon} size={26} color={colors.primaryDark} />
          )}
        </View>
        <View style={styles.headerInfo}>
          <StatusBadge status={status} />
          <View style={styles.orderCodeRow}>
            <Text style={styles.orderCode} numberOfLines={1}>
              {orderCode}
            </Text>
            {hasUnpaidPayment ? <View style={styles.unpaidDot} /> : null}
          </View>
          <Text style={styles.date}>{formatDate(createdAt)}</Text>
          {productName ? (
            <Text style={styles.productName} numberOfLines={1}>
              {productName}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Loại đơn</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {orderTypeText}
          </Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Sản phẩm</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {productCount}
          </Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Tổng tiền</Text>
          <Text style={[styles.statValue, styles.statAmount]} numberOfLines={1}>
            {formatCurrency(amount)}
          </Text>
        </View>
      </View>

      {trackingCode ? (
        <Pressable
          style={({ pressed }) => [styles.trackingRow, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Sao chép mã vận đơn ${trackingCode}`}
          onPress={handleCopyTracking}
        >
          <Text style={styles.trackingLabel}>Mã vận đơn</Text>
          <View style={styles.trackingRight}>
            <Text style={styles.trackingCode} numberOfLines={1}>
              {trackingCode}
            </Text>
            <Feather name="copy" size={15} color={colors.primaryDark} />
          </View>
        </Pressable>
      ) : null}

      {cancelReason ? (
        <View style={styles.cancelReason}>
          <Text style={styles.cancelReasonText}>Lý do hủy: {cancelReason}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  orderCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  orderCode: {
    flexShrink: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  unpaidDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error,
  },
  date: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  productName: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.base,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  statCol: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  statValue: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  statAmount: {
    color: colors.primaryDark,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  trackingLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  trackingRight: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trackingCode: {
    flexShrink: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  cancelReason: {
    marginTop: spacing.md,
    backgroundColor: colors.errorLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  cancelReasonText: {
    color: colors.error,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
});

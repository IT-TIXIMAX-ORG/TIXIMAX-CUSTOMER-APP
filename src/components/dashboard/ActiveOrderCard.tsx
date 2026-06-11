import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { StatusBadge } from '../ui/StatusBadge';
import type { CustomerActiveOrder } from '@/src/features/customer-portal/shared/types/customer-portal.types';
import { formatCurrency, formatDate } from '@/src/shared/lib/utils';
import { orderTypeLabel } from '@/src/shared/lib/labels';
import { isPendingPaymentStatus } from '@/src/features/customer-portal/shared/lib/payment-status';

interface ActiveOrderCardProps {
  order: CustomerActiveOrder;
}

const getDisplayDate = (order: CustomerActiveOrder) =>
  order.journey?.orderCreatedAt || order.trackingSummary?.displayTimestamp;

const getTrackingCode = (order: CustomerActiveOrder) => {
  const linkWithTracking = order.orderLinks.find((link) => link.trackingCode || link.shipmentCode);
  return linkWithTracking?.trackingCode || linkWithTracking?.shipmentCode || '';
};

// Status hiển thị ưu tiên status cấp đơn (orderStatus); chỉ dùng tracking summary làm
// fallback khi API không trả orderStatus — để badge & chấm đỏ phản ánh đúng trạng thái đơn.
const getDisplayStatus = (order: CustomerActiveOrder) =>
  order.orderStatus ||
  order.trackingSummary?.displayStatus ||
  order.trackingSummary?.orderMainStatus;

export function ActiveOrderCard({ order }: ActiveOrderCardProps) {
  const router = useRouter();
  const trackingCode = getTrackingCode(order);
  const amount = order.finalPriceOrder ?? order.paymentAfterAuction ?? 0;
  const hasUnpaidPayment = isPendingPaymentStatus(getDisplayStatus(order));

  return (
    <Pressable
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={
        hasUnpaidPayment
          ? `Xem chi tiết đơn ${order.orderCode}, có thanh toán chưa hoàn tất`
          : `Xem chi tiết đơn ${order.orderCode}`
      }
      onPress={() => router.push(`/orders/${order.orderId}`)}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.orderCodeRow}>
            <Text style={styles.orderCode} numberOfLines={1}>{order.orderCode}</Text>
            {hasUnpaidPayment ? <View style={styles.unpaidDot} /> : null}
          </View>
          <Text style={styles.date}>{formatDate(getDisplayDate(order))}</Text>
        </View>
        <StatusBadge status={getDisplayStatus(order)} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Loại đơn</Text>
          <Text style={styles.value}>{orderTypeLabel(order.orderType)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Tổng tiền</Text>
          <Text style={[styles.value, styles.price]}>{formatCurrency(amount)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Sản phẩm</Text>
          <Text style={styles.value}>{order.trackingSummary?.totalLinks ?? order.orderLinks.length}</Text>
        </View>
        {trackingCode ? (
          <View style={styles.trackingContainer}>
            <Text style={styles.trackingLabel}>Mã vận đơn</Text>
            <Text style={styles.trackingCode}>{trackingCode}</Text>
          </View>
        ) : null}
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  orderCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  orderCode: {
    flexShrink: 1,
    fontSize: typography.fontSize.md,
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
  content: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: fontFamilyForWeight('500'),
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  price: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  trackingContainer: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  trackingLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  trackingCode: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
});

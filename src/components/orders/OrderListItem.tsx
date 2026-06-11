import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { StatusBadge } from '../ui/StatusBadge';
import { formatCurrency, formatDate } from '@/src/shared/lib/utils';
import { orderTypeLabel } from '@/src/shared/lib/labels';
import type { CustomerOrder } from '@/src/features/customer-portal/shared/types/customer-portal.types';
import { isPendingPaymentStatus } from '@/src/features/customer-portal/shared/lib/payment-status';

type FeatherIconName = ComponentProps<typeof Feather>['name'];

interface OrderListItemProps {
  order: CustomerOrder;
}

export function OrderListItem({ order }: OrderListItemProps) {
  const router = useRouter();

  const getOrderTypeIcon = (): FeatherIconName => {
    switch (order.orderType) {
      case 'DAU_GIA':
        return 'award';
      case 'KY_GUI':
      case 'CONSIGNMENT':
        return 'truck';
      default:
        return 'shopping-bag';
    }
  };

  const amount = order.finalPriceOrder ?? order.paymentAfterAuction ?? 0;
  const hasUnpaidPayment = isPendingPaymentStatus(order.status);

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
        <View style={styles.iconContainer}>
          <Feather name={getOrderTypeIcon()} size={20} color={colors.primaryDark} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.orderType}>{orderTypeLabel(order.orderType)}</Text>
          <View style={styles.orderCodeRow}>
            <Text style={styles.orderCode} numberOfLines={1}>{order.orderCode}</Text>
            {hasUnpaidPayment ? <View style={styles.unpaidDot} /> : null}
          </View>
        </View>
        <StatusBadge status={order.status} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Ngày tạo</Text>
          <Text style={styles.value}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Tổng tiền</Text>
          <Text style={[styles.value, styles.price]}>{formatCurrency(amount)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Tổng link</Text>
          <Text style={styles.value}>{order.totalLinks ?? 0}</Text>
        </View>
        {order.cancelReason ? (
          <View style={styles.cancelReason}>
            <Text style={styles.cancelReasonText}>Lý do hủy: {order.cancelReason}</Text>
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
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  orderType: {
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.primaryDark,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  orderCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderCode: {
    flexShrink: 1,
    fontSize: typography.fontSize.base,
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
  content: {
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
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
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  cancelReason: {
    marginTop: spacing.sm,
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

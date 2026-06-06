import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { useAuthUser } from '@/src/features/auth/hooks/use-auth-store';
import { useCustomerProfile } from '@/src/features/customer-portal/shared/hooks/use-customer-profile';
import {
  useCustomerActiveOrders,
  useCustomerTransactions,
} from '@/src/features/customer-portal/shared/hooks/use-customer-portal-data';
import { formatCurrency } from '@/src/shared/lib/utils';
import { normalizeLabelKey } from '@/src/shared/lib/labels';
import { StaffCard } from '@/src/components/dashboard/StaffCard';
import { ActiveOrderCard } from '@/src/components/dashboard/ActiveOrderCard';
import { TransactionItem } from '@/src/components/dashboard/TransactionItem';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { useTabScreenBottomPadding } from '@/src/shared/lib/layout/safe-area';

// Các trạng thái đơn cần người dùng hành động (thanh toán) — dùng cho thẻ "Cần chú ý".
const PAYMENT_PENDING_STATUSES = new Set([
  'CHO_THANH_TOAN',
  'CHO_THANH_TOAN_DAU_GIA',
  'CHUA_THANH_TOAN',
  'WAITING_FOR_PAYMENT',
  'CHO_THANH_TOAN_SHIP',
]);

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthUser();
  const contentPaddingBottom = useTabScreenBottomPadding();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: profile, refetch: refetchProfile } = useCustomerProfile();
  const {
    data: activeOrdersData,
    isLoading: isOrdersLoading,
    isError: isOrdersError,
    refetch: refetchActiveOrders,
  } = useCustomerActiveOrders(1, 10);
  const {
    data: transactionsData,
    isLoading: isTransactionsLoading,
    isError: isTransactionsError,
    refetch: refetchTransactions,
  } = useCustomerTransactions(1, 5);

  const activeOrders = activeOrdersData?.content || [];
  const recentTransactions = (transactionsData?.content || []).slice(0, 3);
  const displayName = profile?.name || user?.name || 'Khách hàng';
  const activeOrderCount = profile?.realtimeOrders ?? activeOrders.length;
  const pendingPaymentCount = activeOrders.filter((order) =>
    PAYMENT_PENDING_STATUSES.has(normalizeLabelKey(order.orderStatus)),
  ).length;

  const refreshDashboard = async () => {
    if (Platform.OS === 'web' || isRefreshing) return;

    try {
      setIsRefreshing(true);
      await Promise.allSettled([refetchProfile(), refetchActiveOrders(), refetchTransactions()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeposit = () =>
    Alert.alert('Nạp tiền', 'Vui lòng liên hệ nhân viên phụ trách để được hướng dẫn nạp tiền.');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
      alwaysBounceVertical
      showsVerticalScrollIndicator={false}
      refreshControl={
        Platform.OS !== 'web' ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refreshDashboard()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Xin chào,</Text>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
      </View>

      {/* Số dư ví — thông tin tài chính cốt lõi, đưa lên đầu */}
      <View style={styles.walletCard}>
        <View style={styles.walletInfo}>
          <Text style={styles.walletLabel}>Số dư ví</Text>
          <Text style={styles.walletAmount} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(profile?.balance ?? 0)}
          </Text>
        </View>
        <Pressable
          style={styles.depositBtn}
          onPress={handleDeposit}
          accessibilityRole="button"
          accessibilityLabel="Nạp tiền vào ví"
        >
          <Feather name="plus" size={16} color={colors.black} />
          <Text style={styles.depositText}>Nạp</Text>
        </Pressable>
      </View>

      {/* Cần chú ý — chỉ hiện khi có đơn chờ thanh toán */}
      {pendingPaymentCount > 0 ? (
        <Pressable
          style={styles.attentionCard}
          onPress={() => router.push('/(tabs)/orders')}
          accessibilityRole="button"
          accessibilityLabel={`${pendingPaymentCount} đơn đang chờ thanh toán, xem chi tiết`}
        >
          <Feather name="alert-circle" size={20} color={colors.warning} />
          <Text style={styles.attentionText}>
            {pendingPaymentCount} đơn đang chờ thanh toán
          </Text>
          <Feather name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}

      {/* Đơn đang theo dõi */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleRow}>
            <Feather name="truck" size={18} color={colors.primaryDark} />
            <Text style={styles.panelTitle}>Đơn đang theo dõi</Text>
            {activeOrderCount > 0 ? (
              <View style={styles.countChip}>
                <Text style={styles.countChipText}>{activeOrderCount}</Text>
              </View>
            ) : null}
          </View>
          <Pressable onPress={() => router.push('/(tabs)/orders')} hitSlop={8}>
            <Text style={styles.viewAllLink}>Xem tất cả</Text>
          </Pressable>
        </View>
        <View style={styles.panelContent}>
          {isOrdersLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : isOrdersError && activeOrders.length === 0 ? (
            <ErrorState
              title="Không tải được đơn hàng"
              description="Đã có lỗi hoặc mất kết nối. Vui lòng thử lại."
              onRetry={() => void refetchActiveOrders()}
            />
          ) : activeOrders.length === 0 ? (
            <EmptyState
              icon="package"
              title="Chưa có đơn đang xử lý"
              description="Các đơn đang mua, vận chuyển hoặc chờ thanh toán sẽ hiển thị tại đây."
            />
          ) : (
            activeOrders.slice(0, 3).map((order) => (
              <ActiveOrderCard key={order.orderId} order={order} />
            ))
          )}
        </View>
      </View>

      {/* Hoạt động gần đây */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleRow}>
            <Feather name="activity" size={18} color={colors.primaryDark} />
            <Text style={styles.panelTitle}>Hoạt động gần đây</Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/transactions')} hitSlop={8}>
            <Text style={styles.viewAllLink}>Xem tất cả</Text>
          </Pressable>
        </View>
        <View style={styles.panelContent}>
          {isTransactionsLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : isTransactionsError && recentTransactions.length === 0 ? (
            <ErrorState
              title="Không tải được giao dịch"
              description="Đã có lỗi hoặc mất kết nối. Vui lòng thử lại."
              onRetry={() => void refetchTransactions()}
            />
          ) : recentTransactions.length === 0 ? (
            <EmptyState
              icon="credit-card"
              title="Chưa có giao dịch"
              description="Biến động ví và thanh toán sẽ xuất hiện khi có dữ liệu."
            />
          ) : (
            recentTransactions.map((tx) => (
              <View key={tx.id} style={styles.transactionWrapper}>
                <TransactionItem transaction={tx} />
              </View>
            ))
          )}
        </View>
      </View>

      {/* Nhân viên hỗ trợ (nếu có) */}
      {profile?.dedicatedStaff ? (
        <View style={styles.staffWrap}>
          <StaffCard
            name={profile.dedicatedStaff.name}
            phone={profile.dedicatedStaff.phone ?? undefined}
            avatarUrl={profile.dedicatedStaff.avatarUrl ?? undefined}
          />
        </View>
      ) : null}

      {/* Số liệu trọn đời — gộp gọn 1 dải, de-emphasize */}
      <View style={styles.statsCard}>
        <View style={styles.statCol}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {(profile?.totalWeight ?? 0).toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Tổng cân (kg)</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {profile?.totalOrders ?? 0}
          </Text>
          <Text style={styles.statLabel}>Tổng đơn</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(profile?.totalAmount ?? 0)}
          </Text>
          <Text style={styles.statLabel}>Tổng tiền hàng</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing['4xl'],
    paddingHorizontal: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
    color: colors.textSecondary,
  },
  name: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textPrimary,
    marginTop: 2,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  walletInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  walletLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
    color: colors.textSecondary,
  },
  walletAmount: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textPrimary,
    marginTop: 2,
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  depositText: {
    fontSize: typography.fontSize.base,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.black,
  },
  attentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  attentionText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textPrimary,
  },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  panelTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textPrimary,
  },
  countChip: {
    minWidth: 22,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
  },
  countChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.actionText,
  },
  viewAllLink: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.actionText,
  },
  panelContent: {
    padding: spacing.lg,
  },
  loader: {
    paddingVertical: spacing['2xl'],
  },
  transactionWrapper: {
    marginBottom: spacing.md,
  },
  staffWrap: {
    marginBottom: spacing.lg,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
    backgroundColor: colors.borderLight,
  },
});

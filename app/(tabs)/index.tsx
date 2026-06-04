import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
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
import { OverviewWidget } from '@/src/components/dashboard/OverviewWidget';
import { StaffCard } from '@/src/components/dashboard/StaffCard';
import { ActiveOrderCard } from '@/src/components/dashboard/ActiveOrderCard';
import { TransactionItem } from '@/src/components/dashboard/TransactionItem';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { useTabScreenBottomPadding } from '@/src/shared/lib/layout/safe-area';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthUser();
  const contentPaddingBottom = useTabScreenBottomPadding();

  const { data: profile } = useCustomerProfile();
  const { data: activeOrdersData, isLoading: isOrdersLoading } = useCustomerActiveOrders(1, 10);
  const { data: transactionsData, isLoading: isTransactionsLoading } = useCustomerTransactions(1, 5);

  const activeOrders = activeOrdersData?.content || [];
  const transactions = transactionsData?.content || [];
  const displayName = profile?.name || user?.name || 'Khách hàng';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Tổng quan</Text>
        <Text style={styles.subtitle}>Xin chào, {displayName}</Text>
      </View>

      <View style={styles.statsGrid}>
        <OverviewWidget
          title="Tổng cân"
          value={(profile?.totalWeight ?? 0).toFixed(2)}
          suffix="KG"
          icon={<Feather name="package" size={16} color={colors.primaryDark} />}
          colorScheme="yellow"
          style={styles.statGridItem}
        />
        <OverviewWidget
          title="Tổng tiền hàng"
          value={formatCurrency(profile?.totalAmount ?? 0)}
          icon={<Feather name="shield" size={16} color={colors.primaryDark} />}
          colorScheme="yellow"
          style={styles.statGridItem}
        />
        <OverviewWidget
          title="Đơn đang xử lý"
          value={profile?.realtimeOrders ?? 0}
          suffix="ĐƠN"
          icon={<Feather name="clock" size={16} color={colors.info} />}
          colorScheme="royalBlue"
          style={styles.statGridItem}
        />
        <OverviewWidget
          title="Tổng đơn"
          value={profile?.totalOrders ?? 0}
          suffix="ĐƠN"
          icon={<Feather name="truck" size={16} color={colors.textSecondary} />}
          colorScheme="graphite"
          style={styles.statGridItem}
        />
      </View>

      {profile?.dedicatedStaff ? (
        <View style={styles.section}>
          <StaffCard
            name={profile.dedicatedStaff.name}
            phone={profile.dedicatedStaff.phone ?? undefined}
            avatarUrl={profile.dedicatedStaff.avatarUrl ?? undefined}
          />
        </View>
      ) : null}

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleRow}>
            <Feather name="truck" size={18} color={colors.primary} style={styles.panelIcon} />
            <Text style={styles.panelTitle}>Theo dõi đơn hàng</Text>
          </View>
        </View>
        <View style={styles.panelContent}>
          {isOrdersLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
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

          <Pressable style={styles.viewAllButton} onPress={() => router.push('/(tabs)/orders')}>
            <Text style={styles.viewAllText}>Xem tất cả</Text>
            <Feather name="arrow-up-right" size={16} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleRow}>
            <Feather name="clock" size={18} color={colors.primary} style={styles.panelIcon} />
            <Text style={styles.panelTitle}>Hoạt động gần đây</Text>
          </View>
        </View>
        <View style={styles.panelContent}>
          {isTransactionsLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : transactions.length === 0 ? (
            <EmptyState
              icon="credit-card"
              title="Chưa có giao dịch"
              description="Biến động ví và thanh toán sẽ xuất hiện khi có dữ liệu."
            />
          ) : (
            transactions.map((tx) => (
              <View key={tx.id} style={styles.transactionWrapper}>
                <TransactionItem transaction={tx} />
              </View>
            ))
          )}

          <Pressable
            style={[styles.viewAllButton, { marginTop: spacing.lg }]}
            onPress={() => router.push('/(tabs)/transactions')}
          >
            <Text style={styles.viewAllText}>Xem tất cả giao dịch</Text>
            <Feather name="arrow-up-right" size={16} color={colors.primary} />
          </Pressable>
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
  },
  header: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  statGridItem: {
    width: 'auto',
    flexBasis: '47%',
    flexGrow: 1,
    marginRight: 0,
  },
  section: {
    paddingHorizontal: spacing.xl,
  },
  panel: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    borderRadius: borderRadius['2xl'],
    borderWidth: 2,
    borderColor: 'rgba(212, 196, 173, 0.3)',
    overflow: 'hidden',
  },
  panelHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 196, 173, 0.3)',
    backgroundColor: '#FEF9EC',
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  panelIcon: {
    marginRight: spacing.sm,
  },
  panelTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    textTransform: 'uppercase',
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
  viewAllButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.md,
    paddingTop: spacing.lg,
  },
  viewAllText: {
    color: colors.primary,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    fontSize: typography.fontSize.sm,
    marginRight: spacing.xs,
    textTransform: 'uppercase',
  },
});

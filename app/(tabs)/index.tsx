import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { useCustomerActiveOrders } from '@/src/features/customer-portal/shared/hooks/use-customer-portal-data';
import { formatCurrency } from '@/src/shared/lib/utils';
import { StaffCard } from '@/src/components/dashboard/StaffCard';
import { isPendingPaymentStatus } from '@/src/features/customer-portal/shared/lib/payment-status';
import { useScreenContentTopPadding, useTabScreenBottomPadding } from '@/src/shared/lib/layout/safe-area';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthUser();
  const contentPaddingBottom = useTabScreenBottomPadding();
  const contentPaddingTop = useScreenContentTopPadding(spacing.xl);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: profile, refetch: refetchProfile } = useCustomerProfile();
  const { data: activeOrdersData, refetch: refetchActiveOrders } = useCustomerActiveOrders(1, 10);

  const activeOrders = activeOrdersData?.content || [];
  const displayName = profile?.name || user?.name || 'Khách hàng';
  const pendingPaymentOrders = activeOrders.filter((order) =>
    isPendingPaymentStatus(order.orderStatus),
  );
  const pendingPaymentCount = pendingPaymentOrders.length;

  // 1 đơn -> vào thẳng chi tiết; nhiều đơn -> mở danh sách (không biết mở đơn nào).
  const goToPendingPayment = () => {
    if (pendingPaymentCount === 1) {
      router.push(`/orders/${pendingPaymentOrders[0].orderId}`);
    } else {
      router.push('/(tabs)/orders');
    }
  };

  const refreshDashboard = async () => {
    if (Platform.OS === 'web' || isRefreshing) return;

    try {
      setIsRefreshing(true);
      await Promise.allSettled([refetchProfile(), refetchActiveOrders()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeposit = () =>
    Alert.alert('Nạp tiền', 'Vui lòng liên hệ nhân viên phụ trách để được hướng dẫn nạp tiền.');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop, paddingBottom: contentPaddingBottom }]}
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
          onPress={goToPendingPayment}
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

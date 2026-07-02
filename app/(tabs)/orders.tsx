import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  Platform,
  RefreshControl,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import {
  useCustomerActiveOrders,
  useCustomerDomesticDeliveries,
  useCustomerOrders,
} from '@/src/features/customer-portal/shared/hooks/use-customer-portal-data';
import { useShipOrders } from '@/src/features/customer-portal/shared/hooks/use-ship-orders';
import type {
  CustomerActiveOrder,
  CustomerOrder,
} from '@/src/features/customer-portal/shared/types/customer-portal.types';
import type { ShipOrder } from '@/src/features/customer-portal/shared/types/ship-order.types';
import {
  getCustomerActiveOrders,
  getCustomerOrders,
  type CustomerActiveOrderQuery,
  type CustomerOrderQuery,
} from '@/src/features/customer-portal/shared/services/customer-portal.service';
import { getCustomerShipOrders } from '@/src/features/customer-portal/shared/services/ship-order.service';
import { ActiveOrderCard } from '@/src/components/dashboard/ActiveOrderCard';
import { OrderListItem } from '@/src/components/orders/OrderListItem';
import { AllingoTrackingStrip } from '@/src/components/orders/AllingoTrackingStrip';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { DatePickerField } from '@/src/components/ui/DatePickerField';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { ModalShell } from '@/src/components/ui/ModalShell';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { SelectSheet } from '@/src/components/ui/SelectSheet';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { useScreenContentTopPadding, useTabScreenBottomPadding } from '@/src/shared/lib/layout/safe-area';
import { formatDate } from '@/src/shared/lib/utils';
import { QUERY_KEYS } from '@/src/shared/lib/query/query-keys';

type OrdersTab = 'active' | 'history' | 'domestic';
type OrderListRow = CustomerActiveOrder | CustomerOrder | ShipOrder;

const ORDER_TYPE_OPTIONS = [
  { label: 'Tất cả loại đơn', value: '' },
  { label: 'Mua hộ', value: 'MUA_HO' },
  { label: 'Ký gửi', value: 'KY_GUI' },
  { label: 'Đấu giá', value: 'DAU_GIA' },
];

const MAIN_STATUS_OPTIONS = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Chờ thanh toán', value: 'CHO_THANH_TOAN' },
  { label: 'Đang xử lý', value: 'DANG_XU_LY' },
  { label: 'Chờ nhập kho', value: 'CHO_NHAP_KHO_NN' },
  { label: 'Đang chuyển VN', value: 'DANG_CHUYEN_VN' },
  { label: 'Chờ giao', value: 'CHO_GIAO' },
];

const CARRIER_LABEL: Record<string, string> = {
  JT: 'J&T Express',
  ALLINGO: 'Allingo',
  OTHER: 'Hãng khác',
  VNPOST: 'VNPost',
};

const SHIP_ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xuất kho',
  EXPORTED: 'Đã xuất kho',
  CANCELLED: 'Đã hủy',
};

// Filter "Chờ thanh toán" gộp cả CHO_THANH_TOAN (tiền hàng) lẫn CHO_THANH_TOAN_SHIP (vận chuyển)
// — với khách đây là cùng một việc "cần thanh toán". Chỉ áp cho tab Đang xử lý (active orders nhận
// mảng order_main_status_in); tab Lịch sử chỉ chứa đơn đã giao/đã hủy nên không có đơn chờ thanh toán.
const PAYMENT_PENDING_STATUSES = ['CHO_THANH_TOAN', 'CHO_THANH_TOAN_SHIP'];

const toActiveStatusIn = (status: string): string[] => {
  if (!status) return [];
  if (status === 'CHO_THANH_TOAN') return PAYMENT_PENDING_STATUSES;
  return [status];
};

const isValidDateFilter = (value: string) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const DOMESTIC_PAGE_SIZE = 10;

export default function OrdersScreen() {
  const router = useRouter();
  const contentPaddingBottom = useTabScreenBottomPadding();
  const contentPaddingTop = useScreenContentTopPadding(spacing.base);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<OrdersTab>('active');
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [domesticPage, setDomesticPage] = useState(1);
  const [activeItems, setActiveItems] = useState<CustomerActiveOrder[]>([]);
  const [historyItems, setHistoryItems] = useState<CustomerOrder[]>([]);
  const [domesticItems, setDomesticItems] = useState<ShipOrder[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [orderType, setOrderType] = useState('');
  const [draftOrderType, setDraftOrderType] = useState('');
  const [status, setStatus] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [draftDateFrom, setDraftDateFrom] = useState('');
  const [draftDateTo, setDraftDateTo] = useState('');
  const pageSize = 10;

  const activeQuery = useMemo<CustomerActiveOrderQuery>(
    () => ({
      keyword: keyword || undefined,
      type: orderType || undefined,
      orderMainStatusIn: toActiveStatusIn(status),
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy: 'latest_progress_at',
      sortOrder: 'desc',
    }),
    [dateFrom, dateTo, keyword, orderType, status],
  );

  const historyQuery = useMemo<CustomerOrderQuery>(
    () => ({
      keyword: keyword || undefined,
      type: orderType || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [dateFrom, dateTo, keyword, orderType, status],
  );

  const domesticQueryArg = useMemo(() => ({ page: domesticPage, size: DOMESTIC_PAGE_SIZE }), [domesticPage]);

  const activeOrdersQuery = useCustomerActiveOrders(activePage, pageSize, activeQuery);
  const historyOrdersQuery = useCustomerOrders(historyPage, pageSize, historyQuery);
  const domesticQuery = useShipOrders(domesticQueryArg, { refetchInterval: 30000 });
  // Đếm phiếu LOCKED sẵn sàng tạo đơn giao (banner). Danh sách chính của tab là ship_orders.
  const lockedDraftsQuery = useCustomerDomesticDeliveries(1, 50);
  const lockedDrafts = useMemo(
    () => (lockedDraftsQuery.data?.content ?? []).filter((d) => d.status === 'LOCKED'),
    [lockedDraftsQuery.data],
  );

  useEffect(() => {
    if (!activeOrdersQuery.data?.content) return;
    setActiveItems((prev) => mergeByKey(activePage === 1 ? [] : prev, activeOrdersQuery.data.content, 'orderId'));
  }, [activeOrdersQuery.data, activePage]);

  useEffect(() => {
    if (!historyOrdersQuery.data?.content) return;
    setHistoryItems((prev) => mergeByKey(historyPage === 1 ? [] : prev, historyOrdersQuery.data.content, 'orderId'));
  }, [historyOrdersQuery.data, historyPage]);

  useEffect(() => {
    if (!domesticQuery.data?.content) return;
    setDomesticItems((prev) => mergeByKey(domesticPage === 1 ? [] : prev, domesticQuery.data.content, 'shipOrderId'));
  }, [domesticQuery.data, domesticPage]);

  const resetPageAndData = () => {
    setActivePage(1);
    setHistoryPage(1);
    setDomesticPage(1);
    setActiveItems([]);
    setHistoryItems([]);
    setDomesticItems([]);
  };

  const handleTabChange = (tab: OrdersTab) => {
    setActiveTab(tab);
  };

  const openFilter = () => {
    setDraftKeyword(keyword);
    setDraftOrderType(orderType);
    setDraftStatus(status);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    if (!isValidDateFilter(draftDateFrom) || !isValidDateFilter(draftDateTo)) {
      Toast.show({
        type: 'error',
        text1: 'Ngày không hợp lệ',
        text2: 'Vui lòng nhập ngày theo định dạng YYYY-MM-DD.',
      });
      return;
    }

    setKeyword(draftKeyword.trim());
    setOrderType(draftOrderType);
    setStatus(draftStatus);
    setDateFrom(draftDateFrom.trim());
    setDateTo(draftDateTo.trim());
    resetPageAndData();
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setDraftKeyword('');
    setKeyword('');
    setDraftOrderType('');
    setOrderType('');
    setDraftStatus('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setDraftDateFrom('');
    setDraftDateTo('');
    resetPageAndData();
  };

  const goToCreateDelivery = () => {
    if (lockedDrafts.length === 1) {
      router.push(`/ship-orders/${lockedDrafts[0].draftDomesticId}` as any);
    } else {
      router.push('/ship-orders/select' as any);
    }
  };

  const refreshAllOrderTabs = async () => {
    if (Platform.OS === 'web' || isRefreshing) return;

    try {
      setIsRefreshing(true);
      const [activeResult, historyResult, domesticResult] = await Promise.allSettled([
        getCustomerActiveOrders(1, pageSize, activeQuery),
        getCustomerOrders(1, pageSize, historyQuery),
        getCustomerShipOrders({ page: 1, size: DOMESTIC_PAGE_SIZE }),
      ]);

      if (activeResult.status === 'fulfilled') {
        queryClient.setQueryData(
          ['customer-portal', 'orders', 'active', 1, pageSize, activeQuery],
          activeResult.value,
        );
        setActivePage(1);
        setActiveItems(activeResult.value.content);
      }
      if (historyResult.status === 'fulfilled') {
        queryClient.setQueryData(
          [...QUERY_KEYS.customerPortal.orders(1, pageSize, historyQuery.type), historyQuery],
          historyResult.value,
        );
        setHistoryPage(1);
        setHistoryItems(historyResult.value.content);
      }
      if (domesticResult.status === 'fulfilled') {
        queryClient.setQueryData(
          QUERY_KEYS.customerPortal.shipOrders.list({ page: 1, size: DOMESTIC_PAGE_SIZE }),
          domesticResult.value,
        );
        setDomesticPage(1);
        setDomesticItems(domesticResult.value.content);
      }
      // Invalidate cả banner (domestic-deliveries) lẫn mọi trang ship-orders để trang >1 refetch khi quay lại.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customer-portal', 'domestic-deliveries'] }),
        queryClient.invalidateQueries({ queryKey: ['customer-portal', 'ship-orders'] }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const currentQuery =
    activeTab === 'active' ? activeOrdersQuery : activeTab === 'history' ? historyOrdersQuery : domesticQuery;
  const currentItems: OrderListRow[] =
    activeTab === 'active' ? activeItems : activeTab === 'history' ? historyItems : domesticItems;
  const currentTotal =
    activeTab === 'active'
      ? activeOrdersQuery.data?.total ?? 0
      : activeTab === 'history'
        ? historyOrdersQuery.data?.total ?? 0
        : domesticQuery.data?.totalElements ?? 0;

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Đơn hàng</Text>
      <SegmentedControl
        value={activeTab}
        onChange={handleTabChange}
        segments={[
          { label: 'Đang xử lý', value: 'active' },
          { label: 'Lịch sử', value: 'history' },
          { label: 'Giao hàng', value: 'domestic' },
        ]}
      />
      {activeTab === 'domestic' ? (
        <>
          <View style={styles.quickActions}>
            <QuickAction
              icon="check-square"
              label="Xác nhận"
              onPress={() => router.push('/warehouse/confirm' as any)}
            />
            <QuickAction
              icon="map-pin"
              label="Địa chỉ giao"
              onPress={() => router.push('/warehouse/addresses' as any)}
            />
            <QuickAction
              icon="credit-card"
              label="Thanh toán ship"
              onPress={() => router.push('/shipping-payments' as any)}
            />
          </View>
          {lockedDrafts.length > 0 ? (
            <Pressable
              style={styles.banner}
              onPress={goToCreateDelivery}
              accessibilityRole="button"
              accessibilityLabel={`${lockedDrafts.length} phiếu sẵn sàng tạo đơn giao`}
            >
              <View style={styles.bannerIcon}>
                <Feather name="package" size={18} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>{lockedDrafts.length} phiếu sẵn sàng tạo đơn giao</Text>
                <Text style={styles.bannerSub}>Nhấn để tạo đơn giao & đặt shipper</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.primaryDark} />
            </Pressable>
          ) : null}
        </>
      ) : null}
      {activeTab !== 'domestic' ? (
        <View style={styles.filterBar}>
          <Pressable style={styles.searchBox} onPress={openFilter}>
            <Feather name="search" size={16} color={colors.textMuted} />
            <Text style={styles.searchText} numberOfLines={1}>
              {keyword || orderType || status || dateFrom || dateTo ? 'Đang áp dụng bộ lọc' : 'Tìm kiếm và lọc đơn hàng'}
            </Text>
          </Pressable>
          <Pressable style={styles.filterButton} onPress={openFilter}>
            <Feather name="sliders" size={18} color={colors.primaryDark} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const renderFooter = () => {
    if (currentTotal <= currentItems.length) return null;

    return (
      <View style={styles.footer}>
        <AppButton
          title="Tải thêm"
          variant="outline"
          onPress={() => {
            if (activeTab === 'active') setActivePage((p) => p + 1);
            else if (activeTab === 'history') setHistoryPage((p) => p + 1);
            else setDomesticPage((p) => p + 1);
          }}
          isLoading={currentQuery.isFetching}
        />
      </View>
    );
  };

  const renderEmpty = () => {
    if (currentQuery.isLoading) {
      return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />;
    }

    if (currentQuery.isError && currentItems.length === 0) {
      const errorDetail =
        __DEV__ && currentQuery.error instanceof Error ? currentQuery.error.message : '';
      return (
        <ErrorState
          title="Không tải được dữ liệu"
          description={
            errorDetail
              ? `Lỗi: ${errorDetail}`
              : 'Đã có lỗi hoặc mất kết nối. Vui lòng thử lại.'
          }
          onRetry={() => void currentQuery.refetch()}
          isRetrying={currentQuery.isFetching}
        />
      );
    }

    return (
      <EmptyState
        icon={activeTab === 'domestic' ? 'truck' : 'package'}
        title={activeTab === 'domestic' ? 'Chưa có đơn giao' : 'Chưa có đơn hàng'}
        description={
          activeTab === 'active'
            ? 'Không có đơn hàng nào đang xử lý theo bộ lọc hiện tại.'
            : activeTab === 'history'
              ? 'Bạn chưa có lịch sử đơn hàng phù hợp.'
              : 'Tạo đơn giao từ phiếu đã khóa để theo dõi giao hàng nội địa tại đây.'
        }
      />
    );
  };

  const renderItem = ({ item }: { item: OrderListRow }) => {
    if (activeTab === 'active') return <ActiveOrderCard order={item as CustomerActiveOrder} />;
    if (activeTab === 'history') return <OrderListItem order={item as CustomerOrder} />;
    return (
      <ShipOrderTabCard
        item={item as ShipOrder}
        onPress={() => router.push(`/ship-orders/${(item as ShipOrder).draftDomesticId}` as any)}
      />
    );
  };

  return (
    <View style={styles.container}>
      <FlatList<OrderListRow>
        data={currentItems}
        keyExtractor={(item) => ('orderId' in item ? item.orderId : item.shipOrderId)}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingTop: contentPaddingTop, paddingBottom: contentPaddingBottom }]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refreshAllOrderTabs()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      />

      <ModalShell visible={filterOpen} title="Bộ lọc đơn hàng" onClose={() => setFilterOpen(false)}>
        <AppInput
          label="Từ khóa"
          placeholder="Mã đơn, mã vận đơn..."
          value={draftKeyword}
          onChangeText={setDraftKeyword}
        />
        <SelectSheet label="Loại đơn" value={draftOrderType} options={ORDER_TYPE_OPTIONS} onChange={setDraftOrderType} />
        <SelectSheet label="Trạng thái" value={draftStatus} options={MAIN_STATUS_OPTIONS} onChange={setDraftStatus} />
        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <DatePickerField
              label="Từ ngày"
              value={draftDateFrom}
              onChange={setDraftDateFrom}
              maxDate={draftDateTo || undefined}
              disableFuture
            />
          </View>
          <View style={styles.dateCol}>
            <DatePickerField
              label="Đến ngày"
              value={draftDateTo}
              onChange={setDraftDateTo}
              minDate={draftDateFrom || undefined}
              disableFuture
            />
          </View>
        </View>
        <View style={styles.modalActions}>
          <AppButton title="Xóa lọc" variant="outline" onPress={clearFilters} />
          <AppButton title="Áp dụng" onPress={applyFilters} />
        </View>
      </ModalShell>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.quickActionIcon}>
        <Feather name={icon} size={18} color={colors.primaryDark} />
      </View>
      <Text style={styles.quickActionLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function ShipOrderTabCard({ item, onPress }: { item: ShipOrder; onPress: () => void }) {
  const isAllingo = item.carrierCode === 'ALLINGO';
  const booked = Boolean(item.allingoStatus);
  const carrierLabel = CARRIER_LABEL[item.carrierCode ?? ''] || item.carrierName || 'Hãng khác';
  const needsBooking = isAllingo && !booked && item.status === 'PENDING';

  return (
    <Pressable
      style={({ pressed }) => [styles.shipCard, pressed && styles.shipCardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Xem đơn giao ${item.shipCode}`}
    >
      <View style={styles.shipHeader}>
        <View style={styles.shipIcon}>
          <Feather name="truck" size={18} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.shipCode} numberOfLines={1}>{item.shipCode || item.shipOrderId}</Text>
          <Text style={styles.shipMeta} numberOfLines={1}>
            {carrierLabel} · {item.shippingList.length} kiện
            {item.bookingTime ? ` · ${formatDate(item.bookingTime)}` : ''}
          </Text>
        </View>
        <StatusBadge status={item.status} label={SHIP_ORDER_STATUS_LABEL[item.status] ?? item.status} />
      </View>

      {isAllingo && booked ? (
        <AllingoTrackingStrip
          status={item.allingoStatus}
          failureReason={item.allingoFailureReason}
          cancellationReason={item.allingoCancellationReason}
        />
      ) : null}

      {isAllingo && booked && item.allingoDriverName ? (
        <View style={styles.driverRow}>
          <Feather name="user" size={13} color={colors.textSecondary} />
          <Text style={styles.driverText} numberOfLines={1}>
            {item.allingoDriverName}
            {item.allingoDriverPhone ? ` · ${item.allingoDriverPhone}` : ''}
            {item.allingoDriverLicensePlate ? ` · ${item.allingoDriverLicensePlate}` : ''}
          </Text>
        </View>
      ) : null}

      <View style={styles.shipFooter}>
        {needsBooking ? (
          <View style={styles.needBookingPill}>
            <Feather name="zap" size={12} color={colors.warning} />
            <Text style={styles.needBookingText}>Cần đặt shipper</Text>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.detailHint}>
          <Text style={styles.detailHintText}>Chi tiết</Text>
          <Feather name="chevron-right" size={16} color={colors.primaryDark} />
        </View>
      </View>
    </Pressable>
  );
}

const mergeByKey = <T extends Record<string, any>>(previous: T[], incoming: T[], key: keyof T) => {
  const seen = new Set(previous.map((item) => item[key]));
  const merged = [...previous];
  incoming.forEach((item) => {
    if (!seen.has(item[key])) {
      seen.add(item[key]);
      merged.push(item);
    }
  });
  return merged;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  filterBar: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchText: {
    flex: 1,
    color: colors.textSecondary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateCol: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    minHeight: 78,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  quickActionPressed: {
    opacity: 0.85,
    backgroundColor: colors.primaryLight,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    textAlign: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    padding: spacing.md,
  },
  bannerIcon: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  bannerSub: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  shipCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  shipCardPressed: {
    opacity: 0.85,
  },
  shipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shipIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shipCode: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  shipMeta: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  driverText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  shipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  needBookingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  needBookingText: {
    fontSize: typography.fontSize.xs,
    color: colors.warning,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
  detailHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailHintText: {
    fontSize: typography.fontSize.sm,
    color: colors.primaryDark,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
});

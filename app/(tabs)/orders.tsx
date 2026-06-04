import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import {
  useCustomerActiveOrders,
  useCustomerDomesticDeliveries,
  useCustomerOrders,
} from '@/src/features/customer-portal/shared/hooks/use-customer-portal-data';
import type {
  CustomerActiveOrder,
  CustomerDomesticDeliveryItem,
  CustomerOrder,
} from '@/src/features/customer-portal/shared/types/customer-portal.types';
import {
  bookAllingoForDomesticDelivery,
  cancelAllingoForDomesticDelivery,
  getDomesticDeliveryShippingQuotes,
  syncAllingoForDomesticDelivery,
  type CustomerActiveOrderQuery,
  type CustomerOrderQuery,
} from '@/src/features/customer-portal/shared/services/customer-portal.service';
import { ActiveOrderCard } from '@/src/components/dashboard/ActiveOrderCard';
import { OrderListItem } from '@/src/components/orders/OrderListItem';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ModalShell } from '@/src/components/ui/ModalShell';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { SelectSheet } from '@/src/components/ui/SelectSheet';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { formatCurrency, formatDate, formatWeight } from '@/src/shared/lib/utils';

type OrdersTab = 'active' | 'history' | 'domestic';
type OrderListRow = CustomerActiveOrder | CustomerOrder | CustomerDomesticDeliveryItem;

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

const isValidDateFilter = (value: string) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export default function OrdersScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<OrdersTab>('active');
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [domesticPage, setDomesticPage] = useState(1);
  const [activeItems, setActiveItems] = useState<CustomerActiveOrder[]>([]);
  const [historyItems, setHistoryItems] = useState<CustomerOrder[]>([]);
  const [domesticItems, setDomesticItems] = useState<CustomerDomesticDeliveryItem[]>([]);
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
  const [quoteItem, setQuoteItem] = useState<CustomerDomesticDeliveryItem | null>(null);
  const [quotes, setQuotes] = useState<Array<{ serviceId: string; serviceName: string; partnerName: string; price: number }>>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const pageSize = 10;

  const activeQuery = useMemo<CustomerActiveOrderQuery>(
    () => ({
      keyword: keyword || undefined,
      type: orderType || undefined,
      orderMainStatusIn: status ? [status] : [],
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

  const activeOrdersQuery = useCustomerActiveOrders(activePage, pageSize, activeQuery);
  const historyOrdersQuery = useCustomerOrders(historyPage, pageSize, historyQuery);
  const domesticQuery = useCustomerDomesticDeliveries(domesticPage, pageSize);

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
    setDomesticItems((prev) => mergeByKey(domesticPage === 1 ? [] : prev, domesticQuery.data.content, 'draftDomesticId'));
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

  const refreshDomestic = async () => {
    await queryClient.invalidateQueries({ queryKey: ['customer-portal', 'domestic-deliveries'] });
  };

  const openQuotes = async (item: CustomerDomesticDeliveryItem) => {
    setQuoteItem(item);
    setLoadingQuotes(true);
    try {
      const data = await getDomesticDeliveryShippingQuotes(item.draftDomesticId);
      setQuotes(data.sort((a, b) => a.price - b.price));
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.message || 'Không thể tải báo giá' });
      setQuoteItem(null);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const bookQuote = async (serviceId: string) => {
    if (!quoteItem) return;
    try {
      await bookAllingoForDomesticDelivery(quoteItem.draftDomesticId, serviceId);
      Toast.show({ type: 'success', text1: 'Đã đặt vận chuyển nội địa' });
      setQuoteItem(null);
      await refreshDomestic();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.message || 'Đặt vận chuyển thất bại' });
    }
  };

  const cancelAllingo = (item: CustomerDomesticDeliveryItem) => {
    Alert.alert('Hủy vận chuyển', 'Bạn có chắc muốn hủy đơn vận chuyển nội địa này?', [
      { text: 'Đóng', style: 'cancel' },
      {
        text: 'Hủy vận chuyển',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelAllingoForDomesticDelivery(item.draftDomesticId, 'Khách hàng yêu cầu hủy từ app');
            Toast.show({ type: 'success', text1: 'Đã gửi yêu cầu hủy' });
            await refreshDomestic();
          } catch (error: any) {
            Toast.show({ type: 'error', text1: error?.message || 'Hủy vận chuyển thất bại' });
          }
        },
      },
    ]);
  };

  const syncAllingo = async (item: CustomerDomesticDeliveryItem) => {
    try {
      await syncAllingoForDomesticDelivery(item.draftDomesticId);
      Toast.show({ type: 'success', text1: 'Đã đồng bộ trạng thái' });
      await refreshDomestic();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.message || 'Đồng bộ thất bại' });
    }
  };

  const currentQuery =
    activeTab === 'active' ? activeOrdersQuery : activeTab === 'history' ? historyOrdersQuery : domesticQuery;
  const currentData = currentQuery.data;
  const currentItems: OrderListRow[] =
    activeTab === 'active' ? activeItems : activeTab === 'history' ? historyItems : domesticItems;

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Đơn hàng</Text>
      <SegmentedControl
        value={activeTab}
        onChange={handleTabChange}
        segments={[
          { label: 'Đang xử lý', value: 'active' },
          { label: 'Lịch sử', value: 'history' },
          { label: 'Nội địa', value: 'domestic' },
        ]}
      />
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
      ) : (
        <View style={styles.filterBar}>
          <Pressable style={styles.refreshButton} onPress={() => domesticQuery.refetch()}>
            <Feather name="refresh-cw" size={16} color={colors.primaryDark} />
            <Text style={styles.refreshText}>Làm mới</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!currentData || currentData.total <= currentItems.length) return null;

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

    return (
      <EmptyState
        icon={activeTab === 'domestic' ? 'truck' : 'package'}
        title={activeTab === 'domestic' ? 'Chưa có vận chuyển nội địa' : 'Chưa có đơn hàng'}
        description={
          activeTab === 'active'
            ? 'Không có đơn hàng nào đang xử lý theo bộ lọc hiện tại.'
            : activeTab === 'history'
              ? 'Bạn chưa có lịch sử đơn hàng phù hợp.'
              : 'Các đơn giao nội địa và trạng thái Allingo sẽ xuất hiện tại đây.'
        }
      />
    );
  };

  const renderItem = ({ item }: { item: OrderListRow }) => {
    if (activeTab === 'active') return <ActiveOrderCard order={item as CustomerActiveOrder} />;
    if (activeTab === 'history') return <OrderListItem order={item as CustomerOrder} />;
    return (
      <DomesticDeliveryCard
        item={item as CustomerDomesticDeliveryItem}
        onBook={openQuotes}
        onCancel={cancelAllingo}
        onSync={syncAllingo}
      />
    );
  };

  return (
    <View style={styles.container}>
      <FlatList<OrderListRow>
        data={currentItems}
        keyExtractor={(item) => ('orderId' in item ? item.orderId : item.draftDomesticId)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
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
            <AppInput label="Từ ngày" placeholder="YYYY-MM-DD" value={draftDateFrom} onChangeText={setDraftDateFrom} />
          </View>
          <View style={styles.dateCol}>
            <AppInput label="Đến ngày" placeholder="YYYY-MM-DD" value={draftDateTo} onChangeText={setDraftDateTo} />
          </View>
        </View>
        <View style={styles.modalActions}>
          <AppButton title="Xóa lọc" variant="outline" onPress={clearFilters} />
          <AppButton title="Áp dụng" onPress={applyFilters} />
        </View>
      </ModalShell>

      <ModalShell visible={Boolean(quoteItem)} title="Chọn đơn vị vận chuyển" onClose={() => setQuoteItem(null)}>
        {loadingQuotes ? (
          <ActivityIndicator color={colors.primary} style={{ padding: spacing.xl }} />
        ) : quotes.length === 0 ? (
          <EmptyState icon="truck" title="Chưa có báo giá" />
        ) : (
          quotes.map((quote) => (
            <Pressable key={quote.serviceId} style={styles.quoteCard} onPress={() => bookQuote(quote.serviceId)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.quoteName}>{quote.serviceName}</Text>
                <Text style={styles.quotePartner}>{quote.partnerName}</Text>
              </View>
              <Text style={styles.quotePrice}>{formatCurrency(quote.price)}</Text>
            </Pressable>
          ))
        )}
      </ModalShell>
    </View>
  );
}

function DomesticDeliveryCard({
  item,
  onBook,
  onCancel,
  onSync,
}: {
  item: CustomerDomesticDeliveryItem;
  onBook: (item: CustomerDomesticDeliveryItem) => void;
  onCancel: (item: CustomerDomesticDeliveryItem) => void;
  onSync: (item: CustomerDomesticDeliveryItem) => void;
}) {
  const hasAllingo = Boolean(item.allingoOrderId);

  return (
    <View style={styles.domesticCard}>
      <View style={styles.domesticHeader}>
        <View style={styles.domesticIcon}>
          <Feather name="truck" size={20} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.domesticCode}>{item.shipCode || item.draftDomesticId}</Text>
          <Text style={styles.domesticDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <StatusBadge status={item.allingoStatus || item.status} />
      </View>

      <InfoRow label="Địa chỉ" value={item.address || 'Chưa cập nhật'} />
      <InfoRow label="SĐT" value={item.phoneNumber || '---'} />
      <InfoRow label="Cân nặng" value={formatWeight(item.weight)} />
      {hasAllingo ? (
        <>
          <InfoRow label="Dịch vụ" value={item.allingoServiceName || item.allingoPartnerName || 'Allingo'} />
          <InfoRow label="Tổng phí" value={formatCurrency(item.allingoFeeTotal ?? item.allingoQuotedPrice ?? 0)} />
          {item.allingoDriverName ? <InfoRow label="Tài xế" value={`${item.allingoDriverName} - ${item.allingoDriverPhone || ''}`} /> : null}
        </>
      ) : null}

      <View style={styles.domesticActions}>
        <AppButton title={hasAllingo ? 'Đặt lại' : 'Đặt ship'} size="sm" onPress={() => onBook(item)} />
        {hasAllingo ? (
          <>
            <AppButton title="Đồng bộ" size="sm" variant="outline" onPress={() => onSync(item)} />
            <AppButton title="Hủy" size="sm" variant="danger" onPress={() => onCancel(item)} />
          </>
        ) : null}
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['4xl'],
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
  refreshButton: {
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    textTransform: 'uppercase',
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
  domesticCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  domesticHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  domesticIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  domesticCode: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  domesticDate: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  domesticActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  quoteName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  quotePartner: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  quotePrice: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.primaryDark,
  },
});

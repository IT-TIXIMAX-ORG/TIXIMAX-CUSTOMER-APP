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
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { useCustomerTransactions } from '@/src/features/customer-portal/shared/hooks/use-customer-portal-data';
import type { CustomerTransaction } from '@/src/features/customer-portal/shared/types/customer-portal.types';
import {
  getCustomerTransactions,
  type TransactionQuery,
} from '@/src/features/customer-portal/shared/services/customer-portal.service';
import { TransactionItem } from '@/src/components/dashboard/TransactionItem';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { ModalShell } from '@/src/components/ui/ModalShell';
import { SelectSheet } from '@/src/components/ui/SelectSheet';
import { useTabScreenBottomPadding } from '@/src/shared/lib/layout/safe-area';
import { formatCurrency, formatDate } from '@/src/shared/lib/utils';
import { statusLabel, transactionPurposeLabel } from '@/src/shared/lib/labels';
import { formatTransactionAmount, isPositiveTransaction } from '@/src/features/customer-portal/shared/lib/transaction';
import { QUERY_KEYS } from '@/src/shared/lib/query/query-keys';

const PURPOSE_OPTIONS = [
  { label: 'Tất cả', value: '' },
  { label: 'Nạp tiền ví', value: 'WALLET_DEPOSIT' },
  { label: 'Thanh toán đơn', value: 'ORDER_PAYMENT' },
  { label: 'Thanh toán ship', value: 'SHIPPING_FEE_PAYMENT' },
  { label: 'Đấu giá', value: 'AUCTION_PAYMENT' },
  { label: 'Hoàn tiền', value: 'REFUND' },
];

const formatLocalApiDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const normalizeFilterDate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const viDate = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!viDate) return trimmed;

  const [, day, month, year] = viDate;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

interface TransactionFilters {
  keyword: string;
  purpose: string;
  dateFrom: string;
  dateTo: string;
}

const normalizeTransactionFilters = (filters: TransactionFilters): TransactionFilters => ({
  keyword: filters.keyword.trim(),
  purpose: filters.purpose,
  dateFrom: normalizeFilterDate(filters.dateFrom),
  dateTo: normalizeFilterDate(filters.dateTo),
});

const areTransactionFiltersEqual = (
  left: TransactionFilters,
  right: TransactionFilters,
) =>
  left.keyword === right.keyword &&
  left.purpose === right.purpose &&
  left.dateFrom === right.dateFrom &&
  left.dateTo === right.dateTo;

export default function TransactionsScreen() {
  const contentPaddingBottom = useTabScreenBottomPadding();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CustomerTransaction[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [purpose, setPurpose] = useState('');
  const [draftPurpose, setDraftPurpose] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [draftDateFrom, setDraftDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [draftDateTo, setDraftDateTo] = useState('');
  const [selectedTx, setSelectedTx] = useState<CustomerTransaction | null>(null);
  const pageSize = 15;

  const query = useMemo<TransactionQuery>(
    () => ({
      keyword: keyword || undefined,
      type: purpose === 'REFUND' ? 'REFUND' : undefined,
      purpose: purpose && purpose !== 'REFUND' ? purpose : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [dateFrom, dateTo, keyword, purpose],
  );

  const { data, isLoading, isFetching, isError, refetch } = useCustomerTransactions(page, pageSize, query);

  useEffect(() => {
    if (!data?.content) return;
    setItems((prev) => mergeByTransactionId(page === 1 ? [] : prev, data.content));
  }, [data, page]);

  const applyTransactionFilters = (
    nextFilters: TransactionFilters,
    options: { closeFilter?: boolean; syncDraft?: boolean } = {},
  ) => {
    const normalized = normalizeTransactionFilters(nextFilters);
    const currentFilters: TransactionFilters = { keyword, purpose, dateFrom, dateTo };
    const filtersChanged = !areTransactionFiltersEqual(currentFilters, normalized);
    const shouldResetList = filtersChanged || page !== 1;

    setKeyword(normalized.keyword);
    setPurpose(normalized.purpose);
    setDateFrom(normalized.dateFrom);
    setDateTo(normalized.dateTo);

    if (options.syncDraft) {
      setDraftKeyword(normalized.keyword);
      setDraftPurpose(normalized.purpose);
      setDraftDateFrom(normalized.dateFrom);
      setDraftDateTo(normalized.dateTo);
    }

    if (shouldResetList) {
      setPage(1);
      setItems([]);
    }

    if (options.closeFilter) {
      setFilterOpen(false);
    }
  };

  const openFilters = () => {
    setDraftKeyword(keyword);
    setDraftPurpose(purpose);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    applyTransactionFilters(
      {
        keyword: draftKeyword,
        purpose: draftPurpose,
        dateFrom: draftDateFrom,
        dateTo: draftDateTo,
      },
      { closeFilter: true, syncDraft: true },
    );
  };

  const quickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const nextDateFrom = formatLocalApiDate(start);
    const nextDateTo = formatLocalApiDate(end);

    applyTransactionFilters(
      {
        keyword,
        purpose,
        dateFrom: nextDateFrom,
        dateTo: nextDateTo,
      },
      { syncDraft: true },
    );
  };

  const clearFilters = () => {
    applyTransactionFilters(
      {
        keyword: '',
        purpose: '',
        dateFrom: '',
        dateTo: '',
      },
      { closeFilter: true, syncDraft: true },
    );
  };

  const refreshTransactions = async () => {
    if (Platform.OS === 'web' || isRefreshing) return;

    try {
      setIsRefreshing(true);
      const refreshed = await getCustomerTransactions(1, pageSize, query);
      queryClient.setQueryData(
        [...QUERY_KEYS.customerPortal.transactions(1, pageSize), query],
        refreshed,
      );
      setPage(1);
      setItems(refreshed.content);
    } catch {
      // Keep the current list visible when refresh fails.
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Giao dịch</Text>
      <Text style={styles.subtitle}>Lịch sử biến động số dư ví và thanh toán</Text>
      <View style={styles.quickRow}>
        <AppButton title="7 ngày" size="sm" variant="outline" onPress={() => quickRange(7)} />
        <AppButton title="30 ngày" size="sm" variant="outline" onPress={() => quickRange(30)} />
        <AppButton title="Bộ lọc" size="sm" onPress={openFilters} />
      </View>
      {(keyword || purpose || dateFrom || dateTo) ? (
        <Pressable style={styles.activeFilter} onPress={openFilters}>
          <Feather name="filter" size={14} color={colors.primaryDark} />
          <Text style={styles.activeFilterText}>Đang áp dụng bộ lọc</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const renderFooter = () => {
    if (!data || data.total <= items.length) return null;

    return (
      <View style={styles.footer}>
        <AppButton
          title="Tải thêm"
          variant="outline"
          onPress={() => setPage((p) => p + 1)}
          isLoading={isFetching}
        />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />;
    }

    if (isError && items.length === 0) {
      return (
        <ErrorState
          title="Không tải được giao dịch"
          description="Đã có lỗi hoặc mất kết nối. Vui lòng thử lại."
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      );
    }

    return (
      <EmptyState
        icon="clock"
        title="Chưa có giao dịch"
        description="Không có giao dịch phù hợp với bộ lọc hiện tại."
      />
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.itemWrapper} onPress={() => setSelectedTx(item)}>
            <TransactionItem transaction={item} />
          </Pressable>
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: contentPaddingBottom }]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refreshTransactions()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      />

      <ModalShell visible={filterOpen} title="Bộ lọc giao dịch" onClose={() => setFilterOpen(false)}>
        <AppInput
          label="Từ khóa"
          placeholder="Mã giao dịch, mã đơn..."
          value={draftKeyword}
          onChangeText={setDraftKeyword}
        />
        <SelectSheet label="Loại giao dịch" value={draftPurpose} options={PURPOSE_OPTIONS} onChange={setDraftPurpose} />
        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <AppInput label="Từ ngày" placeholder="YYYY-MM-DD hoặc DD/MM/YYYY" value={draftDateFrom} onChangeText={setDraftDateFrom} />
          </View>
          <View style={styles.dateCol}>
            <AppInput label="Đến ngày" placeholder="YYYY-MM-DD hoặc DD/MM/YYYY" value={draftDateTo} onChangeText={setDraftDateTo} />
          </View>
        </View>
        <View style={styles.modalActions}>
          <AppButton title="Xóa lọc" variant="outline" onPress={clearFilters} />
          <AppButton title="Áp dụng" onPress={applyFilters} />
        </View>
      </ModalShell>

      <ModalShell visible={Boolean(selectedTx)} title="Chi tiết giao dịch" onClose={() => setSelectedTx(null)}>
        {selectedTx ? <TransactionDetail transaction={selectedTx} /> : null}
      </ModalShell>
    </View>
  );
}

function TransactionDetail({ transaction }: { transaction: CustomerTransaction }) {
  const isPositive = isPositiveTransaction(transaction);

  return (
    <View style={styles.detailContent}>
      <View style={styles.detailAmountBox}>
        <Text style={[styles.detailAmount, { color: isPositive ? colors.successText : colors.error }]}>
          {formatTransactionAmount(transaction)}
        </Text>
        <Text style={styles.detailPurpose}>{transactionPurposeLabel(transaction.purpose)}</Text>
      </View>
      <DetailRow label="Mã giao dịch" value={transaction.transactionCode || transaction.id} />
      <DetailRow label="Trạng thái" value={statusLabel(transaction.status)} />
      <DetailRow label="Thời gian" value={formatDate(transaction.createdAt)} />
      {transaction.orderCode ? <DetailRow label="Mã đơn" value={transaction.orderCode} /> : null}
      {transaction.paymentMethod ? <DetailRow label="Phương thức" value={transaction.paymentMethod} /> : null}
      {typeof transaction.beforeBalance === 'number' ? <DetailRow label="Số dư trước" value={formatCurrency(transaction.beforeBalance)} /> : null}
      {typeof transaction.afterBalance === 'number' ? <DetailRow label="Số dư sau" value={formatCurrency(transaction.afterBalance)} /> : null}
      {transaction.note ? <DetailRow label="Ghi chú" value={transaction.note} /> : null}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const mergeByTransactionId = (previous: CustomerTransaction[], incoming: CustomerTransaction[]) => {
  const seen = new Set(previous.map((item) => item.id));
  const merged = [...previous];

  incoming.forEach((item) => {
    if (!seen.has(item.id)) {
      seen.add(item.id);
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
  },
  header: {
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
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  activeFilter: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  activeFilterText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },
  itemWrapper: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
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
  detailContent: {
    gap: spacing.sm,
  },
  detailAmountBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  detailAmount: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  detailPurpose: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  detailValue: {
    flex: 1,
    color: colors.textPrimary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    textAlign: 'right',
  },
});

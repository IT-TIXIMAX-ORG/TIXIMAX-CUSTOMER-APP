import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { useCustomerTransactions } from '@/src/features/customer-portal/shared/hooks/use-customer-portal-data';
import type { CustomerTransaction } from '@/src/features/customer-portal/shared/types/customer-portal.types';
import type { TransactionQuery } from '@/src/features/customer-portal/shared/services/customer-portal.service';
import { TransactionItem } from '@/src/components/dashboard/TransactionItem';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ModalShell } from '@/src/components/ui/ModalShell';
import { SelectSheet } from '@/src/components/ui/SelectSheet';
import { formatCurrency, formatDate } from '@/src/shared/lib/utils';
import { statusLabel, transactionPurposeLabel } from '@/src/shared/lib/labels';

const PURPOSE_OPTIONS = [
  { label: 'Tất cả', value: '' },
  { label: 'Nạp tiền ví', value: 'WALLET_DEPOSIT' },
  { label: 'Thanh toán đơn', value: 'ORDER_PAYMENT' },
  { label: 'Thanh toán ship', value: 'SHIPPING_FEE_PAYMENT' },
  { label: 'Đấu giá', value: 'AUCTION_PAYMENT' },
  { label: 'Hoàn tiền', value: 'REFUND' },
];

export default function TransactionsScreen() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CustomerTransaction[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [purpose, setPurpose] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTx, setSelectedTx] = useState<CustomerTransaction | null>(null);
  const pageSize = 15;

  const query = useMemo<TransactionQuery>(
    () => ({
      keyword: keyword || undefined,
      purpose: purpose || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [dateFrom, dateTo, keyword, purpose],
  );

  const { data, isLoading, isFetching } = useCustomerTransactions(page, pageSize, query);

  useEffect(() => {
    if (!data?.content) return;
    setItems((prev) => mergeByTransactionId(page === 1 ? [] : prev, data.content));
  }, [data, page]);

  const resetPage = () => {
    setPage(1);
    setItems([]);
  };

  const applyFilters = () => {
    setKeyword(draftKeyword.trim());
    resetPage();
    setFilterOpen(false);
  };

  const quickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setDateFrom(start.toISOString().slice(0, 10));
    setDateTo(end.toISOString().slice(0, 10));
    resetPage();
  };

  const clearFilters = () => {
    setKeyword('');
    setDraftKeyword('');
    setPurpose('');
    setDateFrom('');
    setDateTo('');
    resetPage();
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Giao dịch</Text>
      <Text style={styles.subtitle}>Lịch sử biến động số dư ví và thanh toán</Text>
      <View style={styles.quickRow}>
        <AppButton title="7 ngày" size="sm" variant="outline" onPress={() => quickRange(7)} />
        <AppButton title="30 ngày" size="sm" variant="outline" onPress={() => quickRange(30)} />
        <AppButton title="Bộ lọc" size="sm" onPress={() => setFilterOpen(true)} />
      </View>
      {(keyword || purpose || dateFrom || dateTo) ? (
        <Pressable style={styles.activeFilter} onPress={() => setFilterOpen(true)}>
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
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />

      <ModalShell visible={filterOpen} title="Bộ lọc giao dịch" onClose={() => setFilterOpen(false)}>
        <AppInput
          label="Từ khóa"
          placeholder="Mã giao dịch, mã đơn..."
          value={draftKeyword}
          onChangeText={setDraftKeyword}
        />
        <SelectSheet label="Loại giao dịch" value={purpose} options={PURPOSE_OPTIONS} onChange={setPurpose} />
        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <AppInput label="Từ ngày" placeholder="YYYY-MM-DD" value={dateFrom} onChangeText={setDateFrom} />
          </View>
          <View style={styles.dateCol}>
            <AppInput label="Đến ngày" placeholder="YYYY-MM-DD" value={dateTo} onChangeText={setDateTo} />
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
  const isPositive =
    typeof transaction.beforeBalance === 'number' && typeof transaction.afterBalance === 'number'
      ? transaction.afterBalance - transaction.beforeBalance > 0
      : ['INCOME', 'DEPOSIT', 'REFUND'].includes(transaction.type);

  return (
    <View style={styles.detailContent}>
      <View style={styles.detailAmountBox}>
        <Text style={[styles.detailAmount, { color: isPositive ? colors.successText : colors.error }]}>
          {isPositive ? '+' : '-'}
          {formatCurrency(transaction.amount)}
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
    paddingBottom: spacing['4xl'],
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

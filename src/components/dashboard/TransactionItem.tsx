import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, fontFamilyForWeight } from '@/src/theme/tokens';
import type { CustomerTransaction } from '@/src/features/customer-portal/shared/types/customer-portal.types';
import { formatCurrency, formatDate } from '@/src/shared/lib/utils';
import { transactionPurposeLabel } from '@/src/shared/lib/labels';

interface TransactionItemProps {
  transaction: CustomerTransaction;
}

const isPositiveTransaction = (transaction: CustomerTransaction) => {
  if (typeof transaction.beforeBalance === 'number' && typeof transaction.afterBalance === 'number') {
    return transaction.afterBalance - transaction.beforeBalance > 0;
  }
  return ['INCOME', 'DEPOSIT', 'REFUND'].includes(transaction.type);
};

export function TransactionItem({ transaction }: TransactionItemProps) {
  const isPositive = isPositiveTransaction(transaction);

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: isPositive ? colors.success : colors.error }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.purpose} numberOfLines={1}>
            {transactionPurposeLabel(transaction.purpose || transaction.description)}
          </Text>
          <Text style={[styles.amount, { color: isPositive ? colors.successText : colors.error }]}>
            {isPositive ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.date}>{formatDate(transaction.createdAt)}</Text>
          {transaction.orderCode ? <Text style={styles.code}>{transaction.orderCode}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: spacing.xs + 2,
    marginRight: spacing.base,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  purpose: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  amount: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: spacing.md,
  },
  date: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  code: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryDark,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
});

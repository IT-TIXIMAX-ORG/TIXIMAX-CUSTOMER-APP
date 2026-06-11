// Thẻ "Số dư ví" + nút nạp tiền trên màn hình Tài khoản.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { formatCurrency } from '@/src/shared/lib/utils';

type Props = {
  balance: number;
  onDeposit: () => void;
};

export function WalletCard({ balance, onDeposit }: Props) {
  return (
    <View style={styles.walletCard}>
      <View style={styles.walletRow}>
        <View style={styles.walletIcon}>
          <Feather name="credit-card" size={20} color={colors.primaryDark} />
        </View>
        <View style={styles.walletInfo}>
          <Text style={styles.walletLabel}>Số dư ví</Text>
          <Text style={styles.walletAmount}>{formatCurrency(balance)}</Text>
        </View>
        <Pressable
          style={styles.depositBtn}
          onPress={onDeposit}
          accessibilityRole="button"
          accessibilityLabel="Nạp tiền vào ví"
          // Nút cao 32px — hitSlop bù để vùng chạm đạt tối thiểu 44px.
          hitSlop={8}
        >
          <Text style={styles.depositText}>Nạp tiền</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  walletCard: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  walletInfo: {
    flex: 1,
  },
  walletLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  walletAmount: {
    fontSize: typography.fontSize.md,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  depositBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    minHeight: 32,
    justifyContent: 'center',
  },
  depositText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.black,
    textTransform: 'uppercase',
  },
});

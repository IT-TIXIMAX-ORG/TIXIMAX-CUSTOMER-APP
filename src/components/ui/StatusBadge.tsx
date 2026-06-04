import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, typography, spacing, fontFamilyForWeight } from '@/src/theme/tokens';
import { statusLabel } from '@/src/shared/lib/labels';

interface StatusBadgeProps {
  status?: string | null;
  label?: string;
}

const normalizeStatus = (status?: string | null) =>
  String(status || '').trim().toUpperCase();

const getStatusConfig = (status?: string | null) => {
  switch (normalizeStatus(status)) {
    case 'CHO_THANH_TOAN':
    case 'CHO_THANH_TOAN_DAU_GIA':
    case 'CHO_THANH_TOAN_SHIP':
    case 'CHUA_THANH_TOAN':
    case 'WAITING_FOR_PAYMENT':
    case 'PENDING':
      return { bg: colors.warningLight, text: colors.warning };

    case 'DA_XAC_NHAN':
    case 'CHO_MUA':
    case 'DA_MUA':
    case 'DANG_XU_LY':
    case 'CHO_NHAP_KHO_NN':
    case 'DA_NHAP_KHO_NN':
    case 'DANG_CHUYEN_VN':
    case 'CHO_NHAP_KHO_VN':
    case 'DA_NHAP_KHO_VN':
    case 'CHO_GIAO':
    case 'DANG_GIAO':
      return { bg: colors.infoLight, text: colors.info };

    case 'DA_GIAO':
    case 'COMPLETED':
    case 'DA_THANH_TOAN':
    case 'SUCCESS':
      return { bg: colors.successLight, text: colors.successText };

    case 'CANCELLED':
    case 'DA_HUY':
    case 'YEU_CAU_HUY':
    case 'FAILED':
      return { bg: colors.errorLight, text: colors.error };

    default:
      return { bg: colors.borderLight, text: colors.textSecondary };
  }
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{label || statusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    textTransform: 'uppercase',
  },
});

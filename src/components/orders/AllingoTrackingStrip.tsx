import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import type { AllingoStatus } from '@/src/features/customer-portal/shared/types/ship-order.types';

const STEPS: Array<{ key: AllingoStatus; label: string }> = [
  { key: 'pending', label: 'Chờ lấy' },
  { key: 'picked_up', label: 'Đã lấy' },
  { key: 'delivering', label: 'Đang giao' },
  { key: 'delivered', label: 'Đã giao' },
];

interface AllingoTrackingStripProps {
  status?: AllingoStatus | null;
  failureReason?: string | null;
  cancellationReason?: string | null;
}

// Dải trạng thái Allingo 4 mốc. failed/canceled hiện băng đỏ + lý do thay vì stepper.
export function AllingoTrackingStrip({
  status,
  failureReason,
  cancellationReason,
}: AllingoTrackingStripProps) {
  if (!status) return null;

  if (status === 'failed' || status === 'canceled') {
    const reason = status === 'failed' ? failureReason : cancellationReason;
    return (
      <View style={styles.alertRow}>
        <Feather name="alert-circle" size={14} color={colors.error} />
        <Text style={styles.alertText} numberOfLines={2}>
          {status === 'failed' ? 'Giao thất bại' : 'Đã hủy'}
          {reason ? ` · ${reason}` : ''}
        </Text>
      </View>
    );
  }

  const currentIndex = STEPS.findIndex((step) => step.key === status);

  return (
    <View style={styles.strip}>
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        const isLast = index === STEPS.length - 1;
        return (
          <View key={step.key} style={styles.stepWrap}>
            <View style={styles.dotRow}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  active && styles.dotActive,
                ]}
              >
                {done ? <Feather name="check" size={9} color={colors.white} /> : null}
              </View>
              {!isLast ? <View style={[styles.line, done && styles.lineDone]} /> : null}
            </View>
            <Text
              style={[styles.label, (done || active) && styles.labelActive]}
              numberOfLines={1}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  stepWrap: {
    flex: 1,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: colors.successText,
    borderColor: colors.successText,
  },
  dotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: colors.borderLight,
    marginHorizontal: 2,
  },
  lineDone: {
    backgroundColor: colors.successText,
  },
  label: {
    marginTop: 4,
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  alertText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.error,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
});

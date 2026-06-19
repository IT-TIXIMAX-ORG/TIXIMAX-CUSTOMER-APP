// Field chọn ngày dạng lịch (calendar) — thay cho việc nhập tay YYYY-MM-DD.
// Thuần JS, không dùng native module (chạy được cả iOS/Android/web, không cần build lại).
// Giá trị vào/ra theo chuẩn API: chuỗi 'YYYY-MM-DD' (hoặc '' khi chưa chọn / xóa).

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';

// Tuần bắt đầu từ Thứ 2 theo thói quen VN.
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const pad2 = (n: number) => String(n).padStart(2, '0');
const toYmd = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

const parseYmd = (value?: string): { y: number; m: number; d: number } | null => {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  return { y, m, d };
};

const formatDisplay = (value?: string) => {
  const parsed = parseYmd(value);
  if (!parsed) return '';
  return `${pad2(parsed.d)}/${pad2(parsed.m + 1)}/${parsed.y}`;
};

const todayParts = () => {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
};

interface DatePickerFieldProps {
  label: string;
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  /** Giới hạn ngày nhỏ nhất chọn được (YYYY-MM-DD). */
  minDate?: string;
  /** Giới hạn ngày lớn nhất chọn được (YYYY-MM-DD). */
  maxDate?: string;
  /** Không cho chọn ngày trong tương lai (chặn ở hôm nay). */
  disableFuture?: boolean;
}

export function DatePickerField({
  label,
  value,
  placeholder = 'Chọn ngày',
  onChange,
  minDate,
  maxDate,
  disableFuture = false,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = parseYmd(value);
  const initial = selected ?? todayParts();
  const [view, setView] = useState({ year: initial.y, month: initial.m });

  const today = todayParts();
  const todayYmd = toYmd(today.y, today.m, today.d);

  // Trần hiệu dụng = nhỏ nhất giữa maxDate và hôm nay (nếu chặn tương lai).
  const effectiveMax = (() => {
    const bounds: string[] = [];
    if (maxDate) bounds.push(maxDate);
    if (disableFuture) bounds.push(todayYmd);
    if (!bounds.length) return undefined;
    return bounds.reduce((a, b) => (a < b ? a : b));
  })();

  const openPicker = () => {
    const base = parseYmd(value) ?? todayParts();
    setView({ year: base.y, month: base.m });
    setOpen(true);
  };

  const leadingBlanks = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isDisabled = (day: number) => {
    const ymd = toYmd(view.year, view.month, day);
    if (minDate && ymd < minDate) return true;
    if (effectiveMax && ymd > effectiveMax) return true;
    return false;
  };

  const shiftMonth = (delta: number) => {
    setView((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const shiftYear = (delta: number) => {
    setView((prev) => ({ ...prev, year: prev.year + delta }));
  };

  const handleSelect = (day: number) => {
    if (isDisabled(day)) return;
    onChange(toYmd(view.year, view.month, day));
    setOpen(false);
  };

  const goToday = () => {
    setView({ year: today.y, month: today.m });
    if (!(minDate && todayYmd < minDate) && !(effectiveMax && todayYmd > effectiveMax)) {
      onChange(todayYmd);
      setOpen(false);
    }
  };

  const clearDate = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDisplay(value) || placeholder}`}
        onPress={openPicker}
      >
        <Feather name="calendar" size={16} color={colors.textMuted} />
        <Text style={[styles.triggerText, !selected && styles.placeholderText]} numberOfLines={1}>
          {formatDisplay(value) || placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.dialog}>
            <View style={styles.navRow}>
              <Pressable style={styles.navBtn} onPress={() => shiftYear(-1)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Năm trước">
                <Feather name="chevrons-left" size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable style={styles.navBtn} onPress={() => shiftMonth(-1)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Tháng trước">
                <Feather name="chevron-left" size={18} color={colors.textSecondary} />
              </Pressable>
              <Text style={styles.navTitle}>{`Tháng ${view.month + 1}, ${view.year}`}</Text>
              <Pressable style={styles.navBtn} onPress={() => shiftMonth(1)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Tháng sau">
                <Feather name="chevron-right" size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable style={styles.navBtn} onPress={() => shiftYear(1)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Năm sau">
                <Feather name="chevrons-right" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((weekday) => (
                <Text key={weekday} style={styles.weekday}>
                  {weekday}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, index) => {
                if (day === null) {
                  // eslint-disable-next-line react/no-array-index-key
                  return <View key={`blank-${index}`} style={styles.cell} />;
                }
                const ymd = toYmd(view.year, view.month, day);
                const active = value === ymd;
                const disabled = isDisabled(day);
                const isToday = ymd === todayYmd;
                return (
                  <Pressable
                    key={ymd}
                    style={styles.cell}
                    disabled={disabled}
                    onPress={() => handleSelect(day)}
                    accessibilityRole="button"
                    accessibilityLabel={formatDisplay(ymd)}
                    accessibilityState={{ selected: active, disabled }}
                  >
                    <View style={[styles.dayBubble, active && styles.dayBubbleActive, isToday && !active && styles.dayBubbleToday]}>
                      <Text
                        style={[
                          styles.dayText,
                          active && styles.dayTextActive,
                          disabled && styles.dayTextDisabled,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.footer}>
              <Pressable style={styles.footerBtn} onPress={clearDate} hitSlop={6} accessibilityRole="button" accessibilityLabel="Xóa ngày">
                <Text style={styles.footerClear}>Xóa ngày</Text>
              </Pressable>
              <Pressable style={styles.footerBtn} onPress={goToday} hitSlop={6} accessibilityRole="button" accessibilityLabel="Hôm nay">
                <Text style={styles.footerToday}>Hôm nay</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  trigger: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  triggerText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textPrimary,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,20,20,0.35)',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.fontSize.base,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBubble: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBubbleActive: {
    backgroundColor: colors.primary,
  },
  dayBubbleToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textPrimary,
  },
  dayTextActive: {
    color: colors.black,
  },
  dayTextDisabled: {
    color: colors.borderLight,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  footerClear: {
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textSecondary,
  },
  footerToday: {
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.primaryDark,
  },
});

import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { useSafeBottomPadding } from '@/src/shared/lib/layout/safe-area';

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
}

interface SelectSheetProps {
  label: string;
  value?: string;
  placeholder?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  onOpen?: () => void;
  statusText?: string;
  statusTone?: 'muted' | 'error';
}

export function SelectSheet({
  label,
  value,
  placeholder = 'Chọn',
  options,
  onChange,
  onOpen,
  statusText,
  statusTone = 'muted',
}: SelectSheetProps) {
  const [open, setOpen] = useState(false);
  const { height } = useWindowDimensions();
  const safeBottomPadding = useSafeBottomPadding();
  const selected = options.find((option) => option.value === value);
  const dialogMaxHeight = Math.min(height * 0.72, 520);
  const listMaxHeight = Math.min(height * 0.52, 380);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={`${label || placeholder}: ${selected?.label || placeholder}`}
        onPress={() => {
          onOpen?.();
          setOpen(true);
        }}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.dialogBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.dialog, { maxHeight: dialogMaxHeight }]}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>{label || placeholder}</Text>
              <Pressable
                style={styles.close}
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                hitSlop={8}
              >
                <Feather name="x" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            {statusText ? (
              <Text style={[styles.statusText, statusTone === 'error' && styles.statusError]}>
                {statusText}
              </Text>
            ) : null}
            <FlatList
              data={options}
              style={[styles.optionsList, { maxHeight: listMaxHeight }]}
              contentContainerStyle={{ paddingBottom: safeBottomPadding }}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={options.length > 5}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    style={[styles.option, active && styles.activeOption]}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionLabel, active && styles.activeText]}>{item.label}</Text>
                      {item.description ? <Text style={styles.optionDescription}>{item.description}</Text> : null}
                    </View>
                    {active ? <Feather name="check" size={18} color={colors.primaryDark} /> : null}
                  </Pressable>
                );
              }}
            />
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
  placeholder: {
    color: colors.textMuted,
  },
  dialogBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,20,20,0.35)',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dialogTitle: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    marginBottom: spacing.sm,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textSecondary,
  },
  statusError: {
    color: colors.error,
  },
  option: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activeOption: {
    backgroundColor: colors.primaryLight,
  },
  optionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textPrimary,
  },
  activeText: {
    color: colors.primaryDark,
  },
  optionsList: {
    flexGrow: 0,
  },
  optionDescription: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
});

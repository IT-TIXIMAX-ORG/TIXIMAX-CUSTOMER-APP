import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { ModalShell } from './ModalShell';

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
}

export function SelectSheet({ label, value, placeholder = 'Chọn', options, onChange }: SelectSheetProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      <ModalShell visible={open} title={label} onClose={() => setOpen(false)}>
        <FlatList
          data={options}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => {
            const active = item.value === value;
            return (
              <Pressable
                style={[styles.option, active && styles.activeOption]}
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
      </ModalShell>
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
  optionDescription: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
});

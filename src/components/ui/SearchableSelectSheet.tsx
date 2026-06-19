// Select dạng sheet có ô tìm kiếm (lọc theo nhãn, bỏ dấu tiếng Việt).
// Dùng cho danh sách dài (vd phường/xã có thể >100 mục trong 1 tỉnh).
// Style đồng bộ với SelectSheet.

import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { useSafeBottomPadding } from '@/src/shared/lib/layout/safe-area';

export interface SearchableOption {
  label: string;
  value: string;
  description?: string;
}

interface SearchableSelectSheetProps {
  label: string;
  value?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  options: SearchableOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Text hiển thị trong trigger khi disabled (vd "Chọn tỉnh trước"). */
  disabledHint?: string;
  emptyText?: string;
}

// Dải dấu thanh tổ hợp Unicode U+0300..U+036F (tạo tại runtime để source chỉ chứa ASCII).
const COMBINING_MARKS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');

// Bỏ dấu + thường hóa để tìm kiếm không phân biệt dấu/hoa-thường.
const normalizeForSearch = (text: string) =>
  text
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();

export function SearchableSelectSheet({
  label,
  value,
  placeholder = 'Chọn',
  searchPlaceholder = 'Tìm kiếm...',
  options,
  onChange,
  disabled = false,
  disabledHint,
  emptyText = 'Không tìm thấy kết quả',
}: SearchableSelectSheetProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { height } = useWindowDimensions();
  const safeBottomPadding = useSafeBottomPadding();

  const selected = options.find((option) => option.value === value);
  // Hiển thị giá trị thô nếu không khớp option nào (vd địa chỉ cũ trước sáp nhập).
  const triggerLabel = disabled && disabledHint ? disabledHint : selected?.label ?? (value || placeholder);
  const isPlaceholder = disabled ? !value : !selected && !value;

  const dialogMaxHeight = Math.min(height * 0.78, 560);
  const listMaxHeight = Math.min(height * 0.52, 380);

  const filteredOptions = useMemo(() => {
    const keyword = normalizeForSearch(search);
    if (!keyword) return options;
    return options.filter((option) => normalizeForSearch(option.label).includes(keyword));
  }, [options, search]);

  const openSheet = () => {
    if (disabled) return;
    setSearch('');
    setOpen(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${triggerLabel}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={openSheet}
      >
        <Text style={[styles.triggerText, isPlaceholder && styles.placeholder]} numberOfLines={1}>
          {triggerLabel}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.dialog, { maxHeight: dialogMaxHeight }]}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>{label}</Text>
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

            <View style={styles.searchBox}>
              <Feather name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {search ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm">
                  <Feather name="x" size={16} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={filteredOptions}
              style={[styles.optionsList, { maxHeight: listMaxHeight }]}
              contentContainerStyle={{ paddingBottom: safeBottomPadding }}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={filteredOptions.length > 6}
              ListEmptyComponent={<Text style={styles.emptyText}>{emptyText}</Text>}
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
  triggerDisabled: {
    opacity: 0.55,
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
  backdrop: {
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
    color: colors.textPrimary,
  },
  optionsList: {
    flexGrow: 0,
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
  emptyText: {
    paddingVertical: spacing.lg,
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textMuted,
  },
});

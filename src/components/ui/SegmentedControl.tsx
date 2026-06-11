import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';

interface Segment<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  segments: Segment<T>[];
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  value,
  segments,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {segments.map((segment) => {
        const active = value === segment.value;
        return (
          <Pressable
            key={segment.value}
            style={[styles.segment, active && styles.activeSegment]}
            accessibilityRole="tab"
            accessibilityLabel={segment.label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(segment.value)}
          >
            <Text style={[styles.text, active && styles.activeText]}>{segment.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xs,
  },
  activeSegment: {
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textSecondary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  activeText: {
    color: colors.black,
  },
});

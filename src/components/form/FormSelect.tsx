import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { SelectSheet, type SelectOption } from '@/src/components/ui/SelectSheet';
import { colors, spacing, typography } from '@/src/theme/tokens';

type FormSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  onOpen?: () => void;
};

/**
 * SelectSheet được điều khiển bởi react-hook-form. Lỗi Zod hiển thị ngay dưới trigger
 * (statusText của SelectSheet chỉ hiện bên trong dialog nên không đủ).
 */
export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  onOpen,
}: FormSelectProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <View>
          <SelectSheet
            label={label}
            value={value == null ? '' : String(value)}
            options={options}
            placeholder={placeholder}
            onChange={onChange}
            onOpen={onOpen}
            statusText={error?.message}
            statusTone={error ? 'error' : 'muted'}
          />
          {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
});

import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { SelectSheet, type SelectOption } from '@/src/components/ui/SelectSheet';

type FormSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  onOpen?: () => void;
};

/**
 * SelectSheet được điều khiển bởi react-hook-form. Lỗi Zod hiển thị qua statusText/statusTone.
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
      )}
    />
  );
}

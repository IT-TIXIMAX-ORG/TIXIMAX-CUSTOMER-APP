import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { AppInput, type AppInputProps } from '@/src/components/ui/AppInput';

type FormInputProps<T extends FieldValues> = Omit<AppInputProps, 'value' | 'onChangeText' | 'onBlur' | 'error'> & {
  control: Control<T>;
  name: FieldPath<T>;
};

/**
 * AppInput được điều khiển bởi react-hook-form. Lỗi từ Zod hiển thị ngay dưới ô nhập
 * (qua prop `error` có sẵn của AppInput).
 */
export function FormInput<T extends FieldValues>({ control, name, ...rest }: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <AppInput
          value={value == null ? '' : String(value)}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error?.message}
          {...rest}
        />
      )}
    />
  );
}

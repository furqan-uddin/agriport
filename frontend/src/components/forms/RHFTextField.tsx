import { Controller } from 'react-hook-form'
import type { Control, FieldValues, Path } from 'react-hook-form'
import { TextField } from '@mui/material'
import type { TextFieldProps } from '@mui/material'

type Props<T extends FieldValues> = {
  name: Path<T>
  control: Control<T>
} & Omit<TextFieldProps, 'name' | 'error' | 'helperText'>

export default function RHFTextField<T extends FieldValues>({ name, control, ...rest }: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...rest}
          fullWidth
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message}
        />
      )}
    />
  )
}

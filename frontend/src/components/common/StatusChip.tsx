import { Chip } from '@mui/material'
import type { OrderStatus, PaymentStatus, StockStatus } from '@/types'
import { ORDER_STATUS_META, PAYMENT_STATUS_META } from '@/constants'

const STOCK_META: Record<StockStatus, { label: string; color: 'success' | 'warning' | 'error' }> = {
  in_stock: { label: 'In stock', color: 'success' },
  low_stock: { label: 'Low stock', color: 'warning' },
  out_of_stock: { label: 'Out of stock', color: 'error' },
}

type Props =
  | { kind: 'order'; value: OrderStatus; size?: 'small' | 'medium' }
  | { kind: 'payment'; value: PaymentStatus; size?: 'small' | 'medium' }
  | { kind: 'stock'; value: StockStatus; size?: 'small' | 'medium' }

export default function StatusChip(props: Props) {
  const size = props.size ?? 'small'
  const meta =
    props.kind === 'order'
      ? ORDER_STATUS_META[props.value]
      : props.kind === 'payment'
        ? PAYMENT_STATUS_META[props.value]
        : STOCK_META[props.value]

  const isDefault = meta.color === 'default'
  return (
    <Chip
      size={size}
      label={meta.label}
      color={isDefault ? 'default' : meta.color}
      variant={isDefault ? 'filled' : 'outlined'}
      sx={{
        borderWidth: 1.4,
        backgroundColor: (t) =>
          isDefault
            ? undefined
            : `color-mix(in srgb, ${t.palette[meta.color as 'success'].main} 10%, transparent)`,
      }}
    />
  )
}

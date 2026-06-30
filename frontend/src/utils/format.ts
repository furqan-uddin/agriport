import dayjs from 'dayjs'
import { CURRENCY } from '@/constants'

export function formatMoney(value: number, withSymbol = true): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))
  return withSymbol ? `${CURRENCY}${formatted}` : formatted
}

export function formatMoneyCompact(value: number): string {
  if (value >= 1e7) return `${CURRENCY}${(value / 1e7).toFixed(2)} Cr`
  if (value >= 1e5) return `${CURRENCY}${(value / 1e5).toFixed(2)} L`
  if (value >= 1e3) return `${CURRENCY}${(value / 1e3).toFixed(1)}K`
  return formatMoney(value)
}

export function formatDate(iso: string | null, withTime = false): string {
  if (!iso) return '—'
  return dayjs(iso).format(withTime ? 'DD MMM YYYY, h:mm A' : 'DD MMM YYYY')
}

export function fromNow(iso: string | null): string {
  if (!iso) return '—'
  const diff = dayjs().diff(dayjs(iso), 'day')
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 30) return `${diff} days ago`
  return formatDate(iso)
}

export function initials(name?: string | null): string {
  if (!name || typeof name !== 'string') return ''
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

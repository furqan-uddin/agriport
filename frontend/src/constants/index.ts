import type { PaymentMode, OrderStatus, PaymentStatus } from '@/types'

export const APP_NAME = 'Agriport'
export const APP_TAGLINE = 'Connecting Farms · Empowering Trade · Growing Futures'

export const ROUTES = {
  // auth
  login: '/login',
  signup: '/signup',
  otp: '/verify-otp',
  forgot: '/forgot-password',
  reset: '/reset-password',
  // customer
  home: '/',
  products: '/products',
  productDetail: (id = ':id') => `/products/${id}`,
  cart: '/cart',
  checkout: '/checkout',
  orders: '/orders',
  orderDetail: (id = ':id') => `/orders/${id}`,
  profile: '/profile',
  // other role roots (shells)
  admin: '/admin',
  manager: '/manager',
  executive: '/executive',
} as const

export const CURRENCY = '₹'

export const PAYMENT_METHODS: {
  id: PaymentMode
  label: string
  description: string
  group: 'online' | 'offline'
}[] = [
  { id: 'upi', label: 'UPI', description: 'Pay instantly via any UPI app', group: 'online' },
  { id: 'card', label: 'Credit / Debit Card', description: 'Visa, Mastercard, RuPay', group: 'online' },
  { id: 'gateway', label: 'Payment Gateway', description: 'Razorpay secure checkout', group: 'online' },
  { id: 'bank_transfer', label: 'Bank Transfer / NEFT', description: 'Direct account transfer — manual verification', group: 'offline' },
  { id: 'cash', label: 'Cash on Pickup', description: 'Pay at warehouse collection', group: 'offline' },
]

export const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  gateway: 'Gateway',
}

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; color: 'success' | 'warning' | 'info' | 'error' | 'default' }
> = {
  placed: { label: 'Placed', color: 'warning' },
  confirmed: { label: 'Confirmed', color: 'info' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
}

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  paid: { label: 'Paid', color: 'success' },
  pending: { label: 'Pending', color: 'warning' },
  failed: { label: 'Failed', color: 'error' },
  refunded: { label: 'Refunded', color: 'default' },
}

export const BUSINESS_TYPES = [
  'Retailer',
  'Wholesaler',
  'Distributor',
  'Manufacturer',
  'Importer / Exporter',
  'E-commerce Seller',
]

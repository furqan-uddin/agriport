// ── Domain types for Agriport CRM (frontend / mock layer) ────────────────────

export type UserRole = 'customer' | 'executive' | 'manager' | 'admin'

export interface User {
  id: string
  fullName: string
  email: string
  mobile: string
  role: UserRole
  companyName?: string
  businessType?: string
  gstNumber?: string
  country?: string
  state?: string
  city?: string
  address?: string
  avatarUrl?: string
}

export interface PricingSlab {
  minQty: number
  maxQty: number | null // null => and above
  price: number
  label: string
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface SizeVariant {
  size: string
  stock: number
  price: number
  packingType?: string
  netWeight?: number
  grossWeight?: number
}

export interface WeightVariant {
  netWeight: number
  grossWeight: number
}

export interface Product {
  id: string
  sku?: string
  name: string
  brand?: string             // top-level brand field
  category: string
  images: string[]
  shortDescription: string
  description: string
  specifications: Record<string, string>
  unit: string
  moq: number
  availableStock: number
  stockStatus: StockStatus
  basePrice: number
  currency: string
  pricingSlabs: PricingSlab[]
  rating: number
  origin: string
  leadTimeDays: number
  isFeatured?: boolean
  isNew?: boolean
  tags?: string[]
  // Requirements section customization
  sizePlaceholder?: string        // placeholder text for Specific Size input
  containerOptionFull?: string    // label for Full Container button
  containerOptionHalf?: string    // label for Half Container button
  showContainerOptions?: boolean  // whether to show container option buttons
  sizeVariants?: SizeVariant[]
  weightVariant?: WeightVariant
}

export interface Category {
  id: string
  name: string
  slug: string
  productCount: number
  icon: string
  isActive?: boolean
}

export interface CartItem {
  productId: string
  name: string
  image: string
  unit: string
  quantity: number
  unitPrice: number // resolved from pricing slab at current qty
  moq: number
  specifications?: Record<string, string>
}

export type OrderStatus = 'placed' | 'confirmed' | 'completed' | 'cancelled'
export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded'
export type PaymentMode = 'upi' | 'card' | 'bank_transfer' | 'cash' | 'gateway'

export interface OrderLine {
  productId: string
  name: string
  image: string
  quantity: number
  unit: string
  unitPrice: number
  lineTotal: number
  specifications?: Record<string, string>
  variantSize?: string          // which size variant was ordered
  variantPackingType?: string   // which packing type variant was ordered
}

export interface Order {
  id: string
  reference: string
  placedOn: string // ISO
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMode: PaymentMode
  lines: OrderLine[]
  subtotal: number
  tax: number
  shipping: number
  total: number
  pickupAddress?: string
  dispatchInfo?: string
  trackingTimeline: { label: string; at: string | null; done: boolean }[]
  invoiceNo?: string
  gatePassNo?: string
  cancellationReason?: string
  refundStatus?: string
  customerName?: string
  companyName?: string
  customerPhone?: string
  customerCity?: string
  deliveryAddress?: string
  quotedPrices?: Record<string, number>   // productId → agreed unit price
  quotedShipping?: number
  executiveId?: { id: string; name: string; role: string } | null
}

export interface Transaction {
  id: string
  orderRef: string
  amount: number
  mode: PaymentMode
  date: string // ISO
  status: PaymentStatus
}

export interface BusinessDocument {
  id: string
  type: 'gst_certificate' | 'business_license' | 'id_proof' | 'address_proof'
  name: string
  uploadedOn: string | null
  status: 'verified' | 'pending' | 'missing'
  fileName?: string
  fileUrl?: string
}

export interface Banner {
  id: string
  title: string
  subtitle: string
  cta: string
  accent: string
}

/** Editable hero block shown at the top of the customer home page. */
export interface HeroContent {
  badge: string
  titleLine1: string
  titleLine2: string
  subtitle: string
  primaryCtaLabel: string
  primaryCtaTo: string
  secondaryCtaLabel: string
  secondaryCtaTo: string
}

/** Trust badge shown on every product detail page (icon key + label). */
export interface TrustBadge {
  id: string
  icon: string
  label: string
}

// ── Admin domain ─────────────────────────────────────────────────────────────

export type AccountStatus = 'active' | 'suspended' | 'blocked' | 'pending'

export interface AdminUser {
  role?: UserRole
  id: string
  name: string
  company: string
  email: string
  mobile: string
  city: string
  joinedOn: string
  status: AccountStatus
  ordersCount: number
  totalSpend: number
  docStatus: 'verified' | 'pending'
}

export interface ManagerRow {
  id: string
  name: string
  email: string
  region: string
  teamSize: number
  revenue: number
  target: number
  status: AccountStatus
}

export interface ExecutiveApproval {
  id: string
  name: string
  manager: string
  region: string
  requestedOn: string
  status: 'pending' | 'approved' | 'rejected'
  aadharUrl?: string
  panUrl?: string
}

export type StockRequestType = 'add' | 'update' | 'new_product'
export interface StockRequest {
  id: string
  productName: string
  category: string
  manager: string
  type: StockRequestType
  currentStock: number
  requestedChange: number
  requestedOn: string
  status: 'pending' | 'approved' | 'rejected'
  notes?: string
  sizeVariants?: SizeVariant[]
  specifications?: Record<string, string>
  origin?: string
  leadTimeDays?: number
}

export interface DashboardStats {
  totalRevenue: number
  revenueDelta: number
  totalOrders: number
  ordersDelta: number
  totalUsers: number
  usersDelta: number
  pendingPayments: number
  pendingPaymentsAmount: number
  activeManagers: number
  activeExecutives: number
  productStock: number
  monthlySales: number
  monthlySalesDelta: number
}

export interface SalesPoint {
  label: string
  revenue: number
  orders: number
  purchased?: number
  onArrival?: number
}

export interface CategorySales {
  name: string
  value: number
}

// ── Sales (Manager + Executive) domain ───────────────────────────────────────

export type ExecStatus = 'active' | 'pending' | 'inactive'
export interface Executive {
  id: string
  name: string
  region: string
  sales: number
  target: number
  deals: number
  status: ExecStatus
  joinedOn: string
}

export type CustomerStage = 'lead' | 'prospect' | 'active' | 'dormant'
export interface CRMCustomer {
  id: string
  name: string
  company: string
  phone: string
  city: string
  stage: CustomerStage
  value: number
  lastContact: string
  owner: string
  gst?: string
  platformUserId?: string
}

export interface FollowUp {
  id: string
  customer: string
  company: string
  dueOn: string
  type: 'call' | 'visit' | 'email'
  note: string
  done: boolean
}

export interface SaleRecord {
  id: string
  ref: string
  customer: string
  product: string
  quantity: number
  unit: string
  amount: number
  date: string
  paymentStatus: PaymentStatus
  by: string
}

export interface VendorPurchase {
  id: string
  vendor: string
  product: string
  brand?: string
  quantity: number
  unit: string
  buyPrice: number
  total: number
  date: string
  status: 'received' | 'pending' | 'ordered'
  purchaser?: string
  notes?: string
  sizeVariants?: SizeVariant[]
  specifications?: Record<string, string>
  origin?: string
  leadTimeDays?: number
}

export interface PurchaseDraft {
  vendorName: string
  productId: string
  productName: string
  brand?: string
  quantity: number
  unit: string
  buyPrice: number
  purchaseDate: string
  status: 'received' | 'pending' | 'ordered'
  notes: string
  specifications?: Record<string, string>
  images?: string[]
  sizeVariants?: SizeVariant[]
  origin?: string
  leadTimeDays?: number
}

export interface ArrivalDraft {
  productId: string
  productName: string
  category: string
  currentStock: number
  requestedChange: number
  type: 'add' | 'update'
  notes: string
  specifications?: Record<string, string>
  images?: string[]
  sizeVariants?: SizeVariant[]
  origin?: string
  leadTimeDays?: number
}

export interface SaleItemDraft {
  productId: string
  productName: string
  quantity: number
  unit: string
  unitPrice: number
  variantSize?: string           // which size variant is being sold
  variantPackingType?: string    // which packing type is being sold
}

export interface SaleDraft {
  customerId: string
  customerName: string
  productId: string
  productName: string
  category: string
  quantity: number
  unit: string
  unitPrice: number
  deliveryAddress: string
  paymentMode: PaymentMode
  notes: string
}



export interface IncentivePoint {
  label: string
  earned: number
  target: number
}

export interface SalesStats {
  revenue: number
  revenueDelta: number
  target: number
  deals: number
  dealsDelta: number
  pending: number
  teamSize: number
  incentiveEarned: number
  commissionPct?: number
}

export interface InAppNotification {
  id: string
  recipientId: string
  senderId?: string
  title: string
  message: string
  type: 'order' | 'kyc' | 'stock' | 'payment' | 'auth'
  read: boolean
  entityId?: string
  createdAt: string
  updatedAt: string
}


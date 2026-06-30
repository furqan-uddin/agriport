import type {
  AdminUser,
  ManagerRow,
  ExecutiveApproval,
  StockRequest,
  DashboardStats,
  SalesPoint,
  CategorySales,
} from '@/types'

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export const dashboardStats: DashboardStats = {
  totalRevenue: 8472000,
  revenueDelta: 12.4,
  totalOrders: 1284,
  ordersDelta: 8.1,
  totalUsers: 312,
  usersDelta: 5.6,
  pendingPayments: 18,
  pendingPaymentsAmount: 642000,
  activeManagers: 9,
  activeExecutives: 41,
  productStock: 24680,
  monthlySales: 1124000,
  monthlySalesDelta: -3.2,
}

export const salesSeries: SalesPoint[] = [
  { label: 'Jul', revenue: 520000, orders: 78 },
  { label: 'Aug', revenue: 610000, orders: 92 },
  { label: 'Sep', revenue: 580000, orders: 88 },
  { label: 'Oct', revenue: 720000, orders: 110 },
  { label: 'Nov', revenue: 690000, orders: 104 },
  { label: 'Dec', revenue: 880000, orders: 131 },
  { label: 'Jan', revenue: 940000, orders: 142 },
  { label: 'Feb', revenue: 870000, orders: 129 },
  { label: 'Mar', revenue: 1020000, orders: 156 },
  { label: 'Apr', revenue: 1110000, orders: 168 },
  { label: 'May', revenue: 1240000, orders: 184 },
  { label: 'Jun', revenue: 1124000, orders: 171 },
]

export const categorySales: CategorySales[] = [
  { name: 'Agro Commodities', value: 3120000 },
  { name: 'Packaging', value: 1840000 },
  { name: 'Industrial Tools', value: 1460000 },
  { name: 'Electronics', value: 1180000 },
  { name: 'Home & Kitchen', value: 540000 },
  { name: 'Textiles', value: 332000 },
]

export const adminUsers: AdminUser[] = [
  { id: 'u-1001', name: 'Rohan Mehta', company: 'Megha Trading Co.', email: 'rohan@meghatrading.com', mobile: '+91 98765 43210', city: 'Pune', joinedOn: daysAgo(60), status: 'active', ordersCount: 14, totalSpend: 842000, docStatus: 'verified' },
  { id: 'u-1002', name: 'Aisha Khan', company: 'Crescent Imports', email: 'aisha@crescent.in', mobile: '+91 99001 22334', city: 'Mumbai', joinedOn: daysAgo(48), status: 'active', ordersCount: 9, totalSpend: 521000, docStatus: 'verified' },
  { id: 'u-1003', name: 'Vikram Rao', company: 'Rao Distributors', email: 'vikram@raodist.com', mobile: '+91 90123 45678', city: 'Hyderabad', joinedOn: daysAgo(35), status: 'active', ordersCount: 22, totalSpend: 1340000, docStatus: 'verified' },
  { id: 'u-1004', name: 'Neha Gupta', company: 'Gupta Wholesale', email: 'neha@guptaws.com', mobile: '+91 98200 11223', city: 'Delhi', joinedOn: daysAgo(28), status: 'suspended', ordersCount: 3, totalSpend: 96000, docStatus: 'pending' },
  { id: 'u-1005', name: 'Imran Sheikh', company: 'Sheikh Traders', email: 'imran@sheikhtraders.in', mobile: '+91 97654 32108', city: 'Surat', joinedOn: daysAgo(21), status: 'active', ordersCount: 7, totalSpend: 388000, docStatus: 'pending' },
  { id: 'u-1006', name: 'Priya Nair', company: 'Nair Agro', email: 'priya@nairagro.com', mobile: '+91 96543 21098', city: 'Kochi', joinedOn: daysAgo(15), status: 'blocked', ordersCount: 1, totalSpend: 24000, docStatus: 'pending' },
  { id: 'u-1007', name: 'Sandeep Patel', company: 'Patel Exports', email: 'sandeep@patelexp.com', mobile: '+91 95432 10987', city: 'Ahmedabad', joinedOn: daysAgo(9), status: 'active', ordersCount: 5, totalSpend: 271000, docStatus: 'verified' },
  { id: 'u-1008', name: 'Lakshmi Iyer', company: 'Iyer Industries', email: 'lakshmi@iyerind.com', mobile: '+91 94321 09876', city: 'Chennai', joinedOn: daysAgo(4), status: 'active', ordersCount: 2, totalSpend: 118000, docStatus: 'pending' },
]

export const managers: ManagerRow[] = [
  { id: 'm-01', name: 'Arjun Desai', email: 'arjun@agriport.com', region: 'West', teamSize: 8, revenue: 2840000, target: 3000000, status: 'active' },
  { id: 'm-02', name: 'Sneha Reddy', email: 'sneha@agriport.com', region: 'South', teamSize: 6, revenue: 2120000, target: 2200000, status: 'active' },
  { id: 'm-03', name: 'Karan Malhotra', email: 'karan@agriport.com', region: 'North', teamSize: 7, revenue: 1980000, target: 2400000, status: 'active' },
  { id: 'm-04', name: 'Farah Sayed', email: 'farah@agriport.com', region: 'East', teamSize: 5, revenue: 1310000, target: 1800000, status: 'suspended' },
]

export const executiveApprovals: ExecutiveApproval[] = [
  { id: 'e-21', name: 'Rahul Verma', manager: 'Arjun Desai', region: 'West', requestedOn: daysAgo(2), status: 'pending' },
  { id: 'e-22', name: 'Divya Menon', manager: 'Sneha Reddy', region: 'South', requestedOn: daysAgo(1), status: 'pending' },
  { id: 'e-23', name: 'Tarun Joshi', manager: 'Karan Malhotra', region: 'North', requestedOn: daysAgo(3), status: 'pending' },
]

export const stockRequests: StockRequest[] = [
  { id: 'sr-101', productName: 'Basmati Rice — Premium (25kg)', category: 'Agro Commodities', manager: 'Arjun Desai', type: 'add', currentStock: 1840, requestedChange: 500, requestedOn: daysAgo(1), status: 'pending' },
  { id: 'sr-102', productName: 'Cordless Impact Drill 20V', category: 'Industrial Tools', manager: 'Karan Malhotra', type: 'add', currentStock: 95, requestedChange: 120, requestedOn: daysAgo(2), status: 'pending' },
  { id: 'sr-103', productName: 'Jute Coffee Sacks (Lot 100)', category: 'Packaging', manager: 'Sneha Reddy', type: 'new_product', currentStock: 0, requestedChange: 800, requestedOn: daysAgo(2), status: 'pending' },
  { id: 'sr-104', productName: 'LED Panel Light 24W', category: 'Electronics', manager: 'Arjun Desai', type: 'update', currentStock: 210, requestedChange: -40, requestedOn: daysAgo(4), status: 'approved' },
  { id: 'sr-105', productName: 'Cotton Greige Fabric', category: 'Textiles', manager: 'Farah Sayed', type: 'add', currentStock: 0, requestedChange: 300, requestedOn: daysAgo(5), status: 'rejected' },
]

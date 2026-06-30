import type {
  Executive,
  CRMCustomer,
  FollowUp,
  SaleRecord,
  VendorPurchase,
  IncentivePoint,
  SalesStats,
} from '@/types'

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}
const daysAhead = (n: number) => daysAgo(-n)

export const managerStats: SalesStats = {
  revenue: 2840000,
  revenueDelta: 9.3,
  target: 3000000,
  deals: 64,
  dealsDelta: 6.2,
  pending: 3,
  teamSize: 8,
  incentiveEarned: 128400,
}

export const executiveStats: SalesStats = {
  revenue: 486000,
  revenueDelta: 14.1,
  target: 600000,
  deals: 17,
  dealsDelta: 11.0,
  pending: 4,
  teamSize: 0,
  incentiveEarned: 19440,
}

export const executives: Executive[] = [
  { id: 'e-01', name: 'Rahul Verma', region: 'Pune', sales: 612000, target: 600000, deals: 19, status: 'active', joinedOn: daysAgo(220) },
  { id: 'e-02', name: 'Divya Menon', region: 'Mumbai', sales: 548000, target: 600000, deals: 16, status: 'active', joinedOn: daysAgo(180) },
  { id: 'e-03', name: 'Tarun Joshi', region: 'Nashik', sales: 421000, target: 500000, deals: 13, status: 'active', joinedOn: daysAgo(140) },
  { id: 'e-04', name: 'Megha Shah', region: 'Surat', sales: 388000, target: 500000, deals: 12, status: 'active', joinedOn: daysAgo(95) },
  { id: 'e-05', name: 'Aman Gupta', region: 'Pune', sales: 271000, target: 400000, deals: 9, status: 'active', joinedOn: daysAgo(60) },
  { id: 'e-06', name: 'Pooja Bhat', region: 'Mumbai', sales: 0, target: 400000, deals: 0, status: 'pending', joinedOn: daysAgo(2) },
]

export const crmCustomers: CRMCustomer[] = [
  { id: 'cu-01', name: 'Rohan Mehta', company: 'Megha Trading Co.', phone: '+91 98765 43210', city: 'Pune', stage: 'active', value: 842000, lastContact: daysAgo(2), owner: 'Rahul Verma' },
  { id: 'cu-02', name: 'Vikram Rao', company: 'Rao Distributors', phone: '+91 90123 45678', city: 'Hyderabad', stage: 'active', value: 1340000, lastContact: daysAgo(5), owner: 'Divya Menon' },
  { id: 'cu-03', name: 'Sana Qureshi', company: 'Qureshi Agro', phone: '+91 91234 56700', city: 'Nagpur', stage: 'prospect', value: 240000, lastContact: daysAgo(1), owner: 'Rahul Verma' },
  { id: 'cu-04', name: 'Deepak Nair', company: 'Nair Hardware', phone: '+91 93456 78901', city: 'Kochi', stage: 'lead', value: 0, lastContact: daysAgo(0), owner: 'Tarun Joshi' },
  { id: 'cu-05', name: 'Anita Desai', company: 'Desai Textiles', phone: '+91 94567 89012', city: 'Surat', stage: 'dormant', value: 96000, lastContact: daysAgo(48), owner: 'Megha Shah' },
  { id: 'cu-06', name: 'Karthik S', company: 'KS Electronics', phone: '+91 95678 90123', city: 'Chennai', stage: 'prospect', value: 312000, lastContact: daysAgo(3), owner: 'Aman Gupta' },
]

export const followUps: FollowUp[] = [
  { id: 'f-01', customer: 'Deepak Nair', company: 'Nair Hardware', dueOn: daysAhead(0), type: 'call', note: 'Share tool catalog & bulk pricing', done: false },
  { id: 'f-02', customer: 'Sana Qureshi', company: 'Qureshi Agro', dueOn: daysAhead(1), type: 'visit', note: 'Sample delivery for turmeric lot', done: false },
  { id: 'f-03', customer: 'Karthik S', company: 'KS Electronics', dueOn: daysAhead(2), type: 'email', note: 'Send LED panel quotation', done: false },
  { id: 'f-04', customer: 'Anita Desai', company: 'Desai Textiles', dueOn: daysAgo(1), type: 'call', note: 'Reactivate — greige fabric restock', done: false },
  { id: 'f-05', customer: 'Rohan Mehta', company: 'Megha Trading Co.', dueOn: daysAgo(3), type: 'call', note: 'Confirm repeat basmati order', done: true },
]

export const salesRecords: SaleRecord[] = [
  { id: 's-01', ref: 'SL-2406-211', customer: 'Megha Trading Co.', product: 'Basmati Rice (25kg)', quantity: 40, unit: 'sack', amount: 79120, date: daysAgo(1), paymentStatus: 'paid', by: 'Rahul Verma' },
  { id: 's-02', ref: 'SL-2406-208', customer: 'Rao Distributors', product: 'LED Panel Light 24W', quantity: 12, unit: 'carton', amount: 98256, date: daysAgo(2), paymentStatus: 'paid', by: 'Divya Menon' },
  { id: 's-03', ref: 'SL-2406-205', customer: 'KS Electronics', product: 'Cordless Impact Drill', quantity: 8, unit: 'piece', amount: 33600, date: daysAgo(3), paymentStatus: 'pending', by: 'Aman Gupta' },
  { id: 's-04', ref: 'SL-2406-201', customer: 'Qureshi Agro', product: 'Turmeric Powder (10kg)', quantity: 30, unit: 'bag', amount: 54660, date: daysAgo(4), paymentStatus: 'paid', by: 'Rahul Verma' },
  { id: 's-05', ref: 'SL-2406-198', customer: 'Desai Textiles', product: 'Stretch Wrap Film', quantity: 24, unit: 'pack', amount: 49464, date: daysAgo(6), paymentStatus: 'paid', by: 'Megha Shah' },
]

export const vendorPurchases: VendorPurchase[] = [
  { id: 'pu-01', vendor: 'Punjab Agro Mills', product: 'Basmati Rice (25kg)', quantity: 500, unit: 'sack', buyPrice: 1820, total: 910000, date: daysAgo(5), status: 'received' },
  { id: 'pu-02', vendor: 'Shenzhen Tools Ltd', product: 'Cordless Impact Drill', quantity: 120, unit: 'piece', buyPrice: 3600, total: 432000, date: daysAgo(8), status: 'ordered' },
  { id: 'pu-03', vendor: 'Erode Spice Traders', product: 'Turmeric Powder (10kg)', quantity: 300, unit: 'bag', buyPrice: 1640, total: 492000, date: daysAgo(3), status: 'pending' },
  { id: 'pu-04', vendor: 'Mumbai Pack Industries', product: 'Corrugated Boxes 5-Ply', quantity: 200, unit: 'bundle', buyPrice: 1180, total: 236000, date: daysAgo(12), status: 'received' },
]

export const incentiveSeries: IncentivePoint[] = [
  { label: 'Jan', earned: 92000, target: 100000 },
  { label: 'Feb', earned: 86000, target: 100000 },
  { label: 'Mar', earned: 104000, target: 110000 },
  { label: 'Apr', earned: 118000, target: 120000 },
  { label: 'May', earned: 132000, target: 120000 },
  { label: 'Jun', earned: 128400, target: 130000 },
]

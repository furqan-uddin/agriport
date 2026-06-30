import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Box, Typography, Button } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import GroupRoundedIcon from '@mui/icons-material/GroupRounded'
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded'
import HubRoundedIcon from '@mui/icons-material/HubRounded'
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded'
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import StatCard from '@/components/admin/StatCard'
import StatusChip from '@/components/common/StatusChip'
import { useGetDashboardStatsQuery, useGetSalesSeriesQuery, useGetOrdersQuery } from '@/redux/api'
import { formatMoney, formatMoneyCompact, formatDate } from '@/utils/format'
import { brand, ink } from '@/theme/theme'

const CAT_COLORS = ['#15694A', '#1C7C58', '#389B73', '#66B894', '#C9842F', '#9AA4B2']

function ChartCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', bgcolor: '#fff', p: 3 }}>
      <Box className="flex items-start justify-between mb-3">
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{title}</Typography>
          {subtitle && <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{subtitle}</Typography>}
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useGetDashboardStatsQuery()
  const { data: series } = useGetSalesSeriesQuery()
  const { data: orders } = useGetOrdersQuery()

  const productSales = useMemo(() => {
    if (!orders) return []
    const map: Record<string, number> = {}
    orders.forEach((order) => {
      if (order.status === 'cancelled') return
      order.lines.forEach((line) => {
        map[line.name] = (map[line.name] || 0) + line.lineTotal
      })
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [orders])

  const recent = (orders ?? []).slice(0, 4)

  return (
    <Box className="flex flex-col gap-6">
      {/* Stat cards */}
      <Box className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard loading={isLoading} label="Total Revenue" value={formatMoneyCompact(stats?.totalRevenue ?? 0)} delta={stats?.revenueDelta} icon={<PaymentsRoundedIcon />} hint="All-time gross" />
        <StatCard loading={isLoading} label="Total Orders" value={(stats?.totalOrders ?? 0).toLocaleString('en-IN')} delta={stats?.ordersDelta} icon={<ReceiptLongRoundedIcon />} hint="Across all customers" />
        <StatCard loading={isLoading} label="Total Users" value={(stats?.totalUsers ?? 0).toLocaleString('en-IN')} delta={stats?.usersDelta} icon={<GroupRoundedIcon />} hint="Registered businesses" />
        <StatCard loading={isLoading} label="Pending Payments" value={(stats?.pendingPayments ?? 0).toString()} icon={<PendingActionsRoundedIcon />} hint={stats ? `${formatMoneyCompact(stats.pendingPaymentsAmount)} to verify` : ''} />
        <StatCard loading={isLoading} label="Active Managers" value={(stats?.activeManagers ?? 0).toString()} icon={<HubRoundedIcon />} />
        <StatCard loading={isLoading} label="Active Executives" value={(stats?.activeExecutives ?? 0).toString()} icon={<BadgeRoundedIcon />} />
        <StatCard loading={isLoading} label="Product Stock (units)" value={formatMoneyCompact(stats?.productStock ?? 0).replace('₹', '')} icon={<WarehouseRoundedIcon />} />
        <StatCard loading={isLoading} label="Monthly Sales" value={formatMoneyCompact(stats?.monthlySales ?? 0)} delta={stats?.monthlySalesDelta} icon={<TrendingUpRoundedIcon />} hint="Current month" />
      </Box>

      {/* Charts */}
      <Box className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Box className="lg:col-span-2">
          <ChartCard title="Revenue trend" subtitle="Last 12 months">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={series} margin={{ left: -12, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={brand[500]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={brand[500]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={ink[100]} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: ink[500] }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => formatMoneyCompact(v).replace('₹', '')} tick={{ fontSize: 12, fill: ink[500] }} axisLine={false} tickLine={false} width={56} />
                <Tooltip
                  formatter={(v) => [formatMoney(Number(v)), 'Revenue']}
                  contentStyle={{ borderRadius: 12, border: `1px solid ${ink[200]}`, fontSize: 13 }}
                />
                <Area type="monotone" dataKey="revenue" stroke={brand[600]} strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Box>

        <ChartCard title="Sales by product" subtitle="Revenue share">
          <Box className="flex flex-col gap-2.5 mt-1">
            {productSales.map((p, i) => {
              const max = Math.max(...(productSales.map((x) => x.value) ?? [1]))
              return (
                <Box key={p.name}>
                  <Box className="flex justify-between items-baseline mb-0.5">
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{p.name}</Typography>
                    <Typography className="tnum" sx={{ fontSize: 12.5, color: 'var(--ink-500)', fontWeight: 600 }}>
                      {formatMoneyCompact(p.value)}
                    </Typography>
                  </Box>
                  <Box sx={{ height: 8, borderRadius: 99, bgcolor: 'var(--ink-100)', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${(p.value / max) * 100}%`, borderRadius: 99, bgcolor: CAT_COLORS[i % CAT_COLORS.length] }} />
                  </Box>
                </Box>
              )
            })}
          </Box>
        </ChartCard>
      </Box>

      <Box className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Box className="lg:col-span-2">
          <ChartCard title="Recent orders" action={<Button component={RouterLink} to="/admin/orders" size="small">View all</Button>}>
            <Box className="flex flex-col">
              {recent.map((o) => (
                <Box
                  key={o.id}
                  component={RouterLink}
                  to="/admin/orders"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr auto', sm: '1.4fr 1fr 1fr auto' },
                    alignItems: 'center',
                    gap: 1,
                    py: 1.5,
                    borderTop: '1px solid var(--ink-100)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <Box>
                    <Typography className="tnum" sx={{ fontWeight: 700, fontSize: 13.5 }}>{o.reference}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--ink-500)' }} className="tnum">{formatDate(o.placedOn)}</Typography>
                  </Box>
                  <Typography className="tnum" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'block' } }}>{formatMoney(o.total)}</Typography>
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}><StatusChip kind="payment" value={o.paymentStatus} /></Box>
                  <StatusChip kind="order" value={o.status} />
                </Box>
              ))}
            </Box>
          </ChartCard>
        </Box>

        <ChartCard title="Orders per month" subtitle="Volume">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={series} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ink[100]} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: ink[500] }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: ink[500] }} axisLine={false} tickLine={false} width={32} />
              <Tooltip cursor={{ fill: ink[50] }} contentStyle={{ borderRadius: 12, border: `1px solid ${ink[200]}`, fontSize: 13 }} />
              <Bar dataKey="orders" radius={[5, 5, 0, 0]} maxBarSize={26}>
                {series?.map((_, i) => (
                  <Cell key={i} fill={i === (series?.length ?? 0) - 1 ? brand[600] : brand[300]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Box>
    </Box>
  )
}

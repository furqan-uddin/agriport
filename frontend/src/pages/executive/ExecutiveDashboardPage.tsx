import { Box, Typography, Button, LinearProgress, Chip } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded'
import FlagRoundedIcon from '@mui/icons-material/FlagRounded'
import RedeemRoundedIcon from '@mui/icons-material/RedeemRounded'
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import { type ReactNode, useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts'
import StatCard from '@/components/admin/StatCard'
import SectionCard from '@/components/common/SectionCard'
import StatusChip from '@/components/common/StatusChip'
import EmptyState from '@/components/common/EmptyState'
import { useGetExecutiveStatsQuery, useGetFollowUpsQuery, useGetSalesRecordsQuery, useGetIncentiveSeriesQuery } from '@/redux/api'
import { formatMoney, formatMoneyCompact, fromNow } from '@/utils/format'
import type { FollowUp } from '@/types'
import { brand, ink } from '@/theme/theme'

const FU_ICON: Record<FollowUp['type'], ReactNode> = {
  call: <PhoneRoundedIcon sx={{ fontSize: 18 }} />,
  visit: <StorefrontRoundedIcon sx={{ fontSize: 18 }} />,
  email: <EmailRoundedIcon sx={{ fontSize: 18 }} />,
}

export default function ExecutiveDashboardPage() {
  const { data: stats, isLoading } = useGetExecutiveStatsQuery()
  const { data: followUps } = useGetFollowUpsQuery()
  const { data: sales } = useGetSalesRecordsQuery()
  const { data: incentiveData } = useGetIncentiveSeriesQuery()

  const targetPct = stats ? Math.min(100, Math.round((stats.revenue / stats.target) * 100)) : 0
  const pending = (followUps ?? []).filter((f) => !f.done)
  const mySales = sales ?? []

  const tooltip = { borderRadius: 12, border: `1px solid ${ink[200]}`, fontSize: 13 }

  const handleDownloadStatement = () => {
    const headers = ['Reference', 'Customer', 'Product', 'Quantity', 'Unit', 'Amount', 'Date', 'Payment Status']
    const rows = mySales.map((s) => [
      s.ref,
      `"${s.customer.replace(/"/g, '""')}"`,
      `"${s.product.replace(/"/g, '""')}"`,
      s.quantity,
      s.unit,
      s.amount,
      s.date,
      s.paymentStatus,
    ])
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `statement_sales_and_purchase.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const productChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    mySales.forEach((s) => {
      counts[s.product] = (counts[s.product] || 0) + s.amount
    })

    const defaultData = [
      { name: 'Basmati Rice (25kg)', value: 237360 },
      { name: 'Turmeric Powder (10kg)', value: 163980 },
      { name: 'LED Panel Light 24W', value: 84660 },
    ]

    const merged: Record<string, number> = { ...counts }
    defaultData.forEach((item) => {
      if (merged[item.name] === undefined) {
        merged[item.name] = item.value
      }
    })

    return Object.entries(merged).map(([name, value]) => ({ name, value }))
  }, [mySales])

  const targetTrendData = useMemo(() => {
    if (!incentiveData) {
      return [
        { month: 'Jan', Target: 500000, Achieved: 460000, pct: 92 },
        { month: 'Feb', Target: 500000, Achieved: 430000, pct: 86 },
        { month: 'Mar', Target: 550000, Achieved: 520000, pct: 95 },
        { month: 'Apr', Target: 600000, Achieved: 590000, pct: 98 },
        { month: 'May', Target: 600000, Achieved: 660000, pct: 110 },
        { month: 'Jun', Target: 600000, Achieved: 486000, pct: 81 },
      ]
    }
    return incentiveData.map((d) => {
      const target = d.target * 5
      const achieved = d.earned * 5
      const pct = Math.round((achieved / target) * 100)
      return {
        month: d.label,
        Target: target,
        Achieved: achieved,
        pct: pct,
      }
    })
  }, [incentiveData])

  return (
    <Box className="flex flex-col gap-6">
      <Box className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard loading={isLoading} label="My Sales (MTD)" value={formatMoneyCompact(stats?.revenue ?? 0)} delta={stats?.revenueDelta} icon={<PaymentsRoundedIcon />} />
        <StatCard loading={isLoading} label="Total Target" value={formatMoneyCompact(stats?.target ?? 0)} icon={<FlagRoundedIcon />} />
        <StatCard loading={isLoading} label="Target Achieved" value={formatMoneyCompact(stats?.revenue ?? 0)} icon={<FlagRoundedIcon />} />
        <StatCard loading={isLoading} label="Incentive Earned" value={formatMoneyCompact(stats?.incentiveEarned ?? 0)} icon={<RedeemRoundedIcon />} hint="This month" />
      </Box>

      {/* Two Graphs on Top */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Product-wise Sales" subtitle="Revenue breakdown by product">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={productChartData} layout="vertical" margin={{ left: 10, right: 16, top: 8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ink[100]} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatMoneyCompact(v).replace('₹', '')} tick={{ fontSize: 12, fill: ink[500] }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: ink[700] }} axisLine={false} tickLine={false} width={130} />
              <Tooltip contentStyle={tooltip} formatter={(v) => [formatMoney(Number(v)), 'Sales']} cursor={{ fill: ink[50] }} />
              <Bar dataKey="value" fill={brand[500]} radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Target Achievement Trend" subtitle="Monthly target vs achieved sales">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={targetTrendData} margin={{ left: -10, right: 10, top: 8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ink[100]} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: ink[500] }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatMoneyCompact(v).replace('₹', '')} tick={{ fontSize: 12, fill: ink[500] }} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                contentStyle={tooltip}
                formatter={(v, name) => {
                  if (name === 'Achieved') return [formatMoney(Number(v)), 'Achieved Sales']
                  if (name === 'Target') return [formatMoney(Number(v)), 'Target Sales']
                  return [v, name]
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, marginTop: 5 }} />
              <Line type="monotone" dataKey="Target" name="Target" stroke={ink[400]} strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Achieved" name="Achieved" stroke={brand[600]} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </Box>

      <Box className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Box className="lg:col-span-2">
          <SectionCard title="Today's work" subtitle="Customer activity & scheduled touchpoints" action={<Button component={RouterLink} to="/executive/customers" size="small">All customers</Button>}>
            {pending.length === 0 ? (
              <EmptyState title="All caught up" description="No pending follow-ups right now." />
            ) : (
              <Box className="flex flex-col">
                {pending.map((f, i) => {
                  const overdue = new Date(f.dueOn) < new Date()
                  return (
                    <Box key={f.id} className="flex items-center gap-3" sx={{ py: 1.5, borderTop: i === 0 ? 'none' : '1px solid var(--ink-100)' }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'var(--brand-50)', color: 'var(--brand-700)' }}>
                        {FU_ICON[f.type]}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{f.company}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{f.note}</Typography>
                      </Box>
                      <Chip size="small" label={overdue ? 'Overdue' : fromNow(f.dueOn)} color={overdue ? 'error' : 'default'} variant="outlined" />
                    </Box>
                  )
                })}
              </Box>
            )}
          </SectionCard>
        </Box>

        <SectionCard title="My target" subtitle="This month">
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography className="tnum" sx={{ fontFamily: '"Bricolage Grotesque", serif', fontWeight: 800, fontSize: 52, color: 'var(--brand-700)', lineHeight: 1 }}>
              {targetPct}%
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: 'var(--ink-500)', mb: 2 }}>
              {formatMoney(stats?.revenue ?? 0)} of {formatMoney(stats?.target ?? 0)}
            </Typography>
            <LinearProgress variant="determinate" value={targetPct} sx={{ height: 10, borderRadius: 99, bgcolor: 'var(--ink-100)', '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: 'var(--brand-500)' } }} />
            <Button component={RouterLink} to="/executive/sales" variant="contained" fullWidth sx={{ mt: 3 }}>
              New sale
            </Button>
          </Box>
        </SectionCard>
      </Box>

      <SectionCard
        title="my recent sales and purchase"
        padded={false}
        action={
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<DownloadRoundedIcon />}
            onClick={handleDownloadStatement}
          >
            Download statement
          </Button>
        }
      >
        <Box sx={{ px: 3, pb: 1 }}>
          {mySales.length === 0 ? (
            <Box sx={{ py: 3 }}>
              <Typography sx={{ textAlign: 'center', color: 'var(--ink-500)', fontSize: 14 }}>No sales recorded yet.</Typography>
            </Box>
          ) : (
            mySales.map((s, i) => (
              <Box key={s.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', sm: '1fr 1.4fr auto auto' }, alignItems: 'center', gap: 1.5, py: 1.5, borderTop: i === 0 ? 'none' : '1px solid var(--ink-100)' }}>
                <Typography className="tnum" sx={{ fontWeight: 700, fontSize: 13.5 }}>{s.ref}</Typography>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{s.customer}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'var(--ink-500)' }}>{s.product}</Typography>
                </Box>
                <StatusChip kind="payment" value={s.paymentStatus} />
                <Typography className="tnum" sx={{ fontWeight: 700, fontSize: 14, textAlign: 'right', minWidth: 78 }}>{formatMoney(s.amount)}</Typography>
              </Box>
            ))
          )}
        </Box>
      </SectionCard>
    </Box>
  )
}

import { useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import { ResponsiveContainer, PieChart, Pie, Tooltip, Legend, Cell } from 'recharts'
import StatCard from '@/components/admin/StatCard'
import SectionCard from '@/components/common/SectionCard'
import RedeemRoundedIcon from '@mui/icons-material/RedeemRounded'
import PercentRoundedIcon from '@mui/icons-material/PercentRounded'
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded'
import { useGetIncentiveSeriesQuery, useGetSalesRecordsQuery } from '@/redux/api'
import { formatMoney, formatMoneyCompact } from '@/utils/format'
import { ink } from '@/theme/theme'

const PIE_COLORS = ['#15694A', '#1C7C58', '#389B73', '#66B894', '#C9842F', '#9AA4B2']

interface Props {
  earned: number
  commissionPct: number
  overridePct?: number
  role: 'manager' | 'executive'
}

export default function IncentivesView({ earned, commissionPct, overridePct, role }: Props) {
  const { data: series } = useGetIncentiveSeriesQuery()
  const { data: salesRecords } = useGetSalesRecordsQuery()

  const productSales = useMemo(() => {
    if (!salesRecords) return []
    const map: Record<string, number> = {}
    salesRecords.forEach((r) => {
      map[r.product] = (map[r.product] || 0) + r.quantity
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [salesRecords])

  const ytd = (series ?? []).reduce((s, p) => s + p.earned, 0)
  const lastTarget = series?.[series.length - 1]?.target ?? 0
  const lastEarned = series?.[series.length - 1]?.earned ?? earned
  const achieved = lastTarget ? Math.round((lastEarned / lastTarget) * 100) : 0

  return (
    <Box className="flex flex-col gap-6">
      <Box className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Earned This Month" value={formatMoneyCompact(earned)} icon={<RedeemRoundedIcon />} hint={`${achieved}% of target`} />
        <StatCard label="Year to Date" value={formatMoneyCompact(ytd)} icon={<EmojiEventsRoundedIcon />} />
        <StatCard label={role === 'manager' ? 'Commission + Override' : 'Commission Rate'} value={overridePct ? `${commissionPct}% + ${overridePct}%` : `${commissionPct}%`} icon={<PercentRoundedIcon />} hint={role === 'manager' ? 'on team revenue' : 'on personal sales'} />
      </Box>

      <SectionCard title="Product Sales Share" subtitle="Units sold per product">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={productSales}
              dataKey="value"
              nameKey="name"
              outerRadius={110}
              paddingAngle={2}
            >
              {productSales.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 12, border: `1px solid ${ink[200]}`, fontSize: 13 }}
              formatter={(v) => [`${v} units`, 'Quantity']}
            />
            <Legend wrapperStyle={{ fontSize: 12.5 }} />
          </PieChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard title="Monthly breakdown" padded={false}>
        <Box sx={{ px: 3, pb: 1 }}>
          {series?.slice().reverse().map((p, i) => {
            const pct = p.target ? Math.round((p.earned / p.target) * 100) : 0
            return (
              <Box key={p.label} className="flex items-center justify-between" sx={{ py: 1.5, borderTop: i === 0 ? 'none' : '1px solid var(--ink-100)' }}>
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{p.label}</Typography>
                <Box className="flex items-center gap-4">
                  <Typography className="tnum" sx={{ fontSize: 12.5, color: pct >= 100 ? 'var(--brand-600)' : '#A66A1F', fontWeight: 700 }}>
                    {pct}%
                  </Typography>
                  <Typography className="tnum" sx={{ fontWeight: 700, fontSize: 14, minWidth: 90, textAlign: 'right' }}>
                    {formatMoney(p.earned)}
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </Box>
      </SectionCard>
    </Box>
  )
}

import { useState } from 'react'
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import { Box, Typography, Tabs, Tab, Button, Divider, Badge } from '@mui/material'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import PageHeader from '@/components/common/PageHeader'
import StatusChip from '@/components/common/StatusChip'
import EmptyState from '@/components/common/EmptyState'
import { OrderListSkeleton } from '@/components/common/Loader'
import { useGetOrdersQuery } from '@/redux/api'
import { ROUTES, PAYMENT_MODE_LABEL } from '@/constants'
import { formatMoney, formatDate } from '@/utils/format'
import type { Order, OrderStatus } from '@/types'

type Filter = 'all' | OrderStatus
const TABS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'placed', label: 'Placed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function OrderRow({ order }: { order: Order }) {
  const itemCount = order.lines.reduce((n, l) => n + l.quantity, 0)
  return (
    <Box
      component={RouterLink}
      to={ROUTES.orderDetail(order.id)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        border: '1px solid var(--ink-200)',
        bgcolor: '#fff',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all .15s',
        '&:hover': { borderColor: '#9DD4BC', boxShadow: '0 4px 12px rgba(22,27,36,0.06)' },
      }}
    >
      <Box
        sx={{ width: 46, height: 46, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'var(--brand-50)', color: 'var(--brand-700)', flexShrink: 0 }}
      >
        <ReceiptLongRoundedIcon />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box className="flex items-center gap-2 flex-wrap">
          <Typography sx={{ fontWeight: 700, fontSize: 15 }} className="tnum">
            {order.reference}
          </Typography>
          <StatusChip kind="order" value={order.status} />
        </Box>
        <Typography sx={{ fontSize: 13, color: 'var(--ink-500)', mt: 0.25 }} className="tnum">
          {formatDate(order.placedOn)} · {order.lines.length} products · {itemCount} units · {PAYMENT_MODE_LABEL[order.paymentMode]}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
        <Box sx={{ display: 'inline-block' }}>
          <StatusChip kind="payment" value={order.paymentStatus} />
        </Box>
      </Box>
      <ChevronRightRoundedIcon sx={{ color: 'var(--ink-400)' }} />
    </Box>
  )
}

export default function OrdersPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const justPlaced = params.get('placed') === '1'
  const [filter, setFilter] = useState<Filter>(justPlaced ? 'placed' : 'all')
  const { data: orders, isLoading } = useGetOrdersQuery()

  const counts = (orders ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  const filtered = (orders ?? []).filter((o) => filter === 'all' || o.status === filter)

  return (
    <Box className="animate-fade-up">
      <PageHeader
        title="My orders"
        subtitle="Track every order through placement, confirmation, dispatch and delivery."
        crumbs={[{ label: 'Home', to: ROUTES.home }, { label: 'Orders' }]}
      />

      {justPlaced && (
        <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'var(--brand-50)', border: '1px solid #9DD4BC', mb: 3 }}>
          <Typography sx={{ fontWeight: 700, color: 'var(--brand-800)' }}>
            ✓ Order placed successfully
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: 'var(--brand-700)' }}>
            We'll verify your payment and notify you once it's confirmed. Invoice & gate pass follow on approval.
          </Typography>
        </Box>
      )}

      <Tabs
        value={filter}
        onChange={(_, v) => setFilter(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: '1px solid var(--ink-200)', mb: 3 }}
      >
        {TABS.map((t) => (
          <Tab
            key={t.value}
            value={t.value}
            sx={{ overflow: 'visible' }}
            label={
              t.value === 'all' || !counts[t.value] ? (
                t.label
              ) : (
                <Badge color="primary" badgeContent={counts[t.value]} sx={{ '& .MuiBadge-badge': { right: -14, top: 2 } }}>
                  {t.label}
                </Badge>
              )
            }
          />
        ))}
      </Tabs>

      {isLoading ? (
        <OrderListSkeleton count={5} />
      ) : filtered.length > 0 ? (
        <Box className="flex flex-col gap-3">
          {filtered.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </Box>
      ) : (
        <Box sx={{ border: '1px solid var(--ink-200)', borderRadius: 4, bgcolor: '#fff' }}>
          <EmptyState
            icon={<ReceiptLongRoundedIcon fontSize="inherit" />}
            title={`No ${filter === 'all' ? '' : filter} orders`}
            description="When you place orders, they'll appear here with full tracking details."
            actionLabel="Browse marketplace"
            onAction={() => navigate(ROUTES.products)}
          />
        </Box>
      )}

      <Divider sx={{ my: 4 }} />
      <Button component={RouterLink} to={ROUTES.products} variant="outlined">
        Continue shopping
      </Button>
    </Box>
  )
}

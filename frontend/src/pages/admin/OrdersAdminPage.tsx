import { useEffect, useMemo, useState } from 'react'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { Box, Typography, Button, Tabs, Tab, Menu, MenuItem, ListItemIcon } from '@mui/material'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import PaidRoundedIcon from '@mui/icons-material/PaidRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import TableCard from '@/components/admin/TableCard'
import { gridSx } from '@/components/admin/gridStyles'
import StatusChip from '@/components/common/StatusChip'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { useGetOrdersQuery, useUpdateOrderStatusMutation, useVerifyPaymentMutation } from '@/redux/api'
import { formatMoney, formatDate } from '@/utils/format'
import { PAYMENT_MODE_LABEL } from '@/constants'
import { downloadInvoice } from '@/utils/documents'
import type { Order, OrderStatus } from '@/types'
import toast from 'react-hot-toast'

type Filter = 'all' | OrderStatus | 'pending_payment'
const TABS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'placed', label: 'Placed' },
  { value: 'pending_payment', label: 'Payment Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function OrdersAdminPage() {
  const { data: serverOrders, isLoading } = useGetOrdersQuery()
  const [updateOrderStatus, { isLoading: isUpdatingStatus }] = useUpdateOrderStatusMutation()
  const [verifyPaymentMutation] = useVerifyPaymentMutation()

  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [active, setActive] = useState<Order | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    const list = serverOrders || []
    return list
      .filter((o) => {
        if (filter === 'all') return true
        if (filter === 'pending_payment') return o.paymentStatus === 'pending'
        return o.status === filter
      })
      .filter((o) => o.reference.toLowerCase().includes(s))
  }, [serverOrders, filter, search])

  const confirmOrder = async (o: Order) => {
    try {
      await updateOrderStatus({ id: o.id, status: 'confirmed' }).unwrap()
      toast.success(`${o.reference} confirmed · invoice generated`)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to confirm order')
    }
  }

  const verifyPayment = async (o: Order) => {
    try {
      await verifyPaymentMutation({ transactionId: o.id }).unwrap()
      toast.success(`Payment verified for ${o.reference}`)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to verify payment')
    }
  }

  const cancelOrder = async () => {
    if (!cancelTarget) return
    try {
      await updateOrderStatus({
        id: cancelTarget.id,
        status: 'cancelled',
        reason: 'Cancelled by admin',
      }).unwrap()
      toast.success(`${cancelTarget.reference} cancelled`)
      setCancelTarget(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to cancel order')
    }
  }

  const columns: GridColDef<Order>[] = [
    {
      field: 'reference',
      headerName: 'Order',
      width: 170,
      renderCell: (p) => (
        <Box>
          <Typography className="tnum" sx={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.2 }}>
            {p.row.reference}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'var(--ink-500)' }} className="tnum">
            {formatDate(p.row.placedOn)} · {p.row.lines.length} items
          </Typography>
        </Box>
      ),
    },
    {
      field: 'productsSold',
      headerName: 'Products Sold',
      flex: 1.5,
      minWidth: 220,
      renderCell: (p) => (
        <Typography sx={{ fontSize: 13, display: 'flex', alignItems: 'center', height: '100%', color: 'var(--ink-700)' }}>
          {p.row.lines.map((line) => `${line.name} (${line.quantity} ${line.unit})`).join(', ')}
        </Typography>
      ),
    },
    {
      field: 'salesExecutive',
      headerName: 'Sales Executive',
      width: 180,
      renderCell: (p) => (
        <span style={{ display: 'flex', alignItems: 'center', height: '100%', fontSize: 13, fontWeight: p.row.executiveId ? 600 : 400, color: p.row.executiveId ? 'var(--brand-700)' : 'var(--ink-500)' }}>
          {p.row.executiveId?.name || 'Storefront / Self-service'}
        </span>
      ),
    },
    {
      field: 'total',
      headerName: 'Amount',
      width: 120,
      renderCell: (p) => <span className="tnum" style={{ fontWeight: 700 }}>{formatMoney(p.row.total)}</span>,
    },
    {
      field: 'paymentMode',
      headerName: 'Payment',
      width: 130,
      renderCell: (p) => (
        <Box>
          <Typography sx={{ fontSize: 13 }}>{PAYMENT_MODE_LABEL[p.row.paymentMode]}</Typography>
          <StatusChip kind="payment" value={p.row.paymentStatus} />
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (p) => <StatusChip kind="order" value={p.row.status} />,
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: (p) => (
        <Button
          size="small"
          sx={{ minWidth: 0, p: 1 }}
          onClick={(e) => {
            setActive(p.row)
            setMenuAnchor(e.currentTarget)
          }}
        >
          <MoreVertRoundedIcon fontSize="small" />
        </Button>
      ),
    },
  ]

  return (
    <Box>
      <Tabs value={filter} onChange={(_, v) => setFilter(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2.5 }}>
        {TABS.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} />
        ))}
      </Tabs>

      <TableCard count={filtered.length} search={search} onSearch={setSearch} searchPlaceholder="Search by order ref…">
        <DataGrid
          rows={filtered}
          columns={columns}
          loading={isLoading}
          rowHeight={64}
          disableRowSelectionOnClick
          disableColumnMenu
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={gridSx}
        />
      </TableCard>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {active?.paymentStatus === 'pending' && (
          <MenuItem
            onClick={() => {
              verifyPayment(active)
              setMenuAnchor(null)
            }}
          >
            <ListItemIcon><PaidRoundedIcon fontSize="small" /></ListItemIcon>
            Verify payment
          </MenuItem>
        )}
        {active?.status === 'placed' && (
          <MenuItem
            onClick={() => {
              confirmOrder(active)
              setMenuAnchor(null)
            }}
          >
            <ListItemIcon><CheckCircleRoundedIcon fontSize="small" /></ListItemIcon>
            Confirm & generate invoice
          </MenuItem>
        )}
        {(active?.status === 'confirmed' || active?.status === 'completed') && (
          <MenuItem
            onClick={() => {
              if (active) downloadInvoice(active)
              setMenuAnchor(null)
            }}
          >
            <ListItemIcon><DescriptionRoundedIcon fontSize="small" /></ListItemIcon>
            Download invoice
          </MenuItem>
        )}
        {active && active.status !== 'cancelled' && active.status !== 'completed' && (
          <MenuItem
            sx={{ color: '#C0392B' }}
            onClick={() => {
              setCancelTarget(active)
              setMenuAnchor(null)
            }}
          >
            <ListItemIcon><CancelRoundedIcon fontSize="small" sx={{ color: 'inherit' }} /></ListItemIcon>
            Cancel order
          </MenuItem>
        )}
      </Menu>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel order?"
        message={
          <>
            Cancel <strong>{cancelTarget?.reference}</strong> and initiate a refund where applicable?
          </>
        }
        confirmLabel="Cancel order"
        destructive
        onConfirm={cancelOrder}
        onClose={() => setCancelTarget(null)}
        loading={isUpdatingStatus}
      />
    </Box>
  )
}

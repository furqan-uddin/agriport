import { useState, useMemo } from 'react'
import { useLocation, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
} from '@mui/material'
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'

import TableCard from '@/components/admin/TableCard'
import StatCard from '@/components/admin/StatCard'
import EmptyState from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import { useGetVendorPurchasesQuery } from '@/redux/api'
import { useAppSelector } from '@/redux/hooks'
import { formatDate, formatMoney } from '@/utils/format'

export default function PurchaseHistoryPage() {
  const location = useLocation()
  const isAdminPath = location.pathname.startsWith('/admin')
  const user = useAppSelector((state) => state.auth.user)
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager'

  const [search, setSearch] = useState('')

  // 1. Fetch vendor purchases (backend automatically filters by role/owner)
  const { data: purchases = [], isLoading } = useGetVendorPurchasesQuery()

  // 2. Filter list by search query
  const filteredPurchases = useMemo(() => {
    const s = search.toLowerCase().trim()
    if (!s) return purchases
    return purchases.filter(
      (p) =>
        p.vendor.toLowerCase().includes(s) ||
        p.product.toLowerCase().includes(s) ||
        p.status.toLowerCase().includes(s)
    )
  }, [purchases, search])

  // 3. Compute stats
  const totalSpent = useMemo(() => {
    return purchases.reduce((sum, p) => sum + (p.total || 0), 0)
  }, [purchases])

  // Breadcrumbs configuration
  const crumbs = [
    { label: 'Dashboard', to: isAdminPath ? '/admin' : '/executive' },
    { label: 'Add Stock', to: isAdminPath ? '/admin/add-stock/new-purchase' : '/executive/add-stock/new-purchase' },
    { label: 'Purchase History' },
  ]

  const headerActions = (
    <Button
      variant="contained"
      size="small"
      component={RouterLink}
      to={isAdminPath ? '/admin/add-stock/new-purchase' : '/executive/add-stock/new-purchase'}
      startIcon={<ShoppingBagRoundedIcon />}
      sx={{ borderRadius: 2 }}
    >
      Record Purchase
    </Button>
  )

  return (
    <Box className="flex flex-col gap-6">
      <PageHeader
        title="Purchase History"
        subtitle="History of logged vendor purchases and procurement transactions."
        crumbs={crumbs}
        action={headerActions}
      />

      {/* Stats Cards Section */}
      <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          loading={isLoading}
          label="Total Purchases Logged"
          value={purchases.length.toLocaleString('en-IN')}
          icon={<ReceiptLongRoundedIcon />}
          hint="Logs from direct vendor procurements"
        />
        <StatCard
          loading={isLoading}
          label="Total Outlay (Capital Spent)"
          value={formatMoney(totalSpent)}
          icon={<ReceiptLongRoundedIcon />}
          hint="Cumulative cost of received procurements"
        />
      </Box>

      {/* Purchase Log Table Card */}
      <TableCard
        title="Purchase History Log"
        count={filteredPurchases.length}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search vendor or product..."
        height={500}
      >
        {isLoading ? (
          <Box className="flex justify-center items-center py-12" sx={{ color: 'var(--ink-400)' }}>
            Loading vendor purchases...
          </Box>
        ) : filteredPurchases.length === 0 ? (
          <EmptyState
            icon={<ShoppingBagRoundedIcon fontSize="inherit" />}
            title="No purchases logged"
            description={
              search
                ? `No logged purchases match "${search}"`
                : 'Vendor purchases recorded by you or your team will appear here.'
            }
          />
        ) : (
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: 'var(--ink-50)',
                    '& th': {
                      fontWeight: 700,
                      fontSize: 12,
                      color: 'var(--ink-600)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      borderColor: 'var(--ink-200)',
                    },
                  }}
                >
                  <TableCell>Date</TableCell>
                  <TableCell>Vendor Name</TableCell>
                  <TableCell>Product Name</TableCell>
                  <TableCell>Brand</TableCell>
                  {isAdminOrManager && <TableCell>Purchased By</TableCell>}
                  <TableCell>Quantity</TableCell>
                  <TableCell>Unit Price</TableCell>
                  <TableCell>Total Cost</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell align="right">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPurchases.map((p) => (
                   <TableRow key={p.id} hover sx={{ '& td': { borderColor: 'var(--ink-100)', py: 1.5 } }}>
                    <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{formatDate(p.date)}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 700 }}>{p.vendor}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{p.product}</TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'var(--ink-600)' }}>{p.brand || '—'}</TableCell>
                    {isAdminOrManager && (
                      <TableCell sx={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>
                        {p.purchaser}
                      </TableCell>
                    )}
                    <TableCell sx={{ fontSize: 13 }}>
                      {p.quantity} cartons
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 500 }} className="tnum">
                      {formatMoney(p.buyPrice)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-600)' }} className="tnum">
                      {formatMoney(p.total)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5, color: 'var(--ink-600)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.notes}>
                      {p.sizeVariants && p.sizeVariants.length > 0
                        ? p.sizeVariants.map(v => `${v.size} (${v.stock} ${v.packingType || 'Cartoon'})`).join(', ')
                        : p.notes || '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        label={p.status}
                        variant="outlined"
                        color={p.status === 'received' ? 'success' : p.status === 'ordered' ? 'info' : 'warning'}
                        sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TableCard>
    </Box>
  )
}

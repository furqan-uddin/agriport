import { useState, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
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
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'

import TableCard from '@/components/admin/TableCard'
import StatCard from '@/components/admin/StatCard'
import EmptyState from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import { useGetStockRequestsQuery } from '@/redux/api'
import { formatDate } from '@/utils/format'

const TYPE_LABELS: Record<string, string> = {
  add: 'Add Stock',
  update: 'Update Stock',
  new_product: 'New Product',
}

export default function ArrivalsLogPage() {
  const [search, setSearch] = useState('')

  // 1. Fetch stock requests (backend automatically filters to only show user's own requests if role is executive)
  const { data: stockRequests = [], isLoading } = useGetStockRequestsQuery()

  // 2. Filter list by search query
  const filteredRequests = useMemo(() => {
    const s = search.toLowerCase().trim()
    if (!s) return stockRequests
    return stockRequests.filter(
      (r) =>
        r.productName.toLowerCase().includes(s) ||
        r.category.toLowerCase().includes(s) ||
        r.status.toLowerCase().includes(s)
    )
  }, [stockRequests, search])

  // 3. Compute stats
  const pendingRequestsCount = useMemo(() => {
    return stockRequests.filter((r) => r.status === 'pending').length
  }, [stockRequests])

  const approvedRequestsCount = useMemo(() => {
    return stockRequests.filter((r) => r.status === 'approved').length
  }, [stockRequests])

  // Breadcrumbs configuration
  const crumbs = [
    { label: 'Dashboard', to: '/executive' },
    { label: 'Add Stock', to: '/executive/add-stock/new-purchase' },
    { label: 'Arrivals Log' },
  ]

  const headerActions = (
    <Button
      variant="contained"
      size="small"
      component={RouterLink}
      to="/executive/add-stock/on-arrival"
      startIcon={<LocalShippingRoundedIcon />}
      sx={{ borderRadius: 2 }}
    >
      Record Arrival
    </Button>
  )

  return (
    <Box className="flex flex-col gap-6">
      <PageHeader
        title="Arrivals Log"
        subtitle="History and status of your logged stock arrivals awaiting admin audit."
        crumbs={crumbs}
        action={headerActions}
      />

      {/* Stats Cards Section */}
      <Box className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          loading={isLoading}
          label="Total Arrival Requests"
          value={stockRequests.length.toLocaleString('en-IN')}
          icon={<Inventory2RoundedIcon />}
          hint="Total arrival notifications raised"
        />
        <StatCard
          loading={isLoading}
          label="Pending Approval"
          value={pendingRequestsCount.toLocaleString('en-IN')}
          icon={<PendingActionsRoundedIcon />}
          hint="Awaiting admin audit"
        />
        <StatCard
          loading={isLoading}
          label="Approved Arrivals"
          value={approvedRequestsCount.toLocaleString('en-IN')}
          icon={<CheckCircleRoundedIcon />}
          hint="Successfully injected into available stock"
        />
      </Box>

      {/* Arrivals Log Table Card */}
      <TableCard
        title="Arrival Requests History"
        count={filteredRequests.length}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search product or category..."
        height={500}
      >
        {isLoading ? (
          <Box className="flex justify-center items-center py-12" sx={{ color: 'var(--ink-400)' }}>
            Loading arrival requests...
          </Box>
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            icon={<LocalShippingRoundedIcon fontSize="inherit" />}
            title="No arrival requests"
            description={
              search
                ? `No arrival requests match "${search}"`
                : 'Arrival requests raised by you will appear here.'
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
                  <TableCell>Requested On</TableCell>
                  <TableCell>Product Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Adjustment Type</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell align="right">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.map((r) => (
                  <TableRow key={r.id} hover sx={{ '& td': { borderColor: 'var(--ink-100)', py: 1.5 } }}>
                    <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{formatDate(r.requestedOn)}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 700 }}>{r.productName}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{r.category}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-700)' }}>
                      +{r.requestedChange} cartons
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={TYPE_LABELS[r.type] || r.type}
                        sx={{ fontSize: 11.5 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5, color: 'var(--ink-600)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.notes}>
                      {r.sizeVariants && r.sizeVariants.length > 0
                        ? r.sizeVariants.map(v => `${v.size} (${v.stock} ${v.packingType || 'Cartoon'})`).join(', ')
                        : r.notes || '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        label={r.status}
                        variant="outlined"
                        color={r.status === 'approved' ? 'success' : r.status === 'pending' ? 'warning' : 'error'}
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

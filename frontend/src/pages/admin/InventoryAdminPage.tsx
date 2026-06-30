import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Box, Typography, Button, Chip, Tabs, Tab } from '@mui/material'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import AddBoxRoundedIcon from '@mui/icons-material/AddBoxRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import NewReleasesRoundedIcon from '@mui/icons-material/NewReleasesRounded'
import EmptyState from '@/components/common/EmptyState'
import StatCard from '@/components/admin/StatCard'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded'
import { useGetStockRequestsQuery, useUpdateStockRequestMutation } from '@/redux/api'
import { formatDate } from '@/utils/format'
import type { StockRequest, StockRequestType } from '@/types'
import toast from 'react-hot-toast'

type Filter = 'pending' | 'approved' | 'rejected'

const TYPE_META: Record<StockRequestType, { label: string; icon: ReactNode; color: string }> = {
  add: { label: 'Add stock', icon: <AddBoxRoundedIcon sx={{ fontSize: 18 }} />, color: 'var(--brand-600)' },
  update: { label: 'Update', icon: <EditRoundedIcon sx={{ fontSize: 18 }} />, color: '#2C6E8F' },
  new_product: { label: 'New product', icon: <NewReleasesRoundedIcon sx={{ fontSize: 18 }} />, color: '#C9842F' },
}

export default function InventoryAdminPage() {
  const { data: server } = useGetStockRequestsQuery()
  const [updateStockRequest] = useUpdateStockRequestMutation()
  const [filter, setFilter] = useState<Filter>('pending')

  const list = server || []

  const decide = async (r: StockRequest, status: 'approved' | 'rejected') => {
    try {
      await updateStockRequest({
        id: r.id,
        status,
        rejectionReason: status === 'rejected' ? 'Rejected by Admin' : undefined,
      }).unwrap()
      toast.success(`Request ${status}`)
    } catch (err: any) {
      toast.error(err?.data?.message || `Failed to ${status} request`)
    }
  }

  const filtered = useMemo(() => list.filter((r) => r.status === filter), [list, filter])
  const pendingCount = list.filter((r) => r.status === 'pending').length

  return (
    <Box className="flex flex-col gap-6">
      <Box className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Pending Requests" value={pendingCount.toString()} icon={<PendingActionsRoundedIcon />} hint="Awaiting approval" />
        <StatCard label="Total Requests" value={list.length.toString()} icon={<Inventory2RoundedIcon />} />
        <StatCard label="Approved" value={list.filter((r) => r.status === 'approved').length.toString()} icon={<CheckRoundedIcon />} />
      </Box>

      <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', bgcolor: '#fff', p: { xs: 2, md: 3 } }}>
        <Box className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>Stock approval requests</Typography>
          <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ minHeight: 38, '& .MuiTab-root': { minHeight: 38, py: 0 } }}>
            <Tab value="pending" label="Pending" />
            <Tab value="approved" label="Approved" />
            <Tab value="rejected" label="Rejected" />
          </Tabs>
        </Box>

        {filtered.length === 0 ? (
          <EmptyState icon={<Inventory2RoundedIcon fontSize="inherit" />} title={`No ${filter} requests`} description="Stock change requests raised by sales managers appear here for approval." />
        ) : (
          <Box className="flex flex-col gap-2.5 mt-2">
            {filtered.map((r) => {
              const t = TYPE_META[r.type]
              return (
                <Box
                  key={r.id}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 3, border: '1px solid var(--ink-200)', flexWrap: 'wrap' }}
                >
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'var(--ink-50)', color: t.color }}>
                    {t.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Box className="flex items-center gap-2 flex-wrap">
                      <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{r.productName}</Typography>
                      <Chip size="small" label={t.label} variant="outlined" />
                    </Box>
                    <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)' }}>
                      {r.category} · raised by {r.manager} · {formatDate(r.requestedOn)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', px: 2 }}>
                    <Typography sx={{ fontSize: 11.5, color: 'var(--ink-500)', fontWeight: 600 }}>CHANGE</Typography>
                    <Typography className="tnum" sx={{ fontWeight: 800, fontSize: 16, color: r.requestedChange >= 0 ? 'var(--brand-700)' : '#922A20' }}>
                      {r.requestedChange >= 0 ? '+' : ''}{r.requestedChange}
                    </Typography>
                  </Box>
                  {r.status === 'pending' ? (
                    <Box className="flex gap-2">
                      <Button size="small" variant="contained" startIcon={<CheckRoundedIcon />} onClick={() => decide(r, 'approved')}>
                        Approve
                      </Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<CloseRoundedIcon />} onClick={() => decide(r, 'rejected')}>
                        Reject
                      </Button>
                    </Box>
                  ) : (
                    <Chip size="small" label={r.status} color={r.status === 'approved' ? 'success' : 'error'} variant="outlined" />
                  )}
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    </Box>
  )
}

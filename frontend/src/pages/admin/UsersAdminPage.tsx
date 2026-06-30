import { useEffect, useMemo, useState } from 'react'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import {
  Box,
  Typography,
  Button,
  Avatar,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Tab,
  Tabs,
} from '@mui/material'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import PauseCircleRoundedIcon from '@mui/icons-material/PauseCircleRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import TableCard from '@/components/admin/TableCard'
import { gridSx } from '@/components/admin/gridStyles'
import {
  useGetAdminUsersQuery,
  useUpdateUserStatusMutation,
  useVerifyUserKycMutation,
  useGetAdminUserDocumentsQuery,
} from '@/redux/api'
import { formatMoney, initials } from '@/utils/format'
import type { AdminUser, AccountStatus } from '@/types'
import toast from 'react-hot-toast'

const STATUS_META: Record<AccountStatus, { label: string; color: 'success' | 'warning' | 'error' | 'info' }> = {
  active: { label: 'Active', color: 'success' },
  suspended: { label: 'Suspended', color: 'warning' },
  blocked: { label: 'Blocked', color: 'error' },
  pending: { label: 'Pending', color: 'info' },
}

export default function UsersAdminPage() {
  const { data: serverUsers, isLoading } = useGetAdminUsersQuery()
  const [updateUserStatus] = useUpdateUserStatusMutation()
  const [verifyUserKyc] = useVerifyUserKycMutation()

  const [currentTab, setCurrentTab] = useState<'customer' | 'staff'>('customer')
  const [search, setSearch] = useState('')
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [active, setActive] = useState<AdminUser | null>(null)
  const [docViewerOpen, setDocViewerOpen] = useState(false)

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    const list = serverUsers || []
    
    const tabFiltered = list.filter((u) => {
      if (currentTab === 'customer') {
        return u.role === 'customer' || !u.role
      } else {
        return u.role === 'executive' || u.role === 'manager'
      }
    })

    return tabFiltered.filter((u) => u.name.toLowerCase().includes(s) || u.company.toLowerCase().includes(s) || u.email.toLowerCase().includes(s))
  }, [serverUsers, search, currentTab])

  const setStatus = async (u: AdminUser, status: AccountStatus) => {
    try {
      await updateUserStatus({ id: u.id, status }).unwrap()
      toast.success(`${u.company} ${STATUS_META[status].label.toLowerCase()}`)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update user status')
    }
  }

  const verifyDocs = async (u: AdminUser) => {
    try {
      await verifyUserKyc({ id: u.id, kycVerified: true }).unwrap()
      toast.success(`Documents verified for ${u.company}`)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to verify documents')
    }
  }

  const columns: GridColDef<AdminUser>[] = [
    {
      field: 'company',
      headerName: 'Business',
      flex: 1,
      minWidth: 240,
      renderCell: (p) => (
        <Box className="flex items-center gap-2" sx={{ height: '100%' }}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: 'var(--brand-600)', fontSize: 13 }}>{initials(p.row.name)}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.2 }}>{p.row.company}</Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--ink-500)' }}>{p.row.name} · {p.row.city}</Typography>
          </Box>
        </Box>
      ),
    },
    { field: 'email', headerName: 'Contact', width: 200, renderCell: (p) => (
      <Box>
        <Typography sx={{ fontSize: 13 }}>{p.row.email}</Typography>
        <Typography sx={{ fontSize: 12, color: 'var(--ink-500)' }} className="tnum">{p.row.mobile}</Typography>
      </Box>
    ) },
    { field: 'ordersCount', headerName: 'Orders', width: 90, renderCell: (p) => <span className="tnum">{p.row.ordersCount}</span> },
    { field: 'totalSpend', headerName: 'Total Spend', width: 130, renderCell: (p) => <span className="tnum" style={{ fontWeight: 700 }}>{formatMoney(p.row.totalSpend)}</span> },
    {
      field: 'docStatus',
      headerName: 'Docs',
      width: 110,
      renderCell: (p) => (
        <Chip
          size="small"
          icon={p.row.docStatus === 'verified' ? <VerifiedRoundedIcon sx={{ fontSize: 14 }} /> : undefined}
          label={p.row.docStatus === 'verified' ? 'Verified' : 'Pending'}
          color={p.row.docStatus === 'verified' ? 'success' : 'warning'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (p) => {
        const m = STATUS_META[p.row.status] || { label: p.row.status || 'Pending', color: 'info' }
        return <Chip size="small" label={m.label} color={m.color} variant="outlined" />
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 56,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: (p) => (
        <Button size="small" sx={{ minWidth: 0, p: 1 }} onClick={(e) => { setActive(p.row); setMenuAnchor(e.currentTarget) }}>
          <MoreVertRoundedIcon fontSize="small" />
        </Button>
      ),
    },
  ]

  const staffColumns: GridColDef<AdminUser>[] = [
    {
      field: 'name',
      headerName: 'Staff Member',
      flex: 1,
      minWidth: 200,
      renderCell: (p) => (
        <Box className="flex items-center gap-2" sx={{ height: '100%' }}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: 'var(--brand-700)', fontSize: 13 }}>{initials(p.row.name)}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.2 }}>{p.row.name}</Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--ink-500)' }}>
              {p.row.role ? p.row.role.toUpperCase() : 'STAFF'} · {p.row.city || 'Agriport'}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { field: 'email', headerName: 'Contact', width: 220, renderCell: (p) => (
      <Box>
        <Typography sx={{ fontSize: 13 }}>{p.row.email}</Typography>
        <Typography sx={{ fontSize: 12, color: 'var(--ink-500)' }} className="tnum">{p.row.mobile}</Typography>
      </Box>
    ) },
    {
      field: 'role',
      headerName: 'Role',
      width: 140,
      renderCell: (p) => (
        <Chip
          size="small"
          label={p.row.role ? p.row.role.toUpperCase() : 'STAFF'}
          color={p.row.role === 'manager' ? 'primary' : 'secondary'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (p) => {
        const m = STATUS_META[p.row.status] || { label: p.row.status || 'Pending', color: 'info' }
        return <Chip size="small" label={m.label} color={m.color} variant="outlined" />
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 56,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: (p) => (
        <Button size="small" sx={{ minWidth: 0, p: 1 }} onClick={(e) => { setActive(p.row); setMenuAnchor(e.currentTarget) }}>
          <MoreVertRoundedIcon fontSize="small" />
        </Button>
      ),
    },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff', px: 2, pt: 0.5, borderRadius: 3 }}>
        <Tabs value={currentTab} onChange={(_, val) => setCurrentTab(val)} textColor="inherit" indicatorColor="primary">
          <Tab value="customer" label="Customers" sx={{ fontWeight: 700, fontSize: 13.5, textTransform: 'none' }} />
          <Tab value="staff" label="Staff Profiles" sx={{ fontWeight: 700, fontSize: 13.5, textTransform: 'none' }} />
        </Tabs>
      </Box>

      <TableCard
        title={currentTab === 'customer' ? 'Customers' : 'Staff Directory'}
        count={filtered.length}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={currentTab === 'customer' ? 'Search by name, company, email…' : 'Search by name, email…'}
      >
        <DataGrid
          rows={filtered}
          columns={currentTab === 'customer' ? columns : staffColumns}
          loading={isLoading}
          rowHeight={62}
          disableRowSelectionOnClick
          disableColumnMenu
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={gridSx}
        />
      </TableCard>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {active?.role !== 'manager' && (
          <MenuItem onClick={() => { setDocViewerOpen(true); setMenuAnchor(null) }}>
            <ListItemIcon><VerifiedRoundedIcon fontSize="small" /></ListItemIcon>
            View documents
          </MenuItem>
        )}
        {active?.role !== 'manager' && active?.docStatus === 'pending' && (
          <MenuItem onClick={() => { if (active) verifyDocs(active); setMenuAnchor(null) }}>
            <ListItemIcon><VerifiedRoundedIcon fontSize="small" /></ListItemIcon>
            Verify documents
          </MenuItem>
        )}
        {active?.status !== 'active' && (
          <MenuItem onClick={() => { if (active) setStatus(active, 'active'); setMenuAnchor(null) }}>
            <ListItemIcon><CheckCircleRoundedIcon fontSize="small" /></ListItemIcon>
            Activate
          </MenuItem>
        )}
        {active?.status === 'active' && (
          <MenuItem onClick={() => { if (active) setStatus(active, 'suspended'); setMenuAnchor(null) }}>
            <ListItemIcon><PauseCircleRoundedIcon fontSize="small" /></ListItemIcon>
            Suspend
          </MenuItem>
        )}
        {active?.status !== 'blocked' && (
          <MenuItem sx={{ color: '#C0392B' }} onClick={() => { if (active) setStatus(active, 'blocked'); setMenuAnchor(null) }}>
            <ListItemIcon><BlockRoundedIcon fontSize="small" sx={{ color: 'inherit' }} /></ListItemIcon>
            Block account
          </MenuItem>
        )}
      </Menu>

      <DocumentViewerDialog
        open={docViewerOpen}
        userId={active?.id || ''}
        onClose={() => setDocViewerOpen(false)}
      />
    </Box>
  )
}

interface DocViewerProps {
  open: boolean
  userId: string
  onClose: () => void
}

function DocumentViewerDialog({ open, userId, onClose }: DocViewerProps) {
  const { data: documents, isLoading } = useGetAdminUserDocumentsQuery(userId, { skip: !userId })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 16 }}>
        Business Documents
        <IconButton size="small" onClick={onClose}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        {isLoading ? (
          <Box className="flex justify-center py-6">
            <CircularProgress size={24} />
          </Box>
        ) : !documents || documents.length === 0 ? (
          <Typography sx={{ py: 3, textAlign: 'center', color: 'var(--ink-500)', fontSize: 13.5 }}>
            No documents uploaded yet.
          </Typography>
        ) : (
          <List disablePadding>
            {documents.map((doc) => (
              <ListItem
                key={doc.id}
                sx={{
                  border: '1px solid var(--ink-200)',
                  borderRadius: 2.5,
                  mb: 1.5,
                  p: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  '&:last-child': { mb: 0 },
                }}
              >
                <ListItemText
                  primary={<Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{doc.name}</Typography>}
                  secondary={
                    <Typography component="span" sx={{ fontSize: 11.5, display: 'block', mt: 0.25 }}>
                      Status:{' '}
                      <Typography component="span" sx={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontSize: 10.5,
                        color: doc.status === 'verified' ? 'success.main' : doc.status === 'pending' ? 'warning.main' : 'error.main'
                      }}>
                        {doc.status}
                      </Typography>
                    </Typography>
                  }
                />
                {doc.fileUrl ? (
                  <IconButton
                    component="a"
                    href={doc.fileUrl.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'}${doc.fileUrl}` : doc.fileUrl}
                    target="_blank"
                    size="small"
                    sx={{ color: 'var(--brand-700)' }}
                  >
                    <OpenInNewRoundedIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="contained" size="small" sx={{ borderRadius: 2.5 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

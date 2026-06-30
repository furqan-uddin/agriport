import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Avatar,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
} from '@mui/material'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import HubRoundedIcon from '@mui/icons-material/HubRounded'
import EmptyState from '@/components/common/EmptyState'
import {
  useGetManagersQuery,
  useCreateManagerMutation,
  useGetSalesSettingsQuery,
  useUpdateSalesSettingsMutation,
  useGetExecutiveApprovalsQuery,
  useGetAdminExecutivesQuery,
  useUpdateUserTargetMutation,
  useApproveExecutiveMutation,
  useAssignManagerMutation,
} from '@/redux/api'
import { formatMoneyCompact, formatDate, initials } from '@/utils/format'
import type { ExecutiveApproval } from '@/types'
import toast from 'react-hot-toast'

function SectionCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
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

export default function SalesAdminPage() {
  const { data: managers } = useGetManagersQuery()
  const { data: serverApprovals } = useGetExecutiveApprovalsQuery()
  const { data: settings } = useGetSalesSettingsQuery()
  const [updateSalesSettings, { isLoading: isUpdatingSettings }] = useUpdateSalesSettingsMutation()

  const { data: executives } = useGetAdminExecutivesQuery()
  const [approveExecutive] = useApproveExecutiveMutation()
  const [assignManager] = useAssignManagerMutation()
  
  const [assignManagerOpen, setAssignManagerOpen] = useState(false)
  const [assignManagerUser, setAssignManagerUser] = useState<{ id: string; name: string; managerId: string } | null>(null)

  const handleOpenAssignManager = (id: string, name: string, currentManagerId?: string) => {
    setAssignManagerUser({ id, name, managerId: currentManagerId || '' })
    setAssignManagerOpen(true)
  }

  const [editTargetOpen, setEditTargetOpen] = useState(false)
  const [editTargetUser, setEditTargetUser] = useState<{ id: string; name: string; target: number; role: 'manager' | 'executive' } | null>(null)

  const handleOpenEditTarget = (id: string, name: string, target: number, role: 'manager' | 'executive') => {
    setEditTargetUser({ id, name, target, role })
    setEditTargetOpen(true)
  }

  const [approvals, setApprovals] = useState<ExecutiveApproval[]>([])
  const [commission, setCommission] = useState(5)
  const [override, setOverride] = useState(2)
  const [gstRate, setGstRate] = useState(5)
  const [shippingThreshold, setShippingThreshold] = useState(50000)
  const [baseShipping, setBaseShipping] = useState(1500)
  const [addManagerOpen, setAddManagerOpen] = useState(false)

  useEffect(() => {
    if (serverApprovals) setApprovals(serverApprovals)
  }, [serverApprovals])

  useEffect(() => {
    if (settings) {
      setCommission(settings.commission)
      setOverride(settings.override)
      setGstRate(settings.gstRate ?? 5)
      setShippingThreshold(settings.shippingThreshold ?? 50000)
      setBaseShipping(settings.baseShipping ?? 1500)
    }
  }, [settings])

  const handleSaveSettings = async () => {
    try {
      await updateSalesSettings({ commission, override, gstRate, shippingThreshold, baseShipping }).unwrap()
      toast.success('System settings saved')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save settings')
    }
  }

  const decide = async (e: ExecutiveApproval, status: 'approved' | 'rejected') => {
    try {
      const backendStatus = status === 'approved' ? 'active' : 'blocked'
      await approveExecutive({ id: e.id, status: backendStatus }).unwrap()
      toast.success(`${e.name} ${status}`)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update approval status')
    }
  }

  const pending = approvals.filter((a) => a.status === 'pending')

  return (
    <Box className="flex flex-col gap-6">
      {/* Managers */}
      <SectionCard title="Sales managers" subtitle="Team performance vs. monthly target" action={<Button variant="contained" size="small" onClick={() => setAddManagerOpen(true)}>Add manager</Button>}>
        <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {managers?.map((m) => {
            const pct = Math.min(100, Math.round((m.revenue / m.target) * 100))
            return (
              <Box key={m.id} sx={{ p: 2.5, borderRadius: 3, border: '1px solid var(--ink-200)' }}>
                <Box className="flex items-center gap-2 mb-2.5">
                  <Avatar sx={{ width: 42, height: 42, bgcolor: 'var(--brand-700)', fontSize: 14 }}>{initials(m.name)}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{m.name}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{m.region} region · {m.teamSize} executives</Typography>
                  </Box>
                  <Chip size="small" label={m.status} color={m.status === 'active' ? 'success' : 'warning'} variant="outlined" />
                </Box>
                <Box className="flex justify-between items-baseline mb-1">
                  <Typography className="tnum" sx={{ fontWeight: 800, fontSize: 18, fontFamily: '"Bricolage Grotesque", serif' }}>
                    {formatMoneyCompact(m.revenue)}
                  </Typography>
                  <Box className="flex items-center gap-1">
                    <Typography className="tnum" sx={{ fontSize: 12.5, color: 'var(--ink-500)' }}>
                      of {formatMoneyCompact(m.target)} · {pct}%
                    </Typography>
                    <IconButton size="small" onClick={() => handleOpenEditTarget(m.id, m.name, m.target, 'manager')} sx={{ p: 0.5 }}>
                      <EditRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{ height: 7, borderRadius: 99, bgcolor: 'var(--ink-100)', '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: pct >= 90 ? 'var(--brand-500)' : '#C9842F' } }}
                />
              </Box>
            )
          })}
        </Box>
      </SectionCard>

      <Box className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Executive approvals */}
        <Box className="lg:col-span-2">
          <SectionCard title="Executive approvals" subtitle="New executives created by managers, awaiting your approval">
            {pending.length === 0 ? (
              <EmptyState icon={<PersonRoundedIcon fontSize="inherit" />} title="No pending approvals" description="New executive requests will appear here." />
            ) : (
              <Box className="flex flex-col gap-2.5">
                {pending.map((e) => (
                  <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 3, border: '1px solid var(--ink-200)' }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'var(--ink-200)', color: 'var(--ink-700)', fontSize: 13 }}>{initials(e.name)}</Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{e.name}</Typography>
                      <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)', mb: 1 }}>
                        Manager: {e.manager} · {e.region} · {formatDate(e.requestedOn)}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {e.aadharUrl && (
                          <Button
                            size="small"
                            variant="outlined"
                            component="a"
                            href={e.aadharUrl.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'}${e.aadharUrl}` : e.aadharUrl}
                            target="_blank"
                            sx={{ textTransform: 'none', borderRadius: 2, py: 0.25 }}
                          >
                            Aadhaar Card
                          </Button>
                        )}
                        {e.panUrl && (
                          <Button
                            size="small"
                            variant="outlined"
                            component="a"
                            href={e.panUrl.startsWith('/uploads/') ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'}${e.panUrl}` : e.panUrl}
                            target="_blank"
                            sx={{ textTransform: 'none', borderRadius: 2, py: 0.25 }}
                          >
                            PAN Card
                          </Button>
                        )}
                      </Box>
                    </Box>
                    <Button size="small" variant="contained" startIcon={<CheckRoundedIcon />} onClick={() => decide(e, 'approved')}>
                      Approve
                    </Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<CloseRoundedIcon />} onClick={() => decide(e, 'rejected')}>
                      Reject
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </SectionCard>
        </Box>

        {/* System Settings config */}
        <SectionCard title="System Settings" subtitle="Dynamic tax, shipping & commissions">
          <Box className="flex flex-col gap-3">
            <TextField
              label="Sales commission"
              type="number"
              value={commission}
              onChange={(e) => setCommission(Number(e.target.value))}
              size="small"
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
            />
            <TextField
              label="Manager override"
              type="number"
              value={override}
              onChange={(e) => setOverride(Number(e.target.value))}
              size="small"
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
            />
            <TextField
              label="Sales GST Rate"
              type="number"
              value={gstRate}
              onChange={(e) => setGstRate(Number(e.target.value))}
              size="small"
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
            />
            <TextField
              label="Shipping Threshold"
              type="number"
              value={shippingThreshold}
              onChange={(e) => setShippingThreshold(Number(e.target.value))}
              size="small"
              slotProps={{ input: { endAdornment: <InputAdornment position="end">₹</InputAdornment> } }}
            />
            <TextField
              label="Default Shipping Charge"
              type="number"
              value={baseShipping}
              onChange={(e) => setBaseShipping(Number(e.target.value))}
              size="small"
              slotProps={{ input: { endAdornment: <InputAdornment position="end">₹</InputAdornment> } }}
            />
            <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'var(--brand-50)', border: '1px solid #9DD4BC' }}>
              <Typography sx={{ fontSize: 12.5, color: 'var(--brand-800)', mb: 0.5 }}>
                • Executives earn <strong>{commission}%</strong> on personal sales. Managers receive <strong>{override}%</strong> override.
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'var(--brand-800)' }}>
                • GST is applied at <strong>{gstRate}%</strong>. Shipping of <strong>₹{baseShipping}</strong> is free on orders above <strong>₹{shippingThreshold.toLocaleString('en-IN')}</strong>.
              </Typography>
            </Box>
            <Button variant="contained" onClick={handleSaveSettings} disabled={isUpdatingSettings}>
              {isUpdatingSettings ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </SectionCard>
      </Box>

      {/* Executives */}
      <SectionCard title="Sales executives" subtitle="Executive performance vs. monthly target">
        <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {executives?.map((e: any) => {
            const pct = Math.min(100, Math.round(((e.revenue || 0) / (e.target || 150000)) * 100))
            return (
              <Box key={e.id} sx={{ p: 2.5, borderRadius: 3, border: '1px solid var(--ink-200)' }}>
                <Box className="flex items-center gap-2 mb-2.5">
                  <Avatar sx={{ width: 42, height: 42, bgcolor: 'var(--brand-600)', fontSize: 14 }}>{initials(e.name)}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box className="flex items-center gap-1.5">
                      <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{e.name}</Typography>
                      <Chip size="small" label={e.status} color={e.status === 'active' ? 'success' : e.status === 'pending' ? 'warning' : 'default'} variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                    </Box>
                    <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)' }}>
                      Manager: {e.managerName} · {e.region} region
                    </Typography>
                  </Box>
                </Box>
                <Box className="flex justify-between items-baseline mb-1">
                  <Typography className="tnum" sx={{ fontWeight: 800, fontSize: 18, fontFamily: '"Bricolage Grotesque", serif' }}>
                    {formatMoneyCompact(e.revenue || 0)}
                  </Typography>
                  <Box className="flex items-center gap-1">
                    <Typography className="tnum" sx={{ fontSize: 12.5, color: 'var(--ink-500)' }}>
                      of {formatMoneyCompact(e.target || 0)} · {pct}%
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenAssignManager(e.id, e.name, e.managerId)}
                      sx={{ p: 0.5, color: 'var(--brand-700)' }}
                      title="Assign Manager"
                    >
                      <HubRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEditTarget(e.id, e.name, e.target || 0, 'executive')}
                      sx={{ p: 0.5 }}
                      title="Set Target"
                    >
                      <EditRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{ height: 7, borderRadius: 99, bgcolor: 'var(--ink-100)', '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: pct >= 90 ? 'var(--brand-500)' : '#C9842F' } }}
                />
              </Box>
            )
          })}
          {(!executives || executives.length === 0) && (
            <Box className="col-span-full">
              <EmptyState icon={<PersonRoundedIcon fontSize="inherit" />} title="No executives found" description="Active executives will appear here." />
            </Box>
          )}
        </Box>
      </SectionCard>

      <AddManagerDialog open={addManagerOpen} onClose={() => setAddManagerOpen(false)} />
      {editTargetUser && (
        <EditTargetDialog
          open={editTargetOpen}
          onClose={() => setEditTargetOpen(false)}
          userId={editTargetUser.id}
          userName={editTargetUser.name}
          currentTarget={editTargetUser.target}
          userRole={editTargetUser.role}
        />
      )}
      {assignManagerUser && (
        <AssignManagerDialog
          open={assignManagerOpen}
          onClose={() => setAssignManagerOpen(false)}
          executiveId={assignManagerUser.id}
          executiveName={assignManagerUser.name}
          currentManagerId={assignManagerUser.managerId}
          managers={managers || []}
        />
      )}
    </Box>
  )
}

interface EditTargetDialogProps {
  open: boolean
  onClose: () => void
  userId: string
  userName: string
  currentTarget: number
  userRole: 'manager' | 'executive'
}

function EditTargetDialog({
  open,
  onClose,
  userId,
  userName,
  currentTarget,
  userRole,
}: EditTargetDialogProps) {
  const [updateUserTarget, { isLoading }] = useUpdateUserTargetMutation()
  const [target, setTarget] = useState('')

  useEffect(() => {
    if (open) {
      setTarget(currentTarget.toString())
    }
  }, [open, currentTarget])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!target || isNaN(Number(target)) || Number(target) < 0) {
      toast.error('Please enter a valid target amount')
      return
    }
    try {
      await updateUserTarget({ userId, target: Number(target) }).unwrap()
      toast.success(`${userRole === 'manager' ? 'Manager' : 'Executive'} target updated successfully`)
      onClose()
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update target')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Set Monthly Target</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ fontSize: 14, color: 'var(--ink-600)', mb: 2 }}>
            Set monthly sales target for <strong>{userName}</strong> ({userRole}).
          </Typography>
          <TextField
            label="Monthly Target"
            type="number"
            size="small"
            required
            fullWidth
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} size="small">Cancel</Button>
          <Button type="submit" variant="contained" size="small" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Save Target'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

interface AddManagerDialogProps {
  open: boolean
  onClose: () => void
}

function AddManagerDialog({ open, onClose }: AddManagerDialogProps) {
  const [createManager, { isLoading }] = useCreateManagerMutation()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    region: '',
    target: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.mobile || !formData.password || !formData.region) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      await createManager({
        ...formData,
        target: Number(formData.target) || 0,
      }).unwrap()
      toast.success('Sales Manager created successfully')
      setFormData({ name: '', email: '', mobile: '', password: '', region: '', target: '' })
      onClose()
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to create manager')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add Sales Manager</DialogTitle>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'col', gap: 2 }}>
          <Box className="flex flex-col gap-4 w-full">
            <TextField
              label="Name"
              size="small"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              sx={{ mt: 1 }}
            />
            <TextField
              label="Email"
              type="email"
              size="small"
              required
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            />
            <TextField
              label="Mobile"
              size="small"
              required
              fullWidth
              value={formData.mobile}
              onChange={(e) => setFormData((prev) => ({ ...prev, mobile: e.target.value }))}
            />
            <TextField
              label="Password"
              type="password"
              size="small"
              required
              fullWidth
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            />
            <TextField
              label="Region"
              size="small"
              required
              fullWidth
              value={formData.region}
              placeholder="e.g. North, West"
              onChange={(e) => setFormData((prev) => ({ ...prev, region: e.target.value }))}
            />
            <TextField
              label="Monthly Target"
              type="number"
              size="small"
              fullWidth
              value={formData.target}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }}
              onChange={(e) => setFormData((prev) => ({ ...prev, target: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} size="small">Cancel</Button>
          <Button type="submit" variant="contained" size="small" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

interface AssignManagerDialogProps {
  open: boolean
  onClose: () => void
  executiveId: string
  executiveName: string
  currentManagerId: string
  managers: any[]
}

function AssignManagerDialog({
  open,
  onClose,
  executiveId,
  executiveName,
  currentManagerId,
  managers,
}: AssignManagerDialogProps) {
  const [assignManager, { isLoading }] = useAssignManagerMutation()
  const [selectedManagerId, setSelectedManagerId] = useState('')

  useEffect(() => {
    if (open) {
      setSelectedManagerId(currentManagerId || '')
    }
  }, [open, currentManagerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await assignManager({ executiveId, managerId: selectedManagerId }).unwrap()
      toast.success('Manager assigned successfully')
      onClose()
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to assign manager')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Assign Sales Manager</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ fontSize: 14, color: 'var(--ink-600)', mb: 2 }}>
            Select a Sales Manager for executive <strong>{executiveName}</strong>.
          </Typography>
          <TextField
            select
            label="Sales Manager"
            size="small"
            fullWidth
            value={selectedManagerId}
            onChange={(e) => setSelectedManagerId(e.target.value)}
          >
            <MenuItem value="">Unassigned (None)</MenuItem>
            {managers.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name} ({m.region})
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} size="small">Cancel</Button>
          <Button type="submit" variant="contained" size="small" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Assignment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

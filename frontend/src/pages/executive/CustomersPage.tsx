import { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
  Avatar,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  MenuItem,
  IconButton,
} from '@mui/material'
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import SectionCard from '@/components/common/SectionCard'
import {
  useGetCrmCustomersQuery,
  useGetFollowUpsQuery,
  useCreateCrmCustomerMutation,
  useUpdateFollowUpMutation,
  useCreateFollowUpMutation,
  useDeleteFollowUpMutation,
} from '@/redux/api'
import { useAppSelector } from '@/redux/hooks'
import { formatMoney, fromNow, initials } from '@/utils/format'
import type { CRMCustomer, CustomerStage } from '@/types'
import toast from 'react-hot-toast'

const STAGE_META: Record<CustomerStage, { label: string; color: 'success' | 'info' | 'warning' | 'default' }> = {
  active: { label: 'Active', color: 'success' },
  prospect: { label: 'Prospect', color: 'info' },
  lead: { label: 'Lead', color: 'warning' },
  dormant: { label: 'Dormant', color: 'default' },
}

export default function CustomersPage() {
  const currentUser = useAppSelector((s) => s.auth.user)
  const { data: customers = [], isLoading: isLoadingCustomers } = useGetCrmCustomersQuery()
  const { data: followUps = [], isLoading: isLoadingFollowUps } = useGetFollowUpsQuery()

  const [createCrmCustomer, { isLoading: isCreatingCustomer }] = useCreateCrmCustomerMutation()
  const [updateFollowUp] = useUpdateFollowUpMutation()
  const [createFollowUp, { isLoading: isCreatingFollowUp }] = useCreateFollowUpMutation()
  const [deleteFollowUp] = useDeleteFollowUpMutation()

  const [open, setOpen] = useState(false)
  const [openFollowUp, setOpenFollowUp] = useState(false)
  
  const [form, setForm] = useState({ name: '', company: '', phone: '+91', city: '', gst: '' })
  const [fuForm, setFuForm] = useState({ crmCustomerId: '', type: 'call', dueAt: '', note: '' })

  const toggle = async (id: string, currentDone: boolean) => {
    try {
      await updateFollowUp({ id, isDone: !currentDone }).unwrap()
      toast.success('Follow-up task updated')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update follow-up')
    }
  }

  const deleteTask = async (id: string) => {
    try {
      await deleteFollowUp(id).unwrap()
      toast.success('Follow-up task deleted')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete follow-up')
    }
  }

  const addCustomer = async () => {
    try {
      await createCrmCustomer({
        name: form.name.trim(),
        company: form.company.trim(),
        phone: form.phone.trim(),
        city: form.city.trim() || '',
        gst: form.gst.trim() || undefined,
      }).unwrap()
      toast.success('Customer added as a new lead')
      setOpen(false)
      setForm({ name: '', company: '', phone: '+91', city: '', gst: '' })
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to add customer')
    }
  }

  const addFollowUp = async () => {
    if (!fuForm.crmCustomerId || !fuForm.dueAt) return
    try {
      await createFollowUp({
        crmCustomerId: fuForm.crmCustomerId,
        type: fuForm.type,
        dueAt: new Date(fuForm.dueAt).toISOString(),
        note: fuForm.note.trim() || undefined,
      }).unwrap()
      toast.success('Follow-up task scheduled successfully')
      setOpenFollowUp(false)
      setFuForm({ crmCustomerId: '', type: 'call', dueAt: '', note: '' })
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to schedule follow-up')
    }
  }

  return (
    <Box className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Box className="lg:col-span-2">
        <SectionCard
          title="My customers"
          subtitle={isLoadingCustomers ? 'Loading...' : `${customers.length} relationships`}
          action={
            <Button
              variant="contained"
              startIcon={<PersonAddRoundedIcon />}
              onClick={() => setOpen(true)}
            >
              Add customer
            </Button>
          }
          padded={false}
        >
          <Box sx={{ px: 3, pb: 1, minHeight: 100, display: 'flex', flexDirection: 'column', justifyContent: isLoadingCustomers ? 'center' : 'flex-start', alignItems: isLoadingCustomers ? 'center' : 'stretch' }}>
            {isLoadingCustomers ? (
              <CircularProgress size={30} sx={{ my: 4 }} />
            ) : customers.length === 0 ? (
              <Typography sx={{ py: 4, textAlign: 'center', color: 'var(--ink-400)', fontSize: 14 }}>
                No customers assigned yet. Add one to get started.
              </Typography>
            ) : (
              customers.map((c, i) => {
                const m = STAGE_META[c.stage]
                return (
                  <Box
                    key={c.id}
                    className="flex items-center gap-3"
                    sx={{ py: 1.75, borderTop: i === 0 ? 'none' : '1px solid var(--ink-100)' }}
                  >
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'var(--brand-600)', fontSize: 13 }}>
                      {initials(c.name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{c.company || c.name}</Typography>
                      <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)' }} className="tnum">
                        {c.name} · {c.city || '—'} · {c.phone || '—'}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                      <Typography className="tnum" sx={{ fontWeight: 700, fontSize: 13.5 }}>
                        {formatMoney(c.value)}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: 'var(--ink-400)' }}>
                        last: {c.lastContact ? fromNow(c.lastContact) : 'never'}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={m.label}
                      color={m.color === 'default' ? 'default' : m.color}
                      variant={m.color === 'default' ? 'filled' : 'outlined'}
                    />
                  </Box>
                )
              })
            )}
          </Box>
        </SectionCard>
      </Box>

      <Box>
        <SectionCard
          title="Follow-ups"
          subtitle="Scheduled touchpoints"
          action={
            customers.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<CalendarMonthRoundedIcon fontSize="small" />}
                onClick={() => {
                  setFuForm({
                    crmCustomerId: customers[0].id,
                    type: 'call',
                    dueAt: new Date().toISOString().split('T')[0],
                    note: '',
                  })
                  setOpenFollowUp(true)
                }}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Schedule
              </Button>
            )
          }
        >
          <Box className="flex flex-col min-height-100" sx={{ display: 'flex', justifyContent: isLoadingFollowUps ? 'center' : 'flex-start', alignItems: isLoadingFollowUps ? 'center' : 'stretch' }}>
            {isLoadingFollowUps ? (
              <CircularProgress size={24} sx={{ my: 3 }} />
            ) : followUps.length === 0 ? (
              <Typography sx={{ py: 3, textAlign: 'center', color: 'var(--ink-400)', fontSize: 13 }}>
                No scheduled follow-up tasks.
              </Typography>
            ) : (
              followUps.map((f, i) => (
                <Box
                  key={f.id}
                  className="flex items-start gap-1.5"
                  sx={{ py: 1.25, borderTop: i === 0 ? 'none' : '1px solid var(--ink-100)' }}
                >
                  <Checkbox
                    checked={f.done}
                    onChange={() => toggle(f.id, f.done)}
                    size="small"
                    sx={{ p: 0.5, mt: 0.25 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: 13.5,
                        textDecoration: f.done ? 'line-through' : 'none',
                        color: f.done ? 'var(--ink-400)' : 'var(--ink-900)',
                      }}
                    >
                      {f.company || f.customer}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{f.note}</Typography>
                    <Typography
                      sx={{ fontSize: 11.5, color: 'var(--ink-400)', textTransform: 'capitalize' }}
                      className="tnum"
                    >
                      {f.type} · {fromNow(f.dueOn)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => deleteTask(f.id)}
                    sx={{ color: 'var(--ink-400)', '&:hover': { color: 'error.main' } }}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))
            )}
          </Box>
        </SectionCard>
      </Box>

      {/* Add Customer Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: '"Bricolage Grotesque", serif', fontWeight: 700 }}>Add customer</DialogTitle>
        <DialogContent dividers>
          <Box className="flex flex-col gap-3 pt-1">
            <TextField
              label="Person name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              size="small"
              autoFocus
              disabled={isCreatingCustomer}
            />
            <TextField
              label="GST (Optional)"
              value={form.gst}
              onChange={(e) => setForm((f) => ({ ...f, gst: e.target.value }))}
              size="small"
              disabled={isCreatingCustomer}
            />
            <TextField
              label="Company name"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              size="small"
              disabled={isCreatingCustomer}
            />
            <TextField
              label="Address / City"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              size="small"
              disabled={isCreatingCustomer}
            />
            <TextField
              label="Phone number"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              size="small"
              disabled={isCreatingCustomer}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} variant="outlined" disabled={isCreatingCustomer}>
            Cancel
          </Button>
          <Button
            onClick={addCustomer}
            variant="contained"
            disabled={!form.name.trim() || !form.company.trim() || isCreatingCustomer}
          >
            {isCreatingCustomer ? 'Adding...' : 'Add customer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Follow-up Dialog */}
      <Dialog open={openFollowUp} onClose={() => setOpenFollowUp(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: '"Bricolage Grotesque", serif', fontWeight: 700 }}>
          Schedule Follow-up
        </DialogTitle>
        <DialogContent dividers>
          <Box className="flex flex-col gap-3 pt-1">
            <TextField
              label="Select Customer"
              size="small"
              select
              fullWidth
              value={fuForm.crmCustomerId}
              onChange={(e) => setFuForm((f) => ({ ...f, crmCustomerId: e.target.value }))}
              disabled={isCreatingFollowUp}
            >
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.company || c.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Type"
              size="small"
              select
              fullWidth
              value={fuForm.type}
              onChange={(e) => setFuForm((f) => ({ ...f, type: e.target.value }))}
              disabled={isCreatingFollowUp}
            >
              <MenuItem value="call">Call</MenuItem>
              <MenuItem value="meeting">Meeting</MenuItem>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="whatsapp">WhatsApp</MenuItem>
            </TextField>

            <TextField
              label="Due Date"
              type="date"
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={fuForm.dueAt}
              onChange={(e) => setFuForm((f) => ({ ...f, dueAt: e.target.value }))}
              disabled={isCreatingFollowUp}
            />

            <TextField
              label="Reminder Note"
              size="small"
              fullWidth
              multiline
              rows={2}
              value={fuForm.note}
              onChange={(e) => setFuForm((f) => ({ ...f, note: e.target.value }))}
              disabled={isCreatingFollowUp}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenFollowUp(false)} variant="outlined" disabled={isCreatingFollowUp}>
            Cancel
          </Button>
          <Button
            onClick={addFollowUp}
            variant="contained"
            disabled={!fuForm.crmCustomerId || !fuForm.dueAt || isCreatingFollowUp}
          >
            {isCreatingFollowUp ? 'Scheduling...' : 'Schedule task'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

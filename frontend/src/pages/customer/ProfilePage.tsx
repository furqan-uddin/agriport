import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Avatar,
  TextField,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material'
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import PendingRoundedIcon from '@mui/icons-material/PendingRounded'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import PageHeader from '@/components/common/PageHeader'
import StatusChip from '@/components/common/StatusChip'
import { DocListSkeleton, TransactionListSkeleton } from '@/components/common/Loader'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { updateProfile } from '@/redux/slices/authSlice'
import {
  useGetTransactionsQuery,
  useGetDocumentsQuery,
  useUpdateProfileMutation,
  useUploadDocumentMutation,
} from '@/redux/api'
import { ROUTES, PAYMENT_MODE_LABEL } from '@/constants'
import { formatMoney, formatDate, initials } from '@/utils/format'
import type { BusinessDocument } from '@/types'
import toast from 'react-hot-toast'

type TabKey = 'personal' | 'business' | 'documents' | 'transactions'

function DocRow({ doc }: { doc: BusinessDocument }) {
  const [uploadDoc, { isLoading }] = useUploadDocumentMutation()

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]

    try {
      const formData = new FormData()
      formData.append('type', doc.type)
      formData.append('file', file)

      await uploadDoc(formData).unwrap()
      toast.success(`${doc.name} uploaded successfully!`)
    } catch (err: any) {
      toast.error(err.data?.message || 'Failed to upload document')
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
  })

  const statusIcon =
    doc.status === 'verified' ? (
      <CheckCircleRoundedIcon sx={{ color: 'var(--brand-600)' }} />
    ) : doc.status === 'pending' ? (
      <PendingRoundedIcon sx={{ color: '#C9842F' }} />
    ) : (
      <DescriptionRoundedIcon sx={{ color: 'var(--ink-400)' }} />
    )

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderRadius: 3,
        border: '1px solid var(--ink-200)',
        bgcolor: '#fff',
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ width: 42, height: 42, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'var(--ink-50)' }}>
        {statusIcon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 160 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{doc.name}</Typography>
        <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)' }}>
          {doc.fileName ? `${doc.fileName} · ${formatDate(doc.uploadedOn)}` : 'Not uploaded yet'}
        </Typography>
      </Box>
      <Chip
        size="small"
        label={doc.status === 'verified' ? 'Verified' : doc.status === 'pending' ? 'Pending' : 'Missing'}
        color={doc.status === 'verified' ? 'success' : doc.status === 'pending' ? 'warning' : 'default'}
        variant={doc.status === 'missing' ? 'filled' : 'outlined'}
      />
      <Box
        {...getRootProps()}
        sx={{
          px: 2,
          py: 1,
          borderRadius: 2,
          border: `1.5px dashed ${isDragActive ? 'var(--brand-500)' : 'var(--ink-300)'}`,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--brand-700)',
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          bgcolor: isDragActive ? 'var(--brand-50)' : 'transparent',
          pointerEvents: isLoading ? 'none' : 'auto',
        }}
      >
        <input {...getInputProps()} />
        {isLoading ? (
          <CircularProgress size={16} color="inherit" />
        ) : (
          <CloudUploadRoundedIcon sx={{ fontSize: 18 }} />
        )}
        {isLoading ? 'Uploading...' : doc.status === 'missing' ? 'Upload' : 'Replace'}
      </Box>
    </Box>
  )
}

export default function ProfilePage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)!
  const [tab, setTab] = useState<TabKey>('personal')
  const [form, setForm] = useState(user)
  const { data: transactions, isLoading: txLoading } = useGetTransactionsQuery()
  const { data: documents, isLoading: docLoading } = useGetDocumentsQuery()
  const [updateProfileApi, { isLoading: updating }] = useUpdateProfileMutation()

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const save = async () => {
    try {
      const result = await updateProfileApi(form).unwrap()
      dispatch(updateProfile(result.data || result))
      toast.success('Profile updated successfully!')
    } catch (err: any) {
      toast.error(err.data?.message || 'Failed to update profile')
    }
  }

  const verifiedCount = documents?.filter((d) => d.status === 'verified').length ?? 0

  return (
    <Box className="animate-fade-up">
      <PageHeader title="Profile & business" crumbs={[{ label: 'Home', to: ROUTES.home }, { label: 'Profile' }]} />

      {/* Profile header */}
      <Box
        sx={{
          borderRadius: 4,
          p: 3,
          mb: 3,
          color: '#fff',
          background: 'linear-gradient(120deg, #0E432F 0%, #11543B 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          flexWrap: 'wrap',
        }}
      >
        <Avatar sx={{ width: 68, height: 68, bgcolor: 'rgba(255,255,255,0.15)', fontSize: 24, border: '2px solid rgba(255,255,255,0.25)' }}>
          {initials(user.fullName)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontFamily: '"Bricolage Grotesque", serif', fontWeight: 800, fontSize: 24 }}>
            {user.fullName}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 14.5 }}>
            {user.companyName} · {user.businessType}
          </Typography>
        </Box>
        <Box className="flex items-center gap-2" sx={{ px: 2, py: 1, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.1)' }}>
          <VerifiedRoundedIcon sx={{ color: '#9DD4BC' }} />
          <Box>
            <Typography className="tnum" sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}>
              {verifiedCount}/4
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)' }}>docs verified</Typography>
          </Box>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: '1px solid var(--ink-200)', mb: 3 }}>
        <Tab value="personal" label="Personal Details" />
        <Tab value="business" label="Business Info" />
        <Tab value="documents" label="Documents" />
        <Tab value="transactions" label="Transactions" />
      </Tabs>

      <Box sx={{ borderRadius: 4, border: '1px solid var(--ink-200)', bgcolor: '#fff', p: { xs: 2.5, md: 3.5 } }}>
        {tab === 'personal' && (
          <Box>
            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField label="Full name" value={form.fullName} onChange={set('fullName')} fullWidth />
              <TextField label="Email address" value={form.email} onChange={set('email')} fullWidth />
              <TextField label="Mobile number" value={form.mobile} onChange={set('mobile')} fullWidth />
              <TextField label="City" value={form.city ?? ''} onChange={set('city')} fullWidth />
            </Box>
            <Divider sx={{ my: 3 }} />
            <Button variant="contained" onClick={save} disabled={updating}>
              {updating ? <CircularProgress size={24} color="inherit" /> : 'Save changes'}
            </Button>
          </Box>
        )}

        {tab === 'business' && (
          <Box>
            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField label="Company / Shop name" value={form.companyName ?? ''} onChange={set('companyName')} fullWidth />
              <TextField label="Business type" value={form.businessType ?? ''} onChange={set('businessType')} fullWidth />
              <TextField label="GST number" value={form.gstNumber ?? ''} onChange={set('gstNumber')} fullWidth />
              <TextField label="Country" value={form.country ?? ''} onChange={set('country')} fullWidth />
              <TextField label="State" value={form.state ?? ''} onChange={set('state')} fullWidth />
              <TextField label="City" value={form.city ?? ''} onChange={set('city')} fullWidth />
              <Box className="sm:col-span-2">
                <TextField label="Business address" value={form.address ?? ''} onChange={set('address')} fullWidth multiline minRows={2} />
              </Box>
            </Box>
            <Divider sx={{ my: 3 }} />
            <Button variant="contained" onClick={save} disabled={updating}>
              {updating ? <CircularProgress size={24} color="inherit" /> : 'Save business details'}
            </Button>
          </Box>
        )}

        {tab === 'documents' && (
          <Box>
            <Typography sx={{ fontSize: 14, color: 'var(--ink-500)', mb: 2.5 }}>
              Upload your business documents for verification. Accepted: PDF, JPG, PNG.
            </Typography>
            {docLoading ? (
              <DocListSkeleton count={4} />
            ) : (
              <Box className="flex flex-col gap-3">
                {documents?.map((d) => (
                  <DocRow key={d.id} doc={d} />
                ))}
              </Box>
            )}
          </Box>
        )}

        {tab === 'transactions' && (
          <Box>
            {txLoading ? (
              <TransactionListSkeleton count={5} />
            ) : (
              <Box className="flex flex-col">
                <Box className="hidden sm:grid" sx={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr', px: 2, pb: 1.5 }}>
                  {['Order', 'Amount', 'Mode', 'Status'].map((h) => (
                    <Typography key={h} sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-500)' }}>
                      {h}
                    </Typography>
                  ))}
                </Box>
                {transactions?.map((t) => (
                  <Box
                    key={t.id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr 1fr', sm: '1.4fr 1fr 1fr 1fr' },
                      alignItems: 'center',
                      gap: 1,
                      p: 2,
                      borderTop: '1px solid var(--ink-100)',
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 14 }} className="tnum">
                        {t.orderRef}
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)' }} className="tnum">
                        {formatDate(t.date)}
                      </Typography>
                    </Box>
                    <Typography className="tnum" sx={{ fontWeight: 700 }}>
                      {formatMoney(t.amount)}
                    </Typography>
                    <Typography sx={{ fontSize: 13.5, color: 'var(--ink-600)', display: { xs: 'none', sm: 'block' } }}>
                      {PAYMENT_MODE_LABEL[t.mode]}
                    </Typography>
                    <Box>
                      <StatusChip kind="payment" value={t.status} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}

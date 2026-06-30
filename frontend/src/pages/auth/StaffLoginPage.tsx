import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Chip,
  InputAdornment,
  IconButton,
  Link as MuiLink,
  Divider,
  CircularProgress,
} from '@mui/material'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded'
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import type { ReactNode } from 'react'
import Logo from '@/components/common/Logo'
import RHFTextField from '@/components/forms/RHFTextField'
import { useAppDispatch } from '@/redux/hooks'
import { signIn } from '@/redux/slices/authSlice'
import { demoUsers } from '@/mocks/data'
import { ROUTES } from '@/constants'
import type { UserRole } from '@/types'
import { useLoginMutation } from '@/redux/api'
import toast from 'react-hot-toast'

type StaffRole = Extract<UserRole, 'admin' | 'executive'>

const CFG: Record<
  StaffRole,
  { title: string; tagline: string; home: string; demoEmail: string; icon: ReactNode }
> = {
  admin: {
    title: 'Admin Control Panel',
    tagline: 'Manage products, users, sales teams, orders and analytics across the platform.',
    home: ROUTES.admin,
    demoEmail: 'admin@agriport.com',
    icon: <AdminPanelSettingsRoundedIcon />,
  },
  executive: {
    title: 'Sales Executive App',
    tagline: 'Manage customers, follow-ups, create sales and watch your incentives grow.',
    home: ROUTES.executive,
    demoEmail: 'rahul@agriport.com',
    icon: <BadgeRoundedIcon />,
  },
}

const PORTALS: { role: StaffRole; label: string }[] = [
  { role: 'admin', label: 'Admin' },
  { role: 'executive', label: 'Executive' },
]

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type Form = z.infer<typeof schema>

export default function StaffLoginPage({ role }: { role: StaffRole }) {
  const cfg = CFG[role]
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPw, setShowPw] = useState(false)
  const from = (location.state as { from?: string } | null)?.from
  const dest = from && from.startsWith(`/${role}`) ? from : cfg.home

  const [login, { isLoading }] = useLoginMutation()

  const { control, handleSubmit } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: cfg.demoEmail, password: 'password' },
  })

  const onSubmit = async (data: Form) => {
    try {
      const result = await login({ loginId: data.email, password: data.password }).unwrap()
      const user = result.data.user
      const accessToken = result.data.accessToken
      
      // Enforce role checks matching the portal
      if (user.role !== role && !(role === 'admin' && user.role === 'manager')) {
        throw new Error(`Unauthorized. You are not allowed to access this portal as an ${user.role}.`)
      }

      dispatch(signIn({ token: accessToken, user }))
      toast.success(`Signed in as ${cfg.title}`)
      navigate(dest, { replace: true })
    } catch (err: any) {
      toast.error(err.message || err.data?.message || 'Login failed. Please check credentials.')
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, sm: 4 },
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(150deg, #0E432F 0%, #0A3324 55%, #11543B 100%)',
      }}
    >
      {/* atmosphere */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.55,
          background:
            'radial-gradient(55% 50% at 85% 12%, rgba(56,155,115,0.35), transparent 60%), radial-gradient(45% 45% at 10% 92%, rgba(28,124,88,0.3), transparent 60%)',
        }}
      />
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }} preserveAspectRatio="none">
        <defs>
          <pattern id="staff-grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M0 34V0H34" fill="none" stroke="#fff" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#staff-grid)" />
      </svg>

      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }} className="animate-fade-up">
        <Box className="flex justify-center mb-5">
          <Logo light size={40} />
        </Box>

        <Box
          sx={{
            bgcolor: '#fff',
            borderRadius: 5,
            p: { xs: 3, sm: 4 },
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          }}
        >
          <Box className="flex items-center gap-2 mb-3">
            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'var(--brand-50)', color: 'var(--brand-700)', '& svg': { fontSize: 22 } }}>
              {cfg.icon}
            </Box>
            <Chip label="STAFF PORTAL" size="small" color="primary" variant="outlined" sx={{ letterSpacing: '0.08em', fontSize: 10.5 }} />
          </Box>

          <Typography variant="h4" sx={{ fontSize: 26, mb: 0.5 }}>
            {cfg.title}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14, mb: 3 }}>
            {cfg.tagline}
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <RHFTextField control={control} name="email" label="Work email" />
            <RHFTextField
              control={control}
              name="password"
              label="Password"
              type={showPw ? 'text' : 'password'}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPw((s) => !s)} edge="end">
                        {showPw ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isLoading}
              startIcon={isLoading ? null : cfg.icon}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
            </Button>
          </Box>

          <Box sx={{ mt: 2, p: 1.25, borderRadius: 2, bgcolor: 'var(--ink-50)', border: '1px dashed var(--ink-300)' }}>
            <Typography sx={{ fontSize: 12, color: 'var(--ink-500)' }}>
              <strong>Demo:</strong> credentials are pre-filled — just press <em>Sign in</em>.
            </Typography>
          </Box>

          {role === 'executive' && (
            <Typography sx={{ mt: 2, fontSize: 13.5, textAlign: 'center', color: 'var(--ink-600)' }}>
              New Executive?{' '}
              <MuiLink component={RouterLink} to="/executive/signup" underline="hover" sx={{ fontWeight: 600, color: 'var(--brand-700)' }}>
                Create an Account
              </MuiLink>
            </Typography>
          )}

          <Divider sx={{ my: 2.5, fontSize: 11.5, color: 'var(--ink-400)' }}>SWITCH PORTAL</Divider>
          <Box className="flex flex-wrap justify-center gap-1.5">
            {PORTALS.filter((p) => p.role !== role).map((p) => (
              <Button key={p.role} component={RouterLink} to={`/${p.role}/login`} size="small" variant="outlined" sx={{ flex: 1, minWidth: 110 }}>
                {p.label}
              </Button>
            ))}
          </Box>
        </Box>

        <Box className="flex justify-center mt-4">
          <MuiLink component={RouterLink} to={ROUTES.home} underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'rgba(255,255,255,0.85)', fontSize: 13.5, fontWeight: 600 }}>
            <StorefrontRoundedIcon sx={{ fontSize: 17 }} /> Back to customer site
          </MuiLink>
        </Box>
      </Box>
    </Box>
  )
}

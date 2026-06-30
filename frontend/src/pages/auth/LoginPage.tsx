import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'
import { Box, Typography, Button, Divider, CircularProgress } from '@mui/material'
import RHFTextField from '@/components/forms/RHFTextField'
import { ROUTES } from '@/constants'
import { useSendOtpMutation } from '@/redux/api'
import toast from 'react-hot-toast'

const mobileSchema = z.object({
  mobile: z.string().regex(/^[0-9+\s-]{10,15}$/, 'Enter a valid mobile number'),
})
type MobileForm = z.infer<typeof mobileSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { mobile?: string; registered?: boolean; from?: string } | null
  const from = state?.from ?? ROUTES.home
  const initialMobile = state?.mobile ?? ''

  const [sendOtp, { isLoading }] = useSendOtpMutation()
  const mobileForm = useForm<MobileForm>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { mobile: initialMobile }
  })

  const onMobileSubmit = async (data: MobileForm) => {
    try {
      await sendOtp({ mobile: data.mobile, purpose: 'login' }).unwrap()
      toast.success('OTP sent successfully.')
      navigate(ROUTES.otp, { state: { mobile: data.mobile, from, purpose: 'login' } })
    } catch (err: any) {
      toast.error(err.data?.message || 'Failed to send OTP. Please check the number.')
    }
  }

  return (
    <Box>
      <Typography variant="h3" sx={{ fontSize: 30, mb: 0.5 }}>
        Sign in
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Access your wholesale dashboard, orders and invoices.
      </Typography>

      {state?.registered && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(10, 51, 36, 0.06)', borderRadius: 1.5, border: '1px solid var(--brand-200)' }}>
          <Typography sx={{ fontSize: 13.5, color: 'var(--brand-800)', fontWeight: 700 }}>
            Account Pending Verification
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'var(--brand-700)', mt: 0.5 }}>
            Your business profile has been submitted successfully and is pending KYC verification and Admin approval.
          </Typography>
        </Box>
      )}

      <Box component="form" onSubmit={mobileForm.handleSubmit(onMobileSubmit)} className="flex flex-col gap-4">
        <RHFTextField
          control={mobileForm.control}
          name="mobile"
          label="Mobile number"
          placeholder="+91 98765 43210"
        />
        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Send OTP'}
        </Button>
      </Box>

      <Divider sx={{ my: 3.5, color: 'var(--ink-400)', fontSize: 12.5 }}>NEW TO AGRIPORT?</Divider>
      <Button component={RouterLink} to={ROUTES.signup} variant="outlined" fullWidth size="large">
        Create a business account
      </Button>
    </Box>
  )
}

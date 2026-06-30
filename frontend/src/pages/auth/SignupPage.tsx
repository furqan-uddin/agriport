import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Box, Typography, Button, MenuItem, Link as MuiLink, CircularProgress } from '@mui/material'
import RHFTextField from '@/components/forms/RHFTextField'
import { ROUTES } from '@/constants'
import { COUNTRIES } from '@/constants/countries'
import { useSendOtpMutation } from '@/redux/api'
import toast from 'react-hot-toast'

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email address'),
  mobile: z.string().regex(/^[0-9+\s-]{10,15}$/, 'Enter a valid mobile number'),
  companyName: z.string().min(2, 'Company / shop name is required'),
  gstNumber: z.string().min(10, 'Enter a valid GST number'),
  country: z.string().min(2, 'Required'),
  address: z.string().min(6, 'Enter your full address'),
})
type Form = z.infer<typeof schema>

export default function SignupPage() {
  const navigate = useNavigate()
  const [sendOtp, { isLoading }] = useSendOtpMutation()
  const { control, handleSubmit } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '', email: '', mobile: '', companyName: '',
      gstNumber: '', country: 'India', address: '',
    },
  })

  const onSubmit = async (data: Form) => {
    try {
      await sendOtp({ mobile: data.mobile, purpose: 'signup' }).unwrap()
      toast.success('OTP sent successfully. Please check your mobile.')
      navigate(ROUTES.otp, { state: { mobile: data.mobile, signup: true, signupData: data } })
    } catch (err: any) {
      toast.error(err.data?.message || 'Failed to send OTP')
    }
  }

  return (
    <Box>
      <Typography variant="h3" sx={{ fontSize: 30, mb: 0.5 }}>
        Create your account
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Set up your business profile to start trading wholesale.
      </Typography>
 
      <Box component="form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <RHFTextField control={control} name="fullName" label="Full name" />
        <RHFTextField control={control} name="email" label="Email address" type="email" />
        <RHFTextField control={control} name="mobile" label="Mobile number" placeholder="+91 …" />
        <RHFTextField control={control} name="gstNumber" label="GST number" />
        <RHFTextField control={control} name="companyName" label="Company / Shop name" />
        <RHFTextField
          control={control}
          name="country"
          label="Country"
          select
          slotProps={{
            select: {
              MenuProps: {
                sx: {
                  maxHeight: 280,
                },
              },
            },
          }}
        >
          {COUNTRIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </RHFTextField>
        <RHFTextField control={control} name="address" label="Address" multiline minRows={2} />
        <Box sx={{ mt: 1 }}>
          <Button type="submit" variant="contained" size="large" fullWidth disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Continue — Verify mobile'}
          </Button>
        </Box>
      </Box>

      <Typography sx={{ mt: 3, fontSize: 14, textAlign: 'center', color: 'var(--ink-500)' }}>
        Already registered?{' '}
        <MuiLink component={RouterLink} to={ROUTES.login} underline="hover" sx={{ fontWeight: 600 }}>
          Sign in
        </MuiLink>
      </Typography>
    </Box>
  )
}

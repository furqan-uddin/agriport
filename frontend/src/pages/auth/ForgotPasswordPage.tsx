import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { Box, Typography, Button, Link as MuiLink } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import RHFTextField from '@/components/forms/RHFTextField'
import { ROUTES } from '@/constants'
import { useForgotPasswordMutation } from '@/redux/api'
import toast from 'react-hot-toast'

const schema = z.object({
  identifier: z.string().min(1, 'Enter your registered email or mobile'),
})
type Form = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation()
  const [isSuccess, setIsSuccess] = useState(false)
  const { control, handleSubmit } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { identifier: '' } })

  const onSubmit = async (data: Form) => {
    try {
      const result = await forgotPassword({ identifier: data.identifier }).unwrap()
      toast.success(result.message || 'Recovery email sent successfully')
      setIsSuccess(true)
    } catch (err: any) {
      const errorMsg = err?.data?.message || 'Failed to send recovery request. Please try again.'
      toast.error(errorMsg)
    }
  }

  if (isSuccess) {
    return (
      <Box className="text-center py-4">
        <Typography variant="h3" sx={{ fontSize: 30, mb: 1.5 }}>
          Check your email
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          If an account is associated with that email or mobile number, we have sent instructions to reset your password.
        </Typography>
        <Button
          component={RouterLink}
          to={ROUTES.login}
          variant="contained"
          size="large"
          fullWidth
        >
          Return to sign in
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      <MuiLink
        component={RouterLink}
        to={ROUTES.login}
        underline="none"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'var(--ink-500)', fontSize: 13.5, mb: 3, fontWeight: 600 }}
      >
        <ArrowBackRoundedIcon sx={{ fontSize: 18 }} /> Back to sign in
      </MuiLink>
      <Typography variant="h3" sx={{ fontSize: 30, mb: 0.5 }}>
        Reset password
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3.5 }}>
        Enter your registered email or mobile and we'll send a verification code to reset your password.
      </Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <RHFTextField control={control} name="identifier" label="Email or mobile number" disabled={isLoading} />
        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {isLoading ? 'Sending code...' : 'Send recovery code'}
        </Button>
      </Box>
    </Box>
  )
}


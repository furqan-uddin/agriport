import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom'
import { Box, Typography, Button } from '@mui/material'
import RHFTextField from '@/components/forms/RHFTextField'
import { ROUTES } from '@/constants'
import { useResetPasswordMutation } from '@/redux/api'
import toast from 'react-hot-toast'

const schema = z
  .object({
    otp: z.string().min(6, 'Enter the 6-digit verification code'),
    password: z.string().min(6, 'Minimum 6 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
type Form = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token') || ''
  
  const [resetPassword, { isLoading }] = useResetPasswordMutation()
  const [isSuccess, setIsSuccess] = useState(false)

  const { control, handleSubmit, setValue } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { otp: tokenFromUrl, password: '', confirm: '' },
  })

  useEffect(() => {
    if (tokenFromUrl) {
      setValue('otp', tokenFromUrl)
    }
  }, [tokenFromUrl, setValue])

  const onSubmit = async (data: Form) => {
    try {
      const result = await resetPassword({ token: data.otp, password: data.password }).unwrap()
      toast.success(result.message || 'Password updated successfully')
      setIsSuccess(true)
    } catch (err: any) {
      const errorMsg = err?.data?.message || 'Failed to reset password. Please verify the code and try again.'
      toast.error(errorMsg)
    }
  }

  if (isSuccess) {
    return (
      <Box className="text-center py-4">
        <Typography variant="h3" sx={{ fontSize: 30, mb: 1.5 }}>
          Password updated
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Your password has been successfully updated. You can now sign in with your new password.
        </Typography>
        <Button
          component={RouterLink}
          to={ROUTES.login}
          variant="contained"
          size="large"
          fullWidth
        >
          Sign in
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h3" sx={{ fontSize: 30, mb: 0.5 }}>
        Create new password
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3.5 }}>
        Enter the verification code and choose a new password for your account.
      </Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <RHFTextField control={control} name="otp" label="Verification code" placeholder="6-digit OTP" disabled={isLoading} />
        <RHFTextField control={control} name="password" label="New password" type="password" disabled={isLoading} />
        <RHFTextField control={control} name="confirm" label="Confirm new password" type="password" disabled={isLoading} />
        <Button type="submit" variant="contained" size="large" sx={{ mt: 0.5 }} disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update password'}
        </Button>
      </Box>
    </Box>
  )
}


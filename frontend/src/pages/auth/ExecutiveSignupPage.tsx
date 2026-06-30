import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  MenuItem,
  IconButton,
  Link as MuiLink,
  Divider,
  CircularProgress,
} from '@mui/material'
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'
import KeyboardBackspaceRoundedIcon from '@mui/icons-material/KeyboardBackspaceRounded'
import Logo from '@/components/common/Logo'
import RHFTextField from '@/components/forms/RHFTextField'
import { useSignupExecutiveMutation } from '@/redux/api'
import toast from 'react-hot-toast'

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  mobile: z.string().regex(/^[0-9+\s-]{10,15}$/, 'Enter a valid mobile number'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  companyName: z.string().optional(),
  businessType: z.string().min(1, 'Select a role'),
  address: z.string().min(6, 'Enter your full address'),
  aadharNumber: z.string().regex(/^\d{12}$/, 'Aadhar number must be exactly 12 digits'),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, 'Enter a valid PAN card number (e.g., ABCDE1234F)'),
})

type Form = z.infer<typeof schema>

export default function ExecutiveSignupPage() {
  const navigate = useNavigate()
  const [signupExecutive, { isLoading }] = useSignupExecutiveMutation()
  
  const [aadharPreview, setAadharPreview] = useState<string | null>(null)
  const [panPreview, setPanPreview] = useState<string | null>(null)
  const [aadharFile, setAadharFile] = useState<File | null>(null)
  const [panFile, setPanFile] = useState<File | null>(null)

  const { control, handleSubmit } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      mobile: '',
      email: '',
      password: '',
      companyName: '',
      businessType: '',
      address: '',
      aadharNumber: '',
      panNumber: '',
    },
  })

  const handleAadharUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAadharFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAadharPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPanFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPanPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: Form) => {
    if (!aadharFile) {
      toast.error('Please upload Aadhar Card photo')
      return
    }
    if (!panFile) {
      toast.error('Please upload PAN Card photo')
      return
    }

    try {
      const formData = new FormData()
      formData.append('name', data.fullName)
      formData.append('email', data.email)
      formData.append('mobile', data.mobile)
      formData.append('password', data.password)
      const region = data.address.split(',').pop()?.trim() || data.address || 'Pune'
      formData.append('region', region)
      formData.append('target', '0')
      formData.append('aadhaarCard', aadharFile)
      formData.append('panCard', panFile)

      const result = await signupExecutive(formData).unwrap()
      toast.success(result.message || 'Executive registration submitted successfully!')
      navigate('/executive/login', { replace: true })
    } catch (err: any) {
      toast.error(err.data?.message || 'Failed to submit registration')
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        py: 6,
        px: { xs: 2, sm: 4 },
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
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="staff-grid-signup" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M0 34V0H34" fill="none" stroke="#fff" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#staff-grid-signup)" />
      </svg>

      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 500 }} className="animate-fade-up">
        <Box className="flex justify-center mb-3">
          <Logo light size={36} />
        </Box>

        <Box
          sx={{
            bgcolor: '#fff',
            borderRadius: 4,
            p: { xs: 2.5, sm: 3 },
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          }}
        >
          <Box className="flex items-center gap-2 mb-2">
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'var(--brand-50)',
                color: 'var(--brand-700)',
                '& svg': { fontSize: 18 },
              }}
            >
              <BadgeRoundedIcon />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', color: 'var(--brand-700)' }}>
              STAFF REGISTRATION
            </Typography>
          </Box>

          <Typography variant="h4" sx={{ fontSize: 22, mb: 0.25, fontWeight: 700 }}>
            Create Staff Account
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2.5 }}>
            Register as a Sales Executive to access the workspace.
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2.5">
            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <RHFTextField control={control} name="fullName" label="Full name" size="small" />
              <RHFTextField control={control} name="mobile" label="Mobile number" placeholder="+91 …" size="small" />
            </Box>

            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <RHFTextField control={control} name="email" label="Work email" size="small" />
              <RHFTextField control={control} name="password" label="Password" type="password" size="small" />
            </Box>

            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <RHFTextField control={control} name="companyName" label="Company Name (Optional)" size="small" />
              <RHFTextField control={control} name="businessType" label="Business Type / Role" select size="small">
                <MenuItem value="Sales Executive">Sales Executive</MenuItem>
              </RHFTextField>
            </Box>

            <RHFTextField control={control} name="address" label="Address" multiline minRows={2} size="small" />

            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <RHFTextField control={control} name="aadharNumber" label="Aadhar Card Number" size="small" />
              <RHFTextField control={control} name="panNumber" label="PAN Card Number" size="small" />
            </Box>

            {/* Aadhar & PAN Photos Upload Grid */}
            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Aadhar Upload */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-700)' }}>
                  Aadhar Card Photo *
                </Typography>
                <Box
                  sx={{
                    height: 96,
                    border: '2px dashed var(--ink-300)',
                    borderRadius: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    bgcolor: 'var(--ink-50)',
                    '&:hover': { bgcolor: 'var(--ink-100)', borderColor: 'var(--brand-500)' },
                    transition: 'all 0.2s',
                  }}
                >
                  {aadharPreview ? (
                    <>
                      <img
                        src={aadharPreview}
                        alt="Aadhar Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => setAadharPreview(null)}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          '&:hover': { bgcolor: 'rgba(200,30,30,0.85)' },
                        }}
                      >
                        <CloseRoundedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </>
                  ) : (
                    <Box
                      component="label"
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%',
                        px: 1.5,
                      }}
                    >
                      <CloudUploadRoundedIcon sx={{ fontSize: 24, color: 'var(--ink-500)', mb: 0.25 }} />
                      <Typography sx={{ fontSize: 11, color: 'var(--ink-600)', fontWeight: 500 }}>
                        Upload Aadhar
                      </Typography>
                      <Typography sx={{ fontSize: 9, color: 'var(--ink-400)' }}>
                        PNG or JPG
                      </Typography>
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleAadharUpload}
                      />
                    </Box>
                  )}
                </Box>
              </Box>

              {/* PAN Upload */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-700)' }}>
                  PAN Card Photo *
                </Typography>
                <Box
                  sx={{
                    height: 96,
                    border: '2px dashed var(--ink-300)',
                    borderRadius: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    bgcolor: 'var(--ink-50)',
                    '&:hover': { bgcolor: 'var(--ink-100)', borderColor: 'var(--brand-500)' },
                    transition: 'all 0.2s',
                  }}
                >
                  {panPreview ? (
                    <>
                      <img
                        src={panPreview}
                        alt="PAN Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => setPanPreview(null)}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          '&:hover': { bgcolor: 'rgba(200,30,30,0.85)' },
                        }}
                      >
                        <CloseRoundedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </>
                  ) : (
                    <Box
                      component="label"
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%',
                        px: 1.5,
                      }}
                    >
                      <CloudUploadRoundedIcon sx={{ fontSize: 24, color: 'var(--ink-500)', mb: 0.25 }} />
                      <Typography sx={{ fontSize: 11, color: 'var(--ink-600)', fontWeight: 500 }}>
                        Upload PAN
                      </Typography>
                      <Typography sx={{ fontSize: 9, color: 'var(--ink-400)' }}>
                        PNG or JPG
                      </Typography>
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handlePanUpload}
                      />
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>

            <Button type="submit" variant="contained" size="large" sx={{ mt: 1.5 }} disabled={isLoading}>
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign Up & Request Access'}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box className="flex justify-center">
            <MuiLink
              component={RouterLink}
              to="/executive/login"
              underline="hover"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'var(--brand-700)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <KeyboardBackspaceRoundedIcon sx={{ fontSize: 16 }} /> Back to Staff Login
            </MuiLink>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

import { Suspense } from 'react'
import { Box, Typography } from '@mui/material'
import { Outlet } from 'react-router-dom'
import Logo from '@/components/common/Logo'
import PageFallback from '@/components/common/PageFallback'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'

const HIGHLIGHTS = [
  { icon: <PublicRoundedIcon />, text: 'Wholesale catalog spanning agro, packaging, tools & more' },
  { icon: <LocalShippingRoundedIcon />, text: 'Lot-based pricing with transparent dispatch tracking' },
  { icon: <VerifiedRoundedIcon />, text: 'Verified suppliers, invoices & gate-pass on every order' },
]

export default function AuthLayout() {
  return (
    <Box className="min-h-screen grid lg:grid-cols-2">
      {/* Brand / marketing panel */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          position: 'relative',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 7,
          color: '#fff',
          overflow: 'hidden',
          background: 'linear-gradient(150deg, #0E432F 0%, #0A3324 55%, #11543B 100%)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.5,
            background:
              'radial-gradient(60% 50% at 85% 15%, rgba(56,155,115,0.35), transparent 60%), radial-gradient(50% 40% at 10% 90%, rgba(28,124,88,0.3), transparent 60%)',
          }}
        />
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }}
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="auth-grid" width="34" height="34" patternUnits="userSpaceOnUse">
              <path d="M0 34V0H34" fill="none" stroke="#fff" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid)" />
        </svg>

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Logo light />
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            sx={{
              fontFamily: '"Bricolage Grotesque", serif',
              fontWeight: 800,
              fontSize: 46,
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              mb: 2,
            }}
          >
            Wholesale,
            <br />
            moved with precision.
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: 17, maxWidth: 440, mb: 5 }}>
            The B2B trading platform for inventory, orders and payments — built for businesses
            that move serious volume.
          </Typography>
          <Box className="flex flex-col gap-3.5">
            {HIGHLIGHTS.map((h, i) => (
              <Box key={i} className="flex items-center gap-3">
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    color: '#9DD4BC',
                  }}
                >
                  {h.icon}
                </Box>
                <Typography sx={{ fontSize: 14.5, color: 'rgba(255,255,255,0.88)' }}>{h.text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Typography sx={{ position: 'relative', zIndex: 1, fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }}>
          © {new Date().getFullYear()} Agriport · Confidential
        </Typography>
      </Box>

      {/* Form panel */}
      <Box className="flex items-center justify-center p-6 sm:p-10">
        <Box sx={{ width: '100%', maxWidth: 420 }} className="animate-fade-up">
          <Box sx={{ display: { lg: 'none' }, mb: 4 }}>
            <Logo />
          </Box>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </Box>
      </Box>
    </Box>
  )
}

import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Container,
  InputBase,
  Paper,
  IconButton,
} from '@mui/material'
import {
  Search as SearchIcon,
  ArrowBackRounded,
  StorefrontRounded,
  ShoppingCartRounded,
  ReceiptLongRounded,
  PersonRounded,
  NorthEastRounded,
} from '@mui/icons-material'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import Logo from '@/components/common/Logo'
import { ROUTES } from '@/constants'

/** Respects the user's reduced-motion preference for all decorative motion. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

/** Decorative drifting leaves — each gets a depth used for cursor parallax. */
const LEAVES = [
  { top: '14%', left: '10%', size: 30, depth: 26, delay: 0, rot: -20 },
  { top: '22%', left: '84%', size: 22, depth: 40, delay: 0.6, rot: 25 },
  { top: '68%', left: '8%', size: 24, depth: 34, delay: 1.1, rot: 10 },
  { top: '74%', left: '88%', size: 32, depth: 22, delay: 0.3, rot: -15 },
  { top: '44%', left: '92%', size: 18, depth: 48, delay: 1.6, rot: 40 },
  { top: '40%', left: '4%', size: 18, depth: 46, delay: 0.9, rot: -35 },
]

function Leaf({ size, color = 'var(--brand-300)' }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M28 4C13 4 4 12 4 24c0 2 .5 4 .5 4S6 24 12 20c-2 4-3 8-3 8s9-1 14-7c4.5-5.4 5-17 5-17Z"
        fill={color}
      />
      <path d="M24 8C16 14 10 24 7 30" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

/** Animated seedling that grows on mount and sways; the centerpiece "0" of 404. */
function Seedling({ reduced, alive }: { reduced: boolean; alive: boolean }) {
  const grow = !reduced && alive
  return (
    <Box
      sx={{
        width: { xs: 132, sm: 168 },
        height: { xs: 132, sm: 168 },
        position: 'relative',
        transformOrigin: '50% 92%',
        animation: reduced ? 'none' : 'potIn 0.7s cubic-bezier(0.22,1,0.36,1) both',
        '@keyframes potIn': {
          from: { opacity: 0, transform: 'translateY(14px) scale(0.9)' },
          to: { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 200 200"
        sx={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
          transformOrigin: '100px 178px',
          animation: reduced ? 'none' : 'sway 5s ease-in-out 0.7s infinite',
          '@keyframes sway': {
            '0%,100%': { transform: 'rotate(-2.2deg)' },
            '50%': { transform: 'rotate(2.2deg)' },
          },
        }}
      >
        <defs>
          <radialGradient id="halo" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="var(--brand-100)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--brand-100)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6B4A2B" />
            <stop offset="100%" stopColor="#3F2C19" />
          </linearGradient>
          <linearGradient id="stem" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--brand-600)" />
            <stop offset="100%" stopColor="var(--brand-400)" />
          </linearGradient>
        </defs>

        <circle cx="100" cy="86" r="78" fill="url(#halo)" />

        {/* stem grows from the soil */}
        <path
          d="M100 176 C98 140 100 118 100 78"
          fill="none"
          stroke="url(#stem)"
          strokeWidth="7"
          strokeLinecap="round"
          style={{
            strokeDasharray: 130,
            strokeDashoffset: grow ? 0 : 130,
            transition: 'stroke-dashoffset 0.9s ease 0.25s',
          }}
        />

        {/* leaves + bud pop in after the stem */}
        {[
          { d: 'M100 118 C70 116 52 96 50 74 C82 74 100 92 100 118 Z', delay: '0.9s', origin: '100px 118px' },
          { d: 'M100 104 C130 102 150 84 152 62 C118 62 100 80 100 104 Z', delay: '1.05s', origin: '100px 104px' },
          { d: 'M100 86 C90 70 92 54 100 44 C108 54 110 70 100 86 Z', delay: '1.25s', origin: '100px 86px' },
        ].map((leaf, i) => (
          <path
            key={i}
            d={leaf.d}
            fill={i === 2 ? 'var(--brand-300)' : 'var(--brand-500)'}
            style={{
              transformBox: 'fill-box',
              transformOrigin: leaf.origin,
              opacity: grow ? 1 : reduced ? 1 : 0,
              transform: grow || reduced ? 'scale(1)' : 'scale(0.2)',
              transition: `opacity 0.5s ease ${leaf.delay}, transform 0.6s cubic-bezier(0.34,1.56,0.64,1) ${leaf.delay}`,
            }}
          />
        ))}

        {/* soil mound + pot rim */}
        <ellipse cx="100" cy="176" rx="58" ry="15" fill="url(#soil)" />
        <ellipse cx="100" cy="172" rx="58" ry="11" fill="#7A5634" />
        <ellipse cx="100" cy="171" rx="44" ry="7" fill="#4A3320" />
      </Box>
    </Box>
  )
}

const QUICK_LINKS = [
  { label: 'Marketplace', to: ROUTES.home, icon: <StorefrontRounded fontSize="small" /> },
  { label: 'Products', to: ROUTES.products, icon: <NorthEastRounded fontSize="small" /> },
  { label: 'My Cart', to: ROUTES.cart, icon: <ShoppingCartRounded fontSize="small" /> },
  { label: 'My Orders', to: ROUTES.orders, icon: <ReceiptLongRounded fontSize="small" /> },
  { label: 'Profile', to: ROUTES.profile, icon: <PersonRounded fontSize="small" /> },
]

export default function NotFoundPage() {
  const navigate = useNavigate()
  const reduced = usePrefersReducedMotion()
  const [alive, setAlive] = useState(false)
  const [query, setQuery] = useState('')
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const rootRef = useRef<HTMLDivElement>(null)

  // trigger growth animation just after mount
  useEffect(() => {
    const t = setTimeout(() => setAlive(true), 80)
    return () => clearTimeout(t)
  }, [])

  const handleMove = (e: React.MouseEvent) => {
    if (reduced) return
    const r = rootRef.current?.getBoundingClientRect()
    if (!r) return
    setTilt({
      x: (e.clientX - r.left) / r.width - 0.5,
      y: (e.clientY - r.top) / r.height - 0.5,
    })
  }

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `${ROUTES.products}?q=${encodeURIComponent(q)}` : ROUTES.products)
  }

  return (
    <Box
      ref={rootRef}
      onMouseMove={handleMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="app-canvas"
      sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden', py: 6 }}
    >
      {/* ambient brand glows */}
      <Box sx={{ position: 'absolute', top: '-12%', left: '-8%', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(28,124,88,0.12), transparent 70%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: '-14%', right: '-10%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,132,47,0.10), transparent 70%)', pointerEvents: 'none' }} />

      {/* parallax leaves */}
      {LEAVES.map((l, i) => (
        <Box
          key={i}
          aria-hidden
          sx={{
            position: 'absolute',
            top: l.top,
            left: l.left,
            display: { xs: i > 3 ? 'none' : 'block', md: 'block' },
            pointerEvents: 'none',
            transform: `translate3d(${tilt.x * l.depth}px, ${tilt.y * l.depth}px, 0) rotate(${l.rot}deg)`,
            transition: 'transform 0.35s ease-out',
            opacity: 0.85,
            animation: reduced ? 'none' : `bob 6s ease-in-out ${l.delay}s infinite`,
            '@keyframes bob': {
              '0%,100%': { translate: '0 0' },
              '50%': { translate: '0 -14px' },
            },
          }}
        >
          <Leaf size={l.size} color={i % 2 ? 'var(--brand-300)' : 'var(--brand-200)'} />
        </Box>
      ))}

      <Container maxWidth="sm" sx={{ position: 'relative', textAlign: 'center' }}>
        <Box className="animate-fade-up" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <Logo />

          {/* 4 🌱 4 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 0.5, sm: 1.5 }, mt: 1 }}>
            {['4', '4'].map((d, i) => (
              <Typography
                key={i}
                aria-hidden
                sx={{
                  fontFamily: '"Bricolage Grotesque", serif',
                  fontWeight: 800,
                  fontSize: { xs: 96, sm: 140 },
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                  color: 'var(--brand-700)',
                  background: 'linear-gradient(180deg, var(--brand-500), var(--brand-800))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  transform: `translateY(${tilt.y * (i ? -8 : 8)}px)`,
                  transition: 'transform 0.4s ease-out',
                }}
              >
                {d}
              </Typography>
            ))}
            <Seedling reduced={reduced} alive={alive} />
          </Box>

          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
              This field hasn’t been planted
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 420, mx: 'auto' }}>
              The page you’re looking for doesn’t exist or has been harvested. Let’s get
              you back to fertile ground.
            </Typography>
          </Box>

          {/* interactive search */}
          <Paper
            component="form"
            onSubmit={submitSearch}
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              maxWidth: 420,
              px: 1,
              py: 0.5,
              borderRadius: 999,
              border: '1px solid var(--ink-200)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:focus-within': {
                borderColor: 'var(--brand-500)',
                boxShadow: '0 0 0 4px rgba(28,124,88,0.12)',
              },
            }}
          >
            <SearchIcon sx={{ ml: 1, color: 'var(--ink-500)' }} />
            <InputBase
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search seeds, crops, supplies…"
              sx={{ ml: 1, flex: 1, fontSize: '0.95rem' }}
              inputProps={{ 'aria-label': 'Search the marketplace' }}
            />
            <IconButton type="submit" aria-label="Search" sx={{ bgcolor: 'var(--brand-600)', color: '#fff', '&:hover': { bgcolor: 'var(--brand-700)' } }} size="small">
              <NorthEastRounded fontSize="small" />
            </IconButton>
          </Paper>

          <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
            <Button variant="outlined" startIcon={<ArrowBackRounded />} onClick={() => navigate(-1)}>
              Go back
            </Button>
            <Button variant="contained" component={RouterLink} to={ROUTES.home} startIcon={<StorefrontRounded />}>
              Back to marketplace
            </Button>
          </Box>

          {/* smart quick links */}
          <Box>
            <Typography variant="overline" sx={{ color: 'var(--ink-500)' }}>
              Or jump to
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 1, mt: 1 }}>
              {QUICK_LINKS.map((link) => (
                <Button
                  key={link.label}
                  component={RouterLink}
                  to={link.to}
                  size="small"
                  startIcon={link.icon}
                  sx={{
                    borderRadius: 999,
                    bgcolor: '#fff',
                    color: 'var(--ink-700)',
                    border: '1px solid var(--ink-200)',
                    px: 1.75,
                    '&:hover': { bgcolor: 'var(--brand-50)', borderColor: 'var(--brand-300)', color: 'var(--brand-700)' },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

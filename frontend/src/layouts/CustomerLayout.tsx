import { useState, Suspense } from 'react'
import type { FormEvent } from 'react'
import { Outlet, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'
import PageFallback from '@/components/common/PageFallback'
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Badge,
  InputBase,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  Typography,
  Container,
  Link as MuiLink,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import ContactPhoneRoundedIcon from '@mui/icons-material/ContactPhoneRounded'
import Logo from '@/components/common/Logo'
import { ROUTES } from '@/constants'
import { useAppDispatch, useAppSelector, useCartCount } from '@/redux/hooks'
import { signOut } from '@/redux/slices/authSlice'
import { initials } from '@/utils/format'
import toast from 'react-hot-toast'
import useSSESync from '@/hooks/useSSESync'

const NAV = [
  { label: 'Marketplace', to: ROUTES.products, icon: <StorefrontRoundedIcon sx={{ fontSize: 19 }} /> },
  { label: 'My Orders', to: ROUTES.orders, icon: <ReceiptLongRoundedIcon sx={{ fontSize: 19 }} /> },
]

export default function CustomerLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  
  // Initialize SSE synchronization stream
  useSSESync()
  const cartCount = useCartCount()
  const user = useAppSelector((s) => s.auth.user)
  const isAuthed = useAppSelector((s) => s.auth.status === 'authenticated')
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const [search, setSearch] = useState('')
  const [contactOpen, setContactOpen] = useState(false)

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    navigate(`${ROUTES.products}?search=${encodeURIComponent(search)}`)
  }

  const handleSignOut = () => {
    setAnchor(null)
    dispatch(signOut())
    toast.success('Signed out')
    navigate(ROUTES.home)
  }

  const isActive = (to: string) =>
    to === ROUTES.products ? location.pathname.startsWith('/products') : location.pathname === to

  const showBack = location.pathname !== '/'

  return (
    <Box className="app-canvas min-h-screen flex flex-col">
      <AppBar position="sticky">
        <Toolbar sx={{ minHeight: { xs: 60, md: 68 }, px: { xs: 2, md: 3 }, gap: 1.5 }}>
          {showBack && (
            <IconButton onClick={() => navigate(-1)} sx={{ color: 'var(--ink-800)', ml: -1 }}>
              <ArrowBackRoundedIcon />
            </IconButton>
          )}

          <RouterLink to={ROUTES.home} className="shrink-0">
            <Logo size={34} />
          </RouterLink>

          {/* Search */}
          <Box
            component="form"
            onSubmit={onSearch}
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              flex: 1,
              maxWidth: 460,
              ml: 2,
              px: 1.5,
              height: 42,
              borderRadius: 2.5,
              border: '1px solid var(--ink-200)',
              backgroundColor: 'var(--ink-50)',
              transition: 'border-color .15s',
              '&:focus-within': { borderColor: 'var(--brand-500)', backgroundColor: '#fff' },
            }}
          >
            <SearchRoundedIcon sx={{ color: 'var(--ink-500)', fontSize: 20 }} />
            <InputBase
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, categories…"
              sx={{ ml: 1, flex: 1, fontSize: 14 }}
            />
          </Box>

          <Box sx={{ flex: 1, display: { md: 'none' } }} />

          {/* Nav links */}
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 0.5 }}>
            {NAV.map((n) => (
              <Button
                key={n.to}
                component={RouterLink}
                to={n.to}
                startIcon={n.icon}
                sx={{
                  color: isActive(n.to) ? 'var(--brand-700)' : 'var(--ink-700)',
                  backgroundColor: isActive(n.to) ? 'var(--brand-50)' : 'transparent',
                  fontWeight: 600,
                  px: 1.75,
                  '&:hover': { backgroundColor: 'var(--ink-50)' },
                }}
              >
                {n.label}
              </Button>
            ))}
            <Button
              startIcon={<ContactPhoneRoundedIcon sx={{ fontSize: 19 }} />}
              onClick={() => setContactOpen(true)}
              sx={{
                color: 'var(--ink-700)',
                backgroundColor: 'transparent',
                fontWeight: 600,
                px: 1.75,
                '&:hover': { backgroundColor: 'var(--ink-50)' },
              }}
            >
              Contact Us
            </Button>
          </Box>

          <IconButton component={RouterLink} to={ROUTES.cart} sx={{ color: 'var(--ink-800)' }}>
            <Badge badgeContent={cartCount} color="primary" overlap="circular">
              <ShoppingCartRoundedIcon />
            </Badge>
          </IconButton>

          {isAuthed && user ? (
            <>
              <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: 'var(--brand-600)', fontSize: 14 }}>
                  {initials(user.fullName)}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <Box sx={{ px: 2, py: 1.25, minWidth: 220 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{user.fullName}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{user.companyName}</Typography>
                </Box>
                <Divider />
                <MenuItem component={RouterLink} to={ROUTES.profile} onClick={() => setAnchor(null)}>
                  <ListItemIcon>
                    <PersonRoundedIcon fontSize="small" />
                  </ListItemIcon>
                  Profile & Business
                </MenuItem>
                <MenuItem component={RouterLink} to={ROUTES.orders} onClick={() => setAnchor(null)}>
                  <ListItemIcon>
                    <ReceiptLongRoundedIcon fontSize="small" />
                  </ListItemIcon>
                  My Orders
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleSignOut} sx={{ color: 'var(--error, #C0392B)' }}>
                  <ListItemIcon>
                    <LogoutRoundedIcon fontSize="small" sx={{ color: 'inherit' }} />
                  </ListItemIcon>
                  Sign out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button variant="contained" component={RouterLink} to={ROUTES.login} sx={{ ml: 0.5 }}>
              Sign in
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Contact Us Dialog */}
      <Dialog open={contactOpen} onClose={() => setContactOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17, pb: 1 }}>
          Contact Us
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Typography sx={{ fontSize: 13, color: 'var(--ink-500)', fontWeight: 700, minWidth: 90, flexShrink: 0 }}>NAME :-</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>GLOBIRA INTERNATIONAL TRADING CO.</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Typography sx={{ fontSize: 13, color: 'var(--ink-500)', fontWeight: 700, minWidth: 90, flexShrink: 0 }}>GSTIN :-</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.02em' }}>24ABBFG5594R1ZP</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Typography sx={{ fontSize: 13, color: 'var(--ink-500)', fontWeight: 700, minWidth: 90, flexShrink: 0 }}>EMAIL :-</Typography>
              <MuiLink href="mailto:info@globira.co.in" sx={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-700)', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                info@globira.co.in
              </MuiLink>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 13, color: 'var(--ink-500)', fontWeight: 700, minWidth: 90, flexShrink: 0 }}>MO :-</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>6353979374</Typography>
              <Tooltip title="Chat on WhatsApp">
                <IconButton
                  component="a"
                  href="https://wa.me/916353979374"
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  sx={{
                    color: '#25D366',
                    backgroundColor: 'rgba(37,211,102,0.1)',
                    '&:hover': { backgroundColor: 'rgba(37,211,102,0.2)' },
                    p: 0.5,
                  }}
                >
                  <WhatsAppIcon sx={{ fontSize: 22 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Typography sx={{ fontSize: 13, color: 'var(--ink-500)', fontWeight: 700, minWidth: 90, flexShrink: 0 }}>ADDRESS :-</Typography>
              <Typography sx={{ fontSize: 13, lineHeight: 1.55 }}>OFFICE NO 302, BUSINESS HOUSE, BHAVNAGAR, GUJRAT, INDIA, 364004</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setContactOpen(false)} variant="contained" disableElevation>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Box component="main" sx={{ flex: 1, pb: 0 }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </Container>
      </Box>

      <Box component="footer" sx={{ borderTop: '1px solid var(--ink-200)', backgroundColor: '#fff', mt: { xs: 2, md: 4 } }}>
        <Container maxWidth="xl" sx={{ pt: 4, pb: { xs: 12, md: 4 } }}>
          {/* Company Details Section */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: { xs: 3, md: 8 }, mb: 4, pb: 4, borderBottom: '1px solid var(--ink-100)', maxWidth: 960 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--ink-800)', mb: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Company Information
              </Typography>
              <Box className="flex flex-col gap-2">
                <Box className="flex items-start gap-1">
                  <Typography sx={{ fontSize: 13, color: 'var(--ink-500)', fontWeight: 700, minWidth: 90, flexShrink: 0 }}>
                    NAME :-
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'var(--ink-800)', fontWeight: 600 }}>
                    GLOBIRA INTERNATIONAL TRADING CO.
                  </Typography>
                </Box>
                <Box className="flex items-start gap-1">
                  <Typography sx={{ fontSize: 13, color: 'var(--ink-500)', fontWeight: 700, minWidth: 90, flexShrink: 0 }}>
                    GSTIN :-
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'var(--ink-800)', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                    24ABBFG5594R1ZP
                  </Typography>
                </Box>
                <Box className="flex items-start gap-1">
                  <Typography sx={{ fontSize: 13, color: 'var(--ink-500)', fontWeight: 700, minWidth: 90, flexShrink: 0 }}>
                    ADDRESS :-
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.5 }}>
                    OFFICE NO 302 , BUSINESS HOUSE , BHAVNAGAR , GUJRAT , INDIA , 364004
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--ink-800)', mb: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Contact Details
              </Typography>
              <Box className="flex flex-col gap-2">
                <Box className="flex items-center gap-1">
                  <Typography sx={{ fontSize: 13, color: 'var(--ink-500)', fontWeight: 700, minWidth: 90, flexShrink: 0 }}>
                    EMAIL :-
                  </Typography>
                  <MuiLink href="mailto:info@globira.co.in" sx={{ fontSize: 13, color: 'var(--brand-700)', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                    info@globira.co.in
                  </MuiLink>
                </Box>
                <Box className="flex items-center gap-1">
                  <Typography sx={{ fontSize: 13, color: 'var(--ink-500)', fontWeight: 700, minWidth: 90, flexShrink: 0 }}>
                    MO :-
                  </Typography>
                  <Box className="flex items-center gap-1.5">
                    <Typography sx={{ fontSize: 13, color: 'var(--ink-800)', fontWeight: 600 }}>
                      6353979374
                    </Typography>
                    <IconButton
                      component="a"
                      href="https://wa.me/916353979374"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{
                        color: '#25D366',
                        backgroundColor: 'rgba(37, 211, 102, 0.1)',
                        '&:hover': {
                          backgroundColor: 'rgba(37, 211, 102, 0.2)',
                        },
                        p: 0.4,
                        ml: 0.5,
                      }}
                    >
                      <WhatsAppIcon sx={{ fontSize: 22 }} />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <Logo size={30} />
            <Typography sx={{ fontSize: 13, color: 'var(--ink-500)' }}>
              Agriport · B2B Wholesale Trading Platform
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'var(--ink-400)' }}>
              © {new Date().getFullYear()} · Confidential — Client Review
            </Typography>
          </Box>
        </Container>
      </Box>
      {/* Mobile Bottom Navigation Bar */}
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          justifyContent: 'space-around',
          borderTop: '1px solid var(--ink-200)',
          borderRadius: 0,
          bgcolor: '#ffffff',
          zIndex: 1000,
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        {[
          { label: 'Home', to: ROUTES.home, icon: <HomeRoundedIcon sx={{ fontSize: 22 }} /> },
          { label: 'Marketplace', to: ROUTES.products, icon: <StorefrontRoundedIcon sx={{ fontSize: 22 }} /> },
          {
            label: 'Cart',
            to: ROUTES.cart,
            icon: (
              <Badge badgeContent={cartCount} color="primary" overlap="circular">
                <ShoppingCartRoundedIcon sx={{ fontSize: 22 }} />
              </Badge>
            ),
          },
          { label: 'My Orders', to: ROUTES.orders, icon: <ReceiptLongRoundedIcon sx={{ fontSize: 22 }} /> },
          { label: 'Profile', to: ROUTES.profile, icon: <PersonRoundedIcon sx={{ fontSize: 22 }} /> },
        ].map((n) => {
          const active = isActive(n.to)
          return (
            <Box
              key={n.to}
              component={RouterLink}
              to={n.to}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                color: active ? 'var(--brand-600)' : 'var(--ink-600)',
                flex: 1,
                height: '100%',
                transition: 'color 0.2s, transform 0.1s',
                '&:active': { transform: 'scale(0.95)' },
              }}
            >
              {n.icon}
              <Typography sx={{ fontSize: 10.5, fontWeight: active ? 750 : 600, mt: 0.5 }}>
                {n.label}
              </Typography>
            </Box>
          )
        })}
      </Paper>
    </Box>
  )
}

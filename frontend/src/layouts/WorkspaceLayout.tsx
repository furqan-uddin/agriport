import { useState, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Outlet, NavLink, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Avatar,
  Tooltip,
  Badge,
  useMediaQuery,
  Divider,
  Button,
  Popover,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import Logo from '@/components/common/Logo'
import PageFallback from '@/components/common/PageFallback'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { signOut } from '@/redux/slices/authSlice'
import toast from 'react-hot-toast'
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '@/redux/api'
import useSSESync from '@/hooks/useSSESync'

const W = 256

export interface NavItem {
  label: string
  to: string
  icon: ReactNode
  end?: boolean
  children?: { label: string; to: string; icon?: ReactNode; end?: boolean }[]
}

export interface WorkspaceConfig {
  /** App-bar subtitle, e.g. "Sales Manager Workspace" */
  subtitle: string
  nav: NavItem[]
  /** Map of pathname -> page title */
  titles: Record<string, string>
  user: { name: string; role: string; initials: string }
  /** Bottom sidebar link (e.g. back to customer app) */
  exit: { to: string; label: string; icon: ReactNode }
  /** Where sign-out lands (this workspace's login). */
  loginPath: string
  /** Section label above nav */
  navLabel?: string
}

function Sidebar({ config, onNavigate }: { config: WorkspaceConfig; onNavigate?: () => void }) {
  const location = useLocation()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    config.nav.forEach((n) => {
      if (n.children && n.children.some((c) => location.pathname === c.to)) {
        initial[n.label] = true
      }
    })
    return initial
  })

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0A3324', color: '#fff' }}>
      <Box sx={{ px: 2.5, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo light size={32} />
        {onNavigate && (
          <IconButton onClick={onNavigate} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}>
            <CloseRoundedIcon />
          </IconButton>
        )}
      </Box>
      <Box sx={{ px: 2, py: 1, flex: 1, overflowY: 'auto' }}>
        <Typography sx={{ px: 1.5, py: 1, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)' }}>
          {config.navLabel ?? 'WORKSPACE'}
        </Typography>
        <Box className="flex flex-col gap-1">
          {config.nav.map((n) => {
            if (n.children) {
              const isOpen = !!openSections[n.label]
              return (
                <Box key={n.label} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Box
                    onClick={() => toggleSection(n.label)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 2.5,
                      color: isOpen ? '#fff' : 'rgba(255,255,255,0.66)',
                      bgcolor: isOpen ? 'rgba(255,255,255,0.04)' : 'transparent',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14.5,
                      transition: 'all .15s',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
                      '& svg': { fontSize: 21 },
                    }}
                  >
                    {n.icon}
                    <Box sx={{ flex: 1 }}>{n.label}</Box>
                    <Box sx={{ fontSize: 9, opacity: 0.7, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                      ▶
                    </Box>
                  </Box>
                  {isOpen && n.children.map((c) => (
                    <NavLink key={c.to} to={c.to} end={c.end} onClick={onNavigate} style={{ textDecoration: 'none' }}>
                      {({ isActive }) => (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            pl: 4.5,
                            pr: 1.5,
                            py: 1,
                            borderRadius: 2.5,
                            color: isActive ? '#fff' : 'rgba(255,255,255,0.66)',
                            bgcolor: isActive ? 'rgba(56,155,115,0.28)' : 'transparent',
                            fontWeight: 600,
                            fontSize: 13.5,
                            position: 'relative',
                            transition: 'all .15s',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
                            '& svg': { fontSize: 18 },
                            ...(isActive && {
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                left: -8,
                                top: 6,
                                bottom: 6,
                                width: 3,
                                borderRadius: 3,
                                bgcolor: '#66B894',
                              },
                            }),
                          }}
                        >
                          {c.icon}
                          {c.label}
                        </Box>
                      )}
                    </NavLink>
                  ))}
                </Box>
              )
            }
            return (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={onNavigate} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 2.5,
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.66)',
                      bgcolor: isActive ? 'rgba(56,155,115,0.28)' : 'transparent',
                      fontWeight: 600,
                      fontSize: 14.5,
                      position: 'relative',
                      transition: 'all .15s',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
                      '& svg': { fontSize: 21 },
                      ...(isActive && {
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: -8,
                          top: 8,
                          bottom: 8,
                          width: 3,
                          borderRadius: 3,
                          bgcolor: '#66B894',
                        },
                      }),
                    }}
                  >
                    {n.icon}
                    {n.label}
                  </Box>
                )}
              </NavLink>
            )
          })}
        </Box>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <Box sx={{ p: 2 }}>
        <Button
          component={RouterLink}
          to={config.exit.to}
          startIcon={config.exit.icon}
          fullWidth
          onClick={onNavigate}
          sx={{ justifyContent: 'flex-start', color: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
        >
          {config.exit.label}
        </Button>
      </Box>
    </Box>
  )
}

export default function WorkspaceLayout({ config }: { config: WorkspaceConfig }) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const title = config.titles[location.pathname] ?? config.subtitle

  // Initialize SSE synchronization stream
  useSSESync()

  const [notifAnchorEl, setNotifAnchorEl] = useState<HTMLButtonElement | null>(null)

  const handleOpenNotifications = (event: React.MouseEvent<HTMLButtonElement>) => {
    setNotifAnchorEl(event.currentTarget)
  }
  const handleCloseNotifications = () => {
    setNotifAnchorEl(null)
  }

  const { data: notificationsData } = useGetNotificationsQuery()
  const [markAsRead] = useMarkNotificationReadMutation()
  const [markAllAsRead] = useMarkAllNotificationsReadMutation()

  const notificationsList = notificationsData?.notifications || []
  const unreadCount = notificationsList.filter((n: any) => !n.read).length

  const handleSignOut = () => {
    dispatch(signOut())
    toast.success('Signed out')
    navigate(config.loginPath, { replace: true })
  }

  const handleToggleSidebar = () => {
    if (isDesktop) {
      setDesktopOpen(!desktopOpen)
    } else {
      setMobileOpen(!mobileOpen)
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F4F6F8' }}>
      {isDesktop && desktopOpen && (
        <Box component="nav" sx={{ width: W, flexShrink: 0 }}>
          <Box sx={{ position: 'fixed', width: W, height: '100vh' }}>
            <Sidebar config={config} />
          </Box>
        </Box>
      )}
      {!isDesktop && (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} slotProps={{ paper: { sx: { width: W, border: 'none' } } }}>
          <Sidebar config={config} onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            height: 64,
            px: { xs: 1.5, sm: 2, md: 3 },
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1, sm: 2 },
            bgcolor: 'rgba(255,255,255,0.85)',
            backdropFilter: 'saturate(180%) blur(12px)',
            borderBottom: '1px solid var(--ink-200)',
          }}
        >
          <IconButton onClick={handleToggleSidebar} edge="start" sx={{ color: 'var(--ink-700)' }}>
            <MenuRoundedIcon />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              noWrap
              sx={{
                fontFamily: '"Bricolage Grotesque", serif',
                fontWeight: 700,
                fontSize: { xs: 16, sm: 19 },
                lineHeight: 1.1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'var(--ink-500)', display: { xs: 'none', sm: 'block' } }}>
              {config.subtitle}
            </Typography>
          </Box>
          <Tooltip title="Notifications">
            <IconButton onClick={handleOpenNotifications}>
              <Badge color="error" badgeContent={unreadCount}>
                <NotificationsRoundedIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Popover
            open={Boolean(notifAnchorEl)}
            anchorEl={notifAnchorEl}
            onClose={handleCloseNotifications}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            slotProps={{
              paper: {
                sx: { width: 320, maxHeight: 400, display: 'flex', flexDirection: 'column', mt: 1 }
              }
            }}
          >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ink-200)' }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Notifications</Typography>
              {unreadCount > 0 && (
                <Button size="small" onClick={() => markAllAsRead()} sx={{ fontSize: 11, textTransform: 'none', color: 'var(--brand-700)' }}>
                  Mark all as read
                </Button>
              )}
            </Box>
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
              {notificationsList.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 13, color: 'var(--ink-500)' }}>No notifications yet</Typography>
                </Box>
              ) : (
                notificationsList.map((notif: any) => (
                  <Box
                    key={notif.id || notif._id}
                    onClick={async () => {
                      if (!notif.read) {
                        await markAsRead(notif.id || notif._id);
                      }
                      handleCloseNotifications();
                      if (notif.entityId) {
                        const entityIdStr = notif.entityId.toString();
                        if (notif.type === 'order') {
                          if (config.user.role === 'customer' || config.user.role === 'Customer') {
                            navigate(`/orders/${entityIdStr}`);
                          } else {
                            navigate(`/admin/orders?id=${entityIdStr}`);
                          }
                        } else if (notif.type === 'kyc') {
                          navigate('/admin/users');
                        } else if (notif.type === 'stock') {
                          if (config.user.role === 'admin' || config.user.role === 'Admin') {
                            navigate('/admin/inventory');
                          } else {
                            navigate('/inventory');
                          }
                        } else if (notif.type === 'payment') {
                          if (config.user.role === 'admin' || config.user.role === 'Admin') {
                            navigate('/admin/payments');
                          } else {
                            navigate(`/orders/${entityIdStr}`);
                          }
                        } else if (notif.type === 'auth') {
                          if (config.user.role === 'admin' || config.user.role === 'Admin') {
                            navigate('/admin/users');
                          }
                        }
                      }
                    }}
                    sx={{
                      p: 1.5,
                      borderBottom: '1px solid var(--ink-100)',
                      cursor: 'pointer',
                      backgroundColor: notif.read ? 'transparent' : 'rgba(10, 51, 36, 0.04)',
                      '&:hover': { backgroundColor: 'var(--ink-50)' },
                    }}
                  >
                    <Typography sx={{ fontWeight: notif.read ? 600 : 700, fontSize: 12.5, color: 'var(--ink-900)' }}>
                      {notif.title}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: 'var(--ink-600)', mt: 0.5 }}>
                      {notif.message}
                    </Typography>
                    <Typography sx={{ fontSize: 9.5, color: 'var(--ink-400)', mt: 0.5 }}>
                      {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          </Popover>
          <Box className="flex items-center" sx={{ gap: { xs: 0.5, sm: 1, md: 2 }, pl: { xs: 0.5, sm: 1 }, borderLeft: '1px solid var(--ink-200)' }}>
            <Avatar sx={{ width: { xs: 30, sm: 36 }, height: { xs: 30, sm: 36 }, bgcolor: 'var(--brand-700)', fontSize: { xs: 12, sm: 14 } }}>{config.user.initials}</Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.1 }}>{config.user.name}</Typography>
              <Typography sx={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{config.user.role}</Typography>
            </Box>
            <Tooltip title="Sign out">
              <IconButton onClick={handleSignOut} size="small">
                <LogoutRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box component="main" sx={{ p: { xs: 2, md: 3.5 }, flex: 1, minWidth: 0 }}>
          <Box className="animate-fade-up" sx={{ minWidth: 0 }}>
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

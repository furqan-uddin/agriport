import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAppSelector } from '@/redux/hooks'
import type { UserRole } from '@/types'

/**
 * Gates a workspace to one or more roles. If the visitor isn't signed in as an
 * authorized role, they're sent to a dedicated login.
 */
export default function RoleRoute({ role, children }: { role: UserRole | UserRole[]; children: ReactNode }) {
  const status = useAppSelector((s) => s.auth.status)
  const userRole = useAppSelector((s) => s.auth.user?.role)
  const location = useLocation()

  const allowedRoles = Array.isArray(role) ? role : [role]

  if (status !== 'authenticated' || !userRole || !allowedRoles.includes(userRole)) {
    const redirectRole = Array.isArray(role) ? role[0] : role
    return <Navigate to={`/${redirectRole}/login`} state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

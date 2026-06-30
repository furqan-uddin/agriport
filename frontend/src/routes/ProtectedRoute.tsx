import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAppSelector } from '@/redux/hooks'
import { ROUTES } from '@/constants'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAppSelector((s) => s.auth.status)
  const location = useLocation()

  if (status !== 'authenticated') {
    return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

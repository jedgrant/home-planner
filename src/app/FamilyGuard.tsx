import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/shared/lib/authStore'

export function FamilyGuard() {
  const { user } = useAuthStore()

  if (!user?.familyId) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}

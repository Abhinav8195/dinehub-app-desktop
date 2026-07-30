import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { SplashScreen } from '@/components/brand/SplashScreen'
import { FeatureAccessBoundary } from '@/components/auth/FeatureAccessBoundary'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isInitialized, isLoading } = useAuth()
  const location = useLocation()

  if (!isInitialized || isLoading) {
    return <SplashScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <FeatureAccessBoundary>{children}</FeatureAccessBoundary>
}

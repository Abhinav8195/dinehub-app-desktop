import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SplashScreen } from '@/components/brand/SplashScreen'
import { useAuth } from '@/hooks/useAuth'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { usePermissions } from '@/hooks/usePermissions'
import { RESTAURANT_FEATURES } from '@/types/restaurant-features'

function CenteredCard({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background p-6">{children}</div>
}

function useSignOut() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  return async () => {
    await logout()
    navigate('/login', { replace: true })
  }
}

export function FeatureAccessBoundary({ children }: { children: React.ReactNode }) {
  const { isLoading, isError, error, refetch, hasAnyFeature } = useFeatureAccess()
  const { isSuperAdmin } = usePermissions()
  const signOut = useSignOut()
  const [tookTooLong, setTookTooLong] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setTookTooLong(false)
      return
    }
    const timer = window.setTimeout(() => setTookTooLong(true), 10_000)
    return () => window.clearTimeout(timer)
  }, [isLoading])

  if (isLoading && !tookTooLong) return <SplashScreen />

  if (isLoading && tookTooLong) {
    return (
      <CenteredCard>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Still loading</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Workspace features are taking longer than expected. Retry or sign in again.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => { setTookTooLong(false); void refetch() }}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button>
              <Button variant="outline" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
            </div>
          </CardContent>
        </Card>
      </CenteredCard>
    )
  }

  if (isError) {
    return (
      <CenteredCard>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Feature access unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error || 'Unable to load restaurant features.'}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button>
              <Button variant="outline" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
            </div>
          </CardContent>
        </Card>
      </CenteredCard>
    )
  }

  if (!isSuperAdmin && !hasAnyFeature([...RESTAURANT_FEATURES])) {
    return <NoFeaturesEnabled />
  }

  return <>{children}</>
}

export function NoFeaturesEnabled() {
  const signOut = useSignOut()
  return (
    <CenteredCard>
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>No features enabled</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Contact your DiningHub administrator to enable features for this restaurant.
          </p>
          <Button variant="outline" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
        </CardContent>
      </Card>
    </CenteredCard>
  )
}

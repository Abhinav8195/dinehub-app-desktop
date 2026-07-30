import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SplashScreen } from '@/components/brand/SplashScreen'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { usePermissions } from '@/hooks/usePermissions'
import { RESTAURANT_FEATURES } from '@/types/restaurant-features'

function CenteredCard({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background p-6">{children}</div>
}

export function FeatureAccessBoundary({ children }: { children: React.ReactNode }) {
  const { isLoading, isError, error, refetch, hasAnyFeature } = useFeatureAccess()
  const { isSuperAdmin } = usePermissions()

  if (isLoading) return <SplashScreen />

  if (isError) {
    return (
      <CenteredCard>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Feature access unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error || 'Unable to load restaurant features.'}</p>
            <Button onClick={() => void refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button>
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
  return (
    <CenteredCard>
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>No features enabled</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Contact your DineHub administrator to enable features for this restaurant.
        </CardContent>
      </Card>
    </CenteredCard>
  )
}

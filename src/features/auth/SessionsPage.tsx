import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Monitor, Smartphone, Trash2, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { authApi } from '@/api/auth.api'
import { formatApiError } from '@/api/management-utils'
import { formatDateTime } from '@/lib/utils'

export default function SessionsPage() {
  const queryClient = useQueryClient()

  const { data: sessions, isLoading, isError, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => authApi.getSessions()
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: () => {
      toast.success('Session revoked')
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
    onError: (err) => toast.error(formatApiError(err, 'Could not revoke session'))
  })

  return (
    <PageShell isLoading={isLoading} isError={isError} onRetry={() => refetch()}>
      <div className="page-container">
        <PageHeader title="Active Sessions" description="Devices where you are signed in" />

        <div className="space-y-3">
          {(sessions ?? []).filter((s) => !s.status || s.status === 'ACTIVE').map((session) => (
            <Card key={session.id} className={session.isCurrent ? 'border-primary/30 bg-primary/5' : ''}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  {session.deviceType === 'desktop' ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{session.deviceName || 'Unknown device'}</p>
                    {session.isCurrent && <Badge variant="success">Current</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Last active {formatDateTime(session.lastActiveAt)}
                  </p>
                </div>
                {!session.isCurrent && (
                  <Button variant="outline" size="sm" onClick={() => revokeMutation.mutate(session.id)} disabled={revokeMutation.isPending}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {sessions?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No active sessions found</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}

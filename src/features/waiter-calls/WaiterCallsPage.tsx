import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { tablesApi } from '@/api/tables.api'
import { waiterRequestsApi, type WaiterRequest } from '@/api/qr-ordering.api'
import { formatApiError } from '@/api/management-utils'

const waiterLabels: Partial<Record<WaiterRequest['type'], string>> = {
  WAITER: 'Call waiter',
  WATER: 'Water',
  BILL: 'Bill request',
  CLEAN_TABLE: 'Clean table',
  ASSISTANCE: 'Help',
  OTHER: 'Other',
}

export default function WaiterCallsPage() {
  const queryClient = useQueryClient()
  const { data: waiterResult, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['waiter-requests'],
    queryFn: () => waiterRequestsApi.list(),
    refetchInterval: 8_000,
  })
  const { data: tables = [] } = useQuery({ queryKey: ['tables'], queryFn: tablesApi.list })
  const waiterRequests = waiterResult?.data ?? []
  const pendingCount = useMemo(
    () => waiterRequests.filter((request) => request.status === 'PENDING').length,
    [waiterRequests]
  )

  const waiterAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'acknowledge' | 'complete' | 'cancel' }) =>
      waiterRequestsApi[action](id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiter-requests'] })
      toast.success('Waiter request updated')
    },
    onError: (error) => toast.error(formatApiError(error, 'Could not update waiter request')),
  })

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader
          title="Waiter Calls"
          description="Live guest requests from QR tables — acknowledge and complete from here"
          actions={
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          }
        />

        <div className="mb-4 flex gap-3">
          <Badge variant={pendingCount ? 'destructive' : 'secondary'}>{pendingCount} pending</Badge>
          <Badge variant="outline">{waiterRequests.length} total</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-5 w-5" /> Live waiter calls
            </CardTitle>
            <CardDescription>Also available under QR Ordering → Waiter calls.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : !waiterRequests.length ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No waiter requests right now.</p>
            ) : (
              <div className="space-y-3">
                {waiterRequests.map((request) => {
                  const table = tables.find((item) => item.id === request.tableId)
                  return (
                    <div key={request.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10">
                        <BellRing className="h-5 w-5 text-warning" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{waiterLabels[request.type] ?? request.type}</p>
                          <Badge variant={request.status === 'PENDING' ? 'destructive' : request.status === 'ACKNOWLEDGED' ? 'secondary' : 'success'}>
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-sm">Table {table?.number ?? request.tableId}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.message || 'No message'} · {new Date(request.requestedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {request.status === 'PENDING' && (
                          <Button size="sm" onClick={() => waiterAction.mutate({ id: request.id, action: 'acknowledge' })}>
                            Acknowledge
                          </Button>
                        )}
                        {request.status === 'ACKNOWLEDGED' && (
                          <Button size="sm" onClick={() => waiterAction.mutate({ id: request.id, action: 'complete' })}>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Complete
                          </Button>
                        )}
                        {(request.status === 'PENDING' || request.status === 'ACKNOWLEDGED') && (
                          <Button variant="outline" size="sm" onClick={() => waiterAction.mutate({ id: request.id, action: 'cancel' })}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

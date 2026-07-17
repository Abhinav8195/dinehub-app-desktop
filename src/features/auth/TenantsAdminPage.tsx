import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Building2, Trash2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { tenantsApi } from '@/api/tenants.api'
import type { Tenant } from '@/api/types/tenants.types'
import { ApiError } from '@/api/types/common'
import { usePermissions } from '@/hooks/usePermissions'
import { Navigate } from 'react-router-dom'

const statusVariant = (s: string): 'success' | 'warning' | 'destructive' | 'secondary' => {
  const map: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    active: 'success', trial: 'warning', inactive: 'secondary', suspended: 'destructive'
  }
  return map[s] || 'secondary'
}

export default function TenantsAdminPage() {
  const { isSuperAdmin } = usePermissions()
  const queryClient = useQueryClient()
  const [page] = useState(1)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tenants', page],
    queryFn: () => tenantsApi.list({ page, limit: 20 }),
    enabled: isSuperAdmin
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenantsApi.delete(id),
    onSuccess: () => { toast.success('Tenant deleted'); queryClient.invalidateQueries({ queryKey: ['tenants'] }) },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Delete failed')
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => tenantsApi.restore(id),
    onSuccess: () => { toast.success('Tenant restored'); queryClient.invalidateQueries({ queryKey: ['tenants'] }) },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Restore failed')
  })

  if (!isSuperAdmin) return <Navigate to="/app" replace />

  const columns: ColumnDef<Tenant>[] = [
    {
      accessorKey: 'name', header: 'Restaurant',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {row.original.name[0]}
          </div>
          <div><p className="font-medium">{row.original.name}</p><p className="text-xs text-muted-foreground">{row.original.slug}</p></div>
        </div>
      )
    },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge> },
    { accessorKey: 'plan', header: 'Plan', cell: ({ row }) => row.original.plan?.name || '—' },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString() },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.status === 'inactive' ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => restoreMutation.mutate(row.original.id)}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-danger" onClick={() => deleteMutation.mutate(row.original.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )
    }
  ]

  return (
    <PageShell isLoading={isLoading} isError={isError} onRetry={() => refetch()}>
      <div className="page-container">
        <PageHeader
          title="SaaS Administration"
          description="Manage all restaurant tenants (Super Admin)"
          actions={<Button><Plus className="h-4 w-4 mr-2" /> Add Tenant</Button>}
        />
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat-card flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div><p className="text-2xl font-bold">{data?.meta?.total ?? 0}</p><p className="text-sm text-muted-foreground">Total Tenants</p></div>
          </div>
        </div>
        <DataTable columns={columns} data={data?.data ?? []} searchKey="name" />
      </div>
    </PageShell>
  )
}

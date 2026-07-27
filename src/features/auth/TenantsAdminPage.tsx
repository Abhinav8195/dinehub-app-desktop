import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Building2, Trash2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || 'Owner',
    lastName: parts.slice(1).join(' ') || 'Admin',
  }
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  ownerName: '',
  ownerEmail: '',
  ownerPassword: '',
  planSlug: 'free-trial',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
}

export default function TenantsAdminPage() {
  const { isSuperAdmin } = usePermissions()
  const queryClient = useQueryClient()
  const [page] = useState(1)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tenants', page],
    queryFn: () => tenantsApi.list({ page, limit: 20 }),
    enabled: isSuperAdmin
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['tenants', 'plans'],
    queryFn: tenantsApi.getPlans,
    enabled: isSuperAdmin && open,
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

  const createMutation = useMutation({
    mutationFn: () => {
      const { firstName, lastName } = splitName(form.ownerName)
      return tenantsApi.create({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        ownerEmail: form.ownerEmail.trim().toLowerCase(),
        ownerFirstName: firstName,
        ownerLastName: lastName,
        ownerPassword: form.ownerPassword,
        planSlug: form.planSlug || 'free-trial',
        currency: form.currency,
        timezone: form.timezone,
        country: 'IN',
      })
    },
    onSuccess: () => {
      toast.success('Restaurant created')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setOpen(false)
      setForm(emptyForm)
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Create failed'),
  })

  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length > 1 &&
      form.email.includes('@') &&
      form.ownerName.trim().length > 0 &&
      form.ownerEmail.includes('@') &&
      form.ownerPassword.length >= 8
    )
  }, [form])

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
          actions={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Tenant
            </Button>
          }
        />
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat-card flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div><p className="text-2xl font-bold">{data?.meta?.total ?? 0}</p><p className="text-sm text-muted-foreground">Total Tenants</p></div>
          </div>
        </div>
        <DataTable columns={columns} data={data?.data ?? []} searchKey="name" />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Restaurant</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Restaurant name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Spice Garden" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Business email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Owner name</Label>
              <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Owner email (login)</Label>
                <Input type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Owner password</Label>
                <Input type="password" value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Plan</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.planSlug}
                  onChange={(e) => setForm({ ...form, planSlug: e.target.value })}
                >
                  <option value="free-trial">Free Trial</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.slug}>{plan.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Currency</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Slug/code is auto-generated from the restaurant name. No subdomain step.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

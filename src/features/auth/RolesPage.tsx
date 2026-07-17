import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Edit, Trash2, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rolesApi } from '@/api/auth.api'
import type { Role } from '@/api/types/auth.types'
import { ApiError } from '@/api/types/common'
import { PermissionGuard } from '@/guards/PermissionGuard'

export default function RolesPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', description: '' })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list({ page: 1, limit: 50 })
  })

  const createMutation = useMutation({
    mutationFn: () => rolesApi.create({ ...form, permissions: [] }),
    onSuccess: () => {
      toast.success('Role created')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setDialogOpen(false)
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to create role')
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: () => {
      toast.success('Role deleted')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to delete role')
  })

  const columns: ColumnDef<Role>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'slug', header: 'Slug', cell: ({ row }) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.original.slug}</code> },
    { accessorKey: 'description', header: 'Description' },
    {
      accessorKey: 'permissions', header: 'Permissions',
      cell: ({ row }) => <Badge variant="secondary">{row.original.permissions?.length ?? 0}</Badge>
    },
    {
      accessorKey: 'isSystem', header: 'Type',
      cell: ({ row }) => <Badge variant={row.original.isSystem ? 'info' : 'outline'}>{row.original.isSystem ? 'System' : 'Custom'}</Badge>
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => !row.original.isSystem && (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingRole(row.original); setForm({ name: row.original.name, slug: row.original.slug, description: row.original.description || '' }); setDialogOpen(true) }}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-danger" onClick={() => deleteMutation.mutate(row.original.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <PageShell isLoading={isLoading} isError={isError} onRetry={() => refetch()}>
      <div className="page-container">
        <PageHeader
          title="Roles & Permissions"
          description="Manage user roles and access control"
          actions={
            <PermissionGuard permission="roles.create">
              <Button onClick={() => { setEditingRole(null); setForm({ name: '', slug: '', description: '' }); setDialogOpen(true) }}>
                <Plus className="h-4 w-4 mr-2" /> Add Role
              </Button>
            </PermissionGuard>
          }
        />

        <DataTable columns={columns} data={data?.data ?? []} searchKey="name" searchPlaceholder="Search roles..." />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!editingRole} /></div>
              <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {editingRole ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}

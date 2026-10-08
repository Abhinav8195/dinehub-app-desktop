import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { branchesApi } from '@/api/phase1.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface Branch {
  id: string
  name: string
  code: string
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  isDefault?: boolean
  isActive?: boolean
}

const emptyForm = { name: '', code: '', phone: '', email: '', address: '', city: '', isDefault: false, isActive: true }

export function BranchManagement() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [open, setOpen] = useState(false)
  const { data: branches = [], isLoading } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.list })
  const rows = branches as Branch[]
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['branches'] })
  const close = () => { setOpen(false); setEditing(null); setForm(emptyForm) }
  const showCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true) }
  const showEdit = (branch: Branch) => {
    setEditing(branch)
    setForm({
      name: branch.name, code: branch.code, phone: branch.phone ?? '', email: branch.email ?? '',
      address: branch.address ?? '', city: branch.city ?? '', isDefault: Boolean(branch.isDefault),
      isActive: branch.isActive !== false,
    })
    setOpen(true)
  }
  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, name: form.name.trim(), code: form.code.trim().toUpperCase(), phone: form.phone.trim() || undefined, email: form.email.trim() || undefined, address: form.address.trim() || undefined, city: form.city.trim() || undefined }
      return editing ? branchesApi.update(editing.id, body) : branchesApi.create(body)
    },
    onSuccess: () => { toast.success(editing ? 'Branch updated' : 'Branch created'); refresh(); close() },
    onError: (error: Error) => toast.error(error.message || 'Unable to save branch'),
  })
  const setDefault = useMutation({
    mutationFn: (id: string) => branchesApi.setDefault(id),
    onSuccess: () => { toast.success('Default branch updated'); refresh() },
    onError: (error: Error) => toast.error(error.message || 'Unable to update default branch'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => branchesApi.delete(id),
    onSuccess: () => { toast.success('Branch removed'); refresh() },
    onError: (error: Error) => toast.error(error.message || 'Unable to remove branch'),
  })

  return <>
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div><CardTitle className="text-base">Branches</CardTitle><CardDescription>Create and manage restaurant locations. {rows.length} active {rows.length === 1 ? 'branch' : 'branches'}.</CardDescription></div>
        <Button onClick={showCreate}><Plus className="mr-2 h-4 w-4" /> Add Branch</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading branches…</p> : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((branch) => <div key={branch.id} className="rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-primary/10 p-2 text-primary"><Building2 className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{branch.name}</p>{branch.isDefault && <Badge variant="success">Default</Badge>}{branch.isActive === false && <Badge variant="secondary">Inactive</Badge>}</div>
                  <p className="text-xs text-muted-foreground">Code: {branch.code}</p>
                  {(branch.address || branch.city) && <p className="mt-2 flex gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{[branch.address, branch.city].filter(Boolean).join(', ')}</p>}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {!branch.isDefault && <Button size="sm" variant="outline" onClick={() => setDefault.mutate(branch.id)} disabled={setDefault.isPending}><Star className="mr-1 h-3.5 w-3.5" /> Make default</Button>}
                <Button size="sm" variant="outline" onClick={() => showEdit(branch)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                {!branch.isDefault && <Button size="sm" variant="outline" className="text-destructive" onClick={() => window.confirm(`Remove ${branch.name}?`) && remove.mutate(branch.id)} disabled={remove.isPending}><Trash2 className="mr-1 h-3.5 w-3.5" /> Remove</Button>}
              </div>
            </div>)}
          </div>
        )}
      </CardContent>
    </Card>
    <Dialog open={open} onOpenChange={(value) => { if (!value) close() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Edit branch' : 'Create branch'}</DialogTitle><DialogDescription>Branch details are visible throughout orders, reports, staff and operations.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Downtown Branch" /></div>
          <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="DT01" /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div>
          <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></div>
          <div className="flex items-center justify-between rounded-lg border px-3"><Label htmlFor="branch-active">Active</Label><Switch id="branch-active" checked={form.isActive} onCheckedChange={(isActive) => setForm({ ...form, isActive })} /></div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-3 sm:col-span-2"><div><Label htmlFor="branch-default">Default branch</Label><p className="text-xs text-muted-foreground">New orders and staff use this branch by default.</p></div><Switch id="branch-default" checked={form.isDefault} onCheckedChange={(isDefault) => setForm({ ...form, isDefault })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim() || !form.code.trim()}>{save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create branch'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Eye, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { combosApi } from '@/api/catalog.api'
import { menuItemService, resolveMenuImageUrl } from '@/api/menu.api'
import type { Combo, ComboBody } from '@/api/types/catalog.types'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import { ImageUploadField } from './components/ImageUploadField'

const emptyCombo = (): ComboBody => ({ name: '', description: '', price: 0, imageUrl: '', isActive: true, items: [] })

export default function ComboManagementPage() {
  const client = useQueryClient()
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<Combo | null>(null)
  const [detail, setDetail] = useState<Combo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Combo | null>(null)
  const [form, setForm] = useState<ComboBody>(emptyCombo())
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const combos = useQuery({ queryKey: ['combos', 'management'], queryFn: () => combosApi.list(true) })
  const items = useQuery({ queryKey: ['menu-items', 'combo-selection'], queryFn: () => menuItemService.list(undefined, true) })
  const mutation = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: () => client.invalidateQueries({ queryKey: ['combos'] }),
    onError: (error: Error) => toast.error(error.message || 'Request failed')
  })
  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (items.data ?? []).filter((item) => !term || item.name.toLowerCase().includes(term))
  }, [items.data, search])
  const openForm = (combo?: Combo) => {
    setEditing(combo ?? null)
    setForm(combo ? {
      name: combo.name, description: combo.description ?? '', price: combo.price,
      imageUrl: combo.imageUrl ?? '', isActive: combo.isActive,
      items: combo.items.map((item) => ({ menuItemId: item.menuItemId ?? item.menuItem?.id ?? '', quantity: item.quantity }))
    } : emptyCombo())
    setSearch('')
    setDialog(true)
  }
  const toggleItem = (menuItemId: string) => {
    setForm((current) => current.items.some((item) => item.menuItemId === menuItemId)
      ? { ...current, items: current.items.filter((item) => item.menuItemId !== menuItemId) }
      : { ...current, items: [...current.items, { menuItemId, quantity: 1 }] })
  }
  const save = () => {
    if (!form.name.trim()) return toast.error('Combo name is required')
    if (!Number.isFinite(form.price) || form.price < 0) return toast.error('Combo price cannot be negative')
    if (!form.items.length) return toast.error('Select at least one menu item')
    if (form.items.some((item) => !item.menuItemId || item.quantity < 1)) return toast.error('Every quantity must be at least 1')
    const body = { ...form, name: form.name.trim(), description: form.description?.trim() || undefined, imageUrl: form.imageUrl || undefined }
    mutation.mutate(
      () => editing ? combosApi.update(editing.id, body) : combosApi.create(body),
      { onSuccess: () => { setDialog(false); toast.success(editing ? 'Combo updated' : 'Combo created') } }
    )
  }
  const remove = () => {
    if (!deleteTarget) return
    mutation.mutate(() => combosApi.delete(deleteTarget.id), {
      onSuccess: () => { setDeleteTarget(null); toast.success('Combo deleted') }
    })
  }
  const itemName = (id: string) => items.data?.find((item) => item.id === id)?.name ?? id

  return <PageShell>
    <div className="page-container">
      <PageHeader title="Combo Management" description="Build fixed-price combos from menu items" actions={
        <><Button variant="outline" onClick={() => combos.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button onClick={() => openForm()}><Plus className="mr-2 h-4 w-4" />Add combo</Button></>
      } />
      {combos.isLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
        : combos.isError ? <Card><CardContent className="p-10 text-center"><p className="text-danger">Failed to load combos.</p><Button className="mt-3" onClick={() => combos.refetch()}>Try again</Button></CardContent></Card>
        : !combos.data?.length ? <Card><CardContent className="p-12 text-center text-muted-foreground">No combos yet.<br /><Button className="mt-4" onClick={() => openForm()}>Create first combo</Button></CardContent></Card>
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{combos.data.map((combo) =>
          <Card key={combo.id} className={!combo.isActive ? 'opacity-65' : ''}>
            <div className="flex h-36 items-center justify-center overflow-hidden bg-muted">
              {combo.imageUrl ? <img src={resolveMenuImageUrl(combo.imageUrl) ?? ''} alt={combo.name} className="h-full w-full object-cover" /> : <span className="text-4xl">🍱</span>}
            </div>
            <CardContent className="space-y-3 p-4"><div className="flex items-start"><div className="mr-auto"><h2 className="font-semibold">{combo.name}</h2><p className="text-xs text-muted-foreground">{combo.items.length} item types</p></div><p className="font-bold text-primary">{formatCurrency(combo.price)}</p></div>
              <div className="flex items-center"><Switch checked={combo.isActive} onCheckedChange={(isActive) => mutation.mutate(() => combosApi.update(combo.id, { isActive }))} /><span className="ml-2 mr-auto text-xs">{combo.isActive ? 'Active' : 'Inactive'}</span>
                <Button size="icon" variant="ghost" onClick={() => setDetail(combo)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => openForm(combo)}><Edit className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-danger" onClick={() => setDeleteTarget(combo)}><Trash2 className="h-4 w-4" /></Button>
              </div></CardContent>
          </Card>)}</div>}
    </div>

    <Dialog open={dialog} onOpenChange={setDialog}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} combo</DialogTitle><DialogDescription>Upload the image first, then save the returned URL with the combo.</DialogDescription></DialogHeader>
      <div className="space-y-4"><div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>Fixed price</Label><Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div><label className="mt-7 flex justify-between">Active <Switch checked={form.isActive} onCheckedChange={(isActive) => setForm({ ...form, isActive })} /></label></div>
        <ImageUploadField kind="combo" value={form.imageUrl} onUploaded={(imageUrl) => setForm({ ...form, imageUrl })} onUploadingChange={setUploading} />
        <div><Label>Menu items *</Label><Input className="my-2" placeholder="Search menu items…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-56 space-y-2 overflow-y-auto">{visibleItems.map((item) => {
            const selected = form.items.find((entry) => entry.menuItemId === item.id)
            return <div key={item.id} className="flex items-center gap-3 rounded border p-2"><input type="checkbox" checked={Boolean(selected)} onChange={() => toggleItem(item.id)} /><span className="mr-auto text-sm">{item.name}</span>{selected && <><Label className="text-xs">Qty</Label><Input className="w-20" type="number" min="1" value={selected.quantity} onChange={(e) => setForm({ ...form, items: form.items.map((entry) => entry.menuItemId === item.id ? { ...entry, quantity: Math.max(1, Number(e.target.value)) } : entry) })} /></>}</div>
          })}</div>
        </div>
      </div><DialogFooter><Button variant="outline" onClick={() => setDialog(false)} disabled={uploading}>Cancel</Button><Button onClick={save} disabled={uploading || mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
    </DialogContent></Dialog>

    <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><DialogContent><DialogHeader><DialogTitle>{detail?.name}</DialogTitle><DialogDescription>{detail?.description || 'No description'}</DialogDescription></DialogHeader><div className="space-y-2">{detail?.items.map((item) => <div key={item.menuItemId} className="flex justify-between rounded border p-2 text-sm"><span>{item.menuItem?.name ?? itemName(item.menuItemId)}</span><Badge variant="secondary">× {item.quantity}</Badge></div>)}</div></DialogContent></Dialog>
    <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}><DialogContent><DialogHeader><DialogTitle>Delete {deleteTarget?.name}?</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="destructive" onClick={remove} disabled={mutation.isPending}>Delete</Button></DialogFooter></DialogContent></Dialog>
  </PageShell>
}

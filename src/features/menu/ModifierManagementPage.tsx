import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { modifiersApi } from '@/api/catalog.api'
import { menuItemService } from '@/api/menu.api'
import type { ModifierGroup, ModifierGroupBody, ModifierOption, ModifierOptionBody } from '@/api/types/catalog.types'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { formatCurrency } from '@/lib/utils'

const emptyGroup: ModifierGroupBody = { name: '', minSelect: 0, maxSelect: 1, required: false, isActive: true }
const emptyOption: ModifierOptionBody = { name: '', price: 0, isDefault: false, isActive: true, sortOrder: 0 }

export default function ModifierManagementPage() {
  const client = useQueryClient()
  const [groupDialog, setGroupDialog] = useState(false)
  const [optionDialog, setOptionDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null)
  const [editingOption, setEditingOption] = useState<ModifierOption | null>(null)
  const [activeGroupId, setActiveGroupId] = useState('')
  const [groupForm, setGroupForm] = useState<ModifierGroupBody>(emptyGroup)
  const [optionForm, setOptionForm] = useState<ModifierOptionBody>(emptyOption)
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'group' | 'option'; id: string; name: string } | null>(null)

  const groups = useQuery({ queryKey: ['modifiers', 'groups'], queryFn: modifiersApi.listGroups })
  const menuItems = useQuery({ queryKey: ['menu-items', 'modifier-attachments'], queryFn: () => menuItemService.list(undefined, true) })
  const refresh = () => client.invalidateQueries({ queryKey: ['modifiers'] })
  const mutation = useMutation({
    mutationFn: async (run: () => Promise<unknown>) => run(),
    onSuccess: () => refresh(),
    onError: (error: Error) => toast.error(error.message || 'Request failed')
  })

  const openGroup = (group?: ModifierGroup) => {
    setEditingGroup(group ?? null)
    setGroupForm(group ? {
      name: group.name, minSelect: group.minSelect, maxSelect: group.maxSelect,
      required: group.required, isActive: group.isActive
    } : emptyGroup)
    setGroupDialog(true)
  }
  const saveGroup = () => {
    if (!groupForm.name.trim()) return toast.error('Group name is required')
    if (groupForm.minSelect < 0) return toast.error('Minimum selection cannot be negative')
    if (groupForm.maxSelect < 1) return toast.error('Maximum selection must be at least 1')
    if (groupForm.minSelect > groupForm.maxSelect) return toast.error('Minimum selection cannot exceed maximum selection')
    mutation.mutate(
      () => editingGroup
        ? modifiersApi.updateGroup(editingGroup.id, groupForm)
        : modifiersApi.createGroup(groupForm),
      { onSuccess: () => { setGroupDialog(false); toast.success(editingGroup ? 'Modifier group updated' : 'Modifier group created') } }
    )
  }
  const openOption = (groupId: string, option?: ModifierOption) => {
    setActiveGroupId(groupId)
    setEditingOption(option ?? null)
    setOptionForm(option ? {
      name: option.name, price: option.price, isDefault: option.isDefault,
      isActive: option.isActive, sortOrder: option.sortOrder
    } : emptyOption)
    setOptionDialog(true)
  }
  const saveOption = () => {
    if (!optionForm.name.trim()) return toast.error('Option name is required')
    if (optionForm.price < 0) return toast.error('Option price cannot be negative')
    mutation.mutate(
      () => editingOption
        ? modifiersApi.updateOption(editingOption.id, optionForm)
        : modifiersApi.createOption(activeGroupId, optionForm),
      { onSuccess: () => { setOptionDialog(false); toast.success(editingOption ? 'Option updated' : 'Option created') } }
    )
  }
  const confirmDelete = () => {
    if (!deleteTarget) return
    mutation.mutate(
      () => deleteTarget.kind === 'group'
        ? modifiersApi.deleteGroup(deleteTarget.id)
        : modifiersApi.deleteOption(deleteTarget.id),
      { onSuccess: () => { toast.success('Deleted successfully'); setDeleteTarget(null) } }
    )
  }
  const toggleAttachment = (group: ModifierGroup, menuItemId: string, attached: boolean) => {
    mutation.mutate(
      () => attached
        ? modifiersApi.detachFromMenuItem(group.id, menuItemId)
        : modifiersApi.attachToMenuItem(group.id, menuItemId),
      { onSuccess: () => toast.success(attached ? 'Menu item detached' : 'Menu item attached') }
    )
  }

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Modifier Management" description="Manage option groups and menu-item attachments" actions={
          <><Button variant="outline" onClick={() => groups.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button onClick={() => openGroup()}><Plus className="mr-2 h-4 w-4" />Add group</Button></>
        } />
        {groups.isLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
          : groups.isError ? <Card><CardContent className="p-10 text-center"><p className="text-danger">Failed to load modifier groups.</p><Button className="mt-3" onClick={() => groups.refetch()}>Try again</Button></CardContent></Card>
          : !groups.data?.length ? <Card><CardContent className="p-12 text-center text-muted-foreground">No modifier groups yet.<br /><Button className="mt-4" onClick={() => openGroup()}>Create first group</Button></CardContent></Card>
          : <div className="space-y-4">{groups.data.map((group) => {
            const attachedIds = new Set(
              (group.menuItems ?? [])
                .map((item) => (item as { menuItemId?: string; id?: string }).menuItemId ?? item.id)
                .filter(Boolean)
            )
            return <Card key={group.id} className={!group.isActive ? 'opacity-65' : ''}><CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="mr-auto"><div className="flex items-center gap-2"><h2 className="font-semibold">{group.name}</h2><Badge variant={group.required ? 'warning' : 'secondary'}>{group.required ? 'Required' : 'Optional'}</Badge></div><p className="text-sm text-muted-foreground">Choose {group.minSelect}–{group.maxSelect} · {attachedIds.size} menu items</p></div>
                <Switch checked={group.isActive} onCheckedChange={(isActive) => mutation.mutate(() => modifiersApi.updateGroup(group.id, { isActive }))} />
                <Button size="icon" variant="ghost" onClick={() => openGroup(group)}><Edit className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-danger" onClick={() => setDeleteTarget({ kind: 'group', id: group.id, name: group.name })}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div>
                <div className="mb-2 flex items-center"><h3 className="mr-auto text-sm font-medium">Options</h3><Button size="sm" variant="outline" onClick={() => openOption(group.id)}><Plus className="mr-1 h-3.5 w-3.5" />Option</Button></div>
                <div className="grid gap-2 md:grid-cols-2">{[...(group.options ?? [])].sort((a, b) => a.sortOrder - b.sortOrder).map((option) =>
                  <div key={option.id} className={`flex items-center rounded-lg border p-3 ${!option.isActive ? 'opacity-60' : ''}`}>
                    <span className="mr-2 text-xs text-muted-foreground">#{option.sortOrder}</span><span className="mr-auto text-sm font-medium">{option.name} {option.isDefault && <Badge variant="secondary">Default</Badge>}</span><span className="text-sm">{formatCurrency(option.price)}</span>
                    <Switch className="ml-2 scale-75" checked={option.isActive} onCheckedChange={(isActive) => mutation.mutate(() => modifiersApi.updateOption(option.id, { isActive }))} />
                    <Button size="icon" variant="ghost" onClick={() => openOption(group.id, option)}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="text-danger" onClick={() => setDeleteTarget({ kind: 'option', id: option.id, name: option.name })}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>)}
                  {!group.options?.length && <p className="text-sm text-muted-foreground">No options yet.</p>}
                </div>
              </div>
              <details><summary className="cursor-pointer text-sm font-medium">Menu-item attachments ({attachedIds.size})</summary>
                <div className="mt-3 grid max-h-48 gap-2 overflow-y-auto md:grid-cols-3">
                  {menuItems.isLoading && <p className="col-span-full text-sm text-muted-foreground">Loading menu items…</p>}
                  {menuItems.isError && <p className="col-span-full text-sm text-danger">Failed to load menu items. <button type="button" className="underline" onClick={() => menuItems.refetch()}>Retry</button></p>}
                  {!menuItems.isLoading && !(menuItems.data ?? []).length && <p className="col-span-full text-sm text-muted-foreground">No menu items available.</p>}
                  {(menuItems.data ?? []).map((item) => {
                    const attached = attachedIds.has(item.id)
                    return (
                      <label key={item.id} className={`flex cursor-pointer items-center gap-2 rounded border p-2 text-sm ${attached ? 'border-primary bg-primary/5' : ''}`}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={attached}
                          disabled={mutation.isPending}
                          onChange={() => toggleAttachment(group, item.id, attached)}
                        />
                        <span className="flex-1">{item.name}</span>
                      </label>
                    )
                  })}
                </div>
              </details>
            </CardContent></Card>
          })}</div>}
      </div>

      <Dialog open={groupDialog} onOpenChange={setGroupDialog}><DialogContent><DialogHeader><DialogTitle>{editingGroup ? 'Edit' : 'Add'} modifier group</DialogTitle></DialogHeader>
        <div className="space-y-3"><div><Label>Name</Label><Input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Minimum selections</Label><Input type="number" min="0" value={groupForm.minSelect} onChange={(e) => setGroupForm({ ...groupForm, minSelect: Number(e.target.value) })} /></div><div><Label>Maximum selections</Label><Input type="number" min="1" value={groupForm.maxSelect} onChange={(e) => setGroupForm({ ...groupForm, maxSelect: Number(e.target.value) })} /></div></div>
          <label className="flex justify-between">Required <Switch checked={groupForm.required} onCheckedChange={(required) => setGroupForm({ ...groupForm, required })} /></label><label className="flex justify-between">Active <Switch checked={groupForm.isActive} onCheckedChange={(isActive) => setGroupForm({ ...groupForm, isActive })} /></label></div>
        <DialogFooter><Button variant="outline" onClick={() => setGroupDialog(false)}>Cancel</Button><Button onClick={saveGroup} disabled={mutation.isPending}>Save</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={optionDialog} onOpenChange={setOptionDialog}><DialogContent><DialogHeader><DialogTitle>{editingOption ? 'Edit' : 'Add'} option</DialogTitle></DialogHeader>
        <div className="space-y-3"><div><Label>Name</Label><Input value={optionForm.name} onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Additional price</Label><Input type="number" min="0" value={optionForm.price} onChange={(e) => setOptionForm({ ...optionForm, price: Number(e.target.value) })} /></div><div><Label>Sort order</Label><Input type="number" min="0" value={optionForm.sortOrder} onChange={(e) => setOptionForm({ ...optionForm, sortOrder: Number(e.target.value) })} /></div></div>
          <label className="flex justify-between">Default <Switch checked={optionForm.isDefault} onCheckedChange={(isDefault) => setOptionForm({ ...optionForm, isDefault })} /></label><label className="flex justify-between">Active <Switch checked={optionForm.isActive} onCheckedChange={(isActive) => setOptionForm({ ...optionForm, isActive })} /></label></div>
        <DialogFooter><Button variant="outline" onClick={() => setOptionDialog(false)}>Cancel</Button><Button onClick={saveOption} disabled={mutation.isPending}>Save</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}><DialogContent><DialogHeader><DialogTitle>Delete {deleteTarget?.name}?</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="destructive" onClick={confirmDelete} disabled={mutation.isPending}>Delete</Button></DialogFooter></DialogContent></Dialog>
    </PageShell>
  )
}

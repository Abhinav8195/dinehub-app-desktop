import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit, Eye, Image, Loader2, Plus, RefreshCw, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiError } from '@/api/types/common'
import { resolveMenuImageUrl, menuItemService } from '@/api/menu.api'
import type { Category, MenuItem } from '@/api/types/menu.types'
import { formatCurrency } from '@/lib/utils'
import { useMenuManagement } from './useMenuManagement'
import { ImageUploadField } from './components/ImageUploadField'
import { VariantEditor } from './components/VariantEditor'
import { effectiveVariantPrice, emptyVariant, validateVariants, type VariantDraft, type VariantErrors } from './variants'

interface ItemForm {
  categoryId: string
  name: string
  description: string
  price: string
  imageUrl: string
  isAvailable: boolean
  isPopular: boolean
  hasVariants: boolean
  variants: VariantDraft[]
}

const emptyItem = (categoryId = ''): ItemForm => ({
  categoryId, name: '', description: '', price: '0', imageUrl: '',
  isAvailable: true, isPopular: false, hasVariants: false, variants: []
})

function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : 'Request failed'
  if (Array.isArray(error.errors)) return error.errors.join(', ') || error.message
  if (error.errors) return Object.values(error.errors).flat().join(', ') || error.message
  return error.message
}

function apiVariantErrors(error: unknown): VariantErrors {
  if (!(error instanceof ApiError) || !error.errors || Array.isArray(error.errors)) return {}
  const result: VariantErrors = {}
  Object.entries(error.errors).forEach(([field, messages]) => {
    const match = field.match(/^variants(?:\.|\[)(\d+)(?:\]|\.)\.?([A-Za-z]+)$/)
    if (!match) return
    const key = match[2] as 'name' | 'price' | 'discountedPrice'
    if (!['name', 'price', 'discountedPrice'].includes(key)) return
    result[Number(match[1])] = { ...result[Number(match[1])], [key]: messages.join(', ') }
  })
  return result
}

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [itemDialog, setItemDialog] = useState(false)
  const [categoryDialog, setCategoryDialog] = useState(false)
  const [detail, setDetail] = useState<MenuItem | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'item' | 'category'; id: string; name: string } | null>(null)
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItem())
  const [variantErrors, setVariantErrors] = useState<VariantErrors>({})
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: '', sortOrder: '0', imageUrl: '' })
  const [itemImageUploading, setItemImageUploading] = useState(false)
  const [categoryImageUploading, setCategoryImageUploading] = useState(false)
  const menu = useMenuManagement(selectedCategory, showInactive)
  const categories = menu.categories.data ?? []
  const items = menu.items.data ?? []
  const navigate = useNavigate()

  useEffect(() => setSelectedIds(new Set()), [selectedCategory, showInactive])

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((item) => !term || item.name.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term))
  }, [items, search])

  const openNewItem = () => {
    if (!categories.length) return toast.error('Create a category first')
    setEditingItem(null)
    setItemForm(emptyItem(selectedCategory ?? categories[0].id))
    setVariantErrors({})
    setItemDialog(true)
  }

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setItemForm({
      categoryId: item.categoryId,
      name: item.name,
      description: item.description ?? '',
      price: String(item.price),
      imageUrl: item.imageUrl ?? '',
      isAvailable: item.available,
      isPopular: item.popular,
      hasVariants: item.hasVariants ?? Boolean(item.variants?.length),
      variants: (item.variants ?? []).map((variant) => ({
        id: variant.id, name: variant.name, price: String(variant.price),
        discountedPrice: variant.discountedPrice == null ? '' : String(variant.discountedPrice),
        isAvailable: variant.isAvailable, isDefault: variant.isDefault
      }))
    })
    setVariantErrors({})
    setItemDialog(true)
  }

  const saveItem = async () => {
    const price = Number(itemForm.price)
    if (!itemForm.name.trim()) return toast.error('Item name is required')
    if (!itemForm.categoryId) return toast.error('Select a category')
    if (!itemForm.hasVariants && (!Number.isFinite(price) || price < 0)) return toast.error('Price must be a number of at least zero')
    const errors = itemForm.hasVariants ? validateVariants(itemForm.variants) : {}
    setVariantErrors(errors)
    if (Object.keys(errors).length) return toast.error('Review the highlighted variant fields')
    const variantPayload = itemForm.hasVariants ? itemForm.variants.map((variant, sortOrder) => ({
      ...(variant.id ? { id: variant.id } : {}),
      name: variant.name.trim(),
      price: Number(variant.price),
      discountedPrice: variant.discountedPrice === '' ? null : Number(variant.discountedPrice),
      isAvailable: variant.isAvailable,
      isDefault: variant.isDefault,
      sortOrder,
    })) : undefined
    // Update DTO forbids nested `variants` — only create accepts them inline.
    const body = {
      categoryId: itemForm.categoryId,
      name: itemForm.name.trim(),
      description: itemForm.description.trim() || undefined,
      ...(itemForm.hasVariants ? {} : { price }),
      imageUrl: itemForm.imageUrl.trim() || undefined,
      isAvailable: itemForm.isAvailable,
      isPopular: itemForm.isPopular,
      hasVariants: itemForm.hasVariants,
      ...(editingItem || !itemForm.hasVariants ? {} : { variants: variantPayload }),
    }
    try {
      if (editingItem) {
        await menu.updateItem.mutateAsync({ id: editingItem.id, body })
        if (itemForm.hasVariants && variantPayload) {
          await menuItemService.syncVariants(editingItem.id, editingItem.variants ?? [], variantPayload)
          await menu.refresh()
        }
      } else {
        await menu.createItem.mutateAsync(body)
      }
      setItemDialog(false)
      toast.success(editingItem ? 'Menu item updated' : 'Menu item created')
    } catch (error) {
      const fieldErrors = apiVariantErrors(error)
      if (Object.keys(fieldErrors).length) setVariantErrors(fieldErrors)
      toast.error(errorMessage(error))
    }
  }

  const openCategory = (category?: Category) => {
    setEditingCategory(category ?? null)
    setCategoryForm(category
      ? { name: category.name, icon: category.icon ?? '', sortOrder: String(category.sortOrder), imageUrl: category.imageUrl ?? '' }
      : { name: '', icon: '', sortOrder: '0', imageUrl: '' })
    setCategoryDialog(true)
  }

  const saveCategory = async () => {
    const sortOrder = Number(categoryForm.sortOrder)
    if (!categoryForm.name.trim()) return toast.error('Category name is required')
    if (!Number.isInteger(sortOrder) || sortOrder < 0) return toast.error('Sort order must be a non-negative whole number')
    const body = {
      name: categoryForm.name.trim(),
      icon: categoryForm.icon.trim() || undefined,
      sortOrder,
      imageUrl: categoryForm.imageUrl || undefined
    }
    try {
      if (editingCategory) await menu.updateCategory.mutateAsync({ id: editingCategory.id, body })
      else await menu.createCategory.mutateAsync(body)
      setCategoryDialog(false)
      toast.success(editingCategory ? 'Category updated' : 'Category created')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'item') await menu.deleteItem.mutateAsync(deleteTarget.id)
      else await menu.deleteCategory.mutateAsync(deleteTarget.id)
      toast.success(`${deleteTarget.type === 'item' ? 'Item' : 'Category'} deleted`)
      setDeleteTarget(null)
    } catch (error) {
      toast.error(errorMessage(error), deleteTarget.type === 'category'
        ? {
            action: {
              label: 'View items',
              onClick: () => { setSelectedCategory(deleteTarget.id); setDeleteTarget(null) }
            }
          }
        : undefined)
    }
  }

  const toggleSelected = (id: string) => setSelectedIds((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const bulkSet = async (isAvailable: boolean) => {
    try {
      await menu.bulkToggle.mutateAsync({ ids: [...selectedIds], isAvailable })
      setSelectedIds(new Set())
      toast.success(`${selectedIds.size} items updated`)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <PageShell isLoading={menu.categories.isLoading || menu.items.isLoading}>
      <div className="page-container">
        <PageHeader title="Menu Management" description="Manage categories, availability, and menu items" actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => menu.refresh()} disabled={menu.categories.isFetching || menu.items.isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${(menu.categories.isFetching || menu.items.isFetching) ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button onClick={openNewItem}><Plus className="mr-2 h-4 w-4" /> Add item</Button>
          </div>
        } />

        <Tabs value="menu" onValueChange={(value) => {
          if (value === 'modifiers') navigate('/app/menu/modifiers')
          if (value === 'combos') navigate('/app/menu/combos')
        }}>
          <TabsList>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
            <TabsTrigger value="combos">Combos</TabsTrigger>
          </TabsList>
          <TabsContent value="menu" className="mt-4">
            <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="rounded-xl border bg-card p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold">Categories</h2>
                  <Button size="sm" variant="outline" onClick={() => openCategory()}><Plus className="h-4 w-4" /></Button>
                </div>
                <button className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${selectedCategory === null ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} onClick={() => setSelectedCategory(null)}>
                  All items <span className="float-right">{categories.reduce((sum, category) => sum + category.count, 0)}</span>
                </button>
                <div className="space-y-1">
                  {categories.map((category) => (
                    <div key={category.id} className={`group flex items-center rounded-lg ${selectedCategory === category.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} ${!category.isActive ? 'opacity-60' : ''}`}>
                      <button className="min-w-0 flex-1 px-3 py-2 text-left text-sm" onClick={() => setSelectedCategory(category.id)}>
                        {category.imageUrl
                          ? <img src={resolveMenuImageUrl(category.imageUrl) ?? ''} alt="" className="mr-2 inline-block h-6 w-6 rounded object-cover" />
                          : <span className="mr-2">{category.icon || '🍽️'}</span>}
                        {category.name}
                        <span className="float-right">{category.count}</span>
                      </button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Edit ${category.name}`} onClick={() => openCategory(category)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`${category.isActive ? 'Disable' : 'Enable'} ${category.name}`} onClick={async () => {
                        try {
                          await menu.updateCategory.mutateAsync({ id: category.id, body: { isActive: !category.isActive } })
                          toast.success(`Category ${category.isActive ? 'disabled' : 'enabled'}`)
                        } catch (error) { toast.error(errorMessage(error)) }
                      }}><Switch checked={category.isActive} className="scale-75 pointer-events-none" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-danger" aria-label={`Delete ${category.name}`} onClick={() => setDeleteTarget({ type: 'category', id: category.id, name: category.name })}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                  {!categories.length && <p className="p-4 text-center text-sm text-muted-foreground">No categories yet.</p>}
                </div>
              </aside>

              <section className="min-w-0 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input className="sm:max-w-sm" placeholder="Search menu items…" value={search} onChange={(event) => setSearch(event.target.value)} />
                  <label className="flex items-center gap-2 text-sm"><Switch checked={showInactive} onCheckedChange={setShowInactive} /> Show inactive/unavailable</label>
                </div>
                {selectedIds.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
                    <span className="mr-auto text-sm font-medium">{selectedIds.size} selected</span>
                    <Button size="sm" variant="outline" onClick={() => bulkSet(true)}>Mark available</Button>
                    <Button size="sm" variant="outline" onClick={() => bulkSet(false)}>Mark unavailable</Button>
                  </div>
                )}
                {menu.items.isError ? (
                  <Card><CardContent className="p-8 text-center"><p className="text-danger">{errorMessage(menu.items.error)}</p><Button className="mt-3" variant="outline" onClick={() => menu.items.refetch()}>Try again</Button></CardContent></Card>
                ) : filteredItems.length === 0 ? (
                  <Card><CardContent className="p-12 text-center text-muted-foreground"><Image className="mx-auto mb-3 h-10 w-10 opacity-40" /><p>No menu items match this view.</p><Button className="mt-4" onClick={openNewItem}>Add the first item</Button></CardContent></Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredItems.map((item) => (
                      <Card key={item.id} className={!item.available ? 'opacity-65' : ''}>
                        <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-t-xl bg-muted">
                          {item.imageUrl ? <img src={resolveMenuImageUrl(item.imageUrl) ?? ''} alt="" className="h-full w-full object-cover" /> : <Image className="h-10 w-10 text-muted-foreground/40" />}
                          <input type="checkbox" aria-label={`Select ${item.name}`} checked={selectedIds.has(item.id)} onChange={() => toggleSelected(item.id)} className="absolute left-3 top-3 h-4 w-4 accent-primary" />
                          {item.popular && <Badge className="absolute right-3 top-3" variant="warning"><Star className="mr-1 h-3 w-3" /> Popular</Badge>}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">{item.category}</p></div><p className="text-right font-bold text-primary">{item.hasVariants && item.variants?.some((variant) => variant.isAvailable) ? <><span className="block text-[10px] font-normal text-muted-foreground">Starting from</span>{formatCurrency(Math.min(...item.variants.filter((variant) => variant.isAvailable).map(effectiveVariantPrice)))}</> : formatCurrency(item.price)}</p></div>
                          <div className="mt-4 flex items-center gap-1">
                            <Switch checked={item.available} aria-label={`Availability for ${item.name}`} onCheckedChange={async (checked) => {
                              try {
                                await menu.updateItem.mutateAsync({ id: item.id, body: { isAvailable: checked } })
                                toast.success('Availability updated')
                              } catch (error) { toast.error(errorMessage(error)) }
                            }} />
                            <span className="mr-auto text-xs text-muted-foreground">{item.available ? 'Available' : 'Unavailable'}</span>
                            <Button size="icon" variant="ghost" onClick={() => setDetail(item)} aria-label={`View ${item.name}`}><Eye className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => openEditItem(item)} aria-label={`Edit ${item.name}`}><Edit className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-danger" onClick={() => setDeleteTarget({ type: 'item', id: item.id, name: item.name })} aria-label={`Delete ${item.name}`}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={itemDialog} onOpenChange={setItemDialog}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader><DialogTitle>{editingItem ? 'Edit menu item' : 'Add menu item'}</DialogTitle><DialogDescription>Availability and popularity are saved using the API write model.</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <div><Label>Category</Label><Select value={itemForm.categoryId} onValueChange={(categoryId) => setItemForm((form) => ({ ...form, categoryId }))}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Name</Label><Input value={itemForm.name} onChange={(event) => setItemForm((form) => ({ ...form, name: event.target.value }))} /></div>
              <div><Label>Description</Label><Input value={itemForm.description} onChange={(event) => setItemForm((form) => ({ ...form, description: event.target.value }))} /></div>
              <label className="flex items-center justify-between rounded-lg border p-3"><span><span className="block font-medium">Has variants</span><span className="text-xs text-muted-foreground">Use separate sizes, portions, or prices.</span></span><Switch checked={itemForm.hasVariants} onCheckedChange={(hasVariants) => setItemForm((form) => ({ ...form, hasVariants, variants: hasVariants && !form.variants.length ? [{ ...emptyVariant(), isDefault: true }] : form.variants }))} /></label>
              {!itemForm.hasVariants && <div><Label>Price</Label><Input type="number" min="0" step="0.01" value={itemForm.price} onChange={(event) => setItemForm((form) => ({ ...form, price: event.target.value }))} /></div>}
              {itemForm.hasVariants && <VariantEditor value={itemForm.variants} errors={variantErrors} onChange={(variants) => { setItemForm((form) => ({ ...form, variants })); setVariantErrors({}) }} />}
              <ImageUploadField
                key={`item-${editingItem?.id ?? 'new'}`}
                kind="item"
                value={itemForm.imageUrl}
                onUploaded={(imageUrl) => setItemForm((form) => ({ ...form, imageUrl }))}
                onUploadingChange={setItemImageUploading}
              />
              <label className="flex items-center justify-between"><span>Available</span><Switch checked={itemForm.isAvailable} onCheckedChange={(isAvailable) => setItemForm((form) => ({ ...form, isAvailable }))} /></label>
              <label className="flex items-center justify-between"><span>Popular</span><Switch checked={itemForm.isPopular} onCheckedChange={(isPopular) => setItemForm((form) => ({ ...form, isPopular }))} /></label>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setItemDialog(false)} disabled={itemImageUploading}>Cancel</Button><Button onClick={saveItem} disabled={itemImageUploading || menu.createItem.isPending || menu.updateItem.isPending}>{(itemImageUploading || menu.createItem.isPending || menu.updateItem.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
          <DialogContent><DialogHeader><DialogTitle>{editingCategory ? 'Edit category' : 'Add category'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={categoryForm.name} onChange={(event) => setCategoryForm((form) => ({ ...form, name: event.target.value }))} /></div>
              <div><Label>Icon</Label><Input placeholder="Emoji or icon name" value={categoryForm.icon} onChange={(event) => setCategoryForm((form) => ({ ...form, icon: event.target.value }))} /></div>
              <div><Label>Sort order</Label><Input type="number" min="0" step="1" value={categoryForm.sortOrder} onChange={(event) => setCategoryForm((form) => ({ ...form, sortOrder: event.target.value }))} /></div>
              <ImageUploadField
                key={`category-${editingCategory?.id ?? 'new'}`}
                kind="category"
                value={categoryForm.imageUrl}
                onUploaded={(imageUrl) => setCategoryForm((form) => ({ ...form, imageUrl }))}
                onUploadingChange={setCategoryImageUploading}
              />
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setCategoryDialog(false)} disabled={categoryImageUploading}>Cancel</Button><Button onClick={saveCategory} disabled={categoryImageUploading || menu.createCategory.isPending || menu.updateCategory.isPending}>{categoryImageUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
          <DialogContent>{detail && <><DialogHeader><DialogTitle>{detail.name}</DialogTitle><DialogDescription>{detail.category}{!detail.hasVariants && ` · ${formatCurrency(detail.price)}`}</DialogDescription></DialogHeader><p className="text-sm">{detail.description || 'No description.'}</p>{detail.hasVariants && <div className="space-y-2">{detail.variants?.map((variant) => <div key={variant.id} className="flex justify-between rounded-lg border p-2 text-sm"><span>{variant.name}{variant.isDefault ? ' · Default' : ''}</span><span>{formatCurrency(effectiveVariantPrice(variant))}</span></div>)}</div>}<div className="flex gap-2"><Badge variant={detail.available ? 'success' : 'secondary'}>{detail.available ? 'Available' : 'Unavailable'}</Badge>{detail.popular && <Badge variant="warning">Popular</Badge>}</div></>}</DialogContent>
        </Dialog>

        <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent><DialogHeader><DialogTitle>Delete {deleteTarget?.name}?</DialogTitle><DialogDescription>This action waits for the server response and cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="destructive" onClick={confirmDelete} disabled={menu.deleteItem.isPending || menu.deleteCategory.isPending}>Delete</Button></DialogFooter></DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { MenuItemDto } from '@/api/types/pos.types'
import type { ModifierOption } from '@/api/types/catalog.types'
import type { OrderItem } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { effectiveVariantPrice } from '@/features/menu/variants'

interface Props {
  item: MenuItemDto | null
  editingLine?: OrderItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (item: OrderItem) => void
}

export function ModifierSelectionDialog({ item, editingLine, open, onOpenChange, onConfirm }: Props) {
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [variantId, setVariantId] = useState('')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!open || !item) return
    const existing = new Set(editingLine?.modifiers?.map((option) => option.id) ?? [])
    const defaults: Record<string, string[]> = {}
    item.modifierGroups.filter((group) => group.isActive).forEach((group) => {
      const chosen = group.options
        .filter((option) => option.isActive && (existing.has(option.id) || (!editingLine && option.isDefault)))
        .slice(0, group.maxSelect)
        .map((option) => option.id)
      defaults[group.id] = chosen
    })
    setSelected(defaults)
    const availableVariants = (item.variants ?? []).filter((variant) => variant.isAvailable)
    setVariantId(editingLine?.variantId ?? availableVariants.find((variant) => variant.isDefault)?.id ?? '')
    setQuantity(editingLine?.quantity ?? 1)
  }, [editingLine, item, open])

  const optionsById = useMemo(() => new Map(
    item?.modifierGroups.flatMap((group) => group.options.map((option) => [option.id, { ...option, groupId: group.id, groupName: group.name }] as const)) ?? []
  ), [item])
  const chosenOptions = Object.values(selected).flat().map((id) => optionsById.get(id)).filter(Boolean) as Array<ModifierOption & { groupId: string; groupName: string }>
  const modifierTotal = chosenOptions.reduce((sum, option) => sum + option.price, 0)
  const selectedVariant = item?.variants?.find((variant) => variant.id === variantId)
  const basePrice = selectedVariant ? effectiveVariantPrice(selectedVariant) : item?.price ?? 0

  if (!item) return null
  const toggle = (groupId: string, optionId: string, maxSelect: number) => {
    setSelected((current) => {
      const groupSelection = current[groupId] ?? []
      if (maxSelect === 1) return { ...current, [groupId]: [optionId] }
      if (groupSelection.includes(optionId)) return { ...current, [groupId]: groupSelection.filter((id) => id !== optionId) }
      if (groupSelection.length >= maxSelect) {
        toast.error(`You can select up to ${maxSelect} options`)
        return current
      }
      return { ...current, [groupId]: [...groupSelection, optionId] }
    })
  }
  const confirm = () => {
    if (item.hasVariants && !selectedVariant) return toast.error('Select a variant')
    for (const group of item.modifierGroups.filter((entry) => entry.isActive)) {
      const count = selected[group.id]?.length ?? 0
      const minimum = group.required ? Math.max(1, group.minSelect) : group.minSelect
      if (count < minimum) return toast.error(`Select at least ${minimum} option${minimum === 1 ? '' : 's'} for ${group.name}`)
      if (count > group.maxSelect) return toast.error(`Select no more than ${group.maxSelect} options for ${group.name}`)
    }
    const modifiers = chosenOptions
      .map((option) => ({ id: option.id, groupId: option.groupId, groupName: option.groupName, name: option.name, price: option.price }))
      .sort((a, b) => a.id.localeCompare(b.id))
    const lineKey = `menu:${item.id}:${selectedVariant?.id ?? ''}:${modifiers.map((option) => option.id).join(',')}`
    onConfirm({
      id: item.id,
      lineKey,
      menuItemId: item.id,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      name: item.name,
      price: basePrice + modifierTotal,
      quantity,
      modifiers,
      notes: editingLine?.notes
    })
    onOpenChange(false)
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
    <DialogHeader><DialogTitle>Customize {item.name}</DialogTitle><DialogDescription>Select a variant and any available options.</DialogDescription></DialogHeader>
    {item.hasVariants && <fieldset className="space-y-2"><legend className="mb-2 font-medium">Choose a variant <span className="text-danger">*</span></legend>{(item.variants ?? []).filter((variant) => variant.isAvailable).map((variant) =>
      <label key={variant.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"><input type="radio" name="item-variant" checked={variantId === variant.id} onChange={() => setVariantId(variant.id)} /><span className="mr-auto text-sm font-medium">{variant.name}</span><span className="text-sm">{formatCurrency(effectiveVariantPrice(variant))}</span>{variant.discountedPrice != null && <span className="text-xs text-muted-foreground line-through">{formatCurrency(variant.price)}</span>}</label>
    )}{!(item.variants ?? []).some((variant) => variant.isAvailable) && <p className="text-sm text-danger">No variants are currently available.</p>}</fieldset>}
    <div className="space-y-5">{item.modifierGroups.filter((group) => group.isActive).map((group) =>
      <fieldset key={group.id} className="space-y-2"><legend className="mb-2 flex w-full items-center gap-2 font-medium">{group.name}<Badge variant={group.required ? 'warning' : 'secondary'}>{group.required ? 'Required' : 'Optional'}</Badge><span className="ml-auto text-xs text-muted-foreground">{group.minSelect}–{group.maxSelect}</span></legend>
        {group.options.filter((option) => option.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((option) =>
          <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
            <input type={group.maxSelect === 1 ? 'radio' : 'checkbox'} name={`modifier-${group.id}`} checked={(selected[group.id] ?? []).includes(option.id)} onChange={() => toggle(group.id, option.id, group.maxSelect)} />
            <span className="mr-auto text-sm">{option.name}</span><span className="text-sm text-muted-foreground">{option.price ? `+${formatCurrency(option.price)}` : 'Included'}</span>
          </label>)}
      </fieldset>)}</div>
    <div className="rounded-lg bg-muted p-3 text-sm"><div className="flex justify-between"><span>{selectedVariant ? selectedVariant.name : 'Base price'}</span><span>{formatCurrency(basePrice)}</span></div><div className="flex justify-between"><span>Modifiers</span><span>+{formatCurrency(modifierTotal)}</span></div><div className="mt-1 flex justify-between font-bold"><span>Unit price</span><span>{formatCurrency(basePrice + modifierTotal)}</span></div><div className="mt-2 flex items-center justify-between border-t pt-2"><span>Quantity</span><div className="flex items-center gap-3"><Button type="button" size="sm" variant="outline" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</Button><span className="font-semibold">{quantity}</span><Button type="button" size="sm" variant="outline" aria-label="Increase quantity" onClick={() => setQuantity((value) => value + 1)}>+</Button></div></div><div className="mt-2 flex justify-between text-base font-bold"><span>Total</span><span>{formatCurrency((basePrice + modifierTotal) * quantity)}</span></div></div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={Boolean(item.hasVariants && !selectedVariant)} onClick={confirm}>{editingLine ? 'Update item' : 'Add to cart'}</Button></DialogFooter>
  </DialogContent></Dialog>
}

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { VariantDraft, VariantErrors } from '../variants'
import { emptyVariant } from '../variants'

interface Props { value: VariantDraft[]; errors: VariantErrors; onChange: (value: VariantDraft[]) => void }

export function VariantEditor({ value, errors, onChange }: Props) {
  const update = (index: number, patch: Partial<VariantDraft>) => onChange(value.map((variant, i) => i === index ? { ...variant, ...patch } : variant))
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= value.length) return
    const next = [...value]; [next[index], next[target]] = [next[target], next[index]]; onChange(next)
  }
  return <fieldset className="space-y-3 rounded-xl border p-3">
    <div className="flex items-center justify-between"><div><legend className="font-medium">Variants</legend><p className="text-xs text-muted-foreground">Add sizes or portions with their own prices.</p></div><Button type="button" size="sm" variant="outline" onClick={() => onChange([...value, emptyVariant()])}><Plus className="mr-1 h-4 w-4" /> Add</Button></div>
    {value.map((variant, index) => <div key={variant.id ?? `new-${index}`} className="grid gap-2 rounded-lg bg-muted/40 p-3 sm:grid-cols-[1fr_110px_110px_auto]">
      <div><Label htmlFor={`variant-name-${index}`}>Name</Label><Input id={`variant-name-${index}`} placeholder="Small, Half, 500 ml" value={variant.name} onChange={(e) => update(index, { name: e.target.value })} aria-invalid={Boolean(errors[index]?.name)} />{errors[index]?.name && <p className="mt-1 text-xs text-danger">{errors[index]?.name}</p>}</div>
      <div><Label htmlFor={`variant-price-${index}`}>Price</Label><Input id={`variant-price-${index}`} type="number" min="0.01" step="0.01" value={variant.price} onChange={(e) => update(index, { price: e.target.value })} aria-invalid={Boolean(errors[index]?.price)} />{errors[index]?.price && <p className="mt-1 text-xs text-danger">{errors[index]?.price}</p>}</div>
      <div><Label htmlFor={`variant-discount-${index}`}>Discount</Label><Input id={`variant-discount-${index}`} type="number" min="0" step="0.01" placeholder="Optional" value={variant.discountedPrice} onChange={(e) => update(index, { discountedPrice: e.target.value })} aria-invalid={Boolean(errors[index]?.discountedPrice)} />{errors[index]?.discountedPrice && <p className="mt-1 text-xs text-danger">{errors[index]?.discountedPrice}</p>}</div>
      <div className="flex items-end gap-1"><Button type="button" size="icon" variant="ghost" aria-label="Move variant up" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" aria-label="Move variant down" disabled={index === value.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" className="text-danger" aria-label="Remove variant" onClick={() => onChange(value.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={variant.isAvailable} onCheckedChange={(isAvailable) => update(index, { isAvailable })} /> Available</label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="radio" name="default-variant" checked={variant.isDefault} onChange={() => onChange(value.map((entry, i) => ({ ...entry, isDefault: i === index })))} /> Default variant</label>
    </div>)}
    {errors.form && <p className="text-sm text-danger">{errors.form}</p>}
  </fieldset>
}

import type { MenuItemVariant } from '@/api/types/menu.types'

export interface VariantDraft {
  id?: string
  name: string
  price: string
  discountedPrice: string
  isAvailable: boolean
  isDefault: boolean
}

export type VariantErrors = Record<number, Partial<Record<'name' | 'price' | 'discountedPrice', string>>> & { form?: string }

export const emptyVariant = (): VariantDraft => ({
  name: '', price: '', discountedPrice: '', isAvailable: true, isDefault: false
})

export function effectiveVariantPrice(variant: Pick<MenuItemVariant, 'price' | 'discountedPrice'>) {
  return variant.discountedPrice != null ? variant.discountedPrice : variant.price
}

export function validateVariants(variants: VariantDraft[]): VariantErrors {
  const errors: VariantErrors = {}
  const names = new Map<string, number[]>()
  variants.forEach((variant, index) => {
    const row: VariantErrors[number] = {}
    const name = variant.name.trim()
    const price = Number(variant.price)
    const discount = variant.discountedPrice === '' ? null : Number(variant.discountedPrice)
    if (!name) row.name = 'Variant name is required'
    if (!Number.isFinite(price) || price <= 0) row.price = 'Price must be greater than zero'
    if (discount != null && (!Number.isFinite(discount) || discount < 0 || discount > price)) {
      row.discountedPrice = 'Discounted price cannot exceed the regular price'
    }
    if (Object.keys(row).length) errors[index] = row
    if (name) names.set(name.toLocaleLowerCase(), [...(names.get(name.toLocaleLowerCase()) ?? []), index])
  })
  names.forEach((indexes) => {
    if (indexes.length > 1) indexes.forEach((index) => {
      errors[index] = { ...errors[index], name: 'Variant names must be unique' }
    })
  })
  if (!variants.length) errors.form = 'Add at least one variant'
  else if (!variants.some((variant) => variant.isAvailable)) errors.form = 'At least one variant must be available'
  else if (variants.filter((variant) => variant.isDefault).length > 1) errors.form = 'Only one variant can be the default'
  return errors
}

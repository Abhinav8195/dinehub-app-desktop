import { describe, expect, it } from 'vitest'
import { effectiveVariantPrice, validateVariants, type VariantDraft } from './variants'

const variant = (patch: Partial<VariantDraft> = {}): VariantDraft => ({
  name: 'Small', price: '199', discountedPrice: '', isAvailable: true, isDefault: true, ...patch
})

describe('menu item variants', () => {
  it('accepts valid variants and uses a discounted price when present', () => {
    expect(validateVariants([variant(), variant({ name: 'Large', price: '399', isDefault: false })])).toEqual({})
    expect(effectiveVariantPrice({ price: 399, discountedPrice: 349 })).toBe(349)
  })

  it('rejects duplicate names, invalid prices, and unavailable collections', () => {
    const errors = validateVariants([
      variant({ price: '0', isAvailable: false }),
      variant({ name: ' small ', price: '200', discountedPrice: '250', isAvailable: false, isDefault: false })
    ])
    expect(errors[0].name).toMatch(/unique/)
    expect(errors[0].price).toMatch(/greater than zero/)
    expect(errors[1].discountedPrice).toMatch(/cannot exceed/)
    expect(errors.form).toMatch(/available/)
  })
})

/** Standard stock units for inventory + recipe qty (per 1 menu sale). */
export const INVENTORY_UNITS = [
  { value: 'g', label: 'Gram (g)', kind: 'weight' },
  { value: 'kg', label: 'Kilogram (kg)', kind: 'weight' },
  { value: 'ml', label: 'Millilitre (ml)', kind: 'volume' },
  { value: 'L', label: 'Litre (L)', kind: 'volume' },
  { value: 'pcs', label: 'Piece (pcs)', kind: 'count' },
  { value: 'piece', label: 'Piece', kind: 'count' },
  { value: 'dozen', label: 'Dozen', kind: 'count' },
  { value: 'pack', label: 'Pack', kind: 'count' },
  { value: 'bunch', label: 'Bunch', kind: 'count' },
  { value: 'box', label: 'Box', kind: 'count' },
] as const

export type InventoryUnit = (typeof INVENTORY_UNITS)[number]['value']

export function formatInventoryUnit(unit?: string | null): string {
  if (!unit) return ''
  const match = INVENTORY_UNITS.find((row) => row.value.toLowerCase() === unit.toLowerCase())
  return match?.label ?? unit
}

export function shortInventoryUnit(unit?: string | null): string {
  if (!unit) return ''
  const normalized = unit.trim()
  if (!normalized) return ''
  const lower = normalized.toLowerCase()
  if (lower === 'gram' || lower === 'grams') return 'g'
  if (lower === 'kilogram' || lower === 'kilograms') return 'kg'
  if (lower === 'millilitre' || lower === 'milliliter' || lower === 'millilitres') return 'ml'
  if (lower === 'litre' || lower === 'liter' || lower === 'litres') return 'L'
  if (lower === 'piece' || lower === 'pieces' || lower === 'pc') return 'pcs'
  return normalized
}

export function suggestedRecipeQty(unit?: string | null): string {
  const u = shortInventoryUnit(unit).toLowerCase()
  if (u === 'g' || u === 'ml') return '50'
  if (u === 'kg' || u === 'l') return '0.05'
  if (u === 'pcs' || u === 'piece' || u === 'pack' || u === 'bunch' || u === 'box') return '1'
  return '1'
}

import type { PosOrder } from '@/api/types/pos.types'
import type { OrderItem } from '@/types'

/** Map a server running bill into POS cart lines (already KOT'd). */
export function mapPosOrderItemsToCart(order: PosOrder): OrderItem[] {
  return (order.items || []).map((item) => {
    const modKey = (item.modifiers || [])
      .map((mod) => mod.id)
      .sort()
      .join(',')
    const lineKey = item.menuItemId
      ? `menu:${item.menuItemId}:${item.variantId || ''}:${modKey}:srv:${item.id}`
      : item.comboId
        ? `combo:${item.comboId}:srv:${item.id}`
        : `srv:${item.id}`

    return {
      id: item.id,
      lineKey,
      menuItemId: item.menuItemId || undefined,
      variantId: item.variantId || undefined,
      variantName: item.variantName || undefined,
      comboId: item.comboId || undefined,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      modifiers: item.modifiers?.length ? item.modifiers : undefined,
      notes: item.notes || undefined,
    }
  })
}

import type { OrderItem } from '@/types'
import { BRAND } from '@/constants/brand'

export interface KotTicketInput {
  orderLabel: string
  tableLabel?: string
  orderType: string
  guestCount?: number
  waiterName?: string
  items: Array<Pick<OrderItem, 'name' | 'quantity' | 'variantName' | 'modifiers' | 'notes'>>
  restaurantName?: string
}

/** Plain kitchen chit — no invoice columns, no prices (PetPooja-style KOT). */
export function buildKotHtml(input: KotTicketInput): string {
  const lines: string[] = []
  lines.push('================================')
  lines.push('         K O T')
  lines.push('      KITCHEN ORDER')
  lines.push('================================')
  lines.push('')
  lines.push(String(input.restaurantName || BRAND.name).toUpperCase())
  lines.push('')
  lines.push(`Order : ${input.orderLabel}`)
  lines.push(`Type  : ${input.orderType}`)
  if (input.tableLabel) lines.push(`TABLE : ${input.tableLabel}`)
  if (input.guestCount) lines.push(`Guests: ${input.guestCount}`)
  if (input.waiterName) lines.push(`Waiter: ${input.waiterName}`)
  lines.push(`Time  : ${new Date().toLocaleString('en-IN')}`)
  lines.push('')
  lines.push('--------------------------------')
  lines.push('QTY   ITEM')
  lines.push('--------------------------------')

  for (const item of input.items) {
    const mods = (item.modifiers ?? []).map((m) => `${m.groupName}: ${m.name}`).join(', ')
    const variant = item.variantName ? ` (${item.variantName})` : ''
    lines.push(`${String(item.quantity).padStart(3, ' ')}   ${item.name}${variant}`)
    if (mods) lines.push(`      + ${mods}`)
    if (item.notes?.trim()) lines.push(`      * ${item.notes.trim()}`)
  }

  lines.push('--------------------------------')
  lines.push('')
  lines.push('   *** KITCHEN COPY ONLY ***')
  lines.push('   NOT AN INVOICE / BILL')
  lines.push('   (No prices on this slip)')
  lines.push('')
  lines.push('================================')

  const body = escapeHtml(lines.join('\n'))

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>KOT ${escapeHtml(input.orderLabel)}</title>
<style>
  @page { size: 58mm auto; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
  }
  body {
    width: 58mm;
    padding: 3mm 2mm;
    font-family: "Courier New", Courier, monospace;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.35;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style></head>
<body>${body}</body></html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

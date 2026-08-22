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

export function buildKotHtml(input: KotTicketInput): string {
  const rows = input.items.map((item) => {
    const mods = (item.modifiers ?? []).map((m) => `${m.groupName}: ${m.name}`).join(', ')
    const extras = [item.variantName, mods, item.notes].filter(Boolean).join(' · ')
    return `<tr>
      <td style="padding:6px 0;font-size:14px;font-weight:700;vertical-align:top">${item.quantity}×</td>
      <td style="padding:6px 0;font-size:14px">
        <div style="font-weight:600">${escapeHtml(item.name)}</div>
        ${extras ? `<div style="font-size:11px;color:#444;margin-top:2px">${escapeHtml(extras)}</div>` : ''}
      </td>
    </tr>`
  }).join('')

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>KOT</title>
<style>
  body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin:0;padding:12px;color:#111}
  h1{font-size:16px;margin:0 0 4px}
  .meta{font-size:12px;margin-bottom:10px;line-height:1.4}
  table{width:100%;border-collapse:collapse}
  hr{border:none;border-top:1px dashed #999;margin:10px 0}
</style></head>
<body>
  <h1>KOT — ${escapeHtml(input.restaurantName || BRAND.name)}</h1>
  <div class="meta">
    <div><strong>${escapeHtml(input.orderLabel)}</strong></div>
    <div>${escapeHtml(input.orderType)}${input.tableLabel ? ` · ${escapeHtml(input.tableLabel)}` : ''}</div>
    ${input.guestCount ? `<div>Guests: ${input.guestCount}</div>` : ''}
    ${input.waiterName ? `<div>Waiter: ${escapeHtml(input.waiterName)}</div>` : ''}
    <div>${new Date().toLocaleString()}</div>
  </div>
  <hr />
  <table>${rows}</table>
  <hr />
  <div class="meta">Kitchen copy — do not charge</div>
</body></html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

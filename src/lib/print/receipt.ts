export interface ReceiptData {
  orderNumber: string
  invoiceNumber?: string
  restaurant?: {
    name?: string
    logoUrl?: string | null
    showLogo?: boolean
    address?: string
    phone?: string
    gstin?: string
  }
  customerName?: string
  table?: string
  orderType?: string
  cashierName?: string
  items: { name: string; qty: number; price: number; amount?: number }[]
  subtotal: number
  tax?: number
  taxes?: { name: string; rate?: number; amount: number }[]
  discount?: number
  additionalCharges?: { name: string; amount: number }[]
  roundOff?: number
  total: number
  paymentMethod?: string
  footerText?: string
  date?: Date | string
}

export interface KotReceiptData {
  orderNumber: string
  restaurant?: ReceiptData['restaurant']
  customerName?: string
  table?: string
  orderType?: string
  waiterName?: string
  guestCount?: number
  items: Array<{
    name: string
    qty: number
    price: number
    amount?: number
    notes?: string | null
    modifiers?: Array<{ groupName?: string; name: string }>
  }>
  subtotal: number
  total: number
  footerText?: string
  date?: Date | string
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;')

const money = (value: number) => `₹${Number(value || 0).toFixed(2)}`

const RECEIPT_STYLES = `
  @page { size: 58mm auto; margin: 1.5mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { width: 55mm; font-family: "Arial Narrow", Arial, sans-serif; font-size: 10px; line-height: 1.2; }
  .receipt { width: 100%; padding: .5mm; }
  .center { text-align: center; } .bold { font-weight: 700; }
  .logo { display: block; max-width: 27mm; max-height: 12mm; width: auto; height: auto; object-fit: contain; margin: 0 auto 1mm; }
  .restaurant-name { font-size: 14px; font-weight: 800; }
  .rule { border: 0; border-top: 1px solid #000; margin: 1.5mm 0; }
  .meta { display: grid; grid-template-columns: 1.15fr .85fr; gap: .7mm 1mm; }
  .meta span:nth-child(even) { text-align: right; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .items th, .items td { padding: 1mm .35mm; vertical-align: top; }
  .items th { border-bottom: 1px solid #000; }
  .items th:first-child, .items td:first-child { width: 42%; text-align: left; overflow-wrap: anywhere; }
  .items th:nth-child(2), .items td:nth-child(2) { width: 10%; text-align: center; }
  .items th:nth-child(3), .items td:nth-child(3) { width: 23%; text-align: right; }
  .items th:last-child, .items td:last-child { width: 25%; text-align: right; }
  .item-note { font-size: 9px; font-style: italic; }
  .totals td { padding: .6mm .35mm; } .totals td:last-child { text-align: right; }
  .grand td { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 1.4mm .35mm; font-size: 13px; font-weight: 800; }
  .footer { margin-top: 3mm; text-align: center; white-space: pre-line; }
  @media print { body { width: 55mm; } .no-print { display: none !important; } }
`

function restaurantHeader(restaurant: NonNullable<ReceiptData['restaurant']>) {
  return `
    <header class="center">
      ${restaurant.showLogo !== false && restaurant.logoUrl ? `<img class="logo" src="${escapeHtml(restaurant.logoUrl)}" alt="" onerror="this.remove()">` : ''}
      <div class="restaurant-name">${escapeHtml(restaurant.name || 'DiningHub Restaurant')}</div>
      ${restaurant.address ? `<div>${escapeHtml(restaurant.address)}</div>` : ''}
      ${restaurant.phone ? `<div>Mobile: ${escapeHtml(restaurant.phone)}</div>` : ''}
      ${restaurant.gstin ? `<div>GSTIN: ${escapeHtml(restaurant.gstin)}</div>` : ''}
    </header>`
}

export function buildReceiptHtml(data: ReceiptData): string {
  const restaurant = data.restaurant ?? {}
  const date = new Date(data.date ?? Date.now()).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
  })
  const taxes = data.taxes?.length
    ? data.taxes
    : data.tax ? [{ name: 'Tax', amount: data.tax }] : []
  const totalQty = data.items.reduce((sum, item) => sum + item.qty, 0)
  const rows = data.items.map((item) => `
    <tr><td>${escapeHtml(item.name)}</td><td>${item.qty}</td><td>${money(item.price)}</td><td>${money(item.amount ?? item.price * item.qty)}</td></tr>`).join('')
  const taxRows = taxes.map((tax) => `
    <tr><td>${escapeHtml(tax.name)}${tax.rate !== undefined ? ` @${tax.rate}%` : ''}</td><td>${money(tax.amount)}</td></tr>`).join('')
  const chargeRows = (data.additionalCharges ?? []).map((charge) => `
    <tr><td>${escapeHtml(charge.name)}</td><td>${money(charge.amount)}</td></tr>`).join('')

  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(data.invoiceNumber ?? data.orderNumber)}</title>
  <style>${RECEIPT_STYLES}</style></head><body><main class="receipt">
    ${restaurantHeader(restaurant)}
    <hr class="rule">
    ${data.customerName ? `<div><b>Name:</b> ${escapeHtml(data.customerName)}</div><hr class="rule">` : ''}
    <section class="meta">
      <span><b>Date:</b> ${escapeHtml(date)}</span><span>${data.orderType ? `<b>${escapeHtml(data.orderType)}</b>` : ''}${data.table ? `: ${escapeHtml(data.table)}` : ''}</span>
      <span><b>Cashier:</b> ${escapeHtml(data.cashierName || '—')}</span><span><b>Bill No.:</b> ${escapeHtml(data.invoiceNumber || data.orderNumber)}</span>
      <span><b>Order:</b> ${escapeHtml(data.orderNumber)}</span><span></span>
    </section>
    <hr class="rule">
    <table class="items"><thead><tr><th>Item</th><th>Qty.</th><th>Price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <hr class="rule">
    <table class="totals">
      <tr><td>Total Qty: ${totalQty}</td><td>Sub Total ${money(data.subtotal)}</td></tr>
      ${data.discount ? `<tr><td>Discount</td><td>-${money(data.discount)}</td></tr>` : ''}
      ${taxRows}${chargeRows}
      ${data.roundOff ? `<tr><td>Round off</td><td>${data.roundOff > 0 ? '+' : ''}${data.roundOff.toFixed(2)}</td></tr>` : ''}
      <tr class="grand"><td>Grand Total</td><td>${money(data.total)}</td></tr>
    </table>
    ${data.paymentMethod ? `<p class="center">Paid via <b>${escapeHtml(data.paymentMethod)}</b></p>` : ''}
    <footer class="footer">${escapeHtml(data.footerText || 'Thanks for visit')}</footer>
  </main></body></html>`
}

/** Same thermal layout as invoice — no KOT label; kitchen copy footer only. */
export function buildKotReceiptHtml(data: KotReceiptData): string {
  const restaurant = data.restaurant ?? {}
  const date = new Date(data.date ?? Date.now()).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
  })
  const totalQty = data.items.reduce((sum, item) => sum + item.qty, 0)
  const rows = data.items.map((item) => {
    const mods = (item.modifiers ?? []).map((m) => `${m.groupName || ''}: ${m.name}`.replace(/^:\s*/, '')).filter(Boolean).join(', ')
    const extra = [mods, item.notes?.trim()].filter(Boolean).join(' · ')
    return `<tr>
      <td>${escapeHtml(item.name)}${extra ? `<div class="item-note">${escapeHtml(extra)}</div>` : ''}</td>
      <td>${item.qty}</td><td>${money(item.price)}</td><td>${money(item.amount ?? item.price * item.qty)}</td>
    </tr>`
  }).join('')

  return `<!doctype html><html><head><meta charset="utf-8"><title>Order ${escapeHtml(data.orderNumber)}</title>
  <style>${RECEIPT_STYLES}</style></head><body><main class="receipt">
    ${restaurantHeader(restaurant)}
    <hr class="rule">
    ${data.customerName ? `<div><b>Name:</b> ${escapeHtml(data.customerName)}</div><hr class="rule">` : ''}
    <section class="meta">
      <span><b>Date:</b> ${escapeHtml(date)}</span><span>${data.orderType ? `<b>${escapeHtml(data.orderType)}</b>` : ''}${data.table ? `: ${escapeHtml(data.table)}` : ''}</span>
      <span><b>Waiter:</b> ${escapeHtml(data.waiterName || '—')}</span><span><b>Bill No.:</b> ${escapeHtml(data.orderNumber)}</span>
      <span><b>Order:</b> ${escapeHtml(data.orderNumber)}</span><span>${data.guestCount ? `<b>Guests:</b> ${data.guestCount}` : ''}</span>
    </section>
    <hr class="rule">
    <table class="items"><thead><tr><th>Item</th><th>Qty.</th><th>Price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <hr class="rule">
    <table class="totals">
      <tr><td>Total Qty: ${totalQty}</td><td>Sub Total ${money(data.subtotal)}</td></tr>
      <tr class="grand"><td>Grand Total</td><td>${money(data.total)}</td></tr>
    </table>
    <footer class="footer">${escapeHtml(data.footerText || 'Kitchen copy — payment pending')}</footer>
  </main></body></html>`
}

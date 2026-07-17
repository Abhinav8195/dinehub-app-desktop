import { BRAND } from '@/constants/brand'

export interface ReceiptData {
  orderNumber: string
  table?: string
  items: { name: string; qty: number; price: number }[]
  subtotal: number
  tax: number
  total: number
  paymentMethod?: string
  date?: Date
}

export function buildReceiptHtml(data: ReceiptData): string {
  const date = (data.date ?? new Date()).toLocaleString()
  const rows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:4px 0">${item.name}</td>
        <td style="text-align:center">${item.qty}</td>
        <td style="text-align:right">₹${(item.price * item.qty).toFixed(2)}</td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${BRAND.name} Receipt</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; color: ${BRAND.colors.dark}; margin: 0; padding: 16px; max-width: 320px; }
    .header { text-align: center; border-bottom: 2px solid ${BRAND.colors.primary}; padding-bottom: 12px; margin-bottom: 12px; }
    .logo { height: 48px; object-fit: contain; }
    .brand { font-size: 20px; font-weight: 700; color: ${BRAND.colors.dark}; margin: 8px 0 2px; }
    .tagline { font-size: 11px; color: #6B7280; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .totals td { padding: 4px 0; }
    .total-row { font-weight: 700; font-size: 15px; border-top: 1px dashed ${BRAND.colors.border}; padding-top: 8px; }
    .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #6B7280; border-top: 1px solid ${BRAND.colors.border}; padding-top: 12px; }
    .accent { color: ${BRAND.colors.primary}; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <img class="logo" src="${BRAND.logo}" alt="${BRAND.name}" />
    <div class="brand">${BRAND.name}</div>
    <div class="tagline">${BRAND.tagline}</div>
  </div>
  <p style="font-size:12px;margin:0 0 8px">Order: <strong>${data.orderNumber}</strong>${data.table ? ` · ${data.table}` : ''}<br/>${date}</p>
  <table>
    <thead>
      <tr style="border-bottom:1px solid ${BRAND.colors.border}">
        <th style="text-align:left;padding-bottom:6px">Item</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Amt</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals" style="margin-top:12px">
    <tr><td>Subtotal</td><td></td><td style="text-align:right">₹${data.subtotal.toFixed(2)}</td></tr>
    <tr><td>Tax</td><td></td><td style="text-align:right">₹${data.tax.toFixed(2)}</td></tr>
    <tr class="total-row"><td>Total</td><td></td><td style="text-align:right" class="accent">₹${data.total.toFixed(2)}</td></tr>
  </table>
  ${data.paymentMethod ? `<p style="font-size:12px;margin-top:12px">Paid via <strong>${data.paymentMethod}</strong></p>` : ''}
  <div class="footer">
    Thank you for dining with us!<br/>
    Powered by <span class="accent">${BRAND.name}</span>
  </div>
</body>
</html>`
}

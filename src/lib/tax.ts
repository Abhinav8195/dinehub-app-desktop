import type { TaxSettings } from '@/api/types/pos.types'

export function calculateTaxBreakdown(
  subtotal: number,
  settings: Pick<TaxSettings, 'gstPercent' | 'sgstPercent' | 'cgstPercent' | 'serviceChargePercent' | 'taxInclusive'>,
  voucherDiscount = 0
) {
  const taxableBase = Math.max(0, subtotal - voucherDiscount)
  const serviceCharge = (taxableBase * settings.serviceChargePercent) / 100

  let gstAmount = 0
  let sgstAmount = 0
  let cgstAmount = 0

  if (settings.taxInclusive) {
    const totalTaxRate = settings.gstPercent + settings.sgstPercent + settings.cgstPercent
    const netBase = taxableBase / (1 + totalTaxRate / 100)
    gstAmount = (netBase * settings.gstPercent) / 100
    sgstAmount = (netBase * settings.sgstPercent) / 100
    cgstAmount = (netBase * settings.cgstPercent) / 100
  } else {
    gstAmount = (taxableBase * settings.gstPercent) / 100
    sgstAmount = (taxableBase * settings.sgstPercent) / 100
    cgstAmount = (taxableBase * settings.cgstPercent) / 100
  }

  const taxTotal = gstAmount + sgstAmount + cgstAmount
  const total = settings.taxInclusive
    ? taxableBase + serviceCharge
    : taxableBase + taxTotal + serviceCharge

  return {
    subtotal,
    gstAmount: round2(gstAmount),
    sgstAmount: round2(sgstAmount),
    cgstAmount: round2(cgstAmount),
    serviceCharge: round2(serviceCharge),
    voucherDiscount: round2(voucherDiscount),
    total: round2(total),
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  id: 'local',
  tenantId: 'local',
  gstPercent: 5,
  sgstPercent: 2.5,
  cgstPercent: 2.5,
  serviceChargePercent: 0,
  taxInclusive: false,
  updatedAt: new Date().toISOString(),
}

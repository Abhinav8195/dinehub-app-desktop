import apiClient, { unwrap, tokenBridge } from './client'
import type { ApiResponse } from './types/common'
import type { TaxSettings, UpdateTaxSettingsRequest } from './types/pos.types'

export interface RestaurantSettings extends Record<string, unknown> {
  name?: string
  legalName?: string
  address?: string
  phone?: string
  gstin?: string
  fssaiNumber?: string
  defaultLanguage?: string
  kotEnabled?: boolean
  logoUrl?: string | null
  receiptLogoEnabled?: boolean
  receiptFooter?: string
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeAddress(value: unknown): string | undefined {
  if (typeof value === 'string') return text(value)
  if (!value || typeof value !== 'object') return undefined
  const address = value as Record<string, unknown>
  return [address.line1, address.line2, address.street, address.city, address.state, address.postalCode ?? address.pincode, address.country]
    .map(text).filter(Boolean).join(', ') || undefined
}

function normalizeRestaurant(raw: unknown): RestaurantSettings {
  if (!raw || typeof raw !== 'object') return {}
  const outer = raw as Record<string, unknown>
  const nested = [outer.restaurant, outer.settings, outer.restaurantDetails, outer.tenant, outer.profile]
    .find((value) => value && typeof value === 'object') as Record<string, unknown> | undefined
  const value = nested ? { ...outer, ...nested } : outer
  return {
    name: text(value.name) ?? text(value.restaurantName) ?? text(value.businessName) ?? '',
    legalName: text(value.legalName) ?? '',
    address: normalizeAddress(value.address) ?? normalizeAddress(value.fullAddress) ?? normalizeAddress(value.location) ?? '',
    phone: text(value.phone) ?? text(value.phoneNumber) ?? text(value.mobile) ?? text(value.mobileNumber) ?? '',
    gstin: text(value.gstin) ?? text(value.gstNumber) ?? text(value.gstNo) ?? '',
    fssaiNumber: text(value.fssaiNumber) ?? text(value.fssai) ?? text(value.fssaiNo) ?? '',
    defaultLanguage: text(value.defaultLanguage) ?? text(value.language) ?? 'en',
    kotEnabled: typeof value.kotEnabled === 'boolean' ? value.kotEnabled : typeof value.enableKot === 'boolean' ? value.enableKot : true,
    logoUrl: text(value.logoUrl) ?? text(value.logo) ?? null,
    receiptLogoEnabled: value.receiptLogoEnabled !== false,
    receiptFooter: text(value.receiptFooter) ?? text(value.footerText) ?? '',
  }
}

const CACHE_PREFIX = 'dinehub.restaurant-settings:'

function cacheKey(tenantKey: string): string {
  return `${CACHE_PREFIX}${tenantKey || 'unknown'}`
}

async function tenantCacheKey(): Promise<string> {
  const slug = await tokenBridge.getTenantSlug().catch(() => null)
  return slug?.trim() || 'session'
}

function readCachedRestaurant(tenantKey: string): RestaurantSettings {
  if (typeof window === 'undefined') return {}
  try {
    return normalizeRestaurant(JSON.parse(window.localStorage.getItem(cacheKey(tenantKey)) || '{}'))
  } catch {
    return {}
  }
}

function writeCachedRestaurant(tenantKey: string, value: RestaurantSettings): RestaurantSettings {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(cacheKey(tenantKey), JSON.stringify(value))
  }
  return value
}

/** Clears restaurant settings cache (all tenants or current). Call on logout. */
export function clearRestaurantSettingsCache(): void {
  if (typeof window === 'undefined') return
  const keys: string[] = []
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i)
    if (key?.startsWith(CACHE_PREFIX) || key === 'dinehub.restaurant-settings') keys.push(key)
  }
  keys.forEach((key) => window.localStorage.removeItem(key))
}

// One-time cleanup of the legacy global cache that leaked Legal Name / GSTIN / FSSAI across tenants.
if (typeof window !== 'undefined') {
  try { window.localStorage.removeItem('dinehub.restaurant-settings') } catch { /* ignore */ }
}

export const settingsApi = {
  getTax: () =>
    unwrap(apiClient.get<ApiResponse<TaxSettings>>('/settings/tax')),

  updateTax: (body: UpdateTaxSettingsRequest) =>
    unwrap(apiClient.put<ApiResponse<TaxSettings>>('/settings/tax', body)),

  getRestaurant: async () => {
    const tenantKey = await tenantCacheKey()
    try {
      const fromApi = normalizeRestaurant(
        await unwrap(apiClient.get<ApiResponse<Record<string, unknown>>>('/settings/restaurant')),
      )
      // API is source of truth — never merge another tenant's cached Legal Name / GSTIN / FSSAI.
      return writeCachedRestaurant(tenantKey, fromApi)
    } catch (error) {
      const cached = readCachedRestaurant(tenantKey)
      if (Object.keys(cached).length) return cached
      throw error
    }
  },

  updateRestaurant: async (body: Record<string, unknown>) => {
    const tenantKey = await tenantCacheKey()
    const response = normalizeRestaurant(
      await unwrap(apiClient.put<ApiResponse<Record<string, unknown>>>('/settings/restaurant', body)),
    )
    // Prefer server response; fill only fields the API omitted that we just saved.
    const saved: RestaurantSettings = {
      ...response,
      name: response.name || text(body.name) || '',
      legalName: response.legalName || text(body.legalName) || '',
      address: response.address || text(body.address) || '',
      phone: response.phone || text(body.phone) || '',
      gstin: response.gstin || text(body.gstin) || '',
      fssaiNumber: response.fssaiNumber || text(body.fssaiNumber) || text(body.fssai) || '',
    }
    return writeCachedRestaurant(tenantKey, saved)
  },
}

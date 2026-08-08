import apiClient, { unwrap } from './client'
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
    ...value,
    name: text(value.name) ?? text(value.restaurantName) ?? text(value.businessName) ?? text(value.legalName),
    legalName: text(value.legalName),
    address: normalizeAddress(value.address) ?? normalizeAddress(value.fullAddress) ?? normalizeAddress(value.location),
    phone: text(value.phone) ?? text(value.phoneNumber) ?? text(value.mobile) ?? text(value.mobileNumber),
    gstin: text(value.gstin) ?? text(value.gstNumber) ?? text(value.gstNo),
    fssaiNumber: text(value.fssaiNumber) ?? text(value.fssai) ?? text(value.fssaiNo),
    defaultLanguage: text(value.defaultLanguage) ?? text(value.language) ?? 'en',
    kotEnabled: typeof value.kotEnabled === 'boolean' ? value.kotEnabled : typeof value.enableKot === 'boolean' ? value.enableKot : true,
    logoUrl: text(value.logoUrl) ?? text(value.logo) ?? null,
    receiptLogoEnabled: value.receiptLogoEnabled !== false,
    receiptFooter: text(value.receiptFooter) ?? text(value.footerText),
  }
}

const RESTAURANT_CACHE_KEY = 'dinehub.restaurant-settings'

function readCachedRestaurant(): RestaurantSettings {
  if (typeof window === 'undefined') return {}
  try { return normalizeRestaurant(JSON.parse(window.localStorage.getItem(RESTAURANT_CACHE_KEY) || '{}')) } catch { return {} }
}

function mergeDefined(...values: RestaurantSettings[]): RestaurantSettings {
  return values.reduce<RestaurantSettings>((result, value) => {
    Object.entries(value).forEach(([key, entry]) => { if (entry !== undefined && entry !== null && entry !== '') result[key] = entry })
    return result
  }, {})
}

function cacheRestaurant(value: RestaurantSettings): RestaurantSettings {
  const merged = mergeDefined(readCachedRestaurant(), value)
  if (typeof window !== 'undefined') window.localStorage.setItem(RESTAURANT_CACHE_KEY, JSON.stringify(merged))
  return merged
}

export const settingsApi = {
  getTax: () =>
    unwrap(apiClient.get<ApiResponse<TaxSettings>>('/settings/tax')),

  updateTax: (body: UpdateTaxSettingsRequest) =>
    unwrap(apiClient.put<ApiResponse<TaxSettings>>('/settings/tax', body)),

  getRestaurant: async () =>
    cacheRestaurant(mergeDefined(readCachedRestaurant(), normalizeRestaurant(await unwrap(apiClient.get<ApiResponse<Record<string, unknown>>>('/settings/restaurant'))))),

  updateRestaurant: async (body: Record<string, unknown>) => {
    const response = normalizeRestaurant(await unwrap(apiClient.put<ApiResponse<Record<string, unknown>>>('/settings/restaurant', body)))
    return cacheRestaurant(mergeDefined(body as RestaurantSettings, response))
  },
}

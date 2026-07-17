import Store from 'electron-store'
import { randomUUID } from 'crypto'

interface TokenPair {
  accessToken: string
  refreshToken: string
}

const secureStore = new Store({
  name: 'dinehub-secure',
  encryptionKey: 'dinehub-desktop-v1-encryption-key',
  clearInvalidConfig: true
})

const KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  TENANT_SLUG: 'tenantSlug',
  DEVICE_ID: 'deviceId'
} as const

export function getAccessToken(): string | null {
  return (secureStore.get(KEYS.ACCESS_TOKEN) as string) ?? null
}

export function getRefreshToken(): string | null {
  return (secureStore.get(KEYS.REFRESH_TOKEN) as string) ?? null
}

export function setTokens(tokens: TokenPair): void {
  secureStore.set(KEYS.ACCESS_TOKEN, tokens.accessToken)
  secureStore.set(KEYS.REFRESH_TOKEN, tokens.refreshToken)
}

export function clearTokens(): void {
  secureStore.delete(KEYS.ACCESS_TOKEN)
  secureStore.delete(KEYS.REFRESH_TOKEN)
}

export function getTenantSlug(): string | null {
  return (secureStore.get(KEYS.TENANT_SLUG) as string) ?? null
}

export function setTenantSlug(slug: string): void {
  secureStore.set(KEYS.TENANT_SLUG, slug)
}

export function getDeviceId(): string {
  let deviceId = secureStore.get(KEYS.DEVICE_ID) as string | undefined
  if (!deviceId) {
    deviceId = randomUUID()
    secureStore.set(KEYS.DEVICE_ID, deviceId)
  }
  return deviceId
}

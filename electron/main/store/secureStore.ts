import Store from 'electron-store'
import { randomUUID } from 'crypto'
import { safeStorage } from 'electron'

interface TokenPair {
  accessToken: string
  refreshToken: string
}

const secureStore = new Store({
  name: 'dinehub-secure',
  clearInvalidConfig: true
})

const KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  TENANT_SLUG: 'tenantSlug',
  DEVICE_ID: 'deviceId'
} as const

// One-time migration from releases that treated a restaurant slug as auth state.
secureStore.delete(KEYS.TENANT_SLUG)

export function getAccessToken(): string | null {
  return readSecret(KEYS.ACCESS_TOKEN)
}

export function getRefreshToken(): string | null {
  return readSecret(KEYS.REFRESH_TOKEN)
}

export function setTokens(tokens: TokenPair): void {
  writeSecret(KEYS.ACCESS_TOKEN, tokens.accessToken)
  writeSecret(KEYS.REFRESH_TOKEN, tokens.refreshToken)
}

export function clearTokens(): void {
  secureStore.delete(KEYS.ACCESS_TOKEN)
  secureStore.delete(KEYS.REFRESH_TOKEN)
}

export function getTenantSlug(): string | null {
  return secureStore.get(KEYS.TENANT_SLUG) as string | null
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

function writeSecret(key: string, value: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure credential storage is unavailable on this device')
  }
  secureStore.set(key, safeStorage.encryptString(value).toString('base64'))
}

function readSecret(key: string): string | null {
  const encrypted = secureStore.get(key)
  if (typeof encrypted !== 'string' || !encrypted) return null
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    // Old releases stored tokens with an application-wide key. Do not expose or
    // migrate those values; require a new login into OS-backed storage instead.
    secureStore.delete(key)
    return null
  }
}

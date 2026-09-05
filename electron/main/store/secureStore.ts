import Store from 'electron-store'
import { randomUUID } from 'crypto'
import { safeStorage, app } from 'electron'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'

interface TokenPair {
  accessToken: string
  refreshToken: string
}

const APP_NAME = 'DiningHub'
const LEGACY_APP_DATA_DIRS = ['Electron', 'dine-hub-desktop']

const KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  TENANT_SLUG: 'tenantSlug',
  DEVICE_ID: 'deviceId',
  CACHED_USER: 'cachedUser',
} as const

let secureStore: Store | null = null

function migrateLegacyStoreFile(): void {
  app.setName(APP_NAME)
  const userData = app.getPath('userData')
  const targetFile = join(userData, 'dinehub-secure.json')
  if (existsSync(targetFile)) return

  const appData = app.getPath('appData')
  for (const legacyName of LEGACY_APP_DATA_DIRS) {
    const legacyFile = join(appData, legacyName, 'dinehub-secure.json')
    if (existsSync(legacyFile)) {
      mkdirSync(dirname(targetFile), { recursive: true })
      copyFileSync(legacyFile, targetFile)
      return
    }
  }
}

function getStore(): Store {
  if (!secureStore) {
    migrateLegacyStoreFile()
    secureStore = new Store({
      name: 'dinehub-secure',
      clearInvalidConfig: true,
    })
  }
  return secureStore
}

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
  const store = getStore()
  store.delete(KEYS.ACCESS_TOKEN)
  store.delete(KEYS.REFRESH_TOKEN)
  store.delete(KEYS.CACHED_USER)
}

export function getTenantSlug(): string | null {
  const slug = getStore().get(KEYS.TENANT_SLUG)
  return typeof slug === 'string' && slug.length > 0 ? slug : null
}

export function setTenantSlug(slug: string): void {
  getStore().set(KEYS.TENANT_SLUG, slug)
}

export function getDeviceId(): string {
  const store = getStore()
  let deviceId = store.get(KEYS.DEVICE_ID) as string | undefined
  if (!deviceId) {
    deviceId = randomUUID()
    store.set(KEYS.DEVICE_ID, deviceId)
  }
  return deviceId
}

export function getCachedUser(): Record<string, unknown> | null {
  const cached = getStore().get(KEYS.CACHED_USER)
  return cached && typeof cached === 'object' && !Array.isArray(cached)
    ? cached as Record<string, unknown>
    : null
}

export function setCachedUser(user: Record<string, unknown>): void {
  getStore().set(KEYS.CACHED_USER, user)
}

function looksLikeJwt(value: string): boolean {
  return value.startsWith('eyJ') && value.split('.').length === 3
}

function writeSecret(key: string, value: string): void {
  const store = getStore()
  if (safeStorage.isEncryptionAvailable()) {
    store.set(key, safeStorage.encryptString(value).toString('base64'))
    return
  }
  // Keep sessions working when OS keychain is unavailable (common on some Windows setups).
  store.set(key, value)
}

function readSecret(key: string): string | null {
  const stored = getStore().get(key)
  if (typeof stored !== 'string' || !stored) return null

  if (looksLikeJwt(stored)) {
    return stored
  }

  if (!safeStorage.isEncryptionAvailable()) {
    return stored
  }

  try {
    const decrypted = safeStorage.decryptString(Buffer.from(stored, 'base64'))
    return decrypted || null
  } catch {
    // Never delete credentials on decrypt glitches — keep raw value if it still looks usable.
    if (looksLikeJwt(stored)) return stored
    return null
  }
}

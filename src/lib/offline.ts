/**
 * Offline mode — IndexedDB cache + sync queue flushed via /sync/push.
 */

import { syncApi, type SyncMutation } from '@/api/phase2.api'

// Polyfill for crypto.randomUUID in environments where it's not available
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const DB_NAME = 'dinehub-offline'
const DB_VERSION = 2
const MAX_RETRIES = 5
const BASE_RETRY_DELAY_MS = 1000

export interface SyncQueueItem {
  id: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  body?: unknown
  resource?: SyncMutation['resource']
  operation?: SyncMutation['operation']
  createdAt: string
  retries: number
  lastAttemptAt?: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id' })
        store.createIndex('byCreatedAt', 'createdAt')
        store.createIndex('byRetries', 'retries')
      }
    }
  })
}

function awaitTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
  })
}

export async function cacheSet(key: string, data: unknown): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('cache', 'readwrite')
  tx.objectStore('cache').put({ key, data, updatedAt: new Date().toISOString() })
  await awaitTransaction(tx)
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction('cache', 'readonly').objectStore('cache').get(key)
    req.onsuccess = () => resolve(req.result?.data ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueueSync(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries' | 'lastAttemptAt'>): Promise<void> {
  const db = await openDB()
  const entry: SyncQueueItem = {
    ...item,
    id: generateId(),
    createdAt: new Date().toISOString(),
    retries: 0,
  }
  const tx = db.transaction('syncQueue', 'readwrite')
  tx.objectStore('syncQueue').add(entry)
  await awaitTransaction(tx)
}

export async function listSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction('syncQueue', 'readonly').objectStore('syncQueue').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function toMutation(item: SyncQueueItem): SyncMutation | null {
  if (item.resource && item.operation && item.body && typeof item.body === 'object') {
    return {
      resource: item.resource,
      operation: item.operation,
      key: item.id,
      payload: item.body as Record<string, unknown>,
    }
  }
  if (item.url === '/orders' && item.method === 'POST' && item.body && typeof item.body === 'object') {
    return {
      resource: 'orders',
      operation: 'create',
      key: item.id,
      payload: item.body as Record<string, unknown>,
    }
  }
  if (item.url.startsWith('/orders/') && item.url.endsWith('/items') && item.method === 'POST' && item.body && typeof item.body === 'object') {
    return {
      resource: 'orders',
      operation: 'update',
      key: item.id,
      payload: {
        ...(item.body as Record<string, unknown>),
        orderId: item.url.split('/')[2],
        action: 'add_items',
      },
    }
  }
  if (item.url.startsWith('/orders/') && item.method === 'PATCH' && item.body && typeof item.body === 'object') {
    return {
      resource: 'orders',
      operation: 'update',
      key: item.id,
      payload: item.body as Record<string, unknown>,
    }
  }
  if (item.url.startsWith('/customers') && item.method === 'POST' && item.body && typeof item.body === 'object') {
    return {
      resource: 'customers',
      operation: 'create',
      key: item.id,
      payload: item.body as Record<string, unknown>,
    }
  }
  if (item.url.startsWith('/customers/') && item.method === 'PATCH' && item.body && typeof item.body === 'object') {
    return {
      resource: 'customers',
      operation: 'update',
      key: item.id,
      payload: item.body as Record<string, unknown>,
    }
  }
  if (item.url.startsWith('/inventory/') && item.method === 'POST' && item.body && typeof item.body === 'object') {
    return {
      resource: 'inventory',
      operation: 'create',
      key: item.id,
      payload: item.body as Record<string, unknown>,
    }
  }
  if (item.url.startsWith('/inventory/') && item.method === 'PATCH' && item.body && typeof item.body === 'object') {
    return {
      resource: 'inventory',
      operation: 'update',
      key: item.id,
      payload: item.body as Record<string, unknown>,
    }
  }
  return null
}

function getRetryDelay(retries: number): number {
  return BASE_RETRY_DELAY_MS * Math.pow(2, retries) + Math.random() * 1000
}

async function updateItemRetry(db: IDBDatabase, item: SyncQueueItem): Promise<void> {
  const tx = db.transaction('syncQueue', 'readwrite')
  const updatedItem = {
    ...item,
    retries: item.retries + 1,
    lastAttemptAt: new Date().toISOString(),
  }
  tx.objectStore('syncQueue').put(updatedItem)
  await awaitTransaction(tx)
}

async function deleteItem(db: IDBDatabase, id: string): Promise<void> {
  const tx = db.transaction('syncQueue', 'readwrite')
  tx.objectStore('syncQueue').delete(id)
  await awaitTransaction(tx)
}

export async function processSyncQueue(
  executor?: (item: SyncQueueItem) => Promise<void>,
): Promise<number> {
  const db = await openDB()
  const items = await listSyncQueue()
  if (!items.length) return 0

  const now = Date.now()
  const retryableItems = items.filter((item) => {
    if (item.retries >= MAX_RETRIES) return false
    if (!item.lastAttemptAt) return true
    const lastAttempt = new Date(item.lastAttemptAt).getTime()
    return now - lastAttempt >= getRetryDelay(item.retries)
  })

  if (!retryableItems.length) return 0

  if (executor) {
    let processed = 0
    for (const item of retryableItems) {
      try {
        await executor(item)
        await deleteItem(db, item.id)
        processed++
      } catch {
        await updateItemRetry(db, item)
      }
    }
    return processed
  }

  let processed = 0
  for (const item of retryableItems) {
    const mutation = toMutation(item)
    if (!mutation) {
      await deleteItem(db, item.id)
      continue
    }

    try {
      await syncApi.push([mutation])
      await deleteItem(db, item.id)
      processed++
    } catch {
      await updateItemRetry(db, item)
    }
  }
  return processed
}

export async function flushOfflineQueue(): Promise<number> {
  // Skip reachability probe when there's nothing to sync.
  const pending = await listSyncQueue().catch(() => [] as SyncQueueItem[])
  if (pending.length === 0) return 0

  // Prefer a real API ping over navigator.onLine (desktop can be "offline" to WAN
  // but still reach the restaurant API — or the reverse).
  try {
    const { checkOnline } = await import('@/api/client')
    const reachable = await checkOnline()
    if (!reachable && !navigator.onLine) return 0
  } catch {
    if (!navigator.onLine) return 0
  }
  return processSyncQueue()
}

/** Fetch online and seed IndexedDB; on network/timeout failure return last cached value. */
export async function withOfflineCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const data = await Promise.race([
      fetcher(),
      new Promise<never>((_, reject) => {
        window.setTimeout(
          () => reject({ statusCode: 0, message: 'Request timed out' }),
          22_000,
        )
      }),
    ])
    await cacheSet(key, data).catch(() => {})
    return data
  } catch (error) {
    const cached = await cacheGet<T>(key).catch(() => null)
    // Empty arrays are usually a prior unscoped/failed response — don't treat them as offline truth.
    if (cached != null && !(Array.isArray(cached) && cached.length === 0)) return cached
    throw error
  }
}

export function isNetworkFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const status = (error as { statusCode?: number }).statusCode
  return status === 0 || !navigator.onLine
}

export async function getSyncQueueStatus(): Promise<{ pending: number; failed: number; oldestItem?: string }> {
  const items = await listSyncQueue()
  const pending = items.filter((i) => i.retries < MAX_RETRIES).length
  const failed = items.filter((i) => i.retries >= MAX_RETRIES).length
  const oldestItem = items.length > 0
    ? items.reduce((oldest, item) => item.createdAt < oldest.createdAt ? item : oldest).createdAt
    : undefined
  return { pending, failed, oldestItem }
}

export async function clearFailedSyncItems(): Promise<number> {
  const db = await openDB()
  const items = await listSyncQueue()
  let cleared = 0
  for (const item of items) {
    if (item.retries >= MAX_RETRIES) {
      await deleteItem(db, item.id)
      cleared++
    }
  }
  return cleared
}
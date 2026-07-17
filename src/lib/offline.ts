/**
 * Offline mode infrastructure — IndexedDB cache + sync queue
 * Full implementation in future modules when menu/orders APIs are wired.
 */

const DB_NAME = 'dinehub-offline'
const DB_VERSION = 1

export interface SyncQueueItem {
  id: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  body?: unknown
  createdAt: string
  retries: number
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
        db.createObjectStore('syncQueue', { keyPath: 'id' })
      }
    }
  })
}

export async function cacheSet(key: string, data: unknown): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('cache', 'readwrite')
  tx.objectStore('cache').put({ key, data, updatedAt: new Date().toISOString() })
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction('cache', 'readonly').objectStore('cache').get(key)
    req.onsuccess = () => resolve(req.result?.data ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueueSync(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries'>): Promise<void> {
  const db = await openDB()
  const entry: SyncQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retries: 0
  }
  const tx = db.transaction('syncQueue', 'readwrite')
  tx.objectStore('syncQueue').add(entry)
}

export async function processSyncQueue(
  executor: (item: SyncQueueItem) => Promise<void>
): Promise<number> {
  const db = await openDB()
  const items: SyncQueueItem[] = await new Promise((resolve, reject) => {
    const req = db.transaction('syncQueue', 'readonly').objectStore('syncQueue').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  let processed = 0
  for (const item of items) {
    try {
      await executor(item)
      const tx = db.transaction('syncQueue', 'readwrite')
      tx.objectStore('syncQueue').delete(item.id)
      processed++
    } catch {
      // keep in queue for next sync attempt
    }
  }
  return processed
}

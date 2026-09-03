const API_BASE = (import.meta.env.VITE_API_URL || 'https://dininghub.in/api/v1').replace(/\/$/, '')
const ACCESS = 'dinehub.web.access'
const REFRESH = 'dinehub.web.refresh'
const TENANT = 'dinehub.web.tenant'
const DEVICE = 'dinehub.web.device'
const CACHED_USER = 'dinehub.web.cachedUser'

/** Persist login until explicit logout (sessionStorage cleared on tab close). */
const authStorage = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  set: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value)
      sessionStorage.removeItem(key)
    } catch {
      try { sessionStorage.setItem(key, value) } catch { /* ignore */ }
    }
  },
  remove: (key: string) => {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
    try { sessionStorage.removeItem(key) } catch { /* ignore */ }
  },
}

function deviceId() {
  let id = localStorage.getItem(DEVICE)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE, id) }
  return id
}

function tokensFrom(data: unknown) {
  const value = data as { data?: { tokens?: { accessToken?: string; refreshToken?: string } } }
  const tokens = value?.data?.tokens
  if (tokens?.accessToken && tokens.refreshToken) {
    authStorage.set(ACCESS, tokens.accessToken)
    authStorage.set(REFRESH, tokens.refreshToken)
  }
}

function clearAuthTokens() {
  authStorage.remove(ACCESS)
  authStorage.remove(REFRESH)
  authStorage.remove(CACHED_USER)
}

function cacheUserFromResponse(path: string, data: unknown) {
  if (
    !path.startsWith('/auth/login')
    && path !== '/auth/me'
    && !path.startsWith('/auth/otp/')
    && !path.startsWith('/auth/pin/login')
  ) {
    return
  }
  const user = (data as { data?: { user?: Record<string, unknown> } })?.data?.user
  if (user && typeof user === 'object') {
    authStorage.set(CACHED_USER, JSON.stringify(user))
  }
}

function getCachedUser(): Record<string, unknown> | null {
  const raw = authStorage.get(CACHED_USER)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

async function parse(response: Response, responseType?: string) {
  const headers = Object.fromEntries(response.headers.entries())
  const data = responseType === 'arraybuffer' || responseType === 'blob'
    ? new Uint8Array(await response.arrayBuffer())
    : await response.json().catch(() => null)
  return { status: response.status, headers, data }
}

async function rawRequest(request: any, accessToken = authStorage.get(ACCESS)) {
  const query = new URLSearchParams()
  Object.entries(request.query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) query.set(key, String(value))
  })
  const url = `${API_BASE}${request.path}${query.size ? `?${query}` : ''}`
  const response = await fetch(url, {
    method: request.method,
    headers: {
      Accept: request.responseType ? '*/*' : 'application/json',
      ...(request.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(request.headers || {}),
    },
    body: request.body === undefined ? undefined : JSON.stringify(request.body),
  })
  return { response, parsed: await parse(response, request.responseType) }
}

async function requestDineHub(request: any) {
  try {
    let result = await rawRequest(request)
    if (result.response.status === 401 && !String(request.path || '').startsWith('/auth/login') && !String(request.path || '').startsWith('/auth/refresh') && !String(request.path || '').startsWith('/auth/register')) {
      const refreshToken = authStorage.get(REFRESH)
      if (refreshToken) {
        const refresh = await rawRequest({ method: 'POST', path: '/auth/refresh', body: { refreshToken } }, null)
        if (refresh.response.ok) {
          tokensFrom(refresh.parsed.data)
          result = await rawRequest(request)
        } else {
          // Refresh rejected — end the lasting session so the UI can return to login.
          clearAuthTokens()
        }
      } else {
        clearAuthTokens()
      }
    }
    tokensFrom(result.parsed.data)
    cacheUserFromResponse(String(request.path || ''), result.parsed.data)
    if (!result.response.ok) {
      const body = result.parsed.data as any
      return { ok: false, error: { statusCode: result.response.status, message: body?.message || 'Request failed', errors: body?.errors, path: request.path } }
    }
    return { ok: true, response: result.parsed }
  } catch (error) {
    return { ok: false, error: { statusCode: 0, message: error instanceof Error ? error.message : 'Network request failed', path: request.path } }
  }
}

function download(filename: string, content: BlobPart, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { saved: true, path: filename }
}

const MENU_UPLOAD: Record<string, string> = {
  category: '/menu/categories/upload-image',
  item: '/menu/items/upload-image',
  combo: '/combos/upload-image',
}

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || new URL(API_BASE).origin).replace(/\/$/, '')
const FORWARDED_EVENTS = [
  'new_order', 'order_updated', 'order_status_updated', 'new_kitchen_order',
  'kitchen_order_updated', 'table_updated', 'table_status_updated',
  'waiter_call_alert', 'waiter.requested', 'waiter.acknowledged',
  'waiter.completed', 'waiter.cancelled', 'qr-order.created',
  'low_stock_alert', 'notification',
] as const

type StateListener = (state: 'connected' | 'disconnected' | 'connecting') => void
type EventListener = (event: string, payload: unknown) => void

let webSocket: import('socket.io-client').Socket | null = null
const stateListeners = new Set<StateListener>()
const eventListeners = new Set<EventListener>()

function emitState(state: 'connected' | 'disconnected' | 'connecting') {
  stateListeners.forEach((listener) => listener(state))
}

async function connectWebRealtime() {
  if (webSocket?.connected) {
    emitState('connected')
    return
  }
  const token = authStorage.get(ACCESS)
  if (!token) throw new Error('An authenticated session is required')
  emitState('connecting')
  const { io } = await import('socket.io-client')
  if (webSocket) {
    webSocket.removeAllListeners()
    webSocket.disconnect()
  }
  webSocket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  })
  webSocket.on('connect', () => {
    emitState('connected')
    webSocket?.emit('join_tenant')
  })
  webSocket.on('disconnect', () => emitState('disconnected'))
  webSocket.on('connect_error', () => emitState('disconnected'))
  FORWARDED_EVENTS.forEach((event) => {
    webSocket?.on(event, (payload) => {
      eventListeners.forEach((listener) => listener(event, payload))
    })
  })
}

function disconnectWebRealtime() {
  webSocket?.removeAllListeners()
  webSocket?.disconnect()
  webSocket = null
  emitState('disconnected')
}

function pickImageFile(kind: 'category' | 'item' | 'combo'): Promise<{
  name: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
  size: number
  base64: string
  previewUrl: string
} | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const maxMb = kind === 'combo' ? 5 : 1
      if (file.size > maxMb * 1024 * 1024) {
        resolve(null)
        return
      }
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      bytes.forEach((b) => { binary += String.fromCharCode(b) })
      const base64 = btoa(binary)
      const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
      resolve({
        name: file.name,
        mimeType,
        size: file.size,
        base64,
        previewUrl: `data:${mimeType};base64,${base64}`,
      })
    }
    input.click()
  })
}

async function uploadMenuImageWeb(
  kind: 'category' | 'item' | 'combo',
  file: { name: string; mimeType: string; size: number; base64: string },
  onProgress: (progress: number) => void
) {
  const bytes = Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0))
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: file.mimeType }), file.name)
  onProgress(20)
  const accessToken = authStorage.get(ACCESS)
  const response = await fetch(`${API_BASE}${MENU_UPLOAD[kind]}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: form,
  })
  onProgress(80)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return { ok: false, error: { message: payload?.message || 'Image upload failed', statusCode: response.status } }
  }
  const imageUrl = payload?.data?.imageUrl || payload?.data?.url || payload?.data?.fileUrl
  if (!imageUrl) {
    return { ok: false, error: { message: 'Upload response did not contain an image URL', statusCode: 502 } }
  }
  onProgress(100)
  return { ok: true, payload: { data: { ...payload?.data, imageUrl } } }
}

export function installBrowserBridge() {
  // Electron must use the real preload IPC bridge. Falling back to renderer `fetch`
  // from a packaged `file://` page hits CORS and surfaces as "Failed to fetch" on login.
  const isElectron =
    typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)
  if (isElectron || window.electronAPI) return

  const noopUnsubscribe = () => () => {}
  ;(window as any).electronAPI = {
    requestDineHub,
    hasSession: async () => Boolean(authStorage.get(ACCESS) && authStorage.get(REFRESH)),
    getCachedUser: async () => getCachedUser(),
    clearTokens: async () => { clearAuthTokens() },
    getTenantSlug: async () => authStorage.get(TENANT),
    setTenantSlug: async (slug: string) => { authStorage.set(TENANT, slug) },
    getDeviceId: async () => deviceId(),
    getAppVersion: async () => 'web',
    openExternal: async (url: string) => { window.open(url, '_blank', 'noopener,noreferrer') },
    printReceipt: async (html: string) => { const popup=window.open('', '_blank'); if(popup){popup.document.write(html);popup.document.close();popup.print()} },
    saveFile: async ({ filename, content }: any) => download(filename, content, 'text/plain'),
    saveBytes: async ({ filename, bytes, contentType }: any) => download(filename, bytes, contentType),
    updates: { getStatus: async () => ({ state: 'idle' }), check: async () => ({ state: 'idle' }), install: async () => false, onStatus: noopUnsubscribe },
    realtime: {
      connect: () => connectWebRealtime(),
      disconnect: async () => { disconnectWebRealtime() },
      onState: (callback: StateListener) => {
        stateListeners.add(callback)
        callback(webSocket?.connected ? 'connected' : 'disconnected')
        return () => { stateListeners.delete(callback) }
      },
      onEvent: (callback: EventListener) => {
        eventListeners.add(callback)
        return () => { eventListeners.delete(callback) }
      },
    },
    notify: { show: async (title: string, body: string) => { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body }) } },
    menuImages: {
      select: (kind: 'category' | 'item' | 'combo' = 'item') => pickImageFile(kind),
      upload: (kind: 'category' | 'item' | 'combo', file: any, onProgress: (n: number) => void) =>
        uploadMenuImageWeb(kind, file, onProgress),
    },
    window: { minimize: async () => undefined, maximize: async () => undefined, close: async () => undefined, openPOS: async () => undefined, openKDS: async () => undefined },
    print: { receipt: async (html: string) => {
      const popup = window.open('', '_blank')
      if (!popup) throw new Error('Allow pop-ups to print')
      popup.document.write(html)
      popup.document.close()
      popup.document.title = 'Receipt'
      popup.print()
    }, kitchen: async (html: string) => {
      const popup = window.open('', '_blank')
      if (!popup) throw new Error('Allow pop-ups to print')
      popup.document.write(html)
      popup.document.close()
      popup.document.title = 'KOT — Kitchen'
      popup.print()
    }, getPrinters: async () => [] },
    theme: { get: async () => false, set: async () => undefined },
    onApiError: noopUnsubscribe,
  }
}

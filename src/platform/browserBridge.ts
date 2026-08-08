const API_BASE = (import.meta.env.VITE_API_URL || 'https://dininghub.in/api/v1').replace(/\/$/, '')
const ACCESS = 'dinehub.web.access'
const REFRESH = 'dinehub.web.refresh'
const DEVICE = 'dinehub.web.device'

function deviceId() {
  let id = localStorage.getItem(DEVICE)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE, id) }
  return id
}

function tokensFrom(data: unknown) {
  const value = data as { data?: { tokens?: { accessToken?: string; refreshToken?: string } } }
  const tokens = value?.data?.tokens
  if (tokens?.accessToken && tokens.refreshToken) {
    sessionStorage.setItem(ACCESS, tokens.accessToken)
    sessionStorage.setItem(REFRESH, tokens.refreshToken)
  }
}

async function parse(response: Response, responseType?: string) {
  const headers = Object.fromEntries(response.headers.entries())
  const data = responseType === 'arraybuffer' || responseType === 'blob'
    ? new Uint8Array(await response.arrayBuffer())
    : await response.json().catch(() => null)
  return { status: response.status, headers, data }
}

async function rawRequest(request: any, accessToken = sessionStorage.getItem(ACCESS)) {
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
    if (result.response.status === 401 && !request.path.startsWith('/auth/')) {
      const refreshToken = sessionStorage.getItem(REFRESH)
      if (refreshToken) {
        const refresh = await rawRequest({ method: 'POST', path: '/auth/refresh', body: { refreshToken } }, null)
        if (refresh.response.ok) {
          tokensFrom(refresh.parsed.data)
          result = await rawRequest(request)
        }
      }
    }
    tokensFrom(result.parsed.data)
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

export function installBrowserBridge() {
  if (window.electronAPI) return
  const noopUnsubscribe = () => () => {}
  ;(window as any).electronAPI = {
    requestDineHub,
    hasSession: async () => Boolean(sessionStorage.getItem(ACCESS) && sessionStorage.getItem(REFRESH)),
    clearTokens: async () => { sessionStorage.removeItem(ACCESS); sessionStorage.removeItem(REFRESH) },
    getTenantSlug: async () => null,
    setTenantSlug: async () => undefined,
    getDeviceId: async () => deviceId(),
    getAppVersion: async () => 'web',
    openExternal: async (url: string) => { window.open(url, '_blank', 'noopener,noreferrer') },
    printReceipt: async (html: string) => { const popup=window.open('', '_blank'); if(popup){popup.document.write(html);popup.document.close();popup.print()} },
    saveFile: async ({ filename, content }: any) => download(filename, content, 'text/plain'),
    saveBytes: async ({ filename, bytes, contentType }: any) => download(filename, bytes, contentType),
    updates: { getStatus: async () => ({ state: 'idle' }), check: async () => ({ state: 'idle' }), install: async () => false, onStatus: noopUnsubscribe },
    realtime: { connect: async () => undefined, disconnect: async () => undefined, onState: noopUnsubscribe, onEvent: noopUnsubscribe },
    notify: { show: async (title: string, body: string) => { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body }) } },
    menuImages: { select: async () => null, upload: async () => { throw new Error('Use an image URL in the web app') } },
    window: { minimize: async () => undefined, maximize: async () => undefined, close: async () => undefined, openPOS: async () => undefined, openKDS: async () => undefined },
    print: { receipt: async () => undefined, kitchen: async () => undefined, getPrinters: async () => [] },
    theme: { get: async () => false, set: async () => undefined },
    onApiError: noopUnsubscribe,
  }
}

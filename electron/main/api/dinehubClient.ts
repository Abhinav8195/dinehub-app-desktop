import {
  getAccessToken, getRefreshToken, setTokens, clearTokens, setCachedUser
} from '../store/secureStore'

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type DesktopResponseType = 'json' | 'text' | 'arraybuffer' | 'blob'

export interface ApiRequest {
  method: ApiMethod
  path: string
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  headers?: Record<string, string>
  responseType?: DesktopResponseType
  timeout?: number
}

export interface DesktopApiResponse<T = unknown> {
  status: number
  headers: Record<string, string>
  data: T
}

export interface ApiFailure {
  statusCode: number
  message: string
  errors?: string[] | Record<string, string[]>
  path?: string
}

export interface MenuImageUpload {
  name: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
  size: number
  base64: string
}

const baseUrl = (
  process.env.DINEHUB_API_URL ||
  import.meta.env.MAIN_VITE_API_URL ||
  'https://dininghub.in/api/v1'
).replace(/\/$/, '')
const debugApi = import.meta.env.DEV || process.env.DINEHUB_API_DEBUG === '1'

interface RefreshState {
  promise: Promise<string> | null
}

const refreshState: RefreshState = { promise: null }
let tokenEpoch = 0

export function bumpTokenEpoch(): number {
  tokenEpoch += 1
  return tokenEpoch
}

export function getTokenEpoch(): number {
  return tokenEpoch
}

const REQUEST_TIMEOUT_MS = 20_000

function requestTimeoutMs(request?: Pick<ApiRequest, 'timeout'>): number {
  return typeof request?.timeout === 'number' && request.timeout > 0
    ? request.timeout
    : REQUEST_TIMEOUT_MS
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = (error as { name?: string }).name
  const message = error instanceof Error ? error.message : String(error)
  return name === 'TimeoutError' || name === 'AbortError' || /aborted|timeout/i.test(message)
}

function logRequest(method: string, url: string): void {
  if (debugApi) console.info(`[DiningHub API] -> ${method} ${url}`)
}

function logResponse(method: string, url: string, status: number): void {
  if (debugApi) console.info(`[DiningHub API] <- ${status} ${method} ${url}`)
}

function logFailure(method: string, url: string, error: unknown): void {
  if (!debugApi) return
  const message = error instanceof Error ? error.message : 'Network request failed'
  console.error(`[DiningHub API] !! ${method} ${url} - ${message}`)
}

function assertRequest(request: ApiRequest): void {
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) throw new Error('Unsupported API method')
  if (!request.path.startsWith('/') || request.path.startsWith('//') || request.path.includes('://')) {
    throw new Error('Invalid DiningHub API path')
  }
}

function buildUrl(path: string, query?: ApiRequest['query']): string {
  const url = new URL(`${baseUrl}${path}`)
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value))
  })
  return url.toString()
}

function responseHeaders(response: Response): Record<string, string> {
  return Object.fromEntries(response.headers.entries())
}

async function parseResponse(response: Response, responseType: DesktopResponseType = 'json'): Promise<DesktopApiResponse> {
  if (response.ok && (responseType === 'arraybuffer' || responseType === 'blob')) {
    return {
      status: response.status,
      headers: responseHeaders(response),
      data: new Uint8Array(await response.arrayBuffer())
    }
  }
  const text = await response.text()
  let payload: Record<string, unknown> | null = null
  if (text) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>
    } catch {
      const isHtml = /^\s*</.test(text)
      const failure: ApiFailure = {
        statusCode: response.status,
        message: isHtml
          ? `DiningHub API gateway returned ${response.status || 'an invalid response'}. Please try again shortly.`
          : 'DiningHub API returned an invalid response.'
      }
      throw failure
    }
  }
  if (response.ok) {
    return {
      status: response.status,
      headers: responseHeaders(response),
      data: responseType === 'text' ? text : payload
    }
  }
  const failure: ApiFailure = {
    statusCode: response.status,
    message: typeof payload?.message === 'string' ? payload.message : response.statusText || 'Request failed',
    errors: payload?.errors as ApiFailure['errors'],
    path: typeof payload?.path === 'string' ? payload.path : undefined
  }
  throw failure
}

async function refreshAccessToken(): Promise<string> {
  if (refreshState.promise) {
    return refreshState.promise
  }

  const refreshTokenAtStart = getRefreshToken()
  const epochAtStart = tokenEpoch

  refreshState.promise = (async () => {
    if (!refreshTokenAtStart) {
      throw { statusCode: 401, message: 'Your session has expired. Please sign in again.' } satisfies ApiFailure
    }
    const refreshUrl = buildUrl('/auth/refresh')
    logRequest('POST', refreshUrl)
    let response: Response
    try {
      response = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken: refreshTokenAtStart, refresh_token: refreshTokenAtStart }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      throw {
        statusCode: 0,
        message: isTimeoutError(error)
          ? `DiningHub API timed out after ${Math.round(REQUEST_TIMEOUT_MS / 1000)}s. Check internet / VPN, then try again.`
          : error instanceof Error ? error.message : 'Network request failed',
        path: '/auth/refresh',
      } satisfies ApiFailure
    }
    logResponse('POST', refreshUrl, response.status)
    const result = await parseResponse(response)
    const payload = result.data as Record<string, unknown> | null
    const data = (payload?.data && typeof payload.data === 'object' ? payload.data : payload) as Record<string, unknown> | null
    const nested = data?.tokens && typeof data.tokens === 'object' ? data.tokens as Record<string, unknown> : null
    const accessToken = [
      nested?.accessToken,
      nested?.access_token,
      data?.accessToken,
      data?.access_token,
    ].find((value): value is string => typeof value === 'string' && value.length > 0)
    const nextRefresh = [
      nested?.refreshToken,
      nested?.refresh_token,
      data?.refreshToken,
      data?.refresh_token,
      refreshTokenAtStart,
    ].find((value): value is string => typeof value === 'string' && value.length > 0)
    if (!accessToken || !nextRefresh) {
      throw { statusCode: 401, message: 'Invalid refresh response' } satisfies ApiFailure
    }
    // A newer login/logout won the race — keep the newer session.
    if (epochAtStart !== tokenEpoch || getRefreshToken() !== refreshTokenAtStart) {
      const current = getAccessToken()
      if (current) return current
    }
    setTokens({ accessToken, refreshToken: nextRefresh })
    tokenEpoch += 1
    return accessToken
  })().finally(() => {
    refreshState.promise = null
  })

  return refreshState.promise
}

function requestHeaders(request: ApiRequest, accessToken: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: request.responseType === 'arraybuffer' || request.responseType === 'blob' ? '*/*' : 'application/json',
    ...request.headers
  }
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  return headers
}

/** Login/refresh/register 401s must not recurse into token refresh. /auth/me should. */
function isAuthCredentialPath(path: string): boolean {
  return (
    path.startsWith('/auth/login')
    || path.startsWith('/auth/refresh')
    || path.startsWith('/auth/register')
    || path.startsWith('/auth/forgot-password')
    || path.startsWith('/auth/reset-password')
  )
}

async function send(request: ApiRequest, accessToken: string | null): Promise<DesktopApiResponse> {
  const headers = requestHeaders(request, accessToken)
  const url = buildUrl(request.path, request.query)
  const timeoutMs = requestTimeoutMs(request)
  logRequest(request.method, url)
  let response: Response
  try {
    response = await fetch(url, {
      method: request.method,
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    logResponse(request.method, url, response.status)
  } catch (error) {
    logFailure(request.method, url, error)
    const raw = error instanceof Error ? error.message : 'Network request failed'
    const timedOut = isTimeoutError(error)
    const unreachable =
      timedOut
      || /failed to fetch|fetch failed|networkerror|econnrefused|enotfound|etimedout|certificate|ssl|unable to connect/i
        .test(raw)
    throw {
      statusCode: 0,
      message: timedOut
        ? `DiningHub API timed out after ${Math.round(timeoutMs / 1000)}s. Check internet / VPN, then try again.`
        : unreachable
          ? `Cannot reach DiningHub API (${baseUrl}). Check internet / VPN, then try again.`
          : raw,
      path: request.path,
    } satisfies ApiFailure
  }
  if (response.status === 401 && !isAuthCredentialPath(request.path)) {
    const freshToken = await refreshAccessToken()
    return sendOnce(request, freshToken)
  }
  return parseResponse(response, request.responseType)
}

async function sendOnce(request: ApiRequest, accessToken: string): Promise<DesktopApiResponse> {
  const timeoutMs = requestTimeoutMs(request)
  try {
    const response = await fetch(buildUrl(request.path, request.query), {
      method: request.method,
      headers: requestHeaders(request, accessToken),
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    return parseResponse(response, request.responseType)
  } catch (error) {
    if ((error as Partial<ApiFailure> | null)?.statusCode != null) throw error
    const timedOut = isTimeoutError(error)
    throw {
      statusCode: 0,
      message: timedOut
        ? `DiningHub API timed out after ${Math.round(timeoutMs / 1000)}s. Check internet / VPN, then try again.`
        : error instanceof Error ? error.message : 'Network request failed',
      path: request.path,
    } satisfies ApiFailure
  }
}

async function sendImageUpload(
  path: string,
  file: MenuImageUpload,
  accessToken: string | null,
  onProgress: (progress: number) => void
): Promise<unknown> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  const bytes = Buffer.from(file.base64, 'base64')
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: file.mimeType }), file.name)
  onProgress(25)
  const response = await fetch(buildUrl(path), { method: 'POST', headers, body: form })
  onProgress(80)
  if (response.status === 401) {
    const freshToken = await refreshAccessToken()
    return sendImageUploadOnce(path, file, freshToken, onProgress)
  }
  const payload = (await parseResponse(response)).data
  onProgress(100)
  return payload
}

async function sendImageUploadOnce(
  path: string,
  file: MenuImageUpload,
  accessToken: string,
  onProgress: (progress: number) => void
): Promise<unknown> {
  const form = new FormData()
  form.append('file', new Blob([Buffer.from(file.base64, 'base64')], { type: file.mimeType }), file.name)
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: form
  })
  const payload = (await parseResponse(response)).data
  onProgress(100)
  return payload
}

export async function requestDineHub(request: ApiRequest): Promise<unknown> {
  return (await requestDineHubTransport(request)).data
}

function cacheUserFromResponse(path: string, payload: unknown): void {
  const body = payload as { data?: Record<string, unknown> | null }
  const data = body?.data
  if (!data || typeof data !== 'object') return

  if (path === '/auth/me' || path.startsWith('/auth/me?')) {
    if (typeof data.id === 'string' || typeof data.email === 'string') {
      setCachedUser(data)
    }
    return
  }

  if (
    path.startsWith('/auth/login')
    || path.startsWith('/auth/otp/')
    || path.startsWith('/auth/pin/login')
  ) {
    const user = data.user
    if (user && typeof user === 'object' && !Array.isArray(user)) {
      setCachedUser(user as Record<string, unknown>)
    }
  }
}

export async function requestDineHubTransport(request: ApiRequest): Promise<DesktopApiResponse> {
  assertRequest(request)
  const result = await send(request, getAccessToken())
  const payload = result.data
  const tokens = (payload as { data?: { tokens?: { accessToken?: string; refreshToken?: string } } }).data?.tokens
  if (tokens?.accessToken) {
    setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || getRefreshToken() || tokens.accessToken,
    })
    tokenEpoch += 1
  }
  cacheUserFromResponse(request.path, payload)
  return result
}

const MENU_IMAGE_UPLOAD_PATH: Record<'category' | 'item' | 'combo', '/menu/categories/upload-image' | '/menu/items/upload-image' | '/combos/upload-image'> = {
  category: '/menu/categories/upload-image',
  item: '/menu/items/upload-image',
  combo: '/combos/upload-image',
}

export async function uploadMenuImage(
  kind: 'category' | 'item' | 'combo',
  file: MenuImageUpload,
  onProgress: (progress: number) => void
): Promise<unknown> {
  const maxSize = kind === 'combo' ? 5 * 1024 * 1024 : 1024 * 1024
  if (file.size <= 0 || file.size > maxSize) {
    throw { statusCode: 400, message: `Image must be ${kind === 'combo' ? 5 : 1} MB or smaller` } satisfies ApiFailure
  }
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimeType)) {
    throw { statusCode: 400, message: 'Select a JPEG, PNG, WebP, or GIF image' } satisfies ApiFailure
  }
  const path = MENU_IMAGE_UPLOAD_PATH[kind]
  const payload = await sendImageUpload(path, file, getAccessToken(), onProgress)
  const response = payload as {
    data?: { imageUrl?: unknown; url?: unknown; fileUrl?: unknown; path?: unknown }
  }
  const uploadedUrl = [
    response.data?.imageUrl,
    response.data?.url,
    response.data?.fileUrl,
    response.data?.path
  ].find((value): value is string => typeof value === 'string' && value.length > 0)

  if (!uploadedUrl) {
    throw {
      statusCode: 502,
      message: 'The image was uploaded, but the server did not return its URL.'
    } satisfies ApiFailure
  }

  return {
    ...(payload as Record<string, unknown>),
    data: { ...response.data, imageUrl: uploadedUrl }
  }
}

export const session = {
  hasSession: () => Boolean(getAccessToken() || getRefreshToken()),
  clear: clearTokens
}

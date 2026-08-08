import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../store/secureStore'

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
let refreshPromise: Promise<string> | null = null

function logRequest(method: string, url: string): void {
  if (debugApi) console.info(`[DineHub API] -> ${method} ${url}`)
}

function logResponse(method: string, url: string, status: number): void {
  if (debugApi) console.info(`[DineHub API] <- ${status} ${method} ${url}`)
}

function logFailure(method: string, url: string, error: unknown): void {
  if (!debugApi) return
  const message = error instanceof Error ? error.message : 'Network request failed'
  console.error(`[DineHub API] !! ${method} ${url} - ${message}`)
}

function assertRequest(request: ApiRequest): void {
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) throw new Error('Unsupported API method')
  if (!request.path.startsWith('/') || request.path.startsWith('//') || request.path.includes('://')) {
    throw new Error('Invalid DineHub API path')
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
          ? `DineHub API gateway returned ${response.status || 'an invalid response'}. Please try again shortly.`
          : 'DineHub API returned an invalid response.'
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
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) throw { statusCode: 401, message: 'Your session has expired. Please sign in again.' } satisfies ApiFailure
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken })
    })
    const result = await parseResponse(response)
    const payload = result.data as { data?: { tokens?: { accessToken?: string; refreshToken?: string } } }
    const tokens = payload.data?.tokens
    if (!tokens?.accessToken || !tokens.refreshToken) throw { statusCode: 401, message: 'Invalid refresh response' } satisfies ApiFailure
    setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
    return tokens.accessToken
  })()
  try {
    return await refreshPromise
  } catch (error) {
    const statusCode = (error as Partial<ApiFailure> | null)?.statusCode
    // A network/gateway failure does not mean the refresh token is invalid.
    // Keep the persisted session so the app can retry when the API recovers.
    if (statusCode === 401 || statusCode === 403) clearTokens()
    throw error
  } finally {
    refreshPromise = null
  }
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

async function send(request: ApiRequest, accessToken: string | null): Promise<DesktopApiResponse> {
  const headers = requestHeaders(request, accessToken)
  const url = buildUrl(request.path, request.query)
  logRequest(request.method, url)
  let response: Response
  try {
    response = await fetch(url, {
      method: request.method,
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: request.timeout ? AbortSignal.timeout(request.timeout) : undefined
    })
    logResponse(request.method, url, response.status)
  } catch (error) {
    logFailure(request.method, url, error)
    throw error
  }
  if (response.status === 401 && !request.path.startsWith('/auth/')) {
    const freshToken = await refreshAccessToken()
    return sendOnce(request, freshToken)
  }
  return parseResponse(response, request.responseType)
}

async function sendOnce(request: ApiRequest, accessToken: string): Promise<DesktopApiResponse> {
  const response = await fetch(buildUrl(request.path, request.query), {
    method: request.method,
    headers: requestHeaders(request, accessToken),
    body: request.body === undefined ? undefined : JSON.stringify(request.body),
    signal: request.timeout ? AbortSignal.timeout(request.timeout) : undefined
  })
  return parseResponse(response, request.responseType)
}

async function sendImageUpload(
  path: '/files/upload',
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
  path: '/files/upload',
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

export async function requestDineHubTransport(request: ApiRequest): Promise<DesktopApiResponse> {
  assertRequest(request)
  const result = await send(request, getAccessToken())
  const payload = result.data
  const tokens = (payload as { data?: { tokens?: { accessToken?: string; refreshToken?: string } } }).data?.tokens
  if (tokens?.accessToken && tokens.refreshToken) setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
  return result
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
  const payload = await sendImageUpload('/files/upload', file, getAccessToken(), onProgress)
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
  hasSession: () => Boolean(getAccessToken() && getRefreshToken()),
  clear: clearTokens
}

import axios, { type AxiosAdapter, type AxiosResponse } from 'axios'
import { ApiError, type ApiErrorBody, type ApiResponse } from './types/common'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://dininghub.in/api/v1'

type AuthEventCallback = () => void
const authEventListeners = new Set<AuthEventCallback>()

export function onAuthExpired(callback: AuthEventCallback) {
  authEventListeners.add(callback)
  return () => authEventListeners.delete(callback)
}

function notifyAuthExpired(): void {
  authEventListeners.forEach((callback) => callback())
}

function getElectronAPI() {
  return typeof window !== 'undefined' ? window.electronAPI : undefined
}

// Session metadata is available to the renderer; credentials are deliberately not.
export const tokenBridge = {
  hasSession: async (): Promise<boolean> => (await getElectronAPI()?.hasSession()) ?? false,
  getCachedUser: async (): Promise<Record<string, unknown> | null> =>
    (await getElectronAPI()?.getCachedUser()) ?? null,
  clearTokens: async (): Promise<void> => { await getElectronAPI()?.clearTokens() },
  getTenantSlug: async (): Promise<string | null> => (await getElectronAPI()?.getTenantSlug()) ?? null,
  setTenantSlug: async (slug: string): Promise<void> => { await getElectronAPI()?.setTenantSlug(slug) },
  getDeviceId: async (): Promise<string> => (await getElectronAPI()?.getDeviceId()) ?? 'dev-browser-id'
}

interface BridgeResult {
  ok: boolean
  response?: {
    status: number
    headers: Record<string, string>
    data: unknown
  }
  /** Compatibility with focused renderer tests and pre-upgrade main processes. */
  payload?: unknown
  error?: ApiErrorBody
}

const electronAdapter: AxiosAdapter = async (config) => {
  const bridge = getElectronAPI()
  if (!bridge) {
    throw new ApiError({ success: false, statusCode: 0, message: 'DiningHub desktop bridge is unavailable' })
  }
  let rawData = config.data
  if (typeof config.data === 'string') {
    try { rawData = JSON.parse(config.data) } catch { rawData = config.data }
  }
  const responseType = config.responseType === 'arraybuffer' || config.responseType === 'blob'
    ? 'arraybuffer'
    : config.responseType === 'text' ? 'text' : undefined
  const forwardedHeaders = config.headers ? Object.fromEntries(
    Object.entries(config.headers).filter(([key, value]) =>
      typeof value === 'string' &&
      !['accept', 'content-type'].includes(key.toLowerCase())
    )
  ) : undefined
  const result = await bridge.requestDineHub({
    method: (config.method?.toUpperCase() || 'GET') as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: config.url || '/',
    query: config.params as Record<string, string | number | boolean | undefined> | undefined,
    body: rawData,
    ...(Object.keys(forwardedHeaders ?? {}).length ? { headers: forwardedHeaders } : {}),
    ...(responseType ? { responseType } : {}),
    // Always send a timeout — omitting the Axios default (30000) left Electron
    // fetches hanging forever and every page stuck on "Loading…".
    timeout: typeof config.timeout === 'number' && config.timeout > 0 ? config.timeout : 20_000,
  }) as BridgeResult
  if (!result.ok) {
    const error = new ApiError({
      success: false,
      statusCode: result.error?.statusCode ?? 0,
      message: result.error?.message ?? 'Request failed',
      errors: result.error?.errors,
      path: result.error?.path
    })
    // Do not force logout from API errors — session ends only via Sign Out.
    throw error
  }
  const response = result.response ?? (Object.prototype.hasOwnProperty.call(result, 'payload') ? {
    status: 200,
    headers: {},
    data: result.payload
  } : undefined)
  if (!response) throw new ApiError({ success: false, statusCode: 0, message: 'Invalid response from desktop bridge' })
  const data = config.responseType === 'blob'
    ? new Blob([response.data as Uint8Array], { type: response.headers['content-type'] || 'application/octet-stream' })
    : config.responseType === 'arraybuffer'
      ? (response.data as Uint8Array).buffer
      : response.data
  return {
    data,
    status: response.status,
    statusText: String(response.status),
    headers: response.headers,
    config
  } satisfies AxiosResponse
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  adapter: electronAdapter
})

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise
  if (!data.success) throw new ApiError({ success: false, statusCode: 400, message: data.message })
  return data.data
}

export async function unwrapPaginated<T>(promise: Promise<{ data: ApiResponse<T[]> }>) {
  const { data } = await promise
  if (!data.success) throw new ApiError({ success: false, statusCode: 400, message: data.message })
  return { data: data.data, meta: data.meta }
}

export async function checkOnline(): Promise<boolean> {
  try {
    await apiClient.get('/tenants/plans')
    return true
  } catch (error) {
    // Any HTTP response (even 401/403/5xx) means the API host is reachable.
    // statusCode 0 = no response / network failure → offline.
    if (error instanceof ApiError) {
      return error.statusCode > 0
    }
    return false
  }
}

export default apiClient

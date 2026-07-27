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
  clearTokens: async (): Promise<void> => { await getElectronAPI()?.clearTokens() },
  getTenantSlug: async (): Promise<string | null> => (await getElectronAPI()?.getTenantSlug()) ?? null,
  setTenantSlug: async (slug: string): Promise<void> => { await getElectronAPI()?.setTenantSlug(slug) },
  getDeviceId: async (): Promise<string> => (await getElectronAPI()?.getDeviceId()) ?? 'dev-browser-id'
}

interface BridgeResult {
  ok: boolean
  payload?: unknown
  error?: ApiErrorBody
}

const electronAdapter: AxiosAdapter = async (config) => {
  const bridge = getElectronAPI()
  if (!bridge) {
    throw new ApiError({ success: false, statusCode: 0, message: 'DineHub desktop bridge is unavailable' })
  }
  const rawData = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
  const result = await bridge.requestDineHub({
    method: (config.method?.toUpperCase() || 'GET') as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: config.url || '/',
    query: config.params as Record<string, string | number | boolean | undefined> | undefined,
    body: rawData
  }) as BridgeResult
  if (!result.ok) {
    const error = new ApiError({
      success: false,
      statusCode: result.error?.statusCode ?? 0,
      message: result.error?.message ?? 'Request failed',
      errors: result.error?.errors,
      path: result.error?.path
    })
    if (error.statusCode === 401) notifyAuthExpired()
    throw error
  }
  return {
    data: result.payload,
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  } satisfies AxiosResponse
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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
    // Any HTTP response proves that the API host is reachable. Authentication,
    // permissions, or a server error must not be reported as a network outage.
    return error instanceof ApiError && error.statusCode > 0
  }
}

export default apiClient

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { ApiError, type ApiErrorBody, type ApiResponse } from './types/common'
import type { RefreshResponse } from './types/auth.types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

// In-memory fallback when running outside Electron (e.g. vite-only preview)
const memoryStore = {
  accessToken: null as string | null,
  refreshToken: null as string | null,
  tenantSlug: null as string | null,
  deviceId: 'dev-browser-id'
}

async function getElectronAPI() {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI
  }
  return null
}

export const tokenBridge = {
  async getAccessToken(): Promise<string | null> {
    const api = await getElectronAPI()
    return api ? api.getToken() : memoryStore.accessToken
  },
  async getRefreshToken(): Promise<string | null> {
    const api = await getElectronAPI()
    return api ? api.getRefreshToken() : memoryStore.refreshToken
  },
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    const api = await getElectronAPI()
    if (api) await api.setTokens({ accessToken, refreshToken })
    else {
      memoryStore.accessToken = accessToken
      memoryStore.refreshToken = refreshToken
    }
  },
  async clearTokens(): Promise<void> {
    const api = await getElectronAPI()
    if (api) await api.clearTokens()
    else {
      memoryStore.accessToken = null
      memoryStore.refreshToken = null
    }
  },
  async getTenantSlug(): Promise<string | null> {
    const api = await getElectronAPI()
    return api ? api.getTenantSlug() : memoryStore.tenantSlug
  },
  async setTenantSlug(slug: string): Promise<void> {
    const api = await getElectronAPI()
    if (api) await api.setTenantSlug(slug)
    else memoryStore.tenantSlug = slug
  },
  async getDeviceId(): Promise<string> {
    const api = await getElectronAPI()
    return api ? api.getDeviceId() : memoryStore.deviceId
  }
}

let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else if (token) resolve(token)
  })
  refreshQueue = []
}

type AuthEventCallback = () => void
const authEventListeners: AuthEventCallback[] = []

export function onAuthExpired(callback: AuthEventCallback) {
  authEventListeners.push(callback)
  return () => {
    const idx = authEventListeners.indexOf(callback)
    if (idx >= 0) authEventListeners.splice(idx, 1)
  }
}

function notifyAuthExpired() {
  authEventListeners.forEach((cb) => cb())
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenBridge.getAccessToken()
  const tenantSlug = await tokenBridge.getTenantSlug()

  if (token) config.headers.Authorization = `Bearer ${token}`
  if (tenantSlug) config.headers['X-Tenant-Slug'] = tenantSlug

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh')

      if (isAuthEndpoint) return Promise.reject(parseApiError(error))

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(apiClient(originalRequest))
            },
            reject
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = await tokenBridge.getRefreshToken()
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post<ApiResponse<RefreshResponse>>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken }
        )

        const { accessToken, refreshToken: newRefresh } = data.data.tokens
        await tokenBridge.setTokens(accessToken, newRefresh)

        processQueue(null, accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        await tokenBridge.clearTokens()
        notifyAuthExpired()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    const apiError = parseApiError(error)
    logApiError(apiError)
    return Promise.reject(apiError)
  }
)

function parseApiError(error: AxiosError<ApiErrorBody>): ApiError {
  if (error.response?.data) {
    return new ApiError({
      success: false,
      statusCode: error.response.status,
      message: error.response.data.message || 'Request failed',
      errors: error.response.data.errors,
      path: error.response.data.path,
      timestamp: error.response.data.timestamp
    })
  }
  return new ApiError({
    success: false,
    statusCode: error.response?.status || 0,
    message: error.message || 'Network error'
  })
}

async function logApiError(error: ApiError) {
  const api = await getElectronAPI()
  if (api?.onApiError) {
    // fire-and-forget to main process log
    window.electronAPI?.notify?.show?.('API Error', error.message)
  }
  console.error('[API]', error.statusCode, error.path, error.message)
}

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
  if (!navigator.onLine) return false
  try {
    await axios.get(`${API_BASE_URL}/tenants/plans`, { timeout: 5000 })
    return true
  } catch {
    return false
  }
}

export default apiClient

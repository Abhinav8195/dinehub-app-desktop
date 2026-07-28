import { ApiError } from './types/common'

const API_URL = import.meta.env.VITE_API_URL || ''
const API_ORIGIN = (() => { try { return new URL(API_URL).origin } catch { return '' } })()
const DECIMAL_KEYS = new Set([
  'quantity','openingQuantity','minStock','maxStock','reorderQuantity','costPerUnit','stockValue',
  'quantityBefore','quantityChange','quantityAfter','unitCost','totalValue','total','receivedQuantity',
])

export function normalizeApiData<T>(value: T): T {
  if (Array.isArray(value)) return value.map(normalizeApiData) as T
  if (!value || typeof value !== 'object') return value
  const output: { [key: string]: unknown } = {}
  for (const [key, item] of Object.entries(value)) {
    if (DECIMAL_KEYS.has(key) && typeof item === 'string' && item.trim() !== '' && Number.isFinite(Number(item))) output[key] = Number(item)
    else if ((key.endsWith('Url') || key.endsWith('URL')) && typeof item === 'string' && item.startsWith('/') && API_ORIGIN) output[key] = new URL(item, API_ORIGIN).toString()
    else output[key] = normalizeApiData(item)
  }
  return output as T
}

export interface BackendErrorView { message: string; fieldErrors: { [field: string]: string }; statusCode: number }
export function mapBackendError(error: unknown): BackendErrorView {
  if (!(error instanceof ApiError)) return { message: navigator.onLine ? 'Something went wrong. Please try again.' : 'You are offline. Check your connection and retry.', fieldErrors: {}, statusCode: 0 }
  const defaults: { [status: number]: string } = {
    400: 'Please review the submitted information.', 401: 'Your session expired. Please sign in again.',
    403: 'You do not have permission to perform this action.', 404: 'The requested record no longer exists.',
    409: 'This change conflicts with an existing record.', 422: 'Some fields need your attention.',
    429: 'Too many requests. Please wait and retry.', 500: 'The server could not complete the request.',
  }
  const fieldErrors: { [field: string]: string } = {}
  if (error.errors && !Array.isArray(error.errors)) for (const [field, messages] of Object.entries(error.errors)) fieldErrors[field] = messages.join(', ')
  return { message: error.message || defaults[error.statusCode] || 'Unable to complete the request.', fieldErrors, statusCode: error.statusCode }
}

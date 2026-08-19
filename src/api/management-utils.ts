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

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  password: 'Password',
  userType: 'Role',
  roleIds: 'Permissions role',
  name: 'Name',
  customerName: 'Customer name',
  customerPhone: 'Phone',
  timeSlot: 'Time',
}

function humanField(field: string) {
  return FIELD_LABELS[field] || field.replace(/([A-Z])/g, ' $1').replace(/[_.]/g, ' ').trim()
}

/** Plain-language API error for toasts and forms. */
export function formatApiError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const view = mapBackendError(error)
  const fieldParts = Object.entries(view.fieldErrors).map(([field, message]) => `${humanField(field)}: ${message}`)
  if (fieldParts.length) return fieldParts.join(' · ')
  if (view.message && !/^validation failed$/i.test(view.message.trim())) return view.message
  return fallback
}

export function mapBackendError(error: unknown): BackendErrorView {
  if (!(error instanceof ApiError)) {
    if (error instanceof Error && error.message.trim()) {
      return { message: error.message, fieldErrors: {}, statusCode: 0 }
    }
    return { message: navigator.onLine ? 'Something went wrong. Please try again.' : 'You are offline. Check your connection and retry.', fieldErrors: {}, statusCode: 0 }
  }
  const defaults: { [status: number]: string } = {
    400: 'Please check the details you entered and try again.',
    401: 'Your session expired. Please sign in again.',
    403: 'You do not have permission for this action. Ask an owner or admin.',
    404: 'This record was not found. It may have been deleted.',
    409: 'This conflicts with an existing record (for example a duplicate phone or email).',
    422: 'Some fields need fixing before we can save.',
    429: 'Too many attempts. Please wait a moment and try again.',
    500: 'Server error. Please try again in a moment.',
  }
  const fieldErrors: { [field: string]: string } = {}
  if (error.errors && !Array.isArray(error.errors)) {
    for (const [field, messages] of Object.entries(error.errors)) fieldErrors[field] = messages.join(', ')
  }
  let message = error.message || defaults[error.statusCode] || 'Unable to complete the request.'
  if (Array.isArray(error.errors) && error.errors.length) {
    message = error.errors.map(String).join(' · ')
  } else if (Object.keys(fieldErrors).length && /^validation failed$/i.test(message.trim())) {
    message = Object.entries(fieldErrors).map(([field, text]) => `${humanField(field)}: ${text}`).join(' · ')
  } else if (/^(validation failed|forbidden|unauthorized|bad request|internal server error)$/i.test(message.trim())) {
    message = defaults[error.statusCode] || 'Please check the form fields and try again.'
  }
  return { message, fieldErrors, statusCode: error.statusCode }
}

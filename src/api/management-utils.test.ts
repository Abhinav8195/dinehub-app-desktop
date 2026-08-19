import { describe, expect, it } from 'vitest'
import { ApiError } from './types/common'
import { formatApiError, mapBackendError } from './management-utils'

describe('formatApiError', () => {
  it('explains validation field errors in plain language', () => {
    const error = new ApiError({
      success: false,
      statusCode: 422,
      message: 'Validation failed',
      errors: { email: ['must be an email'], phone: ['too short'] },
    })
    expect(formatApiError(error)).toContain('Email')
    expect(formatApiError(error)).toContain('Phone')
  })

  it('passes through simple Error messages', () => {
    expect(formatApiError(new Error('Phone number looks too short. Enter at least 5 digits.')))
      .toBe('Phone number looks too short. Enter at least 5 digits.')
  })

  it('maps 403 to permission guidance', () => {
    const view = mapBackendError(new ApiError({ success: false, statusCode: 403, message: 'Forbidden' }))
    expect(view.message.toLowerCase()).toContain('permission')
  })
})

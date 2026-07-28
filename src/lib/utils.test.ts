import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatRelativeTime, formatTime } from './utils'

describe('date formatting utilities', () => {
  it.each([undefined, null, '', 'not-a-date'])(
    'returns a placeholder for invalid input: %s',
    (value) => {
      expect(formatDate(value)).toBe('—')
      expect(formatTime(value)).toBe('—')
      expect(formatDateTime(value)).toBe('—')
      expect(formatRelativeTime(value)).toBe('—')
    }
  )

  it('formats a valid timestamp', () => {
    const value = '2026-07-02T14:00:00Z'

    expect(formatDate(value)).not.toBe('—')
    expect(formatTime(value)).not.toBe('—')
    expect(formatDateTime(value)).not.toBe('—')
  })
})

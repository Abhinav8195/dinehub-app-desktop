import { beforeEach, describe, expect, it, vi } from 'vitest'

const credentials = vi.hoisted(() => ({
  accessToken: null as string | null,
  refreshToken: null as string | null,
  tenantSlug: 'pizza-place'
}))

const setTokens = vi.hoisted(() => vi.fn((tokens: { accessToken: string; refreshToken: string }) => {
  credentials.accessToken = tokens.accessToken
  credentials.refreshToken = tokens.refreshToken
}))
const clearTokens = vi.hoisted(() => vi.fn(() => {
  credentials.accessToken = null
  credentials.refreshToken = null
}))

vi.mock('../store/secureStore', () => ({
  getAccessToken: () => credentials.accessToken,
  getRefreshToken: () => credentials.refreshToken,
  getTenantSlug: () => credentials.tenantSlug,
  setTenantSlug: (slug: string) => { credentials.tenantSlug = slug },
  setTokens,
  clearTokens
}))

import { requestDineHub, uploadMenuImage } from './dinehubClient'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' }
})

describe('main-process DineHub client', () => {
  beforeEach(() => {
    setTokens.mockClear()
    clearTokens.mockClear()
    credentials.accessToken = 'access-old'
    credentials.refreshToken = 'refresh-old'
    credentials.tenantSlug = 'pizza-place'
    vi.stubGlobal('fetch', vi.fn())
  })

  it('attaches JSON, bearer, and tenant headers', async () => {
    vi.mocked(fetch).mockResolvedValue(json({ success: true, data: [] }))
    await requestDineHub({ method: 'GET', path: '/menu/categories' })
    const init = vi.mocked(fetch).mock.calls[0][1]
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer access-old')
    expect(new Headers(init?.headers).get('X-Tenant-Slug')).toBe('pizza-place')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
  })

  it('stores login tokens and sends the required device payload', async () => {
    vi.mocked(fetch).mockResolvedValue(json({
      success: true,
      data: { user: { id: 'u1' }, tokens: { accessToken: 'a1', refreshToken: 'r1', expiresIn: 3600, tokenType: 'Bearer' } }
    }))
    const body = {
      email: 'owner@example.com', password: 'secret', tenantSlug: 'cafe',
      deviceName: 'DineHub Desktop', deviceType: 'electron-desktop', deviceId: 'device-1'
    } as const
    await requestDineHub({ method: 'POST', path: '/auth/login', body })
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toEqual(body)
    expect(setTokens).toHaveBeenCalledWith({ accessToken: 'a1', refreshToken: 'r1' })
  })

  it('refreshes once for simultaneous 401s and retries both requests', async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/auth/refresh')) return json({ success: true, data: { tokens: { accessToken: 'fresh', refreshToken: 'fresh-r' } } })
      if (new Headers(init?.headers).get('Authorization') === 'Bearer access-old') return json({ message: 'Expired' }, 401)
      return json({ success: true, data: [] })
    })
    await Promise.all([
      requestDineHub({ method: 'GET', path: '/menu/categories' }),
      requestDineHub({ method: 'GET', path: '/menu/items' })
    ])
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1)
    expect(setTokens).toHaveBeenCalledWith({ accessToken: 'fresh', refreshToken: 'fresh-r' })
  })

  it('clears the session when refresh fails', async () => {
    vi.mocked(fetch).mockImplementation(async (input) =>
      String(input).endsWith('/auth/refresh') ? json({ message: 'Refresh expired' }, 401) : json({ message: 'Expired' }, 401)
    )
    await expect(requestDineHub({ method: 'GET', path: '/menu/items' })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Refresh expired'
    })
    expect(clearTokens).toHaveBeenCalled()
  })

  it('keeps the session when token refresh has a temporary server failure', async () => {
    vi.mocked(fetch).mockImplementation(async (input) =>
      String(input).endsWith('/auth/refresh')
        ? json({ message: 'Service temporarily unavailable' }, 503)
        : json({ message: 'Expired access token' }, 401)
    )
    await expect(requestDineHub({ method: 'GET', path: '/menu/items' })).rejects.toMatchObject({
      statusCode: 503,
      message: 'Service temporarily unavailable'
    })
    expect(clearTokens).not.toHaveBeenCalled()
    expect(credentials.refreshToken).toBe('refresh-old')
  })

  it('normalizes validation errors', async () => {
    vi.mocked(fetch).mockResolvedValue(json({
      message: 'Validation failed',
      errors: { price: ['Price must be at least zero'] },
      path: '/api/v1/menu/items'
    }, 422))
    await expect(requestDineHub({ method: 'POST', path: '/menu/items', body: {} })).rejects.toMatchObject({
      statusCode: 422,
      message: 'Validation failed',
      errors: { price: ['Price must be at least zero'] }
    })
  })

  it('uploads menu images through the files endpoint without manually setting Content-Type', async () => {
    vi.mocked(fetch).mockResolvedValue(json({ success: true, data: { imageUrl: '/uploads/menu/pizza.png' } }))
    const progress = vi.fn()
    await uploadMenuImage('item', {
      name: 'pizza.png',
      mimeType: 'image/png',
      size: 4,
      base64: Buffer.from('test').toString('base64')
    }, progress)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/files/upload')
    expect(new Headers(init?.headers).has('Content-Type')).toBe(false)
    expect(init?.body).toBeInstanceOf(FormData)
    expect(progress).toHaveBeenLastCalledWith(100)
  })

  it('rejects oversized images before uploading', async () => {
    await expect(uploadMenuImage('category', {
      name: 'large.jpg',
      mimeType: 'image/jpeg',
      size: 1024 * 1024 + 1,
      base64: ''
    }, vi.fn())).rejects.toMatchObject({ message: 'Image must be 1 MB or smaller' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('allows combo images up to 5 MB and normalizes the returned file URL', async () => {
    vi.mocked(fetch).mockResolvedValue(json({ success: true, data: { url: '/uploads/menu/combo.jpg' } }))
    const result = await uploadMenuImage('combo', {
      name: 'combo.jpg',
      mimeType: 'image/jpeg',
      size: 2 * 1024 * 1024,
      base64: Buffer.from('combo').toString('base64')
    }, vi.fn())
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/files/upload')
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).has('Content-Type')).toBe(false)
    expect(result).toMatchObject({ data: { imageUrl: '/uploads/menu/combo.jpg' } })
  })

  it('reports a clear error when an upload response has no file URL', async () => {
    vi.mocked(fetch).mockResolvedValue(json({ success: true, data: {} }))
    await expect(uploadMenuImage('item', {
      name: 'pizza.png',
      mimeType: 'image/png',
      size: 4,
      base64: Buffer.from('test').toString('base64')
    }, vi.fn())).rejects.toMatchObject({
      statusCode: 502,
      message: 'The image was uploaded, but the server did not return its URL.'
    })
  })
})

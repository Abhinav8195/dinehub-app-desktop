import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from './client'
import { combosApi, modifiersApi } from './catalog.api'

vi.mock('./client', async () => {
  const actual = await vi.importActual<typeof import('./client')>('./client')
  return {
    ...actual,
    default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    unwrap: async (promise: Promise<{ data: { data: unknown } }>) => (await promise).data.data
  }
})

const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } })

describe('catalog APIs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses all modifier endpoints including detach', async () => {
    vi.mocked(apiClient.get).mockReturnValue(ok([]) as never)
    vi.mocked(apiClient.post).mockReturnValue(ok({}) as never)
    vi.mocked(apiClient.patch).mockReturnValue(ok({}) as never)
    vi.mocked(apiClient.delete).mockReturnValue(ok(null) as never)
    await modifiersApi.listGroups()
    await modifiersApi.getGroup('g1')
    await modifiersApi.createGroup({ name: 'Size', minSelect: 1, maxSelect: 1, required: true, isActive: true })
    await modifiersApi.updateGroup('g1', { isActive: false })
    await modifiersApi.createOption('g1', { name: 'Large', price: 50, isDefault: false, isActive: true, sortOrder: 1 })
    await modifiersApi.updateOption('o1', { price: 60 })
    await modifiersApi.attachToMenuItem('g1', 'm1')
    await modifiersApi.detachFromMenuItem('g1', 'm1')
    await modifiersApi.deleteOption('o1')
    await modifiersApi.deleteGroup('g1')
    expect(apiClient.delete).toHaveBeenCalledWith('/modifiers/groups/g1/menu-items/m1')
  })

  it('requests all combos for management and supports CRUD', async () => {
    vi.mocked(apiClient.get).mockReturnValue(ok([]) as never)
    vi.mocked(apiClient.post).mockReturnValue(ok({}) as never)
    vi.mocked(apiClient.patch).mockReturnValue(ok({}) as never)
    vi.mocked(apiClient.delete).mockReturnValue(ok(null) as never)
    const body = { name: 'Meal', price: 399, isActive: true, items: [{ menuItemId: 'm1', quantity: 1 }] }
    await combosApi.list(true)
    await combosApi.get('c1')
    await combosApi.create(body)
    await combosApi.update('c1', { price: 350 })
    await combosApi.delete('c1')
    expect(apiClient.get).toHaveBeenCalledWith('/combos', { params: { all: true } })
  })
})

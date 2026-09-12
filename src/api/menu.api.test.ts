import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './types/common'

const requestDineHub = vi.fn()

vi.stubGlobal('window', {
  electronAPI: {
    requestDineHub,
    hasSession: vi.fn(),
    clearTokens: vi.fn(),
    getTenantSlug: vi.fn(),
    setTenantSlug: vi.fn(),
    getDeviceId: vi.fn()
  }
})

import { categoryService, menuItemService } from './menu.api'

const ok = (data: unknown) => ({ ok: true, payload: { success: true, message: 'OK', data } })
const category = { id: 'c1', name: 'Pizza', icon: null, imageUrl: null, sortOrder: 1, isActive: true, count: 2 }
const item = { id: 'i1', name: 'Margherita', description: null, price: 12, categoryId: 'c1', category: 'Pizza', imageUrl: null, available: true, popular: false }

describe('menu services', () => {
  beforeEach(() => requestDineHub.mockReset())

  it('supports category CRUD and all=true', async () => {
    requestDineHub.mockResolvedValueOnce(ok([category])).mockResolvedValueOnce(ok(category))
      .mockResolvedValueOnce(ok(category)).mockResolvedValueOnce(ok(null))
    await expect(categoryService.list(true)).resolves.toEqual([category])
    await categoryService.create({ name: 'Pizza' })
    await categoryService.update('c1', { isActive: false })
    await categoryService.delete('c1')
    expect(requestDineHub.mock.calls.map(([request]) => request)).toMatchObject([
      { method: 'GET', path: '/menu/categories', query: { all: true } },
      { method: 'POST', path: '/menu/categories', body: { name: 'Pizza' } },
      { method: 'PUT', path: '/menu/categories/c1', body: { isActive: false } },
      { method: 'DELETE', path: '/menu/categories/c1' }
    ])
  })

  it('supports item CRUD, detail, filters, and response-field mapping', async () => {
    requestDineHub.mockResolvedValueOnce(ok([item])).mockResolvedValueOnce(ok(item))
      .mockResolvedValueOnce(ok(item)).mockResolvedValueOnce(ok({ ...item, available: false, popular: true }))
      .mockResolvedValueOnce(ok(null))
    await expect(menuItemService.list('c1', true)).resolves.toEqual([{ ...item, isVegetarian: null, dietary: null, modifierGroups: [], recipeLines: [] }])
    await menuItemService.get('i1')
    await menuItemService.create({ categoryId: 'c1', name: 'Margherita', price: 12, isAvailable: true, isPopular: false })
    const updated = await menuItemService.update('i1', { isAvailable: false, isPopular: true })
    await menuItemService.delete('i1')
    expect(updated).toMatchObject({ available: false, popular: true })
    expect(requestDineHub.mock.calls[2][0].body).toMatchObject({ isAvailable: true, isPopular: false })
    expect(requestDineHub.mock.calls[3][0].body).toMatchObject({ isAvailable: false, isPopular: true })
  })

  it('maps vegetarian flag from isVegetarian or dietary', async () => {
    requestDineHub
      .mockResolvedValueOnce(ok([{ ...item, isVegetarian: true }]))
      .mockResolvedValueOnce(ok([{ ...item, dietary: 'nonveg' }]))
    await expect(menuItemService.list(undefined, true)).resolves.toEqual([
      expect.objectContaining({ isVegetarian: true, dietary: 'veg', modifierGroups: [] }),
    ])
    await expect(menuItemService.list(undefined, true)).resolves.toEqual([
      expect.objectContaining({ isVegetarian: false, dietary: 'nonveg', modifierGroups: [] }),
    ])
  })

  it('sends isVegetarian on create/update', async () => {
    requestDineHub.mockResolvedValue(ok({ ...item, isVegetarian: false, dietary: 'nonveg' }))
    await menuItemService.create({
      categoryId: 'c1',
      name: 'Chicken',
      price: 20,
      isAvailable: true,
      isPopular: false,
      isVegetarian: false,
    })
    await menuItemService.update('i1', { isVegetarian: true })
    expect(requestDineHub.mock.calls[0][0].body).toMatchObject({ isVegetarian: false })
    expect(requestDineHub.mock.calls[1][0].body).toMatchObject({ isVegetarian: true })
  })

  it('sends bulk availability changes', async () => {
    requestDineHub.mockResolvedValue(ok(null))
    await menuItemService.bulkToggle({ ids: ['i1', 'i2'], isAvailable: false })
    expect(requestDineHub).toHaveBeenCalledWith(expect.objectContaining({
      method: 'PATCH',
      path: '/menu/items/bulk-toggle',
      body: { ids: ['i1', 'i2'], isAvailable: false }
    }))
  })

  it('surfaces normalized API errors', async () => {
    requestDineHub.mockResolvedValue({
      ok: false,
      error: { statusCode: 409, message: 'Category contains menu items', errors: { category: ['Remove items first'] } }
    })
    await expect(categoryService.delete('c1')).rejects.toEqual(expect.objectContaining<ApiError>({
      statusCode: 409,
      message: 'Category contains menu items'
    }))
  })
})

import { describe, expect, it } from 'vitest'
import { LayoutDashboard } from 'lucide-react'
import { filterNavigation } from './navigation-access'
import { getFeatureRouteDecision } from '@/guards/FeatureRouteGuard'
import { featureEnabled, reportsFeatureAvailable, toRestaurantFeatureMap } from '@/types/restaurant-features'
import type { NavItem } from '@/constants/navigation'
import { useAuthStore } from '@/store/authStore'
import { canAccessNav } from './permissions'

const item = (
  id: string,
  feature: NavItem['feature'],
  children?: NavItem[]
): NavItem => ({
  id,
  title: id,
  href: `/app/${id}`,
  icon: LayoutDashboard,
  feature,
  children
})

describe('restaurant feature access', () => {
  it('converts backend flags and treats missing flags as disabled', () => {
    const map = toRestaurantFeatureMap([
      { key: 'POS', enabled: true },
      { key: 'ACCOUNTING', enabled: false },
      { key: 'UNKNOWN', enabled: true }
    ])
    expect(featureEnabled(map, 'POS')).toBe(true)
    expect(featureEnabled(map, 'ACCOUNTING')).toBe(false)
    expect(featureEnabled(map, 'REPORTS')).toBe(false)
  })

  it('keeps KOT on when Kitchen Display is enabled even if KOT_KITCHEN row is false', () => {
    const map = toRestaurantFeatureMap([
      { key: 'KOT_KITCHEN', enabled: false },
      { key: 'KITCHEN_DISPLAY', enabled: true },
    ])
    expect(featureEnabled(map, 'KOT_KITCHEN')).toBe(true)
  })

  it('keeps KOT on when KOT_KITCHEN is enabled before a false Kitchen Display row', () => {
    const map = toRestaurantFeatureMap([
      { key: 'KOT_KITCHEN', enabled: true },
      { key: 'KITCHEN_DISPLAY', enabled: false },
    ])
    expect(featureEnabled(map, 'KOT_KITCHEN')).toBe(true)
  })

  it('unlocks reports when core restaurant modules are enabled', () => {
    const map = toRestaurantFeatureMap([
      { key: 'KOT_KITCHEN', enabled: true },
      { key: 'REPORTS', enabled: false },
    ])
    expect(reportsFeatureAvailable(map)).toBe(true)
  })

  it('shows enabled items and hides disabled items', () => {
    const visible = filterNavigation([
      item('pos', 'POS'),
      item('reports', 'REPORTS')
    ], {
      canPermission: () => true,
      hasFeature: (feature) => feature === 'POS'
    })
    expect(visible.map(({ id }) => id)).toEqual(['pos'])
  })

  it('hides empty groups and retains only enabled children in partial groups', () => {
    const group = item('menu', 'MENU_MANAGEMENT', [
      item('categories', 'MENU_CATEGORIES'),
      item('combos', 'COMBOS')
    ])
    const partial = filterNavigation([group], {
      canPermission: () => true,
      hasFeature: (feature) => feature === 'MENU_CATEGORIES'
    })
    expect(partial[0]?.children?.map(({ id }) => id)).toEqual(['categories'])

    const empty = filterNavigation([group], {
      canPermission: () => true,
      hasFeature: () => false
    })
    expect(empty).toEqual([])
  })

  it('requires both feature access and permission before loading a route', () => {
    expect(getFeatureRouteDecision(false, true, true)).toBe('allow')
    expect(getFeatureRouteDecision(false, true, false)).toBe('redirect')
    expect(getFeatureRouteDecision(false, false, true)).toBe('redirect')
  })

  it('does not render restricted content while flags are loading', () => {
    expect(getFeatureRouteDecision(true, true, true)).toBe('loading')
  })

  it('keeps sidebar access aligned when the profile omits expanded permissions', () => {
    expect(canAccessNav('pos.access', [], ['user'], false)).toBe(true)
  })

  it('allows only an explicit super-admin bypass', () => {
    expect(featureEnabled({}, 'POS', true)).toBe(true)
    expect(featureEnabled({}, 'POS', false)).toBe(false)
  })

  it('clears restaurant features during logout', async () => {
    useAuthStore.setState({
      features: { POS: true },
      featuresStatus: 'ready',
      isAuthenticated: true
    })
    await useAuthStore.getState().logout()
    expect(useAuthStore.getState().features).toEqual({})
    expect(useAuthStore.getState().featuresStatus).toBe('idle')
  })
})

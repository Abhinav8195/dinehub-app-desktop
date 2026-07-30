import { describe, expect, it } from 'vitest'
import type { TenantSubscription } from '@/api/types/billing.types'
import { canUseFeature, hasFeature, isSubscriptionActive } from './entitlements'
import { filterNavigation } from './navigation-access'
import type { NavItem } from '@/constants/navigation'
import { getFeatureRouteDecision } from '@/guards/FeatureRouteGuard'
import { LayoutDashboard } from 'lucide-react'

const subscription = (status: string, features: string[]): TenantSubscription => ({
  status,
  plan: { id: 'plan-1', name: 'Backend Plan', features }
})

const nav = (id: string, feature: NavItem['feature']): NavItem => ({
  id, title: id, href: `/app/${id}`, icon: LayoutDashboard, feature
})

describe('plan entitlements', () => {
  it('shows only active-plan features', () => {
    const current = subscription('active', ['pos', 'orders'])
    expect(hasFeature(current, 'pos')).toBe(true)
    expect(hasFeature(current, 'analytics')).toBe(false)
  })

  it('hides unavailable sidebar items', () => {
    const current = subscription('active', ['pos'])
    const visible = filterNavigation([nav('pos', 'POS'), nav('analytics', 'ANALYTICS')], {
      canPermission: () => true,
      hasFeature: (feature) => feature === 'POS' && hasFeature(current, 'pos')
    })
    expect(visible.map((item) => item.id)).toEqual(['pos'])
  })

  it('redirects direct access to a restricted route', () => {
    expect(getFeatureRouteDecision(false, false, true)).toBe('redirect')
  })

  it('allows superadmins to bypass feature and permission restrictions', () => {
    expect(hasFeature(null, 'analytics', true)).toBe(true)
    expect(getFeatureRouteDecision(false, true, true)).toBe('allow')
  })

  it.each(['expired', 'cancelled', 'canceled'])('denies %s subscriptions', (status) => {
    const current = subscription(status, ['pos'])
    expect(isSubscriptionActive(current)).toBe(false)
    expect(hasFeature(current, 'pos')).toBe(false)
  })

  it('denies a missing subscription safely', () => {
    expect(hasFeature(null, 'pos')).toBe(false)
  })

  it('requires both permission and entitlement', () => {
    const current = subscription('active', ['reports_export'])
    expect(canUseFeature(true, current, 'reports_export')).toBe(true)
    expect(canUseFeature(false, current, 'reports_export')).toBe(false)
    expect(canUseFeature(true, current, 'analytics')).toBe(false)
  })
})

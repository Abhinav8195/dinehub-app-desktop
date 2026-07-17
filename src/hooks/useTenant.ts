import { useTenantStore } from '@/store/tenantStore'

export function useTenant() {
  const slug = useTenantStore((s) => s.slug)
  const branding = useTenantStore((s) => s.branding)
  const isResolving = useTenantStore((s) => s.isResolving)
  const setSlug = useTenantStore((s) => s.setSlug)
  const resolveBranding = useTenantStore((s) => s.resolveBranding)
  const clear = useTenantStore((s) => s.clear)

  return { slug, branding, isResolving, setSlug, resolveBranding, clear }
}

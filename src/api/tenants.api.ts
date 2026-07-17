import apiClient, { unwrap, unwrapPaginated } from './client'
import type { ApiResponse } from './types/common'
import type {
  Tenant, TenantBranding, TenantPlan, CreateTenantRequest, UpdateTenantRequest,
  SubscribeRequest, FeatureFlag, TenantDomain, TenantUsage, TenantListParams
} from './types/tenants.types'

function mapBranding(raw: TenantBranding): TenantBranding {
  return { ...raw, logo: raw.logoUrl ?? raw.logo ?? null }
}

function mapTenant(raw: Tenant): Tenant {
  return {
    ...raw,
    status: (raw.status?.toLowerCase() ?? 'active') as Tenant['status']
  }
}

export const tenantsApi = {
  checkSlug: (slug: string) =>
    unwrap(apiClient.get<ApiResponse<{ available: boolean }>>('/tenants/check-slug', { params: { slug } })),

  getPlans: () =>
    unwrap(apiClient.get<ApiResponse<TenantPlan[]>>('/tenants/plans')),

  resolve: async (slug: string) =>
    mapBranding(await unwrap(apiClient.get<ApiResponse<TenantBranding>>(`/tenants/resolve/${slug}`))),

  create: (body: CreateTenantRequest) =>
    unwrap(apiClient.post<ApiResponse<Tenant>>('/tenants', body)),

  list: async (params?: TenantListParams) => {
    const result = await unwrapPaginated(apiClient.get<ApiResponse<Tenant[]>>('/tenants', { params }))
    return { data: result.data.map(mapTenant), meta: result.meta }
  },

  get: (id: string) =>
    unwrap(apiClient.get<ApiResponse<Tenant>>(`/tenants/${id}`)),

  update: (id: string, body: UpdateTenantRequest) =>
    unwrap(apiClient.put<ApiResponse<Tenant>>(`/tenants/${id}`, body)),

  delete: (id: string) =>
    unwrap(apiClient.delete<ApiResponse<null>>(`/tenants/${id}`)),

  restore: (id: string) =>
    unwrap(apiClient.patch<ApiResponse<Tenant>>(`/tenants/restore/${id}`)),

  subscribe: (id: string, body: SubscribeRequest) =>
    unwrap(apiClient.post<ApiResponse<Tenant>>(`/tenants/${id}/subscribe`, body)),

  getFeatureFlags: (id: string) =>
    unwrap(apiClient.get<ApiResponse<FeatureFlag[]>>(`/tenants/${id}/feature-flags`)),

  updateFeatureFlags: (id: string, flags: FeatureFlag[]) =>
    unwrap(apiClient.put<ApiResponse<FeatureFlag[]>>(`/tenants/${id}/feature-flags`, flags)),

  addDomain: (id: string, domain: string) =>
    unwrap(apiClient.post<ApiResponse<TenantDomain>>(`/tenants/${id}/domains`, { domain })),

  getUsage: (id: string) =>
    unwrap(apiClient.get<ApiResponse<TenantUsage>>(`/tenants/${id}/usage`))
}

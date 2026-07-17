export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'trial'

export interface TenantPlan {
  id: string
  name: string
  slug: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  maxBranches: number
  maxUsers: number
}

export interface TenantBranding {
  id?: string
  name: string
  slug: string
  logo?: string | null
  logoUrl?: string | null
  favicon?: string | null
  primaryColor?: string
  theme?: 'light' | 'dark' | 'auto'
  currency?: string
  timezone?: string
  status?: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  phone?: string
  status: TenantStatus
  planId?: string
  plan?: TenantPlan
  createdAt: string
  updatedAt: string
}

export interface CreateTenantRequest {
  name: string
  slug: string
  email: string
  phone?: string
  ownerEmail: string
  ownerPassword: string
  ownerFirstName: string
  ownerLastName: string
  planId?: string
}

export interface UpdateTenantRequest {
  name?: string
  email?: string
  phone?: string
  status?: TenantStatus
}

export interface SubscribeRequest {
  planId: string
  paymentMethodId?: string
}

export interface FeatureFlag {
  key: string
  enabled: boolean
  description?: string
}

export interface TenantDomain {
  id: string
  domain: string
  isPrimary: boolean
  verified: boolean
}

export interface TenantUsage {
  branches: number
  users: number
  orders: number
  storage: number
}

export interface TenantListParams {
  page?: number
  limit?: number
  search?: string
  status?: TenantStatus
}

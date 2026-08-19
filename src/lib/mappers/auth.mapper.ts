import type {
  AuthSession,
  AuthUser,
  Permission,
  Role,
  LoginResponse,
  RefreshResponse
} from '@/api/types/auth.types'

type BackendUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  userType?: string
  status?: string
  emailVerified: boolean
  phoneVerified?: boolean
  tenantId?: string | null
  avatarUrl?: string | null
  avatar?: string | null
  lastLoginAt?: string | null
  createdAt?: string
  roles: string[]
  permissions: string[]
  hasPin?: boolean
  employeeCode?: string | null
  staffLoginId?: string | null
  tenant?: { id: string; name: string; slug: string; status: string } | null
  featureFlags?: Array<{ key: string; enabled: boolean; config?: unknown }>
}

type BackendRolePermission = {
  permission: Permission
}

type BackendRole = Role & {
  rolePermissions?: BackendRolePermission[]
}

type BackendSession = {
  id: string
  deviceName?: string | null
  deviceType?: string | null
  ipAddress?: string | null
  lastActiveAt: string
  createdAt: string
  status?: string
  isCurrent?: boolean
}

export function mapUser(raw: BackendUser): AuthUser {
  const userType = raw.userType?.toUpperCase()
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    fullName: `${raw.firstName} ${raw.lastName}`.trim(),
    avatar: raw.avatarUrl ?? raw.avatar ?? null,
    emailVerified: raw.emailVerified,
    isSuperAdmin: userType === 'SUPER_ADMIN',
    userType,
    roles: raw.roles ?? [],
    permissions: raw.permissions ?? [],
    tenantId: raw.tenantId ?? undefined,
    tenant: raw.tenant ?? null,
    hasPin: Boolean(raw.hasPin),
    employeeCode: raw.employeeCode ?? undefined,
    staffLoginId: raw.staffLoginId ?? undefined,
    featureFlags: raw.featureFlags
  }
}

export function mapLoginResponse(
  raw: { user: BackendUser; tokens: LoginResponse['tokens'] }
): LoginResponse {
  return {
    user: mapUser(raw.user),
    tokens: raw.tokens
  }
}

export function mapRefreshResponse(
  raw: { user?: BackendUser; tokens: RefreshResponse['tokens'] }
): RefreshResponse {
  return {
    user: raw.user ? mapUser(raw.user) : undefined,
    tokens: raw.tokens
  }
}

export function mapRole(raw: BackendRole): Role {
  const permissions =
    raw.rolePermissions?.map((entry) => entry.permission) ??
    raw.permissions ??
    []

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    isSystem: raw.isSystem,
    permissions,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
  }
}

export function mapSession(raw: BackendSession, currentSessionId?: string | null): AuthSession {
  return {
    id: raw.id,
    deviceName: raw.deviceName || 'Unknown device',
    deviceType: raw.deviceType || 'desktop',
    ipAddress: raw.ipAddress ?? undefined,
    lastActiveAt: raw.lastActiveAt,
    createdAt: raw.createdAt,
    status: raw.status ?? 'ACTIVE',
    isCurrent: raw.isCurrent ?? (currentSessionId ? raw.id === currentSessionId : false)
  }
}

export function decodeJwtSessionId(token: string | null): string | null {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { sessionId?: string }
    return payload.sessionId ?? null
  } catch {
    return null
  }
}

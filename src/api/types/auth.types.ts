export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: string | number
  tokenType: string
}

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName?: string
  avatar?: string | null
  emailVerified: boolean
  isSuperAdmin?: boolean
  userType?: string
  roles: string[]
  permissions: string[]
  tenantId?: string
  tenant?: { id: string; name: string; slug: string; status: string } | null
  hasPin?: boolean
  employeeCode?: string
  staffLoginId?: string
  featureFlags?: Array<{ key: string; enabled: boolean; config?: unknown }>
}

export interface LoginRequest {
  email: string
  password: string
  deviceName: string
  deviceType: 'electron-desktop'
  deviceId: string
}

export interface LoginResponse {
  user: AuthUser
  tokens: AuthTokens
}

export interface RefreshRequest {
  refreshToken: string
}

export interface RefreshResponse {
  user?: AuthUser
  tokens: AuthTokens
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

export interface OtpRequest {
  phone: string
}

export interface OtpVerifyRequest {
  phone: string
  otp: string
}

export interface VerifyEmailRequest {
  token: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface LogoutRequest {
  allDevices?: boolean
}

export interface AuthSession {
  id: string
  deviceName: string
  deviceType: string
  ipAddress?: string
  userAgent?: string
  lastActiveAt: string
  createdAt: string
  status?: string
  isCurrent: boolean
}

export interface Permission {
  id: string
  name: string
  slug: string
  module: string
  description?: string
}

export interface Role {
  id: string
  name: string
  slug: string
  description?: string
  isSystem: boolean
  permissions: Permission[]
  createdAt: string
  updatedAt: string
}

export interface CreateRoleRequest {
  name: string
  slug: string
  description?: string
  permissions: string[]
}

export interface UpdateRoleRequest {
  name?: string
  description?: string
  permissions?: string[]
  isActive?: boolean
}

export interface AssignRoleRequest {
  userId: string
  roleId: string
}

export interface SetPinRequest {
  pin: string
  currentPassword: string
}

export interface PinLoginRequest {
  staffLoginId: string
  pin: string
  deviceName?: string
  deviceType?: string
  deviceId?: string
}

export interface UnlockScreenRequest {
  pin?: string
  password?: string
}

export interface StaffShift {
  id: string
  tenantId: string
  userId: string
  status: 'OPEN' | 'CLOSED'
  openingCash: number
  closingCash?: number | null
  expectedCash?: number | null
  cashVariance?: number | null
  totalSales: number
  orderCount: number
  openedAt: string
  closedAt?: string | null
  openNotes?: string | null
  closeNotes?: string | null
}

export interface OpenShiftRequest {
  openingCash: number
  notes?: string
}

export interface CloseShiftRequest {
  closingCash: number
  expectedCash?: number
  notes?: string
}

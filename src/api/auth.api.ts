import apiClient, { unwrap, unwrapPaginated } from './client'
import type { ApiResponse, PaginationParams } from './types/common'
import type {
  AuthUser, LoginRequest, LoginResponse, RefreshRequest, RefreshResponse,
  RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest,
  OtpRequest, OtpVerifyRequest, VerifyEmailRequest, ChangePasswordRequest,
  LogoutRequest, AuthSession, Permission, Role, CreateRoleRequest,
  UpdateRoleRequest, AssignRoleRequest,
  SetPinRequest, PinLoginRequest, UnlockScreenRequest,
  OpenShiftRequest, CloseShiftRequest, StaffShift
} from './types/auth.types'
import {
  mapLoginResponse,
  mapRefreshResponse,
  mapRole,
  mapSession,
  mapUser
} from '@/lib/mappers/auth.mapper'

export const authApi = {
  register: (body: RegisterRequest) =>
    unwrap(apiClient.post<ApiResponse<AuthUser>>('/auth/register', body)).then((user) =>
      mapUser(user as never)
    ),

  login: async (body: LoginRequest) => {
    const raw = await unwrap(apiClient.post<ApiResponse<LoginResponse>>('/auth/login', body))
    return mapLoginResponse(raw as never)
  },

  refresh: async (body: RefreshRequest) => {
    const raw = await unwrap(apiClient.post<ApiResponse<RefreshResponse>>('/auth/refresh', body))
    return mapRefreshResponse(raw as never)
  },

  logout: (body?: LogoutRequest) =>
    unwrap(apiClient.post<ApiResponse<null>>('/auth/logout', body)),

  forgotPassword: (body: ForgotPasswordRequest) =>
    unwrap(apiClient.post<ApiResponse<null>>('/auth/forgot-password', body)),

  resetPassword: (body: ResetPasswordRequest) =>
    unwrap(apiClient.post<ApiResponse<null>>('/auth/reset-password', body)),

  requestOtp: (body: OtpRequest) =>
    unwrap(apiClient.post<ApiResponse<null>>('/auth/otp/request', body)),

  verifyOtp: async (body: OtpVerifyRequest) => {
    const raw = await unwrap(apiClient.post<ApiResponse<LoginResponse>>('/auth/otp/verify', body))
    return mapLoginResponse(raw as never)
  },

  verifyEmail: (body: VerifyEmailRequest) =>
    unwrap(apiClient.post<ApiResponse<null>>('/auth/verify-email', body)),

  me: async () => {
    const raw = await unwrap(apiClient.get<ApiResponse<AuthUser>>('/auth/me'))
    return mapUser(raw as never)
  },

  changePassword: async (body: ChangePasswordRequest) => {
    await unwrap(apiClient.post<ApiResponse<null | undefined>>('/auth/change-password', body))
  },

  getSessions: async () => {
    const raw = await unwrap(apiClient.get<ApiResponse<AuthSession[]>>('/auth/sessions'))
    return (raw as never[]).map((session) => mapSession(session, null))
  },

  revokeSession: (sessionId: string) =>
    unwrap(apiClient.delete<ApiResponse<null>>(`/auth/sessions/${sessionId}`)),

  getPermissions: () =>
    unwrap(apiClient.get<ApiResponse<Permission[]>>('/auth/permissions')),

  getRoles: async (params?: PaginationParams) => {
    const result = await unwrapPaginated(apiClient.get<ApiResponse<Role[]>>('/auth/roles', { params }))
    return { data: (result.data as never[]).map(mapRole), meta: result.meta }
  },

  getRole: async (id: string) => {
    const raw = await unwrap(apiClient.get<ApiResponse<Role>>(`/auth/roles/${id}`))
    return mapRole(raw as never)
  },

  createRole: async (body: CreateRoleRequest) => {
    const raw = await unwrap(apiClient.post<ApiResponse<Role>>('/auth/roles', body))
    return mapRole(raw as never)
  },

  updateRole: async (id: string, body: UpdateRoleRequest) => {
    const raw = await unwrap(apiClient.put<ApiResponse<Role>>(`/auth/roles/${id}`, body))
    return mapRole(raw as never)
  },

  deleteRole: (id: string) =>
    unwrap(apiClient.delete<ApiResponse<null>>(`/auth/roles/${id}`)),

  assignRole: (body: AssignRoleRequest) =>
    unwrap(apiClient.post<ApiResponse<null>>('/auth/roles/assign', body)),

  unassignRole: (userId: string, roleId: string) =>
    unwrap(apiClient.delete<ApiResponse<null>>(`/auth/roles/assign/${userId}/${roleId}`)),

  setPin: async (body: SetPinRequest) => {
    await unwrap(apiClient.post<ApiResponse<null | undefined>>('/auth/pin/set', body))
  },

  pinLogin: async (body: PinLoginRequest) => {
    const raw = await unwrap(apiClient.post<ApiResponse<LoginResponse>>('/auth/pin/login', body))
    return mapLoginResponse(raw as never)
  },

  lockScreen: () =>
    unwrap(apiClient.post<ApiResponse<{ isLocked: boolean }>>('/auth/lock')),

  unlockScreen: (body: UnlockScreenRequest) =>
    unwrap(apiClient.post<ApiResponse<{ isLocked: boolean }>>('/auth/unlock', body)),

  getLockStatus: () =>
    unwrap(apiClient.get<ApiResponse<{ isLocked: boolean; lockedAt?: string | null }>>('/auth/lock-status')),

  getCurrentShift: () =>
    unwrap(apiClient.get<ApiResponse<StaffShift | null>>('/auth/shifts/current')),

  openShift: (body: OpenShiftRequest) =>
    unwrap(apiClient.post<ApiResponse<StaffShift>>('/auth/shifts/open', body)),

  closeShift: (body: CloseShiftRequest) =>
    unwrap(apiClient.post<ApiResponse<StaffShift>>('/auth/shifts/close', body)),

  listShifts: () =>
    unwrap(apiClient.get<ApiResponse<StaffShift[]>>('/auth/shifts'))
}

export const rolesApi = {
  list: authApi.getRoles,
  get: authApi.getRole,
  create: authApi.createRole,
  update: authApi.updateRole,
  delete: authApi.deleteRole,
  assign: authApi.assignRole,
  unassign: authApi.unassignRole,
  permissions: authApi.getPermissions
}

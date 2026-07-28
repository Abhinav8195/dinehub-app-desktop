import apiClient, { unwrap, unwrapPaginated } from './client'
import type { ApiResponse, PaginatedResponse, PaginationParams } from './types/common'
import type { Department, Permission, Role, User, UserAuditLog, UserInvitation, UserSession, UserStatus } from './types/management.types'
import { normalizeApiData } from './management-utils'

type Params = PaginationParams & { [key: string]: string | number | boolean | undefined }
const one = async <T>(request: Promise<{ data: ApiResponse<T> }>) => normalizeApiData(await unwrap(request))
const page = async <T>(request: Promise<{ data: ApiResponse<T[]> }>): Promise<PaginatedResponse<T>> => {
  const result = await unwrapPaginated(request); return normalizeApiData({ data: result.data, meta: result.meta! })
}
const list = async <T>(request: Promise<{ data: ApiResponse<T[]> }>) => normalizeApiData(await unwrap(request))

export const userKeys = {
  all: ['users'] as const, list: (params?: Params) => ['users', 'list', params ?? {}] as const,
  detail: (id: string) => ['users', 'detail', id] as const, roles: ['users', 'roles'] as const,
  permissions: ['users', 'permissions'] as const, departments: ['users', 'departments'] as const,
  invites: ['users', 'invites'] as const, sessions: (id: string) => ['users', id, 'sessions'] as const,
  audit: (params?: Params) => ['users', 'audit', params ?? {}] as const,
}
export interface UserInput { firstName: string; lastName: string; email: string; phone?: string; userType: string; departmentId?: string; roleIds: string[]; sendInvitation?: boolean }

export const userManagementApi = {
  list: (params: Params = {}) => page<User>(apiClient.get('/users', { params })),
  get: (id: string) => one<User>(apiClient.get(`/users/${id}`)),
  create: (body: UserInput) => one<User>(apiClient.post('/users', body)),
  update: (id: string, body: Partial<Omit<UserInput, 'email'|'sendInvitation'>> & { status?: UserStatus }) => one<User>(apiClient.patch(`/users/${id}`, body)),
  delete: (id: string) => one<User>(apiClient.delete(`/users/${id}`)),
  status: (id: string, status: UserStatus, reason?: string) => one<User>(apiClient.patch(`/users/${id}/status`, { status, reason })),
  sendPasswordReset: (id: string) => one(apiClient.post(`/users/${id}/send-password-reset`)),
  forcePasswordReset: (id: string, revokeSessions: boolean) => one(apiClient.post(`/users/${id}/force-password-reset`, { revokeSessions })),
  unlock: (id: string) => one(apiClient.post(`/users/${id}/unlock`)),
  revokeSessions: (id: string) => one(apiClient.post(`/users/${id}/revoke-sessions`)),
  sessions: (id: string) => list<UserSession>(apiClient.get(`/users/${id}/sessions`)),
  revokeSession: (id: string, sessionId: string) => one(apiClient.delete(`/users/${id}/sessions/${sessionId}`)),
  revokeAllSessions: (id: string) => one(apiClient.delete(`/users/${id}/sessions`)),
  setRoles: (id: string, roleIds: string[]) => one<User>(apiClient.put(`/users/${id}/roles`, { roleIds })),
  effectivePermissions: (id: string) => list<Permission>(apiClient.get(`/users/${id}/permissions`)),

  roles: () => list<Role>(apiClient.get('/auth/roles')), role: (id: string) => one<Role>(apiClient.get(`/auth/roles/${id}`)),
  permissions: () => list<Permission>(apiClient.get('/auth/permissions')),
  createRole: (body: { name: string; description?: string; permissionIds?: string[]; permissions?: string[] }) => one<Role>(apiClient.post('/auth/roles', body)),
  updateRole: (id: string, body: { name?: string; description?: string; permissionIds?: string[]; permissions?: string[] }) => one<Role>(apiClient.patch(`/auth/roles/${id}`, body)),
  deleteRole: (id: string) => one(apiClient.delete(`/auth/roles/${id}`)),

  departments: () => list<Department>(apiClient.get('/users/departments')),
  department: (id: string) => one<Department>(apiClient.get(`/users/departments/${id}`)),
  createDepartment: (body: Omit<Department, 'id'|'manager'|'activeUserCount'>) => one<Department>(apiClient.post('/users/departments', { ...body, code: body.code.toUpperCase() })),
  updateDepartment: (id: string, body: Partial<Department>) => one<Department>(apiClient.patch(`/users/departments/${id}`, body)),
  deleteDepartment: (id: string, replacementDepartmentId?: string) => one(apiClient.delete(`/users/departments/${id}`, { params: { replacementDepartmentId } })),

  invites: () => list<UserInvitation>(apiClient.get('/users/invites')),
  createInvite: (body: { email: string; firstName?: string; lastName?: string; userType?: string; departmentId?: string; roleIds?: string[] }) => one<UserInvitation>(apiClient.post('/users/invites', body)),
  resendInvite: (id: string) => one<UserInvitation>(apiClient.post(`/users/invites/${id}/resend`)),
  revokeInvite: (id: string) => one(apiClient.delete(`/users/invites/${id}`)),
  inspectInvite: (token: string) => one<Omit<UserInvitation, 'id'>>(apiClient.get(`/invites/${encodeURIComponent(token)}`)),
  acceptInvite: (body: { token: string; password: string; phone?: string }) => one(apiClient.post('/invites/accept', body)),
  auditLogs: (params: Params = {}) => page<UserAuditLog>(apiClient.get('/users/audit-logs', { params })),
}

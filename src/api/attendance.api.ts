import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE'
export interface AttendanceRecord {
  id: string; attendanceDate: string; status: AttendanceStatus; checkedInAt?: string | null; checkedOutAt?: string | null
  /** UI compatibility aliases populated by list(). */ checkIn?: string | null; checkOut?: string | null
  workedMinutes?: number; overtimeMinutes?: number; lateMinutes?: number; earlyDepartureMinutes?: number
  employee: { id: string; firstName: string; lastName: string; department?: string | null }
  branch?: { id: string; name: string } | null
}
export interface AttendanceSummary { counts: Partial<Record<AttendanceStatus, number>>; workedMinutes: number; overtimeMinutes: number; lateMinutes: number }
export interface AttendanceParams { from?: string; to?: string; search?: string; status?: string; employeeId?: string; departmentId?: string; branchId?: string; page?: number; limit?: number }

const post = (path: string, body: Record<string, unknown> = {}) => unwrap(apiClient.post<ApiResponse<AttendanceRecord>>(path, body))
export const attendanceApi = {
  list: async (params: AttendanceParams) => (await unwrap(apiClient.get<ApiResponse<AttendanceRecord[]>>('/attendance', { params }))).map((record) => ({ ...record, checkIn: record.checkedInAt, checkOut: record.checkedOutAt })),
  summary: (params: AttendanceParams) => unwrap(apiClient.get<ApiResponse<AttendanceSummary>>('/attendance/summary', { params })),
  checkIn: (body: { employeeId?: string; at?: string } = {}) => post('/attendance/check-in', body),
  checkOut: (body: { employeeId?: string; at?: string } = {}) => post('/attendance/check-out', body),
  startBreak: (body: { employeeId?: string; at?: string } = {}) => post('/attendance/breaks/start', body),
  endBreak: (body: { employeeId?: string; at?: string } = {}) => post('/attendance/breaks/end', body),
  correct: (id: string, body: { status: AttendanceStatus; checkedInAt?: string; checkedOutAt?: string; reason: string }) => post(`/attendance/${id}/corrections`, body),
  export: (params: AttendanceParams) => unwrap(apiClient.get<ApiResponse<{ filename: string; mimeType: string; content: string }>>('/attendance/export', { params })),
}

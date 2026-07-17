import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'

export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export const notificationsApi = {
  list: (unreadOnly = false) =>
    unwrap(
      apiClient.get<ApiResponse<{ notifications: NotificationItem[]; unreadCount: number }>>(
        '/notifications',
        { params: unreadOnly ? { unreadOnly: true } : undefined },
      ),
    ),

  markRead: (id: string) =>
    unwrap(apiClient.patch<ApiResponse<unknown>>(`/notifications/${id}/read`)),

  markAllRead: () =>
    unwrap(apiClient.patch<ApiResponse<unknown>>('/notifications/read-all')),
}

import { BrowserWindow } from 'electron'
import { io, type Socket } from 'socket.io-client'
import { getAccessToken } from './store/secureStore'

const SOCKET_URL = process.env.DINEHUB_SOCKET_URL || import.meta.env.MAIN_VITE_SOCKET_URL || 'https://dininghub.in'
const FORWARDED_EVENTS = [
  'new_order', 'order_updated', 'order_status_updated', 'new_kitchen_order',
  'kitchen_order_updated', 'table_updated', 'table_status_updated',
  'waiter_call_alert', 'low_stock_alert', 'notification'
] as const
let socket: Socket | null = null

export function connectRealtime(): void {
  if (socket?.connected) return
  const token = getAccessToken()
  if (!token) throw new Error('An authenticated session is required')
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000
  })
  socket.on('connect', () => {
    BrowserWindow.getAllWindows().forEach((window) => window.webContents.send('realtime:state', 'connected'))
    socket?.emit('join_tenant')
  })
  socket.on('disconnect', () =>
    BrowserWindow.getAllWindows().forEach((window) => window.webContents.send('realtime:state', 'disconnected')))
  socket.on('connect_error', () =>
    BrowserWindow.getAllWindows().forEach((window) => window.webContents.send('realtime:state', 'disconnected')))
  FORWARDED_EVENTS.forEach((event) => socket?.on(event, (payload) =>
    BrowserWindow.getAllWindows().forEach((window) => window.webContents.send('realtime:event', event, payload))))
}

export function disconnectRealtime(): void {
  socket?.disconnect()
  socket = null
}

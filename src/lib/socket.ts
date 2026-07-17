import { io, type Socket } from 'socket.io-client'
import { tokenBridge } from '@/api/client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

let socket: Socket | null = null

export type SocketEvent =
  | 'new_order'
  | 'order_updated'
  | 'new_kitchen_order'
  | 'kitchen_order_updated'
  | 'table_updated'
  | 'waiter_call_alert'

export async function connectSocket(tenantId: string): Promise<Socket> {
  if (socket?.connected) return socket

  const token = await tokenBridge.getAccessToken()

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000
  })

  socket.on('connect', () => {
    socket?.emit('join_tenant', tenantId)
  })

  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}

export function getSocket(): Socket | null {
  return socket
}

export function onSocketEvent<T = unknown>(event: SocketEvent, handler: (data: T) => void) {
  socket?.on(event, handler)
  return () => { socket?.off(event, handler) }
}

type Handler = (payload: never) => void
interface RealtimeFacade {
  on: (event: string, handler: Handler) => void
  off: (event: string, handler?: Handler) => void
}

let connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected'
const stateListeners = new Set<(state: typeof connectionState) => void>()
const eventListeners = new Map<string, Set<Handler>>()
let unsubscribeEvent: (() => void) | null = null
let unsubscribeState: (() => void) | null = null

const facade: RealtimeFacade = {
  on(event, handler) {
    const handlers = eventListeners.get(event) ?? new Set()
    handlers.add(handler)
    eventListeners.set(event, handlers)
  },
  off(event, handler) {
    if (!handler) eventListeners.delete(event)
    else eventListeners.get(event)?.delete(handler)
  }
}

function setConnectionState(next: typeof connectionState) {
  connectionState = next
  stateListeners.forEach((listener) => listener(next))
}

export function getSocketConnectionState() {
  return connectionState
}

export function onSocketConnectionState(listener: (state: typeof connectionState) => void) {
  stateListeners.add(listener)
  listener(connectionState)
  return () => { stateListeners.delete(listener) }
}

export async function connectSocket(_tenantId?: string): Promise<RealtimeFacade> {
  if (connectionState === 'connected') return facade
  setConnectionState('connecting')
  unsubscribeEvent ??= window.electronAPI.realtime.onEvent((event, payload) => {
    eventListeners.get(event)?.forEach((handler) => handler(payload as never))
  })
  unsubscribeState ??= window.electronAPI.realtime.onState(setConnectionState)
  await window.electronAPI.realtime.connect()
  return facade
}

export function disconnectSocket(): void {
  window.electronAPI.realtime.disconnect().catch(() => {})
  unsubscribeEvent?.()
  unsubscribeState?.()
  unsubscribeEvent = null
  unsubscribeState = null
  eventListeners.clear()
  setConnectionState('disconnected')
}

export function getSocket(): RealtimeFacade | null {
  return connectionState === 'disconnected' ? null : facade
}

export function onSocketEvent<T = unknown>(event: string, handler: (data: T) => void) {
  facade.on(event, handler as Handler)
  return () => facade.off(event, handler as Handler)
}

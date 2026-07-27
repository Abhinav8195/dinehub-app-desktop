import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  requestDineHub: (request: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    path: string
    query?: Record<string, string | number | boolean | undefined>
    body?: unknown
  }): Promise<unknown> => ipcRenderer.invoke('dinehub:request', request),
  hasSession: (): Promise<boolean> => ipcRenderer.invoke('auth:hasSession'),
  menuImages: {
    select: (): Promise<{
      name: string
      mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
      size: number
      base64: string
      previewUrl: string
    } | null> => ipcRenderer.invoke('menu:selectImage'),
    upload: async (
      kind: 'category' | 'item',
      file: { name: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'; size: number; base64: string },
      onProgress: (progress: number) => void
    ): Promise<unknown> => {
      const requestId = crypto.randomUUID()
      const channel = `menu:uploadProgress:${requestId}`
      const handler = (_: unknown, progress: number) => onProgress(progress)
      ipcRenderer.on(channel, handler)
      try {
        return await ipcRenderer.invoke('menu:uploadImage', { requestId, kind, file })
      } finally {
        ipcRenderer.removeListener(channel, handler)
      }
    }
  },
  realtime: {
    connect: (): Promise<void> => ipcRenderer.invoke('realtime:connect'),
    disconnect: (): Promise<void> => ipcRenderer.invoke('realtime:disconnect'),
    onState: (callback: (state: 'connected' | 'disconnected') => void) => {
      const handler = (_: unknown, state: 'connected' | 'disconnected') => callback(state)
      ipcRenderer.on('realtime:state', handler)
      return () => ipcRenderer.removeListener('realtime:state', handler)
    },
    onEvent: (callback: (event: string, payload: unknown) => void) => {
      const handler = (_: unknown, event: string, payload: unknown) => callback(event, payload)
      ipcRenderer.on('realtime:event', handler)
      return () => ipcRenderer.removeListener('realtime:event', handler)
    }
  },
  clearTokens: (): Promise<void> => ipcRenderer.invoke('auth:clearTokens'),
  getTenantSlug: (): Promise<string | null> => ipcRenderer.invoke('auth:getTenantSlug'),
  setTenantSlug: (slug: string): Promise<void> => ipcRenderer.invoke('auth:setTenantSlug', slug),
  getDeviceId: (): Promise<string> => ipcRenderer.invoke('auth:getDeviceId'),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:openExternal', url),
  printReceipt: (html: string): Promise<void> => ipcRenderer.invoke('print:receiptHtml', html),

  // Extended APIs (backward compat)
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    openPOS: () => ipcRenderer.invoke('window:openPOS'),
    openKDS: () => ipcRenderer.invoke('window:openKDS')
  },
  print: {
    receipt: (html: string) => ipcRenderer.invoke('print:receipt', html),
    kitchen: (html: string) => ipcRenderer.invoke('print:kitchen', html),
    getPrinters: () => ipcRenderer.invoke('print:getPrinters')
  },
  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
    set: (dark: boolean) => ipcRenderer.invoke('theme:set', dark)
  },
  notify: {
    show: (title: string, body: string) => ipcRenderer.invoke('notify:show', title, body)
  },
  onApiError: (callback: (error: { message: string; path?: string; statusCode?: number }) => void) => {
    const handler = (_: unknown, error: { message: string; path?: string; statusCode?: number }) => callback(error)
    ipcRenderer.on('api:error', handler)
    return () => ipcRenderer.removeListener('api:error', handler)
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI)
} else {
  // @ts-expect-error fallback
  window.electronAPI = electronAPI
}

export type ElectronAPI = typeof electronAPI

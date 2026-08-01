import { contextBridge, ipcRenderer } from 'electron'
import type { ApiRequest, DesktopApiResponse } from '../main/api/dinehubClient'
import type { UpdateStatus } from '../main/updater'

const electronAPI = {
  requestDineHub: (request: ApiRequest): Promise<{
    ok: boolean
    response?: DesktopApiResponse
    error?: { statusCode: number; message: string; errors?: string[] | Record<string, string[]>; path?: string }
  }> => ipcRenderer.invoke('dinehub:request', request),
  hasSession: (): Promise<boolean> => ipcRenderer.invoke('auth:hasSession'),
  menuImages: {
    select: (kind: 'category' | 'item' | 'combo' = 'item'): Promise<{
      name: string
      mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
      size: number
      base64: string
      previewUrl: string
    } | null> => ipcRenderer.invoke('menu:selectImage', kind),
    upload: async (
      kind: 'category' | 'item' | 'combo',
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
  updates: {
    getStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('app:getUpdateStatus'),
    check: (): Promise<UpdateStatus> => ipcRenderer.invoke('app:checkUpdate'),
    install: (): Promise<boolean> => ipcRenderer.invoke('app:installUpdate'),
    onStatus: (callback: (status: UpdateStatus) => void) => {
      const handler = (_: unknown, status: UpdateStatus) => callback(status)
      ipcRenderer.on('update:status', handler)
      return () => ipcRenderer.removeListener('update:status', handler)
    }
  },
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:openExternal', url),
  printReceipt: (html: string): Promise<void> => ipcRenderer.invoke('print:receiptHtml', html),
  saveFile: (file: { filename: string; content: string }): Promise<{ saved: boolean; path?: string }> =>
    ipcRenderer.invoke('file:saveText', file),
  saveBytes: (file: { filename: string; bytes: Uint8Array; contentType?: string }): Promise<{
    saved: boolean
    cancelled?: boolean
    path?: string
  }> => ipcRenderer.invoke('file:saveBytes', file),

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

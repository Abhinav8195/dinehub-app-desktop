import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  getToken: (): Promise<string | null> => ipcRenderer.invoke('auth:getAccessToken'),
  getRefreshToken: (): Promise<string | null> => ipcRenderer.invoke('auth:getRefreshToken'),
  setTokens: (tokens: { accessToken: string; refreshToken: string }): Promise<void> =>
    ipcRenderer.invoke('auth:setTokens', tokens),
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

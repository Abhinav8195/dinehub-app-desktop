import { ipcMain, shell } from 'electron'
import { app } from 'electron'
import {
  getAccessToken, getRefreshToken, setTokens, clearTokens,
  getTenantSlug, setTenantSlug, getDeviceId
} from '../store/secureStore'
import { getMainWindow } from '../window'
import { BrowserWindow } from 'electron'

export function registerAuthIpcHandlers(): void {
  ipcMain.handle('auth:getAccessToken', () => getAccessToken())
  ipcMain.handle('auth:getRefreshToken', () => getRefreshToken())
  ipcMain.handle('auth:setTokens', (_, tokens: { accessToken: string; refreshToken: string }) => {
    setTokens(tokens)
  })
  ipcMain.handle('auth:clearTokens', () => clearTokens())
  ipcMain.handle('auth:getTenantSlug', () => getTenantSlug())
  ipcMain.handle('auth:setTenantSlug', (_, slug: string) => setTenantSlug(slug))
  ipcMain.handle('auth:getDeviceId', () => getDeviceId())

  ipcMain.handle('app:openExternal', (_, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('print:receiptHtml', async (_, html: string) => {
    const win = new BrowserWindow({ show: false })
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    await new Promise<void>((resolve) => {
      win.webContents.print({ silent: false, printBackground: true }, () => resolve())
    })
    win.close()
  })

  ipcMain.handle('log:apiError', (_, error: { message: string; path?: string; statusCode?: number }) => {
    console.error('[API Error]', error.statusCode, error.path, error.message)
    getMainWindow()?.webContents.send('api:error', error)
  })
}

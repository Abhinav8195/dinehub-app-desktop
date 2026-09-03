import { ipcMain, shell } from 'electron'
import { app } from 'electron'
import {
  clearTokens, getCachedUser, getTenantSlug, setTenantSlug, getDeviceId
} from '../store/secureStore'
import { getMainWindow } from '../window'
import { printHtmlDocument } from '../print-html'

export function registerAuthIpcHandlers(): void {
  ipcMain.handle('auth:clearTokens', () => clearTokens())
  ipcMain.handle('auth:getCachedUser', () => getCachedUser())
  ipcMain.handle('auth:getTenantSlug', () => getTenantSlug())
  ipcMain.handle('auth:setTenantSlug', (_, slug: string) => setTenantSlug(slug))
  ipcMain.handle('auth:getDeviceId', () => getDeviceId())

  ipcMain.handle('app:openExternal', (_, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('print:receiptHtml', async (_, html: string) => {
    await printHtmlDocument(html, 'receipt')
  })

  ipcMain.handle('log:apiError', (_, error: { message: string; path?: string; statusCode?: number }) => {
    console.error('[API Error]', error.statusCode, error.path, error.message)
    getMainWindow()?.webContents.send('api:error', error)
  })
}

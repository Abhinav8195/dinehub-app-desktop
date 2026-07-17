import { ipcMain, BrowserWindow, Notification, app } from 'electron'
import Store from 'electron-store'
import { join } from 'path'
import { autoUpdater } from 'electron-updater'
import { getMainWindow } from '../window'
import { registerAuthIpcHandlers } from './auth'

const store = new Store()
const isDev = !app.isPackaged

export function registerIpcHandlers(): void {
  registerAuthIpcHandlers()

  ipcMain.handle('store:get', (_, key: string) => store.get(key))
  ipcMain.handle('store:set', (_, key: string, value: unknown) => store.set(key, value))
  ipcMain.handle('store:delete', (_, key: string) => store.delete(key))
  ipcMain.handle('store:getAll', () => store.store)

  ipcMain.handle('window:minimize', () => getMainWindow()?.minimize())
  ipcMain.handle('window:maximize', () => {
    const win = getMainWindow()
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })
  ipcMain.handle('window:close', () => getMainWindow()?.close())

  const openSecondaryWindow = (hash: string, fullscreen = true) => {
    const secondary = new BrowserWindow({
      width: 1280,
      height: 800,
      fullscreen,
      webPreferences: {
        preload: join(__dirname, '../../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })
    const url = process.env['ELECTRON_RENDERER_URL']
    if (url) {
      secondary.loadURL(`${url}#${hash}`)
    } else {
      secondary.loadFile(join(__dirname, '../../renderer/index.html'), { hash })
    }
  }

  ipcMain.handle('window:openPOS', () => openSecondaryWindow('/pos'))
  ipcMain.handle('window:openKDS', () => openSecondaryWindow('/kitchen'))

  ipcMain.handle('print:receipt', async (_, html: string) => {
    const win = new BrowserWindow({ show: false })
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    win.webContents.print({ silent: false, printBackground: true })
    win.close()
  })

  ipcMain.handle('print:kitchen', async (_, html: string) => {
    const win = new BrowserWindow({ show: false })
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    win.webContents.print({ silent: true, printBackground: true })
    win.close()
  })

  ipcMain.handle('print:getPrinters', async () => {
    const win = getMainWindow()
    if (!win) return []
    return win.webContents.getPrintersAsync()
  })

  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:checkUpdate', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { available: !!result?.updateInfo }
    } catch {
      return { available: false }
    }
  })

  ipcMain.handle('notify:show', (_, title: string, body: string) => {
    new Notification({ title, body }).show()
  })
}

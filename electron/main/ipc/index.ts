import { ipcMain, BrowserWindow, Notification, app, dialog } from 'electron'
import { readFile, stat, writeFile } from 'fs/promises'
import { extname, basename } from 'path'
import Store from 'electron-store'
import { join } from 'path'
import { autoUpdater } from 'electron-updater'
import { getMainWindow } from '../window'
import { registerAuthIpcHandlers } from './auth'
import { requestDineHubTransport, session, uploadMenuImage, type ApiRequest, type MenuImageUpload } from '../api/dinehubClient'
import { connectRealtime, disconnectRealtime } from '../realtime'

const store = new Store()
const isDev = !app.isPackaged
const appIcon = isDev
  ? join(app.getAppPath(), 'build', 'icon.png')
  : join(process.resourcesPath, 'assets', 'notification-icon.png')

export function registerIpcHandlers(): void {
  registerAuthIpcHandlers()
  ipcMain.handle('dinehub:request', async (_, request: ApiRequest) => {
    try {
      return { ok: true, response: await requestDineHubTransport(request) }
    } catch (error) {
      const failure = error as { statusCode?: number; message?: string; errors?: unknown; path?: string }
      return {
        ok: false,
        error: {
          statusCode: failure.statusCode ?? 0,
          message: failure.message ?? 'Unable to reach DineHub',
          errors: failure.errors,
          path: failure.path
        }
      }
    }
  })
  ipcMain.handle('auth:hasSession', () => session.hasSession())
  ipcMain.handle('file:saveText', async (_, file: { filename: string; content: string }) => {
    const result = await dialog.showSaveDialog(getMainWindow() ?? undefined, {
      title: 'Export inventory',
      defaultPath: basename(file.filename || 'inventory.csv'),
      filters: [{ name: 'CSV file', extensions: ['csv'] }]
    })
    if (result.canceled || !result.filePath) return { saved: false }
    await writeFile(result.filePath, file.content, 'utf8')
    return { saved: true, path: result.filePath }
  })
  ipcMain.handle('file:saveBytes', async (_, file: {
    filename: string
    bytes: Uint8Array
    contentType?: string
  }) => {
    const safeName = basename(file.filename || 'download')
    const extension = extname(safeName).replace('.', '').toLowerCase()
    const result = await dialog.showSaveDialog(getMainWindow() ?? undefined, {
      title: 'Save export',
      defaultPath: safeName,
      filters: extension ? [{ name: file.contentType || 'Export file', extensions: [extension] }] : undefined
    })
    if (result.canceled || !result.filePath) return { saved: false as const, cancelled: true as const }
    await writeFile(result.filePath, Buffer.from(file.bytes))
    return { saved: true as const, path: result.filePath }
  })
  ipcMain.handle('menu:selectImage', async (_, kind: 'category' | 'item' | 'combo' = 'item') => {
    const result = await dialog.showOpenDialog(getMainWindow() ?? undefined, {
      title: 'Select menu image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
    })
    if (result.canceled || !result.filePaths[0]) return null
    const filePath = result.filePaths[0]
    const info = await stat(filePath)
    const maxSizeMb = kind === 'combo' ? 5 : 1
    if (info.size > maxSizeMb * 1024 * 1024) throw new Error(`Image must be ${maxSizeMb} MB or smaller`)
    const mimeByExtension: Record<string, MenuImageUpload['mimeType']> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.webp': 'image/webp', '.gif': 'image/gif'
    }
    const mimeType = mimeByExtension[extname(filePath).toLowerCase()]
    if (!mimeType) throw new Error('Select a JPEG, PNG, WebP, or GIF image')
    const bytes = await readFile(filePath)
    return {
      name: basename(filePath),
      mimeType,
      size: bytes.byteLength,
      base64: bytes.toString('base64'),
      previewUrl: `data:${mimeType};base64,${bytes.toString('base64')}`
    }
  })
  ipcMain.handle('menu:uploadImage', async (event, request: {
    requestId: string
    kind: 'category' | 'item' | 'combo'
    file: MenuImageUpload
  }) => {
    try {
      const payload = await uploadMenuImage(request.kind, request.file, (progress) => {
        event.sender.send(`menu:uploadProgress:${request.requestId}`, progress)
      })
      return { ok: true, payload }
    } catch (error) {
      const failure = error as { statusCode?: number; message?: string; errors?: unknown }
      return { ok: false, error: { statusCode: failure.statusCode ?? 0, message: failure.message ?? 'Image upload failed', errors: failure.errors } }
    }
  })
  ipcMain.handle('realtime:connect', () => connectRealtime())
  ipcMain.handle('realtime:disconnect', () => disconnectRealtime())

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
      title: `DineHub ${hash === '/pos' ? 'POS' : 'Kitchen'}`,
      ...(process.platform === 'darwin' ? {} : { icon: appIcon }),
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
    if (!Notification.isSupported()) return false
    const notification = new Notification({
      title: title.trim() || 'DineHub',
      body,
      icon: appIcon,
      appName: 'DineHub'
    })
    notification.on('click', () => {
      const win = getMainWindow()
      if (!win) return
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    })
    notification.show()
    return true
  })
}

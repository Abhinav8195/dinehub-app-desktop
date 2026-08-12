import { app, BrowserWindow, shell, ipcMain, nativeTheme, session } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { setMainWindow, getMainWindow } from './window'
import { initializeAutoUpdater } from './updater'

const isDev = !app.isPackaged
const appIcon = isDev
  ? join(app.getAppPath(), 'build', 'icon.png')
  : join(process.resourcesPath, 'assets', 'notification-icon.png')

app.setName('DineHub')

const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' wss: https:",
  "media-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const CSP_POLICY_DEV = [
  "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: http: https:",
  "media-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#FFFFFF',
    title: 'DineHub',
    ...(process.platform === 'darwin' ? {} : { icon: appIcon }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: !isDev,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Apply CSP (relaxed in dev for Vite HMR)
  const csp = isDev ? CSP_POLICY_DEV : CSP_POLICY
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = details.responseHeaders || {}
    responseHeaders['Content-Security-Policy'] = [csp]
    callback({ responseHeaders })
  })

  setMainWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.dinehub.desktop')
  }

  registerIpcHandlers()
  createWindow()

  initializeAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors)
ipcMain.handle('theme:set', (_, dark: boolean) => {
  nativeTheme.themeSource = dark ? 'dark' : 'light'
})

export { getMainWindow }

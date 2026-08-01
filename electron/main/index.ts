import { app, BrowserWindow, shell, ipcMain, nativeTheme } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { setMainWindow, getMainWindow } from './window'
import { autoUpdater } from 'electron-updater'

const isDev = !app.isPackaged
const appIcon = isDev
  ? join(app.getAppPath(), 'build', 'icon.png')
  : join(process.resourcesPath, 'assets', 'notification-icon.png')

app.setName('DineHub')

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#FFFFFF',
    title: 'DineHub',
    ...(process.platform === 'darwin' ? {} : { icon: appIcon }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
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

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  }

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

import { app, BrowserWindow, dialog, Notification } from 'electron'
import { autoUpdater } from 'electron-updater'
import { getMainWindow } from './window'

export type UpdateStatus = {
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error'
  currentVersion: string
  version?: string
  progress?: number
  message?: string
}

let status: UpdateStatus = { state: 'idle', currentVersion: app.getVersion() }
let initialized = false
let periodicCheck: NodeJS.Timeout | undefined

function publish(next: Partial<UpdateStatus> & Pick<UpdateStatus, 'state'>): UpdateStatus {
  status = { currentVersion: app.getVersion(), ...next }
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('update:status', status)
  }
  return status
}

export function getUpdateStatus(): UpdateStatus {
  return status
}

export async function checkForAppUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    return publish({ state: 'not-available', message: 'Update checks are available in the installed app.' })
  }

  try {
    publish({ state: 'checking' })
    await autoUpdater.checkForUpdates()
  } catch (error) {
    publish({ state: 'error', message: error instanceof Error ? error.message : 'Unable to check for updates.' })
  }
  return status
}

export function installDownloadedUpdate(): boolean {
  if (status.state !== 'downloaded') return false
  setImmediate(() => autoUpdater.quitAndInstall(false, true))
  return true
}

export function initializeAutoUpdater(): void {
  if (initialized || !app.isPackaged) return
  initialized = true
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => publish({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => publish({ state: 'available', version: info.version }))
  autoUpdater.on('download-progress', (progress) => publish({
    state: 'downloading',
    version: status.version,
    progress: Math.round(progress.percent)
  }))
  autoUpdater.on('update-not-available', (info) => publish({ state: 'not-available', version: info.version }))
  autoUpdater.on('error', (error) => publish({ state: 'error', message: error.message }))
  autoUpdater.on('update-downloaded', async (info) => {
    publish({ state: 'downloaded', version: info.version, progress: 100 })

    if (Notification.isSupported()) {
      new Notification({
        title: 'DineHub update ready',
        body: `Version ${info.version} has downloaded and will install automatically when you close the app.`
      }).show()
    }

    const window = getMainWindow()
    if (!window || window.isDestroyed()) return
    const result = await dialog.showMessageBox(window, {
      type: 'info',
      title: 'DineHub update ready',
      message: `DineHub ${info.version} is ready to install.`,
      detail: 'Restart now to finish the automatic update, or choose Later to install when you close the app.',
      buttons: ['Restart & Install', 'Later'],
      defaultId: 0,
      cancelId: 1
    })
    if (result.response === 0) installDownloadedUpdate()
  })

  // Check shortly after every launch, then periodically while the app remains
  // open so long-running POS sessions receive new releases too.
  setTimeout(() => void checkForAppUpdates(), 3000)
  periodicCheck = setInterval(() => void checkForAppUpdates(), 4 * 60 * 60 * 1000)
  periodicCheck.unref()
}

import { BrowserWindow } from 'electron'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

export type PrintDocumentKind = 'kitchen' | 'receipt'

/** Load HTML from a temp file, wait for render, then print. Window stays visible so macOS dialog works. */
export async function printHtmlDocument(html: string, kind: PrintDocumentKind): Promise<void> {
  const file = join(tmpdir(), `dininghub-${kind}-${randomUUID()}.html`)
  await writeFile(file, html, 'utf8')

  const isKitchen = kind === 'kitchen'
  const win = new BrowserWindow({
    show: true,
    width: 400,
    height: 720,
    title: isKitchen ? 'KOT Print' : 'Receipt Print',
    autoHideMenuBar: true,
    webPreferences: { sandbox: false },
  })

  try {
    await win.loadFile(file)
    await new Promise<void>((resolve) => {
      if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', () => resolve())
      } else {
        resolve()
      }
    })
    win.focus()
    await new Promise((resolve) => setTimeout(resolve, 400))

    await new Promise<void>((resolve, reject) => {
      win.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
        if (success) resolve()
        else reject(new Error(failureReason || `${isKitchen ? 'KOT' : 'Receipt'} print cancelled or failed`))
      })
    })
    // Give the OS spooler a moment before closing the preview window.
    await new Promise((resolve) => setTimeout(resolve, 800))
  } finally {
    if (!win.isDestroyed()) win.close()
    await unlink(file).catch(() => undefined)
  }
}

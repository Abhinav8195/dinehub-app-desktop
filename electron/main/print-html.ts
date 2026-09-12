import { BrowserWindow } from 'electron'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

export type PrintDocumentKind = 'kitchen' | 'receipt'

/** Load HTML in a hidden background window and print directly to default printer or via print dialog. */
export async function printHtmlDocument(html: string, kind: PrintDocumentKind): Promise<void> {
  const file = join(tmpdir(), `dininghub-${kind}-${randomUUID()}.html`)
  await writeFile(file, html, 'utf8')

  const win = new BrowserWindow({
    show: false,
    skipTaskbar: true,
    width: 400,
    height: 720,
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
    await new Promise((resolve) => setTimeout(resolve, 300))

    const printers = await win.webContents.getPrintersAsync().catch(() => [])
    const defaultPrinter = printers.find((p) => p.isDefault) || (printers.length === 1 ? printers[0] : null)

    await new Promise<void>((resolve, reject) => {
      // If there is a connected default printer, print directly to it.
      // Otherwise, open the native print dialog popup.
      const trySilent = Boolean(defaultPrinter?.name)
      const printOpts = trySilent
        ? { silent: true, printBackground: true, deviceName: defaultPrinter!.name }
        : { silent: false, printBackground: true }

      win.webContents.print(printOpts, (success, failureReason) => {
        if (success || failureReason === 'cancelled') {
          resolve()
        } else if (trySilent) {
          // Fallback to print dialog popup if silent print was rejected by driver
          win.webContents.print({ silent: false, printBackground: true }, (s2, f2) => {
            if (s2 || f2 === 'cancelled') resolve()
            else reject(new Error(f2 || `${kind} print failed`))
          })
        } else {
          reject(new Error(failureReason || `${kind} print failed`))
        }
      })
    })

    // Allow the spooler time to dispatch the document
    await new Promise((resolve) => setTimeout(resolve, 600))
  } finally {
    if (!win.isDestroyed()) win.close()
    await unlink(file).catch(() => undefined)
  }
}

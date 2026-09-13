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

  const PRINT_TIMEOUT_MS = 12_000

  try {
    await win.loadFile(file)
    await new Promise<void>((resolve) => {
      if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', () => resolve())
      } else {
        resolve()
      }
    })
    await new Promise((resolve) => setTimeout(resolve, 200))

    const printers = await win.webContents.getPrintersAsync().catch(() => [])
    const defaultPrinter = printers.find((p) => p.isDefault) || (printers.length === 1 ? printers[0] : null)

    await new Promise<void>((resolve, reject) => {
      let settled = false
      const finish = (error?: Error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (error) reject(error)
        else resolve()
      }

      // Prefer silent print to the default/connected printer so POS never waits on a modal.
      const trySilent = Boolean(defaultPrinter?.name)
      const printOpts = trySilent
        ? { silent: true, printBackground: true, deviceName: defaultPrinter!.name }
        : { silent: true, printBackground: true }

      const timer = setTimeout(() => finish(), PRINT_TIMEOUT_MS)

      win.webContents.print(printOpts, (success, failureReason) => {
        if (success || failureReason === 'cancelled') {
          finish()
          return
        }
        // Last resort: native dialog (still capped by PRINT_TIMEOUT_MS).
        win.webContents.print({ silent: false, printBackground: true }, (s2, f2) => {
          if (s2 || f2 === 'cancelled') finish()
          else finish(new Error(f2 || failureReason || `${kind} print failed`))
        })
      })
    })

    await new Promise((resolve) => setTimeout(resolve, 400))
  } finally {
    if (!win.isDestroyed()) win.close()
    await unlink(file).catch(() => undefined)
  }
}

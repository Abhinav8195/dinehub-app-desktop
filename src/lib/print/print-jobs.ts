/** Reliable print from the POS screen (Electron + browser). */
function printViaFrame(html: string, title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.title = title
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
    document.body.appendChild(iframe)

    const win = iframe.contentWindow
    const doc = win?.document
    if (!win || !doc) {
      iframe.remove()
      reject(new Error('Print frame could not be created'))
      return
    }

    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }

    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      cleanup()
      if (error) reject(error)
      else resolve()
    }

    doc.open()
    doc.write(html)
    doc.close()

    win.addEventListener('afterprint', () => finish(), { once: true })

    window.setTimeout(() => {
      try {
        win.focus()
        win.print()
      } catch (error) {
        finish(error instanceof Error ? error : new Error('Print failed'))
        return
      }
      // Some Electron builds never fire afterprint — still resolve so KOT flow continues.
      window.setTimeout(() => finish(), 8000)
    }, 300)
  })
}

function openPrintPopup(html: string, title: string) {
  const popup = window.open('', '_blank', 'width=420,height=720')
  if (!popup) throw new Error('Allow pop-ups to print')
  popup.document.write(html)
  popup.document.close()
  popup.document.title = title
  popup.focus()
  popup.print()
}

async function printWithElectronIpc(html: string): Promise<boolean> {
  if (window.electronAPI?.print?.receipt) {
    await window.electronAPI.print.receipt(html)
    return true
  }
  if (window.electronAPI?.printReceipt) {
    await window.electronAPI.printReceipt(html)
    return true
  }
  return false
}

/** Print any receipt/KOT HTML — iframe first (most reliable), then Electron IPC, then popup. */
export async function printReceiptHtml(html: string): Promise<void> {
  if (!html.trim()) throw new Error('Nothing to print')

  try {
    await printViaFrame(html, 'DiningHub Print')
    return
  } catch (frameError) {
    console.warn('[print] frame print failed, trying Electron IPC', frameError)
  }

  try {
    if (await printWithElectronIpc(html)) return
  } catch (ipcError) {
    console.warn('[print] Electron IPC failed, trying popup', ipcError)
  }

  openPrintPopup(html, 'DiningHub Print')
}

/** Kitchen running-order print — prefer kitchen printer IPC, then shared receipt pipeline. */
export async function printKotReceiptHtml(html: string): Promise<void> {
  if (!html.includes('class="receipt"')) {
    throw new Error('Invalid kitchen print document')
  }
  try {
    if (window.electronAPI?.print?.kitchen) {
      await window.electronAPI.print.kitchen(html)
      return
    }
  } catch (error) {
    console.warn('[print] kitchen IPC failed, falling back to receipt print', error)
  }
  await printReceiptHtml(html)
}

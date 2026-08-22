import { useEffect, useState } from 'react'

export type PrinterStatus = 'checking' | 'connected' | 'offline'

type SystemPrinter = {
  name?: string
  displayName?: string
  isDefault?: boolean
  status?: number | string
}

const VIRTUAL_PRINTER = /pdf|xps|onenote|fax|document\s*writer|print\s*to|microsoft\s*print/i

function isPhysicalPrinter(printer: SystemPrinter) {
  const name = `${printer.name ?? ''} ${printer.displayName ?? ''}`.trim()
  if (!name) return false
  return !VIRTUAL_PRINTER.test(name)
}

async function detectPrinters(): Promise<SystemPrinter[]> {
  const api = window.electronAPI
  if (!api?.print?.getPrinters) return []
  try {
    const list = await api.print.getPrinters()
    return Array.isArray(list) ? (list as SystemPrinter[]) : []
  } catch {
    return []
  }
}

/** Polls OS printers via Electron; green when a real (non-PDF) printer is available. */
export function usePrinterStatus(pollMs = 15_000) {
  const [status, setStatus] = useState<PrinterStatus>('checking')
  const [printerName, setPrinterName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      const printers = await detectPrinters()
      if (cancelled) return
      const physical = printers.filter(isPhysicalPrinter)
      const preferred = physical.find((p) => p.isDefault) ?? physical[0]
      if (preferred) {
        setStatus('connected')
        setPrinterName(preferred.displayName || preferred.name || 'Printer')
      } else {
        setStatus('offline')
        setPrinterName(null)
      }
    }

    void refresh()
    const timer = window.setInterval(() => void refresh(), pollMs)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [pollMs])

  return {
    status,
    printerName,
    connected: status === 'connected',
    offline: status === 'offline',
  }
}

import { useEffect } from 'react'

interface UsePosShortcutsOptions {
  enabled?: boolean
  onNewOrder: () => void
  onFocusSearch: () => void
  onSave: () => void
  onPrint: () => void
  onKot: () => void
  onIncreaseQty?: () => void
  onDecreaseQty?: () => void
}

export function usePosShortcuts({
  enabled = true,
  onNewOrder,
  onFocusSearch,
  onSave,
  onPrint,
  onKot,
  onIncreaseQty,
  onDecreaseQty,
}: UsePosShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return

    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      const typing = tag === 'input' || tag === 'textarea' || target?.isContentEditable

      if (event.key === 'Escape' && !typing) {
        // leave for dialogs; no-op here
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        onNewOrder()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        onFocusSearch()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        onSave()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        onPrint()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onKot()
        return
      }

      if (typing) return

      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        onIncreaseQty?.()
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        onDecreaseQty?.()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, onNewOrder, onFocusSearch, onSave, onPrint, onKot, onIncreaseQty, onDecreaseQty])
}

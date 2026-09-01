import { useEffect, useState } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type UpdateStatus = {
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error'
  currentVersion: string
  version?: string
  progress?: number
  message?: string
}

/**
 * Shows download progress when an update is found, then a restart/install dialog.
 * Main-process autoUpdater already checks on launch; this is the in-app UI.
 */
export function UpdateNotifier() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissedBanner, setDismissedBanner] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)

  useEffect(() => {
    const api = window.electronAPI?.updates
    if (!api) return
    void api.getStatus().then((next) => {
      setStatus(next as UpdateStatus)
      if ((next as UpdateStatus).state === 'downloaded') setInstallOpen(true)
    }).catch(() => {})
    return api.onStatus((next) => {
      const s = next as UpdateStatus
      setStatus(s)
      if (s.state === 'downloading' || s.state === 'available' || s.state === 'checking') {
        setDismissedBanner(false)
      }
      if (s.state === 'downloaded') setInstallOpen(true)
    })
  }, [])

  if (!status) return null

  const showBanner =
    !dismissedBanner &&
    (status.state === 'checking' ||
      status.state === 'available' ||
      status.state === 'downloading' ||
      status.state === 'downloaded')

  const progress = Math.min(100, Math.max(0, status.progress ?? (status.state === 'downloaded' ? 100 : 0)))

  const install = () => {
    void window.electronAPI?.updates.install()
  }

  return (
    <>
      {showBanner && (
        <div
          className={cn(
            'pointer-events-auto fixed inset-x-0 top-0 z-[100] border-b bg-foreground px-4 py-2 text-background shadow-lg',
          )}
          role="status"
        >
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
            <RefreshCw className={cn('h-4 w-4 shrink-0', status.state === 'checking' || status.state === 'downloading' ? 'animate-spin' : '')} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {status.state === 'checking' && 'Checking for DiningHub updates…'}
                {status.state === 'available' && `Update ${status.version} found — downloading…`}
                {status.state === 'downloading' && `Downloading DiningHub ${status.version ?? ''} — ${progress}%`}
                {status.state === 'downloaded' && `DiningHub ${status.version} is ready to install`}
              </p>
              {(status.state === 'downloading' || status.state === 'downloaded' || status.state === 'available') && (
                <Progress value={progress} className="mt-1.5 h-1.5 bg-background/20" />
              )}
            </div>
            {status.state === 'downloaded' && (
              <Button type="button" size="sm" variant="secondary" onClick={() => setInstallOpen(true)}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Install
              </Button>
            )}
            <button
              type="button"
              className="rounded p-1 text-background/70 hover:bg-background/10 hover:text-background"
              aria-label="Dismiss update banner"
              onClick={() => setDismissedBanner(true)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <Dialog open={installOpen && status.state === 'downloaded'} onOpenChange={setInstallOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update ready</DialogTitle>
            <DialogDescription>
              DiningHub <strong>{status.version}</strong> has finished downloading. Restart now to install,
              or choose Later — it will install when you quit the app.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setInstallOpen(false)}>
              Later
            </Button>
            <Button type="button" onClick={install}>
              <Download className="mr-2 h-4 w-4" /> Restart &amp; Install
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

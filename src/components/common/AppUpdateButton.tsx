import { useEffect, useState } from 'react'
import { CheckCircle2, Download, RefreshCw, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type UpdateStatus = Awaited<ReturnType<typeof window.electronAPI.updates.getStatus>>

export function AppUpdateButton() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)

  useEffect(() => {
    window.electronAPI.updates.getStatus().then(setStatus).catch(() => {})
    return window.electronAPI.updates.onStatus(setStatus)
  }, [])

  const check = async () => {
    const next = await window.electronAPI.updates.check()
    setStatus(next)
    if (next.state === 'not-available') toast.success(`DiningHub ${next.currentVersion} is up to date`)
    if (next.state === 'error') toast.error(next.message || 'Unable to check for updates')
  }

  const busy = status?.state === 'checking' || status?.state === 'available' || status?.state === 'downloading'
  const downloaded = status?.state === 'downloaded'
  const label = downloaded
    ? 'Restart & Install'
    : status?.state === 'downloading'
      ? `Updating ${status.progress ?? 0}%`
      : status?.state === 'available'
        ? 'Downloading update'
        : status?.state === 'checking'
          ? 'Checking update'
          : 'Check Update'
  const tooltip = status?.state === 'error'
    ? status.message || 'Update check failed'
    : downloaded
      ? `DiningHub ${status.version} is ready to install`
      : `Current version: ${status?.currentVersion ?? 'unknown'}`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={downloaded ? 'default' : 'outline'}
          className="gap-1.5"
          disabled={busy}
          onClick={() => downloaded ? window.electronAPI.updates.install() : void check()}
        >
          {downloaded ? <RotateCcw className="h-4 w-4" />
            : busy ? <Download className="h-4 w-4 animate-pulse" />
              : status?.state === 'not-available' ? <CheckCircle2 className="h-4 w-4" />
                : <RefreshCw className="h-4 w-4" />}
          <span className="hidden 2xl:inline">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

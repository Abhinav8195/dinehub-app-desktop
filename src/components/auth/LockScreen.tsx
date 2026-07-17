import { useState } from 'react'
import { Delete } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useShiftStore } from '@/store/shiftStore'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { BRAND } from '@/constants/brand'
import { ApiError } from '@/api/types/common'

export function LockScreen() {
  const { user } = useAuth()
  const unlockScreen = useShiftStore((s) => s.unlockScreen)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  const appendDigit = (digit: string) => {
    if (pin.length < 6) setPin((prev) => prev + digit)
  }

  const handleUnlock = async () => {
    if (pin.length < 4) {
      toast.error('Enter your 4-6 digit PIN')
      return
    }
    setLoading(true)
    try {
      await unlockScreen(pin)
      setPin('')
      toast.success('Unlocked')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unlock failed')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-dark/95 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl border border-border/20 bg-card p-8 shadow-2xl text-center">
        <BrandLogo size="md" orientation="vertical" className="mx-auto mb-4" subtitle="Screen Locked" />
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.firstName} {user?.lastName} · Enter PIN to continue
        </p>

        <Input
          type="password"
          inputMode="numeric"
          value={'•'.repeat(pin.length)}
          readOnly
          className="mt-6 text-center text-2xl tracking-[0.5em] font-mono"
          placeholder="••••"
        />

        <div className="mt-6 grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              className="h-14 text-lg"
              onClick={() => {
                if (key === 'C') setPin('')
                else if (key === '⌫') setPin((prev) => prev.slice(0, -1))
                else appendDigit(key)
              }}
            >
              {key === '⌫' ? <Delete className="h-5 w-5" /> : key}
            </Button>
          ))}
        </div>

        <Button type="button" className="mt-6 w-full" onClick={handleUnlock} disabled={loading}>
          Unlock
        </Button>
      </div>
    </div>
  )
}

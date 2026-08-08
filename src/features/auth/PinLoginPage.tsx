import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Delete, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/api/auth.api'
import { tokenBridge } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { BRAND } from '@/constants/brand'
import { ApiError } from '@/api/types/common'

export default function PinLoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [staffLoginId, setStaffLoginId] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  const appendDigit = (digit: string) => {
    if (pin.length < 6) setPin((prev) => prev + digit)
  }

  const handleLogin = async () => {
    if (!staffLoginId.trim()) {
      toast.error('Enter staff login ID')
      return
    }
    if (pin.length < 4) {
      toast.error('Enter your PIN')
      return
    }
    setLoading(true)
    try {
      const deviceId = await tokenBridge.getDeviceId()
      const result = await authApi.pinLogin({
        staffLoginId: staffLoginId.trim(),
        pin,
        deviceName: 'DineHub POS',
        deviceType: 'pos',
        deviceId
      })
      setUser(result.user)
      useAuthStore.setState({ isAuthenticated: true })
      toast.success(`Welcome, ${result.user.firstName}!`)
      navigate('/app/pos', { replace: true })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'PIN login failed')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
      <Card className="w-full max-w-md border-border/20">
        <CardHeader className="text-center">
          <BrandLogo size="md" orientation="vertical" subtitle="POS PIN Login" className="mx-auto mb-2" />
          <CardTitle>Quick Staff Login</CardTitle>
          <CardDescription>Enter your staff login ID and PIN for {BRAND.name} POS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Staff Login ID</Label>
            <Input
              value={staffLoginId}
              onChange={(e) => setStaffLoginId(e.target.value)}
              placeholder="e.g. DH-7K2M9Q"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label>PIN</Label>
            <Input
              readOnly
              value={'•'.repeat(pin.length)}
              placeholder="••••"
              className="text-center text-2xl tracking-[0.5em]"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                className="h-12"
                onClick={() => {
                  if (key === 'C') setPin('')
                  else if (key === '⌫') setPin((prev) => prev.slice(0, -1))
                  else appendDigit(key)
                }}
              >
                {key === '⌫' ? <Delete className="h-4 w-4" /> : key}
              </Button>
            ))}
          </div>

          <Button type="button" className="w-full" onClick={handleLogin} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Sign In with PIN
          </Button>

          <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate('/login')}>
            Use email login instead
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

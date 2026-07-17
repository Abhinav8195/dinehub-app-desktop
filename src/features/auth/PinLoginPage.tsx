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
import { useTenantStore } from '@/store/tenantStore'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { BRAND } from '@/constants/brand'
import { ApiError } from '@/api/types/common'

export default function PinLoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [tenantSlug, setTenantSlug] = useState('demo-restaurant')
  const [employeeCode, setEmployeeCode] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  const appendDigit = (digit: string) => {
    if (pin.length < 6) setPin((prev) => prev + digit)
  }

  const handleLogin = async () => {
    if (!employeeCode.trim()) {
      toast.error('Enter employee code')
      return
    }
    if (pin.length < 4) {
      toast.error('Enter your PIN')
      return
    }
    setLoading(true)
    try {
      await tokenBridge.setTenantSlug(tenantSlug.trim())
      const deviceId = await tokenBridge.getDeviceId()
      const result = await authApi.pinLogin({
        tenantSlug: tenantSlug.trim(),
        employeeCode: employeeCode.trim(),
        pin,
        deviceName: 'DineHub POS',
        deviceType: 'pos',
        deviceId
      })
      await tokenBridge.setTokens(result.tokens.accessToken, result.tokens.refreshToken)
      setUser(result.user)
      useAuthStore.setState({ isAuthenticated: true })
      useTenantStore.setState({ slug: tenantSlug.trim() })
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
          <CardDescription>Enter employee code and PIN for {BRAND.name} POS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tenant</Label>
            <Input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Employee Code</Label>
            <Input
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="e.g. 2001"
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

          <p className="text-center text-xs text-muted-foreground">
            Demo cashier: 2001 / PIN 4321
          </p>
          <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate('/login')}>
            Use email login instead
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, Building2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { BRAND } from '@/constants/brand'

const loginSchema = z.object({
  tenantSlug: z.string().min(1, 'Tenant slug is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, isAuthenticated } = useAuth()
  const { branding, resolveBranding, isResolving } = useTenant()
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<'tenant' | 'credentials'>('tenant')

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app'

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenantSlug: 'demo-restaurant',
      email: '',
      password: ''
    }
  })

  const tenantSlug = watch('tenantSlug')

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, navigate, from])

  const handleResolveTenant = async () => {
    if (!tenantSlug.trim()) return
    try {
      await resolveBranding(tenantSlug.trim())
      setStep('credentials')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Tenant not found'
      toast.error(msg)
    }
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password, data.tenantSlug)
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Login failed'
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center brand-auth-bg dark:bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <BrandLogo size="lg" orientation="vertical" subtitle={branding?.name || BRAND.tagline} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight">
            {branding?.name || BRAND.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{BRAND.tagline}</p>
        </div>

        <Card className="shadow-elevated border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {step === 'tenant' ? 'Select Restaurant' : 'Sign In'}
            </CardTitle>
            <CardDescription>
              {step === 'tenant'
                ? 'Enter your restaurant tenant slug to continue'
                : 'Enter your credentials to access the dashboard'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {step === 'tenant' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="tenantSlug">Tenant Slug</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="tenantSlug"
                        placeholder="e.g. demo-restaurant"
                        className="pl-9"
                        {...register('tenantSlug')}
                      />
                    </div>
                    {errors.tenantSlug && <p className="text-xs text-danger">{errors.tenantSlug.message}</p>}
                  </div>
                  <Button type="button" className="w-full" onClick={handleResolveTenant} disabled={isResolving}>
                    {isResolving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                    Continue
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Dev: <button type="button" className="text-primary hover:underline" onClick={() => { setValue('tenantSlug', 'demo-restaurant'); handleResolveTenant() }}>demo-restaurant</button>
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted text-sm">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium truncate">{branding?.name || tenantSlug}</span>
                    <button type="button" className="ml-auto text-xs text-primary hover:underline" onClick={() => setStep('tenant')}>Change</button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="owner@demo-restaurant.com" {...register('email')} />
                    {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>

                  <div className="flex items-center justify-between text-xs">
                    <button type="button" className="text-primary hover:underline" onClick={() => navigate('/forgot-password')}>
                      Forgot password?
                    </button>
                    <button type="button" className="text-primary hover:underline" onClick={() => navigate('/pin-login')}>
                      POS PIN login
                    </button>
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    Demo: owner@demo-restaurant.com / Owner@123
                  </p>
                </>
              )}
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {BRAND.name} Desktop v{BRAND.version} · Secure Authentication
        </p>
      </motion.div>
    </div>
  )
}

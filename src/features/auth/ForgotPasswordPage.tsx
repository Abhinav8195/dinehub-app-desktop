import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/api/auth.api'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { ApiError } from '@/api/types/common'

const schema = z.object({
  email: z.string().email('Invalid email'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' }
  })

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.forgotPassword(data)
      setSent(true)
      toast.success('If the email exists, a reset link has been sent')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Request failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center brand-auth-bg p-4">
      <Card className="w-full max-w-md shadow-elevated border-0">
        <CardHeader className="text-center">
          <BrandLogo size="md" orientation="vertical" className="mx-auto mb-4" />
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            {sent ? 'Check your email for reset instructions.' : 'Enter your email to receive a reset link.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="owner@demo-restaurant.com" {...register('email')} />
                {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Reset Link
              </Button>
            </form>
          ) : (
            <Button className="w-full" onClick={() => navigate('/login')}>Back to Login</Button>
          )}
          <Button type="button" variant="ghost" className="w-full mt-3" onClick={() => navigate('/login')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

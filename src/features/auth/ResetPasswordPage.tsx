import { useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { authApi } from '@/api/auth.api'
import { formatApiError } from '@/api/management-utils'

const schema = z.object({
  password: z.string().min(8, 'Minimum 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() || ''
  const [done, setDone] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  })

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error('This reset link is missing a token. Request a new one from Forgot Password.')
      return
    }
    try {
      await authApi.resetPassword({ token, newPassword: data.password })
      setDone(true)
      toast.success('Password updated. You can sign in now.')
    } catch (error) {
      toast.error(formatApiError(error, 'Could not reset password. The link may have expired.'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center brand-auth-bg p-4">
      <Card className="w-full max-w-md shadow-elevated border-0">
        <CardHeader className="text-center">
          <BrandLogo size="md" orientation="vertical" className="mx-auto mb-4" />
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            {done ? 'Your password was updated.' : 'Enter a new password for your DineHub account.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!token && !done && (
            <p className="mb-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              Invalid reset link. Use Forgot Password on the login screen to get a new email.
            </p>
          )}
          {done ? (
            <Button asChild className="w-full"><Link to="/login">Go to login</Link></Button>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>New password</Label>
                <Input type="password" {...register('password')} />
                {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Confirm password</Label>
                <Input type="password" {...register('confirm')} />
                {errors.confirm && <p className="text-xs text-danger">{errors.confirm.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting || !token}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update password
              </Button>
            </form>
          )}
          <Button asChild variant="ghost" className="mt-3 w-full"><Link to="/forgot-password">Request a new link</Link></Button>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, Shield, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { authApi } from '@/api/auth.api'
import { useAuth } from '@/hooks/useAuth'
import { APP_BASE } from '@/constants/navigation'
import { ApiError } from '@/api/types/common'
import { getInitials } from '@/lib/utils'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string()
}).refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

type PasswordForm = z.infer<typeof passwordSchema>

export default function AccountSettingsPage() {
  const navigate = useNavigate()
  const { user, logout, fetchMe } = useAuth()
  const [logoutAll, setLogoutAll] = useState(false)

  const { isLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => fetchMe()
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema)
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordForm) => authApi.changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    }),
    onSuccess: () => { toast.success('Password changed'); reset() },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to change password')
  })

  const handleLogout = async () => {
    await logout(logoutAll)
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <PageShell isLoading={isLoading}>
      <div className="page-container">
        <PageHeader title="Account Settings" description="Manage your profile and security" />

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile"><User className="h-3.5 w-3.5 mr-1" /> Profile</TabsTrigger>
            <TabsTrigger value="security"><Lock className="h-3.5 w-3.5 mr-1" /> Security</TabsTrigger>
            <TabsTrigger value="sessions"><Shield className="h-3.5 w-3.5 mr-1" /> Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Profile Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {getInitials(user?.fullName || `${user?.firstName} ${user?.lastName}` || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-semibold">{user?.firstName} {user?.lastName}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <div className="flex gap-1 mt-2">
                      {user?.roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
                      {user?.isSuperAdmin && <Badge>Super Admin</Badge>}
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 max-w-lg">
                  <div><Label className="text-muted-foreground">First Name</Label><p className="font-medium">{user?.firstName}</p></div>
                  <div><Label className="text-muted-foreground">Last Name</Label><p className="font-medium">{user?.lastName}</p></div>
                  <div><Label className="text-muted-foreground">Email Verified</Label><p className="font-medium">{user?.emailVerified ? 'Yes' : 'No'}</p></div>
                  <div><Label className="text-muted-foreground">Permissions</Label><p className="font-medium">{user?.permissions.length ?? 0} granted</p></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Change Password</CardTitle>
                <CardDescription>POST /auth/change-password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit((d) => changePasswordMutation.mutate(d))} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input type="password" {...register('currentPassword')} />
                    {errors.currentPassword && <p className="text-xs text-danger">{errors.currentPassword.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" {...register('newPassword')} />
                    {errors.newPassword && <p className="text-xs text-danger">{errors.newPassword.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input type="password" {...register('confirmPassword')} />
                    {errors.confirmPassword && <p className="text-xs text-danger">{errors.confirmPassword.message}</p>}
                  </div>
                  <Button type="submit" disabled={changePasswordMutation.isPending}>Update Password</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base text-danger">Sign Out</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Sign out of this device or all devices</p>
                  <label className="flex items-center gap-2 mt-2 text-sm">
                    <input type="checkbox" checked={logoutAll} onChange={(e) => setLogoutAll(e.target.checked)} />
                    Sign out all devices
                  </label>
                </div>
                <Button variant="destructive" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <Button variant="outline" onClick={() => navigate(`${APP_BASE}/sessions`)}>Manage Active Sessions →</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  )
}

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, Shield, LogOut, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { billingApi } from '@/api/phase2.api'
import { useAuth } from '@/hooks/useAuth'
import { APP_BASE } from '@/constants/navigation'
import { formatApiError } from '@/api/management-utils'
import { formatDate, getInitials } from '@/lib/utils'
import { isSubscriptionActive, subscriptionDaysLeft, subscriptionExpiryDate } from '@/lib/entitlements'
import { useAuthStore } from '@/store/authStore'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm your new password')
}).refine((d) => d.newPassword === d.confirmPassword, { message: 'New passwords do not match', path: ['confirmPassword'] })
.refine((d) => d.newPassword !== d.currentPassword, { message: 'New password must be different from current password', path: ['newPassword'] })

const pinSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your account password to confirm'),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits only'),
  confirmPin: z.string().min(1, 'Confirm your PIN')
}).refine((d) => d.pin === d.confirmPin, { message: 'PINs do not match', path: ['confirmPin'] })

type PasswordForm = z.infer<typeof passwordSchema>
type PinForm = z.infer<typeof pinSchema>

export default function AccountSettingsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, logout, fetchMe } = useAuth()
  const setUser = useAuthStore((s) => s.setUser)
  const [logoutAll, setLogoutAll] = useState(false)
  const tabParam = searchParams.get('tab')
  const activeTab = tabParam === 'plan' || tabParam === 'security' || tabParam === 'sessions' || tabParam === 'profile'
    ? tabParam
    : 'profile'

  const { isLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => fetchMe()
  })

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: billingApi.subscription,
  })

  const planEnds = subscriptionExpiryDate(subscription)
  const daysLeft = subscriptionDaysLeft(subscription)
  const planActive = isSubscriptionActive(subscription)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const {
    register: registerPin,
    handleSubmit: handlePinSubmit,
    reset: resetPin,
    formState: { errors: pinErrors }
  } = useForm<PinForm>({
    resolver: zodResolver(pinSchema),
    defaultValues: { currentPassword: '', pin: '', confirmPin: '' },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordForm) => authApi.changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    }),
    onSuccess: () => {
      toast.success('Password updated. Use the new password next time you sign in.')
      reset()
    },
    onError: (err) => toast.error(formatApiError(err, 'Could not change password. Check your current password and try again.'))
  })

  const setPinMutation = useMutation({
    mutationFn: (data: PinForm) => authApi.setPin({
      pin: data.pin,
      currentPassword: data.currentPassword
    }),
    onSuccess: async () => {
      toast.success(user?.hasPin ? 'Lock PIN updated' : 'Lock PIN created — you can lock the screen now')
      resetPin()
      try {
        const me = await fetchMe()
        if (!me.hasPin && user) setUser({ ...user, ...me, hasPin: true })
      } catch {
        if (user) setUser({ ...user, hasPin: true })
      }
    },
    onError: (err) => toast.error(formatApiError(err, 'Could not save PIN. Check your account password and try again.'))
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

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const next = new URLSearchParams(searchParams)
            if (value === 'profile') next.delete('tab')
            else next.set('tab', value)
            setSearchParams(next, { replace: true })
          }}
        >
          <TabsList>
            <TabsTrigger value="profile"><User className="h-3.5 w-3.5 mr-1" /> Profile</TabsTrigger>
            <TabsTrigger value="plan"><CreditCard className="h-3.5 w-3.5 mr-1" /> Plan</TabsTrigger>
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

          <TabsContent value="plan" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subscription &amp; plan validity</CardTitle>
                <CardDescription>
                  Same plan details as Subscription / SaaS billing, with days left until expiry.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                {subscriptionLoading && <p className="text-sm text-muted-foreground">Loading plan…</p>}
                {!subscriptionLoading && !subscription && (
                  <p className="text-sm text-muted-foreground">No subscription found for this restaurant.</p>
                )}
                {subscription && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-semibold">{subscription.plan?.name ?? 'Plan'}</p>
                      <Badge variant={planActive ? 'success' : 'destructive'}>
                        {subscription.status}
                      </Badge>
                      {daysLeft !== null && (
                        <Badge variant={daysLeft <= 7 ? 'warning' : 'secondary'}>
                          {daysLeft === 0 ? 'Expired' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Billing cycle</Label>
                        <p className="font-medium">{subscription.billingCycle ?? '—'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Amount</Label>
                        <p className="font-medium">
                          {subscription.currency ?? 'INR'} {Number(subscription.amount ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Started</Label>
                        <p className="font-medium">{subscription.startsAt ? formatDate(subscription.startsAt) : '—'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Next / expiry date</Label>
                        <p className="font-medium">{planEnds ? formatDate(planEnds.toISOString()) : '—'}</p>
                      </div>
                      {subscription.trialEndsAt && (
                        <div>
                          <Label className="text-muted-foreground">Trial ends</Label>
                          <p className="font-medium">{formatDate(subscription.trialEndsAt)}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-muted-foreground">Auto renew</Label>
                        <p className="font-medium">{subscription.autoRenew === false ? 'Off' : 'On'}</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => navigate(`${APP_BASE}/saas`)}>
                      Open full subscription details
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Change Password</CardTitle>
                <CardDescription>
                  Enter your current password, then choose a new password (at least 8 characters).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit((d) => changePasswordMutation.mutate(d))} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input type="password" autoComplete="current-password" {...register('currentPassword')} />
                    {errors.currentPassword && <p className="text-xs text-danger">{errors.currentPassword.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" autoComplete="new-password" {...register('newPassword')} />
                    {errors.newPassword && <p className="text-xs text-danger">{errors.newPassword.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input type="password" autoComplete="new-password" {...register('confirmPassword')} />
                    {errors.confirmPassword && <p className="text-xs text-danger">{errors.confirmPassword.message}</p>}
                  </div>
                  <Button type="submit" disabled={changePasswordMutation.isPending}>
                    {changePasswordMutation.isPending ? 'Updating…' : 'Update Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {user?.hasPin ? 'Update Lock PIN' : 'Create Lock PIN'}
                  {user?.hasPin && <Badge variant="success">PIN active</Badge>}
                </CardTitle>
                <CardDescription>
                  Required before using the lock screen. Enter your account password to confirm, then a 4–6 digit PIN.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePinSubmit((d) => setPinMutation.mutate(d))} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>Account Password</Label>
                    <Input type="password" autoComplete="current-password" {...registerPin('currentPassword')} />
                    {pinErrors.currentPassword && <p className="text-xs text-danger">{pinErrors.currentPassword.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>New PIN (4–6 digits)</Label>
                    <Input type="password" inputMode="numeric" maxLength={6} autoComplete="off" {...registerPin('pin')} />
                    {pinErrors.pin && <p className="text-xs text-danger">{pinErrors.pin.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm PIN</Label>
                    <Input type="password" inputMode="numeric" maxLength={6} autoComplete="off" {...registerPin('confirmPin')} />
                    {pinErrors.confirmPin && <p className="text-xs text-danger">{pinErrors.confirmPin.message}</p>}
                  </div>
                  <Button type="submit" disabled={setPinMutation.isPending}>
                    {setPinMutation.isPending ? 'Saving…' : user?.hasPin ? 'Update PIN' : 'Create PIN'}
                  </Button>
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

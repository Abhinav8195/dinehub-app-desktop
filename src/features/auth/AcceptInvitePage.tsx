import { useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { invitesApi } from '@/api/phase2.api'
import { formatApiError } from '@/api/management-utils'

export default function AcceptInvitePage() {
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const canSubmit = useMemo(
    () => Boolean(token) && password.length >= 8 && password === confirm,
    [token, password, confirm]
  )

  const handleAccept = async () => {
    if (!token) {
      toast.error('This invite link is missing a token. Ask your manager to resend the invite.')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await invitesApi.accept(token, password)
      setDone(true)
      toast.success('Invite accepted. You can sign in now.')
    } catch (error) {
      toast.error(formatApiError(error, 'Could not accept this invite. It may be expired.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <BrandLogo size="md" orientation="vertical" className="mx-auto mb-2" />
          <CardTitle>Accept invitation</CardTitle>
          <CardDescription>Set your password to join the restaurant team on DineHub.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token && (
            <p className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              Invalid invite link. Open the link from your email, or ask an admin to send a new invite.
            </p>
          )}
          {done ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">Your account is ready.</p>
              <Button asChild className="w-full"><Link to="/login">Go to login</Link></Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>New password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
              </div>
              <div className="space-y-2">
                <Label>Confirm password</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone (optional)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
              </div>
              <Button className="w-full" disabled={!canSubmit || loading} onClick={() => void handleAccept()}>
                {loading ? 'Saving…' : 'Accept invite'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Already have access? <Link className="underline" to="/login">Sign in</Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

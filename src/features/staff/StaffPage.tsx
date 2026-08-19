import { useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { APP_BASE } from '@/constants/navigation'

/** Duplicate of User Management — kept as a clear redirect / coming-soon notice. */
export default function StaffPage() {
  const navigate = useNavigate()
  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Staff & Permissions" description="This area moved to User Management" />
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Feature coming soon here</CardTitle>
            <CardDescription>
              Staff logins, roles, and permissions are managed under <strong>User Management</strong> and <strong>Roles &amp; Permissions</strong>.
              This separate page will not be used so you do not see the same controls twice.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => navigate(`${APP_BASE}/users`)}>Open User Management</Button>
            <Button variant="outline" onClick={() => navigate(`${APP_BASE}/roles`)}>Open Roles &amp; Permissions</Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

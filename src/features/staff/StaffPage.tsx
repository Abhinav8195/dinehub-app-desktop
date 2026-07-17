import { Shield, Plus, Check } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

const ROLES = [
  { role: 'Owner', count: 1, color: 'bg-purple-500' },
  { role: 'Admin', count: 2, color: 'bg-primary' },
  { role: 'Manager', count: 3, color: 'bg-info' },
  { role: 'Cashier', count: 5, color: 'bg-success' },
  { role: 'Waiter', count: 12, color: 'bg-warning' },
  { role: 'Chef', count: 6, color: 'bg-danger' }
]

const PERMISSIONS = ['Dashboard', 'POS', 'Orders', 'Menu', 'Inventory', 'Reports', 'Settings', 'Staff Management']

const STAFF = [
  { name: 'Alex Morgan', role: 'Manager', permissions: 8 },
  { name: 'Chris Taylor', role: 'Chef', permissions: 4 },
  { name: 'Jordan Lee', role: 'Waiter', permissions: 3 },
  { name: 'Sam Wilson', role: 'Cashier', permissions: 5 }
]

export default function StaffPage() {
  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Staff Management" description="Roles, permissions, and access control" actions={
          <Button><Plus className="h-4 w-4 mr-2" /> Add Staff</Button>
        } />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {ROLES.map((r) => (
            <Card key={r.role} className="hover:shadow-elevated transition-all">
              <CardContent className="p-4 text-center">
                <div className={`h-10 w-10 rounded-xl ${r.color} mx-auto mb-2 flex items-center justify-center text-white font-bold`}>{r.count}</div>
                <p className="font-medium text-sm">{r.role}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Permission Matrix</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {STAFF.map((s) => (
                  <div key={s.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{getInitials(s.name)}</AvatarFallback></Avatar>
                      <div><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.role}</p></div>
                    </div>
                    <Badge variant="secondary">{s.permissions}/{PERMISSIONS.length}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Role Permissions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {PERMISSIONS.map((perm) => (
                  <div key={perm} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm">{perm}</span>
                    <div className="flex gap-3">
                      <Check className="h-4 w-4 text-success" />
                      <Switch defaultChecked />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}

import { Shield, Plus, Check } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { employeesApi, rolesApi } from '@/api/phase1.api'

type StaffRow = {
  id: string
  firstName?: string
  lastName?: string
  userType?: string
  userRoles?: Array<{ role?: { name?: string; rolePermissions?: unknown[] } }>
}

type RoleRow = {
  id: string
  name: string
  rolePermissions?: unknown[]
  permissions?: unknown[]
}

function rowsFrom<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const nested = (value as { data?: unknown }).data
    if (Array.isArray(nested)) return nested as T[]
  }
  return []
}

export default function StaffPage() {
  const employeesQuery = useQuery({ queryKey: ['staff-management', 'employees'], queryFn: employeesApi.list })
  const rolesQuery = useQuery({ queryKey: ['staff-management', 'roles'], queryFn: rolesApi.list })
  const staff = rowsFrom<StaffRow>(employeesQuery.data)
  const roleRows = rowsFrom<RoleRow>(rolesQuery.data)
  return (
    <PageShell
      isLoading={employeesQuery.isLoading || rolesQuery.isLoading}
      isError={employeesQuery.isError || rolesQuery.isError}
      onRetry={() => {
        void employeesQuery.refetch()
        void rolesQuery.refetch()
      }}
    >
      <div className="page-container">
        <PageHeader title="Staff Management" description="Roles, permissions, and access control" actions={
          <Button><Plus className="h-4 w-4 mr-2" /> Add Staff</Button>
        } />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {roleRows.map((r) => (
            <Card key={r.id} className="hover:shadow-elevated transition-all">
              <CardContent className="p-4 text-center">
                <div className="h-10 w-10 rounded-xl bg-primary mx-auto mb-2 flex items-center justify-center text-white font-bold">{staff.filter((employee) => employee.userRoles?.some((assignment) => assignment.role?.name === r.name) || employee.userType === r.name).length}</div>
                <p className="font-medium text-sm">{r.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Permission Matrix</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {staff.map((s) => {
                  const name = `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || 'Unnamed employee'
                  const role = s.userRoles?.[0]?.role?.name ?? s.userType ?? 'Staff'
                  const permissionCount = s.userRoles?.[0]?.role?.rolePermissions?.length ?? 0
                  return <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback></Avatar>
                      <div><p className="text-sm font-medium">{name}</p><p className="text-xs text-muted-foreground">{role}</p></div>
                    </div>
                    <Badge variant="secondary">{permissionCount} permissions</Badge>
                  </div>
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Role Permissions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {roleRows.map((role) => (
                  <div key={role.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm">{role.name}</span>
                    <div className="flex gap-3">
                      <Check className="h-4 w-4 text-success" />
                      <Switch checked={false} disabled aria-label={`${role.name} permission editor pending`} />
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

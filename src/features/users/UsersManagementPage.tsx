import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Edit, Trash2, Mail, Shield, UserPlus, Building2, Search, MoreHorizontal, Key
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { APP_BASE } from '@/constants/navigation'
import { getInitials, formatDateTime } from '@/lib/utils'
import { PermissionGuard } from '@/guards/PermissionGuard'
import { userManagementApi } from '@/api/users-management.api'
import { invitesApi } from '@/api/phase2.api'
import { employeesApi } from '@/api/phase1.api'
import { authApi } from '@/api/auth.api'
import { formatApiError } from '@/api/management-utils'
import type { User as ApiUser } from '@/api/types/management.types'

type User = {
  id: string
  name: string
  email: string
  phone?: string
  firstName?: string
  lastName?: string
  userType?: string
  role: string
  roleIds: string[]
  department?: string
  status: string
  lastLogin?: string
  permissions: number
  avatar?: string | null
}

type Invite = { id: string; email?: string; expiresAt?: string; user?: { email?: string; firstName?: string; lastName?: string }; createdAt?: string }

/** UI staff role → Prisma UserType */
const STAFF_ROLES = [
  { label: 'Owner', userType: 'OWNER' },
  { label: 'Admin', userType: 'ADMIN' },
  { label: 'Manager', userType: 'RESTAURANT_MANAGER' },
  { label: 'Cashier', userType: 'CASHIER' },
  { label: 'Waiter', userType: 'WAITER' },
  { label: 'Chef', userType: 'CHEF' },
  { label: 'Delivery', userType: 'DELIVERY_BOY' },
] as const

const TAB_ROUTES: Record<string, string> = {
  all: `${APP_BASE}/users`,
  roles: `${APP_BASE}/users/roles`,
  departments: `${APP_BASE}/users/departments`,
  invites: `${APP_BASE}/users/invites`,
}

function mapApiUser(user: ApiUser): User {
  const roles = Array.isArray(user.roles) ? user.roles : []
  return {
    id: user.id,
    name: user.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? '',
    userType: user.userType,
    role: roles.map((role) => role.name).filter(Boolean).join(', ') || user.userType || 'Staff',
    roleIds: roles.map((role) => role.id).filter(Boolean),
    department: user.department?.name,
    status: String(user.status || 'ACTIVE').toLowerCase().replace('_', '-'),
    lastLogin: user.lastLoginAt ?? undefined,
    permissions: user.permissionCount ?? 0,
  }
}

function mapEmployeeRow(row: Record<string, unknown>): User {
  const id = String(row.id ?? '')
  const firstName = String(row.firstName ?? '')
  const lastName = String(row.lastName ?? '')
  const email = String(row.email ?? '')
  const userType = String(row.userType ?? 'WAITER')
  const userRoles = Array.isArray(row.userRoles) ? row.userRoles as Array<{ role?: { id?: string; name?: string } }> : []
  const roleNames = userRoles.map((entry) => entry.role?.name).filter(Boolean) as string[]
  const roleIds = userRoles.map((entry) => entry.role?.id).filter(Boolean) as string[]
  const department = typeof row.department === 'string'
    ? row.department
    : (row.department as { name?: string } | null | undefined)?.name
  return {
    id,
    name: `${firstName} ${lastName}`.trim() || email || 'Staff',
    firstName,
    lastName,
    email,
    phone: row.phone ? String(row.phone) : '',
    userType,
    role: roleNames.join(', ') || userType,
    roleIds,
    department,
    status: String(row.status ?? 'ACTIVE').toLowerCase().replace('_', '-'),
    lastLogin: row.lastLoginAt ? String(row.lastLoginAt) : undefined,
    permissions: 0,
  }
}

export default function UsersManagementPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: managedUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await userManagementApi.list({ limit: 100 })).data.map(mapApiUser),
  })

  const { data: employeeRows = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const rows = await employeesApi.list()
        return Array.isArray(rows) ? rows as Record<string, unknown>[] : []
      } catch {
        return []
      }
    },
  })

  const users = useMemo(() => {
    const byId = new Map<string, User>()
    for (const user of managedUsers) byId.set(user.id, user)
    for (const row of employeeRows) {
      const mapped = mapEmployeeRow(row)
      if (!mapped.id) continue
      const existing = byId.get(mapped.id)
      if (!existing) {
        byId.set(mapped.id, mapped)
        continue
      }
      byId.set(mapped.id, {
        ...existing,
        role: existing.role && existing.role !== existing.userType ? existing.role : mapped.role,
        roleIds: existing.roleIds.length ? existing.roleIds : mapped.roleIds,
        department: existing.department || mapped.department,
        phone: existing.phone || mapped.phone,
      })
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [managedUsers, employeeRows])

  const { data: apiDepartments = [] } = useQuery({ queryKey: ['users', 'departments'], queryFn: invitesApi.listDepartments })
  const { data: invites = [] } = useQuery({ queryKey: ['users', 'invites'], queryFn: invitesApi.list })
  const { data: rolesResult } = useQuery({
    queryKey: ['auth', 'roles', 'user-assign'],
    queryFn: () => authApi.getRoles({ limit: 100 }),
  })
  const assignableRoles = rolesResult?.data ?? []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [rolesOpen, setRolesOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: 'Waiter', status: 'ACTIVE' })
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'Waiter', department: 'Service', roleId: '' })
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', role: 'Waiter', department: '', roleId: '' })

  const departments = useMemo(() => {
    const fromApi = (apiDepartments as string[]).filter(Boolean)
    if (fromApi.length) return fromApi
    return [...new Set(users.map((user) => user.department).filter(Boolean))] as string[]
  }, [apiDepartments, users])

  const resolveUserType = (label: string) =>
    STAFF_ROLES.find((role) => role.label === label)?.userType ?? 'WAITER'

  const matchRoleId = (label: string, explicit?: string) => {
    if (explicit) return explicit
    const needle = label.toLowerCase()
    return assignableRoles.find((role) => role.name.toLowerCase().includes(needle) || role.slug?.toLowerCase().includes(needle))?.id
  }

  const labelForUserType = (userType?: string) =>
    STAFF_ROLES.find((role) => role.userType === userType)?.label
    ?? STAFF_ROLES.find((role) => role.label.toLowerCase() === String(userType || '').toLowerCase())?.label
    ?? 'Waiter'

  const activeTab = Object.entries(TAB_ROUTES).find(([, path]) => path === location.pathname)?.[0] ?? 'all'

  const openEdit = (user: User) => {
    setSelectedUser(user)
    setEditForm({
      name: user.name,
      phone: user.phone ?? '',
      role: labelForUserType(user.userType),
      status: (user.status || 'active').toUpperCase().replace('-', '_'),
    })
    setEditOpen(true)
  }

  const openRoles = (user: User) => {
    setSelectedUser(user)
    setSelectedRoleIds(user.roleIds.length ? [...user.roleIds] : [])
    setRolesOpen(true)
  }

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['employees'] })
  }

  const updateUser = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error('No user selected')
      const [firstName, ...rest] = editForm.name.trim().split(/\s+/)
      const lastName = rest.join(' ') || firstName
      const userType = resolveUserType(editForm.role)
      return userManagementApi.update(selectedUser.id, {
        firstName,
        lastName,
        phone: editForm.phone.trim() || undefined,
        userType,
        status: editForm.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'INVITED',
      })
    },
    onSuccess: () => {
      invalidateUsers()
      toast.success('User updated')
      setEditOpen(false)
      setSelectedUser(null)
    },
    onError: (error) => toast.error(formatApiError(error, 'Could not update user')),
  })

  const resetPassword = useMutation({
    mutationFn: (id: string) => userManagementApi.sendPasswordReset(id),
    onSuccess: () => toast.success('Password reset email sent'),
    onError: (error) => toast.error(formatApiError(error, 'Could not send password reset')),
  })

  const saveRoles = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error('No user selected')
      return userManagementApi.setRoles(selectedUser.id, selectedRoleIds)
    },
    onSuccess: () => {
      invalidateUsers()
      toast.success('Roles updated')
      setRolesOpen(false)
      setSelectedUser(null)
    },
    onError: (error) => toast.error(formatApiError(error, 'Could not update roles')),
  })

  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      accessorKey: 'name', header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(row.original.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      )
    },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => <Badge variant="secondary">{row.original.role}</Badge> },
    { accessorKey: 'department', header: 'Department' },
    { accessorKey: 'phone', header: 'Phone' },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'success' : row.original.status === 'on-leave' ? 'warning' : 'destructive'}>
          {row.original.status}
        </Badge>
      )
    },
    { accessorKey: 'permissions', header: 'Permissions', cell: ({ row }) => `${row.original.permissions} granted` },
    {
      accessorKey: 'lastLogin', header: 'Last Login',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.lastLogin)}</span>
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row.original)}>
              <Edit className="h-3.5 w-3.5 mr-2" /> Edit User
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => resetPassword.mutate(row.original.id)}
              disabled={resetPassword.isPending}
            >
              <Key className="h-3.5 w-3.5 mr-2" /> Reset Password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openRoles(row.original)}>
              <Shield className="h-3.5 w-3.5 mr-2" /> Manage Roles
            </DropdownMenuItem>
            <DropdownMenuItem className="text-danger" onClick={() => {
              userManagementApi.delete(row.original.id).then(() => {
                invalidateUsers()
                toast.success('User removed')
              }).catch((error) => toast.error(formatApiError(error, 'Could not remove user')))
            }}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Deactivate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ], [resetPassword.isPending])

  const createUser = useMutation({
    mutationFn: () => {
      const [firstName, ...last] = form.name.trim().split(/\s+/)
      const userType = resolveUserType(form.role)
      const roleId = matchRoleId(form.role, form.roleId || undefined)
      return userManagementApi.create({
        firstName,
        lastName: last.join(' ') || firstName,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        userType,
        roleIds: roleId ? [roleId] : [],
        sendInvitation: true,
      })
    },
    onSuccess: () => {
      invalidateUsers()
      queryClient.invalidateQueries({ queryKey: ['users', 'departments'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'invites'] })
      toast.success('User added. An invite email was sent if enabled.')
      setDialogOpen(false)
      setForm({ name: '', email: '', phone: '', role: 'Waiter', department: 'Service', roleId: '' })
    },
    onError: (error) => toast.error(formatApiError(error, 'Could not add user. Check email and role.')),
  })

  const createInvite = useMutation({
    mutationFn: () => invitesApi.create({
      email: inviteForm.email.trim(),
      firstName: inviteForm.firstName.trim() || inviteForm.email.split('@')[0],
      lastName: inviteForm.lastName.trim() || 'User',
      userType: resolveUserType(inviteForm.role),
      department: inviteForm.department || undefined,
      roleId: matchRoleId(inviteForm.role, inviteForm.roleId || undefined),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'invites'] })
      toast.success('Invitation email sent. The link opens the Accept Invite page in the app.')
      setInviteOpen(false)
      setInviteForm({ email: '', firstName: '', lastName: '', role: 'Waiter', department: '', roleId: '' })
    },
    onError: (error) => toast.error(formatApiError(error, 'Could not send invitation')),
  })

  const revokeInvite = useMutation({
    mutationFn: (id: string) => invitesApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'invites'] })
      toast.success('Invitation revoked')
    },
    onError: (error) => toast.error(formatApiError(error, 'Could not revoke invitation')),
  })

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader
          title="User Management"
          description="Manage staff accounts, roles, departments, and invitations (includes employees created from Employees)"
          actions={
            <div className="flex gap-2">
              <PermissionGuard permission="users.view" feature="INVITATIONS">
                <Button variant="outline" onClick={() => setInviteOpen(true)}>
                  <Mail className="h-4 w-4 mr-2" /> Invite User
                </Button>
              </PermissionGuard>
              <Button onClick={() => setDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" /> Add User
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={users.length} format="number" icon={<Shield className="h-5 w-5" />} />
          <StatCard title="Active" value={users.filter((u) => u.status === 'active').length} format="number" icon={<Shield className="h-5 w-5" />} />
          <StatCard title="Departments" value={departments.length} format="number" icon={<Building2 className="h-5 w-5" />} />
          <StatCard title="Pending Invites" value={(invites as Invite[]).length} format="number" icon={<Mail className="h-5 w-5" />} />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => navigate(TAB_ROUTES[v])}>
          <TabsList>
            <TabsTrigger value="all">All Users</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="invites">Invitations</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-9" />
            </div>
            <DataTable columns={columns} data={users} searchKey="name" searchPlaceholder="Filter users..." />
          </TabsContent>

          <TabsContent value="roles" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Who controls features?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Owners and Admins</strong> can create roles and turn permissions on/off
                  (POS, Orders, Menu, Users, Reports, Settings, and more).
                </p>
                <p>
                  Staff only get the features assigned to their role. Change that under{' '}
                  <button type="button" className="font-medium text-primary underline" onClick={() => navigate(`${APP_BASE}/roles`)}>
                    Roles &amp; Permissions
                  </button>
                  .
                </p>
                <Button onClick={() => navigate(`${APP_BASE}/roles`)}>
                  <Shield className="mr-2 h-4 w-4" /> Open Roles &amp; Permissions
                </Button>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {STAFF_ROLES.map((role) => (
                <Card key={role.label} className="hover:shadow-elevated transition-all">
                  <CardContent className="p-4 text-center">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary mx-auto mb-2 flex items-center justify-center font-bold text-sm">
                      {users.filter((u) => u.role.toUpperCase().includes(role.label.toUpperCase()) || u.role.toUpperCase().includes(role.userType)).length}
                    </div>
                    <p className="font-medium text-sm">{role.label}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{role.userType}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {assignableRoles.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Permission roles in this restaurant</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {assignableRoles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between border-b border-border/50 py-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{role.name}</p>
                        <p className="text-xs text-muted-foreground">{role.permissions?.length ?? 0} permissions</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate(`${APP_BASE}/roles`)}>Edit</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="departments" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.length === 0 && (
                <Card><CardContent className="p-6 text-sm text-muted-foreground">No departments found yet. Assign a department when creating users.</CardContent></Card>
              )}
              {departments.map((department) => (
                <Card key={department} className="hover:shadow-elevated transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold">{users.filter((user) => user.department === department).length}</div>
                      <div>
                        <p className="font-semibold">{department}</p>
                        <p className="text-xs text-muted-foreground">{users.filter((user) => user.department === department).length} staff members</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="invites" className="mt-4 space-y-3">
            {(invites as Invite[]).length === 0 && (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No pending invitations.</CardContent></Card>
            )}
            {(invites as Invite[]).map((invite) => {
              const email = invite.email ?? invite.user?.email ?? 'Unknown'
              const name = `${invite.user?.firstName ?? ''} ${invite.user?.lastName ?? ''}`.trim()
              return (
                <Card key={invite.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center"><Mail className="h-5 w-5 text-muted-foreground" /></div>
                      <div>
                        <p className="font-medium">{email}</p>
                        <p className="text-xs text-muted-foreground">
                          {name || 'Invited user'}
                          {invite.expiresAt ? ` · Expires ${new Date(invite.expiresAt).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">pending</Badge>
                      <Button variant="outline" size="sm" onClick={() => revokeInvite.mutate(invite.id)} disabled={revokeInvite.isPending}>Revoke</Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Job role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v, roleId: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAFF_ROLES.map((r) => (
                        <SelectItem key={r.label} value={r.label}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input list="department-options" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                  <datalist id="department-options">
                    {departments.map((department) => <option key={department} value={department} />)}
                  </datalist>
                </div>
              </div>
              {assignableRoles.length > 0 && (
                <div className="space-y-2">
                  <Label>Permission pack (optional)</Label>
                  <Select value={form.roleId || '__auto__'} onValueChange={(v) => setForm({ ...form, roleId: v === '__auto__' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Auto-match by job role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__auto__">Auto-match by job role</SelectItem>
                      {assignableRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button disabled={!form.name || !form.email || createUser.isPending} onClick={() => createUser.mutate()}>Add User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Invite User by Email</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Email Address</Label><Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="user@example.com" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>First Name</Label><Input value={inviteForm.firstName} onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })} /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input value={inviteForm.lastName} onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteForm.role} onValueChange={(role) => setInviteForm({ ...inviteForm, role, roleId: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAFF_ROLES.filter((r) => r.label !== 'Owner').map((r) => (
                        <SelectItem key={r.label} value={r.label}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input list="invite-department-options" value={inviteForm.department} onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })} />
                  <datalist id="invite-department-options">
                    {departments.map((department) => <option key={department} value={department} />)}
                  </datalist>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Invite email opens <code className="rounded bg-muted px-1">/#/invites/accept</code> so the user can set a password.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button disabled={!inviteForm.email || createInvite.isPending} onClick={() => createInvite.mutate()}>Send Invite</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={selectedUser?.email ?? ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Job role</Label>
                  <Select value={editForm.role} onValueChange={(role) => setEditForm({ ...editForm, role })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAFF_ROLES.map((r) => (
                        <SelectItem key={r.label} value={r.label}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(status) => setEditForm({ ...editForm, status })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="INVITED">Invited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button disabled={!editForm.name || updateUser.isPending} onClick={() => updateUser.mutate()}>
                {updateUser.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage roles — {selectedUser?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 max-h-80 overflow-y-auto">
              {assignableRoles.length === 0 && (
                <p className="text-sm text-muted-foreground">No permission roles found. Create them under Roles &amp; Permissions.</p>
              )}
              {assignableRoles.map((role) => {
                const checked = selectedRoleIds.includes(role.id)
                return (
                  <label key={role.id} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => {
                        setSelectedRoleIds((prev) =>
                          checked ? prev.filter((id) => id !== role.id) : [...prev, role.id]
                        )
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium">{role.name}</p>
                      <p className="text-xs text-muted-foreground">{role.permissions?.length ?? 0} permissions</p>
                    </div>
                  </label>
                )
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRolesOpen(false)}>Cancel</Button>
              <Button disabled={saveRoles.isPending} onClick={() => saveRoles.mutate()}>
                {saveRoles.isPending ? 'Saving…' : 'Save roles'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}

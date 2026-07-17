import { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Plus, Edit, Trash2, Mail, Shield, UserPlus, Building2, Search, MoreHorizontal, Key
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
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MOCK_USERS, MOCK_DEPARTMENTS, MOCK_INVITATIONS } from '@/constants/users-inventory-data'
import { APP_BASE } from '@/constants/navigation'
import { getInitials, formatDateTime } from '@/lib/utils'
import { PermissionGuard } from '@/guards/PermissionGuard'

type User = typeof MOCK_USERS[0]

const TAB_ROUTES: Record<string, string> = {
  all: `${APP_BASE}/users`,
  roles: `${APP_BASE}/users/roles`,
  departments: `${APP_BASE}/users/departments`,
  invites: `${APP_BASE}/users/invites`,
}

export default function UsersManagementPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [users, setUsers] = useState(MOCK_USERS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'Waiter', department: 'Service' })

  const activeTab = Object.entries(TAB_ROUTES).find(([, path]) => path === location.pathname)?.[0] ?? 'all'

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
            <DropdownMenuItem><Edit className="h-3.5 w-3.5 mr-2" /> Edit User</DropdownMenuItem>
            <DropdownMenuItem><Key className="h-3.5 w-3.5 mr-2" /> Reset Password</DropdownMenuItem>
            <DropdownMenuItem><Shield className="h-3.5 w-3.5 mr-2" /> Manage Roles</DropdownMenuItem>
            <DropdownMenuItem className="text-danger" onClick={() => {
              setUsers((u) => u.filter((x) => x.id !== row.original.id))
              toast.success('User removed')
            }}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Deactivate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ], [])

  const handleAddUser = () => {
    setUsers((u) => [...u, {
      id: String(Date.now()), name: form.name, email: form.email, phone: form.phone,
      role: form.role, department: form.department, status: 'active' as const,
      lastLogin: new Date().toISOString(), permissions: 6, avatar: null
    }])
    toast.success('User added successfully')
    setDialogOpen(false)
    setForm({ name: '', email: '', phone: '', role: 'Waiter', department: 'Service' })
  }

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader
          title="User Management"
          description="Manage staff accounts, roles, departments, and invitations"
          actions={
            <div className="flex gap-2">
              <PermissionGuard permission="users.view">
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
          <StatCard title="Departments" value={MOCK_DEPARTMENTS.length} format="number" icon={<Building2 className="h-5 w-5" />} />
          <StatCard title="Pending Invites" value={MOCK_INVITATIONS.filter((i) => i.status === 'pending').length} format="number" icon={<Mail className="h-5 w-5" />} />
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

          <TabsContent value="roles" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {['Owner', 'Admin', 'Manager', 'Cashier', 'Waiter', 'Chef'].map((role) => (
                <Card key={role} className="hover:shadow-elevated transition-all cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary mx-auto mb-2 flex items-center justify-center font-bold text-sm">
                      {users.filter((u) => u.role === role).length}
                    </div>
                    <p className="font-medium text-sm">{role}</p>
                    <Button variant="link" size="sm" className="text-xs mt-1" onClick={() => navigate(`${APP_BASE}/roles`)}>Manage →</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Permission Matrix</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['Dashboard', 'POS', 'Orders', 'Menu', 'Inventory', 'Users', 'Reports', 'Settings'].map((perm) => (
                    <div key={perm} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm font-medium">{perm}</span>
                      <div className="flex gap-4">
                        {['Owner', 'Manager', 'Cashier'].map((r) => (
                          <div key={r} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Switch defaultChecked={r === 'Owner' || (r === 'Manager' && perm !== 'Settings')} />
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MOCK_DEPARTMENTS.map((dept) => (
                <Card key={dept.id} className="hover:shadow-elevated transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`h-10 w-10 rounded-xl ${dept.color} flex items-center justify-center text-white font-bold`}>{dept.staff}</div>
                      <div>
                        <p className="font-semibold">{dept.name}</p>
                        <p className="text-xs text-muted-foreground">Head: {dept.head}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">View Staff</Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="invites" className="mt-4 space-y-3">
            {MOCK_INVITATIONS.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center"><Mail className="h-5 w-5 text-muted-foreground" /></div>
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">{inv.role} · {inv.department} · Sent {inv.sentAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={inv.status === 'pending' ? 'warning' : 'success'}>{inv.status}</Badge>
                    {inv.status === 'pending' && (
                      <Button variant="outline" size="sm" onClick={() => toast.success('Invitation resent')}>Resend</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Add User Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Owner', 'Manager', 'Cashier', 'Waiter', 'Chef', 'Delivery'].map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MOCK_DEPARTMENTS.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddUser}>Add User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invite Dialog */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Invite User by Email</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Email Address</Label><Input type="email" placeholder="user@example.com" /></div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select defaultValue="Waiter">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Manager', 'Cashier', 'Waiter', 'Chef'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button onClick={() => { toast.success('Invitation sent'); setInviteOpen(false) }}>Send Invite</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}

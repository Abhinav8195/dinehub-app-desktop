import { useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Clock, UserCheck } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { employeesApi } from '@/api/phase1.api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { mapBackendError } from '@/api/management-utils'
import { APP_BASE } from '@/constants/navigation'

type Employee = { id: string; firstName: string; lastName: string; userType?: string; department?: string; status?: string }

export default function EmployeesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const emptyForm = { firstName: '', lastName: '', email: '', password: '', userType: 'WAITER', department: '', employeeCode: '' }
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const { data: employees = [], isLoading, isError, refetch } = useQuery({ queryKey: ['employees'], queryFn: employeesApi.list })
  const createEmployee = useMutation({
    mutationFn: () => employeesApi.create({
      firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim().toLowerCase(),
      password: form.password, userType: form.userType, department: form.department.trim() || undefined,
      employeeCode: form.employeeCode.trim() || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setForm(emptyForm)
      setFormError('')
      setDialogOpen(false)
      toast.success('Employee added. They also appear under User Management.')
    },
    onError: (error) => {
      const view = mapBackendError(error)
      const details = Object.values(view.fieldErrors).join(' ')
      const message = details || view.message
      setFormError(message)
      toast.error(message)
    },
  })
  const canSubmit = Boolean(form.firstName.trim() && form.lastName.trim() && form.password.length >= 6 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
  const columns = useMemo<ColumnDef<Employee>[]>(() => [
    { id: 'name', header: 'Employee', cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}` },
    { accessorKey: 'userType', header: 'Role' },
    { accessorKey: 'department', header: 'Department' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'ACTIVE' ? 'success' : 'warning'}>{row.original.status?.toLowerCase() ?? 'unknown'}</Badge> }
  ], [])

  const onTabChange = (value: string) => {
    setTab(value)
    if (value === 'attendance') navigate(`${APP_BASE}/employees/attendance`)
  }

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Employees" description="Staff profiles, attendance, shifts, and payroll" actions={
          <Button onClick={() => { setFormError(''); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>
        } />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Staff" value={employees.length} format="number" icon={<UserCheck className="h-5 w-5" />} />
          <StatCard title="Active" value={employees.filter((employee) => employee.status === 'ACTIVE').length} format="number" icon={<Clock className="h-5 w-5" />} />
          <StatCard title="Inactive" value={employees.filter((employee) => employee.status === 'INACTIVE').length} format="number" icon={<UserCheck className="h-5 w-5" />} />
        </div>
        <Tabs value={tab} onValueChange={onTabChange}>
          <TabsList>
            <TabsTrigger value="all">All Employees</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="shifts">Shifts</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            {isLoading ? <p className="py-12 text-center text-muted-foreground">Loading employees…</p>
              : isError ? <div className="rounded-xl border border-destructive/30 py-12 text-center"><p>Employees could not be loaded.</p><Button className="mt-3" variant="outline" onClick={() => refetch()}>Try again</Button></div>
              : <DataTable columns={columns} data={employees as Employee[]} searchKey="firstName" />}
          </TabsContent>
          <TabsContent value="shifts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Shifts</CardTitle>
                <CardDescription>Shift roster and open/close cash shifts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Feature coming soon — open/close shift from the top bar today while a full roster calendar is prepared.</p>
                <Button variant="outline" onClick={() => navigate(APP_BASE)}>Back to dashboard</Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="payroll" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Payroll & salary</CardTitle>
                <CardDescription>Calculate staff salary from attendance and pay rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p><strong className="text-foreground">Feature coming soon.</strong> You can already mark attendance. Salary calculation from worked hours will appear here in a later update.</p>
                <Button onClick={() => navigate(`${APP_BASE}/employees/attendance`)}>Open attendance</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open && !createEmployee.isPending) setForm(emptyForm) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add employee</DialogTitle><DialogDescription>Creates a login account. The person also appears in User Management.</DialogDescription></DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (canSubmit) createEmployee.mutate() }}>
            <div className="space-y-2"><Label htmlFor="employee-first-name">First name *</Label><Input id="employee-first-name" autoFocus required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="employee-last-name">Last name *</Label><Input id="employee-last-name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="employee-email">Email *</Label><Input id="employee-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="employee-password">Temporary password *</Label><Input id="employee-password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><p className="text-xs text-muted-foreground">At least 6 characters.</p></div>
            <div className="space-y-2"><Label>Employee type</Label><Select value={form.userType} onValueChange={(userType) => setForm({ ...form, userType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="WAITER">Waiter</SelectItem><SelectItem value="CAPTAIN">Captain</SelectItem><SelectItem value="CHEF">Chef</SelectItem><SelectItem value="KITCHEN_STAFF">Kitchen staff</SelectItem><SelectItem value="CASHIER">Cashier</SelectItem><SelectItem value="BRANCH_MANAGER">Branch manager</SelectItem><SelectItem value="RESTAURANT_MANAGER">Restaurant manager</SelectItem><SelectItem value="DELIVERY_BOY">Delivery staff</SelectItem><SelectItem value="CLEANER">Cleaner</SelectItem><SelectItem value="ACCOUNTANT">Accountant</SelectItem><SelectItem value="INVENTORY_MANAGER">Inventory manager</SelectItem></SelectContent></Select></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="employee-department">Department</Label><Input id="employee-department" placeholder="e.g. Kitchen or Service" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="employee-code">Employee code</Label><Input id="employee-code" placeholder="e.g. EMP-001" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></div>
            {formError && <div role="alert" className="sm:col-span-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>}
            <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" disabled={createEmployee.isPending} onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={!canSubmit || createEmployee.isPending}>{createEmployee.isPending ? 'Adding…' : 'Add employee'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

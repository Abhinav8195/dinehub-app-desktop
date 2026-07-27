import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Clock, UserCheck } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { employeesApi } from '@/api/phase1.api'

type Employee = { id: string; firstName: string; lastName: string; userType?: string; department?: string; status?: string }

export default function EmployeesPage() {
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: employeesApi.list })
  const columns = useMemo<ColumnDef<Employee>[]>(() => [
    { id: 'name', header: 'Employee', cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}` },
    { accessorKey: 'userType', header: 'Role' },
    { accessorKey: 'department', header: 'Department' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'ACTIVE' ? 'success' : 'warning'}>{row.original.status?.toLowerCase() ?? 'unknown'}</Badge> }
  ], [])

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Employees" description="Attendance, shifts, payroll, and performance" actions={
          <Button><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>
        } />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Staff" value={employees.length} format="number" icon={<UserCheck className="h-5 w-5" />} />
          <StatCard title="Active" value={employees.filter((employee) => employee.status === 'ACTIVE').length} format="number" icon={<Clock className="h-5 w-5" />} />
          <StatCard title="Inactive" value={employees.filter((employee) => employee.status === 'INACTIVE').length} format="number" icon={<UserCheck className="h-5 w-5" />} />
        </div>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Employees</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="shifts">Shifts</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>
        </Tabs>
        <DataTable columns={columns} data={employees as Employee[]} searchKey="name" />
      </div>
    </PageShell>
  )
}

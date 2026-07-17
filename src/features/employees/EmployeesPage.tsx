import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Clock, UserCheck } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MOCK_EMPLOYEES } from '@/constants/mock-data'

export default function EmployeesPage() {
  const columns = useMemo<ColumnDef<typeof MOCK_EMPLOYEES[0]>[]>(() => [
    { accessorKey: 'name', header: 'Employee' },
    { accessorKey: 'role', header: 'Role' },
    { accessorKey: 'department', header: 'Department' },
    { accessorKey: 'shift', header: 'Shift' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'success' : 'warning'}>{row.original.status}</Badge> }
  ], [])

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Employees" description="Attendance, shifts, payroll, and performance" actions={
          <Button><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>
        } />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Staff" value={42} format="number" icon={<UserCheck className="h-5 w-5" />} />
          <StatCard title="On Shift Now" value={18} format="number" icon={<Clock className="h-5 w-5" />} />
          <StatCard title="On Leave" value={3} format="number" icon={<UserCheck className="h-5 w-5" />} />
        </div>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Employees</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="shifts">Shifts</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>
        </Tabs>
        <DataTable columns={columns} data={MOCK_EMPLOYEES} searchKey="name" />
      </div>
    </PageShell>
  )
}

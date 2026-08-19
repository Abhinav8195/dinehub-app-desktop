import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock3, Download, LogIn, LogOut, Users } from 'lucide-react'
import { toast } from 'sonner'
import { attendanceApi, type AttendanceParams, type AttendanceRecord, type AttendanceStatus } from '@/api/attendance.api'
import { employeesApi } from '@/api/phase1.api'
import { formatApiError } from '@/api/management-utils'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDateTime } from '@/lib/utils'

type Employee = { id: string; firstName: string; lastName: string; department?: string | null; status?: string }
const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE']

/** Local calendar date YYYY-MM-DD (avoids UTC day shift). */
const localDate = (date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const minutes = (value = 0) => `${Math.floor(value / 60)}h ${value % 60}m`
const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())

function dateRange(date: string, view: 'daily' | 'weekly' | 'monthly') {
  const [y, m, d] = date.split('-').map(Number)
  const selected = new Date(y, (m || 1) - 1, d || 1)
  const from = new Date(selected)
  const to = new Date(selected)
  if (view === 'weekly') {
    const day = (from.getDay() + 6) % 7
    from.setDate(from.getDate() - day)
    to.setTime(from.getTime())
    to.setDate(to.getDate() + 6)
  }
  if (view === 'monthly') {
    from.setDate(1)
    to.setMonth(to.getMonth() + 1, 0)
  }
  from.setHours(0, 0, 0, 0)
  to.setHours(23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

export default function AttendancePage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [date, setDate] = useState(() => localDate())
  const [search, setSearch] = useState('')

  // Keep the selected day on the system calendar when the panel stays open overnight.
  useEffect(() => {
    const syncToday = () => {
      const today = localDate()
      setDate((current) => (current < today ? today : current))
    }
    syncToday()
    const id = window.setInterval(syncToday, 60_000)
    window.addEventListener('focus', syncToday)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', syncToday)
    }
  }, [])

  const params = useMemo<AttendanceParams>(() => ({ ...dateRange(date, view), search: search || undefined, limit: 200 }), [date, search, view])
  const records = useQuery({ queryKey: ['attendance', params], queryFn: () => attendanceApi.list(params) })
  const summary = useQuery({ queryKey: ['attendance-summary', params], queryFn: () => attendanceApi.summary(params) })
  const employees = useQuery({ queryKey: ['employees'], queryFn: employeesApi.list })
  const recordByEmployee = useMemo(() => new Map((records.data ?? []).map((record) => [record.employee.id, record])), [records.data])
  const rows = useMemo(() => (employees.data as Employee[] | undefined)?.filter((employee) => employee.status !== 'INACTIVE' && `${employee.firstName} ${employee.lastName} ${employee.department ?? ''}`.toLowerCase().includes(search.toLowerCase())) ?? [], [employees.data, search])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['attendance'] })
    queryClient.invalidateQueries({ queryKey: ['attendance-summary'] })
  }

  const mark = useMutation({
    mutationFn: async ({ employee, status }: { employee: Employee; status: AttendanceStatus }) => {
      const current = recordByEmployee.get(employee.id)
      if (current) return attendanceApi.correct(current.id, { status, reason: 'Marked by administrator' })
      const at = new Date(`${date}T09:00:00`).toISOString()
      const created = await attendanceApi.checkIn({ employeeId: employee.id, at })
      return status === 'PRESENT' ? created : attendanceApi.correct(created.id, { status, reason: 'Marked by administrator' })
    },
    onSuccess: () => { refresh(); toast.success('Attendance marked') },
    onError: (error) => toast.error(formatApiError(error, 'Unable to mark attendance')),
  })

  const checkIn = useMutation({
    mutationFn: (employee: Employee) => attendanceApi.checkIn({ employeeId: employee.id, at: new Date().toISOString() }),
    onSuccess: () => { refresh(); toast.success('Checked in') },
    onError: (error) => toast.error(formatApiError(error, 'Check-in failed')),
  })

  const checkOut = useMutation({
    mutationFn: (employee: Employee) => attendanceApi.checkOut({ employeeId: employee.id, at: new Date().toISOString() }),
    onSuccess: () => { refresh(); toast.success('Checked out') },
    onError: (error) => toast.error(formatApiError(error, 'Check-out failed')),
  })

  const exportData = async () => {
    try {
      const report = await attendanceApi.export(params)
      const result = await window.electronAPI.saveFile({ filename: report.filename, content: report.content })
      if (result.saved) toast.success('Attendance export saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed')
    }
  }

  const counts = summary.data?.counts ?? {}
  return (
    <PageShell>
      <div className="page-container">
        <PageHeader
          title="Employee Attendance"
          description={`Register for ${date} — date follows your system calendar`}
          actions={<Button variant="outline" onClick={exportData}><Download className="h-4 w-4" /> Export CSV</Button>}
        />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <StatCard title="Present" value={counts.PRESENT ?? 0} format="number" icon={<Users className="h-5 w-5" />} />
          <StatCard title="Absent" value={counts.ABSENT ?? 0} format="number" icon={<Users className="h-5 w-5" />} />
          <StatCard title="Late" value={counts.LATE ?? 0} format="number" icon={<Clock3 className="h-5 w-5" />} />
          <StatCard title="On leave" value={counts.ON_LEAVE ?? 0} format="number" icon={<Users className="h-5 w-5" />} />
          <StatCard title="Overtime hours" value={Math.round((summary.data?.overtimeMinutes ?? 0) / 6) / 10} format="number" icon={<Clock3 className="h-5 w-5" />} />
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input className="w-44" type="date" value={date} onChange={(e) => setDate(e.target.value || localDate())} />
          <Button type="button" variant="outline" size="sm" onClick={() => setDate(localDate())}>Today</Button>
          <Input className="min-w-64 flex-1" placeholder="Search employee or department" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {records.isError ? (
          <div className="rounded-xl border border-destructive/30 p-8 text-center">
            <p className="font-medium">Attendance could not be loaded</p>
            <p className="mt-1 text-sm text-muted-foreground">{(records.error as Error).message}</p>
            <Button className="mt-4" variant="outline" onClick={() => records.refetch()}>Try again</Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Current status</TableHead>
                  <TableHead>Check in</TableHead>
                  <TableHead>Check out</TableHead>
                  <TableHead>Worked</TableHead>
                  <TableHead className="min-w-56">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((employee) => {
                  const record = recordByEmployee.get(employee.id) as AttendanceRecord | undefined
                  const updating = mark.isPending && mark.variables?.employee.id === employee.id
                  return (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.firstName} {employee.lastName}</TableCell>
                      <TableCell>{employee.department || '—'}</TableCell>
                      <TableCell>
                        {record
                          ? <Badge variant={record.status === 'PRESENT' ? 'success' : record.status === 'LATE' ? 'warning' : 'secondary'}>{label(record.status)}</Badge>
                          : <Badge variant="secondary">Not marked</Badge>}
                      </TableCell>
                      <TableCell>{record?.checkIn ? formatDateTime(record.checkIn) : '—'}</TableCell>
                      <TableCell>{record?.checkOut ? formatDateTime(record.checkOut) : '—'}</TableCell>
                      <TableCell>{minutes(record?.workedMinutes)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            disabled={updating}
                            value={record?.status ?? ''}
                            onValueChange={(status) => mark.mutate({ employee, status: status as AttendanceStatus })}
                          >
                            <SelectTrigger className="w-36"><SelectValue placeholder={updating ? 'Saving…' : 'Status'} /></SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((status) => <SelectItem key={status} value={status}>{label(status)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={Boolean(record?.checkIn && !record?.checkOut) || checkIn.isPending}
                            onClick={() => checkIn.mutate(employee)}
                          >
                            <LogIn className="mr-1 h-3.5 w-3.5" /> In
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!record?.checkIn || Boolean(record?.checkOut) || checkOut.isPending}
                            onClick={() => checkOut.mutate(employee)}
                          >
                            <LogOut className="mr-1 h-3.5 w-3.5" /> Out
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">No employees found. Add employees first.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageShell>
  )
}

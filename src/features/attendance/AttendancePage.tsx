import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock3, Download, Users } from 'lucide-react'
import { toast } from 'sonner'
import { attendanceApi, type AttendanceParams, type AttendanceRecord, type AttendanceStatus } from '@/api/attendance.api'
import { employeesApi } from '@/api/phase1.api'
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
const isoDate = (date: Date) => date.toISOString().slice(0, 10)
const minutes = (value = 0) => `${Math.floor(value / 60)}h ${value % 60}m`
const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())

function dateRange(date: string, view: 'daily'|'weekly'|'monthly') {
  const selected = new Date(`${date}T00:00:00`)
  const from = new Date(selected)
  const to = new Date(selected)
  if (view === 'weekly') { const day = (from.getDay() + 6) % 7; from.setDate(from.getDate() - day); to.setTime(from.getTime()); to.setDate(to.getDate() + 6) }
  if (view === 'monthly') { from.setDate(1); to.setMonth(to.getMonth() + 1, 0) }
  from.setHours(0, 0, 0, 0); to.setHours(23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

export default function AttendancePage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'daily'|'weekly'|'monthly'>('daily')
  const [date, setDate] = useState(isoDate(new Date()))
  const [search, setSearch] = useState('')
  const params = useMemo<AttendanceParams>(() => ({ ...dateRange(date, view), search: search || undefined, limit: 200 }), [date, search, view])
  const records = useQuery({ queryKey: ['attendance', params], queryFn: () => attendanceApi.list(params) })
  const summary = useQuery({ queryKey: ['attendance-summary', params], queryFn: () => attendanceApi.summary(params) })
  const employees = useQuery({ queryKey: ['employees'], queryFn: employeesApi.list })
  const recordByEmployee = useMemo(() => new Map((records.data ?? []).map((record) => [record.employee.id, record])), [records.data])
  const rows = useMemo(() => (employees.data as Employee[] | undefined)?.filter((employee) => employee.status !== 'INACTIVE' && `${employee.firstName} ${employee.lastName} ${employee.department ?? ''}`.toLowerCase().includes(search.toLowerCase())) ?? [], [employees.data, search])

  const mark = useMutation({
    mutationFn: async ({ employee, status }: { employee: Employee; status: AttendanceStatus }) => {
      const current = recordByEmployee.get(employee.id)
      if (current) return attendanceApi.correct(current.id, { status, reason: 'Marked by administrator' })
      const at = new Date(`${date}T09:00:00`).toISOString()
      const created = await attendanceApi.checkIn({ employeeId: employee.id, at })
      return status === 'PRESENT' ? created : attendanceApi.correct(created.id, { status, reason: 'Marked by administrator' })
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance'] }); queryClient.invalidateQueries({ queryKey: ['attendance-summary'] }); toast.success('Attendance marked') },
    onError: (error: Error) => toast.error(error.message || 'Unable to mark attendance'),
  })
  const exportData = async () => {
    try { const report = await attendanceApi.export(params); const result = await window.electronAPI.saveFile({ filename: report.filename, content: report.content }); if (result.saved) toast.success('Attendance export saved') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Export failed') }
  }
  const counts = summary.data?.counts ?? {}
  return <PageShell><div className="page-container">
    <PageHeader title="Employee Attendance" description="Admin attendance register — mark every employee from one screen" actions={<Button variant="outline" onClick={exportData}><Download className="h-4 w-4" /> Export CSV</Button>} />
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5"><StatCard title="Present" value={counts.PRESENT ?? 0} format="number" icon={<Users className="h-5 w-5" />} /><StatCard title="Absent" value={counts.ABSENT ?? 0} format="number" icon={<Users className="h-5 w-5" />} /><StatCard title="Late" value={counts.LATE ?? 0} format="number" icon={<Clock3 className="h-5 w-5" />} /><StatCard title="On leave" value={counts.ON_LEAVE ?? 0} format="number" icon={<Users className="h-5 w-5" />} /><StatCard title="Overtime hours" value={Math.round((summary.data?.overtimeMinutes ?? 0) / 6) / 10} format="number" icon={<Clock3 className="h-5 w-5" />} /></div>
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"><Tabs value={view} onValueChange={(v) => setView(v as typeof view)}><TabsList><TabsTrigger value="daily">Daily</TabsTrigger><TabsTrigger value="weekly">Weekly</TabsTrigger><TabsTrigger value="monthly">Monthly</TabsTrigger></TabsList></Tabs><Input className="w-44" type="date" value={date} onChange={(e) => setDate(e.target.value)} /><Input className="min-w-64 flex-1" placeholder="Search employee or department" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
    {records.isError ? <div className="rounded-xl border border-destructive/30 p-8 text-center"><p className="font-medium">Attendance could not be loaded</p><p className="mt-1 text-sm text-muted-foreground">{(records.error as Error).message}</p><Button className="mt-4" variant="outline" onClick={() => records.refetch()}>Try again</Button></div> : <div className="overflow-x-auto rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Current status</TableHead><TableHead>Check in</TableHead><TableHead>Check out</TableHead><TableHead>Worked</TableHead><TableHead className="min-w-48">Mark attendance</TableHead></TableRow></TableHeader><TableBody>{rows.map((employee) => { const record = recordByEmployee.get(employee.id) as AttendanceRecord | undefined; const updating = mark.isPending && mark.variables?.employee.id === employee.id; return <TableRow key={employee.id}><TableCell className="font-medium">{employee.firstName} {employee.lastName}</TableCell><TableCell>{employee.department || '—'}</TableCell><TableCell>{record ? <Badge variant={record.status === 'PRESENT' ? 'success' : record.status === 'LATE' ? 'warning' : 'secondary'}>{label(record.status)}</Badge> : <Badge variant="secondary">Not marked</Badge>}</TableCell><TableCell>{record?.checkIn ? formatDateTime(record.checkIn) : '—'}</TableCell><TableCell>{record?.checkOut ? formatDateTime(record.checkOut) : '—'}</TableCell><TableCell>{minutes(record?.workedMinutes)}</TableCell><TableCell><Select disabled={updating} value={record?.status ?? ''} onValueChange={(status) => mark.mutate({ employee, status: status as AttendanceStatus })}><SelectTrigger><SelectValue placeholder={updating ? 'Saving…' : 'Select status'} /></SelectTrigger><SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status}>{label(status)}</SelectItem>)}</SelectContent></Select></TableCell></TableRow>})}{!rows.length && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">No employees found. Add employees first.</TableCell></TableRow>}</TableBody></Table></div>}
  </div></PageShell>
}

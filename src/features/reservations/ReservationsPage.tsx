import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Calendar, Users, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { reservationsApi } from '@/api/phase1.api'
import { tablesApi } from '@/api/tables.api'
import { formatApiError } from '@/api/management-utils'
import { normalizeTableStatus } from '@/features/pos/lib/tableStatus'

/** Indian-style 12-hour slots used for booking UI. */
const TIME_SLOTS = [
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
  '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
] as const

const DURATION_OPTIONS = [
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: '150', label: '2.5 hours' },
  { value: '180', label: '3 hours' },
] as const

type ReservationRow = {
  id: string
  customerName: string
  guestCount: number
  table?: { number?: number; floor?: string } | null
  tableId?: string | null
  timeSlot: string
  durationMinutes?: number
  date: string
  status: string
}

function to24Hour(slot: string): string {
  const match = slot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return slot
  let hour = Number(match[1])
  const minutes = match[2]
  const period = match[3].toUpperCase()
  if (period === 'AM' && hour === 12) hour = 0
  if (period === 'PM' && hour !== 12) hour += 12
  return `${String(hour).padStart(2, '0')}:${minutes}`
}

function formatSlotDisplay(slot: string): string {
  if (/AM|PM/i.test(slot)) return slot
  const [h, m] = slot.split(':').map(Number)
  if (!Number.isFinite(h)) return slot
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`
}

function formatDuration(minutes?: number): string {
  const value = minutes || 90
  if (value % 60 === 0) return `${value / 60}h`
  return `${Math.floor(value / 60)}h ${value % 60}m`
}

const emptyForm = () => ({
  customerName: '',
  customerPhone: '',
  guestCount: '2',
  date: new Date().toISOString().slice(0, 10),
  timeSlot: '7:00 PM',
  durationMinutes: '90',
  tableId: '',
})

export default function ReservationsPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations'],
    queryFn: reservationsApi.list,
  })
  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesApi.list(),
  })

  const guestCount = Number(form.guestCount) || 1
  const bookableTables = useMemo(() => {
    return tables
      .filter((table) => {
        const status = normalizeTableStatus(table.status)
        const fits = table.capacity >= guestCount
        // Allow available / reserved (overlap checked on server); block occupied/cleaning.
        return fits && status !== 'occupied' && status !== 'cleaning'
      })
      .sort((a, b) => a.number - b.number)
  }, [tables, guestCount])

  const createReservation = useMutation({
    mutationFn: () =>
      reservationsApi.create({
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        guestCount,
        date: form.date,
        timeSlot: to24Hour(form.timeSlot),
        durationMinutes: Number(form.durationMinutes) || 90,
        tableId: form.tableId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setOpen(false)
      setForm(emptyForm())
      toast.success('Reservation created — table booked for the selected duration')
    },
    onError: (error) => toast.error(formatApiError(error, 'Could not create reservation')),
  })

  const canCreate =
    Boolean(form.customerName.trim()) &&
    Boolean(form.customerPhone.trim()) &&
    Boolean(form.tableId) &&
    !createReservation.isPending

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader
          title="Reservations"
          description="Manage table bookings and time slots"
          actions={
            <Button
              onClick={() => {
                setForm(emptyForm())
                setOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> New Reservation
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Today&apos;s Reservations
                </CardTitle>
                <Badge>{(reservations as ReservationRow[]).length} bookings</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {(reservations as ReservationRow[]).length === 0 && (
                  <p className="text-sm text-muted-foreground py-6 text-center">No reservations yet.</p>
                )}
                {(reservations as ReservationRow[]).map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between p-4 rounded-xl border hover:shadow-card transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center text-primary">
                        <span className="text-xs font-medium">
                          {new Date(res.date).toLocaleString(undefined, { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold leading-none">{new Date(res.date).getDate()}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{res.customerName}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatSlotDisplay(res.timeSlot)} · {formatDuration(res.durationMinutes)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {res.guestCount} guests
                          </span>
                          <span>
                            {res.table
                              ? `Table ${res.table.number}${res.table.floor ? ` · ${res.table.floor}` : ''}`
                              : 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={res.status === 'CONFIRMED' ? 'success' : 'warning'}>
                      {res.status.toLowerCase()}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Popular Time Slots (AM / PM)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className="rounded-xl border p-3 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => {
                      setForm((current) => ({ ...current, timeSlot: slot }))
                      setOpen(true)
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) setForm(emptyForm())
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Reservation</DialogTitle>
              <DialogDescription>
                Select a table and duration. That table stays booked for the chosen time window.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.customerName}
                  onChange={(event) => setForm({ ...form, customerName: event.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.customerPhone}
                  onChange={(event) => setForm({ ...form, customerPhone: event.target.value })}
                />
              </div>
              <div>
                <Label>Guests</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.guestCount}
                  onChange={(event) => setForm({ ...form, guestCount: event.target.value, tableId: '' })}
                />
              </div>
              <div>
                <Label>Table</Label>
                <Select
                  value={form.tableId || undefined}
                  onValueChange={(tableId) => setForm({ ...form, tableId })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookableTables.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No free tables for this guest count
                      </div>
                    ) : (
                      bookableTables.map((table) => {
                        const status = normalizeTableStatus(table.status)
                        return (
                          <SelectItem key={table.id} value={table.id}>
                            T-{table.number} · {table.floor} · {table.capacity} seats
                            {status !== 'available' ? ` (${status})` : ''}
                          </SelectItem>
                        )
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm({ ...form, date: event.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Time (AM / PM)</Label>
                  <Select
                    value={form.timeSlot}
                    onValueChange={(timeSlot) => setForm({ ...form, timeSlot })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration</Label>
                  <Select
                    value={form.durationMinutes}
                    onValueChange={(durationMinutes) => setForm({ ...form, durationMinutes })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!canCreate} onClick={() => createReservation.mutate()}>
                {createReservation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}

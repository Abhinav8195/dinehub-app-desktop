import { useState } from 'react'
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
import { formatApiError } from '@/api/management-utils'

/** Indian-style 12-hour slots used for booking UI. */
const TIME_SLOTS = [
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
  '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
] as const

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

export default function ReservationsPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    guestCount: '2',
    date: new Date().toISOString().slice(0, 10),
    timeSlot: '7:00 PM',
  })
  const { data: reservations = [] } = useQuery({ queryKey: ['reservations'], queryFn: reservationsApi.list })
  const createReservation = useMutation({
    mutationFn: () => reservationsApi.create({
      ...form,
      guestCount: Number(form.guestCount),
      timeSlot: to24Hour(form.timeSlot),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      setOpen(false)
      toast.success('Reservation created')
    },
    onError: (error) => toast.error(formatApiError(error, 'Could not create reservation')),
  })

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Reservations" description="Manage table bookings and time slots" actions={
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Reservation</Button>
        } />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Today&apos;s Reservations</CardTitle>
                <Badge>{reservations.length} bookings</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {(reservations as Array<{ id: string; customerName: string; guestCount: number; table?: { number?: number }; timeSlot: string; date: string; status: string }>).map((res) => (
                  <div key={res.id} className="flex items-center justify-between p-4 rounded-xl border hover:shadow-card transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center text-primary">
                        <span className="text-xs font-medium">{new Date(res.date).toLocaleString(undefined, { month: 'short' })}</span>
                        <span className="text-lg font-bold leading-none">{new Date(res.date).getDate()}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{res.customerName}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatSlotDisplay(res.timeSlot)}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {res.guestCount} guests</span>
                          <span>{res.table ? `Table ${res.table.number}` : 'Unassigned'}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={res.status === 'CONFIRMED' ? 'success' : 'warning'}>{res.status.toLowerCase()}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Popular Time Slots (AM / PM)</CardTitle></CardHeader>
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Reservation</DialogTitle>
              <DialogDescription>Choose time in Indian 12-hour format (AM / PM).</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div><Label>Name</Label><Input value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} /></div>
              <div><Label>Guests</Label><Input type="number" min="1" value={form.guestCount} onChange={(event) => setForm({ ...form, guestCount: event.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
              <div>
                <Label>Time (AM / PM)</Label>
                <Select value={form.timeSlot} onValueChange={(timeSlot) => setForm({ ...form, timeSlot })}>
                  <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={!form.customerName || !form.customerPhone || createReservation.isPending} onClick={() => createReservation.mutate()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}

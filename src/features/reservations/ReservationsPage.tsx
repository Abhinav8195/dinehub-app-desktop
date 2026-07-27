import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Calendar, Users, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { reservationsApi } from '@/api/phase1.api'

const TIME_SLOTS = ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM']

export default function ReservationsPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ customerName: '', customerPhone: '', guestCount: '2', date: new Date().toISOString().slice(0, 10), timeSlot: '19:00' })
  const { data: reservations = [] } = useQuery({ queryKey: ['reservations'], queryFn: reservationsApi.list })
  const createReservation = useMutation({
    mutationFn: () => reservationsApi.create({ ...form, guestCount: Number(form.guestCount) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reservations'] }); setOpen(false); toast.success('Reservation created') },
    onError: (error: Error) => toast.error(error.message || 'Failed to create reservation'),
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
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {res.timeSlot}</span>
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
            <CardHeader><CardTitle className="text-base">Available Time Slots</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button key={slot} className="rounded-xl border p-3 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors">
                    {slot}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Reservation</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div><Label>Name</Label><Input value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} /></div>
              <div><Label>Guests</Label><Input type="number" min="1" value={form.guestCount} onChange={(event) => setForm({ ...form, guestCount: event.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
              <div><Label>Time</Label><Input type="time" value={form.timeSlot} onChange={(event) => setForm({ ...form, timeSlot: event.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!form.customerName || !form.customerPhone || createReservation.isPending} onClick={() => createReservation.mutate()}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}

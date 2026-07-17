import { Plus, Calendar, Users, Clock } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const RESERVATIONS = [
  { id: '1', customer: 'John & Family', guests: 6, table: 'Table 8', time: '7:00 PM', date: 'Jun 30', status: 'confirmed', phone: '+1 555-0101' },
  { id: '2', customer: 'Sarah Mitchell', guests: 2, table: 'Table 3', time: '7:30 PM', date: 'Jun 30', status: 'confirmed', phone: '+1 555-0102' },
  { id: '3', customer: 'Corporate Dinner', guests: 12, table: 'Private Room', time: '8:00 PM', date: 'Jun 30', status: 'pending', phone: '+1 555-0103' },
  { id: '4', customer: 'Mike Johnson', guests: 4, table: 'Table 5', time: '6:30 PM', date: 'Jul 1', status: 'confirmed', phone: '+1 555-0104' }
]

const TIME_SLOTS = ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM']

export default function ReservationsPage() {
  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Reservations" description="Manage table bookings and time slots" actions={
          <Button><Plus className="h-4 w-4 mr-2" /> New Reservation</Button>
        } />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Today&apos;s Reservations</CardTitle>
                <Badge>12 bookings</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {RESERVATIONS.map((res) => (
                  <div key={res.id} className="flex items-center justify-between p-4 rounded-xl border hover:shadow-card transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center text-primary">
                        <span className="text-xs font-medium">{res.date.split(' ')[0]}</span>
                        <span className="text-lg font-bold leading-none">{res.date.split(' ')[1]}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{res.customer}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {res.time}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {res.guests} guests</span>
                          <span>{res.table}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={res.status === 'confirmed' ? 'success' : 'warning'}>{res.status}</Badge>
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
      </div>
    </PageShell>
  )
}

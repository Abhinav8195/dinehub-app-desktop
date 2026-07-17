import { Plus, Mail, MessageSquare, Send } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const CAMPAIGNS = [
  { id: '1', name: 'Summer Special', channel: 'Email', sent: 1250, opened: 680, status: 'active' },
  { id: '2', name: 'Weekend Brunch', channel: 'SMS', sent: 890, opened: 420, status: 'completed' },
  { id: '3', name: 'Loyalty Rewards', channel: 'WhatsApp', sent: 2100, opened: 1580, status: 'active' }
]

export default function CRMPage() {
  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="CRM & Marketing" description="Customer engagement, campaigns, and communications" actions={
          <Button><Plus className="h-4 w-4 mr-2" /> New Campaign</Button>
        } />

        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="notes">Customer Notes</TabsTrigger>
            <TabsTrigger value="compose">Compose</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-4 space-y-4">
            {CAMPAIGNS.map((c) => (
              <Card key={c.id} className="hover:shadow-elevated transition-all">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      {c.channel === 'Email' ? <Mail className="h-5 w-5 text-primary" /> : c.channel === 'SMS' ? <MessageSquare className="h-5 w-5 text-primary" /> : <Send className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-sm text-muted-foreground">{c.channel} · Sent to {c.sent} · Opened {c.opened}</p>
                    </div>
                  </div>
                  <Badge variant={c.status === 'active' ? 'success' : 'secondary'}>{c.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="compose" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Send Message</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                <Input placeholder="Subject" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Mail className="h-3 w-3 mr-1" /> Email</Button>
                  <Button variant="outline" size="sm"><MessageSquare className="h-3 w-3 mr-1" /> SMS</Button>
                  <Button variant="outline" size="sm"><Send className="h-3 w-3 mr-1" /> WhatsApp</Button>
                </div>
                <Textarea placeholder="Write your message..." rows={6} />
                <Button><Send className="h-4 w-4 mr-2" /> Send Campaign</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  )
}

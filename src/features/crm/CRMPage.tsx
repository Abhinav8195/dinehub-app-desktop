import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Mail, MessageSquare, Send } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { campaignsApi } from '@/api/phase1.api'

type Campaign = { id: string; name: string; channel?: string; status?: string; audience?: { count?: number } }

export default function CRMPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [channel, setChannel] = useState('EMAIL')
  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: campaignsApi.list })
  const createCampaign = useMutation({
    mutationFn: () => campaignsApi.create({ name, subject, body, channel }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); setName(''); setSubject(''); setBody(''); toast.success('Campaign created') },
    onError: (error: Error) => toast.error(error.message || 'Failed to create campaign'),
  })
  const sendCampaign = useMutation({
    mutationFn: campaignsApi.send,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign sent') },
    onError: (error: Error) => toast.error(error.message || 'Failed to send campaign'),
  })
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
            {(campaigns as Campaign[]).map((c) => (
              <Card key={c.id} className="hover:shadow-elevated transition-all">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      {c.channel === 'Email' ? <Mail className="h-5 w-5 text-primary" /> : c.channel === 'SMS' ? <MessageSquare className="h-5 w-5 text-primary" /> : <Send className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-sm text-muted-foreground">{c.channel ?? 'Email'} · Sent to {c.audience?.count ?? 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.status === 'SENT' ? 'success' : 'secondary'}>{c.status?.toLowerCase() ?? 'draft'}</Badge>
                    {c.status !== 'SENT' && <Button size="sm" onClick={() => sendCampaign.mutate(c.id)}>Send</Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="compose" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Send Message</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                <Input placeholder="Campaign name" value={name} onChange={(event) => setName(event.target.value)} />
                <Input placeholder="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
                <div className="flex gap-2">
                  <Button variant={channel === 'EMAIL' ? 'default' : 'outline'} size="sm" onClick={() => setChannel('EMAIL')}><Mail className="h-3 w-3 mr-1" /> Email</Button>
                  <Button variant={channel === 'SMS' ? 'default' : 'outline'} size="sm" onClick={() => setChannel('SMS')}><MessageSquare className="h-3 w-3 mr-1" /> SMS</Button>
                  <Button variant={channel === 'WHATSAPP' ? 'default' : 'outline'} size="sm" onClick={() => setChannel('WHATSAPP')}><Send className="h-3 w-3 mr-1" /> WhatsApp</Button>
                </div>
                <Textarea placeholder="Write your message..." rows={6} value={body} onChange={(event) => setBody(event.target.value)} />
                <Button disabled={!name || !body || createCampaign.isPending} onClick={() => createCampaign.mutate()}><Send className="h-4 w-4 mr-2" /> Create Campaign</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  )
}

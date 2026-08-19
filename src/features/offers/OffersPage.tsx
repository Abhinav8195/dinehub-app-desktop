import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { offersApi } from '@/api/phase1.api'
import { formatApiError } from '@/api/management-utils'
import { formatCurrency } from '@/lib/utils'

type Offer = {
  id: string
  code: string
  name: string
  type: 'PERCENT' | 'FLAT' | string
  value: number
  minOrderAmount?: number | null
  maxDiscount?: number | null
  usageLimit?: number | null
  isActive?: boolean
  startsAt?: string | null
  endsAt?: string | null
}

const empty = {
  code: '',
  name: '',
  type: 'PERCENT' as 'PERCENT' | 'FLAT',
  value: '10',
  minOrderAmount: '',
  maxDiscount: '',
  usageLimit: '',
  isActive: true,
}

export default function OffersPage() {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const offers = useQuery({ queryKey: ['offers'], queryFn: () => offersApi.list() as Promise<Offer[]> })

  const save = useMutation({
    mutationFn: () => offersApi.create({
      code: form.code.trim().toUpperCase(),
      name: form.name.trim() || form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      isActive: form.isActive,
    }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['offers'] })
      toast.success('Promo code created — usable at POS checkout')
      setOpen(false)
      setForm(empty)
    },
    onError: (error) => toast.error(formatApiError(error, 'Could not create promo code')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => offersApi.delete(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['offers'] })
      toast.success('Promo removed')
    },
    onError: (error) => toast.error(formatApiError(error, 'Could not delete promo')),
  })

  const rows = useMemo(() => offers.data ?? [], [offers.data])

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader
          title="Promo / Vouchers"
          description="Create discount codes used in POS checkout (Voucher Code)"
          actions={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New promo</Button>}
        />
        {offers.isLoading ? <p className="py-12 text-center text-muted-foreground">Loading…</p>
          : !rows.length ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground">
              <Tag className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p>No promo codes yet. Create one to use at POS billing.</p>
              <Button className="mt-4" onClick={() => setOpen(true)}>Create first promo</Button>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {rows.map((offer) => (
                <Card key={offer.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{offer.code}</p>
                        <Badge variant={offer.isActive === false ? 'secondary' : 'success'}>{offer.isActive === false ? 'Inactive' : 'Active'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{offer.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {offer.type === 'PERCENT' ? `${offer.value}% off` : `${formatCurrency(Number(offer.value))} off`}
                        {offer.minOrderAmount ? ` · Min order ${formatCurrency(Number(offer.minOrderAmount))}` : ''}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => remove.mutate(offer.id)}>Delete</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New promo code</DialogTitle>
              <DialogDescription>Customers/staff enter this code in POS checkout as the voucher.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE10" /></div>
              <div className="space-y-2"><Label>Display name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="10% off lunch" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(type: 'PERCENT' | 'FLAT') => setForm({ ...form, type })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENT">Percent %</SelectItem>
                      <SelectItem value="FLAT">Flat amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Value</Label><Input type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Min order (optional)</Label><Input type="number" min="0" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} /></div>
                <div className="space-y-2"><Label>Max discount (optional)</Label><Input type="number" min="0" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Usage limit (optional)</Label><Input type="number" min="0" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} /></div>
              <label className="flex items-center justify-between rounded-lg border p-3"><span>Active</span><Switch checked={form.isActive} onCheckedChange={(isActive) => setForm({ ...form, isActive })} /></label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={!form.code.trim() || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}

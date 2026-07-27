import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Download, Truck } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { purchasesApi, vendorsApi } from '@/api/phase1.api'

type PurchaseRow = { id: string; po: string; vendor: string; items: number; total: number; status: string; date: string }

export default function PurchasePage() {
  const [tab, setTab] = useState('orders')
  const [dialog, setDialog] = useState<'po' | 'vendor' | 'receipt' | 'return' | null>(null)
  const [form, setForm] = useState({ vendorId: '', number: '', itemName: '', quantity: 1, unitPrice: 0, total: 0, reason: '' })
  const queryClient = useQueryClient()
  const { data: purchases = [] } = useQuery({ queryKey: ['purchases'], queryFn: purchasesApi.list })
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: vendorsApi.list })
  const { data: receipts = [] } = useQuery({ queryKey: ['purchases', 'receipts'], queryFn: purchasesApi.listReceipts })
  const { data: returns = [] } = useQuery({ queryKey: ['purchases', 'returns'], queryFn: purchasesApi.listReturns })
  const createMutation = useMutation({
    mutationFn: async () => {
      if (dialog === 'vendor') return vendorsApi.create({ name: form.itemName })
      if (dialog === 'return') return purchasesApi.createReturn({ vendorId: form.vendorId, returnNumber: form.number, total: form.total, reason: form.reason })
      const item = { name: form.itemName, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }
      return dialog === 'receipt'
        ? purchasesApi.createReceipt({ vendorId: form.vendorId, grnNumber: form.number, items: [item] })
        : purchasesApi.create({ vendorId: form.vendorId, poNumber: form.number, items: [item] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success(`${dialog === 'po' ? 'Purchase order' : dialog === 'receipt' ? 'Goods receipt' : dialog === 'return' ? 'Purchase return' : 'Vendor'} created`)
      setDialog(null)
      setForm({ vendorId: '', number: '', itemName: '', quantity: 1, unitPrice: 0, total: 0, reason: '' })
    },
    onError: (error: Error) => toast.error(error.message || 'Unable to save purchase record'),
  })
  const rows = useMemo<PurchaseRow[]>(() => {
    if (tab === 'vendors') return (vendors as Array<{ id: string; name: string; createdAt?: string }>).map((vendor) => ({ id: vendor.id, po: '—', vendor: vendor.name, items: 0, total: 0, status: 'active', date: vendor.createdAt ?? '' }))
    const source = tab === 'receive' ? receipts : tab === 'returns' ? returns : purchases
    return (source as Array<{ id: string; poNumber?: string; grnNumber?: string; returnNumber?: string; vendor?: { name?: string }; items?: unknown[]; total?: number; status?: string; createdAt?: string }>).map((entry) => ({
      id: entry.id, po: entry.poNumber ?? entry.grnNumber ?? entry.returnNumber ?? '—', vendor: entry.vendor?.name ?? '—',
      items: entry.items?.length ?? 0, total: Number(entry.total ?? 0), status: entry.status ?? (tab === 'returns' ? 'returned' : 'received'), date: entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '—',
    }))
  }, [purchases, receipts, returns, tab, vendors])
  const columns = useMemo<ColumnDef<PurchaseRow>[]>(() => [
    { accessorKey: 'po', header: 'PO Number' },
    { accessorKey: 'vendor', header: 'Vendor' },
    { accessorKey: 'items', header: 'Items' },
    { accessorKey: 'total', header: 'Total', cell: ({ row }) => formatCurrency(row.original.total) },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'received' ? 'success' : 'warning'}>{row.original.status}</Badge> },
    { accessorKey: 'date', header: 'Date' }
  ], [])

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Purchase Orders" description="Manage vendors, purchase orders, and goods receiving" actions={
          <>
            <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Export</Button>
            <Button onClick={() => setDialog(tab === 'vendors' ? 'vendor' : tab === 'receive' ? 'receipt' : tab === 'returns' ? 'return' : 'po')}><Plus className="h-4 w-4 mr-2" /> {tab === 'vendors' ? 'New Vendor' : tab === 'receive' ? 'New Receipt' : tab === 'returns' ? 'New Return' : 'New PO'}</Button>
          </>
        } />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Purchase Orders" value={purchases.length} format="number" icon={<Truck className="h-5 w-5" />} />
          <StatCard title="Order Total" value={rows.reduce((sum, row) => sum + row.total, 0)} format="currency" icon={<Truck className="h-5 w-5" />} />
          <StatCard title="Active Vendors" value={vendors.length} format="number" icon={<Truck className="h-5 w-5" />} />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="receive">Goods Receive</TabsTrigger>
            <TabsTrigger value="returns">Returns</TabsTrigger>
          </TabsList>
        </Tabs>
        <DataTable columns={columns} data={rows} searchKey="po" />
        <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{dialog === 'po' ? 'Create Purchase Order' : dialog === 'vendor' ? 'Create Vendor' : dialog === 'receipt' ? 'Record Goods Receipt' : 'Create Purchase Return'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {dialog !== 'vendor' && <div className="space-y-1"><Label>Vendor</Label><Select value={form.vendorId} onValueChange={(vendorId) => setForm({ ...form, vendorId })}><SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger><SelectContent>{(vendors as Array<{ id: string; name: string }>).map((vendor) => <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>)}</SelectContent></Select></div>}
              {dialog === 'vendor' ? <div className="space-y-1"><Label>Vendor name</Label><Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} /></div> : <>
                <div className="space-y-1"><Label>{dialog === 'po' ? 'PO number' : dialog === 'receipt' ? 'GRN number' : 'Return number'}</Label><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
                {dialog === 'return' ? <><div className="space-y-1"><Label>Total</Label><Input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} /></div><div className="space-y-1"><Label>Reason</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div></> : <><div className="space-y-1"><Label>Item name</Label><Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Quantity</Label><Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div><div className="space-y-1"><Label>Unit price</Label><Input type="number" min="0" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} /></div></div></>}
              </>}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button disabled={createMutation.isPending || !form.itemName || (dialog !== 'vendor' && (!form.vendorId || !form.number))} onClick={() => createMutation.mutate()}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}

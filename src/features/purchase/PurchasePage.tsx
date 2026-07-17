import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Download, Truck } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'

const PURCHASE_ORDERS = [
  { id: '1', po: 'PO-2024-001', vendor: 'Fresh Farms Co.', items: 12, total: 2450, status: 'pending', date: 'Jun 28, 2026' },
  { id: '2', po: 'PO-2024-002', vendor: 'Metro Supplies', items: 8, total: 1280, status: 'received', date: 'Jun 25, 2026' },
  { id: '3', po: 'PO-2024-003', vendor: 'Ocean Catch Ltd.', items: 5, total: 3200, status: 'partial', date: 'Jun 22, 2026' }
]

export default function PurchasePage() {
  const columns = useMemo<ColumnDef<typeof PURCHASE_ORDERS[0]>[]>(() => [
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
            <Button><Plus className="h-4 w-4 mr-2" /> New PO</Button>
          </>
        } />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Pending POs" value={3} format="number" icon={<Truck className="h-5 w-5" />} />
          <StatCard title="This Month" value={12450} format="currency" icon={<Truck className="h-5 w-5" />} />
          <StatCard title="Active Vendors" value={18} format="number" icon={<Truck className="h-5 w-5" />} />
        </div>
        <Tabs defaultValue="orders">
          <TabsList>
            <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="receive">Goods Receive</TabsTrigger>
            <TabsTrigger value="returns">Returns</TabsTrigger>
          </TabsList>
        </Tabs>
        <DataTable columns={columns} data={PURCHASE_ORDERS} searchKey="po" />
      </div>
    </PageShell>
  )
}

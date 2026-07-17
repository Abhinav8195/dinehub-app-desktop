import { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Plus, Download, Package, AlertTriangle, Warehouse, ArrowRightLeft,
  BarChart3, QrCode, Edit, ClipboardList, Search
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { APP_BASE } from '@/constants/navigation'
import { inventoryApi } from '@/api/inventory.api'
import { formatCurrency } from '@/lib/utils'

interface WarehouseDto {
  id: string
  name: string
  location?: string | null
  isDefault?: boolean
}

interface InventoryItemDto {
  id: string
  sku: string
  name: string
  unit: string
  quantity: number
  minStock: number
  costPerUnit: number
  expiryDate?: string | null
  isLowStock?: boolean
  warehouse?: WarehouseDto | null
}

interface InventoryLogDto {
  id: string
  type: string
  quantity: number
  notes?: string | null
  createdAt: string
  inventoryItem?: { name: string; sku: string }
}

const ROUTE_TAB: Record<string, string> = {
  [`${APP_BASE}/inventory`]: 'dashboard',
  [`${APP_BASE}/inventory/items`]: 'items',
  [`${APP_BASE}/inventory/warehouse`]: 'warehouse',
  [`${APP_BASE}/inventory/materials`]: 'materials',
  [`${APP_BASE}/inventory/goods`]: 'goods',
  [`${APP_BASE}/inventory/transfer`]: 'transfer',
  [`${APP_BASE}/inventory/purchase`]: 'purchase',
  [`${APP_BASE}/inventory/logs`]: 'logs',
}

const TAB_ROUTE: Record<string, string> = Object.fromEntries(
  Object.entries(ROUTE_TAB).map(([k, v]) => [v, k]),
)

function stockStatus(item: InventoryItemDto): 'ok' | 'low' | 'critical' {
  if (item.quantity <= item.minStock * 0.5) return 'critical'
  if (item.isLowStock || item.quantity <= item.minStock) return 'low'
  return 'ok'
}

const statusBadge = (s: string): 'success' | 'warning' | 'destructive' => {
  const m: Record<string, 'success' | 'warning' | 'destructive'> = {
    ok: 'success',
    low: 'warning',
    critical: 'destructive',
  }
  return m[s] || 'success'
}

export default function InventoryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    sku: '',
    unit: 'kg',
    minStock: 10,
    warehouseId: '',
    costPerUnit: 0,
  })

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory', 'items'],
    queryFn: () => inventoryApi.listItems() as Promise<InventoryItemDto[]>,
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['inventory', 'warehouses'],
    queryFn: () => inventoryApi.listWarehouses() as Promise<WarehouseDto[]>,
  })

  const { data: logs = [] } = useQuery({
    queryKey: ['inventory', 'logs'],
    queryFn: () => inventoryApi.listLogs() as Promise<InventoryLogDto[]>,
  })

  const createItem = useMutation({
    mutationFn: () =>
      inventoryApi.createItem({
        name: form.name,
        sku: form.sku,
        unit: form.unit,
        minStock: form.minStock,
        warehouseId: form.warehouseId,
        costPerUnit: form.costPerUnit,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Inventory item added')
      setAddOpen(false)
      setForm({ name: '', sku: '', unit: 'kg', minStock: 10, warehouseId: '', costPerUnit: 0 })
    },
    onError: () => toast.error('Failed to add item'),
  })

  const activeTab = ROUTE_TAB[location.pathname] ?? 'dashboard'
  const lowStock = items.filter((i) => stockStatus(i) !== 'ok')
  const totalValue = items.reduce((s, i) => s + i.quantity * i.costPerUnit, 0)

  const columns = useMemo<ColumnDef<InventoryItemDto>[]>(() => [
    { accessorKey: 'name', header: 'Item' },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.original.sku}</code>
      ),
    },
    {
      accessorKey: 'quantity',
      header: 'Stock',
      cell: ({ row }) => {
        const max = Math.max(row.original.minStock * 5, row.original.quantity, 1)
        const pct = (row.original.quantity / max) * 100
        return (
          <div className="space-y-1 min-w-[100px]">
            <span className="text-sm font-medium">{row.original.quantity} {row.original.unit}</span>
            <Progress value={Math.min(pct, 100)} className="h-1" />
          </div>
        )
      },
    },
    { accessorKey: 'minStock', header: 'Min' },
    {
      accessorKey: 'costPerUnit',
      header: 'Unit Cost',
      cell: ({ row }) => formatCurrency(row.original.costPerUnit),
    },
    {
      accessorKey: 'warehouse',
      header: 'Warehouse',
      cell: ({ row }) => row.original.warehouse?.name ?? '—',
    },
    {
      accessorKey: 'expiryDate',
      header: 'Expiry',
      cell: ({ row }) =>
        row.original.expiryDate
          ? new Date(row.original.expiryDate).toLocaleDateString()
          : '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = stockStatus(row.original)
        return <Badge variant={statusBadge(s)}>{s}</Badge>
      },
    },
    {
      id: 'actions',
      header: '',
      cell: () => (
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Edit className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ], [])

  const ItemsTable = ({ data }: { data: InventoryItemDto[] }) => (
    <DataTable columns={columns} data={data} searchKey="name" searchPlaceholder="Search items..." />
  )

  const warehouseStats = warehouses.map((wh) => {
    const whItems = items.filter((i) => i.warehouse?.id === wh.id)
    return {
      ...wh,
      itemCount: whItems.length,
      value: whItems.reduce((s, i) => s + i.quantity * i.costPerUnit, 0),
    }
  })

  return (
    <PageShell isLoading={isLoading}>
      <div className="page-container">
        <PageHeader
          title="Inventory Management"
          description="Stock levels, warehouses, transfers, consumption & alerts"
          actions={
            <>
              <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Export</Button>
              <Button variant="outline"><QrCode className="h-4 w-4 mr-2" /> Scan Barcode</Button>
              <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Item</Button>
            </>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Items" value={items.length} format="number" icon={<Package className="h-5 w-5" />} />
          <StatCard title="Low Stock" value={lowStock.length} format="number" icon={<AlertTriangle className="h-5 w-5" />} />
          <StatCard title="Stock Value" value={totalValue} format="currency" icon={<BarChart3 className="h-5 w-5" />} />
          <StatCard title="Warehouses" value={warehouses.length} format="number" icon={<Warehouse className="h-5 w-5" />} />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => navigate(TAB_ROUTE[v])}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="items">All Items</TabsTrigger>
            <TabsTrigger value="warehouse">Warehouse</TabsTrigger>
            <TabsTrigger value="transfer">Stock Transfer</TabsTrigger>
            <TabsTrigger value="purchase">Purchase</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4 space-y-6">
            {lowStock.length > 0 && (
              <Card className="border-warning/30 bg-warning/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-4 w-4" /> Low Stock Alerts ({lowStock.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {lowStock.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-background border">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} {item.unit} left · Min: {item.minStock}
                        </p>
                      </div>
                      <Badge variant={statusBadge(stockStatus(item))}>{stockStatus(item)}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {logs.slice(0, 4).map((log) => (
                    <div key={log.id} className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted text-xs font-medium">
                        {log.type.slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{log.inventoryItem?.name ?? 'Item'}</p>
                        <p className="text-xs text-muted-foreground capitalize">{log.type.toLowerCase()}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {!logs.length && (
                    <p className="text-sm text-muted-foreground">No inventory activity yet</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Warehouse Overview</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {warehouseStats.map((wh) => (
                    <div key={wh.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{wh.name}</p>
                        <p className="text-xs text-muted-foreground">{wh.location ?? '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(wh.value)}</p>
                        <p className="text-xs text-muted-foreground">{wh.itemCount} items</p>
                      </div>
                    </div>
                  ))}
                  {!warehouseStats.length && (
                    <p className="text-sm text-muted-foreground">No warehouses configured</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="items" className="mt-4"><ItemsTable data={items} /></TabsContent>

          <TabsContent value="warehouse" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {warehouseStats.map((wh) => (
                <Card key={wh.id} className="hover:shadow-elevated transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Warehouse className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{wh.name}</p>
                        <p className="text-xs text-muted-foreground">{wh.location ?? '—'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><p className="text-muted-foreground text-xs">Items</p><p className="font-bold">{wh.itemCount}</p></div>
                      <div><p className="text-muted-foreground text-xs">Value</p><p className="font-bold">{formatCurrency(wh.value)}</p></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="transfer" className="mt-4">
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium text-foreground">Stock transfers</p>
                <p className="text-sm mt-1">Transfer API coming soon — use adjust stock for now.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchase" className="mt-4">
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="font-medium">Purchase Orders linked to Inventory</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Create purchase orders to restock low inventory items</p>
                <Button onClick={() => navigate(`${APP_BASE}/purchase`)}>Go to Purchase Module →</Button>
              </CardContent>
            </Card>
            {lowStock.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-3">Items needing reorder</p>
                <ItemsTable data={lowStock} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> Inventory Logs
                </CardTitle>
                <div className="relative w-48">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search logs..." className="pl-8 h-8 text-sm" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="w-20 justify-center capitalize">
                        {log.type.toLowerCase()}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{log.inventoryItem?.name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">Qty: {log.quantity}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
                {!logs.length && (
                  <p className="text-sm text-muted-foreground text-center py-6">No logs yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                <div className="space-y-2"><Label>Min Stock</Label><Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: +e.target.value })} /></div>
                <div className="space-y-2"><Label>Unit Cost</Label><Input type="number" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: +e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label>Warehouse</Label>
                <Select value={form.warehouseId} onValueChange={(v) => setForm({ ...form, warehouseId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                disabled={!form.name || !form.sku || !form.warehouseId || createItem.isPending}
                onClick={() => createItem.mutate()}
              >
                Add Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}

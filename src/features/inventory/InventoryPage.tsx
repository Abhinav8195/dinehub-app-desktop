import { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Plus, Download, Package, AlertTriangle, Warehouse, ArrowRightLeft,
  BarChart3, QrCode, ClipboardList, Search, Pencil, Trash2, Eye
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
import { Switch } from '@/components/ui/switch'
import { APP_BASE } from '@/constants/navigation'
import { inventoryApi } from '@/api/inventory.api'
import { mapBackendError } from '@/api/management-utils'
import { formatCurrency } from '@/lib/utils'
import { FeatureGate } from '@/guards/FeatureGate'

interface WarehouseDto {
  id: string
  name: string
  code: string
  location?: string | null
  description?: string | null
  isDefault: boolean
  isActive: boolean
  itemCount?: number
  stockValue?: number
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
  const [transferOpen, setTransferOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [warehouseOpen, setWarehouseOpen] = useState(false)
  const [warehouseDetails, setWarehouseDetails] = useState<WarehouseDto | null>(null)
  const [warehouseToDelete, setWarehouseToDelete] = useState<WarehouseDto | null>(null)
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null)
  const [warehouseForm, setWarehouseForm] = useState({
    name: '', code: '', location: '', description: '', isDefault: false, isActive: true,
  })
  const [adjustForm, setAdjustForm] = useState({ id: '', name: '', quantity: 0, notes: '' })
  const [transferForm, setTransferForm] = useState({ inventoryItemId: '', fromWarehouseId: '', toWarehouseId: '', quantity: 1, notes: '' })
  const [form, setForm] = useState({
    name: '',
    sku: '',
    unit: 'kg',
    minStock: 10,
    warehouseId: '',
    costPerUnit: 0,
    itemType: 'RAW',
  })

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory', 'items', location.pathname],
    queryFn: async () => (await inventoryApi.listItems({
      ...(location.pathname.endsWith('/materials') ? { itemType: 'RAW' } : {}),
      ...(location.pathname.endsWith('/goods') ? { itemType: 'FINISHED' } : {}),
      limit: 100,
    })).data as InventoryItemDto[],
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['inventory', 'warehouses'],
    queryFn: () => inventoryApi.listWarehouses() as Promise<WarehouseDto[]>,
  })

  const { data: logs = [] } = useQuery({
    queryKey: ['inventory', 'logs'],
    queryFn: async () => (await inventoryApi.listLogs({ limit: 100 })).data.map((log): InventoryLogDto => ({
      id: log.id, type: log.type, quantity: log.quantityChange, notes: log.notes,
      createdAt: log.createdAt, inventoryItem: log.inventoryItem,
    })),
  })

  const createItem = useMutation({
    mutationFn: () =>
      inventoryApi.createItem({
        name: form.name,
        sku: form.sku,
        unit: form.unit,
        minStock: form.minStock,
        openingQuantity: 0,
        warehouseId: form.warehouseId,
        costPerUnit: form.costPerUnit,
        itemType: form.itemType as 'RAW' | 'FINISHED',
        isActive: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Inventory item added')
      setAddOpen(false)
      setForm({ name: '', sku: '', unit: 'kg', minStock: 10, warehouseId: '', costPerUnit: 0, itemType: 'RAW' })
    },
    onError: () => toast.error('Failed to add item'),
  })
  const saveWarehouse = useMutation({
    mutationFn: () => {
      const body = {
        name: warehouseForm.name.trim(), code: warehouseForm.code.trim().toUpperCase(),
        location: warehouseForm.location.trim() || null, description: warehouseForm.description.trim() || null,
        isDefault: warehouseForm.isDefault, isActive: warehouseForm.isActive,
      }
      return editingWarehouseId
        ? inventoryApi.updateWarehouse(editingWarehouseId, body)
        : inventoryApi.createWarehouse(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success(editingWarehouseId ? 'Warehouse updated' : 'Warehouse created')
      setWarehouseOpen(false)
    },
    onError: (error) => toast.error(mapBackendError(error).message),
  })
  const toggleWarehouse = useMutation({
    mutationFn: (warehouse: WarehouseDto) => inventoryApi.updateWarehouse(warehouse.id, { isActive: !warehouse.isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Warehouse status updated') },
    onError: (error) => toast.error(mapBackendError(error).message),
  })
  const deleteWarehouse = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteWarehouse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Warehouse deleted')
      setWarehouseToDelete(null)
    },
    onError: (error) => toast.error(mapBackendError(error).message),
  })

  const openCreateWarehouse = () => {
    setEditingWarehouseId(null)
    setWarehouseForm({ name: '', code: '', location: '', description: '', isDefault: false, isActive: true })
    setWarehouseOpen(true)
  }
  const openEditWarehouse = (warehouse: WarehouseDto) => {
    setEditingWarehouseId(warehouse.id)
    setWarehouseForm({
      name: warehouse.name, code: warehouse.code, location: warehouse.location ?? '',
      description: warehouse.description ?? '', isDefault: warehouse.isDefault, isActive: warehouse.isActive,
    })
    setWarehouseOpen(true)
  }
  const transferItem = useMutation({
    mutationFn: (body: typeof transferForm) => inventoryApi.createTransfer(body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Stock transferred') },
    onError: (error: Error) => toast.error(error.message || 'Failed to transfer stock'),
  })
  const adjustStock = useMutation({
    mutationFn: () => inventoryApi.adjustStock(adjustForm.id, {
      mode: 'SET', quantity: adjustForm.quantity, reason: 'PHYSICAL_COUNT', notes: adjustForm.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Stock adjusted')
      setAdjustOpen(false)
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to adjust stock'),
  })
  const exportInventory = async () => {
    try {
      const report = await inventoryApi.export()
      const result = await window.electronAPI.saveFile(report)
      if (result.saved) toast.success('Inventory export saved')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to export inventory') }
  }

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
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={() => {
            setAdjustForm({ id: row.original.id, name: row.original.name, quantity: row.original.quantity, notes: '' })
            setAdjustOpen(true)
          }}
        >
          Adjust
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
              <Button variant="outline" onClick={exportInventory}><Download className="h-4 w-4 mr-2" /> Export</Button>
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
            <TabsTrigger value="materials">Raw Materials</TabsTrigger>
            <TabsTrigger value="goods">Finished Goods</TabsTrigger>
            <FeatureGate feature="STOCK_TRANSFER"><TabsTrigger value="transfer">Stock Transfer</TabsTrigger></FeatureGate>
            <FeatureGate feature="PURCHASE_ORDERS"><TabsTrigger value="purchase">Purchase</TabsTrigger></FeatureGate>
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
          <TabsContent value="materials" className="mt-4"><ItemsTable data={items} /></TabsContent>
          <TabsContent value="goods" className="mt-4"><ItemsTable data={items} /></TabsContent>

          <TabsContent value="warehouse" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Warehouses</h2>
                <p className="text-sm text-muted-foreground">Manage storage locations and their availability.</p>
              </div>
              <Button onClick={openCreateWarehouse}><Plus className="h-4 w-4 mr-2" /> Add Warehouse</Button>
            </div>
            {!warehouseStats.length && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Warehouse className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="font-medium">No warehouses configured</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">Create a warehouse before adding inventory items.</p>
                  <Button onClick={openCreateWarehouse}>Create warehouse</Button>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {warehouseStats.map((wh) => (
                <Card key={wh.id} className={`hover:shadow-elevated transition-all ${!wh.isActive ? 'opacity-70' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Warehouse className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{wh.name}</p>
                            {wh.isDefault && <Badge variant="secondary">Default</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{wh.code} · {wh.location ?? 'No location'}</p>
                        </div>
                      </div>
                      <Badge variant={wh.isActive ? 'success' : 'secondary'}>{wh.isActive ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    {wh.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{wh.description}</p>}
                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div><p className="text-muted-foreground text-xs">Items</p><p className="font-bold">{wh.itemCount}</p></div>
                      <div><p className="text-muted-foreground text-xs">Stock value</p><p className="font-bold">{formatCurrency(wh.value)}</p></div>
                    </div>
                    <div className="flex items-center justify-between border-t pt-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={wh.isActive}
                          disabled={toggleWarehouse.isPending || wh.isDefault}
                          onCheckedChange={() => toggleWarehouse.mutate(wh)}
                        />
                        <span className="text-xs text-muted-foreground">{wh.isActive ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="View details" onClick={() => setWarehouseDetails(wh)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit warehouse" onClick={() => openEditWarehouse(wh)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Delete warehouse"
                          className="text-danger" disabled={wh.isDefault}
                          onClick={() => setWarehouseToDelete(wh)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <FeatureGate feature="STOCK_TRANSFER"><TabsContent value="transfer" className="mt-4">
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium text-foreground">Stock transfers</p>
                <p className="text-sm mt-1">Move stock between warehouses with an auditable transfer.</p>
                <Button className="mt-4" onClick={() => setTransferOpen(true)} disabled={transferItem.isPending}>Create transfer</Button>
              </CardContent>
            </Card>
          </TabsContent></FeatureGate>

          <FeatureGate feature="PURCHASE_ORDERS"><TabsContent value="purchase" className="mt-4">
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
          </TabsContent></FeatureGate>

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

        <Dialog open={warehouseOpen} onOpenChange={setWarehouseOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingWarehouseId ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={warehouseForm.name} onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })} placeholder="Main Warehouse" />
                </div>
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input
                    value={warehouseForm.code}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value.toUpperCase() })}
                    placeholder="MAIN" maxLength={30}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={warehouseForm.location} onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })} placeholder="Ground floor" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={warehouseForm.description} onChange={(e) => setWarehouseForm({ ...warehouseForm, description: e.target.value })} placeholder="Primary storage location" />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div><p className="text-sm font-medium">Default warehouse</p><p className="text-xs text-muted-foreground">Used automatically for new stock.</p></div>
                <Switch checked={warehouseForm.isDefault} onCheckedChange={(isDefault) => setWarehouseForm({ ...warehouseForm, isDefault })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div><p className="text-sm font-medium">Active</p><p className="text-xs text-muted-foreground">Allow inventory operations at this location.</p></div>
                <Switch checked={warehouseForm.isActive} onCheckedChange={(isActive) => setWarehouseForm({ ...warehouseForm, isActive })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWarehouseOpen(false)}>Cancel</Button>
              <Button
                disabled={!warehouseForm.name.trim() || !warehouseForm.code.trim() || saveWarehouse.isPending}
                onClick={() => saveWarehouse.mutate()}
              >
                {saveWarehouse.isPending ? 'Saving…' : editingWarehouseId ? 'Save changes' : 'Create warehouse'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(warehouseDetails)} onOpenChange={(open) => { if (!open) setWarehouseDetails(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Warehouse Details</DialogTitle></DialogHeader>
            {warehouseDetails && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Warehouse className="h-6 w-6 text-primary" /></div>
                  <div><p className="font-semibold">{warehouseDetails.name}</p><p className="text-sm text-muted-foreground">{warehouseDetails.code}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/50 p-4 text-sm">
                  <div><p className="text-muted-foreground">Location</p><p className="font-medium">{warehouseDetails.location || '—'}</p></div>
                  <div><p className="text-muted-foreground">Status</p><p className="font-medium">{warehouseDetails.isActive ? 'Active' : 'Inactive'}</p></div>
                  <div><p className="text-muted-foreground">Items</p><p className="font-medium">{warehouseDetails.itemCount ?? 0}</p></div>
                  <div><p className="text-muted-foreground">Stock value</p><p className="font-medium">{formatCurrency(warehouseDetails.stockValue ?? warehouseStats.find((w) => w.id === warehouseDetails.id)?.value ?? 0)}</p></div>
                </div>
                {warehouseDetails.description && <p className="text-sm text-muted-foreground">{warehouseDetails.description}</p>}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setWarehouseDetails(null)}>Close</Button>
              <Button onClick={() => { if (warehouseDetails) openEditWarehouse(warehouseDetails); setWarehouseDetails(null) }}>Edit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(warehouseToDelete)} onOpenChange={(open) => { if (!open) setWarehouseToDelete(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Warehouse?</DialogTitle></DialogHeader>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>This will delete <span className="font-medium text-foreground">{warehouseToDelete?.name}</span>.</p>
              <p>Deletion will be blocked if inventory items or pending transfers depend on this warehouse.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWarehouseToDelete(null)}>Cancel</Button>
              <Button
                variant="destructive" disabled={!warehouseToDelete || deleteWarehouse.isPending}
                onClick={() => warehouseToDelete && deleteWarehouse.mutate(warehouseToDelete.id)}
              >
                {deleteWarehouse.isPending ? 'Deleting…' : 'Delete warehouse'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              <div className="space-y-2">
                <Label>Item Type</Label>
                <Select value={form.itemType} onValueChange={(itemType) => setForm({ ...form, itemType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="RAW">Raw material</SelectItem><SelectItem value="FINISHED">Finished good</SelectItem></SelectContent>
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
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Transfer Stock</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Item</Label><Select value={transferForm.inventoryItemId} onValueChange={(inventoryItemId) => setTransferForm({ ...transferForm, inventoryItemId })}><SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger><SelectContent>{items.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>From warehouse</Label><Select value={transferForm.fromWarehouseId} onValueChange={(fromWarehouseId) => setTransferForm({ ...transferForm, fromWarehouseId })}><SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger><SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>To warehouse</Label><Select value={transferForm.toWarehouseId} onValueChange={(toWarehouseId) => setTransferForm({ ...transferForm, toWarehouseId })}><SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger><SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div></div>
              <div className="space-y-1"><Label>Quantity</Label><Input type="number" min="0.01" value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label>Notes</Label><Input value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button><Button disabled={!transferForm.inventoryItemId || !transferForm.fromWarehouseId || !transferForm.toWarehouseId || transferForm.fromWarehouseId === transferForm.toWarehouseId || transferItem.isPending} onClick={() => transferItem.mutate(transferForm, { onSuccess: () => setTransferOpen(false) })}>Transfer</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Adjust Stock · {adjustForm.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>New quantity</Label><Input type="number" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label>Notes</Label><Input value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
              <Button disabled={!adjustForm.id || !Number.isFinite(adjustForm.quantity) || adjustStock.isPending} onClick={() => adjustStock.mutate()}>Save adjustment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}

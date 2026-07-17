import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, Star, Minus, Plus, Trash2, Pause, RotateCcw, Receipt
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  addToCart, removeFromCart, updateQuantity, clearCart,
  setOrderType, holdOrder, resumeOrder, setSelectedTable
} from '@/store/slices/posSlice'
import { addOrder } from '@/store/slices/ordersSlice'
import { formatCurrency, cn } from '@/lib/utils'
import { calculateTaxBreakdown, DEFAULT_TAX_SETTINGS } from '@/lib/tax'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { BRAND } from '@/constants/brand'
import { buildReceiptHtml } from '@/lib/print/receipt'
import { menuApi } from '@/api/menu.api'
import { tablesApi } from '@/api/tables.api'
import { useTaxSettings } from '@/hooks/useTaxSettings'
import { CheckoutModal } from './components/CheckoutModal'
import { MOCK_MENU_CATEGORIES, MOCK_MENU_ITEMS } from '@/constants/mock-data'
import type { RootState } from '@/store'
import type { MenuItemDto } from '@/api/types/pos.types'

export default function POSPage() {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { cart, orderType, heldOrders, selectedTableId } = useSelector((s: RootState) => s.pos)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const { data: taxSettings } = useTaxSettings()

  const { data: categories = [] } = useQuery({
    queryKey: ['menu-categories'],
    queryFn: () => menuApi.listCategories(),
    placeholderData: MOCK_MENU_CATEGORIES.map((c) => ({ id: c.id, name: c.name, icon: c.icon, count: c.count })),
  })

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items', selectedCategory],
    queryFn: () => menuApi.listItems(selectedCategory || undefined),
    placeholderData: MOCK_MENU_ITEMS.map((item) => ({
      id: item.id,
      name: item.name,
      description: '',
      price: item.price,
      categoryId: '1',
      category: item.category,
      available: item.available,
      popular: item.popular,
    })),
  })

  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesApi.list(),
    enabled: orderType === 'dine-in',
  })

  const filteredItems = menuItems.filter((item) => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    return matchSearch && item.available
  })

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const breakdown = calculateTaxBreakdown(subtotal, taxSettings ?? DEFAULT_TAX_SETTINGS)

  const handleAddItem = (item: MenuItemDto) => {
    dispatch(addToCart({ id: item.id, name: item.name, price: item.price, quantity: 1 }))
    toast.success(`Added ${item.name}`)
  }

  const handleOrderSuccess = (orderNumber: string, total: number, paymentMethod: string) => {
    toast.success(`Order ${orderNumber} placed — ${formatCurrency(total)}`)

    dispatch(addOrder({
      id: orderNumber,
      orderNumber,
      type: orderType,
      status: 'pending',
      items: [...cart],
      subtotal,
      tax: breakdown.gstAmount + breakdown.sgstAmount + breakdown.cgstAmount,
      discount: 0,
      total,
      tableId: selectedTableId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    if (window.electronAPI?.printReceipt) {
      const html = buildReceiptHtml({
        orderNumber,
        items: cart.map((i) => ({ name: i.name, qty: i.quantity, price: i.price })),
        subtotal,
        tax: breakdown.gstAmount + breakdown.sgstAmount + breakdown.cgstAmount,
        total,
        paymentMethod,
      })
      window.electronAPI.printReceipt(html).catch(() => {})
    }

    dispatch(clearCart())
    dispatch(setSelectedTable(null))
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['tables'] })
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background">
      {/* Left - Category Sidebar */}
      <div className="w-[100px] md:w-[120px] flex flex-col border-r bg-card shrink-0">
        <div className="p-3 border-b flex flex-col items-center gap-1">
          <BrandLogo size="xs" showText={false} />
          <p className="text-[10px] font-bold text-center leading-tight">{BRAND.name}</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'w-full flex flex-col items-center gap-1 py-3 px-1 text-[10px] font-medium transition-colors',
              !selectedCategory ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            )}
          >
            <span className="text-xl">🍽️</span>
            <span>All</span>
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'w-full flex flex-col items-center gap-1 py-3 px-1 text-[10px] font-medium transition-colors',
                selectedCategory === cat.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              )}
            >
              <span className="text-xl">{cat.icon || '🍽️'}</span>
              <span className="text-center leading-tight">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Center - Products */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="flex items-center justify-between p-4 border-b bg-card shrink-0 gap-3">
          <div>
            <h1 className="text-xl font-bold">Products Menu</h1>
            <p className="text-xs text-muted-foreground">Select items to add to order</p>
          </div>
          <Tabs value={orderType} onValueChange={(v) => dispatch(setOrderType(v as typeof orderType))}>
            <TabsList>
              <TabsTrigger value="dine-in">Dine In</TabsTrigger>
              <TabsTrigger value="takeaway">Takeaway</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="p-4 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="relative flex flex-col rounded-2xl border bg-card overflow-hidden hover:shadow-elevated hover:border-primary/30 transition-all"
              >
                {item.popular && (
                  <Badge className="absolute top-2 right-2 text-[10px] z-10" variant="warning">
                    <Star className="h-2.5 w-2.5 mr-0.5" /> Popular
                  </Badge>
                )}
                <div className="flex h-24 items-center justify-center bg-muted/50 text-4xl">
                  {categories.find((c) => c.id === item.categoryId)?.icon || categories.find((c) => c.name === item.category)?.icon || '🍽️'}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <p className="text-sm font-semibold leading-tight">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                  <p className="text-base font-bold text-primary mt-2">{formatCurrency(item.price)}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {orderType === 'dine-in' && <Badge variant="outline" className="text-[9px]">Dine in</Badge>}
                    {orderType === 'takeaway' && <Badge variant="outline" className="text-[9px]">Pick Up</Badge>}
                  </div>
                  <Button type="button" size="sm" className="mt-3 w-full" onClick={() => handleAddItem(item)}>
                    Add to Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Cart */}
      <div className="w-[340px] flex flex-col bg-card shrink-0 min-h-0 border-l">
        <div className="p-4 border-b shrink-0">
          <h2 className="font-semibold">Ordered Items</h2>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No items yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add products from the menu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="p-3 rounded-xl border bg-muted/30">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} each</p>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => dispatch(updateQuantity({ id: item.id, quantity: Math.max(1, item.quantity - 1) }))}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <button type="button" className="text-xs text-danger hover:underline"
                      onClick={() => dispatch(removeFromCart(item.id))}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-1.5">
            <Button type="button" variant="outline" size="sm" className="text-xs"
              onClick={() => { dispatch(holdOrder()); toast.success('Order held') }}>
              <Pause className="h-3 w-3 mr-1" /> Hold
            </Button>
            <Button type="button" variant="outline" size="sm" className="text-xs"
              onClick={() => { dispatch(clearCart()); toast.success('Cart cleared') }}>
              <Trash2 className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
          {heldOrders.length > 0 && (
            <Button type="button" variant="secondary" size="sm" className="w-full"
              onClick={() => { dispatch(resumeOrder(heldOrders[0].id)); toast.success('Order resumed') }}>
              <RotateCcw className="h-3 w-3 mr-1" /> Resume Held ({heldOrders.length})
            </Button>
          )}
        </div>

        <div className="p-4 border-t space-y-1 shrink-0">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(breakdown.subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">GST</span><span>{formatCurrency(breakdown.gstAmount)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">SGST</span><span>{formatCurrency(breakdown.sgstAmount)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">CGST</span><span>{formatCurrency(breakdown.cgstAmount)}</span></div>
          <Separator className="my-2" />
          <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">{formatCurrency(breakdown.total)}</span></div>
        </div>

        <div className="p-4 border-t shrink-0">
          <Button type="button" size="lg" className="w-full bg-foreground text-background hover:bg-foreground/90"
            disabled={cart.length === 0}
            onClick={() => setCheckoutOpen(true)}>
            Order Now
          </Button>
        </div>
      </div>

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        orderType={orderType}
        tables={tables}
        selectedTableId={selectedTableId}
        taxSettings={taxSettings ?? DEFAULT_TAX_SETTINGS}
        onSuccess={handleOrderSuccess}
      />
    </div>
  )
}

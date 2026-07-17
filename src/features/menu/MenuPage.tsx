import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Image, Star } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { menuApi } from '@/api/menu.api'
import { formatCurrency } from '@/lib/utils'

export default function MenuPage() {
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['menu', 'categories', 'all'],
    queryFn: () => menuApi.listCategories(true),
  })

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['menu', 'items', 'all'],
    queryFn: () => menuApi.listItems(undefined, true),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      menuApi.updateItem(id, { isAvailable: available }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] })
      toast.success('Item updated')
    },
    onError: () => toast.error('Failed to update item'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => menuApi.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] })
      toast.success('Item deleted')
    },
    onError: () => toast.error('Failed to delete item'),
  })

  const filtered = items.filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <PageShell isLoading={catsLoading || itemsLoading}>
      <div className="page-container">
        <PageHeader title="Menu Management" description="Manage categories and menu items" actions={
          <Button onClick={() => toast.info('Use edit on items or contact admin for bulk import')}><Plus className="h-4 w-4 mr-2" /> Add Item</Button>
        } />

        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
            <TabsTrigger value="items">Menu Items ({items.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <Card key={cat.id} className="hover:shadow-elevated transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <span className="text-3xl">{cat.icon || '🍽️'}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{cat.name}</p>
                      <p className="text-sm text-muted-foreground">{cat.count ?? 0} items</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="items" className="mt-4 space-y-4">
            <Input placeholder="Search menu items..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-elevated transition-all">
                  <div className="h-36 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center relative">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <Image className="h-12 w-12 text-muted-foreground/30" />
                    )}
                    {item.popular && <Badge className="absolute top-3 right-3" variant="warning"><Star className="h-3 w-3 mr-1" /> Popular</Badge>}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                      <p className="font-bold text-primary">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.available}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: item.id, available: checked })}
                        />
                        <span className="text-xs text-muted-foreground">{item.available ? 'Available' : 'Unavailable'}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-danger" onClick={() => deleteMutation.mutate(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  )
}

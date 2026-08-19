import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Mail, Phone, Star } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { customersApi } from '@/api/customers.api'
import type { PosCustomer } from '@/api/types/pos.types'
import { formatCurrency, getInitials } from '@/lib/utils'
import { formatApiError } from '@/api/management-utils'

export default function CustomersPage() {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const trimmedPhone = phone.replace(/[\s()-]/g, '').trim()
      if (trimmedPhone.length < 5) throw new Error('Phone number looks too short. Enter at least 5 digits.')
      return customersApi.create({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: trimmedPhone,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer saved')
      setAddOpen(false)
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
    },
    onError: (err) => toast.error(formatApiError(err, 'Could not save customer. Check name and phone.')),
  })

  const columns = useMemo<ColumnDef<PosCustomer>[]>(() => [
    {
      accessorKey: 'name', header: 'Customer',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(row.original.name)}</AvatarFallback></Avatar>
          <div><p className="font-medium">{row.original.name}</p><p className="text-xs text-muted-foreground">{row.original.email || '—'}</p></div>
        </div>
      )
    },
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'loyaltyPoints', header: 'Points', cell: ({ row }) => <Badge variant="warning"><Star className="h-3 w-3 mr-1" />{row.original.loyaltyPoints}</Badge> },
    { accessorKey: 'walletBalance', header: 'Wallet', cell: ({ row }) => formatCurrency(row.original.walletBalance) },
    { accessorKey: 'totalOrders', header: 'Orders' },
    { accessorKey: 'totalSpent', header: 'Total Spent', cell: ({ row }) => formatCurrency(row.original.totalSpent) },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.email && (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href={`mailto:${row.original.email}`}><Mail className="h-3.5 w-3.5" /></a>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={`tel:${row.original.phone}`}><Phone className="h-3.5 w-3.5" /></a>
          </Button>
        </div>
      )
    }
  ], [])

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Customers" description="Customer profiles saved from POS orders" actions={
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Customer</Button>
        } />
        <DataTable columns={columns} data={customers} searchKey="name" searchPlaceholder="Search customers..." />

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>First Name *</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Phone * (min 5 digits)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" /></div>
              <div className="space-y-2"><Label>Email (optional)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Leave blank if not available" /></div>
              <Button className="w-full" disabled={createMutation.isPending || !firstName || !phone}
                onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? 'Saving...' : 'Save Customer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}

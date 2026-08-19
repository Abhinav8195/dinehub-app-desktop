import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { formatApiError } from '@/api/management-utils'
import { expensesApi } from '@/api/phase1.api'
import { accountingApi } from '@/api/phase2.api'

type AccountingSummary = {
  revenue?: number
  expenses?: number
  netProfitBeforeUntrackedCogs?: number
  orderCount?: number
  expenseCount?: number
  expenseCategories?: Array<{ category: string; amount: number }>
  cogsNote?: string
}

type LedgerEntry = {
  date: string
  type: string
  reference: string
  resourceId?: string
  debit: number
  credit: number
  category?: string
}

export default function AccountingPage() {
  const queryClient = useQueryClient()
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [form, setForm] = useState({ title: '', amount: '', categoryId: '', notes: '' })
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['accounting', 'summary'],
    queryFn: () => accountingApi.summary() as Promise<AccountingSummary>,
  })
  const { data: ledger = [], isLoading: ledgerLoading } = useQuery({
    queryKey: ['accounting', 'ledger'],
    queryFn: () => accountingApi.ledger() as Promise<LedgerEntry[]>,
  })
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list })
  const { data: categories = [] } = useQuery({ queryKey: ['expenses', 'categories'], queryFn: expensesApi.listCategories })

  const createExpense = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
      toast.success('Expense recorded')
      setExpenseOpen(false)
      setForm({ title: '', amount: '', categoryId: '', notes: '' })
    },
    onError: (error) => toast.error(formatApiError(error, 'Could not save expense')),
  })

  const ensureCategoryThenSave = async () => {
    const title = form.title.trim()
    const amount = Number(form.amount)
    if (!title) return toast.error('Enter an expense title')
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Enter a valid amount greater than 0')
    let categoryId = form.categoryId
    if (!categoryId) {
      const list = categories as Array<{ id: string; name: string }>
      if (list[0]) categoryId = list[0].id
      else {
        const created = await expensesApi.createCategory({ name: 'General', code: 'GENERAL' }) as { id: string }
        categoryId = created.id
        queryClient.invalidateQueries({ queryKey: ['expenses', 'categories'] })
      }
    }
    createExpense.mutate({
      title,
      amount,
      categoryId,
      notes: form.notes.trim() || undefined,
      expenseDate: new Date().toISOString(),
    })
  }

  let running = 0
  const ledgerWithBalance = (ledger as LedgerEntry[]).map((entry) => {
    running += Number(entry.credit || 0) - Number(entry.debit || 0)
    return { ...entry, balance: running }
  })

  return (
    <PageShell isLoading={summaryLoading || ledgerLoading}>
      <div className="page-container">
        <PageHeader title="Accounting" description="Ledger, income, expenses, and profit & loss from live data" actions={
          <Button onClick={() => setExpenseOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Expense</Button>
        } />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Income" value={Number(summary?.revenue ?? 0)} format="currency" icon={<ArrowUpRight className="h-5 w-5" />} />
          <StatCard title="Total Expense" value={Number(summary?.expenses ?? 0)} format="currency" icon={<ArrowDownRight className="h-5 w-5" />} />
          <StatCard title="Net Profit" value={Number(summary?.netProfitBeforeUntrackedCogs ?? 0)} format="currency" icon={<ArrowUpRight className="h-5 w-5" />} />
          <StatCard title="Orders" value={Number(summary?.orderCount ?? 0)} format="number" icon={<ArrowUpRight className="h-5 w-5" />} />
        </div>

        <Tabs defaultValue="ledger">
          <TabsList>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
          </TabsList>

          <TabsContent value="ledger" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">General Ledger</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ledgerWithBalance.length === 0 && <p className="text-sm text-muted-foreground">No ledger entries in this period</p>}
                  {ledgerWithBalance.map((entry) => (
                    <div key={`${entry.resourceId}-${entry.type}-${entry.date}`} className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium">{entry.reference}</p>
                        <p className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleString()} · {entry.type}{entry.category ? ` · ${entry.category}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        {entry.debit > 0 && <span className="text-danger font-medium">-{formatCurrency(entry.debit)}</span>}
                        {entry.credit > 0 && <span className="text-success font-medium">+{formatCurrency(entry.credit)}</span>}
                        <Badge variant="secondary">{formatCurrency(entry.balance)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expense" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Expenses</CardTitle>
                <Button size="sm" onClick={() => setExpenseOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {expensesLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {(expenses as Array<{ id: string; title: string; amount: number; expenseDate?: string; category?: { name?: string } }>).map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <p className="font-medium">{expense.title}</p>
                      <p className="text-xs text-muted-foreground">{expense.category?.name ?? 'Expense'} · {expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString() : '—'}</p>
                    </div>
                    <span className="font-semibold text-danger">{formatCurrency(Number(expense.amount))}</span>
                  </div>
                ))}
                {!expensesLoading && !(expenses as unknown[]).length && <p className="text-sm text-muted-foreground">No expenses yet</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pl" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Profit & Loss</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Revenue</span><span>{formatCurrency(Number(summary?.revenue ?? 0))}</span></div>
                <div className="flex justify-between"><span>Expenses</span><span>{formatCurrency(Number(summary?.expenses ?? 0))}</span></div>
                <div className="flex justify-between font-semibold"><span>Net</span><span>{formatCurrency(Number(summary?.netProfitBeforeUntrackedCogs ?? 0))}</span></div>
                {summary?.cogsNote && <p className="text-xs text-muted-foreground">{summary.cogsNote}</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>New expense</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Vegetables purchase" /></div>
              <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.categoryId || undefined} onValueChange={(categoryId) => setForm({ ...form, categoryId })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {(categories as Array<{ id: string; name: string }>).map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">If empty, a General category is created automatically.</p>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExpenseOpen(false)}>Cancel</Button>
              <Button disabled={createExpense.isPending} onClick={() => void ensureCategoryThenSave()}>
                {createExpense.isPending ? 'Saving…' : 'Save expense'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}

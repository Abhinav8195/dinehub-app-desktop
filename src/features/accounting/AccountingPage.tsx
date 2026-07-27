import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
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
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to record expense'),
  })

  const addExpense = () => {
    const title = window.prompt('Expense title')
    const amount = Number(window.prompt('Amount'))
    const categoryOptions = (categories as Array<{ id: string; name: string }>)
    const categoryId = categoryOptions[0]?.id ?? window.prompt('Expense category ID')
    if (!title || !categoryId || !Number.isFinite(amount) || amount <= 0) return
    createExpense.mutate({ title, amount, categoryId, expenseDate: new Date().toISOString() })
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
          <Button onClick={addExpense}><Plus className="h-4 w-4 mr-2" /> New Expense</Button>
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
              <CardHeader><CardTitle className="text-base">Expenses</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {expensesLoading && <p className="text-sm text-muted-foreground">Loading expenses…</p>}
                {(expenses as Array<{ id: string; title: string; amount: number; expenseDate: string; category?: { name?: string } }>).map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 rounded-xl border">
                    <div><p className="font-medium">{expense.title}</p><p className="text-xs text-muted-foreground">{expense.category?.name ?? 'Uncategorized'} · {new Date(expense.expenseDate).toLocaleDateString()}</p></div>
                    <span className="font-medium text-danger">-{formatCurrency(Number(expense.amount))}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pl" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Profit & Loss</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm"><span>Revenue</span><span className="font-medium">{formatCurrency(Number(summary?.revenue ?? 0))}</span></div>
                <div className="flex justify-between text-sm"><span>Expenses</span><span className="font-medium text-danger">-{formatCurrency(Number(summary?.expenses ?? 0))}</span></div>
                <div className="flex justify-between text-base font-semibold border-t pt-3"><span>Net (before untracked COGS)</span><span>{formatCurrency(Number(summary?.netProfitBeforeUntrackedCogs ?? 0))}</span></div>
                {summary?.cogsNote && <p className="text-xs text-muted-foreground">{summary.cogsNote}</p>}
                <div className="pt-2 space-y-2">
                  {(summary?.expenseCategories ?? []).map((row) => (
                    <div key={row.category} className="flex justify-between text-sm">
                      <span>{row.category}</span>
                      <span>{formatCurrency(row.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  )
}

import { Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import { DASHBOARD_STATS } from '@/constants/mock-data'

const LEDGER = [
  { id: '1', date: 'Jun 30', description: 'Daily Sales Revenue', debit: 0, credit: 24850, balance: 24850 },
  { id: '2', date: 'Jun 30', description: 'Supplier Payment - Fresh Farms', debit: 2450, credit: 0, balance: 22400 },
  { id: '3', date: 'Jun 29', description: 'Staff Payroll', debit: 8200, credit: 0, balance: 14200 },
  { id: '4', date: 'Jun 29', description: 'Daily Sales Revenue', debit: 0, credit: 22100, balance: 36300 }
]

export default function AccountingPage() {
  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Accounting" description="Ledger, income, expenses, GST, and cash book" actions={
          <Button><Plus className="h-4 w-4 mr-2" /> New Entry</Button>
        } />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Income" value={DASHBOARD_STATS.revenue.value} format="currency" icon={<ArrowUpRight className="h-5 w-5" />} />
          <StatCard title="Total Expense" value={DASHBOARD_STATS.expense.value} format="currency" icon={<ArrowDownRight className="h-5 w-5" />} />
          <StatCard title="Net Profit" value={DASHBOARD_STATS.profit.value} format="currency" icon={<ArrowUpRight className="h-5 w-5" />} />
          <StatCard title="GST Collected" value={2112} format="currency" icon={<ArrowUpRight className="h-5 w-5" />} />
        </div>

        <Tabs defaultValue="ledger">
          <TabsList>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="gst">GST</TabsTrigger>
            <TabsTrigger value="cashbook">Cash Book</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader><CardTitle className="text-base">General Ledger</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {LEDGER.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">{entry.date}</p>
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
      </div>
    </PageShell>
  )
}

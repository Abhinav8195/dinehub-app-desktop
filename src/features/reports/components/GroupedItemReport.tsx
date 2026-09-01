import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { formatCurrency, cn } from '@/lib/utils'
import type { CategoryGroup } from '../lib/report-aggregates'

interface GroupedItemReportProps {
  groups: CategoryGroup[]
  showRate?: boolean
  showCode?: boolean
}

export function GroupedItemReport({ groups, showRate = true, showCode = true }: GroupedItemReportProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  if (!groups.length) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        No item sales in this period
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5">Item Name</th>
            {showCode && <th className="px-3 py-2.5 w-20">Code</th>}
            <th className="px-3 py-2.5 w-24 text-right">Qty</th>
            {showRate && <th className="px-3 py-2.5 w-28 text-right">Rate</th>}
            <th className="px-3 py-2.5 w-32 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const isClosed = collapsed[group.category]
            return (
              <FragmentGroup key={group.category}>
                <tr
                  className="cursor-pointer border-b bg-muted/50 font-semibold hover:bg-muted/70"
                  onClick={() =>
                    setCollapsed((prev) => ({ ...prev, [group.category]: !prev[group.category] }))
                  }
                >
                  <td className="px-3 py-2.5" colSpan={showCode ? 2 : 1}>
                    <span className="inline-flex items-center gap-1.5">
                      {isClosed
                        ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      {group.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{group.quantity.toFixed(0)}</td>
                  {showRate && <td className="px-3 py-2.5" />}
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(group.total)}</td>
                </tr>
                {!isClosed && group.items.map((item) => (
                  <tr key={item.key} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                    <td className={cn('px-3 py-2 pl-9')}>{item.name}</td>
                    {showCode && (
                      <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">{item.code}</td>
                    )}
                    <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
                    {showRate && (
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(item.rate)}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
                {!isClosed && (
                  <tr className="border-b bg-primary/5 text-xs font-semibold">
                    <td className="px-3 py-2 pl-9" colSpan={showCode ? 2 : 1}>Sub Total</td>
                    <td className="px-3 py-2 text-right tabular-nums">{group.quantity}</td>
                    {showRate && <td />}
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(group.total)}</td>
                  </tr>
                )}
              </FragmentGroup>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FragmentGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number | string
  change?: number
  prefix?: string
  suffix?: string
  icon?: ReactNode
  format?: 'currency' | 'number' | 'text'
  className?: string
}

export function StatCard({ title, value, change, icon, format = 'text', className }: StatCardProps) {
  const displayValue = format === 'currency' && typeof value === 'number'
    ? formatCurrency(value)
    : format === 'number' && typeof value === 'number'
    ? value.toLocaleString()
    : value

  const isPositive = change !== undefined && change >= 0

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn('stat-card', className)}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{displayValue}</p>
          {change !== undefined && (
            <div className={cn('flex items-center gap-1 text-xs font-medium', isPositive ? 'text-success' : 'text-danger')}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatPercent(change)} vs last week
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  )
}

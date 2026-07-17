import { ReactNode } from 'react'
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { BRAND } from '@/constants/brand'

interface PageShellProps {
  children: ReactNode
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  errorMessage?: string
  onRetry?: () => void
  skeleton?: ReactNode
}

export function PageShell({
  children, isLoading, isError, isEmpty,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no items to display yet.',
  emptyAction, errorMessage = 'Something went wrong. Please try again.',
  onRetry, skeleton
}: PageShellProps) {
  if (isLoading) {
    return skeleton || <DefaultSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BrandLogo size="md" orientation="vertical" showText={false} className="mb-4 opacity-90" />
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 mb-4 -mt-8">
          <AlertCircle className="h-6 w-6 text-danger" />
        </div>
        <h3 className="text-lg font-semibold">Error Loading Data</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{errorMessage}</p>
        {onRetry && (
          <Button variant="outline" className="mt-4" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        )}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BrandLogo size="sm" orientation="vertical" subtitle={BRAND.name} className="mb-4 opacity-80" />
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light mb-4">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{emptyTitle}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{emptyDescription}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    )
  }

  return <>{children}</>
}

function DefaultSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  )
}

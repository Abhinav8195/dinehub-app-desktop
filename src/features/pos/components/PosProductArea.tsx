import { Search, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { resolveMenuImageUrl } from '@/api/menu.api'
import { formatCurrency, cn } from '@/lib/utils'
import { effectiveVariantPrice } from '@/features/menu/variants'
import type { MenuItemDto } from '@/api/types/pos.types'
import type { Category } from '@/api/types/menu.types'
import { itemShortCode } from '../lib/menuSearch'

interface ComboRow {
  id: string
  name: string
  price: number
  imageUrl?: string | null
  items: Array<{ quantity: number; menuItem?: { name?: string } | null }>
}

interface PosProductAreaProps {
  catalogView: 'items' | 'combos' | 'favorites'
  categories: Category[]
  items: MenuItemDto[]
  combos: ComboRow[]
  search: string
  shortCode: string
  onSearchChange: (value: string) => void
  onShortCodeChange: (value: string) => void
  onShortCodeSubmit: () => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
  shortCodeRef: React.RefObject<HTMLInputElement | null>
  disabledAdd?: boolean
  onAddItem: (item: MenuItemDto) => void
  onAddCombo: (combo: ComboRow) => void
}

export function PosProductArea({
  catalogView,
  categories,
  items,
  combos,
  search,
  shortCode,
  onSearchChange,
  onShortCodeChange,
  onShortCodeSubmit,
  searchInputRef,
  shortCodeRef,
  disabledAdd,
  onAddItem,
  onAddCombo,
}: PosProductAreaProps) {
  const title = catalogView === 'combos' ? 'Combos' : catalogView === 'favorites' ? 'Favorites' : 'Menu'

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b bg-white px-2 py-1.5">
        <div>
          <h2 className="text-xs font-bold leading-none">{title}</h2>
          <p className="mt-0.5 text-[9px] text-muted-foreground">Tap to add · short code</p>
        </div>
        <div className="relative min-w-[140px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name / SKU / code"
            className="h-7 pl-7 text-[11px]"
          />
        </div>
        <form
          className="flex w-[96px] shrink-0 gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            onShortCodeSubmit()
          }}
        >
          <Input
            ref={shortCodeRef}
            value={shortCode}
            onChange={(e) => onShortCodeChange(e.target.value.toUpperCase())}
            placeholder="Code"
            className="h-7 font-mono text-[11px] uppercase"
          />
        </form>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white p-1.5 xl:p-2">
        {catalogView === 'combos' ? (
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {combos.map((combo) => (
              <button
                key={combo.id}
                type="button"
                disabled={disabledAdd}
                onClick={() => onAddCombo(combo)}
                className={cn(
                  'flex flex-col overflow-hidden rounded-lg border bg-white text-left transition-all',
                  'hover:border-primary/40 hover:shadow-sm active:scale-[0.98]',
                  disabledAdd && 'pointer-events-none opacity-50',
                )}
              >
                <div className="relative flex h-12 items-center justify-center bg-muted/40 text-xl">
                  <span>🍱</span>
                  {combo.imageUrl && (
                    <img
                      src={resolveMenuImageUrl(combo.imageUrl) ?? ''}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 p-1.5">
                  <p className="line-clamp-2 text-[11px] font-semibold leading-tight">{combo.name}</p>
                  <p className="line-clamp-1 text-[9px] text-muted-foreground">
                    {combo.items.map((entry) => `${entry.quantity}× ${entry.menuItem?.name ?? 'item'}`).join(', ')}
                  </p>
                  <p className="mt-auto text-xs font-bold text-primary">{formatCurrency(combo.price)}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {items.map((item) => {
              const veg = item.isVegetarian === true || item.dietary === 'veg'
              const nonVeg = item.isVegetarian === false || item.dietary === 'nonveg'
              const icon = categories.find((c) => c.id === item.categoryId)?.icon
                || categories.find((c) => c.name === item.category)?.icon
                || '🍽️'
              const starting = item.hasVariants && item.variants?.some((v) => v.isAvailable)
                ? Math.min(...item.variants.filter((v) => v.isAvailable).map(effectiveVariantPrice))
                : null

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabledAdd || !item.available}
                  onClick={() => onAddItem(item)}
                  className={cn(
                    'relative flex flex-col overflow-hidden rounded-lg border bg-white text-left transition-all',
                    'hover:border-primary/40 hover:shadow-sm active:scale-[0.98]',
                    (disabledAdd || !item.available) && 'pointer-events-none opacity-50',
                  )}
                >
                  {item.popular && (
                    <Badge className="absolute right-1 top-1 z-10 gap-0.5 px-1 py-0 text-[8px]" variant="warning">
                      <Star className="h-2 w-2" /> Hot
                    </Badge>
                  )}
                  <div className="relative flex h-12 items-center justify-center bg-muted/30 text-xl xl:h-14">
                    <span aria-hidden>{icon}</span>
                    {item.imageUrl && (
                      <img
                        src={resolveMenuImageUrl(item.imageUrl) ?? ''}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    )}
                    <span
                      className={cn(
                        'absolute left-1 top-1 h-2 w-2 rounded-sm border',
                        veg && 'border-success bg-success',
                        nonVeg && 'border-danger bg-danger',
                        !veg && !nonVeg && 'border-muted-foreground/40 bg-transparent',
                      )}
                      title={veg ? 'Veg' : nonVeg ? 'Non-veg' : ''}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 p-1.5">
                    <p className="line-clamp-2 text-[11px] font-semibold leading-tight">{item.name}</p>
                    <p className="font-mono text-[8px] text-muted-foreground">{itemShortCode(item)}</p>
                    <p className="mt-auto text-xs font-bold text-primary">
                      {starting != null ? `from ${formatCurrency(starting)}` : formatCurrency(item.price)}
                    </p>
                  </div>
                </button>
              )
            })}
            {!items.length && (
              <p className="col-span-full py-8 text-center text-xs text-muted-foreground">No items match</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

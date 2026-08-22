import { Star, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Category } from '@/api/types/menu.types'

interface PosCategoryRailProps {
  categories: Category[]
  selectedCategory: string | null
  catalogView: 'items' | 'combos' | 'favorites'
  onSelectAll: () => void
  onSelectFavorites: () => void
  onSelectCategory: (id: string) => void
  onSelectCombos: () => void
}

export function PosCategoryRail({
  categories,
  selectedCategory,
  catalogView,
  onSelectAll,
  onSelectFavorites,
  onSelectCategory,
  onSelectCombos,
}: PosCategoryRailProps) {
  return (
    <aside className="flex w-[132px] shrink-0 flex-col border-r bg-white xl:w-[148px]">
      <div className="border-b px-2.5 py-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">Menu</p>
        <p className="text-[10px] text-muted-foreground">Categories</p>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto p-1.5">
        <RailButton
          active={catalogView === 'favorites'}
          icon={<Star className="h-3.5 w-3.5" />}
          label="Favorites"
          onClick={onSelectFavorites}
        />
        <RailButton
          active={catalogView === 'items' && !selectedCategory}
          icon={<UtensilsCrossed className="h-3.5 w-3.5" />}
          label="All items"
          onClick={onSelectAll}
        />
        <div className="my-1.5 h-px bg-border" />
        {categories.map((cat) => (
          <RailButton
            key={cat.id}
            active={catalogView === 'items' && selectedCategory === cat.id}
            icon={<span className="text-xs leading-none">{cat.icon || '🍽️'}</span>}
            label={cat.name}
            count={cat.count}
            onClick={() => onSelectCategory(cat.id)}
          />
        ))}
        <div className="my-1.5 h-px bg-border" />
        <RailButton
          active={catalogView === 'combos'}
          icon={<span className="text-xs">🍱</span>}
          label="Combos"
          onClick={onSelectCombos}
        />
      </div>
    </aside>
  )
}

function RailButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-foreground hover:bg-muted',
      )}
    >
      <span className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs',
        active ? 'bg-black/10' : 'bg-muted',
      )}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-semibold leading-tight">{label}</span>
        {typeof count === 'number' && count > 0 && (
          <span className={cn('mt-0.5 block text-[9px]', active ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
            {count}
          </span>
        )}
      </span>
    </button>
  )
}

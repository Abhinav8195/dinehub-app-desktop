import { cn } from '@/lib/utils'
import { BRAND } from '@/constants/brand'

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  subtitle?: string
  className?: string
  textClassName?: string
  orientation?: 'horizontal' | 'vertical'
}

const sizeMap = {
  xs: 'h-7 w-7',
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20'
}

export function BrandLogo({
  size = 'sm',
  showText = true,
  subtitle,
  className,
  textClassName,
  orientation = 'horizontal'
}: BrandLogoProps) {
  const isVertical = orientation === 'vertical'

  return (
    <div className={cn('flex items-center gap-3', isVertical && 'flex-col text-center', className)}>
      <img
        src={BRAND.logo}
        alt={BRAND.logoAlt}
        className={cn(sizeMap[size], 'object-contain shrink-0')}
      />
      {showText && (
        <div className={cn('min-w-0', textClassName)}>
          <p className="font-bold text-base tracking-tight truncate text-foreground">{BRAND.name}</p>
          {(subtitle ?? BRAND.tagline) && (
            <p className="text-[10px] text-muted-foreground truncate">{subtitle ?? BRAND.tagline}</p>
          )}
        </div>
      )}
    </div>
  )
}

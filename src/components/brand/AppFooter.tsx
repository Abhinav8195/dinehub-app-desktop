import { BRAND } from '@/constants/brand'

export function AppFooter({ className = '' }: { className?: string }) {
  return (
    <footer className={`flex items-center justify-center gap-2 py-2 text-[11px] text-muted-foreground ${className}`}>
      <img src={BRAND.logo} alt="" className="h-4 w-4 object-contain opacity-80" aria-hidden />
      <span>© {new Date().getFullYear()} {BRAND.name}</span>
      <span className="text-border">·</span>
      <span>v{BRAND.version}</span>
    </footer>
  )
}

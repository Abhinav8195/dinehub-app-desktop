import { motion } from 'framer-motion'
import { BrandLogo } from './BrandLogo'
import { BRAND } from '@/constants/brand'

export function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ backgroundColor: BRAND.colors.background }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center"
      >
        <BrandLogo size="xl" orientation="vertical" subtitle={BRAND.tagline} />
        <div className="mt-8 h-1 w-32 overflow-hidden rounded-full bg-brand-light">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Loading your workspace…</p>
      </motion.div>
    </div>
  )
}

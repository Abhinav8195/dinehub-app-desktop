import packageJson from '../../package.json'
import logoMark from '../../public/logo-mark.png'
import logoFull from '../../public/logo.png'

export const BRAND = {
  name: 'DiningHub',
  tagline: 'Restaurant POS & ERP',
  version: packageJson.version,
  // Import the images so Vite includes them in the renderer bundle. This keeps
  // the URLs valid when the packaged app is loaded from an ASAR via file://.
  logo: logoMark,
  logoFull,
  logoAlt: 'DiningHub logo',
  colors: {
    primary: '#FFC107',
    primaryHover: '#FFB300',
    primaryLight: '#FFF8E1',
    dark: '#1E1E1E',
    background: '#FFFFFF',
    success: '#22C55E',
    danger: '#EF4444',
    border: '#E5E7EB'
  },
  urls: {
    menu: 'https://menu.dininghub.in',
    website: 'https://dininghub.in'
  }
} as const

export const CHART_COLORS = {
  primary: BRAND.colors.primary,
  success: BRAND.colors.success,
  danger: BRAND.colors.danger,
  muted: BRAND.colors.border
}

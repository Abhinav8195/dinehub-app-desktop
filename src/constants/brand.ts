import packageJson from '../../package.json'

const publicAsset = (filename: string): string => `${import.meta.env.BASE_URL}${filename}`

export const BRAND = {
  name: 'DineHub',
  tagline: 'Restaurant POS & ERP',
  version: packageJson.version,
  logo: publicAsset('logo-mark.png'),
  logoFull: publicAsset('logo.png'),
  logoAlt: 'DineHub logo',
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

import {
  LayoutDashboard, ShoppingCart, ClipboardList, Grid3X3, QrCode,
  ChefHat, UtensilsCrossed, Package, ShoppingBag, Users, UserCog,
  CalendarDays, BarChart3, Megaphone, Calculator, Settings, Building2,
  Bell, LineChart, Shield, Monitor, type LucideIcon
} from 'lucide-react'
import type { FeatureKey } from '@/api/types/billing.types'

export interface NavItem {
  id: string
  title: string
  href: string
  icon: LucideIcon
  badge?: string | number
  permission?: string
  feature?: FeatureKey
  superAdminOnly?: boolean
  children?: NavItem[]
  favorite?: boolean
  pinned?: boolean
}

export const APP_BASE = '/app'

const p = (path: string) => `${APP_BASE}${path}`

export const NAVIGATION: NavItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    href: APP_BASE,
    icon: LayoutDashboard,
    permission: 'dashboard.view',
    feature: 'dashboard',
    pinned: true
  },
  {
    id: 'pos',
    title: 'POS',
    href: p('/pos'),
    icon: ShoppingCart,
    permission: 'pos.access',
    feature: 'pos',
    pinned: true,
    badge: 'Live'
  },
  {
    id: 'orders',
    title: 'Orders',
    href: p('/orders'),
    icon: ClipboardList,
    permission: 'orders.view',
    feature: 'orders',
    badge: 12
  },
  {
    id: 'tables',
    title: 'Table Management',
    href: p('/tables'),
    icon: Grid3X3,
    permission: 'tables.view'
    , feature: 'tables'
  },
  {
    id: 'qr-ordering',
    title: 'QR Ordering',
    href: p('/qr-ordering'),
    icon: QrCode,
    permission: 'qr.view'
    , feature: 'qr_ordering'
  },
  {
    id: 'kitchen',
    title: 'KOT / Kitchen',
    href: p('/kitchen'),
    icon: ChefHat,
    permission: 'kitchen.view',
    feature: 'kitchen_display',
    badge: 8
  },
  {
    id: 'menu',
    title: 'Menu Management',
    href: p('/menu'),
    icon: UtensilsCrossed,
    permission: 'menu.view',
    feature: 'menu',
    children: [
      { id: 'menu-categories', title: 'Categories', href: p('/menu/categories'), icon: UtensilsCrossed, permission: 'menu.view' },
      { id: 'menu-items', title: 'Menu Items', href: p('/menu/items'), icon: UtensilsCrossed, permission: 'menu.view' },
      { id: 'menu-modifiers', title: 'Modifiers', href: p('/menu/modifiers'), icon: UtensilsCrossed, permission: 'menu.view' },
      { id: 'menu-combos', title: 'Combos', href: p('/menu/combos'), icon: UtensilsCrossed, permission: 'menu.view' }
    ]
  },
  {
    id: 'inventory',
    title: 'Inventory',
    href: p('/inventory'),
    icon: Package,
    permission: 'inventory.view',
    feature: 'inventory_basic',
    badge: 3,
    children: [
      { id: 'inv-dashboard', title: 'Dashboard', href: p('/inventory'), icon: Package, permission: 'inventory.view' },
      { id: 'inv-items', title: 'All Items', href: p('/inventory/items'), icon: Package, permission: 'inventory.view' },
      { id: 'inv-warehouse', title: 'Warehouses', href: p('/inventory/warehouse'), icon: Package, permission: 'inventory.warehouse.manage' },
      { id: 'inv-materials', title: 'Raw Materials', href: p('/inventory/materials'), icon: Package, permission: 'inventory.view' },
      { id: 'inv-goods', title: 'Finished Goods', href: p('/inventory/goods'), icon: Package, permission: 'inventory.view' },
      { id: 'inv-transfer', title: 'Stock Transfer', href: p('/inventory/transfer'), icon: Package, permission: 'inventory.view', feature: 'stock_transfer' },
      { id: 'inv-suppliers', title: 'Suppliers', href: p('/inventory/suppliers'), icon: Package, permission: 'inventory.purchase.view', feature: 'purchasing' },
      { id: 'inv-purchase', title: 'Purchase Orders', href: p('/inventory/purchase'), icon: Package, permission: 'inventory.purchase.view', feature: 'purchasing' },
      { id: 'inv-alerts', title: 'Alerts', href: p('/inventory/alerts'), icon: Bell, permission: 'inventory.view' },
      { id: 'inv-logs', title: 'Inventory Logs', href: p('/inventory/logs'), icon: Package, permission: 'inventory.view' }
    ]
  },
  {
    id: 'purchase',
    title: 'Purchase',
    href: p('/purchase'),
    icon: ShoppingBag,
    permission: 'purchase.view'
    , feature: 'purchasing'
  },
  {
    id: 'customers',
    title: 'Customers',
    href: p('/customers'),
    icon: Users,
    permission: 'customers.view'
    , feature: 'customers'
  },
  {
    id: 'users',
    title: 'User Management',
    href: p('/users'),
    icon: Users,
    permission: 'users.view',
    children: [
      { id: 'users-all', title: 'All Users', href: p('/users'), icon: Users, permission: 'users.view' },
      { id: 'users-roles', title: 'Roles & Permissions', href: p('/users/roles'), icon: Shield, permission: 'roles.read', feature: 'custom_roles' },
      { id: 'users-departments', title: 'Departments', href: p('/users/departments'), icon: UserCog, permission: 'departments.view' },
      { id: 'users-invites', title: 'Invitations', href: p('/users/invites'), icon: Users, permission: 'users.invites.view', feature: 'employee_invites' },
      { id: 'users-audit', title: 'Audit Logs', href: p('/users/audit'), icon: ClipboardList, permission: 'audit.view' }
    ]
  },
  {
    id: 'employees',
    title: 'Employees',
    href: p('/employees'),
    icon: UserCog,
    permission: 'employees.view'
    , feature: 'shifts'
  },
  {
    id: 'staff',
    title: 'Staff & Permissions',
    href: p('/staff'),
    icon: Shield,
    permission: 'staff.view'
    , feature: 'custom_roles'
  },
  {
    id: 'reservations',
    title: 'Reservations',
    href: p('/reservations'),
    icon: CalendarDays,
    permission: 'reservations.view',
    feature: 'reservations',
    badge: 5
  },
  {
    id: 'reports',
    title: 'Reports',
    href: p('/reports'),
    icon: BarChart3,
    permission: 'reports.view'
    , feature: 'reports_export'
  },
  {
    id: 'crm',
    title: 'CRM',
    href: p('/crm'),
    icon: Megaphone,
    permission: 'crm.view'
    , feature: 'campaigns'
  },
  {
    id: 'accounting',
    title: 'Accounting',
    href: p('/accounting'),
    icon: Calculator,
    permission: 'accounting.view'
    , feature: 'accounting'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    href: p('/analytics'),
    icon: LineChart,
    permission: 'analytics.view'
    , feature: 'analytics'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    href: p('/notifications'),
    icon: Bell,
    permission: 'notifications.view',
    feature: 'notifications',
    badge: 24
  },
  {
    id: 'subscription',
    title: 'Subscription & Plans',
    href: p('/saas'),
    icon: Building2,
    permission: 'settings.view'
  },
  {
    id: 'saas',
    title: 'SaaS Admin',
    href: p('/admin/tenants'),
    icon: Building2,
    superAdminOnly: true
  },
  {
    id: 'roles',
    title: 'Roles',
    href: p('/roles'),
    icon: Shield,
    permission: 'roles.manage'
    , feature: 'custom_roles'
  },
  {
    id: 'sessions',
    title: 'Sessions',
    href: p('/sessions'),
    icon: Monitor,
    permission: 'auth.sessions.read'
  },
  {
    id: 'restaurant-settings',
    title: 'Settings',
    href: p('/settings'),
    icon: Settings,
    permission: 'settings.view'
  },
  {
    id: 'settings',
    title: 'Account',
    href: p('/account'),
    icon: UserCog
  }
]

export const QUICK_ACTIONS = [
  { id: 'new-order', title: 'New Order', href: p('/pos'), shortcut: 'F1', feature: 'pos' as FeatureKey },
  { id: 'new-reservation', title: 'New Reservation', href: p('/reservations'), shortcut: 'F2', feature: 'reservations' as FeatureKey },
  { id: 'add-customer', title: 'Add Customer', href: p('/customers'), shortcut: 'F3', feature: 'customers' as FeatureKey },
  { id: 'open-kds', title: 'Open Kitchen Display', href: p('/kitchen'), shortcut: 'F4', feature: 'kitchen_display' as FeatureKey },
  { id: 'reports', title: 'View Reports', href: p('/reports'), shortcut: 'F5', feature: 'reports_export' as FeatureKey }
]

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' }
]

export const RESTAURANTS = [
  { id: '1', name: 'DineHub Downtown', branches: 3 },
  { id: '2', name: 'DineHub Marina', branches: 2 },
  { id: '3', name: 'DineHub Airport', branches: 1 }
]

export const BRANCHES = [
  { id: '1', name: 'Main Branch', restaurantId: '1' },
  { id: '2', name: 'West Wing', restaurantId: '1' },
  { id: '3', name: 'Rooftop Lounge', restaurantId: '1' }
]

export const USER_PERMISSIONS = [
  'dashboard.view', 'pos.access', 'orders.view', 'tables.view',
  'qr.view', 'kitchen.view', 'menu.view', 'inventory.view',
  'purchase.view', 'customers.view', 'employees.view', 'staff.view',
  'reservations.view', 'reports.view', 'crm.view', 'accounting.view',
  'analytics.view', 'notifications.view', 'saas.admin', 'settings.view'
]

export const RECENT_PAGES_KEY = 'dinehub_recent_pages'
export const FAVORITES_KEY = 'dinehub_favorites'
export const PINNED_KEY = 'dinehub_pinned'

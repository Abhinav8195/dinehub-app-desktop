import {
  LayoutDashboard, ShoppingCart, ClipboardList, Grid3X3, QrCode,
  ChefHat, UtensilsCrossed, Package, ShoppingBag, Users, UserCog,
  CalendarDays, BarChart3, Megaphone, Calculator, Settings, Building2,
  Bell, LineChart, Shield, Monitor, type LucideIcon
} from 'lucide-react'

export interface NavItem {
  id: string
  title: string
  href: string
  icon: LucideIcon
  badge?: string | number
  permission?: string
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
    pinned: true
  },
  {
    id: 'pos',
    title: 'POS',
    href: p('/pos'),
    icon: ShoppingCart,
    permission: 'pos.access',
    pinned: true,
    badge: 'Live'
  },
  {
    id: 'orders',
    title: 'Orders',
    href: p('/orders'),
    icon: ClipboardList,
    permission: 'orders.view',
    badge: 12
  },
  {
    id: 'tables',
    title: 'Table Management',
    href: p('/tables'),
    icon: Grid3X3,
    permission: 'tables.view'
  },
  {
    id: 'qr-ordering',
    title: 'QR Ordering',
    href: p('/qr-ordering'),
    icon: QrCode,
    permission: 'qr.view'
  },
  {
    id: 'kitchen',
    title: 'KOT / Kitchen',
    href: p('/kitchen'),
    icon: ChefHat,
    permission: 'kitchen.view',
    badge: 8
  },
  {
    id: 'menu',
    title: 'Menu Management',
    href: p('/menu'),
    icon: UtensilsCrossed,
    permission: 'menu.view',
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
    badge: 3,
    children: [
      { id: 'inv-dashboard', title: 'Dashboard', href: p('/inventory'), icon: Package, permission: 'inventory.view' },
      { id: 'inv-items', title: 'All Items', href: p('/inventory/items'), icon: Package, permission: 'inventory.view' },
      { id: 'inv-warehouse', title: 'Warehouse', href: p('/inventory/warehouse'), icon: Package, permission: 'inventory.view' },
      { id: 'inv-materials', title: 'Raw Materials', href: p('/inventory/materials'), icon: Package, permission: 'inventory.view' },
      { id: 'inv-goods', title: 'Finished Goods', href: p('/inventory/goods'), icon: Package, permission: 'inventory.view' },
      { id: 'inv-transfer', title: 'Stock Transfer', href: p('/inventory/transfer'), icon: Package, permission: 'inventory.view' },
      { id: 'inv-purchase', title: 'Purchase Link', href: p('/inventory/purchase'), icon: Package, permission: 'inventory.view' },
      { id: 'inv-logs', title: 'Inventory Logs', href: p('/inventory/logs'), icon: Package, permission: 'inventory.view' }
    ]
  },
  {
    id: 'purchase',
    title: 'Purchase',
    href: p('/purchase'),
    icon: ShoppingBag,
    permission: 'purchase.view'
  },
  {
    id: 'customers',
    title: 'Customers',
    href: p('/customers'),
    icon: Users,
    permission: 'customers.view'
  },
  {
    id: 'users',
    title: 'User Management',
    href: p('/users'),
    icon: Users,
    permission: 'users.view',
    children: [
      { id: 'users-all', title: 'All Users', href: p('/users'), icon: Users, permission: 'users.view' },
      { id: 'users-roles', title: 'Roles', href: p('/users/roles'), icon: Shield, permission: 'roles.manage' },
      { id: 'users-departments', title: 'Departments', href: p('/users/departments'), icon: UserCog, permission: 'users.view' },
      { id: 'users-invites', title: 'Invitations', href: p('/users/invites'), icon: Users, permission: 'users.view' }
    ]
  },
  {
    id: 'employees',
    title: 'Employees',
    href: p('/employees'),
    icon: UserCog,
    permission: 'employees.view'
  },
  {
    id: 'staff',
    title: 'Staff & Permissions',
    href: p('/staff'),
    icon: Shield,
    permission: 'staff.view'
  },
  {
    id: 'reservations',
    title: 'Reservations',
    href: p('/reservations'),
    icon: CalendarDays,
    permission: 'reservations.view',
    badge: 5
  },
  {
    id: 'reports',
    title: 'Reports',
    href: p('/reports'),
    icon: BarChart3,
    permission: 'reports.view'
  },
  {
    id: 'crm',
    title: 'CRM',
    href: p('/crm'),
    icon: Megaphone,
    permission: 'crm.view'
  },
  {
    id: 'accounting',
    title: 'Accounting',
    href: p('/accounting'),
    icon: Calculator,
    permission: 'accounting.view'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    href: p('/analytics'),
    icon: LineChart,
    permission: 'analytics.view'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    href: p('/notifications'),
    icon: Bell,
    permission: 'notifications.view',
    badge: 24
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
  { id: 'new-order', title: 'New Order', href: p('/pos'), shortcut: 'F1' },
  { id: 'new-reservation', title: 'New Reservation', href: p('/reservations'), shortcut: 'F2' },
  { id: 'add-customer', title: 'Add Customer', href: p('/customers'), shortcut: 'F3' },
  { id: 'open-kds', title: 'Open Kitchen Display', href: p('/kitchen'), shortcut: 'F4' },
  { id: 'reports', title: 'View Reports', href: p('/reports'), shortcut: 'F5' }
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

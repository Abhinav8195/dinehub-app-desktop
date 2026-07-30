import {
  LayoutDashboard, ShoppingCart, ClipboardList, Grid3X3, QrCode,
  ChefHat, UtensilsCrossed, Package, ShoppingBag, Users, UserCog,
  CalendarDays, BarChart3, Megaphone, Calculator, Settings, Building2,
  Bell, LineChart, Shield, Monitor, type LucideIcon
} from 'lucide-react'
import type { RestaurantFeature } from '@/types/restaurant-features'

export interface NavItem {
  id: string
  title: string
  href: string
  icon: LucideIcon
  badge?: string | number
  permission?: string
  feature: RestaurantFeature
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
    feature: 'DASHBOARD',
    pinned: true
  },
  {
    id: 'pos',
    title: 'POS',
    href: p('/pos'),
    icon: ShoppingCart,
    permission: 'pos.access',
    feature: 'POS',
    pinned: true,
    badge: 'Live'
  },
  {
    id: 'orders',
    title: 'Orders',
    href: p('/orders'),
    icon: ClipboardList,
    permission: 'orders.view',
    feature: 'ORDERS',
    badge: 12
  },
  {
    id: 'tables',
    title: 'Table Management',
    href: p('/tables'),
    icon: Grid3X3,
    permission: 'tables.view'
    , feature: 'TABLE_MANAGEMENT'
  },
  {
    id: 'qr-ordering',
    title: 'QR Ordering',
    href: p('/qr-ordering'),
    icon: QrCode,
    permission: 'qr.view'
    , feature: 'QR_ORDERING'
  },
  {
    id: 'kitchen',
    title: 'KOT / Kitchen',
    href: p('/kitchen'),
    icon: ChefHat,
    permission: 'kitchen.view',
    feature: 'KOT_KITCHEN',
    badge: 8
  },
  {
    id: 'menu',
    title: 'Menu Management',
    href: p('/menu'),
    icon: UtensilsCrossed,
    permission: 'menu.view',
    feature: 'MENU_MANAGEMENT',
    children: [
      { id: 'menu-categories', title: 'Categories', href: p('/menu/categories'), icon: UtensilsCrossed, permission: 'menu.view', feature: 'MENU_CATEGORIES' },
      { id: 'menu-items', title: 'Menu Items', href: p('/menu/items'), icon: UtensilsCrossed, permission: 'menu.view', feature: 'MENU_ITEMS' },
      { id: 'menu-modifiers', title: 'Modifiers', href: p('/menu/modifiers'), icon: UtensilsCrossed, permission: 'menu.view', feature: 'MODIFIERS' },
      { id: 'menu-combos', title: 'Combos', href: p('/menu/combos'), icon: UtensilsCrossed, permission: 'menu.view', feature: 'COMBOS' }
    ]
  },
  {
    id: 'inventory',
    title: 'Inventory',
    href: p('/inventory'),
    icon: Package,
    permission: 'inventory.view',
    feature: 'INVENTORY_DASHBOARD',
    badge: 3,
    children: [
      { id: 'inv-dashboard', title: 'Dashboard', href: p('/inventory'), icon: Package, permission: 'inventory.view', feature: 'INVENTORY_DASHBOARD' },
      { id: 'inv-items', title: 'All Items', href: p('/inventory/items'), icon: Package, permission: 'inventory.view', feature: 'INVENTORY_ITEMS' },
      { id: 'inv-warehouse', title: 'Warehouses', href: p('/inventory/warehouse'), icon: Package, permission: 'inventory.warehouse.manage', feature: 'WAREHOUSES' },
      { id: 'inv-materials', title: 'Raw Materials', href: p('/inventory/materials'), icon: Package, permission: 'inventory.view', feature: 'RAW_MATERIALS' },
      { id: 'inv-goods', title: 'Finished Goods', href: p('/inventory/goods'), icon: Package, permission: 'inventory.view', feature: 'FINISHED_GOODS' },
      { id: 'inv-transfer', title: 'Stock Transfer', href: p('/inventory/transfer'), icon: Package, permission: 'inventory.view', feature: 'STOCK_TRANSFER' },
      { id: 'inv-suppliers', title: 'Suppliers', href: p('/inventory/suppliers'), icon: Package, permission: 'inventory.purchase.view', feature: 'SUPPLIERS' },
      { id: 'inv-purchase', title: 'Purchase Orders', href: p('/inventory/purchase'), icon: Package, permission: 'inventory.purchase.view', feature: 'PURCHASE_ORDERS' },
      { id: 'inv-alerts', title: 'Alerts', href: p('/inventory/alerts'), icon: Bell, permission: 'inventory.view', feature: 'INVENTORY_ALERTS' },
      { id: 'inv-logs', title: 'Inventory Logs', href: p('/inventory/logs'), icon: Package, permission: 'inventory.view', feature: 'INVENTORY_LOGS' }
    ]
  },
  {
    id: 'purchase',
    title: 'Purchase',
    href: p('/purchase'),
    icon: ShoppingBag,
    permission: 'purchase.view'
    , feature: 'PURCHASE'
  },
  {
    id: 'customers',
    title: 'Customers',
    href: p('/customers'),
    icon: Users,
    permission: 'customers.view'
    , feature: 'CUSTOMERS'
  },
  {
    id: 'users',
    title: 'User Management',
    href: p('/users'),
    icon: Users,
    permission: 'users.view',
    feature: 'USER_MANAGEMENT',
    children: [
      { id: 'users-all', title: 'All Users', href: p('/users'), icon: Users, permission: 'users.view', feature: 'USERS' },
      { id: 'users-roles', title: 'Roles & Permissions', href: p('/users/roles'), icon: Shield, permission: 'roles.read', feature: 'ROLES_PERMISSIONS' },
      { id: 'users-departments', title: 'Departments', href: p('/users/departments'), icon: UserCog, permission: 'departments.view', feature: 'DEPARTMENTS' },
      { id: 'users-invites', title: 'Invitations', href: p('/users/invites'), icon: Users, permission: 'users.invites.view', feature: 'INVITATIONS' },
      { id: 'users-audit', title: 'Audit Logs', href: p('/users/audit'), icon: ClipboardList, permission: 'audit.view', feature: 'AUDIT_LOGS' }
    ]
  },
  {
    id: 'employees',
    title: 'Employees',
    href: p('/employees'),
    icon: UserCog,
    permission: 'employees.view'
    , feature: 'EMPLOYEES'
  },
  {
    id: 'staff',
    title: 'Staff & Permissions',
    href: p('/staff'),
    icon: Shield,
    permission: 'staff.view'
    , feature: 'STAFF_PERMISSIONS'
  },
  {
    id: 'reservations',
    title: 'Reservations',
    href: p('/reservations'),
    icon: CalendarDays,
    permission: 'reservations.view',
    feature: 'RESERVATIONS',
    badge: 5
  },
  {
    id: 'reports',
    title: 'Reports',
    href: p('/reports'),
    icon: BarChart3,
    permission: 'reports.view'
    , feature: 'REPORTS'
  },
  {
    id: 'crm',
    title: 'CRM',
    href: p('/crm'),
    icon: Megaphone,
    permission: 'crm.view'
    , feature: 'CRM'
  },
  {
    id: 'accounting',
    title: 'Accounting',
    href: p('/accounting'),
    icon: Calculator,
    permission: 'accounting.view'
    , feature: 'ACCOUNTING'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    href: p('/analytics'),
    icon: LineChart,
    permission: 'analytics.view'
    , feature: 'ANALYTICS'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    href: p('/notifications'),
    icon: Bell,
    permission: 'notifications.view',
    feature: 'NOTIFICATIONS',
    badge: 24
  },
  {
    id: 'subscription',
    title: 'Subscription & Plans',
    href: p('/saas'),
    icon: Building2,
    permission: 'settings.view',
    feature: 'SUBSCRIPTION_PLANS'
  },
  {
    id: 'saas',
    title: 'SaaS Admin',
    href: p('/admin/tenants'),
    icon: Building2,
    superAdminOnly: true,
    feature: 'SAAS_ADMIN'
  },
  {
    id: 'roles',
    title: 'Roles',
    href: p('/roles'),
    icon: Shield,
    permission: 'roles.manage'
    , feature: 'ROLES'
  },
  {
    id: 'sessions',
    title: 'Sessions',
    href: p('/sessions'),
    icon: Monitor,
    permission: 'auth.sessions.read',
    feature: 'SESSIONS'
  },
  {
    id: 'restaurant-settings',
    title: 'Settings',
    href: p('/settings'),
    icon: Settings,
    permission: 'settings.view',
    feature: 'RESTAURANT_SETTINGS'
  },
  {
    id: 'settings',
    title: 'Account',
    href: p('/account'),
    icon: UserCog,
    feature: 'ACCOUNT'
  }
]

export const QUICK_ACTIONS = [
  { id: 'new-order', title: 'New Order', href: p('/pos'), shortcut: 'F1', feature: 'POS' as RestaurantFeature },
  { id: 'new-reservation', title: 'New Reservation', href: p('/reservations'), shortcut: 'F2', feature: 'RESERVATIONS' as RestaurantFeature },
  { id: 'add-customer', title: 'Add Customer', href: p('/customers'), shortcut: 'F3', feature: 'CUSTOMERS' as RestaurantFeature },
  { id: 'open-kds', title: 'Open Kitchen Display', href: p('/kitchen'), shortcut: 'F4', feature: 'KOT_KITCHEN' as RestaurantFeature },
  { id: 'reports', title: 'View Reports', href: p('/reports'), shortcut: 'F5', feature: 'REPORTS' as RestaurantFeature }
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

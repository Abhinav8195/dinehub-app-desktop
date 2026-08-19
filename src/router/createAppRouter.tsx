import {
  createHashRouter,
  createBrowserRouter,
  Navigate,
  Outlet,
  type RouteObject,
} from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthGuard } from '@/guards/AuthGuard'
import { useTrackPage } from '@/hooks/useTrackPage'
import { useAuth } from '@/hooks/useAuth'
import { SplashScreen } from '@/components/brand/SplashScreen'
import LoginPage from '@/features/auth/LoginPage'
import PinLoginPage from '@/features/auth/PinLoginPage'
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage'
import RolesPage from '@/features/auth/RolesPage'
import TenantsAdminPage from '@/features/auth/TenantsAdminPage'
import SessionsPage from '@/features/auth/SessionsPage'
import AccountSettingsPage from '@/features/auth/AccountSettingsPage'
import AcceptInvitePage from '@/features/auth/AcceptInvitePage'
import ResetPasswordPage from '@/features/auth/ResetPasswordPage'
import OffersPage from '@/features/offers/OffersPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import POSPage from '@/features/pos/POSPage'
import OrdersPage from '@/features/orders/OrdersPage'
import TablesPage from '@/features/tables/TablesPage'
import WaiterCallsPage from '@/features/waiter-calls/WaiterCallsPage'
import QROrderingPage from '@/features/qr-ordering/QROrderingPage'
import KitchenPage from '@/features/kitchen/KitchenPage'
import MenuPage from '@/features/menu/MenuPage'
import ModifierManagementPage from '@/features/menu/ModifierManagementPage'
import ComboManagementPage from '@/features/menu/ComboManagementPage'
import InventoryPage from '@/features/inventory/InventoryPage'
import PurchasePage from '@/features/purchase/PurchasePage'
import CustomersPage from '@/features/customers/CustomersPage'
import EmployeesPage from '@/features/employees/EmployeesPage'
import AttendancePage from '@/features/attendance/AttendancePage'
import StaffPage from '@/features/staff/StaffPage'
import ReservationsPage from '@/features/reservations/ReservationsPage'
import ReportsPage from '@/features/reports/ReportsPage'
import CRMPage from '@/features/crm/CRMPage'
import AccountingPage from '@/features/accounting/AccountingPage'
import AnalyticsPage from '@/features/analytics/AnalyticsPage'
import NotificationsPage from '@/features/notifications/NotificationsPage'
import UsersManagementPage from '@/features/users/UsersManagementPage'
import SettingsPage from '@/features/settings/SettingsPage'
import SaaSPage from '@/features/saas/SaaSPage'
import { FeatureRouteGuard } from '@/guards/FeatureRouteGuard'
import type { RestaurantFeature } from '@/types/restaurant-features'
import { NoFeaturesEnabled } from '@/components/auth/FeatureAccessBoundary'

function LayoutWrapper() {
  useTrackPage()
  return <Outlet />
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuth()
  if (!isInitialized) {
    return <SplashScreen />
  }
  if (isAuthenticated) return <Navigate to="/app" replace />
  return <>{children}</>
}

const featurePage = (feature: RestaurantFeature, page: React.ReactNode, permission?: string) => (
  <FeatureRouteGuard feature={feature} permission={permission}>{page}</FeatureRouteGuard>
)

function buildRoutes(): RouteObject[] {
  return [
    { path: '/', element: <Navigate to="/app" replace /> },
    { path: '/login', element: <GuestGuard><LoginPage /></GuestGuard> },
    { path: '/pin-login', element: <GuestGuard><PinLoginPage /></GuestGuard> },
    { path: '/forgot-password', element: <GuestGuard><ForgotPasswordPage /></GuestGuard> },
    { path: '/reset-password', element: <ResetPasswordPage /> },
    { path: '/invites/accept', element: <AcceptInvitePage /> },
    {
      path: '/app',
      element: <AuthGuard><AppLayout /></AuthGuard>,
      children: [
        {
          element: <LayoutWrapper />,
          children: [
            { index: true, element: featurePage('DASHBOARD', <DashboardPage />, 'dashboard.view') },
            { path: 'pos', element: featurePage('POS', <POSPage />, 'pos.access') },
            { path: 'orders', element: featurePage('ORDERS', <OrdersPage />, 'orders.view') },
            { path: 'orders/sales', element: featurePage('ORDERS', <AnalyticsPage />, 'orders.view') },
            { path: 'tables', element: featurePage('TABLE_MANAGEMENT', <TablesPage />, 'tables.view') },
            { path: 'waiter-calls', element: featurePage('QR_ORDERING', <WaiterCallsPage />, 'qr.view') },
            { path: 'qr-ordering', element: featurePage('QR_ORDERING', <QROrderingPage />, 'qr.view') },
            { path: 'kitchen', element: featurePage('KOT_KITCHEN', <KitchenPage />, 'kitchen.view') },
            { path: 'menu', element: featurePage('MENU_MANAGEMENT', <MenuPage />, 'menu.view') },
            { path: 'menu/categories', element: featurePage('MENU_CATEGORIES', <MenuPage />, 'menu.view') },
            { path: 'menu/items', element: featurePage('MENU_ITEMS', <MenuPage />, 'menu.view') },
            { path: 'menu/modifiers', element: featurePage('MODIFIERS', <ModifierManagementPage />, 'menu.view') },
            { path: 'menu/combos', element: featurePage('COMBOS', <ComboManagementPage />, 'menu.view') },
            { path: 'inventory', element: featurePage('INVENTORY_DASHBOARD', <InventoryPage />, 'inventory.view') },
            { path: 'inventory/items', element: featurePage('INVENTORY_ITEMS', <InventoryPage />, 'inventory.view') },
            { path: 'inventory/warehouse', element: featurePage('WAREHOUSES', <InventoryPage />, 'inventory.warehouse.manage') },
            { path: 'inventory/materials', element: featurePage('RAW_MATERIALS', <InventoryPage />, 'inventory.view') },
            { path: 'inventory/goods', element: featurePage('FINISHED_GOODS', <InventoryPage />, 'inventory.view') },
            { path: 'inventory/transfer', element: featurePage('STOCK_TRANSFER', <InventoryPage />, 'inventory.view') },
            { path: 'inventory/purchase', element: featurePage('PURCHASE_ORDERS', <InventoryPage />, 'inventory.purchase.view') },
            { path: 'inventory/suppliers', element: featurePage('SUPPLIERS', <InventoryPage />, 'inventory.purchase.view') },
            { path: 'inventory/alerts', element: featurePage('INVENTORY_ALERTS', <InventoryPage />, 'inventory.view') },
            { path: 'inventory/logs', element: featurePage('INVENTORY_LOGS', <InventoryPage />, 'inventory.view') },
            { path: 'purchase', element: featurePage('PURCHASE', <PurchasePage />, 'purchase.view') },
            { path: 'customers', element: featurePage('CUSTOMERS', <CustomersPage />, 'customers.view') },
            { path: 'offers', element: featurePage('CRM', <OffersPage />, 'crm.view') },
            { path: 'users', element: featurePage('USERS', <UsersManagementPage />, 'users.view') },
            { path: 'users/roles', element: featurePage('ROLES_PERMISSIONS', <UsersManagementPage />, 'roles.read') },
            { path: 'users/departments', element: featurePage('DEPARTMENTS', <UsersManagementPage />, 'departments.view') },
            { path: 'users/invites', element: featurePage('INVITATIONS', <UsersManagementPage />, 'users.invites.view') },
            { path: 'users/audit', element: featurePage('AUDIT_LOGS', <UsersManagementPage />, 'audit.view') },
            { path: 'employees', element: featurePage('EMPLOYEES', <EmployeesPage />, 'employees.view') },
            { path: 'employees/attendance', element: featurePage('EMPLOYEES', <AttendancePage />, 'employees.view') },
            { path: 'staff', element: featurePage('STAFF_PERMISSIONS', <StaffPage />, 'staff.view') },
            { path: 'reservations', element: featurePage('RESERVATIONS', <ReservationsPage />, 'reservations.view') },
            { path: 'reports', element: featurePage('REPORTS', <ReportsPage />, 'reports.view') },
            { path: 'crm', element: featurePage('CRM', <CRMPage />, 'crm.view') },
            { path: 'accounting', element: featurePage('ACCOUNTING', <AccountingPage />, 'accounting.view') },
            { path: 'analytics', element: featurePage('ANALYTICS', <AnalyticsPage />, 'analytics.view') },
            { path: 'notifications', element: featurePage('NOTIFICATIONS', <NotificationsPage />, 'notifications.view') },
            { path: 'settings', element: featurePage('RESTAURANT_SETTINGS', <SettingsPage />, 'settings.view') },
            { path: 'account', element: featurePage('ACCOUNT', <AccountSettingsPage />) },
            { path: 'roles', element: featurePage('ROLES', <RolesPage />, 'roles.manage') },
            { path: 'sessions', element: featurePage('SESSIONS', <SessionsPage />, 'auth.sessions.read') },
            { path: 'admin/tenants', element: featurePage('SAAS_ADMIN', <TenantsAdminPage />) },
            { path: 'saas', element: featurePage('SUBSCRIPTION_PLANS', <SaaSPage />, 'settings.view') },
            { path: 'plans', element: featurePage('SUBSCRIPTION_PLANS', <SaaSPage />, 'settings.view') },
            { path: 'no-features', element: <NoFeaturesEnabled /> },
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to="/app" replace /> },
  ]
}

export function createAppRouter() {
  const routes = buildRoutes()
  const webBase = import.meta.env.VITE_WEB_BASE
  if (webBase && webBase !== '/') {
    const basename = webBase.replace(/\/$/, '')
    return createBrowserRouter(routes, { basename })
  }
  return createHashRouter(routes)
}

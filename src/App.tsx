import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
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
import DashboardPage from '@/features/dashboard/DashboardPage'
import POSPage from '@/features/pos/POSPage'
import OrdersPage from '@/features/orders/OrdersPage'
import TablesPage from '@/features/tables/TablesPage'
import QROrderingPage from '@/features/qr-ordering/QROrderingPage'
import KitchenPage from '@/features/kitchen/KitchenPage'
import MenuPage from '@/features/menu/MenuPage'
import ModifierManagementPage from '@/features/menu/ModifierManagementPage'
import ComboManagementPage from '@/features/menu/ComboManagementPage'
import InventoryPage from '@/features/inventory/InventoryPage'
import PurchasePage from '@/features/purchase/PurchasePage'
import CustomersPage from '@/features/customers/CustomersPage'
import EmployeesPage from '@/features/employees/EmployeesPage'
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
import type { FeatureKey } from '@/api/types/billing.types'

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

const featurePage = (feature: FeatureKey, page: React.ReactNode, permission?: string) => (
  <FeatureRouteGuard feature={feature} permission={permission}>{page}</FeatureRouteGuard>
)

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/app" replace />,
  },
  {
    path: '/login',
    element: <GuestGuard><LoginPage /></GuestGuard>,
  },
  {
    path: '/pin-login',
    element: <GuestGuard><PinLoginPage /></GuestGuard>,
  },
  {
    path: '/forgot-password',
    element: <GuestGuard><ForgotPasswordPage /></GuestGuard>,
  },
  {
    path: '/app',
    element: <AuthGuard><AppLayout /></AuthGuard>,
    children: [
      {
        element: <LayoutWrapper />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'pos', element: featurePage('pos', <POSPage />, 'pos.access') },
          { path: 'orders', element: featurePage('orders', <OrdersPage />, 'orders.view') },
          { path: 'tables', element: featurePage('tables', <TablesPage />, 'tables.view') },
          { path: 'qr-ordering', element: featurePage('qr_ordering', <QROrderingPage />, 'qr.view') },
          { path: 'kitchen', element: featurePage('kitchen_display', <KitchenPage />, 'kitchen.view') },
          { path: 'menu', element: featurePage('menu', <MenuPage />, 'menu.view') },
          { path: 'menu/categories', element: featurePage('menu', <MenuPage />, 'menu.view') },
          { path: 'menu/items', element: featurePage('menu', <MenuPage />, 'menu.view') },
          { path: 'menu/modifiers', element: featurePage('menu', <ModifierManagementPage />, 'menu.view') },
          { path: 'menu/combos', element: featurePage('menu', <ComboManagementPage />, 'menu.view') },
          { path: 'inventory', element: featurePage('inventory_basic', <InventoryPage />, 'inventory.view') },
          { path: 'inventory/items', element: featurePage('inventory_basic', <InventoryPage />, 'inventory.view') },
          { path: 'inventory/warehouse', element: featurePage('inventory_basic', <InventoryPage />, 'inventory.warehouse.manage') },
          { path: 'inventory/materials', element: featurePage('inventory_basic', <InventoryPage />, 'inventory.view') },
          { path: 'inventory/goods', element: featurePage('inventory_basic', <InventoryPage />, 'inventory.view') },
          { path: 'inventory/transfer', element: featurePage('stock_transfer', <InventoryPage />, 'inventory.view') },
          { path: 'inventory/purchase', element: featurePage('purchasing', <InventoryPage />, 'inventory.purchase.view') },
          { path: 'inventory/suppliers', element: featurePage('purchasing', <InventoryPage />, 'inventory.purchase.view') },
          { path: 'inventory/alerts', element: featurePage('inventory_basic', <InventoryPage />, 'inventory.view') },
          { path: 'inventory/logs', element: featurePage('inventory_basic', <InventoryPage />, 'inventory.view') },
          { path: 'purchase', element: featurePage('purchasing', <PurchasePage />, 'purchase.view') },
          { path: 'customers', element: featurePage('customers', <CustomersPage />, 'customers.view') },
          { path: 'users', element: <UsersManagementPage /> },
          { path: 'users/roles', element: featurePage('custom_roles', <UsersManagementPage />, 'roles.read') },
          { path: 'users/departments', element: <UsersManagementPage /> },
          { path: 'users/invites', element: featurePage('employee_invites', <UsersManagementPage />, 'users.invites.view') },
          { path: 'users/audit', element: <UsersManagementPage /> },
          { path: 'employees', element: featurePage('shifts', <EmployeesPage />, 'employees.view') },
          { path: 'staff', element: featurePage('custom_roles', <StaffPage />, 'staff.view') },
          { path: 'reservations', element: featurePage('reservations', <ReservationsPage />, 'reservations.view') },
          { path: 'reports', element: featurePage('reports_export', <ReportsPage />, 'reports.view') },
          { path: 'crm', element: featurePage('campaigns', <CRMPage />, 'crm.view') },
          { path: 'accounting', element: featurePage('accounting', <AccountingPage />, 'accounting.view') },
          { path: 'analytics', element: featurePage('analytics', <AnalyticsPage />, 'analytics.view') },
          { path: 'notifications', element: featurePage('notifications', <NotificationsPage />, 'notifications.view') },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'account', element: <AccountSettingsPage /> },
          { path: 'roles', element: featurePage('custom_roles', <RolesPage />, 'roles.manage') },
          { path: 'sessions', element: <SessionsPage /> },
          { path: 'admin/tenants', element: <TenantsAdminPage /> },
          { path: 'saas', element: <SaaSPage /> },
          { path: 'plans', element: <SaaSPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/app" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}

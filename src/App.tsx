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
          { path: 'pos', element: <POSPage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'tables', element: <TablesPage /> },
          { path: 'qr-ordering', element: <QROrderingPage /> },
          { path: 'kitchen', element: <KitchenPage /> },
          { path: 'menu', element: <MenuPage /> },
          { path: 'menu/categories', element: <MenuPage /> },
          { path: 'menu/items', element: <MenuPage /> },
          { path: 'menu/modifiers', element: <MenuPage /> },
          { path: 'menu/combos', element: <MenuPage /> },
          { path: 'inventory', element: <InventoryPage /> },
          { path: 'inventory/items', element: <InventoryPage /> },
          { path: 'inventory/warehouse', element: <InventoryPage /> },
          { path: 'inventory/materials', element: <InventoryPage /> },
          { path: 'inventory/goods', element: <InventoryPage /> },
          { path: 'inventory/transfer', element: <InventoryPage /> },
          { path: 'inventory/purchase', element: <InventoryPage /> },
          { path: 'inventory/logs', element: <InventoryPage /> },
          { path: 'purchase', element: <PurchasePage /> },
          { path: 'customers', element: <CustomersPage /> },
          { path: 'users', element: <UsersManagementPage /> },
          { path: 'users/roles', element: <UsersManagementPage /> },
          { path: 'users/departments', element: <UsersManagementPage /> },
          { path: 'users/invites', element: <UsersManagementPage /> },
          { path: 'employees', element: <EmployeesPage /> },
          { path: 'staff', element: <StaffPage /> },
          { path: 'reservations', element: <ReservationsPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'crm', element: <CRMPage /> },
          { path: 'accounting', element: <AccountingPage /> },
          { path: 'analytics', element: <AnalyticsPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'account', element: <AccountSettingsPage /> },
          { path: 'roles', element: <RolesPage /> },
          { path: 'sessions', element: <SessionsPage /> },
          { path: 'admin/tenants', element: <TenantsAdminPage /> },
          { path: 'saas', element: <Navigate to="/app/admin/tenants" replace /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/app" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}

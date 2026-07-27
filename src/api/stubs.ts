/**
 * API module exports — real implementations replace stubs as backend modules ship.
 */

export { dashboardApi } from './dashboard.api'
export { reportsApi } from './reports.api'
export { notificationsApi } from './notifications.api'
export { inventoryApi } from './inventory.api'
export { menuApi } from './menu.api'
export { customersApi } from './customers.api'
export { ordersApi } from './orders.api'
export { settingsApi } from './settings.api'
export { tablesApi } from './tables.api'
export {
  branchesApi,
  employeesApi,
  usersApi,
  rolesApi,
  reservationsApi,
  vendorsApi,
  purchasesApi,
  modifiersApi,
  combosApi,
  qrApi,
  filesApi,
  expensesApi,
  offersApi,
  loyaltyApi,
  printersApi,
  campaignsApi,
} from './phase1.api'
export {
  invitesApi,
  accountingApi,
  analyticsApi,
  syncApi,
  billingApi,
} from './phase2.api'

const notImplemented = (module: string) => () => {
  throw new Error(`${module} API not yet implemented`)
}

export const posApi = { list: notImplemented('pos') }
export const kitchenApi = { list: notImplemented('kitchen') }
export const recipesApi = { list: notImplemented('recipes') }
export const paymentsApi = { list: notImplemented('payments') }
export const auditLogsApi = { list: notImplemented('audit-logs') }

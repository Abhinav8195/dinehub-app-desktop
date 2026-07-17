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

const notImplemented = (module: string) => () => {
  throw new Error(`${module} API not yet implemented`)
}

export const branchesApi = { list: notImplemented('branches'), get: notImplemented('branches') }
export const usersApi = { list: notImplemented('users'), get: notImplemented('users') }
export const employeesApi = { list: notImplemented('employees') }
export const vendorsApi = { list: notImplemented('vendors') }
export const modifiersApi = { list: notImplemented('modifiers') }
export const posApi = { list: notImplemented('pos') }
export const kitchenApi = { list: notImplemented('kitchen') }
export const recipesApi = { list: notImplemented('recipes') }
export const purchasesApi = { list: notImplemented('purchases') }
export const billingApi = { list: notImplemented('billing') }
export const offersApi = { list: notImplemented('offers') }
export const loyaltyApi = { list: notImplemented('loyalty') }
export const expensesApi = { list: notImplemented('expenses') }
export const accountingApi = { list: notImplemented('accounting') }
export const crmApi = { list: notImplemented('crm') }
export const printersApi = { list: notImplemented('printers') }
export const paymentsApi = { list: notImplemented('payments') }
export const filesApi = { upload: notImplemented('files') }
export const auditLogsApi = { list: notImplemented('audit-logs') }
export const analyticsApi = { get: notImplemented('analytics') }

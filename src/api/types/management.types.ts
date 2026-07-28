export type Decimal = number
export type ItemType = 'RAW' | 'FINISHED' | 'PACKAGING' | 'CONSUMABLE' | 'BOTH'
export type StockTransferStatus = 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'
export type PurchaseOrderStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
export type UserStatus = 'INVITED' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ON_LEAVE' | 'PENDING_VERIFICATION'

export interface Warehouse {
  id: string; name: string; code: string; location?: string | null; description?: string | null
  isDefault: boolean; isActive: boolean; itemCount?: number; stockValue?: Decimal; createdAt?: string; updatedAt?: string
}
export interface Supplier {
  id: string; name: string; contactPerson?: string | null; phone?: string | null; email?: string | null
  taxNumber?: string | null; address?: string | null; isActive: boolean; createdAt?: string; updatedAt?: string
}
export interface InventoryItem {
  id: string; warehouseId: string; supplierId?: string | null; sku: string; barcode?: string | null; name: string
  description?: string | null; itemType: ItemType; unit: string; quantity: Decimal; openingQuantity?: Decimal
  minStock: Decimal; maxStock?: Decimal | null; reorderQuantity?: Decimal; costPerUnit: Decimal; stockValue?: Decimal
  expiryDate?: string | null; batchNumber?: string | null; isActive: boolean; isLowStock?: boolean; isOutOfStock?: boolean
  warehouse?: Warehouse | null; supplier?: Supplier | null; imageUrl?: string | null; createdAt?: string; updatedAt?: string
}
export interface InventoryLog {
  id: string; type: string; quantityBefore: Decimal; quantityChange: Decimal; quantityAfter: Decimal
  unitCost?: Decimal; totalValue?: Decimal; referenceType?: string | null; referenceId?: string | null
  referenceNumber?: string | null; notes?: string | null; createdAt: string; inventoryItem?: Pick<InventoryItem, 'id'|'name'|'sku'>
  warehouse?: Pick<Warehouse, 'id'|'name'|'code'>; performedBy?: Pick<User, 'id'|'name'|'email'> | null
}
export interface StockTransfer {
  id: string; fromWarehouseId: string; toWarehouseId: string; inventoryItemId: string; quantity: Decimal
  status: StockTransferStatus; notes?: string | null; fromWarehouse?: Warehouse; toWarehouse?: Warehouse
  inventoryItem?: InventoryItem; createdBy?: Pick<User, 'id'|'name'>; createdAt: string; updatedAt?: string; completedAt?: string | null
}
export interface PurchaseOrderItem {
  id: string; inventoryItemId: string; quantity: Decimal; receivedQuantity: Decimal; costPerUnit: Decimal
  total?: Decimal; inventoryItem?: InventoryItem
}
export interface PurchaseOrder {
  id: string; orderNumber?: string; supplierId: string; warehouseId: string; expectedDate?: string | null
  notes?: string | null; status: PurchaseOrderStatus; items: PurchaseOrderItem[]; total?: Decimal
  supplier?: Supplier; warehouse?: Warehouse; invoiceNumber?: string | null; createdAt: string; updatedAt?: string
}
export interface InventoryAlert {
  id: string; type: 'LOW_STOCK'|'OUT_OF_STOCK'|'EXPIRING_SOON'|'EXPIRED'; status: string; message?: string
  inventoryItem?: InventoryItem; warehouse?: Warehouse; acknowledgedAt?: string | null; resolvedAt?: string | null; createdAt: string
}
export interface InventoryDashboard {
  totalItems: number; activeItems: number; lowStockCount: number; outOfStockCount: number; expiringSoonCount: number
  totalStockValue: Decimal; warehouseCount: number; recentActivity: InventoryLog[]; lowStockItems: InventoryItem[]
  warehouseSummary: Array<Warehouse & { itemCount: number; stockValue: Decimal }>
}
export interface Permission { id: string; slug: string; name: string; description?: string | null; module?: string }
export interface Role {
  id: string; name: string; description?: string | null; isSystem?: boolean; isProtected?: boolean
  permissions: Permission[]; userCount?: number; createdAt?: string; updatedAt?: string
}
export interface Department {
  id: string; name: string; code: string; description?: string | null; managerId?: string | null
  manager?: Pick<User, 'id'|'name'|'email'> | null; isActive: boolean; activeUserCount?: number
}
export interface User {
  id: string; name: string; firstName: string; lastName: string; email: string; phone?: string | null; avatarUrl?: string | null
  userType: string; status: UserStatus; department?: Department | null; roles: Role[]; permissionCount: number
  lastLoginAt?: string | null; createdAt: string; updatedAt?: string; isCurrentUser?: boolean
}
export interface UserInvitation {
  id: string; email: string; firstName?: string; lastName?: string; status: 'PENDING'|'EXPIRED'|'REVOKED'|'ACCEPTED'|'USED'
  role?: Role | null; department?: Department | null; expiresAt: string; createdAt: string
}
export interface UserSession {
  id: string; deviceName?: string; ipAddress?: string; userAgent?: string; isCurrent?: boolean; lastActiveAt?: string; createdAt: string
}
export interface UserAuditLog {
  id: string; action: string; actor?: Pick<User, 'id'|'name'|'email'> | null; targetUser?: Pick<User, 'id'|'name'|'email'> | null
  metadata?: { [key: string]: string | number | boolean | null }; createdAt: string
}

export type InventoryItemInput = Omit<InventoryItem, 'id'|'quantity'|'stockValue'|'isLowStock'|'isOutOfStock'|'warehouse'|'supplier'|'imageUrl'|'createdAt'|'updatedAt'> & { openingQuantity: number }
export type WarehouseInput = Pick<Warehouse, 'name'|'code'|'isDefault'|'isActive'> & Pick<Warehouse, 'location'|'description'>
export type SupplierInput = Omit<Supplier, 'id'|'createdAt'|'updatedAt'>

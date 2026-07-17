export const MOCK_USERS = [
  { id: '1', name: 'Demo Owner', email: 'owner@demo-restaurant.com', phone: '+1 555-0100', role: 'Owner', department: 'Management', status: 'active', lastLogin: '2026-07-02T14:00:00Z', permissions: 24, avatar: null },
  { id: '2', name: 'Alex Morgan', email: 'alex@dinehub.com', phone: '+1 555-0101', role: 'Manager', department: 'Operations', status: 'active', lastLogin: '2026-07-02T12:30:00Z', permissions: 18, avatar: null },
  { id: '3', name: 'Chris Taylor', email: 'chris@dinehub.com', phone: '+1 555-0102', role: 'Chef', department: 'Kitchen', status: 'active', lastLogin: '2026-07-02T11:00:00Z', permissions: 8, avatar: null },
  { id: '4', name: 'Jordan Lee', email: 'jordan@dinehub.com', phone: '+1 555-0103', role: 'Waiter', department: 'Service', status: 'active', lastLogin: '2026-07-02T10:45:00Z', permissions: 6, avatar: null },
  { id: '5', name: 'Sam Wilson', email: 'sam@dinehub.com', phone: '+1 555-0104', role: 'Cashier', department: 'Front Desk', status: 'active', lastLogin: '2026-07-02T09:00:00Z', permissions: 10, avatar: null },
  { id: '6', name: 'Maria Garcia', email: 'maria@dinehub.com', phone: '+1 555-0105', role: 'Chef', department: 'Kitchen', status: 'on-leave', lastLogin: '2026-06-28T16:00:00Z', permissions: 8, avatar: null },
  { id: '7', name: 'David Brown', email: 'david@dinehub.com', phone: '+1 555-0106', role: 'Delivery', department: 'Delivery', status: 'inactive', lastLogin: '2026-06-20T14:00:00Z', permissions: 4, avatar: null }
]

export const MOCK_DEPARTMENTS = [
  { id: '1', name: 'Management', head: 'Demo Owner', staff: 2, color: 'bg-purple-500' },
  { id: '2', name: 'Operations', head: 'Alex Morgan', staff: 5, color: 'bg-primary' },
  { id: '3', name: 'Kitchen', head: 'Chris Taylor', staff: 8, color: 'bg-danger' },
  { id: '4', name: 'Service', head: 'Jordan Lee', staff: 14, color: 'bg-warning' },
  { id: '5', name: 'Front Desk', head: 'Sam Wilson', staff: 6, color: 'bg-success' },
  { id: '6', name: 'Delivery', head: 'David Brown', staff: 4, color: 'bg-info' }
]

export const MOCK_INVITATIONS = [
  { id: '1', email: 'newchef@dinehub.com', role: 'Chef', department: 'Kitchen', sentAt: '2026-07-01', status: 'pending' },
  { id: '2', email: 'waiter2@dinehub.com', role: 'Waiter', department: 'Service', sentAt: '2026-06-30', status: 'pending' },
  { id: '3', email: 'manager2@dinehub.com', role: 'Manager', department: 'Operations', sentAt: '2026-06-28', status: 'accepted' }
]

export const MOCK_WAREHOUSES = [
  { id: '1', name: 'Main Warehouse', location: 'Basement - Downtown', items: 89, value: 28500, manager: 'Alex Morgan' },
  { id: '2', name: 'Cold Storage', location: 'Kitchen Back', items: 34, value: 12400, manager: 'Chris Taylor' },
  { id: '3', name: 'Bar Stock', location: 'Bar Area', items: 28, value: 4300, manager: 'Sam Wilson' }
]

export const MOCK_INVENTORY_FULL = [
  { id: '1', name: 'Chicken Breast', sku: 'RM-001', category: 'raw', quantity: 45, unit: 'kg', minStock: 20, maxStock: 100, cost: 8.5, expiry: '2026-07-15', warehouse: 'Cold Storage', supplier: 'Fresh Farms Co.', status: 'ok', barcode: '8901234567890' },
  { id: '2', name: 'Olive Oil', sku: 'RM-002', category: 'raw', quantity: 8, unit: 'L', minStock: 10, maxStock: 50, cost: 12.0, expiry: '2026-12-01', warehouse: 'Main Warehouse', supplier: 'Metro Supplies', status: 'low', barcode: '8901234567891' },
  { id: '3', name: 'Fresh Salmon', sku: 'RM-003', category: 'raw', quantity: 3, unit: 'kg', minStock: 5, maxStock: 20, cost: 22.0, expiry: '2026-07-03', warehouse: 'Cold Storage', supplier: 'Ocean Catch Ltd.', status: 'critical', barcode: '8901234567892' },
  { id: '4', name: 'Tomatoes', sku: 'RM-004', category: 'raw', quantity: 25, unit: 'kg', minStock: 15, maxStock: 60, cost: 3.5, expiry: '2026-07-08', warehouse: 'Cold Storage', supplier: 'Fresh Farms Co.', status: 'ok', barcode: '8901234567893' },
  { id: '5', name: 'Mozzarella Cheese', sku: 'RM-005', category: 'raw', quantity: 12, unit: 'kg', minStock: 8, maxStock: 30, cost: 9.0, expiry: '2026-07-20', warehouse: 'Cold Storage', supplier: 'Dairy Fresh', status: 'ok', barcode: '8901234567894' },
  { id: '6', name: 'Grilled Salmon Plate', sku: 'FG-001', category: 'finished', quantity: 0, unit: 'pcs', minStock: 0, maxStock: 0, cost: 24.99, expiry: '-', warehouse: 'Kitchen', supplier: '-', status: 'ok', barcode: '8901234567900' },
  { id: '7', name: 'Caesar Salad Kit', sku: 'FG-002', category: 'finished', quantity: 15, unit: 'pcs', minStock: 10, maxStock: 40, cost: 6.5, expiry: '2026-07-05', warehouse: 'Cold Storage', supplier: 'In-house', status: 'ok', barcode: '8901234567901' },
  { id: '8', name: 'Pizza Dough', sku: 'RM-006', category: 'raw', quantity: 6, unit: 'kg', minStock: 10, maxStock: 25, cost: 4.0, expiry: '2026-07-04', warehouse: 'Cold Storage', supplier: 'Bakery Supply', status: 'low', barcode: '8901234567895' },
  { id: '9', name: 'Basmati Rice', sku: 'RM-007', category: 'raw', quantity: 50, unit: 'kg', minStock: 20, maxStock: 80, cost: 2.8, expiry: '2027-01-01', warehouse: 'Main Warehouse', supplier: 'Grain Traders', status: 'ok', barcode: '8901234567896' },
  { id: '10', name: 'Red Wine Bottle', sku: 'FG-003', category: 'finished', quantity: 48, unit: 'bottles', minStock: 20, maxStock: 100, cost: 18.0, expiry: '2028-06-01', warehouse: 'Bar Stock', supplier: 'Wine Distributors', status: 'ok', barcode: '8901234567902' }
]

export const MOCK_STOCK_TRANSFERS = [
  { id: '1', from: 'Main Warehouse', to: 'Cold Storage', items: 3, status: 'completed', date: '2026-07-01', by: 'Alex Morgan' },
  { id: '2', from: 'Cold Storage', to: 'Kitchen', items: 5, status: 'in-transit', date: '2026-07-02', by: 'Chris Taylor' },
  { id: '3', from: 'Main Warehouse', to: 'Bar Stock', items: 2, status: 'pending', date: '2026-07-02', by: 'Sam Wilson' }
]

export const MOCK_INVENTORY_LOGS = [
  { id: '1', item: 'Chicken Breast', type: 'consumption', change: -5, quantity: 45, user: 'Chris Taylor', date: '2026-07-02 14:30' },
  { id: '2', item: 'Olive Oil', type: 'purchase', change: +10, quantity: 18, user: 'Alex Morgan', date: '2026-07-02 10:00' },
  { id: '3', item: 'Fresh Salmon', type: 'wastage', change: -2, quantity: 3, user: 'Chris Taylor', date: '2026-07-01 22:00' },
  { id: '4', item: 'Tomatoes', type: 'adjustment', change: -3, quantity: 25, user: 'Alex Morgan', date: '2026-07-01 18:00' },
  { id: '5', item: 'Pizza Dough', type: 'consumption', change: -4, quantity: 6, user: 'Maria Garcia', date: '2026-07-01 15:00' }
]

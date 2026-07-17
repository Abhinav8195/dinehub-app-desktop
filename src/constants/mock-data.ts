export const MOCK_ORDERS = [
  { id: '1', orderNumber: '#1042', type: 'dine-in' as const, status: 'preparing' as const, customer: 'John Smith', table: 'T-05', items: 4, total: 86.50, time: '2 min ago' },
  { id: '2', orderNumber: '#1041', type: 'takeaway' as const, status: 'ready' as const, customer: 'Sarah Lee', table: '-', items: 2, total: 34.00, time: '8 min ago' },
  { id: '3', orderNumber: '#1040', type: 'delivery' as const, status: 'completed' as const, customer: 'Mike Johnson', table: '-', items: 6, total: 124.75, time: '15 min ago' },
  { id: '4', orderNumber: '#1039', type: 'online' as const, status: 'pending' as const, customer: 'Emma Wilson', table: '-', items: 3, total: 52.30, time: '18 min ago' },
  { id: '5', orderNumber: '#1038', type: 'dine-in' as const, status: 'completed' as const, customer: 'David Brown', table: 'T-12', items: 5, total: 98.00, time: '25 min ago' }
]

export const MOCK_MENU_CATEGORIES = [
  { id: '1', name: 'Starters', count: 12, icon: '🥗' },
  { id: '2', name: 'Main Course', count: 24, icon: '🍽️' },
  { id: '3', name: 'Beverages', count: 18, icon: '🥤' },
  { id: '4', name: 'Desserts', count: 10, icon: '🍰' },
  { id: '5', name: 'Combos', count: 8, icon: '🍱' },
  { id: '6', name: 'Specials', count: 6, icon: '⭐' }
]

export const MOCK_MENU_ITEMS = [
  { id: '1', name: 'Grilled Salmon', price: 24.99, category: 'Main Course', image: '', available: true, popular: true },
  { id: '2', name: 'Caesar Salad', price: 12.99, category: 'Starters', image: '', available: true, popular: false },
  { id: '3', name: 'Margherita Pizza', price: 16.99, category: 'Main Course', image: '', available: true, popular: true },
  { id: '4', name: 'Chocolate Lava Cake', price: 9.99, category: 'Desserts', image: '', available: true, popular: true },
  { id: '5', name: 'Iced Latte', price: 5.99, category: 'Beverages', image: '', available: true, popular: false },
  { id: '6', name: 'Buffalo Wings', price: 14.99, category: 'Starters', image: '', available: false, popular: true },
  { id: '7', name: 'Beef Burger', price: 18.99, category: 'Main Course', image: '', available: true, popular: true },
  { id: '8', name: 'Fresh Orange Juice', price: 4.99, category: 'Beverages', image: '', available: true, popular: false }
]

export const MOCK_TABLES = [
  { id: '1', number: 1, floor: 'Ground', capacity: 2, status: 'available' as const, x: 0, y: 0 },
  { id: '2', number: 2, floor: 'Ground', capacity: 4, status: 'occupied' as const, x: 1, y: 0 },
  { id: '3', number: 3, floor: 'Ground', capacity: 4, status: 'occupied' as const, x: 2, y: 0 },
  { id: '4', number: 4, floor: 'Ground', capacity: 6, status: 'reserved' as const, x: 0, y: 1 },
  { id: '5', number: 5, floor: 'Ground', capacity: 2, status: 'available' as const, x: 1, y: 1 },
  { id: '6', number: 6, floor: 'Ground', capacity: 8, status: 'occupied' as const, x: 2, y: 1 },
  { id: '7', number: 7, floor: 'Rooftop', capacity: 4, status: 'cleaning' as const, x: 0, y: 0 },
  { id: '8', number: 8, floor: 'Rooftop', capacity: 2, status: 'available' as const, x: 1, y: 0 }
]

export const MOCK_CUSTOMERS = [
  { id: '1', name: 'John Smith', email: 'john@email.com', phone: '+1 555-0101', loyaltyPoints: 1250, walletBalance: 50, totalOrders: 42, totalSpent: 2840 },
  { id: '2', name: 'Sarah Lee', email: 'sarah@email.com', phone: '+1 555-0102', loyaltyPoints: 890, walletBalance: 25, totalOrders: 28, totalSpent: 1920 },
  { id: '3', name: 'Mike Johnson', email: 'mike@email.com', phone: '+1 555-0103', loyaltyPoints: 2100, walletBalance: 100, totalOrders: 65, totalSpent: 4200 }
]

export const MOCK_EMPLOYEES = [
  { id: '1', name: 'Alex Morgan', role: 'Manager', department: 'Operations', status: 'active', shift: 'Morning' },
  { id: '2', name: 'Chris Taylor', role: 'Chef', department: 'Kitchen', status: 'active', shift: 'Evening' },
  { id: '3', name: 'Jordan Lee', role: 'Waiter', department: 'Service', status: 'on-leave', shift: 'Morning' }
]

export const MOCK_INVENTORY = [
  { id: '1', name: 'Chicken Breast', sku: 'RM-001', quantity: 45, unit: 'kg', minStock: 20, expiry: '2026-07-15', status: 'ok' },
  { id: '2', name: 'Olive Oil', sku: 'RM-002', quantity: 8, unit: 'L', minStock: 10, expiry: '2026-12-01', status: 'low' },
  { id: '3', name: 'Fresh Salmon', sku: 'RM-003', quantity: 3, unit: 'kg', minStock: 5, expiry: '2026-07-02', status: 'critical' }
]

export const MOCK_KITCHEN_ORDERS = [
  { id: '1', orderNumber: '#1042', table: 'T-05', items: ['Grilled Salmon x2', 'Caesar Salad x1'], priority: 'high', status: 'preparing', timer: 8, chef: 'Chris' },
  { id: '2', orderNumber: '#1041', table: 'Takeaway', items: ['Beef Burger x2'], priority: 'normal', status: 'ready', timer: 0, chef: 'Maria' },
  { id: '3', orderNumber: '#1039', table: 'Online', items: ['Margherita Pizza x1', 'Iced Latte x2'], priority: 'normal', status: 'preparing', timer: 5, chef: 'Chris' }
]

export const DASHBOARD_STATS = {
  revenue: { value: 24850, change: 12.5 },
  orders: { value: 186, change: 8.2 },
  customers: { value: 94, change: 15.3 },
  avgOrder: { value: 42.50, change: -2.1 },
  profit: { value: 8420, change: 9.8 },
  expense: { value: 3200, change: 4.2 }
}

export const REVENUE_CHART_DATA = [
  { name: 'Mon', revenue: 4200, orders: 45 },
  { name: 'Tue', revenue: 3800, orders: 38 },
  { name: 'Wed', revenue: 5100, orders: 52 },
  { name: 'Thu', revenue: 4600, orders: 48 },
  { name: 'Fri', revenue: 6200, orders: 65 },
  { name: 'Sat', revenue: 7800, orders: 82 },
  { name: 'Sun', revenue: 5400, orders: 56 }
]

export const TOP_PRODUCTS = [
  { name: 'Grilled Salmon', sales: 48, revenue: 1199.52 },
  { name: 'Beef Burger', sales: 42, revenue: 797.58 },
  { name: 'Margherita Pizza', sales: 38, revenue: 645.62 },
  { name: 'Caesar Salad', sales: 35, revenue: 454.65 },
  { name: 'Chocolate Lava Cake', sales: 32, revenue: 319.68 }
]

export const MOCK_ACTIVITIES = [
  { id: '1', type: 'order', message: 'New order #1042 from Table 5', timestamp: '2 min ago', user: 'Jordan' },
  { id: '2', type: 'payment', message: 'Payment received $86.50 via Card', timestamp: '5 min ago', user: 'Alex' },
  { id: '3', type: 'inventory', message: 'Low stock alert: Olive Oil', timestamp: '12 min ago', user: 'System' },
  { id: '4', type: 'reservation', message: 'New reservation for 6 guests at 7:30 PM', timestamp: '18 min ago', user: 'Sarah' }
]

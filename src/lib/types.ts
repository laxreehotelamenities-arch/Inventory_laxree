/**
 * Type definitions
 */
export type Role = 'admin' | 'employee' | 'dealer' | 'distributor';

export type View = 'login' | 'catalog' | 'product-detail' | 'cart' | 'dashboard';

export type Tier = 'Essential' | 'Premium' | 'Luxury' | 'Standard';

export type SortBy = 'name' | 'price-low' | 'price-high' | 'stock-high' | 'stock-low';

export interface Product {
  id: string;
  model_no: string;
  model_no_raw: string;
  name: string;
  category: string;
  tier: Tier;
  description: string;
  color: string;
  size: string;
  ssp: number | null;
  mrp: number | null;
  discount_pct: number | null;
  stock_qty: number;
  inward: number;
  dispatched: number;
  image_url: string | null;
  in_stock: boolean;
  source: 'pdf' | 'inventory' | 'xlsx';
}

export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  avatar: string;
  department: string;
  permissions: string[];
}

export interface RoleConfig {
  label: string;
  color: string;
  canViewQuantity: boolean;
  canEditStock: boolean;
  canViewDashboard: boolean;
  dispatchDays: string | null;
  restockDays: string | null;
}

export interface CatalogFilters {
  search: string;
  tier: 'all' | Tier;
  category: 'all' | string;
  stockStatus: 'all' | 'in-stock' | 'out-of-stock' | 'low-stock';
  sortBy: SortBy;
}

// Stock status helper
export function getStockStatus(product: Product): 'in-stock' | 'out-of-stock' | 'low-stock' {
  if (product.stock_qty <= 0) return 'out-of-stock';
  if (product.stock_qty <= 10) return 'low-stock';
  return 'in-stock';
}

// Stock display helper (role-aware)
export function getStockDisplay(product: Product, role: Role): {
  label: string;
  sublabel: string;
  color: 'green' | 'amber' | 'red' | 'slate';
} {
  const status = getStockStatus(product);
  const isAdmin = role === 'admin';

  if (status === 'in-stock') {
    return {
      label: 'In Stock',
      sublabel: isAdmin ? `${product.stock_qty} units available` : 'Dispatch within 7-10 days',
      color: 'green',
    };
  }
  if (status === 'low-stock') {
    return {
      label: 'Low Stock',
      sublabel: isAdmin ? `Only ${product.stock_qty} units left` : 'Limited stock — dispatch within 7-10 days',
      color: 'amber',
    };
  }
  return {
    label: 'Out of Stock',
    sublabel: isAdmin ? '0 units — restock needed' : 'Available in 24-30 days',
    color: 'red',
  };
}

// Find alternative products within the same tier+category
export function findAlternatives(
  product: Product,
  allProducts: Product[],
  requestedQty: number
): Product[] {
  return allProducts
    .filter(
      (p) =>
        p.id !== product.id &&
        p.tier === product.tier &&
        p.category === product.category &&
        p.stock_qty >= requestedQty &&
        p.in_stock
    )
    .sort((a, b) => b.stock_qty - a.stock_qty)
    .slice(0, 5);
}

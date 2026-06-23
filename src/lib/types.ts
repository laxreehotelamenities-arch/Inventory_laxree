/**
 * Type definitions
 */
export type Role = 'admin' | 'employee' | 'dealer' | 'distributor';

export type View = 'login' | 'catalog' | 'product-detail' | 'cart' | 'dashboard' | 'quick-order';

export type Tier = 'Essential' | 'Premium' | 'Luxury' | 'Standard';

export type SortBy = 'name' | 'price-low' | 'price-high' | 'stock-high' | 'stock-low';

export interface Product {
  id: string;
  model_no: string;
  model_no_raw: string;
  name: string;
  item?: string; // For inventory-master: the item name from HTML
  category: string;
  tier: Tier;
  description: string;
  color: string;
  colour?: string; // alias for inventory-master
  size: string;
  ssp: number | null;
  mrp: number | null;
  discount_pct: number | null;
  stock_qty: number;
  balance?: number; // alias for inventory-master
  inward: number;
  dispatched: number;
  image_url: string | null;
  in_stock: boolean;
  source: 'pdf' | 'inventory' | 'xlsx' | 'master';
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
// IMPORTANT: Internal app — NO quantity shown to ANY role.
// Only status labels: "Available" / "Out of Stock" + dispatch ETA for non-admins.
export function getStockDisplay(product: Product, role: Role): {
  label: string;
  sublabel: string;
  color: 'green' | 'amber' | 'red' | 'slate';
} {
  const status = getStockStatus(product);

  if (status === 'in-stock') {
    return {
      label: 'Available',
      sublabel: 'Dispatch within 7-10 days',
      color: 'green',
    };
  }
  if (status === 'low-stock') {
    return {
      label: 'Limited Stock',
      sublabel: 'Dispatch within 7-10 days',
      color: 'amber',
    };
  }
  return {
    label: 'Out of Stock',
    sublabel: 'Available in 24-30 days',
    color: 'red',
  };
}

// Find alternative products within the same category + item (different model/colour)
// This matches the HTML inventory structure: Category → Item → Models
export function findAlternatives(
  product: Product,
  allProducts: Product[],
  requestedQty: number
): Product[] {
  // Get the item name (preferred) or fall back to name
  const itemName = product.item || product.name;
  return allProducts
    .filter(
      (p) =>
        p.id !== product.id &&
        p.category === product.category &&
        // Match by item name (HTML structure) OR by tier+name fallback (PDF catalog)
        (
          (p.item && product.item && p.item === product.item) ||
          (!product.item && p.tier === product.tier && p.name === product.name)
        ) &&
        p.stock_qty >= requestedQty &&
        p.in_stock
    )
    .sort((a, b) => b.stock_qty - a.stock_qty)
    .slice(0, 5);
}

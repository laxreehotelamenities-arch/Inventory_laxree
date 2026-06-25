'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/use-app';
import masterData from '@/data/inventory-master.json';
import { useCascadeData } from '@/lib/cascade';
import type { Product, Tier } from '@/lib/types';
import { ProductCard } from './product-card';
import { FilterSheet } from './filter-sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, X, PackageSearch, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCTS = masterData as Product[];

const tierOrder: Tier[] = ['Essential', 'Premium', 'Luxury', 'Standard'];
const tierColors: Record<Tier, string> = {
  Essential: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Premium: 'bg-blue-100 text-blue-700 border-blue-200',
  Luxury: 'bg-purple-100 text-purple-700 border-purple-200',
  Standard: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function CatalogScreen() {
  const { filters, setFilters, resetFilters, currentUser, setSelectedProduct, setView } = useAppStore();
  const [showFilters, setShowFilters] = useState(false);
  const data = useCascadeData();

  const categories = useMemo(() => {
    return ['all', ...data.categories];
  }, [data]);

  const filteredProducts = useMemo(() => {
    let result = PRODUCTS.filter((p) => {
      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matches =
          p.name?.toLowerCase().includes(q) ||
          p.item?.toLowerCase().includes(q) ||
          p.model_no?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      // Tier
      if (filters.tier !== 'all' && p.tier !== filters.tier) return false;
      // Category
      if (filters.category !== 'all' && p.category !== filters.category) return false;
      // Stock status
      if (filters.stockStatus !== 'all') {
        if (filters.stockStatus === 'in-stock' && p.stock_qty <= 10) return false;
        if (filters.stockStatus === 'low-stock' && (p.stock_qty <= 0 || p.stock_qty > 10)) return false;
        if (filters.stockStatus === 'out-of-stock' && p.stock_qty > 0) return false;
      }
      return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
      switch (filters.sortBy) {
        case 'price-low':
          return (a.ssp ?? Infinity) - (b.ssp ?? Infinity);
        case 'price-high':
          return (b.ssp ?? 0) - (a.ssp ?? 0);
        case 'stock-high':
          return b.stock_qty - a.stock_qty;
        case 'stock-low':
          return a.stock_qty - b.stock_qty;
        case 'name':
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });

    return result;
  }, [filters]);

  const activeFilterCount =
    (filters.tier !== 'all' ? 1 : 0) +
    (filters.category !== 'all' ? 1 : 0) +
    (filters.stockStatus !== 'all' ? 1 : 0) +
    (filters.sortBy !== 'name' ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 pb-20">
      {/* Search bar + filter button */}
      <div className="flex gap-2 mb-3 sticky top-14 bg-white/95 backdrop-blur z-30 -mx-4 px-4 py-2 border-b border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Search products"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            placeholder="Search by name, model, category…"
            className="pl-9 h-10 pr-8"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilters({ search: '' })}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="default"
          onClick={() => setShowFilters(true)}
          className="relative h-10 px-3 shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline ml-1.5">Filters</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {filters.tier !== 'all' && (
            <Badge variant="outline" className={cn('text-xs gap-1', tierColors[filters.tier as Tier])}>
              Tier: {filters.tier}
              <button onClick={() => setFilters({ tier: 'all' })} aria-label="Remove tier filter" className="ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.category !== 'all' && (
            <Badge variant="outline" className="text-xs gap-1 bg-slate-100">
              {filters.category}
              <button onClick={() => setFilters({ category: 'all' })} aria-label="Remove category filter" className="ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.stockStatus !== 'all' && (
            <Badge variant="outline" className="text-xs gap-1 bg-slate-100 capitalize">
              {filters.stockStatus.replace('-', ' ')}
              <button onClick={() => setFilters({ stockStatus: 'all' })} aria-label="Remove stock status filter" className="ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.sortBy !== 'name' && (
            <Badge variant="outline" className="text-xs gap-1 bg-slate-100">
              Sort: {filters.sortBy.replace('-', ' ')}
              <button onClick={() => setFilters({ sortBy: 'name' })} aria-label="Remove sort filter" className="ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={resetFilters}
            className="text-xs text-slate-500 underline px-1.5 hover:text-slate-700"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Quick category filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 -mx-4 px-4 no-scrollbar">
        <button
          onClick={() => setFilters({ category: 'all' })}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
            filters.category === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          )}
        >
          All Products
        </button>
        {data.categories.map((cat) => {
          const count = PRODUCTS.filter((p) => p.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setFilters({ category: cat })}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                filters.category === cat
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              )}
            >
              {cat} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
        <span>
          Showing <strong className="text-slate-900">{filteredProducts.length}</strong> of {PRODUCTS.length} products
        </span>
        {currentUser?.role !== 'admin' && (
          <span className="text-[11px]">Stock status visible · dispatch 7–10 days</span>
        )}
      </div>

      {/* Product grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <PackageSearch className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No products found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Try adjusting your search or filters to find what you're looking for.
          </p>
          <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4">
            Reset filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => {
                setSelectedProduct(product);
                setView('product-detail');
              }}
            />
          ))}
        </div>
      )}

      {/* Filter bottom sheet */}
      <FilterSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        categories={categories}
      />
    </div>
  );
}

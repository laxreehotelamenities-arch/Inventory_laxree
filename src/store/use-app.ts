/**
 * App store using Zustand
 * Manages auth state, current view, and cart/request list
 */
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, AppUser, View, CatalogFilters } from '@/lib/types';

interface AppState {
  // Auth
  currentUser: AppUser | null;
  login: (user: AppUser) => void;
  logout: () => void;

  // Navigation
  currentView: View;
  setView: (view: View) => void;

  // Selected product (for detail view)
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;

  // Requested quantity (when user wants more than available, trigger alternatives)
  requestedQty: number;
  setRequestedQty: (qty: number) => void;

  // Filters
  filters: CatalogFilters;
  setFilters: (filters: Partial<CatalogFilters>) => void;
  resetFilters: () => void;

  // Cart / order request list
  cart: { product: Product; qty: number }[];
  addToCart: (product: Product, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  // Toast / notifications (simple)
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

const defaultFilters: CatalogFilters = {
  search: '',
  tier: 'all',
  category: 'all',
  stockStatus: 'all',
  sortBy: 'name',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: null,
      login: (user) => set({ currentUser: user, currentView: 'catalog' }),
      logout: () => set({ currentUser: null, currentView: 'login', cart: [], selectedProduct: null, filters: defaultFilters }),

      currentView: 'login',
      setView: (view) => set({ currentView: view }),

      selectedProduct: null,
      setSelectedProduct: (product) => set({ selectedProduct: product, requestedQty: 1 }),

      requestedQty: 1,
      setRequestedQty: (qty) => set({ requestedQty: Math.max(1, qty) }),

      filters: defaultFilters,
      setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),
      resetFilters: () => set({ filters: defaultFilters }),

      cart: [],
      addToCart: (product, qty) =>
        set((state) => {
          const existing = state.cart.find((c) => c.product.id === product.id);
          if (existing) {
            return {
              cart: state.cart.map((c) =>
                c.product.id === product.id ? { ...c, qty: c.qty + qty } : c
              ),
            };
          }
          return { cart: [...state.cart, { product, qty }] };
        }),
      removeFromCart: (productId) =>
        set((state) => ({ cart: state.cart.filter((c) => c.product.id !== productId) })),
      clearCart: () => set({ cart: [] }),

      toast: null,
      showToast: (message, type = 'info') => {
        set({ toast: { message, type } });
        setTimeout(() => set({ toast: null }), 3000);
      },
      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'laxree-inventory-app',
      partialize: (state) => ({
        currentUser: state.currentUser,
        cart: state.cart,
      }),
    }
  )
);

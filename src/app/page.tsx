'use client';

import { useAppStore } from '@/store/use-app';
import { LoginScreen } from '@/components/auth/login-screen';
import { AppHeader } from '@/components/layout/app-header';
import { CatalogScreen } from '@/components/catalog/catalog-screen';
import { ProductDetailScreen } from '@/components/catalog/product-detail';
import { QuickOrderScreen } from '@/components/catalog/quick-order-screen';
import { CartScreen } from '@/components/cart/cart-screen';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { AdminInwardScreen } from '@/components/admin/admin-inward';
import { AdminOutwardScreen } from '@/components/admin/admin-outward';
import { AdminFastMovingScreen } from '@/components/admin/admin-fast-moving';
import { AdminPurchaseRequestScreen } from '@/components/admin/admin-purchase-request';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { useHydrate } from '@/lib/use-hydrate';

export default function Home() {
  const { currentUser, currentView, toast, clearToast } = useAppStore();
  const mounted = useHydrate();

  // Avoid hydration mismatch — render nothing until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">Loading…</div>
      </div>
    );
  }

  // Not logged in → login screen
  if (!currentUser) {
    return (
      <>
        <LoginScreen />
        <Toaster />
        <Toast toast={toast} onClose={clearToast} />
      </>
    );
  }

  // Logged in → app shell
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader />
      <main className="flex-1">
        {currentView === 'quick-order' && <QuickOrderScreen />}
        {currentView === 'catalog' && <CatalogScreen />}
        {currentView === 'product-detail' && <ProductDetailScreen />}
        {currentView === 'cart' && <CartScreen />}
        {currentView === 'dashboard' && currentUser.role === 'admin' && <AdminDashboard />}
        {currentView === 'admin-inward' && currentUser.role === 'admin' && <AdminInwardScreen />}
        {currentView === 'admin-outward' && currentUser.role === 'admin' && <AdminOutwardScreen />}
        {currentView === 'admin-fast-moving' && currentUser.role === 'admin' && <AdminFastMovingScreen />}
        {currentView === 'admin-purchase-request' && currentUser.role === 'admin' && <AdminPurchaseRequestScreen />}
        {/* Fallbacks for non-admin trying admin views */}
        {['dashboard', 'admin-inward', 'admin-outward', 'admin-fast-moving', 'admin-purchase-request'].includes(currentView) && currentUser.role !== 'admin' && <QuickOrderScreen />}
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-4 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[11px] text-slate-500">
            © 2026 LaxRee Hotel Supplies · Inventory Portal v1.0
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            For authorized personnel only · All stock data is real-time and role-restricted
          </p>
        </div>
      </footer>

      <Toaster />
      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}

// Simple inline toast (in addition to shadcn Toaster — for our Zustand-driven toasts)
function Toast({
  toast,
  onClose,
}: {
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  onClose: () => void;
}) {
  if (!toast) return null;
  const colors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    info: 'bg-slate-900 text-white',
  };
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 max-w-[calc(100vw-2rem)] w-full sm:w-auto">
      <div
        className={cn(
          'rounded-lg shadow-lg px-4 py-3 text-sm font-medium text-center sm:text-left animate-in fade-in slide-in-from-bottom-2',
          colors[toast.type]
        )}
        onClick={onClose}
        role="alert"
      >
        {toast.message}
      </div>
    </div>
  );
}

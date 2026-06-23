'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/use-app';
import masterData from '@/data/inventory-master.json';
import type { Product } from '@/lib/types';
import { getStockDisplay, findAlternatives, getStockStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingCart,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Truck,
  Clock,
  Ruler,
  Tag,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoleConfig } from '@/lib/auth';

const PRODUCTS = masterData as Product[];

const tierColors: Record<Product['tier'], string> = {
  Essential: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Premium: 'bg-blue-100 text-blue-700 border-blue-200',
  Luxury: 'bg-purple-100 text-purple-700 border-purple-200',
  Standard: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function ProductDetailScreen() {
  const {
    selectedProduct,
    currentUser,
    setView,
    requestedQty,
    setRequestedQty,
    addToCart,
    showToast,
    setSelectedProduct,
  } = useAppStore();

  const [showAlternatives, setShowAlternatives] = useState(false);

  const product = selectedProduct;
  const isAdmin = currentUser?.role === 'admin';

  // Alternatives logic: same tier + same category + enough stock for requested qty
  // Always call useMemo unconditionally (before any early return) to satisfy rules-of-hooks
  const alternatives = useMemo(() => {
    if (!product) return [];
    return findAlternatives(product, PRODUCTS, requestedQty);
  }, [product, requestedQty]);

  if (!product || !currentUser) {
    // Redirect via effect-free pattern: render null, the user can use back button
    return null;
  }

  const cfg = getRoleConfig(currentUser.role);
  const stock = getStockDisplay(product, currentUser.role);
  const status = getStockStatus(product);

  // Whether the request exceeds stock
  const exceedsStock = !isAdmin && product.stock_qty > 0 && requestedQty > product.stock_qty;
  const insufficientStock = product.stock_qty === 0 || requestedQty > product.stock_qty;

  const handleAddToCart = () => {
    if (insufficientStock && !isAdmin) {
      setShowAlternatives(true);
      showToast(`Insufficient stock — see alternatives below`, 'error');
      return;
    }
    addToCart(product, requestedQty);
    showToast(`Added ${requestedQty} × ${product.model_no} to request list`, 'success');
    setView('cart');
  };

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Sticky header */}
      <div className="sticky top-14 z-30 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-2.5 flex items-center gap-2 -mx-4 px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedProduct(null);
            setView('catalog');
          }}
          className="h-9 px-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">Back</span>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-slate-500 uppercase tracking-wide truncate">
            {product.category}
          </div>
          <div className="text-sm font-semibold text-slate-900 truncate">{product.name}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 px-4 py-4">
        {/* Left: Image */}
        <div className="space-y-3">
          <div className="aspect-square bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center relative">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-contain p-4"
                loading="eager"
                decoding="async"
              />
            ) : (
              <Package className="w-20 h-20 text-slate-300" />
            )}
          </div>

          {/* Tier + status badges */}
          <div className="flex flex-wrap gap-2">
            {product.tier !== 'Standard' && (
              <Badge className={cn('text-xs font-bold', tierColors[product.tier])} variant="secondary">
                <Layers className="w-3 h-3 mr-1" />
                {product.tier} Tier
              </Badge>
            )}
            <Badge
              className={cn(
                'text-xs font-bold capitalize',
                stock.color === 'green' && 'bg-emerald-100 text-emerald-700',
                stock.color === 'amber' && 'bg-amber-100 text-amber-700',
                stock.color === 'red' && 'bg-rose-100 text-rose-700',
                stock.color === 'slate' && 'bg-slate-100 text-slate-700'
              )}
              variant="secondary"
            >
              {stock.label}
            </Badge>
            {product.source === 'pdf' && (
              <Badge variant="outline" className="text-xs">
                Catalog Item
              </Badge>
            )}
          </div>
        </div>

        {/* Right: Details */}
        <div className="space-y-4">
          {/* Title block */}
          <div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">
              {product.category} › {product.item || product.name}
            </div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight mt-0.5">{product.model_no}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {product.model_no && (
                <Badge variant="outline" className="text-[11px] font-mono">
                  {product.model_no}
                </Badge>
              )}
              {product.colour ? (
                <span className="text-xs text-slate-500">Colour: <strong className="text-slate-700">{product.colour}</strong></span>
              ) : product.color && (
                <span className="text-xs text-slate-500">Color: <strong className="text-slate-700">{product.color}</strong></span>
              )}
            </div>
          </div>

          {/* Stock info card — NO price, NO qty numbers (internal app) */}
          <div
            className={cn(
              'rounded-xl p-3.5 border',
              stock.color === 'green' && 'bg-emerald-50 border-emerald-200',
              stock.color === 'amber' && 'bg-amber-50 border-amber-200',
              stock.color === 'red' && 'bg-rose-50 border-rose-200',
              stock.color === 'slate' && 'bg-slate-50 border-slate-200'
            )}
          >
            <div className="flex items-start gap-2.5">
              {stock.color === 'green' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              {stock.color === 'amber' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
              {stock.color === 'red' && <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              {stock.color === 'slate' && <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900">{stock.label}</div>
                <div className="text-xs text-slate-600 mt-0.5">{stock.sublabel}</div>

                {/* Dispatch info */}
                {cfg.dispatchDays && (
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-600">
                    {status === 'out-of-stock' ? (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        Restock expected in <strong className="text-slate-900">{cfg.restockDays} days</strong>
                      </>
                    ) : (
                      <>
                        <Truck className="w-3.5 h-3.5" />
                        Dispatch within <strong className="text-slate-900">{cfg.dispatchDays} days</strong>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Description
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Specs grid */}
          <div className="grid grid-cols-2 gap-2">
            {product.size && (
              <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-500 font-semibold">
                  <Ruler className="w-3 h-3" /> Dimensions
                </div>
                <div className="text-sm text-slate-900 font-medium mt-0.5">{product.size}</div>
              </div>
            )}
            {product.category && (
              <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-500 font-semibold">
                  <Tag className="w-3 h-3" /> Category
                </div>
                <div className="text-sm text-slate-900 font-medium mt-0.5">{product.category}</div>
              </div>
            )}
          </div>

          {/* Quantity selector + Add to cart */}
          <Separator />
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">
                Request Quantity
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setRequestedQty(requestedQty - 1)}
                  disabled={requestedQty <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={requestedQty}
                  onChange={(e) => setRequestedQty(parseInt(e.target.value) || 1)}
                  className="h-10 text-center font-semibold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setRequestedQty(requestedQty + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Stock warning */}
            {insufficientStock && !isAdmin && (
              <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  Requested quantity exceeds current stock.
                  {alternatives.length > 0 ? (
                    <> Scroll down for <strong>{alternatives.length} alternative{alternatives.length > 1 ? 's' : ''}</strong> in {product.item || product.name}.</>
                  ) : (
                    <> No alternative models available in the same item.</>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={handleAddToCart}
              disabled={product.stock_qty === 0 && !isAdmin}
              className="w-full h-11 text-sm font-semibold"
              size="lg"
            >
              <ShoppingCart className="w-4 h-4 mr-1.5" />
              {product.stock_qty === 0 ? 'Out of Stock' : 'Add to Request List'}
            </Button>
          </div>
        </div>
      </div>

      {/* Alternatives section */}
      {(insufficientStock || showAlternatives) && !isAdmin && (
        <div className="px-4 py-4">
          <Separator className="mb-5" />
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">
              Alternative Models
            </h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Other models of <strong className="text-slate-700">{product.item || product.name}</strong> currently in stock.
          </p>

          {alternatives.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">No alternative models available</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                There are currently no other models of {product.item || product.name} with sufficient stock to fulfil your request.
                Please try reducing the quantity or contact sales for assistance.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {alternatives.map((alt) => {
                const altStock = getStockDisplay(alt, currentUser.role);
                return (
                  <button
                    key={alt.id}
                    onClick={() => {
                      setSelectedProduct(alt);
                      setRequestedQty(1);
                      setShowAlternatives(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all text-left"
                  >
                    <div className="w-16 h-16 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                      {alt.image_url ? (
                        <img src={alt.image_url} alt={alt.name} className="w-full h-full object-contain p-1" loading="eager" decoding="async" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wide">{alt.model_no}</div>
                      <div className="text-sm font-semibold text-slate-900 line-clamp-1">{alt.colour || alt.item}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={cn(
                            'text-[10px] font-semibold',
                            altStock.color === 'green' && 'text-emerald-600',
                            altStock.color === 'amber' && 'text-amber-600'
                          )}
                        >
                          {altStock.label}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

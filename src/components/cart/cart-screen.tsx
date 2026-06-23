'use client';

import { useAppStore } from '@/store/use-app';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Package,
  Send,
  CheckCircle2,
  Truck,
  Clock,
} from 'lucide-react';
import { getStockDisplay } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function CartScreen() {
  const { cart, removeFromCart, currentUser, setView, showToast, clearCart, addToCart } = useAppStore();
  const [submitted, setSubmitted] = useState(false);

  if (!currentUser) return null;

  const totalValue = cart.reduce((sum, c) => sum + (c.product.ssp ?? 0) * c.qty, 0);
  const totalUnits = cart.reduce((sum, c) => sum + c.qty, 0);
  const cfg = currentUser.role === 'admin' ? null : {
    dispatchDays: '7-10',
    restockDays: '24-30',
  };

  const handleSubmit = () => {
    setSubmitted(true);
    showToast(`Request list submitted! Order #LR-${Date.now().toString().slice(-6)} created.`, 'success');
  };

  const handleStartNew = () => {
    clearCart();
    setSubmitted(false);
    setView('catalog');
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 pb-24">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Request Submitted!</h2>
            <p className="text-sm text-slate-600 mt-1.5">
              Your order request has been forwarded to the LaxRee sales team. You'll receive a confirmation
              email shortly with dispatch details.
            </p>
            <div className="bg-white rounded-lg border border-emerald-200 p-3 mt-4 text-left">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Items requested</span>
                <span className="font-semibold text-slate-900">{totalUnits} units</span>
              </div>
              <div className="flex justify-between text-xs mt-1.5">
                <span className="text-slate-500">Estimated value</span>
                <span className="font-semibold text-slate-900">₹{totalValue.toLocaleString('en-IN')}</span>
              </div>
              {cfg && (
                <div className="flex justify-between text-xs mt-1.5">
                  <span className="text-slate-500">Expected dispatch</span>
                  <span className="font-semibold text-slate-900">{cfg.dispatchDays} days</span>
                </div>
              )}
            </div>
            <Button onClick={handleStartNew} className="w-full mt-4">
              Continue Browsing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setView('catalog')} className="h-9 px-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Request List
          </h1>
          <p className="text-xs text-slate-500">
            {cart.length === 0 ? 'No items yet' : `${cart.length} item${cart.length > 1 ? 's' : ''} · ${totalUnits} units`}
          </p>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <ShoppingCart className="w-9 h-9 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Your request list is empty</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">
            Browse the catalog and add items you'd like to request.
          </p>
          <Button onClick={() => setView('catalog')} className="mt-5">
            Browse Catalog
          </Button>
        </div>
      ) : (
        <>
          {/* Cart items */}
          <div className="space-y-2.5">
            {cart.map(({ product, qty }) => {
              const stock = getStockDisplay(product, currentUser.role);
              return (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-3 flex gap-3">
                    {/* Image */}
                    <div className="w-20 h-20 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Package className="w-7 h-7 text-slate-300" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-500 uppercase truncate">{product.category}</div>
                          <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{product.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[9px] font-mono px-1">
                              {product.model_no}
                            </Badge>
                            {product.tier !== 'Standard' && (
                              <Badge variant="secondary" className="text-[9px]">{product.tier}</Badge>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-end justify-between mt-2">
                        {/* Quantity stepper */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              if (qty > 1) {
                                addToCart(product, -1);
                              } else {
                                removeFromCart(product.id);
                              }
                            }}
                          >
                            {qty > 1 ? <Minus className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                          </Button>
                          <span className="text-sm font-bold w-7 text-center">{qty}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => addToCart(product, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Price + stock */}
                        <div className="text-right">
                          {product.ssp && (
                            <div className="text-sm font-bold text-slate-900">
                              ₹{(product.ssp * qty).toLocaleString('en-IN')}
                            </div>
                          )}
                          <div
                            className={cn(
                              'text-[10px] font-semibold',
                              stock.color === 'green' && 'text-emerald-600',
                              stock.color === 'amber' && 'text-amber-600',
                              stock.color === 'red' && 'text-rose-600'
                            )}
                          >
                            {stock.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          <Card className="mt-4 bg-slate-50 border-slate-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total units</span>
                <span className="font-semibold text-slate-900">{totalUnits}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Estimated value</span>
                <span className="font-semibold text-slate-900">₹{totalValue.toLocaleString('en-IN')}</span>
              </div>
              {cfg && (
                <div className="flex justify-between text-xs items-center">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    In-stock items dispatch
                  </span>
                  <span className="font-semibold text-slate-700">{cfg.dispatchDays} days</span>
                </div>
              )}
              {cfg && (
                <div className="flex justify-between text-xs items-center">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Out-of-stock items
                  </span>
                  <span className="font-semibold text-slate-700">{cfg.restockDays} days</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="text-[11px] text-slate-500 leading-relaxed">
                Final pricing, taxes, and dispatch dates will be confirmed by the LaxRee sales team upon order
                verification. This request list is non-binding.
              </div>
            </CardContent>
          </Card>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            size="lg"
            className="w-full mt-4 h-12 text-sm font-semibold shadow-sm"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Submit Request List
          </Button>
        </>
      )}
    </div>
  );
}

'use client';

import { useAppStore } from '@/store/use-app';
import type { Product } from '@/lib/types';
import { getStockDisplay } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const tierColors: Record<Product['tier'], string> = {
  Essential: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Premium: 'bg-blue-100 text-blue-700 border-blue-200',
  Luxury: 'bg-purple-100 text-purple-700 border-purple-200',
  Standard: 'bg-slate-100 text-slate-700 border-slate-200',
};

const statusRing: Record<string, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
  slate: 'bg-slate-400',
};

const statusText: Record<string, string> = {
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  red: 'text-rose-700',
  slate: 'text-slate-600',
};

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const stock = getStockDisplay(product, currentUser?.role ?? 'employee');
  const isAdmin = currentUser?.role === 'admin';

  return (
    <button
      onClick={onClick}
      className="group flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden text-left transition-all hover:shadow-md hover:border-slate-300 active:scale-[0.98]"
    >
      {/* Image */}
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                parent.classList.add('flex', 'items-center', 'justify-center');
                parent.innerHTML = '<div class="text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-slate-300" />
          </div>
        )}
        {/* Tier badge */}
        {product.tier !== 'Standard' && (
          <Badge
            className={cn(
              'absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0 h-5 border',
              tierColors[product.tier]
            )}
            variant="secondary"
          >
            {product.tier}
          </Badge>
        )}
        {/* Stock dot */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-white/90 backdrop-blur px-1.5 py-0.5 rounded-full shadow-sm">
          <span className={cn('w-1.5 h-1.5 rounded-full', statusRing[stock.color])} />
          <span className={cn('text-[9px] font-semibold', statusText[stock.color])}>{stock.label}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide line-clamp-1">
          {product.category}
        </div>
        <h3 className="text-xs font-semibold text-slate-900 line-clamp-2 leading-tight min-h-[2rem]">
          {product.name}
        </h3>

        {/* Model + Color */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {product.model_no && (
            <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4">
              {product.model_no}
            </Badge>
          )}
          {product.color && product.color !== 'Multi' && (
            <span className="text-[10px] text-slate-500 truncate max-w-[80px]">{product.color}</span>
          )}
        </div>

        {/* Price + Stock */}
        <div className="mt-auto pt-1.5 flex items-end justify-between gap-1">
          <div className="leading-tight">
            {product.ssp ? (
              <>
                <div className="text-sm font-bold text-slate-900">
                  ₹{product.ssp.toLocaleString('en-IN')}
                </div>
                {product.mrp && product.mrp > product.ssp && (
                  <div className="text-[10px] text-slate-400 line-through">
                    ₹{product.mrp.toLocaleString('en-IN')}
                  </div>
                )}
              </>
            ) : (
              <div className="text-[11px] text-slate-400 italic">Price on request</div>
            )}
          </div>

          {isAdmin && (
            <div className="text-right shrink-0">
              <div className="text-[9px] text-slate-400 uppercase">Stock</div>
              <div
                className={cn(
                  'text-xs font-bold',
                  product.stock_qty > 10
                    ? 'text-emerald-600'
                    : product.stock_qty > 0
                      ? 'text-amber-600'
                      : 'text-rose-600'
                )}
              >
                {product.stock_qty}
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

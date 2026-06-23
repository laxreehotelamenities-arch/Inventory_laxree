'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/use-app';
import type { Product } from '@/lib/types';
import { getStockDisplay } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const statusBg: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
};

const tierColors: Record<string, string> = {
  Essential: 'bg-emerald-500 text-white',
  Premium: 'bg-blue-500 text-white',
  Luxury: 'bg-purple-500 text-white',
  Standard: 'bg-slate-400 text-white',
};

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const stock = getStockDisplay(product, currentUser?.role ?? 'employee');
  const isAdmin = currentUser?.role === 'admin';
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const hasImage = product.image_url && !imgFailed;

  return (
    <button
      onClick={onClick}
      className="group flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden text-left transition-all hover:shadow-md hover:border-slate-300 active:scale-[0.98]"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
        {/* Skeleton shimmer while loading */}
        {hasImage && !imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
        )}

        {hasImage ? (
          <img
            src={product.image_url!}
            alt={product.item || product.name}
            className={cn(
              'w-full h-full object-contain p-2 group-hover:scale-105 transition-all duration-300',
              imgLoaded ? 'opacity-100' : 'opacity-0'
            )}
            loading="eager"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgFailed(true)}
          />
        ) : (
          // Nicer placeholder for products without an image
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3">
            <Package className="w-10 h-10 text-slate-300" strokeWidth={1.5} />
            <span className="text-[9px] font-mono text-slate-400 text-center break-all line-clamp-2">
              {product.model_no}
            </span>
          </div>
        )}

        {/* Tier badge (top-left) */}
        {product.tier && product.tier !== 'Standard' && (
          <div className={cn(
            'absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow-sm',
            tierColors[product.tier]
          )}>
            {product.tier}
          </div>
        )}

        {/* Stock status pill (top-right) — Admin sees qty, others see only status label */}
        <div className={cn(
          'absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold backdrop-blur',
          statusBg[stock.color]
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', statusRing[stock.color])} />
          {isAdmin ? `${product.stock_qty} units` : stock.label}
        </div>
      </div>

      {/* Content */}
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide line-clamp-1">
          {product.category}
        </div>
        <h3 className="text-xs font-semibold text-slate-900 line-clamp-1 leading-tight min-h-[1rem]">
          {product.item || product.name}
        </h3>

        {/* Model + Color */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4">
            {product.model_no}
          </Badge>
          {product.colour && (
            <span className="text-[10px] text-slate-500 truncate max-w-[80px]">{product.colour}</span>
          )}
        </div>

        {/* Footer: dispatch ETA */}
        <div className="mt-auto pt-1.5">
          <div className={cn('text-[10px] font-medium', statusText[stock.color])}>
            {stock.sublabel}
          </div>
        </div>
      </div>
    </button>
  );
}

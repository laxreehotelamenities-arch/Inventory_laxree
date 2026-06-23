'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAppStore } from '@/store/use-app';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tier } from '@/lib/types';

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  categories: string[];
}

const tiers: Tier[] = ['Essential', 'Premium', 'Luxury', 'Standard'];

export function FilterSheet({ open, onClose, categories }: FilterSheetProps) {
  const { filters, setFilters, resetFilters } = useAppStore();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] max-h-[600px] p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-slate-100">
          <SheetTitle className="text-base">Filters & Sorting</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Sort By */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sort By
            </Label>
            <RadioGroup
              value={filters.sortBy}
              onValueChange={(v) => setFilters({ sortBy: v as typeof filters.sortBy })}
              className="grid grid-cols-1 gap-1"
            >
              {[
                { value: 'name', label: 'Name (A → Z)' },
                { value: 'price-low', label: 'Price: Low to High' },
                { value: 'price-high', label: 'Price: High to Low' },
                { value: 'stock-high', label: 'Stock: High to Low' },
                { value: 'stock-low', label: 'Stock: Low to High' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`sort-${opt.value}`}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors',
                    filters.sortBy === opt.value
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <RadioGroupItem value={opt.value} id={`sort-${opt.value}`} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Tier */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Product Tier
            </Label>
            <RadioGroup
              value={filters.tier}
              onValueChange={(v) => setFilters({ tier: v as typeof filters.tier })}
              className="grid grid-cols-2 gap-1.5"
            >
              <label
                htmlFor="tier-all"
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors',
                  filters.tier === 'all'
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <RadioGroupItem value="all" id="tier-all" />
                <span>All</span>
              </label>
              {tiers.map((t) => (
                <label
                  key={t}
                  htmlFor={`tier-${t}`}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors',
                    filters.tier === t
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <RadioGroupItem value={t} id={`tier-${t}`} />
                  <span>{t}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Stock Status */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Stock Status
            </Label>
            <RadioGroup
              value={filters.stockStatus}
              onValueChange={(v) => setFilters({ stockStatus: v as typeof filters.stockStatus })}
              className="grid grid-cols-2 gap-1.5"
            >
              {[
                { value: 'all', label: 'All' },
                { value: 'in-stock', label: 'In Stock' },
                { value: 'low-stock', label: 'Low Stock' },
                { value: 'out-of-stock', label: 'Out of Stock' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`ss-${opt.value}`}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors',
                    filters.stockStatus === opt.value
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <RadioGroupItem value={opt.value} id={`ss-${opt.value}`} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Category
            </Label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-1">
              <RadioGroup
                value={filters.category}
                onValueChange={(v) => setFilters({ category: v })}
              >
                {categories.map((cat) => (
                  <label
                    key={cat}
                    htmlFor={`cat-${cat}`}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer text-sm transition-colors',
                      filters.category === cat
                        ? 'bg-slate-100 font-medium'
                        : 'hover:bg-slate-50'
                    )}
                  >
                    <RadioGroupItem value={cat} id={`cat-${cat}`} className="scale-90" />
                    <span className="capitalize">{cat === 'all' ? 'All Categories' : cat}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
        </div>

        <SheetFooter className="px-5 py-3 border-t border-slate-100 flex-row gap-2">
          <Button
            variant="outline"
            onClick={resetFilters}
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reset
          </Button>
          <Button onClick={onClose} className="flex-1">
            Show Results
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

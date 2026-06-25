'use client';

import { useMemo } from 'react';
import masterData from '@/data/inventory-master.json';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Layers,
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCTS = masterData as Product[];

const tierColors: Record<Product['tier'], string> = {
  Essential: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Premium: 'bg-blue-100 text-blue-700 border-blue-200',
  Luxury: 'bg-purple-100 text-purple-700 border-purple-200',
  Standard: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function AdminDashboard() {
  const stats = useMemo(() => {
    const totalProducts = PRODUCTS.length;
    const inStock = PRODUCTS.filter((p) => p.stock_qty > 10).length;
    const lowStock = PRODUCTS.filter((p) => p.stock_qty > 0 && p.stock_qty <= 10).length;
    const outOfStock = PRODUCTS.filter((p) => p.stock_qty <= 0).length;
    const totalUnits = PRODUCTS.reduce((sum, p) => sum + Math.max(0, p.stock_qty), 0);
    const totalInward = PRODUCTS.reduce((sum, p) => sum + p.inward, 0);
    const totalDispatched = PRODUCTS.reduce((sum, p) => sum + p.dispatched, 0);

    // Tier breakdown
    const byTier = (['Essential', 'Premium', 'Luxury', 'Standard'] as const).map((tier) => {
      const items = PRODUCTS.filter((p) => p.tier === tier);
      return {
        tier,
        count: items.length,
        inStock: items.filter((p) => p.stock_qty > 10).length,
        lowStock: items.filter((p) => p.stock_qty > 0 && p.stock_qty <= 10).length,
        outOfStock: items.filter((p) => p.stock_qty <= 0).length,
        units: items.reduce((s, p) => s + Math.max(0, p.stock_qty), 0),
      };
    });

    // Top categories (by units — no pricing in internal app)
    const byCategoryMap = new Map<string, { count: number; units: number }>();
    for (const p of PRODUCTS) {
      const c = p.category || 'Uncategorized';
      const cur = byCategoryMap.get(c) || { count: 0, units: 0 };
      cur.count += 1;
      cur.units += Math.max(0, p.stock_qty);
      byCategoryMap.set(c, cur);
    }
    const byCategory = Array.from(byCategoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 8);

    // Low stock alerts (top 10) — exclude items that are out of stock
    const lowStockAlerts = PRODUCTS.filter((p) => p.stock_qty > 0 && p.stock_qty <= 10)
      .sort((a, b) => a.stock_qty - b.stock_qty)
      .slice(0, 10);

    return {
      totalProducts,
      inStock,
      lowStock,
      outOfStock,
      totalUnits,
      totalInward,
      totalDispatched,
      byTier,
      byCategory,
      lowStockAlerts,
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inventory Dashboard</h1>
          <p className="text-xs text-slate-500">Real-time stock overview · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
                <Package className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Total SKUs</span>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-bold text-slate-900">{stats.totalProducts.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-slate-500">across {stats.byCategory.length}+ categories</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Boxes className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 uppercase">In Stock</span>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-bold text-emerald-900">{stats.inStock.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-emerald-700">
                {((stats.inStock / stats.totalProducts) * 100).toFixed(0)}% of catalog
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center">
                <AlertTriangle className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-amber-700 uppercase">Low Stock</span>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-bold text-amber-900">{stats.lowStock.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-amber-700">≤ 10 units left</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-rose-700 uppercase">Out of Stock</span>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-bold text-rose-900">{stats.outOfStock.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-rose-700">needs restock</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory movements */}
      <div className="grid md:grid-cols-3 gap-3">
        <Card className="md:col-span-1 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Boxes className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Stock Movements
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {stats.totalUnits.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              total units in inventory
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold uppercase">
                  <ArrowDownRight className="w-3 h-3" /> Inward
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {stats.totalInward.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10px] text-rose-700 font-semibold uppercase">
                  <ArrowUpRight className="w-3 h-3" /> Dispatched
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {stats.totalDispatched.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tier breakdown */}
        <Card className="md:col-span-2 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-700" />
              Stock by Tier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {stats.byTier.map((t) => {
              const total = t.count || 1;
              const inStockPct = (t.inStock / total) * 100;
              const lowPct = (t.lowStock / total) * 100;
              const outPct = (t.outOfStock / total) * 100;
              return (
                <div key={t.tier}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        className={cn('text-[9px] font-bold px-1.5', tierColors[t.tier])}
                        variant="secondary"
                      >
                        {t.tier}
                      </Badge>
                      <span className="text-slate-700 font-semibold">{t.count} SKUs</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">{t.units.toLocaleString('en-IN')} units</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
                    <div className="bg-emerald-500" style={{ width: `${inStockPct}%` }} />
                    <div className="bg-amber-500" style={{ width: `${lowPct}%` }} />
                    <div className="bg-rose-500" style={{ width: `${outPct}%` }} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[9px] text-slate-500">
                    <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{t.inStock} in</span>
                    <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{t.lowStock} low</span>
                    <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />{t.outOfStock} out</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Top categories + Low stock alerts */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-slate-700" />
              Top Categories by Units
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.byCategory.map((c) => {
              const max = stats.byCategory[0]?.units || 1;
              const pct = (c.units / max) * 100;
              return (
                <div key={c.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 truncate">{c.category}</span>
                    <span className="font-bold text-slate-900 shrink-0 ml-2">
                      {c.units.toLocaleString('en-IN')} units
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {c.count} SKUs
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-rose-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-72 overflow-auto pr-1 -mr-1 space-y-1.5">
              {stats.lowStockAlerts.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                    backgroundColor: p.stock_qty <= 0 ? '#e11d48' : '#f59e0b'
                  }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{p.item || p.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {p.model_no} · {p.category}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-bold shrink-0',
                      p.stock_qty <= 0
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    )}
                  >
                    {p.stock_qty <= 0 ? 'Out of Stock' : 'Low Stock'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

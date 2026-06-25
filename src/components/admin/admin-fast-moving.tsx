'use client';

import { useMemo, useState } from 'react';
import fastMovingData from '@/data/fast-moving-items.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Flame,
  Search,
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FastMovingItem {
  key: string;
  model: string;
  colour: string;
  category: string;
  item: string;
  total_dispatched: number;
  dispatch_count: number;
  current_balance: number;
}

const ITEMS = fastMovingData as FastMovingItem[];

export function AdminFastMovingScreen() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'qty' | 'count' | 'balance'>('qty');

  const filteredItems = useMemo(() => {
    let result = ITEMS;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.model?.toLowerCase().includes(q) ||
          i.item?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      if (sortBy === 'qty') return b.total_dispatched - a.total_dispatched;
      if (sortBy === 'count') return b.dispatch_count - a.dispatch_count;
      // balance ascending — lowest first (urgent restock)
      return a.current_balance - b.current_balance;
    });
  }, [search, sortBy]);

  const stats = useMemo(() => {
    const totalDispatched = ITEMS.reduce((s, i) => s + i.total_dispatched, 0);
    const totalTransactions = ITEMS.reduce((s, i) => s + i.dispatch_count, 0);
    const avgDispatchPerItem = ITEMS.length > 0 ? totalDispatched / ITEMS.length : 0;
    // Low stock + fast moving (urgent restock)
    const urgentRestock = ITEMS.filter(
      (i) => i.current_balance <= 10 && i.total_dispatched > 20
    ).length;
    return { totalDispatched, totalTransactions, avgDispatchPerItem, urgentRestock };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Fast-Moving Items
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Items with highest dispatch volume · Plan restocks proactively
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-3">
            <div className="text-[10px] font-semibold text-orange-700 uppercase">Total Dispatched</div>
            <div className="text-xl font-bold text-orange-900 mt-1">{stats.totalDispatched.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-orange-700">units (fast-moving)</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="text-[10px] font-semibold text-slate-500 uppercase">Transactions</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{stats.totalTransactions}</div>
            <div className="text-[10px] text-slate-500">total dispatches</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="text-[10px] font-semibold text-slate-500 uppercase">Avg / Item</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{stats.avgDispatchPerItem.toFixed(0)}</div>
            <div className="text-[10px] text-slate-500">units per item</div>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-3">
            <div className="text-[10px] font-semibold text-rose-700 uppercase">Urgent Restock</div>
            <div className="text-xl font-bold text-rose-900 mt-1">{stats.urgentRestock}</div>
            <div className="text-[10px] text-rose-700">low stock + high demand</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Sort */}
      <Card className="border-slate-200">
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by model, item, category…"
              className="pl-9 h-10"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <Button
              variant={sortBy === 'qty' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('qty')}
              className="shrink-0 h-8"
            >
              <ArrowUpRight className="w-3 h-3 mr-1" />
              By Volume
            </Button>
            <Button
              variant={sortBy === 'count' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('count')}
              className="shrink-0 h-8"
            >
              <Activity className="w-3 h-3 mr-1" />
              By Frequency
            </Button>
            <Button
              variant={sortBy === 'balance' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('balance')}
              className="shrink-0 h-8"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Urgent Restock
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-slate-700" />
            Top Fast-Moving Items ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-auto">
            {filteredItems.map((item, idx) => {
              const isUrgent = item.current_balance <= 10 && item.total_dispatched > 20;
              const isLow = item.current_balance <= 10;
              return (
                <div
                  key={item.key}
                  className={cn(
                    'p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors',
                    isUrgent && 'bg-rose-50/40'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Rank badge */}
                    <div
                      className={cn(
                        'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold',
                        idx === 0 && 'bg-amber-100 text-amber-700',
                        idx === 1 && 'bg-slate-200 text-slate-700',
                        idx === 2 && 'bg-orange-100 text-orange-700',
                        idx > 2 && 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {item.model}
                        </Badge>
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {item.item}
                        </span>
                        {isUrgent && (
                          <Badge className="text-[9px] bg-rose-100 text-rose-700 border border-rose-200" variant="secondary">
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                            URGENT RESTOCK
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                        <span>{item.category}</span>
                        {item.colour && (
                          <>
                            <span>·</span>
                            <span>{item.colour}</span>
                          </>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <div className="flex items-center gap-1 text-xs">
                          <ArrowUpRight className="w-3 h-3 text-rose-500 shrink-0" />
                          <span className="font-bold text-rose-600">{item.total_dispatched}</span>
                          <span className="text-slate-500">dispatched</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Activity className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="font-bold text-blue-600">{item.dispatch_count}</span>
                          <span className="text-slate-500">txns</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Package className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className={cn(
                            'font-bold',
                            isLow ? 'text-rose-600' : 'text-emerald-600'
                          )}>
                            {Math.max(0, item.current_balance)}
                          </span>
                          <span className="text-slate-500">in stock</span>
                        </div>
                      </div>

                      {/* Dispatch rate bar */}
                      <div className="mt-2">
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              isUrgent ? 'bg-rose-500' : 'bg-orange-500'
                            )}
                            style={{
                              width: `${Math.min(100, (item.total_dispatched / (ITEMS[0]?.total_dispatched || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredItems.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                No items match your search
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/use-app';
import masterData from '@/data/inventory-master.json';
import outwardLog from '@/data/olog.json';
import clientsSummary from '@/data/clients-summary.json';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpRight,
  Package,
  Search,
  Plus,
  TrendingDown,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCTS = masterData as Product[];

interface OutwardEntry {
  uid: number;
  sr: number;
  date: string;
  cat: string;
  item: string;
  model: string;
  colour: string;
  qty: number;
  balance: number;
  challan: string;
  bill: string;
  client: string;
  remark: string;
  ts: number;
}

const LOG = outwardLog as OutwardEntry[];
const CLIENTS = clientsSummary as { client: string; total_qty: number }[];

export function AdminOutwardScreen() {
  const { showToast } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [qty, setQty] = useState<number>(1);
  const [client, setClient] = useState('');
  const [challan, setChallan] = useState('');
  const [bill, setBill] = useState('');
  const [remark, setRemark] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitted, setSubmitted] = useState(false);

  const filteredLog = useMemo(() => {
    if (!search) return LOG;
    const q = search.toLowerCase();
    return LOG.filter(
      (e) =>
        e.model?.toLowerCase().includes(q) ||
        e.item?.toLowerCase().includes(q) ||
        e.cat?.toLowerCase().includes(q) ||
        e.client?.toLowerCase().includes(q) ||
        e.challan?.toLowerCase().includes(q)
    );
  }, [search]);

  const stats = useMemo(() => {
    const totalQty = LOG.reduce((s, e) => s + e.qty, 0);
    const uniqueClients = new Set(LOG.map((e) => e.client).filter(Boolean)).size;
    const last7Days = LOG.filter((e) => {
      const d = new Date(e.date);
      const now = new Date();
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).length;
    return { totalQty, uniqueClients, last7Days };
  }, []);

  const productOptions = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of PRODUCTS) {
      const key = `${p.category}__${p.item}__${p.model_no}__${p.colour}`;
      if (!map.has(key)) map.set(key, p);
    }
    return Array.from(map.values()).sort((a, b) =>
      `${a.category} ${a.item} ${a.model_no}`.localeCompare(`${b.category} ${b.item} ${b.model_no}`)
    );
  }, []);

  const selectedProduct = useMemo(
    () => PRODUCTS.find((p) => p.id === selectedProductId),
    [selectedProductId]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast('Please select a product', 'error');
      return;
    }
    if (selectedProduct.stock_qty < qty) {
      showToast(
        `Insufficient stock — only ${selectedProduct.stock_qty} units available`,
        'error'
      );
      return;
    }
    setSubmitted(true);
    showToast(
      `Outward recorded: ${qty} units of ${selectedProduct.model_no} to ${client || 'walk-in'}`,
      'success'
    );
    setTimeout(() => {
      setSubmitted(false);
      setSelectedProductId('');
      setQty(1);
      setClient('');
      setChallan('');
      setBill('');
      setRemark('');
    }, 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-rose-600" />
            Outward Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dispatch stock to clients · View dispatch history
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-3">
            <div className="text-[10px] font-semibold text-rose-700 uppercase">Total Dispatched</div>
            <div className="text-xl font-bold text-rose-900 mt-1">{stats.totalQty.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-rose-700">units sent out</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="text-[10px] font-semibold text-slate-500 uppercase">Transactions</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{LOG.length}</div>
            <div className="text-[10px] text-slate-500">total dispatches</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="text-[10px] font-semibold text-slate-500 uppercase">Clients</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{stats.uniqueClients}</div>
            <div className="text-[10px] text-slate-500">unique buyers</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-3">
            <div className="text-[10px] font-semibold text-blue-700 uppercase">Last 7 Days</div>
            <div className="text-xl font-bold text-blue-900 mt-1">{stats.last7Days}</div>
            <div className="text-[10px] text-blue-700">dispatches</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Outward Form */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-rose-600" />
            Record New Outward (Dispatch)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Outward Recorded!</h3>
              <p className="text-xs text-slate-500 mt-1">Form will reset in a moment…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Product</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select product (search by category / item / model)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectGroup>
                        <SelectLabel>Products ({productOptions.length})</SelectLabel>
                        {productOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="flex items-center gap-2 text-xs">
                              <Package className="w-3 h-3 text-slate-400" />
                              <span className="font-mono">{p.model_no}</span>
                              <span className="text-slate-500">· {p.item}</span>
                              {p.colour && <span className="text-slate-400">· {p.colour}</span>}
                              <span className={cn(
                                'ml-auto text-[9px] font-sans font-semibold px-1.5 py-0 rounded-full',
                                p.stock_qty === 0
                                  ? 'bg-rose-100 text-rose-700'
                                  : p.stock_qty <= 10
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                              )}>
                                {p.stock_qty} avail
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Client / Buyer</Label>
                  <Input
                    type="text"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    placeholder="Client name"
                    className="h-11"
                    list="client-list"
                  />
                  <datalist id="client-list">
                    {CLIENTS.slice(0, 20).map((c) => (
                      <option key={c.client} value={c.client} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Challan No.</Label>
                  <Input
                    type="text"
                    value={challan}
                    onChange={(e) => setChallan(e.target.value)}
                    placeholder="Challan number"
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Bill No.</Label>
                  <Input
                    type="text"
                    value={bill}
                    onChange={(e) => setBill(e.target.value)}
                    placeholder="Bill number"
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Remark (optional)</Label>
                  <Input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Any notes about this dispatch"
                    className="h-11"
                  />
                </div>
              </div>

              {selectedProduct && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-rose-600" />
                  <div className="text-xs">
                    <div className="font-semibold text-rose-900">
                      {selectedProduct.model_no} · {selectedProduct.item}
                    </div>
                    <div className="text-rose-700">
                      {selectedProduct.category} · Available: {selectedProduct.stock_qty}
                    </div>
                  </div>
                  <Badge className="ml-auto bg-rose-100 text-rose-700" variant="secondary">
                    −{qty} units
                  </Badge>
                </div>
              )}

              <Button
                type="submit"
                disabled={!selectedProductId || !qty}
                className="w-full h-11 bg-rose-600 hover:bg-rose-700"
              >
                <ArrowUpRight className="w-4 h-4 mr-1.5" />
                Record Outward
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Outward History */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-slate-700" />
              Dispatch History ({filteredLog.length})
            </CardTitle>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by model, item, client, challan…"
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left">
                  <th className="p-2 font-semibold text-slate-600">Date</th>
                  <th className="p-2 font-semibold text-slate-600">Model</th>
                  <th className="p-2 font-semibold text-slate-600">Item</th>
                  <th className="p-2 font-semibold text-slate-600">Client</th>
                  <th className="p-2 font-semibold text-slate-600 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {filteredLog.slice(0, 100).map((entry, idx) => (
                  <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-2 text-slate-600 whitespace-nowrap">{entry.date}</td>
                    <td className="p-2 font-mono text-slate-900">{entry.model}</td>
                    <td className="p-2 text-slate-700 truncate max-w-[100px]">{entry.item}</td>
                    <td className="p-2 text-slate-600 truncate max-w-[120px]">{entry.client || '—'}</td>
                    <td className="p-2 text-right font-bold text-rose-700">−{entry.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLog.length > 100 && (
            <div className="p-2 text-center text-[10px] text-slate-500 border-t border-slate-100">
              Showing 100 of {filteredLog.length} entries — refine search to see more
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Clients */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-700" />
            Top Clients by Dispatch Volume
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left">
                  <th className="p-2 font-semibold text-slate-600">#</th>
                  <th className="p-2 font-semibold text-slate-600">Client</th>
                  <th className="p-2 font-semibold text-slate-600 text-right">Total Units</th>
                </tr>
              </thead>
              <tbody>
                {CLIENTS.slice(0, 20).map((c, idx) => (
                  <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-2 text-slate-400">{idx + 1}</td>
                    <td className="p-2 text-slate-700">{c.client}</td>
                    <td className="p-2 text-right font-bold text-slate-900">{c.total_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

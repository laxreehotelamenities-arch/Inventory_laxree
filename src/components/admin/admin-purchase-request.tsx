'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/use-app';
import masterData from '@/data/inventory-master.json';
import purchaseRequestsData from '@/data/purchase-requests.json';
import vendorsData from '@/data/vendors-summary.json';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  ShoppingCart,
  Package,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Truck,
  FileText,
  Download,
  Filter,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generatePurchaseRequestPDF } from '@/lib/purchase-pdf';

const PRODUCTS = masterData as Product[];

interface PurchaseRequest {
  pr_number: string;
  date: string;
  product_id: string;
  model_no: string;
  item: string;
  category: string;
  colour: string;
  current_stock: number;
  qty_to_order: number;
  vendor: string;
  priority: 'Urgent' | 'Normal';
  status: 'Pending' | 'Ordered' | 'Received' | 'Cancelled';
  expected_delivery: string;
  requested_by: string;
  notes: string;
}

const INITIAL_PRS = purchaseRequestsData as PurchaseRequest[];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  Pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200', icon: Clock },
  Ordered: { label: 'Ordered', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-200', icon: Truck },
  Received: { label: 'Received', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', icon: CheckCircle2 },
  Cancelled: { label: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-100 border-rose-200', icon: AlertTriangle },
};

export function AdminPurchaseRequestScreen() {
  const { currentUser, showToast } = useAppStore();
  const [prs, setPrs] = useState<PurchaseRequest[]>(INITIAL_PRS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastPR, setLastPR] = useState<PurchaseRequest | null>(null);

  // Form state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [qty, setQty] = useState<number>(50);
  const [vendor, setVendor] = useState('');
  const [priority, setPriority] = useState<'Urgent' | 'Normal'>('Normal');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');

  // Low stock items (suggested for purchase)
  const suggestedItems = useMemo(() => {
    return PRODUCTS.filter((p) => p.stock_qty <= 10)
      .sort((a, b) => a.stock_qty - b.stock_qty)
      .slice(0, 20);
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

  const filteredPRs = useMemo(() => {
    let result = prs;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.pr_number?.toLowerCase().includes(q) ||
          p.model_no?.toLowerCase().includes(q) ||
          p.item?.toLowerCase().includes(q) ||
          p.vendor?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }
    return [...result].sort((a, b) => b.date.localeCompare(a.date));
  }, [prs, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: prs.length,
      pending: prs.filter((p) => p.status === 'Pending').length,
      ordered: prs.filter((p) => p.status === 'Ordered').length,
      received: prs.filter((p) => p.status === 'Received').length,
      urgent: prs.filter((p) => p.priority === 'Urgent' && p.status === 'Pending').length,
      totalQty: prs.reduce((s, p) => s + p.qty_to_order, 0),
    };
  }, [prs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast('Please select a product', 'error');
      return;
    }
    const prNumber = `PR-2026-${1000 + prs.length}`;
    const today = new Date().toISOString().split('T')[0];
    const newPR: PurchaseRequest = {
      pr_number: prNumber,
      date: today,
      product_id: selectedProduct.id,
      model_no: selectedProduct.model_no,
      item: selectedProduct.item || selectedProduct.name,
      category: selectedProduct.category,
      colour: selectedProduct.colour || '',
      current_stock: selectedProduct.stock_qty,
      qty_to_order: qty,
      vendor,
      priority,
      status: 'Pending',
      expected_delivery: expectedDelivery || today,
      requested_by: currentUser?.name || 'Admin',
      notes,
    };
    setPrs([newPR, ...prs]);
    setLastPR(newPR);
    setSubmitted(true);
    showToast(`Purchase Request ${prNumber} created!`, 'success');

    // Auto-download PDF
    setTimeout(() => {
      try {
        generatePurchaseRequestPDF({ pr: newPR });
        showToast(`PDF downloaded: ${newPR.pr_number}.pdf`, 'success');
      } catch (err) {
        console.error('PDF generation failed:', err);
      }
    }, 500);

    // Reset form
    setTimeout(() => {
      setSubmitted(false);
      setShowForm(false);
      setSelectedProductId('');
      setQty(50);
      setVendor('');
      setPriority('Normal');
      setExpectedDelivery('');
      setNotes('');
    }, 3500);
  };

  const handleStatusChange = (prNumber: string, newStatus: PurchaseRequest['status']) => {
    setPrs(prs.map((p) => (p.pr_number === prNumber ? { ...p, status: newStatus } : p)));
    showToast(`PR ${prNumber} marked as ${newStatus}`, 'success');
  };

  const handleDownloadPDF = (pr: PurchaseRequest) => {
    try {
      generatePurchaseRequestPDF({ pr });
      showToast(`PDF downloaded: ${pr.pr_number}.pdf`, 'success');
    } catch (err) {
      showToast('PDF generation failed', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            Purchase Requests
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate purchase orders for restocking · Track status from request to receipt
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New PR
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardContent className="p-3">
            <div className="text-[10px] font-semibold text-indigo-700 uppercase">Total PRs</div>
            <div className="text-xl font-bold text-indigo-900 mt-1">{stats.total}</div>
            <div className="text-[10px] text-indigo-700">{stats.totalQty} units requested</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-3">
            <div className="text-[10px] font-semibold text-amber-700 uppercase">Pending</div>
            <div className="text-xl font-bold text-amber-900 mt-1">{stats.pending}</div>
            <div className="text-[10px] text-amber-700">{stats.urgent} urgent</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-3">
            <div className="text-[10px] font-semibold text-blue-700 uppercase">Ordered</div>
            <div className="text-xl font-bold text-blue-900 mt-1">{stats.ordered}</div>
            <div className="text-[10px] text-blue-700">awaiting delivery</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-3">
            <div className="text-[10px] font-semibold text-emerald-700 uppercase">Received</div>
            <div className="text-xl font-bold text-emerald-900 mt-1">{stats.received}</div>
            <div className="text-[10px] text-emerald-700">completed</div>
          </CardContent>
        </Card>
      </div>

      {/* New PR Form */}
      {showForm && (
        <Card className="border-indigo-300 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" />
              Generate New Purchase Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submitted && lastPR ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Purchase Request Created!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  PR Number: <strong>{lastPR.pr_number}</strong> · PDF downloaded
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">Product to Purchase</Label>
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
                                <span className={cn(
                                  'ml-auto text-[9px] font-sans font-semibold px-1.5 py-0 rounded-full',
                                  p.stock_qty === 0
                                    ? 'bg-rose-100 text-rose-700'
                                    : p.stock_qty <= 10
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-slate-100 text-slate-600'
                                )}>
                                  stock: {p.stock_qty}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Quantity to Order</Label>
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
                    <Label className="text-xs font-semibold text-slate-700">Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as 'Urgent' | 'Normal')}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Vendor / Supplier</Label>
                    <Input
                      type="text"
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      placeholder="Vendor name (e.g. LaxRee Manufacturing)"
                      className="h-11"
                      list="vendor-list"
                    />
                    <datalist id="vendor-list">
                      <option value="LaxRee Manufacturing" />
                      <option value="Hotel Supplies Co." />
                      <option value="India Hospitality Mart" />
                      <option value="Premium Amenities Ltd" />
                    </datalist>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Expected Delivery</Label>
                    <Input
                      type="date"
                      value={expectedDelivery}
                      onChange={(e) => setExpectedDelivery(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">Notes (optional)</Label>
                    <Input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any notes about this purchase request"
                      className="h-11"
                    />
                  </div>
                </div>

                {selectedProduct && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Package className="w-4 h-4 text-indigo-600" />
                      <div className="text-xs font-semibold text-indigo-900">
                        {selectedProduct.model_no} · {selectedProduct.item}
                      </div>
                      <Badge className={cn(
                        'ml-auto text-[9px]',
                        selectedProduct.stock_qty === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      )} variant="secondary">
                        Current Stock: {selectedProduct.stock_qty}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-indigo-700">
                      {selectedProduct.category} · {selectedProduct.colour || 'N/A'} · Order {qty} units
                      {priority === 'Urgent' && (
                        <span className="ml-2 text-rose-600 font-semibold">· URGENT</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="flex-1 h-11"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!selectedProductId || !qty}
                    className="flex-[2] h-11 bg-indigo-600 hover:bg-indigo-700"
                  >
                    <FileText className="w-4 h-4 mr-1.5" />
                    Generate Purchase Request
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suggested for Restock */}
      {!showForm && suggestedItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4" />
              Suggested for Restock ({suggestedItems.length} low-stock items)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-48 overflow-y-auto">
              {suggestedItems.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 border-b border-amber-100 hover:bg-amber-50"
                >
                  <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                    {item.model_no}
                  </Badge>
                  <span className="text-xs text-slate-700 truncate flex-1">{item.item}</span>
                  <Badge
                    className={cn(
                      'text-[9px] shrink-0',
                      item.stock_qty === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    )}
                    variant="secondary"
                  >
                    {item.stock_qty} left
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[10px] text-indigo-600 hover:bg-indigo-50"
                    onClick={() => {
                      setSelectedProductId(item.id);
                      setQty(50);
                      setShowForm(true);
                    }}
                  >
                    Create PR
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter + Search */}
      <Card className="border-slate-200">
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PR number, model, item, vendor…"
              className="pl-9 h-10"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="shrink-0 h-8"
            >
              <Filter className="w-3 h-3 mr-1" />
              All ({prs.length})
            </Button>
            {Object.entries(statusConfig).map(([key, cfg]) => {
              const count = prs.filter((p) => p.status === key).length;
              if (count === 0) return null;
              const Icon = cfg.icon;
              return (
                <Button
                  key={key}
                  variant={statusFilter === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(key)}
                  className="shrink-0 h-8"
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {cfg.label} ({count})
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* PR List */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-slate-700" />
            Purchase Requests ({filteredPRs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto">
            {filteredPRs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                No purchase requests found
              </div>
            ) : (
              filteredPRs.map((pr) => {
                const statusCfg = statusConfig[pr.status] || statusConfig.Pending;
                const StatusIcon = statusCfg.icon;
                return (
                  <div
                    key={pr.pr_number}
                    className={cn(
                      'p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors',
                      pr.priority === 'Urgent' && pr.status === 'Pending' && 'bg-rose-50/40'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                        statusCfg.bg, 'border'
                      )}>
                        <StatusIcon className={cn('w-4 h-4', statusCfg.color)} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">{pr.pr_number}</span>
                          <Badge className={cn('text-[9px]', statusCfg.bg, statusCfg.color, 'border')} variant="secondary">
                            {pr.status}
                          </Badge>
                          {pr.priority === 'Urgent' && pr.status === 'Pending' && (
                            <Badge className="text-[9px] bg-rose-100 text-rose-700 border border-rose-200" variant="secondary">
                              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                              URGENT
                            </Badge>
                          )}
                          <span className="text-[10px] text-slate-500 ml-auto">{pr.date}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {pr.model_no}
                          </Badge>
                          <span className="text-xs text-slate-700 truncate">{pr.item}</span>
                          <span className="text-[10px] text-slate-500">· {pr.category}</span>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-[11px]">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">Order:</span>
                            <span className="font-bold text-indigo-600">{pr.qty_to_order} units</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">Current:</span>
                            <span className={cn(
                              'font-bold',
                              pr.current_stock === 0 ? 'text-rose-600' : 'text-amber-600'
                            )}>
                              {pr.current_stock}
                            </span>
                          </div>
                          {pr.vendor && (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500">Vendor:</span>
                              <span className="text-slate-700">{pr.vendor}</span>
                            </div>
                          )}
                          {pr.expected_delivery && (
                            <div className="flex items-center gap-1">
                              <Truck className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-600">{pr.expected_delivery}</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 mt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px] text-slate-600 hover:bg-slate-100"
                            onClick={() => handleDownloadPDF(pr)}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                          {pr.status === 'Pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[10px] text-blue-600 hover:bg-blue-50"
                              onClick={() => handleStatusChange(pr.pr_number, 'Ordered')}
                            >
                              <Truck className="w-3 h-3 mr-1" />
                              Mark Ordered
                            </Button>
                          )}
                          {pr.status === 'Ordered' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[10px] text-emerald-600 hover:bg-emerald-50"
                              onClick={() => handleStatusChange(pr.pr_number, 'Received')}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Mark Received
                            </Button>
                          )}
                          {(pr.status === 'Pending' || pr.status === 'Ordered') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[10px] text-rose-600 hover:bg-rose-50"
                              onClick={() => handleStatusChange(pr.pr_number, 'Cancelled')}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

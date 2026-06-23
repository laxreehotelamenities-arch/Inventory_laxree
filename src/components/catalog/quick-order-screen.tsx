'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/use-app';
import {
  useCascadeData,
  getItemsForCategory,
  getModelsForCategoryItem,
  getInventory,
  type InventoryItem,
} from '@/lib/cascade';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  ChevronRight,
  ShoppingCart,
  Check,
  AlertTriangle,
  XCircle,
  Truck,
  Clock,
  Layers,
  Minus,
  Plus,
  ImageOff,
  Search,
  Tag,
  Boxes,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoleConfig } from '@/lib/auth';
import { findAlternatives, getStockStatus } from '@/lib/types';

const INVENTORY = getInventory();

const tierColors: Record<string, string> = {
  Essential: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Premium: 'bg-blue-100 text-blue-700 border-blue-200',
  Luxury: 'bg-purple-100 text-purple-700 border-purple-200',
  Standard: 'bg-slate-100 text-slate-700 border-slate-200',
};

const stepConfig = [
  { num: 1, label: 'Category', icon: Boxes },
  { num: 2, label: 'Item', icon: Tag },
  { num: 3, label: 'Model', icon: Package },
  { num: 4, label: 'Quantity', icon: ShoppingCart },
];

export function QuickOrderScreen() {
  const { currentUser, addToCart, setView, setSelectedProduct, showToast } = useAppStore();
  const data = useCascadeData();

  const [category, setCategory] = useState<string>('');
  const [item, setItem] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [qty, setQty] = useState<number>(1);
  const [imgFailed, setImgFailed] = useState(false);

  // Selected product lookup — must be called unconditionally (before any early return)
  const selectedProduct = useMemo<InventoryItem | null>(() => {
    if (!productId) return null;
    return INVENTORY.find((p) => p.id === productId) || null;
  }, [productId]);

  // Alternatives lookup — also unconditional
  const alternatives = useMemo(() => {
    if (!selectedProduct || !currentUser) return [];
    const isAdmin = currentUser.role === 'admin';
    const insufficientStock =
      selectedProduct.stock_qty === 0 || qty > selectedProduct.stock_qty;
    if (!insufficientStock || isAdmin) return [];
    return findAlternatives(selectedProduct, INVENTORY, qty);
  }, [selectedProduct, qty, currentUser]);

  if (!currentUser) return null;
  const isAdmin = currentUser.role === 'admin';
  const cfg = getRoleConfig(currentUser.role);

  // Derived lists
  const availableItems = category ? getItemsForCategory(data, category) : [];
  const availableModels =
    category && item ? getModelsForCategoryItem(data, category, item) : [];

  // Reset cascade when parent changes
  const handleCategoryChange = (v: string) => {
    setCategory(v);
    setItem('');
    setProductId('');
    setImgFailed(false);
  };
  const handleItemChange = (v: string) => {
    setItem(v);
    setProductId('');
    setImgFailed(false);
  };
  const handleModelChange = (v: string) => {
    setProductId(v);
    setImgFailed(false);
    setQty(1);
  };

  // Stock info
  const stockStatus = selectedProduct ? getStockStatus(selectedProduct) : null;
  const insufficientStock =
    selectedProduct && (selectedProduct.stock_qty === 0 || qty > selectedProduct.stock_qty);

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    if (insufficientStock && !isAdmin) {
      showToast(`Only ${selectedProduct.stock_qty} units in stock — see alternatives`, 'error');
      return;
    }
    addToCart(selectedProduct, qty);
    showToast(`Added ${qty} × ${selectedProduct.model_no} to request list`, 'success');
    setView('cart');
  };

  const handleViewDetails = () => {
    if (!selectedProduct) return;
    setSelectedProduct(selectedProduct);
    setView('product-detail');
  };

  // Progress step state
  const currentStep = !category ? 1 : !item ? 2 : !productId ? 3 : 4;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Search className="w-5 h-5 text-slate-700" />
          Quick Order
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Select category → item → model → quantity. Stock info appears instantly.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-5 px-1 overflow-x-auto no-scrollbar">
        {stepConfig.map((step, idx) => {
          const isActive = currentStep === step.num;
          const isDone = currentStep > step.num;
          const Icon = step.icon;
          return (
            <div key={step.num} className="flex items-center shrink-0">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all border-2',
                    isActive && 'bg-slate-900 border-slate-900 text-white scale-110',
                    isDone && 'bg-emerald-500 border-emerald-500 text-white',
                    !isActive && !isDone && 'bg-white border-slate-200 text-slate-400'
                  )}
                >
                  {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span
                  className={cn(
                    'text-[9px] font-semibold uppercase tracking-wide',
                    isActive ? 'text-slate-900' : isDone ? 'text-emerald-600' : 'text-slate-400'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < stepConfig.length - 1 && (
                <div
                  className={cn(
                    'w-6 sm:w-12 h-0.5 mx-1 mb-4 rounded',
                    isDone ? 'bg-emerald-500' : 'bg-slate-200'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Cascading selectors */}
      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-3.5">
          {/* Step 1: Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">1</span>
              Category
            </Label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select a category (Room Amenities, Lobby Items, Bathroom Amenities…)" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectGroup>
                  <SelectLabel>Categories ({data.categories.length})</SelectLabel>
                  {data.categories.map((c) => {
                    const itemCount = data.itemsByCategory.get(c)?.length || 0;
                    return (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2">
                          <Boxes className="w-3.5 h-3.5 text-slate-400" />
                          {c}
                          <span className="ml-auto text-[10px] text-slate-400">{itemCount} items</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Item Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span className={cn(
                'w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center',
                category ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'
              )}>2</span>
              Item Name
            </Label>
            <Select value={item} onValueChange={handleItemChange} disabled={!category}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={category ? 'Select an item (Hair Dryer, Tea Kettle, Room Dustbin…)' : 'Select category first'} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectGroup>
                  <SelectLabel>Items in {category} ({availableItems.length})</SelectLabel>
                  {availableItems.map((i) => {
                    const models = getModelsForCategoryItem(data, category, i);
                    return (
                      <SelectItem key={i} value={i}>
                        <span className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          {i}
                          <span className="ml-auto text-[10px] text-slate-400">{models.length} models</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Step 3: Model */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span className={cn(
                'w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center',
                item ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'
              )}>3</span>
              Model Number
            </Label>
            <Select value={productId} onValueChange={handleModelChange} disabled={!item}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={item ? 'Select a model (e.g. LRWT-145, LRHD-277)' : 'Select item first'} />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectGroup>
                  <SelectLabel>Models ({availableModels.length})</SelectLabel>
                  {availableModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2 font-mono text-xs">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.model_no}</span>
                        {m.colour && (
                          <span className="text-slate-400 font-sans">· {m.colour}</span>
                        )}
                        <span className={cn(
                          'ml-auto text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded-full',
                          m.stock_qty === 0
                            ? 'bg-rose-100 text-rose-700'
                            : m.stock_qty <= 10
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                        )}>
                          {m.stock_qty} in stock
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Selected Product Preview */}
      {selectedProduct && (
        <Card className="mt-4 border-slate-900 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Product Selected</h2>
              {selectedProduct.tier && selectedProduct.tier !== 'Standard' && (
                <Badge className={cn('ml-auto text-[10px] font-bold', tierColors[selectedProduct.tier])} variant="secondary">
                  {selectedProduct.tier}
                </Badge>
              )}
            </div>

            <div className="grid sm:grid-cols-[160px_1fr] gap-4">
              {/* Image */}
              <div className="aspect-square bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center relative">
                {selectedProduct.image_url && !imgFailed ? (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.item || selectedProduct.name}
                    className="w-full h-full object-contain p-2"
                    loading="eager"
                    decoding="async"
                    onError={() => setImgFailed(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-300">
                    {imgFailed ? <ImageOff className="w-10 h-10" /> : <Package className="w-10 h-10" />}
                    <span className="text-[10px] mt-1">No image</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2.5">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                    {selectedProduct.category} › {selectedProduct.item}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight mt-0.5">
                    {selectedProduct.item || selectedProduct.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="text-[10px] font-mono">{selectedProduct.model_no}</Badge>
                    {selectedProduct.colour && (
                      <span className="text-[11px] text-slate-500">Colour: <strong>{selectedProduct.colour}</strong></span>
                    )}
                  </div>
                </div>

                {selectedProduct.ssp && (
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-slate-900">
                        ₹{selectedProduct.ssp.toLocaleString('en-IN')}
                      </span>
                      {selectedProduct.mrp && selectedProduct.mrp > selectedProduct.ssp && (
                        <span className="text-xs text-slate-400 line-through">
                          ₹{selectedProduct.mrp.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">SSP · taxes extra</div>
                  </div>
                )}

                {/* Stock availability — the key feature user asked for */}
                <div className={cn(
                  'rounded-lg p-2.5 border flex items-start gap-2.5',
                  stockStatus === 'in-stock' && 'bg-emerald-50 border-emerald-200',
                  stockStatus === 'low-stock' && 'bg-amber-50 border-amber-200',
                  stockStatus === 'out-of-stock' && 'bg-rose-50 border-rose-200'
                )}>
                  {stockStatus === 'in-stock' && <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                  {stockStatus === 'low-stock' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
                  {stockStatus === 'out-of-stock' && <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900">
                      {isAdmin ? (
                        <>{selectedProduct.stock_qty} units available</>
                      ) : stockStatus === 'in-stock' ? (
                        <>In Stock</>
                      ) : stockStatus === 'low-stock' ? (
                        <>Limited Stock</>
                      ) : (
                        <>Out of Stock</>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {isAdmin ? (
                        <>Balance: {selectedProduct.stock_qty} · Inward: {selectedProduct.inward} · Dispatched: {selectedProduct.dispatched}</>
                      ) : stockStatus === 'out-of-stock' ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Available in {cfg.restockDays} days
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3" /> Dispatch within {cfg.dispatchDays} days
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quantity + actions */}
            <Separator className="my-4" />

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">
                  Quantity Required
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    disabled={qty <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-10 text-center font-semibold"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => setQty(qty + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <div className="ml-2 text-xs text-slate-500">
                    {selectedProduct.ssp && (
                      <span>Total: <strong className="text-slate-900">₹{(selectedProduct.ssp * qty).toLocaleString('en-IN')}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Insufficient stock warning */}
              {insufficientStock && !isAdmin && (
                <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    Requested <strong>{qty}</strong> units, but only <strong>{selectedProduct.stock_qty}</strong> in stock.
                    {alternatives.length > 0 ? (
                      <> {alternatives.length} alternative{alternatives.length > 1 ? 's' : ''} available below in {selectedProduct.item}.</>
                    ) : (
                      <> No alternative models available in the same item.</>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleViewDetails}
                  className="flex-1 h-11"
                >
                  View Full Details
                </Button>
                <Button
                  onClick={handleAddToCart}
                  disabled={selectedProduct.stock_qty === 0 && !isAdmin}
                  className="flex-[2] h-11"
                >
                  <ShoppingCart className="w-4 h-4 mr-1.5" />
                  {selectedProduct.stock_qty === 0 ? 'Out of Stock' : 'Add to Request List'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alternatives */}
      {selectedProduct && insufficientStock && !isAdmin && alternatives.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">
              Alternative Models ({alternatives.length})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Other models of <strong>{selectedProduct.item}</strong> with enough stock for {qty} units.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {alternatives.map((alt) => (
              <button
                key={alt.id}
                onClick={() => handleModelChange(alt.id)}
                className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all text-left"
              >
                <div className="w-14 h-14 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                  {alt.image_url ? (
                    <img src={alt.image_url} alt={alt.name} className="w-full h-full object-contain p-1" loading="eager" decoding="async" />
                  ) : (
                    <Package className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide">{alt.model_no}</div>
                  <div className="text-sm font-semibold text-slate-900 line-clamp-1">{alt.colour || alt.item}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {alt.ssp && (
                      <span className="text-xs font-bold text-slate-900">₹{alt.ssp.toLocaleString('en-IN')}</span>
                    )}
                    <span className="text-[10px] text-emerald-600 font-semibold">· In Stock</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state hint when no product selected */}
      {!selectedProduct && (
        <Card className="mt-4 bg-slate-50 border-dashed border-slate-300">
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Select options above</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Choose a category, item, and model to see product details, image, and live stock availability.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useAppStore } from '@/store/use-app';
import { getRoleConfig } from '@/lib/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Package, LogOut, LayoutGrid, ShoppingCart, ChevronDown, ShieldCheck, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-rose-100 text-rose-700',
  employee: 'bg-amber-100 text-amber-700',
  dealer: 'bg-emerald-100 text-emerald-700',
  distributor: 'bg-violet-100 text-violet-700',
};

export function AppHeader() {
  const { currentUser, currentView, setView, logout, cart, clearToast } = useAppStore();
  if (!currentUser) return null;

  const cfg = getRoleConfig(currentUser.role);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  const navItems: { key: typeof currentView; label: string; icon: typeof LayoutGrid }[] = [
    { key: 'quick-order', label: 'Quick Order', icon: Search },
    { key: 'catalog', label: 'Catalog', icon: LayoutGrid },
  ];
  if (cfg.canViewDashboard) {
    navItems.push({ key: 'dashboard', label: 'Dashboard', icon: ShieldCheck });
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Logo / Brand */}
        <button
          onClick={() => setView('catalog')}
          className="flex items-center gap-2 shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
            <Package className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
          </div>
          <div className="hidden sm:block leading-tight text-left">
            <div className="text-sm font-bold text-slate-900">LaxRee</div>
            <div className="text-[10px] text-slate-500 -mt-0.5">Inventory Portal</div>
          </div>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                currentView === item.key
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right side: cart + user */}
        <div className="flex items-center gap-1.5">
          {/* Cart */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('cart')}
            className="relative h-9 w-9 p-0"
            aria-label="Open cart"
          >
            <ShoppingCart className="w-4.5 h-4.5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 h-9 pl-1 pr-2 rounded-full hover:bg-slate-100 transition-colors">
                <Avatar className="w-7 h-7">
                  <AvatarFallback
                    className={cn('text-[11px] font-bold', roleBadgeColors[currentUser.role])}
                  >
                    {currentUser.avatar}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="pb-2">
                <div className="flex items-center gap-2">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback
                      className={cn('text-xs font-bold', roleBadgeColors[currentUser.role])}
                    >
                      {currentUser.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-slate-900">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500">{currentUser.department}</div>
                  </div>
                </div>
                <Badge
                  className={cn('mt-2 text-[10px] font-semibold', roleBadgeColors[currentUser.role])}
                  variant="secondary"
                >
                  {cfg.label}
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Mobile nav items */}
              <div className="md:hidden">
                {navItems.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    onClick={() => {
                      setView(item.key);
                      clearToast();
                    }}
                    className={cn(currentView === item.key && 'bg-slate-100')}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </div>

              <DropdownMenuItem
                onClick={() => {
                  logout();
                }}
                className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

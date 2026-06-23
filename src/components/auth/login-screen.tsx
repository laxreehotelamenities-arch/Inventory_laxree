'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/use-app';
import { authenticate, DEMO_CREDENTIALS, getRoleConfig } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Lock, User, Eye, EyeOff, Shield, ShoppingBag, Building2, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

const roleIcons = {
  admin: Shield,
  employee: ShoppingBag,
  dealer: Building2,
  distributor: Truck,
};

const roleColors: Record<string, string> = {
  admin: 'bg-rose-50 text-rose-700 border-rose-200',
  employee: 'bg-amber-50 text-amber-700 border-amber-200',
  dealer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  distributor: 'bg-violet-50 text-violet-700 border-violet-200',
};

export function LoginScreen() {
  const login = useAppStore((s) => s.login);
  const showToast = useAppStore((s) => s.showToast);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const user = authenticate(username.trim(), password);
      if (user) {
        login(user);
        showToast(`Welcome back, ${user.name}!`, 'success');
      } else {
        showToast('Invalid credentials. Please try again.', 'error');
      }
      setLoading(false);
    }, 400);
  };

  const fillCredentials = (creds: typeof DEMO_CREDENTIALS[number]) => {
    setUsername(creds.username);
    setPassword(creds.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">
      {/* Header / Brand */}
      <header className="px-6 pt-10 pb-4 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full shadow-xl mb-4 ring-4 ring-white bg-black overflow-hidden">
          <img
            src="/laxree-logo.png"
            alt="LaxRee Hotel Supplies"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">LaxRee Inventory</h1>
        <p className="text-sm text-slate-500 mt-1">Hotel Amenities · Stock & Catalog Portal</p>
      </header>

      {/* Main login card */}
      <main className="flex-1 px-5 pb-8 flex flex-col justify-center max-w-md mx-auto w-full">
        <Card className="shadow-xl border-slate-200">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Sign in to your account</CardTitle>
            <p className="text-xs text-center text-slate-500">
              Choose your role to access the inventory portal
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-medium text-slate-600">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="pl-9 h-11"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-slate-600">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pl-9 pr-9 h-11"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full h-11 text-sm font-semibold shadow-sm"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            {/* Quick role login chips */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-400 mb-2.5 text-center">
                Quick Demo Login
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_CREDENTIALS.map((c) => {
                  const cfg = getRoleConfig(c.role);
                  const Icon = roleIcons[c.role];
                  return (
                    <button
                      key={c.role}
                      type="button"
                      onClick={() => fillCredentials(c)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all hover:shadow-sm active:scale-[0.98]',
                        roleColors[c.role]
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-3 leading-relaxed">
                Tap a role to auto-fill credentials, then press Sign In
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-[11px] text-slate-400 text-center mt-6">
          © 2026 LaxRee Hotel Supplies · v1.0 · For authorized personnel only
        </p>
      </main>
    </div>
  );
}

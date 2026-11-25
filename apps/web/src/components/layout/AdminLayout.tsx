import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  BellRing,
  Utensils,
  QrCode,
  Store,
  Settings,
  Users,
  BarChart3,
  LogOut,
  PauseCircle,
  PlayCircle,
  ExternalLink,
  Menu,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { getDaysRemaining } from '@menuorbit/shared';

const navItems = [
  { to: '/admin', label: 'Live Orders', icon: BellRing, end: true },
  { to: '/admin/menu', label: 'Menu Builder', icon: Utensils },
  { to: '/admin/tables-qr', label: 'Tables & QR Codes', icon: QrCode },
  { to: '/admin/reports', label: 'Sales & Reports', icon: BarChart3 },
  { to: '/admin/profile', label: 'Restaurant Profile', icon: Store },
  { to: '/admin/settings', label: 'Operations & Tax', icon: Settings },
  { to: '/admin/staff', label: 'Staff & Roles', icon: Users },
];

export function AdminLayout() {
  const { signOut, memberships, profile } = useAuth();
  const { restaurant, settings, subscription, loading, switchRestaurant, pauseOrdersForMinutes } =
    useTenant();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-900">No Restaurant Found</h2>
          <p className="text-sm text-slate-500">
            Your account is not linked to any restaurant yet.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              to="/register-restaurant"
              className="px-4 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700"
            >
              Register a Restaurant
            </Link>
            {profile?.is_super_admin && (
              <Link
                to="/superadmin"
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Go to Super Admin Console →
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isPaused =
    settings?.orders_paused_until && new Date(settings.orders_paused_until) > new Date();
  const trialDaysLeft = subscription ? getDaysRemaining(subscription.trial_ends_at) : 0;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-sm">
              {restaurant.name.charAt(0)}
            </div>
          )}
          <span className="font-bold text-slate-900 text-sm truncate max-w-[180px]">
            {restaurant.name}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`${
          mobileMenuOpen ? 'fixed inset-0 z-40 flex' : 'hidden'
        } lg:flex lg:w-64 lg:shrink-0 bg-white border-r border-slate-200 flex-col`}
      >
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="h-10 w-10 rounded-xl object-cover border border-slate-200"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold">
                {restaurant.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {memberships.length > 1 ? (
                <select
                  value={restaurant.id}
                  onChange={(e) => switchRestaurant(e.target.value)}
                  className="w-full font-bold text-sm text-slate-900 bg-transparent focus:outline-none truncate"
                >
                  {memberships.map((m) => (
                    <option key={m.restaurant_id} value={m.restaurant_id}>
                      {m.restaurants?.name || 'Restaurant'}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="font-bold text-sm text-slate-900 truncate">{restaurant.name}</p>
              )}
              <a
                href={`/r/${restaurant.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-orange-600 hover:underline mt-0.5"
              >
                View Storefront <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Subscription Badge & Logout */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          {subscription && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <p className="font-semibold text-slate-800">
                {subscription.subscription_plans?.name || 'Free Launch Plan'}
              </p>
              <p className="text-slate-500 mt-0.5">
                {subscription.status === 'trialing'
                  ? `${Math.max(0, trialDaysLeft)} days free remaining`
                  : `Status: ${subscription.status}`}
              </p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Operational Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                restaurant.status === 'active' && !isPaused ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="text-xs font-medium text-slate-700">
              {restaurant.status !== 'active'
                ? `Store Status: ${restaurant.status.replace('_', ' ').toUpperCase()}`
                : isPaused
                ? `Orders Paused until ${new Date(settings!.orders_paused_until!).toLocaleTimeString(
                    'en-IN',
                    { hour: '2-digit', minute: '2-digit' }
                  )}`
                : 'Accepting Online Orders'}
            </span>
          </div>

          {/* 1-Tap Kitchen Busy Mode */}
          <div className="flex items-center gap-2">
            {isPaused ? (
              <button
                onClick={() => pauseOrdersForMinutes(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Resume Orders Now
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 hidden sm:inline">Busy Mode:</span>
                <button
                  onClick={() => pauseOrdersForMinutes(30)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-amber-50 hover:border-amber-300"
                >
                  <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                  Pause 30m
                </button>
                <button
                  onClick={() => pauseOrdersForMinutes(60)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-amber-50 hover:border-amber-300"
                >
                  1h
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pending Approval Notice */}
        {restaurant.status === 'pending_approval' && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-2.5 text-amber-800 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Your restaurant is currently <strong>pending Super Admin approval</strong>. You can
              set up your menu, branding, and QR codes now—your public link will go live as soon
              as it is approved.
            </span>
          </div>
        )}

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
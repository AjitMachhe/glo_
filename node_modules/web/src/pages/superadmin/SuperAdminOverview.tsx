import React, { useEffect, useState } from 'react';
import { Store, Clock, CheckCircle2, ShoppingBag, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '@menuorbit/shared';

interface PlatformStats {
  totalRestaurants: number;
  pendingRestaurants: number;
  activeRestaurants: number;
  totalOrders: number;
  totalGmv: number;
}

export function SuperAdminOverview() {
  const [stats, setStats] = useState<PlatformStats>({
    totalRestaurants: 0,
    pendingRestaurants: 0,
    activeRestaurants: 0,
    totalOrders: 0,
    totalGmv: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [restRes, ordersRes] = await Promise.all([
        supabase.from('restaurants').select('id, status').is('deleted_at', null),
        supabase.from('orders').select('total_amount, status'),
      ]);

      const restaurants = restRes.data || [];
      const orders = ordersRes.data || [];
      const validOrders = orders.filter((o) => !['rejected', 'cancelled'].includes(o.status));

      setStats({
        totalRestaurants: restaurants.length,
        pendingRestaurants: restaurants.filter((r) => r.status === 'pending_approval').length,
        activeRestaurants: restaurants.filter((r) => r.status === 'active').length,
        totalOrders: orders.length,
        totalGmv: validOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  const cards = [
    {
      label: 'Total Restaurants',
      value: stats.totalRestaurants,
      icon: Store,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingRestaurants,
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
      link: '/superadmin/restaurants',
    },
    {
      label: 'Active Restaurants',
      value: stats.activeRestaurants,
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Platform-Wide Orders',
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Total Order Volume (GMV)',
      value: formatCurrency(stats.totalGmv),
      icon: TrendingUp,
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
        <p className="text-sm text-slate-500 mt-1">
          Real-time snapshot of onboarded restaurants, approvals, and platform order volume.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                {card.link && stats.pendingRestaurants > 0 && (
                  <Link
                    to={card.link}
                    className="text-xs font-semibold text-orange-600 hover:underline"
                  >
                    Review →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
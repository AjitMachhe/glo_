import React, { useEffect, useState } from 'react';
import {
  Search,
  CheckCircle,
  Ban,
  CalendarPlus,
  Award,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  Restaurant,
  RestaurantSubscription,
  SubscriptionPlan,
  formatDate,
  getDaysRemaining,
  formatCurrency,
} from '@menuorbit/shared';
import { useAuth } from '../../contexts/AuthContext';

export function RestaurantsManager() {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modal states for Trial Extension & Plan Grandfathering
  const [selectedRest, setSelectedRest] = useState<Restaurant | null>(null);
  const [modalMode, setModalMode] = useState<'extend' | 'plan' | null>(null);
  const [extraDays, setExtraDays] = useState<number>(30);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [lockedPrice, setLockedPrice] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [restRes, plansRes] = await Promise.all([
      supabase
        .from('restaurants')
        .select(
          `*, profiles:owner_id(full_name, email, phone), restaurant_subscriptions(*, subscription_plans(*))`
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase.from('subscription_plans').select('*').eq('is_active', true).order('sort_order'),
    ]);

    if (restRes.data) setRestaurants(restRes.data as Restaurant[]);
    if (plansRes.data) setPlans(plansRes.data as SubscriptionPlan[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSub = (rest: Restaurant): RestaurantSubscription | undefined => {
    if (!rest.restaurant_subscriptions) return undefined;
    return Array.isArray(rest.restaurant_subscriptions)
      ? rest.restaurant_subscriptions[0]
      : rest.restaurant_subscriptions;
  };

  const logAudit = async (restaurantId: string, action: string, metadata: Record<string, unknown>) => {
    await supabase.from('audit_logs').insert({
      actor_id: user?.id,
      restaurant_id: restaurantId,
      action,
      entity_type: 'restaurant',
      entity_id: restaurantId,
      metadata,
    });
  };

  const handleStatusChange = async (rest: Restaurant, newStatus: Restaurant['status']) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'active' && !rest.approved_at) {
      updates.approved_at = new Date().toISOString();
      updates.approved_by = user?.id;
    }

    const { error } = await supabase.from('restaurants').update(updates).eq('id', rest.id);
    if (!error) {
      await logAudit(rest.id, `restaurant_status_${newStatus}`, { previous: rest.status });
      fetchData();
    }
  };

  const openExtendModal = (rest: Restaurant) => {
    const sub = getSub(rest);
    setSelectedRest(rest);
    setExtraDays(90);
    setAdminNotes(sub?.admin_notes || '');
    setModalMode('extend');
  };

  const openPlanModal = (rest: Restaurant) => {
    const sub = getSub(rest);
    setSelectedRest(rest);
    setSelectedPlanId(sub?.plan_id || plans[0]?.id || '');
    setLockedPrice(sub?.locked_price !== null && sub?.locked_price !== undefined ? String(sub.locked_price) : '');
    setAdminNotes(sub?.admin_notes || '');
    setModalMode('plan');
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRest) return;
    const sub = getSub(selectedRest);
    if (!sub) return;

    setSaving(true);
    if (modalMode === 'extend') {
      const currentEnd = new Date(sub.trial_ends_at).getTime();
      const baseTime = Math.max(currentEnd, Date.now());
      const newEndIso = new Date(baseTime + extraDays * 24 * 60 * 60 * 1000).toISOString();

      await supabase
        .from('restaurant_subscriptions')
        .update({
          status: 'trialing',
          trial_ends_at: newEndIso,
          current_period_end: newEndIso,
          admin_notes: adminNotes,
        })
        .eq('id', sub.id);

      await logAudit(selectedRest.id, 'trial_extended', { extra_days: extraDays, new_end: newEndIso });
    } else if (modalMode === 'plan') {
      const parsedLockedPrice = lockedPrice.trim() === '' ? null : Number(lockedPrice);

      await supabase
        .from('restaurant_subscriptions')
        .update({
          plan_id: selectedPlanId,
          locked_price: parsedLockedPrice,
          admin_notes: adminNotes,
        })
        .eq('id', sub.id);

      await logAudit(selectedRest.id, 'subscription_plan_assigned', {
        plan_id: selectedPlanId,
        locked_price: parsedLockedPrice,
      });
    }

    setSaving(false);
    setModalMode(null);
    setSelectedRest(null);
    fetchData();
  };

  const filtered = restaurants.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.city.toLowerCase().includes(search.toLowerCase()) ||
      r.profiles?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Restaurants & Subscriptions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Approve new registrations, extend free access periods, and assign grandfathered pricing.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by restaurant name, city, or owner email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Restaurant</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Subscription & Trial</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading restaurants...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No restaurants match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((rest) => {
                  const sub = getSub(rest);
                  const daysLeft = sub ? getDaysRemaining(sub.trial_ends_at) : 0;
                  return (
                    <tr key={rest.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {rest.name}
                          <a
                            href={`/r/${rest.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-orange-600"
                            title="Open Public Storefront"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <div className="text-xs text-slate-500">
                          {rest.city}, {rest.state} · /{rest.slug}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-slate-800">{rest.profiles?.full_name || '—'}</div>
                        <div className="text-xs text-slate-500">{rest.profiles?.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            rest.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : rest.status === 'pending_approval'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {rest.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {sub ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {sub.subscription_plans?.name || 'Starter'}{' '}
                              {sub.locked_price !== null && (
                                <span className="ml-1 text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                                  Locked: {formatCurrency(sub.locked_price)}/mo
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              {sub.status === 'trialing'
                                ? `${Math.max(0, daysLeft)} days free left (ends ${formatDate(
                                    sub.trial_ends_at
                                  )})`
                                : `Status: ${sub.status}`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No subscription</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {rest.status !== 'active' && (
                            <button
                              onClick={() => handleStatusChange(rest, 'active')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                              title="Approve & Activate"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Approve
                            </button>
                          )}
                          {rest.status === 'active' && (
                            <button
                              onClick={() => handleStatusChange(rest, 'suspended')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100"
                              title="Suspend Restaurant"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Suspend
                            </button>
                          )}
                          <button
                            onClick={() => openExtendModal(rest)}
                            className="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                            title="Extend Free Access"
                          >
                            <CalendarPlus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openPlanModal(rest)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            title="Assign Plan / Grandfather Price"
                          >
                            <Award className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Extend Trial or Grandfather Pricing */}
      {modalMode && selectedRest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveModal}
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900">
              {modalMode === 'extend'
                ? `Extend Free Access — ${selectedRest.name}`
                : `Assign Plan & Pricing — ${selectedRest.name}`}
            </h3>

            {modalMode === 'extend' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Additional Free Days
                </label>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  required
                  value={extraDays}
                  onChange={(e) => setExtraDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Adds {extraDays} days onto the current trial end date (or from today if expired).
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Subscription Plan
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatCurrency(p.price_monthly)}/mo)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Grandfathered Monthly Price (INR) — Optional
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    placeholder="Leave empty to use standard plan price"
                    value={lockedPrice}
                    onChange={(e) => setLockedPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Locks a special promotional rate (e.g., ₹199) regardless of future price hikes.
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin Notes</label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Reason for extension or custom rate..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
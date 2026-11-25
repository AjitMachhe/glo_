import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SubscriptionPlan, formatCurrency } from '@menuorbit/shared';

const emptyPlan = {
  name: '',
  code: '',
  description: '',
  price_monthly: 299,
  price_annual: 2990,
  max_orders_per_month: '' as string | number,
  max_storage_mb: 1024,
  max_staff_accounts: 5,
  is_active: true,
  is_public: true,
  sort_order: 1,
};

export function PlansManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyPlan);
  const [saving, setSaving] = useState(false);

  const loadPlans = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true });
    if (data) setPlans(data as SubscriptionPlan[]);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      code: plan.code,
      description: plan.description || '',
      price_monthly: plan.price_monthly,
      price_annual: plan.price_annual,
      max_orders_per_month: plan.max_orders_per_month ?? '',
      max_storage_mb: plan.max_storage_mb,
      max_staff_accounts: plan.max_staff_accounts,
      is_active: plan.is_active,
      is_public: plan.is_public,
      sort_order: plan.sort_order,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      code: form.code.toLowerCase().replace(/\s+/g, '_'),
      description: form.description,
      price_monthly: Number(form.price_monthly),
      price_annual: Number(form.price_annual),
      max_orders_per_month:
        form.max_orders_per_month === '' ? null : Number(form.max_orders_per_month),
      max_storage_mb: Number(form.max_storage_mb),
      max_staff_accounts: Number(form.max_staff_accounts),
      is_active: form.is_active,
      is_public: form.is_public,
      sort_order: Number(form.sort_order),
    };

    if (editingId) {
      await supabase.from('subscription_plans').update(payload).eq('id', editingId);
    } else {
      await supabase.from('subscription_plans').insert(payload);
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyPlan);
    loadPlans();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscription Plans & Pricing</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure monthly/annual INR tiers, limits, and private grandfathered plans.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm(emptyPlan);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" />
          New Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <span className="text-xs font-mono text-slate-400">{plan.code}</span>
                </div>
                <button
                  onClick={() => handleEdit(plan)}
                  className="p-1.5 text-slate-500 hover:text-orange-600 rounded-lg hover:bg-orange-50"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900">
                  {formatCurrency(plan.price_monthly)}
                </span>
                <span className="text-sm text-slate-500"> / month</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  or {formatCurrency(plan.price_annual)} / year
                </p>
              </div>

              <p className="text-sm text-slate-600 mt-3">{plan.description}</p>

              <ul className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                <li>
                  • Orders/Month:{' '}
                  <strong>{plan.max_orders_per_month ?? 'Unlimited'}</strong>
                </li>
                <li>
                  • Staff Accounts: <strong>{plan.max_staff_accounts}</strong>
                </li>
                <li>
                  • Storage Limit: <strong>{plan.max_storage_mb} MB</strong>
                </li>
              </ul>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                  plan.is_active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {plan.is_active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {plan.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {plan.is_public ? 'Public' : 'Private / Grandfathered'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Plan Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Unique Code</label>
                <input
                  required
                  disabled={Boolean(editingId)}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Monthly Price (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.price_monthly}
                  onChange={(e) => setForm({ ...form, price_monthly: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Annual Price (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.price_annual}
                  onChange={(e) => setForm({ ...form, price_annual: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Max Orders/Mo
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={form.max_orders_per_month}
                  onChange={(e) => setForm({ ...form, max_orders_per_month: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Max Staff
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.max_staff_accounts}
                  onChange={(e) => setForm({ ...form, max_staff_accounts: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Storage (MB)
                </label>
                <input
                  type="number"
                  min={100}
                  required
                  value={form.max_storage_mb}
                  onChange={(e) => setForm({ ...form, max_storage_mb: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_public}
                  onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                />
                Publicly Visible (uncheck for grandfathered tiers)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
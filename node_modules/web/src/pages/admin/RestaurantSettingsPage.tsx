import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { RestaurantHour, RestaurantSettings } from '@menuorbit/shared';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function RestaurantSettingsPage() {
  const { restaurant, settings, refreshTenant } = useTenant();
  const [form, setForm] = useState<RestaurantSettings | null>(null);
  const [hours, setHours] = useState<RestaurantHour[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  useEffect(() => {
    if (!restaurant) return;
    supabase
      .from('restaurant_hours')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('day_of_week')
      .then(({ data }) => {
        if (data) setHours(data as RestaurantHour[]);
      });
  }, [restaurant?.id]);

  if (!restaurant || !form) return null;

  const updateHour = (dayOfWeek: number, patch: Partial<RestaurantHour>) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayOfWeek ? { ...h, ...patch } : h))
    );
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');

    await supabase
      .from('restaurant_settings')
      .update({
        accepts_delivery: form.accepts_delivery,
        accepts_pickup: form.accepts_pickup,
        accepts_dine_in: form.accepts_dine_in,
        delivery_fee: Number(form.delivery_fee),
        free_delivery_above:
          form.free_delivery_above === null || String(form.free_delivery_above) === ''
            ? null
            : Number(form.free_delivery_above),
        packaging_fee: Number(form.packaging_fee),
        min_order_amount: Number(form.min_order_amount),
        avg_prep_time_mins: Number(form.avg_prep_time_mins),
        is_gst_registered: form.is_gst_registered,
        gstin: form.gstin,
        fssai_number: form.fssai_number,
        tax_percentage: Number(form.tax_percentage),
        payment_methods: form.payment_methods,
      })
      .eq('restaurant_id', restaurant.id);

    for (const h of hours) {
      await supabase
        .from('restaurant_hours')
        .update({
          open_time: h.open_time,
          close_time: h.close_time,
          is_closed: h.is_closed,
        })
        .eq('id', h.id);
    }

    await refreshTenant();
    setSaving(false);
    setSavedMsg('Operations, tax settings, and weekly hours saved!');
  };

  return (
    <form onSubmit={handleSaveAll} className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Operations, Tax & Operating Hours</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure order modes, delivery charges, GST/FSSAI compliance, and weekly timings.
        </p>
      </div>

      {/* Order Types & Fees */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <h2 className="font-bold text-slate-900">Order Channels & Delivery Fees</h2>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.accepts_delivery}
              onChange={(e) => setForm({ ...form, accepts_delivery: e.target.checked })}
            />
            Home Delivery
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.accepts_pickup}
              onChange={(e) => setForm({ ...form, accepts_pickup: e.target.checked })}
            />
            Self Pickup / Takeaway
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.accepts_dine_in}
              onChange={(e) => setForm({ ...form, accepts_dine_in: e.target.checked })}
            />
            QR Table Dine-In
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Min Order Amount (₹)
            </label>
            <input
              type="number"
              min={0}
              value={form.min_order_amount}
              onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Delivery Fee (₹)
            </label>
            <input
              type="number"
              min={0}
              value={form.delivery_fee}
              onChange={(e) => setForm({ ...form, delivery_fee: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Free Delivery Above (₹)
            </label>
            <input
              type="number"
              min={0}
              placeholder="Optional"
              value={form.free_delivery_above ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  free_delivery_above: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Packaging Fee (₹)
            </label>
            <input
              type="number"
              min={0}
              value={form.packaging_fee}
              onChange={(e) => setForm({ ...form, packaging_fee: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* FSSAI, GST & Payment Methods */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <h2 className="font-bold text-slate-900">FSSAI, GST & Payment Methods</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              FSSAI License Number
            </label>
            <input
              maxLength={14}
              placeholder="14-digit FSSAI No."
              value={form.fssai_number || ''}
              onChange={(e) => setForm({ ...form, fssai_number: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              GST Number (GSTIN)
            </label>
            <input
              maxLength={15}
              placeholder="e.g., 27AAAAA0000A1Z5"
              value={form.gstin || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  gstin: e.target.value,
                  is_gst_registered: e.target.value.trim().length > 0,
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              GST / Tax Percentage (%)
            </label>
            <input
              type="number"
              min={0}
              max={28}
              step="0.5"
              value={form.tax_percentage}
              onChange={(e) => setForm({ ...form, tax_percentage: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="pt-2">
          <p className="text-xs font-medium text-slate-700 mb-2">Accepted Payment Methods</p>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.payment_methods.cod}
                onChange={(e) =>
                  setForm({
                    ...form,
                    payment_methods: { ...form.payment_methods, cod: e.target.checked },
                  })
                }
              />
              Cash on Delivery (COD)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.payment_methods.pay_at_restaurant}
                onChange={(e) =>
                  setForm({
                    ...form,
                    payment_methods: {
                      ...form.payment_methods,
                      pay_at_restaurant: e.target.checked,
                    },
                  })
                }
              />
              Pay at Counter / Table
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.payment_methods.upi}
                onChange={(e) =>
                  setForm({
                    ...form,
                    payment_methods: { ...form.payment_methods, upi: e.target.checked },
                  })
                }
              />
              UPI / QR at Delivery
            </label>
          </div>
        </div>
      </div>

      {/* Weekly Operating Hours */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
        <h2 className="font-bold text-slate-900">Weekly Operating Hours</h2>
        <div className="divide-y divide-slate-100">
          {hours.map((h) => (
            <div key={h.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
              <span className="w-28 text-sm font-medium text-slate-800">
                {DAY_NAMES[h.day_of_week]}
              </span>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={h.is_closed}
                  onChange={(e) => updateHour(h.day_of_week, { is_closed: e.target.checked })}
                />
                Closed
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  disabled={h.is_closed}
                  value={h.open_time.slice(0, 5)}
                  onChange={(e) => updateHour(h.day_of_week, { open_time: e.target.value })}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="time"
                  disabled={h.is_closed}
                  value={h.close_time.slice(0, 5)}
                  onChange={(e) => updateHour(h.day_of_week, { close_time: e.target.value })}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {savedMsg && <p className="text-sm font-medium text-emerald-600">{savedMsg}</p>}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Saving...' : 'Save All Settings'}
      </button>
    </form>
  );
}
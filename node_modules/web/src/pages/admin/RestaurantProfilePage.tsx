import React, { useState } from 'react';
import { Upload, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { slugify } from '@menuorbit/shared';

export function RestaurantProfilePage() {
  const { restaurant, refreshTenant } = useTenant();
  const [form, setForm] = useState({
    name: restaurant?.name || '',
    slug: restaurant?.slug || '',
    description: restaurant?.description || '',
    cuisine_types: (restaurant?.cuisine_types || []).join(', '),
    phone: restaurant?.phone || '',
    whatsapp_phone: restaurant?.whatsapp_phone || '',
    email: restaurant?.email || '',
    address: restaurant?.address || '',
    city: restaurant?.city || '',
    state: restaurant?.state || '',
    pincode: restaurant?.pincode || '',
  });
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!restaurant) return null;

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logo' | 'cover'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(field);
    setMessage(null);

    const ext = file.name.split('.').pop();
    const filePath = `${restaurant.id}/${field}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('restaurant-assets')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setMessage({ type: 'err', text: uploadError.message });
      setUploading(null);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('restaurant-assets').getPublicUrl(filePath);

    const column = field === 'logo' ? 'logo_url' : 'cover_url';
    await supabase
      .from('restaurants')
      .update({ [column]: publicUrl })
      .eq('id', restaurant.id);

    await refreshTenant();
    setUploading(null);
    setMessage({ type: 'ok', text: `${field === 'logo' ? 'Logo' : 'Cover banner'} updated!` });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const cuisinesArray = form.cuisine_types
      .split(',')
      .map((c: string) => c.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from('restaurants')
      .update({
        name: form.name,
        slug: slugify(form.slug),
        description: form.description,
        cuisine_types: cuisinesArray,
        phone: form.phone,
        whatsapp_phone: form.whatsapp_phone,
        email: form.email,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
      })
      .eq('id', restaurant.id);

    setSaving(false);
    if (error) {
      setMessage({ type: 'err', text: error.message });
    } else {
      await refreshTenant();
      setMessage({ type: 'ok', text: 'Restaurant profile saved successfully.' });
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Restaurant Profile & Branding</h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize how your restaurant appears on your public ordering page and QR menus.
        </p>
      </div>

      {/* Branding Upload Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center gap-4">
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt="Logo"
              className="h-16 w-16 rounded-xl object-cover border border-slate-200"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl">
              {restaurant.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900">Restaurant Logo</p>
            <p className="text-xs text-slate-500 mb-2">Square PNG/JPG, min 256×256px</p>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              {uploading === 'logo' ? 'Uploading...' : 'Upload Logo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading !== null}
                onChange={(e) => handleImageUpload(e, 'logo')}
              />
            </label>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center gap-4">
          {restaurant.cover_url ? (
            <img
              src={restaurant.cover_url}
              alt="Cover"
              className="h-16 w-24 rounded-xl object-cover border border-slate-200"
            />
          ) : (
            <div className="h-16 w-24 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
              No Cover
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900">Storefront Cover</p>
            <p className="text-xs text-slate-500 mb-2">Wide banner 1200×400px</p>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              {uploading === 'cover' ? 'Uploading...' : 'Upload Cover'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading !== null}
                onChange={(e) => handleImageUpload(e, 'cover')}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Details Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Restaurant Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Storefront URL Slug
            </label>
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden text-sm">
              <span className="px-2.5 py-2 bg-slate-50 text-slate-400 border-r border-slate-300">
                /r/
              </span>
              <input
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full px-3 py-2 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tagline / Bio</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Authentic Kolhapuri & North Indian cuisine made fresh to order."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cuisines (comma-separated)
          </label>
          <input
            value={form.cuisine_types}
            onChange={(e) => setForm({ ...form, cuisine_types: e.target.value })}
            placeholder="North Indian, Chinese, Fast Food, Biryani"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              WhatsApp Number
            </label>
            <input
              value={form.whatsapp_phone}
              onChange={(e) => setForm({ ...form, whatsapp_phone: e.target.value })}
              placeholder="With country code e.g. 9198..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Public Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Address</label>
          <input
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
            <input
              required
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
            <input
              required
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PIN Code</label>
            <input
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {message && (
          <p
            className={`text-sm font-medium ${
              message.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
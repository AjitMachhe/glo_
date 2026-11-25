import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { slugify } from '@menuorbit/shared';
import { useAuth } from '../../contexts/AuthContext';

export function RegisterRestaurantPage() {
  const navigate = useNavigate();
  const { refreshUserData } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    restaurantName: '',
    phone: '',
    address: '',
    city: 'Kolhapur',
    state: 'Maharashtra',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 1. Sign up owner account
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          phone: form.phone,
        },
      },
    });

    if (signUpError || !authData.user) {
      setError(signUpError?.message || 'Registration failed');
      setLoading(false);
      return;
    }

    // 2. Check platform approval policy
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('require_restaurant_approval')
      .eq('id', 1)
      .single();

    const initialStatus = settings?.require_restaurant_approval ? 'pending_approval' : 'active';
    const uniqueSlug = `${slugify(form.restaurantName)}-${Math.floor(100 + Math.random() * 900)}`;

    // 3. Create restaurant (DB trigger auto-provisions membership, settings, hours & 12-mo trial)
    const { error: restError } = await supabase.from('restaurants').insert({
      owner_id: authData.user.id,
      name: form.restaurantName,
      slug: uniqueSlug,
      phone: form.phone,
      whatsapp_phone: form.phone,
      email: form.email,
      address: form.address,
      city: form.city,
      state: form.state,
      status: initialStatus,
    });

    if (restError) {
      setError(restError.message);
      setLoading(false);
      return;
    }

    await refreshUserData();
    setLoading(false);
    navigate('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold">
            Zero Commission · 12 Months Free
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-3">Register Your Restaurant</h1>
          <p className="text-sm text-slate-500 mt-1">
            Get your branded online ordering page, table QR codes, and live order dashboard.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Owner Full Name</label>
              <input
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mobile / WhatsApp</label>
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Restaurant Name</label>
            <input
              required
              value={form.restaurantName}
              onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
              <input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
              <input
                required
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Street Address</label>
            <input
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Login Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                minLength={6}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-orange-600 text-white font-semibold rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Creating Restaurant...' : 'Create Restaurant Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="text-orange-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
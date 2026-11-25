import React, { useEffect, useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { RestaurantMember, StaffRole } from '@menuorbit/shared';

export function StaffManagerPage() {
  const { restaurant, membership } = useTenant();
  const [members, setMembers] = useState<RestaurantMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('kitchen_staff');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const loadMembers = async () => {
    if (!restaurant) return;
    const { data } = await supabase
      .from('restaurant_members')
      .select('*, profiles:user_id(full_name, email, phone)')
      .eq('restaurant_id', restaurant.id)
      .order('created_at');
    if (data) setMembers(data as RestaurantMember[]);
  };

  useEffect(() => {
    loadMembers();
  }, [restaurant?.id]);

  if (!restaurant) return null;

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAdding(true);

    // Look up registered profile by email
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (!targetProfile) {
      setError('No registered account found with that email. Ask the staff member to sign up first.');
      setAdding(false);
      return;
    }

    const defaultPermissions =
      role === 'manager'
        ? {
            can_manage_orders: true,
            can_edit_menu: true,
            can_manage_tables: true,
            can_view_reports: true,
            can_edit_settings: false,
          }
        : {
            can_manage_orders: true,
            can_edit_menu: false,
            can_manage_tables: false,
            can_view_reports: false,
            can_edit_settings: false,
          };

    const { error: insertErr } = await supabase.from('restaurant_members').insert({
      restaurant_id: restaurant.id,
      user_id: targetProfile.id,
      role,
      permissions: defaultPermissions,
    });

    setAdding(false);
    if (insertErr) {
      setError(insertErr.message);
    } else {
      setEmail('');
      loadMembers();
    }
  };

  const handleRemove = async (memberId: string) => {
    await supabase.from('restaurant_members').delete().eq('id', memberId);
    loadMembers();
  };

  const canManageTeam = membership?.role === 'owner' || membership?.role === 'manager';

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Staff & Access Roles</h1>
        <p className="text-sm text-slate-500 mt-1">
          Assign managers and kitchen staff to receive and prepare live orders.
        </p>
      </div>

      {canManageTeam && (
        <form
          onSubmit={handleAddStaff}
          className="bg-white p-5 rounded-xl border border-slate-200 space-y-3"
        >
          <p className="text-sm font-semibold text-slate-800">Add Team Member</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="Staff member's registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="kitchen_staff">Kitchen Staff (Orders Only)</option>
              <option value="manager">Manager (Orders, Menu & Reports)</option>
            </select>
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700"
            >
              <UserPlus className="h-4 w-4" />
              {adding ? 'Adding...' : 'Add Staff'}
            </button>
          </div>
          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Team Member</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {m.profiles?.full_name || 'Staff Member'}
                  </div>
                  <div className="text-xs text-slate-500">{m.profiles?.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                    {m.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {m.role !== 'owner' && canManageTeam && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Remove Staff"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
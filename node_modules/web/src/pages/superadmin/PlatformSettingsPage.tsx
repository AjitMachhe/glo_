import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PlatformSettings } from '@menuorbit/shared';

export function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as PlatformSettings);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSavedMsg('');

    const { error } = await supabase
      .from('platform_settings')
      .update({
        platform_name: settings.platform_name,
        default_free_trial_days: Number(settings.default_free_trial_days),
        require_restaurant_approval: settings.require_restaurant_approval,
        support_email: settings.support_email,
        support_phone: settings.support_phone,
        announcement_banner: settings.announcement_banner,
      })
      .eq('id', 1);

    setSaving(false);
    if (!error) {
      setSavedMsg('Platform settings updated successfully.');
    }
  };

  if (!settings) return <div className="text-sm text-slate-500">Loading settings...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Global Platform Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure default free trial duration, approval requirements, and global announcements.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Platform Name</label>
          <input
            required
            value={settings.platform_name}
            onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Default Free Access Period (Days)
          </label>
          <input
            type="number"
            min={0}
            required
            value={settings.default_free_trial_days}
            onChange={(e) =>
              setSettings({ ...settings, default_free_trial_days: Number(e.target.value) })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            Every newly registered restaurant automatically receives this many free days (default:
            365).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Support Email</label>
            <input
              type="email"
              value={settings.support_email || ''}
              onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Support Phone</label>
            <input
              value={settings.support_phone || ''}
              onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Dashboard Announcement Banner (Optional)
          </label>
          <input
            placeholder="e.g., Welcome to our 12-month zero-commission launch program!"
            value={settings.announcement_banner || ''}
            onChange={(e) => setSettings({ ...settings, announcement_banner: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <label className="flex items-center gap-2.5 text-sm text-slate-700 pt-1">
          <input
            type="checkbox"
            checked={settings.require_restaurant_approval}
            onChange={(e) =>
              setSettings({ ...settings, require_restaurant_approval: e.target.checked })
            }
          />
          Require Super Admin approval before new restaurants go live
        </label>

        {savedMsg && <p className="text-sm text-emerald-600 font-medium">{savedMsg}</p>}

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
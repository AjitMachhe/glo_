import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  DietaryType,
  MenuAddonGroup,
  MenuItem,
  MenuItemVariant,
  formatCurrency,
} from '@menuorbit/shared';

interface ItemCustomizationModalProps {
  item: MenuItem;
  restaurantId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function ItemCustomizationModal({
  item,
  restaurantId,
  onClose,
  onUpdated,
}: ItemCustomizationModalProps) {
  const [variants, setVariants] = useState<MenuItemVariant[]>([]);
  const [addonGroups, setAddonGroups] = useState<MenuAddonGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // New Variant form
  const [variantName, setVariantName] = useState('');
  const [variantPrice, setVariantPrice] = useState('');

  // New Addon Group form
  const [groupName, setGroupName] = useState('');
  const [minSel, setMinSel] = useState(0);
  const [maxSel, setMaxSel] = useState(1);

  // New Addon Option per group
  const [addonInputs, setAddonInputs] = useState<
    Record<string, { name: string; price: string; dietary_type: DietaryType }>
  >({});

  const loadCustomizations = async () => {
    setLoading(true);
    const [varRes, grpRes] = await Promise.all([
      supabase
        .from('menu_item_variants')
        .select('*')
        .eq('item_id', item.id)
        .order('sort_order'),
      supabase
        .from('menu_addon_groups')
        .select('*, menu_item_addons(*)')
        .eq('item_id', item.id)
        .order('sort_order'),
    ]);

    if (varRes.data) setVariants(varRes.data as MenuItemVariant[]);
    if (grpRes.data) setAddonGroups(grpRes.data as MenuAddonGroup[]);
    setLoading(false);
  };

  useEffect(() => {
    loadCustomizations();
  }, [item.id]);

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantName.trim() || variantPrice === '') return;

    await supabase.from('menu_item_variants').insert({
      restaurant_id: restaurantId,
      item_id: item.id,
      name: variantName.trim(),
      price: Number(variantPrice),
      is_default: variants.length === 0,
      sort_order: variants.length,
    });

    setVariantName('');
    setVariantPrice('');
    await loadCustomizations();
    onUpdated();
  };

  const handleDeleteVariant = async (variantId: string) => {
    await supabase.from('menu_item_variants').delete().eq('id', variantId);
    await loadCustomizations();
    onUpdated();
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    await supabase.from('menu_addon_groups').insert({
      restaurant_id: restaurantId,
      item_id: item.id,
      name: groupName.trim(),
      min_selections: Number(minSel),
      max_selections: Math.max(Number(minSel), Number(maxSel)),
      is_required: Number(minSel) > 0,
      sort_order: addonGroups.length,
    });

    setGroupName('');
    setMinSel(0);
    setMaxSel(1);
    await loadCustomizations();
    onUpdated();
  };

  const handleDeleteGroup = async (groupId: string) => {
    await supabase.from('menu_addon_groups').delete().eq('id', groupId);
    await loadCustomizations();
    onUpdated();
  };

  const handleAddAddonOption = async (groupId: string) => {
    const draft = addonInputs[groupId];
    if (!draft || !draft.name.trim()) return;

    await supabase.from('menu_item_addons').insert({
      restaurant_id: restaurantId,
      addon_group_id: groupId,
      name: draft.name.trim(),
      price: Number(draft.price || 0),
      dietary_type: draft.dietary_type || 'veg',
    });

    setAddonInputs((prev) => ({
      ...prev,
      [groupId]: { name: '', price: '', dietary_type: 'veg' },
    }));
    await loadCustomizations();
    onUpdated();
  };

  const handleDeleteAddonOption = async (addonId: string) => {
    await supabase.from('menu_item_addons').delete().eq('id', addonId);
    await loadCustomizations();
    onUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Sizes & Add-ons — {item.name}</h3>
            <p className="text-xs text-slate-500">
              Base Price: {formatCurrency(item.base_price)} (overridden if sizes/variants are added)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading options...</p>
          ) : (
            <>
              {/* Section 1: Sizes / Variants */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">
                  1. Portion Sizes / Variants (Optional)
                </h4>
                <p className="text-xs text-slate-500">
                  Example: Half (₹140), Full (₹240) or Regular, Medium, Large.
                </p>

                {variants.length > 0 && (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                    {variants.map((v) => (
                      <div key={v.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">{v.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(v.price)}
                          </span>
                          <button
                            onClick={() => handleDeleteVariant(v.id)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAddVariant} className="flex gap-2">
                  <input
                    placeholder="Size name (e.g., Half)"
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Price (₹)"
                    value={variantPrice}
                    onChange={(e) => setVariantPrice(e.target.value)}
                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-3.5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Size
                  </button>
                </form>
              </div>

              {/* Section 2: Add-on Groups */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    2. Add-on & Customization Groups (Optional)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Example: &ldquo;Extra Toppings&rdquo; (Min 0, Max 3) or &ldquo;Choice of Bread&rdquo; (Min 1, Max 1).
                  </p>
                </div>

                {/* Create Group Form */}
                <form
                  onSubmit={handleAddGroup}
                  className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-end gap-2.5"
                >
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Group Name
                    </label>
                    <input
                      placeholder="e.g., Extra Cheese & Toppings"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Min</label>
                    <input
                      type="number"
                      min={0}
                      value={minSel}
                      onChange={(e) => setMinSel(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Max</label>
                    <input
                      type="number"
                      min={1}
                      value={maxSel}
                      onChange={(e) => setMaxSel(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-3.5 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Group
                  </button>
                </form>

                {/* Render Existing Addon Groups */}
                {addonGroups.map((group) => {
                  const draft = addonInputs[group.id] || {
                    name: '',
                    price: '',
                    dietary_type: 'veg' as DietaryType,
                  };
                  return (
                    <div
                      key={group.id}
                      className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm text-slate-900">{group.name}</span>
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {group.min_selections > 0
                              ? `Required (Min ${group.min_selections}, Max ${group.max_selections})`
                              : `Optional (Up to ${group.max_selections})`}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="text-slate-400 hover:text-rose-600"
                          title="Delete Group"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Options list */}
                      <div className="space-y-1.5">
                        {(group.menu_item_addons || []).map((addon) => (
                          <div
                            key={addon.id}
                            className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg"
                          >
                            <span className="font-medium text-slate-800">{addon.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-600">
                                {addon.price > 0 ? `+${formatCurrency(addon.price)}` : 'Free'}
                              </span>
                              <button
                                onClick={() => handleDeleteAddonOption(addon.id)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Option Row */}
                      <div className="flex gap-2 pt-1">
                        <input
                          placeholder="Option name (e.g., Extra Mozzarella)"
                          value={draft.name}
                          onChange={(e) =>
                            setAddonInputs((prev) => ({
                              ...prev,
                              [group.id]: { ...draft, name: e.target.value },
                            }))
                          }
                          className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                        />
                        <input
                          type="number"
                          min={0}
                          placeholder="+ Price (₹)"
                          value={draft.price}
                          onChange={(e) =>
                            setAddonInputs((prev) => ({
                              ...prev,
                              [group.id]: { ...draft, price: e.target.value },
                            }))
                          }
                          className="w-24 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddAddonOption(group.id)}
                          className="px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
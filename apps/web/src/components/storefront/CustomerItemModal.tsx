import React, { useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import {
  CartItem,
  CartItemAddon,
  MenuItem,
  MenuItemVariant,
  formatCurrency,
} from '@menuorbit/shared';
import { DietaryBadge } from '../shared/DietaryBadge';

interface CustomerItemModalProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
}

export function CustomerItemModal({ item, onClose, onAddToCart }: CustomerItemModalProps) {
  const variants = (item.menu_item_variants || []).filter((v) => v.is_available);
  const addonGroups = item.menu_addon_groups || [];

  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(
    variants.find((v) => v.is_default) || variants[0] || null
  );
  const [selectedAddonsByGroup, setSelectedAddonsByGroup] = useState<
    Record<string, CartItemAddon[]>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  const baseUnitPrice = selectedVariant
    ? Number(selectedVariant.price)
    : Number(item.discounted_price ?? item.base_price);

  const flatAddons: CartItemAddon[] = Object.values(selectedAddonsByGroup).flat();
  const addonsTotal = flatAddons.reduce((sum, a) => sum + Number(a.price), 0);
  const lineTotal = (baseUnitPrice + addonsTotal) * quantity;

  const toggleAddon = (
    groupId: string,
    maxSelections: number,
    addon: { id: string; name: string; price: number }
  ) => {
    setValidationError('');
    setSelectedAddonsByGroup((prev) => {
      const current = prev[groupId] || [];
      const exists = current.some((a) => a.id === addon.id);

      if (exists) {
        return { ...prev, [groupId]: current.filter((a) => a.id !== addon.id) };
      }

      if (maxSelections === 1) {
        return { ...prev, [groupId]: [{ id: addon.id, name: addon.name, price: addon.price }] };
      }

      if (current.length >= maxSelections) {
        return prev;
      }

      return {
        ...prev,
        [groupId]: [...current, { id: addon.id, name: addon.name, price: addon.price }],
      };
    });
  };

  const handleConfirm = () => {
    for (const group of addonGroups) {
      const count = (selectedAddonsByGroup[group.id] || []).length;
      if (count < group.min_selections) {
        setValidationError(
          `Please select at least ${group.min_selections} option(s) for "${group.name}".`
        );
        return;
      }
    }

    const sortedAddonIds = flatAddons
      .map((a) => a.id)
      .sort()
      .join(',');
    const cartKey = `${item.id}::${selectedVariant?.id || 'base'}::${sortedAddonIds}::${notes.trim()}`;

    onAddToCart({
      cartKey,
      menu_item_id: item.id,
      name: item.name,
      dietary_type: item.dietary_type,
      variant_id: selectedVariant?.id || null,
      variant_name: selectedVariant?.name || null,
      unit_price: baseUnitPrice,
      addons: flatAddons,
      quantity,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-1">
              <DietaryBadge type={item.dietary_type} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
              {item.description && (
                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Options */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Portion Sizes / Variants */}
          {variants.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">Choose Size / Portion</h4>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-orange-50 text-orange-700">
                  Required
                </span>
              </div>
              <div className="space-y-2">
                {variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <label
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-orange-600 bg-orange-50/40'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => setSelectedVariant(v)}
                          className="accent-orange-600"
                        />
                        <span className="text-sm font-medium text-slate-800">{v.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(v.price)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-on Groups */}
          {addonGroups.map((group) => {
            const availableAddons = (group.menu_item_addons || []).filter((a) => a.is_available);
            if (availableAddons.length === 0) return null;
            const currentSelected = selectedAddonsByGroup[group.id] || [];

            return (
              <div key={group.id} className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{group.name}</h4>
                    <p className="text-xs text-slate-500">
                      {group.min_selections > 0
                        ? `Select ${group.min_selections} to ${group.max_selections}`
                        : `Optional · Up to ${group.max_selections}`}
                    </p>
                  </div>
                  {group.min_selections > 0 && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-orange-50 text-orange-700">
                      Required
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {availableAddons.map((addon) => {
                    const isChecked = currentSelected.some((a) => a.id === addon.id);
                    return (
                      <label
                        key={addon.id}
                        onClick={() => toggleAddon(group.id, group.max_selections, addon)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                          isChecked
                            ? 'border-orange-600 bg-orange-50/40'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type={group.max_selections === 1 ? 'radio' : 'checkbox'}
                            checked={isChecked}
                            onChange={() => {}}
                            className="accent-orange-600"
                          />
                          <DietaryBadge type={addon.dietary_type} />
                          <span className="text-sm text-slate-800">{addon.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {addon.price > 0 ? `+${formatCurrency(addon.price)}` : 'Free'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Kitchen Instructions */}
          <div className="pt-3 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Special Cooking Instructions (Optional)
            </label>
            <input
              placeholder="e.g., Less spicy, no onions, extra chutney..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
            />
          </div>

          {validationError && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg">
              {validationError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div className="inline-flex items-center border border-slate-300 bg-white rounded-xl">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="p-2.5 text-slate-600 hover:text-slate-900"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm font-bold text-slate-900">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="p-2.5 text-slate-600 hover:text-slate-900"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition-colors"
          >
            Add Item · {formatCurrency(lineTotal)}
          </button>
        </div>
      </div>
    </div>
  );
}
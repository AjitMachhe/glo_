import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Star,
  Sliders,
  Upload,
  CheckSquare,
  Square,
  UtensilsCrossed,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import {
  DietaryType,
  MenuCategory,
  MenuItem,
  formatCurrency,
} from '@menuorbit/shared';
import { DietaryBadge } from '../../components/shared/DietaryBadge';
import { ItemCustomizationModal } from '../../components/admin/ItemCustomizationModal';

const emptyItemForm = {
  category_id: '',
  name: '',
  description: '',
  base_price: '',
  discounted_price: '',
  dietary_type: 'veg' as DietaryType,
  image_url: '',
  is_available: true,
  is_featured: false,
};

export function MenuBuilderPage() {
  const { restaurant } = useTenant();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Category Modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<MenuCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Item Modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  // Variants & Add-ons Modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadMenuData = async () => {
    if (!restaurant) return;
    setLoading(true);
    const [catRes, itemRes] = await Promise.all([
      supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true }),
      supabase
        .from('menu_items')
        .select('*, menu_item_variants(*), menu_addon_groups(*, menu_item_addons(*))')
        .eq('restaurant_id', restaurant.id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true }),
    ]);

    if (catRes.data) setCategories(catRes.data as MenuCategory[]);
    if (itemRes.data) setItems(itemRes.data as MenuItem[]);
    setLoading(false);
  };

  useEffect(() => {
    loadMenuData();
  }, [restaurant?.id]);

  if (!restaurant) return null;

  // ---------------- Category Handlers ----------------
  const openNewCategory = () => {
    setEditingCat(null);
    setCatName('');
    setCatDesc('');
    setShowCatModal(true);
  };

  const openEditCategory = (cat: MenuCategory) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatDesc(cat.description || '');
    setShowCatModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCat) {
      await supabase
        .from('menu_categories')
        .update({ name: catName.trim(), description: catDesc.trim() || null })
        .eq('id', editingCat.id);
    } else {
      await supabase.from('menu_categories').insert({
        restaurant_id: restaurant.id,
        name: catName.trim(),
        description: catDesc.trim() || null,
        sort_order: categories.length,
      });
    }

    setShowCatModal(false);
    loadMenuData();
  };

  const handleDeleteCategory = async (catId: string) => {
    await supabase
      .from('menu_categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', catId);
    if (selectedCategoryId === catId) setSelectedCategoryId('all');
    loadMenuData();
  };

  // ---------------- Item Handlers ----------------
  const openNewItem = () => {
    const defaultCat =
      selectedCategoryId !== 'all' ? selectedCategoryId : categories[0]?.id || '';
    setEditingItem(null);
    setItemForm({ ...emptyItemForm, category_id: defaultCat });
    setShowItemModal(true);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      category_id: item.category_id,
      name: item.name,
      description: item.description || '',
      base_price: String(item.base_price),
      discounted_price: item.discounted_price !== null ? String(item.discounted_price) : '',
      dietary_type: item.dietary_type,
      image_url: item.image_url || '',
      is_available: item.is_available,
      is_featured: item.is_featured,
    });
    setShowItemModal(true);
  };

  const handleFoodImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImg(true);
    const ext = file.name.split('.').pop();
    const filePath = `${restaurant.id}/menu/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('restaurant-assets')
      .upload(filePath, file, { upsert: true });

    if (!error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from('restaurant-assets').getPublicUrl(filePath);
      setItemForm((prev) => ({ ...prev, image_url: publicUrl }));
    }
    setUploadingImg(false);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.category_id || !itemForm.name.trim()) return;
    setSavingItem(true);

    const payload = {
      restaurant_id: restaurant.id,
      category_id: itemForm.category_id,
      name: itemForm.name.trim(),
      description: itemForm.description.trim() || null,
      base_price: Number(itemForm.base_price),
      discounted_price:
        itemForm.discounted_price.trim() === '' ? null : Number(itemForm.discounted_price),
      dietary_type: itemForm.dietary_type,
      image_url: itemForm.image_url || null,
      is_available: itemForm.is_available,
      is_featured: itemForm.is_featured,
    };

    if (editingItem) {
      await supabase.from('menu_items').update(payload).eq('id', editingItem.id);
    } else {
      await supabase.from('menu_items').insert({ ...payload, sort_order: items.length });
    }

    setSavingItem(false);
    setShowItemModal(false);
    loadMenuData();
  };

  const toggleItemAvailability = async (item: MenuItem) => {
    await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i))
    );
  };

  const toggleItemFeatured = async (item: MenuItem) => {
    await supabase
      .from('menu_items')
      .update({ is_featured: !item.is_featured })
      .eq('id', item.id);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_featured: !i.is_featured } : i))
    );
  };

  // ---------------- Bulk Actions ----------------
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkAvailability = async (available: boolean) => {
    if (selectedIds.length === 0) return;
    await supabase
      .from('menu_items')
      .update({ is_available: available })
      .in('id', selectedIds);
    setSelectedIds([]);
    loadMenuData();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    await supabase
      .from('menu_items')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', selectedIds);
    setSelectedIds([]);
    loadMenuData();
  };

  const filteredItems = items.filter((item) => {
    const matchesCat =
      selectedCategoryId === 'all' || item.category_id === selectedCategoryId;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesDietary =
      dietaryFilter === 'all' || item.dietary_type === dietaryFilter;
    return matchesCat && matchesSearch && matchesDietary;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Menu Builder</h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize categories, dishes, portion sizes, add-ons, and instant stock toggles.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={openNewCategory}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
          <button
            onClick={openNewItem}
            disabled={categories.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Dish
          </button>
        </div>
      </div>

      {/* Empty Category Prompt */}
      {!loading && categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Start by creating your first category</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Create categories like <strong>Starters</strong>, <strong>Main Course</strong>,{' '}
            <strong>Biryani</strong>, or <strong>Beverages</strong> before adding your dishes.
          </p>
          <button
            onClick={openNewCategory}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700"
          >
            <Plus className="h-4 w-4" />
            Create First Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-3 space-y-2">
            <div className="bg-white rounded-xl border border-slate-200 p-2 space-y-1">
              <button
                onClick={() => setSelectedCategoryId('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                  selectedCategoryId === 'all'
                    ? 'bg-orange-50 text-orange-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>All Items</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </button>

              {categories.map((cat) => {
                const count = items.filter((i) => i.category_id === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                      selectedCategoryId === cat.id
                        ? 'bg-orange-50 text-orange-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className="flex-1 text-left truncate"
                    >
                      {cat.name}
                    </button>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 mr-1">{count}</span>
                      <button
                        onClick={() => openEditCategory(cat)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700"
                        title="Edit Category"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600"
                        title="Delete Category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items Main Area */}
          <div className="lg:col-span-9 space-y-4">
            {/* Search, Filter & Bulk Toolbar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2 min-w-[220px]">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    placeholder="Search dishes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <select
                  value={dietaryFilter}
                  onChange={(e) => setDietaryFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="veg">Veg Only</option>
                  <option value="non_veg">Non-Veg Only</option>
                  <option value="egg">Egg</option>
                </select>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs">
                  <span className="font-semibold">{selectedIds.length} selected</span>
                  <button
                    onClick={() => handleBulkAvailability(true)}
                    className="px-2 py-1 bg-emerald-600 rounded hover:bg-emerald-500"
                  >
                    In Stock
                  </button>
                  <button
                    onClick={() => handleBulkAvailability(false)}
                    className="px-2 py-1 bg-amber-600 rounded hover:bg-amber-500"
                  >
                    Out of Stock
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-2 py-1 bg-rose-600 rounded hover:bg-rose-500"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-2.5">
              {filteredItems.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
                  No dishes found in this view. Click <strong>+ Add Dish</strong> to create one.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  const variantCount = item.menu_item_variants?.length || 0;
                  const addonGroupCount = item.menu_addon_groups?.length || 0;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-opacity ${
                        item.is_available
                          ? 'border-slate-200'
                          : 'border-slate-200 bg-slate-50/70 opacity-75'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleSelect(item.id)}
                          className="mt-1 text-slate-400 hover:text-orange-600"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-orange-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>

                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-16 w-16 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs shrink-0">
                            No Photo
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <DietaryBadge type={item.dietary_type} />
                            <h3 className="font-bold text-slate-900 text-sm">{item.name}</h3>
                            {item.is_featured && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                Bestseller
                              </span>
                            )}
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-1.5 text-xs">
                            {item.discounted_price !== null ? (
                              <span>
                                <strong className="text-slate-900">
                                  {formatCurrency(item.discounted_price)}
                                </strong>{' '}
                                <span className="line-through text-slate-400">
                                  {formatCurrency(item.base_price)}
                                </span>
                              </span>
                            ) : (
                              <strong className="text-slate-900">
                                {formatCurrency(item.base_price)}
                              </strong>
                            )}

                            {(variantCount > 0 || addonGroupCount > 0) && (
                              <span className="text-indigo-600 font-medium">
                                {variantCount > 0 ? `${variantCount} sizes` : ''}
                                {variantCount > 0 && addonGroupCount > 0 ? ' · ' : ''}
                                {addonGroupCount > 0 ? `${addonGroupCount} add-on groups` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center justify-end gap-2 shrink-0">
                        <button
                          onClick={() => toggleItemAvailability(item)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            item.is_available
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          {item.is_available ? 'In Stock' : 'Out of Stock'}
                        </button>

                        <button
                          onClick={() => toggleItemFeatured(item)}
                          className={`p-1.5 rounded-lg border ${
                            item.is_featured
                              ? 'border-amber-200 bg-amber-50 text-amber-600'
                              : 'border-slate-200 text-slate-400 hover:text-amber-500'
                          }`}
                          title="Toggle Bestseller / Featured"
                        >
                          <Star className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => setCustomizingItem(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
                          title="Manage Sizes & Add-ons"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          Options
                        </button>

                        <button
                          onClick={() => openEditItem(item)}
                          className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                          title="Edit Dish"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCategory}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900">
              {editingCat ? 'Edit Category' : 'New Menu Category'}
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category Name</label>
              <input
                required
                placeholder="e.g., Starters, Main Course, Tandoor"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Description (Optional)
              </label>
              <input
                placeholder="Served hot with mint chutney"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Save Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create / Edit Dish Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveItem}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-bold text-slate-900">
              {editingItem ? 'Edit Dish' : 'Add New Dish'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  required
                  value={itemForm.category_id}
                  onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Dietary Type</label>
                <select
                  value={itemForm.dietary_type}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, dietary_type: e.target.value as DietaryType })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="veg">Veg</option>
                  <option value="non_veg">Non-Veg</option>
                  <option value="egg">Egg</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Dish Name</label>
              <input
                required
                placeholder="e.g., Paneer Tikka Masala"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Char-grilled cottage cheese simmered in rich spiced tomato gravy..."
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Regular Price (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={itemForm.base_price}
                  onChange={(e) => setItemForm({ ...itemForm, base_price: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Offer / Discounted Price (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Optional"
                  value={itemForm.discounted_price}
                  onChange={(e) => setItemForm({ ...itemForm, discounted_price: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Food Image Upload */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Food Photo</label>
              <div className="flex items-center gap-3">
                {itemForm.image_url && (
                  <img
                    src={itemForm.image_url}
                    alt="Preview"
                    className="h-14 w-14 rounded-lg object-cover border border-slate-200"
                  />
                )}
                <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingImg ? 'Uploading...' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImg}
                    onChange={handleFoodImageUpload}
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={itemForm.is_available}
                  onChange={(e) => setItemForm({ ...itemForm, is_available: e.target.checked })}
                />
                Available in Stock
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={itemForm.is_featured}
                  onChange={(e) => setItemForm({ ...itemForm, is_featured: e.target.checked })}
                />
                Mark as Bestseller
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingItem || uploadingImg}
                className="px-4 py-2 text-sm font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {savingItem ? 'Saving...' : 'Save Dish'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sizes & Add-ons Modal */}
      {customizingItem && (
        <ItemCustomizationModal
          item={customizingItem}
          restaurantId={restaurant.id}
          onClose={() => setCustomizingItem(null)}
          onUpdated={loadMenuData}
        />
      )}
    </div>
  );
}
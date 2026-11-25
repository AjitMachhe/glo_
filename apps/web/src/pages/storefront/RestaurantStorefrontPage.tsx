import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Phone,
  ShoppingBag,
  Plus,
  Minus,
  X,
  Tag,
  AlertCircle,
  Utensils,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  CartItem,
  MenuCategory,
  MenuItem,
  OrderType,
  Restaurant,
  RestaurantSettings,
  calculateCartTotals,
  formatCurrency,
} from '@menuorbit/shared';
import { DietaryBadge } from '../../components/shared/DietaryBadge';
import { CustomerItemModal } from '../../components/storefront/CustomerItemModal';

export function RestaurantStorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tableIdFromQr = searchParams.get('table');
  const [tableLabel, setTableLabel] = useState<string | null>(null);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Browsing filters
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  // Customization modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  // Cart & Checkout Drawer
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>(tableIdFromQr ? 'dine_in' : 'delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'pay_at_restaurant' | 'upi'>(
    tableIdFromQr ? 'pay_at_restaurant' : 'cod'
  );
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    async function loadStorefront() {
      if (!slug) return;
      setLoading(true);

      const { data: rest } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .is('deleted_at', null)
        .single();

      if (!rest) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setRestaurant(rest as Restaurant);

      const [settingsRes, catRes, itemRes] = await Promise.all([
        supabase
          .from('restaurant_settings')
          .select('*')
          .eq('restaurant_id', rest.id)
          .single(),
        supabase
          .from('menu_categories')
          .select('*')
          .eq('restaurant_id', rest.id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('sort_order'),
        supabase
          .from('menu_items')
          .select('*, menu_item_variants(*), menu_addon_groups(*, menu_item_addons(*))')
          .eq('restaurant_id', rest.id)
          .is('deleted_at', null)
          .order('sort_order'),
      ]);

      if (settingsRes.data) {
        const s = settingsRes.data as RestaurantSettings;
        setSettings(s);
        if (!tableIdFromQr) {
          if (s.accepts_delivery) setOrderType('delivery');
          else if (s.accepts_pickup) setOrderType('pickup');
          else if (s.accepts_dine_in) setOrderType('dine_in');
        }
      }
      if (catRes.data) setCategories(catRes.data as MenuCategory[]);
      if (itemRes.data) setItems(itemRes.data as MenuItem[]);

      // Resolve table number if scanned from table QR
      if (tableIdFromQr) {
        const { data: tableData } = await supabase
          .from('tables')
          .select('table_number, floor_or_zone')
          .eq('id', tableIdFromQr)
          .eq('restaurant_id', rest.id)
          .single();
        if (tableData) {
          setTableLabel(`Table ${tableData.table_number} (${tableData.floor_or_zone})`);
        }
      }

      setLoading(false);
    }

    loadStorefront();
  }, [slug, tableIdFromQr]);

  // Cart manipulation
  const addItemToCart = (newItem: CartItem) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.cartKey === newItem.cartKey);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + newItem.quantity,
        };
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const handleQuickAdd = (item: MenuItem) => {
    const hasVariants = (item.menu_item_variants || []).length > 0;
    const hasAddons = (item.menu_addon_groups || []).length > 0;
    if (hasVariants || hasAddons) {
      setCustomizingItem(item);
      return;
    }

    const unitPrice = Number(item.discounted_price ?? item.base_price);
    addItemToCart({
      cartKey: `${item.id}::base::::`,
      menu_item_id: item.id,
      name: item.name,
      dietary_type: item.dietary_type,
      variant_id: null,
      variant_name: null,
      unit_price: unitPrice,
      addons: [],
      quantity: 1,
      notes: '',
    });
  };

  const updateCartQuantity = (cartKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const totals = calculateCartTotals(
    cart,
    settings,
    orderType,
    appliedCoupon?.discount || 0
  );

  // Coupon validation preview
  const handleApplyCoupon = async () => {
    if (!restaurant || !couponInput.trim()) return;
    setCouponError('');

    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .ilike('code', couponInput.trim())
      .eq('is_active', true)
      .single();

    if (!coupon) {
      setCouponError('Invalid or expired coupon code.');
      setAppliedCoupon(null);
      return;
    }

    if (totals.subtotal < Number(coupon.min_order_value)) {
      setCouponError(`Minimum order of ${formatCurrency(coupon.min_order_value)} required.`);
      setAppliedCoupon(null);
      return;
    }

    let discount =
      coupon.discount_type === 'percentage'
        ? Math.round(((totals.subtotal * Number(coupon.discount_value)) / 100) * 100) / 100
        : Number(coupon.discount_value);

    if (coupon.max_discount !== null) {
      discount = Math.min(discount, Number(coupon.max_discount));
    }

    setAppliedCoupon({ code: coupon.code, discount });
  };

  // Place Order via Authoritative Server-Side RPC
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || cart.length === 0) return;

    if (settings && totals.subtotal < Number(settings.min_order_amount)) {
      setCheckoutError(
        `Minimum order amount is ${formatCurrency(settings.min_order_amount)}.`
      );
      return;
    }

    setSubmittingOrder(true);
    setCheckoutError('');

    const rpcItems = cart.map((c) => ({
      menu_item_id: c.menu_item_id,
      variant_id: c.variant_id,
      addon_ids: c.addons.map((a) => a.id),
      quantity: c.quantity,
      notes: c.notes,
    }));

    // Reuse active table session ID if dining in so multiple rounds group cleanly
    let tableSessionId: string | null = null;
    if (orderType === 'dine_in' && tableIdFromQr) {
      const storageKey = `table_session_${restaurant.id}_${tableIdFromQr}`;
      tableSessionId = localStorage.getItem(storageKey);
      if (!tableSessionId) {
        tableSessionId = crypto.randomUUID();
        localStorage.setItem(storageKey, tableSessionId);
      }
    }

    const { data, error } = await supabase.rpc('place_customer_order', {
      p_restaurant_id: restaurant.id,
      p_order_type: orderType,
      p_customer_name: customerName.trim(),
      p_customer_phone: customerPhone.trim(),
      p_table_id: orderType === 'dine_in' ? tableIdFromQr : null,
      p_table_session_id: tableSessionId,
      p_delivery_address:
        orderType === 'delivery'
          ? { address_line: addressLine.trim(), landmark: landmark.trim() }
          : null,
      p_special_instructions: specialInstructions.trim() || null,
      p_coupon_code: appliedCoupon?.code || null,
      p_payment_method: paymentMethod,
      p_items: rpcItems,
    });

    setSubmittingOrder(false);

    if (error || !data) {
      setCheckoutError(error?.message || 'Unable to place order. Please try again.');
      return;
    }

    setCart([]);
    setCartOpen(false);
    navigate(`/track/${data.tracking_token}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 space-y-2">
          <h1 className="text-xl font-bold text-slate-900">Restaurant Unavailable</h1>
          <p className="text-sm text-slate-500">
            This restaurant link is either invalid or not currently active.
          </p>
        </div>
      </div>
    );
  }

  const isPaused =
    settings?.orders_paused_until && new Date(settings.orders_paused_until) > new Date();

  const filteredItems = items.filter((item) => {
    const matchesCat = activeCategoryId === 'all' || item.category_id === activeCategoryId;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesVeg = !vegOnly || item.dietary_type === 'veg';
    return matchesCat && matchesSearch && matchesVeg;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Restaurant Hero Header */}
      <div className="bg-white border-b border-slate-200">
        {restaurant.cover_url && (
          <div className="h-40 sm:h-52 w-full overflow-hidden bg-slate-200">
            <img
              src={restaurant.cover_url}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-start gap-4">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border-2 border-white shadow-md -mt-8 sm:-mt-10 bg-white shrink-0"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-bold text-2xl shrink-0">
                {restaurant.name.charAt(0)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {restaurant.name}
                </h1>
                {tableLabel && (
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                    {tableLabel}
                  </span>
                )}
              </div>

              {restaurant.cuisine_types?.length > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {restaurant.cuisine_types.join(' · ')}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {restaurant.address}, {restaurant.city}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {restaurant.phone}
                </span>
                {settings?.fssai_number && (
                  <span className="text-slate-400">FSSAI: {settings.fssai_number}</span>
                )}
              </div>
            </div>
          </div>

          {isPaused && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Kitchen is temporarily paused due to high order volume. Please check back shortly.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Search & Category Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                placeholder="Search menu items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setVegOnly(!vegOnly)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                vegOnly
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              Veg Only
            </button>
          </div>

          {/* Horizontal Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveCategoryId('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                activeCategoryId === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({items.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  activeCategoryId === cat.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="max-w-4xl mx-auto px-4 pt-5 space-y-6">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
            <Utensils className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-600">No dishes match your filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const hasOptions =
                (item.menu_item_variants?.length || 0) > 0 ||
                (item.menu_addon_groups?.length || 0) > 0;
              const qtyInCart = cart
                .filter((c) => c.menu_item_id === item.id)
                .reduce((s, c) => s + c.quantity, 0);

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border border-slate-200 p-4 flex justify-between gap-3 shadow-2xs ${
                    !item.is_available ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <DietaryBadge type={item.dietary_type} />
                        {item.is_featured && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                            Bestseller
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-base mt-1">{item.name}</h3>
                      <div className="mt-1 text-sm">
                        {item.discounted_price !== null ? (
                          <span>
                            <strong className="text-slate-900">
                              {formatCurrency(item.discounted_price)}
                            </strong>{' '}
                            <span className="line-through text-xs text-slate-400">
                              {formatCurrency(item.base_price)}
                            </span>
                          </span>
                        ) : (
                          <strong className="text-slate-900">
                            {formatCurrency(item.base_price)}
                          </strong>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1.5">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {hasOptions && (
                      <p className="text-[11px] text-slate-400 mt-2">Customizable</p>
                    )}
                  </div>

                  {/* Image & Add Button */}
                  <div className="flex flex-col items-center justify-between shrink-0 w-24">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-20 w-24 rounded-xl object-cover border border-slate-100"
                      />
                    ) : (
                      <div className="h-20 w-24 rounded-xl bg-orange-50/60 flex items-center justify-center text-orange-300">
                        <Utensils className="h-6 w-6" />
                      </div>
                    )}

                    {!item.is_available ? (
                      <span className="mt-2 text-[11px] font-semibold text-rose-600">
                        Sold Out
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(isPaused)}
                        onClick={() => handleQuickAdd(item)}
                        className="mt-2 w-full py-1.5 px-3 rounded-xl border border-orange-600 bg-orange-50 text-orange-700 hover:bg-orange-600 hover:text-white text-xs font-bold transition-colors disabled:opacity-40"
                      >
                        {qtyInCart > 0 ? `Added (${qtyInCart})` : '+ ADD'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-30 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center justify-between transition-transform active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="h-5 w-5" />
              <span className="font-bold text-sm">
                {totals.itemCount} {totals.itemCount === 1 ? 'Item' : 'Items'} ·{' '}
                {formatCurrency(totals.totalAmount)}
              </span>
            </div>
            <span className="text-sm font-bold">View Cart & Checkout →</span>
          </button>
        </div>
      )}

      {/* Item Customization Modal */}
      {customizingItem && (
        <CustomerItemModal
          item={customizingItem}
          onClose={() => setCustomizingItem(null)}
          onAddToCart={addItemToCart}
        />
      )}

      {/* Cart & Checkout Slide-Over Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Your Order</h2>
              <button
                onClick={() => setCartOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Order Mode Selector */}
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                {settings?.accepts_delivery && (
                  <button
                    type="button"
                    onClick={() => setOrderType('delivery')}
                    className={`py-2 text-xs font-bold rounded-lg ${
                      orderType === 'delivery'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Delivery
                  </button>
                )}
                {settings?.accepts_pickup && (
                  <button
                    type="button"
                    onClick={() => setOrderType('pickup')}
                    className={`py-2 text-xs font-bold rounded-lg ${
                      orderType === 'pickup'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Pickup
                  </button>
                )}
                {settings?.accepts_dine_in && (
                  <button
                    type="button"
                    onClick={() => setOrderType('dine_in')}
                    className={`py-2 text-xs font-bold rounded-lg ${
                      orderType === 'dine_in'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Dine-In
                  </button>
                )}
              </div>

              {/* Cart Items */}
              <div className="space-y-3 divide-y divide-slate-100">
                {cart.map((c) => {
                  const itemUnit =
                    c.unit_price + c.addons.reduce((s, a) => s + Number(a.price), 0);
                  return (
                    <div key={c.cartKey} className="pt-3 first:pt-0 flex justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <DietaryBadge type={c.dietary_type} />
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {c.name}
                          </span>
                        </div>
                        {c.variant_name && (
                          <p className="text-xs text-slate-500">Size: {c.variant_name}</p>
                        )}
                        {c.addons.length > 0 && (
                          <p className="text-xs text-slate-500">
                            + {c.addons.map((a) => a.name).join(', ')}
                          </p>
                        )}
                        <p className="text-xs font-semibold text-slate-800 mt-1">
                          {formatCurrency(itemUnit * c.quantity)}
                        </p>
                      </div>

                      <div className="inline-flex items-center border border-slate-200 rounded-lg h-8 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(c.cartKey, -1)}
                          className="px-2 text-slate-600"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-2 text-xs font-bold">{c.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(c.cartKey, 1)}
                          className="px-2 text-slate-600"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Code */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      placeholder="Promo / Coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs uppercase"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-3.5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-xs text-rose-600 mt-1">{couponError}</p>}
                {appliedCoupon && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    Coupon {appliedCoupon.code} applied (-{formatCurrency(appliedCoupon.discount)})
                  </p>
                )}
              </div>

              {/* Bill Breakdown */}
              <div className="bg-slate-50 p-3.5 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Item Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>-{formatCurrency(totals.discountAmount)}</span>
                  </div>
                )}
                {totals.packagingFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Packaging Charges</span>
                    <span>{formatCurrency(totals.packagingFee)}</span>
                  </div>
                )}
                {orderType === 'delivery' && (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee</span>
                    <span>
                      {totals.deliveryFee === 0 ? 'FREE' : formatCurrency(totals.deliveryFee)}
                    </span>
                  </div>
                )}
                {totals.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>GST / Taxes ({settings?.tax_percentage}%)</span>
                    <span>{formatCurrency(totals.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>To Pay</span>
                  <span>{formatCurrency(totals.totalAmount)}</span>
                </div>
              </div>

              {/* Customer Contact & Address */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Your Details
                </h3>
                <input
                  required
                  placeholder="Your Name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  required
                  type="tel"
                  placeholder="Mobile / WhatsApp Number *"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />

                {orderType === 'delivery' && (
                  <>
                    <textarea
                      required
                      rows={2}
                      placeholder="Complete Delivery Address (Flat/House No, Street, Area) *"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <input
                      placeholder="Nearby Landmark (Optional)"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </>
                )}

                <input
                  placeholder="Order Notes (e.g., Ring doorbell, cutlery needed)"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Payment Method
                </h3>
                <div className="space-y-1.5 text-sm">
                  {settings?.payment_methods.cod && orderType === 'delivery' && (
                    <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="accent-orange-600"
                      />
                      <span>Cash on Delivery (COD)</span>
                    </label>
                  )}
                  {settings?.payment_methods.pay_at_restaurant && orderType !== 'delivery' && (
                    <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        checked={paymentMethod === 'pay_at_restaurant'}
                        onChange={() => setPaymentMethod('pay_at_restaurant')}
                        className="accent-orange-600"
                      />
                      <span>Pay at Counter / Table</span>
                    </label>
                  )}
                  {settings?.payment_methods.upi && (
                    <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        checked={paymentMethod === 'upi'}
                        onChange={() => setPaymentMethod('upi')}
                        className="accent-orange-600"
                      />
                      <span>UPI / QR on Delivery or Counter</span>
                    </label>
                  )}
                </div>
              </div>

              {checkoutError && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium">
                  {checkoutError}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingOrder}
                className="w-full py-3.5 bg-orange-600 text-white font-bold rounded-xl text-sm hover:bg-orange-700 disabled:opacity-50"
              >
                {submittingOrder
                  ? 'Placing Order...'
                  : `Place Order · ${formatCurrency(totals.totalAmount)}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
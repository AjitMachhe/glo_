export type RestaurantStatus = 'pending_approval' | 'active' | 'suspended' | 'deactivated';
export type StaffRole = 'owner' | 'manager' | 'kitchen_staff';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
export type BillingCycle = 'free_trial' | 'monthly' | 'annual' | 'custom';
export type DietaryType = 'veg' | 'non_veg' | 'egg';
export type OrderType = 'delivery' | 'pickup' | 'dine_in';
export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'rejected'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string;
  is_super_admin: boolean;
  created_at: string;
}

export interface PlatformSettings {
  id: number;
  platform_name: string;
  default_free_trial_days: number;
  require_restaurant_approval: boolean;
  support_email: string | null;
  support_phone: string | null;
  announcement_banner: string | null;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price_monthly: number;
  price_annual: number;
  currency: string;
  max_orders_per_month: number | null;
  max_storage_mb: number;
  max_staff_accounts: number;
  features: {
    qr_ordering: boolean;
    custom_domain: boolean;
    online_payments: boolean;
    whatsapp_alerts: boolean;
    advanced_reports: boolean;
  };
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  created_at: string;
}

export interface RestaurantSubscription {
  id: string;
  restaurant_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  locked_price: number | null;
  trial_starts_at: string;
  trial_ends_at: string;
  current_period_start: string;
  current_period_end: string;
  admin_notes: string | null;
  subscription_plans?: SubscriptionPlan;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  description: string | null;
  cuisine_types: string[];
  phone: string;
  whatsapp_phone: string | null;
  email: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string | null;
  logo_url: string | null;
  cover_url: string | null;
  status: RestaurantStatus;
  approved_at: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'email' | 'phone'>;
  restaurant_subscriptions?: RestaurantSubscription | RestaurantSubscription[];
}

export interface RestaurantMember {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: StaffRole;
  permissions: {
    can_manage_orders: boolean;
    can_edit_menu: boolean;
    can_manage_tables: boolean;
    can_view_reports: boolean;
    can_edit_settings: boolean;
  };
  is_active: boolean;
  restaurants?: Restaurant;
  profiles?: Pick<Profile, 'full_name' | 'email' | 'phone'>;
}

export interface RestaurantSettings {
  restaurant_id: string;
  currency: string;
  is_gst_registered: boolean;
  gstin: string | null;
  fssai_number: string | null;
  tax_percentage: number;
  packaging_fee: number;
  delivery_fee: number;
  free_delivery_above: number | null;
  min_order_amount: number;
  accepts_delivery: boolean;
  accepts_pickup: boolean;
  accepts_dine_in: boolean;
  payment_methods: {
    cod: boolean;
    pay_at_restaurant: boolean;
    upi: boolean;
    online: boolean;
  };
  avg_prep_time_mins: number;
  orders_paused_until: string | null;
  auto_accept_orders: boolean;
  updated_at: string;
}

export interface RestaurantHour {
  id: string;
  restaurant_id: string;
  day_of_week: number; // 0 = Sunday ... 6 = Saturday
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  restaurant_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface MenuItemVariant {
  id: string;
  restaurant_id: string;
  item_id: string;
  name: string;
  price: number;
  is_default: boolean;
  is_available: boolean;
  sort_order: number;
}

export interface MenuItemAddon {
  id: string;
  restaurant_id: string;
  addon_group_id: string;
  name: string;
  price: number;
  dietary_type: DietaryType;
  is_available: boolean;
  sort_order: number;
}

export interface MenuAddonGroup {
  id: string;
  restaurant_id: string;
  item_id: string;
  name: string;
  min_selections: number;
  max_selections: number;
  is_required: boolean;
  sort_order: number;
  menu_item_addons?: MenuItemAddon[];
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: number;
  discounted_price: number | null;
  dietary_type: DietaryType;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  prep_time_mins: number | null;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  menu_item_variants?: MenuItemVariant[];
  menu_addon_groups?: MenuAddonGroup[];
}

export interface CartItemAddon {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartKey: string; // unique composite key: itemId + variantId + sorted addonIds + notes
  menu_item_id: string;
  name: string;
  dietary_type: DietaryType;
  variant_id: string | null;
  variant_name: string | null;
  unit_price: number;
  addons: CartItemAddon[];
  quantity: number;
  notes: string;
}

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: string;
  floor_or_zone: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
}

export interface RestaurantQrCode {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  qr_type: 'restaurant' | 'table';
  target_url: string;
  design_config: {
    fgColor: string;
    bgColor: string;
    showLogo: boolean;
  };
  scan_count: number;
  created_at: string;
}

export type PaymentMethod = 'cod' | 'pay_at_restaurant' | 'upi' | 'online';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItemAddon {
  id: string;
  order_item_id: string;
  addon_name_snapshot: string;
  addon_price: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  restaurant_id: string;
  menu_item_id: string | null;
  item_name_snapshot: string;
  variant_name_snapshot: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  notes: string | null;
  order_item_addons?: OrderItemAddon[];
}

export interface OrderPayment {
  id: string;
  order_id: string;
  restaurant_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  gateway_name: string | null;
  transaction_id: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  tracking_token: string;
  restaurant_id: string;
  customer_id: string | null;
  table_id: string | null;
  table_session_id: string | null;
  order_type: OrderType;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  delivery_address: {
    address_line?: string;
    landmark?: string;
  } | null;
  special_instructions: string | null;
  coupon_code: string | null;
  subtotal: number;
  tax_amount: number;
  packaging_fee: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  estimated_ready_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  tables?: { table_number: string; floor_or_zone: string } | null;
  order_items?: OrderItem[];
  payments?: OrderPayment[];
}
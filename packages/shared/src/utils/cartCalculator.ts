import { CartItem, OrderType, RestaurantSettings } from '../types/database';

export interface CartTotals {
  subtotal: number;
  discountAmount: number;
  packagingFee: number;
  deliveryFee: number;
  taxAmount: number;
  totalAmount: number;
  itemCount: number;
}

export function calculateCartTotals(
  items: CartItem[],
  settings: RestaurantSettings | null,
  orderType: OrderType,
  discountAmount = 0
): CartTotals {
  const subtotal = items.reduce((sum, item) => {
    const addonsSum = item.addons.reduce((aSum, a) => aSum + Number(a.price), 0);
    return sum + (Number(item.unit_price) + addonsSum) * item.quantity;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const clampedDiscount = Math.min(subtotal, Math.max(0, discountAmount));

  const packagingFee =
    settings && (orderType === 'delivery' || orderType === 'pickup')
      ? Number(settings.packaging_fee || 0)
      : 0;

  let deliveryFee = 0;
  if (settings && orderType === 'delivery') {
    if (
      settings.free_delivery_above !== null &&
      subtotal >= Number(settings.free_delivery_above)
    ) {
      deliveryFee = 0;
    } else {
      deliveryFee = Number(settings.delivery_fee || 0);
    }
  }

  const taxableBase = Math.max(0, subtotal - clampedDiscount);
  const taxPercentage = settings ? Number(settings.tax_percentage || 0) : 0;
  const taxAmount = Math.round(((taxableBase * taxPercentage) / 100) * 100) / 100;

  const totalAmount = Math.max(
    0,
    Math.round((taxableBase + packagingFee + deliveryFee + taxAmount) * 100) / 100
  );

  return {
    subtotal,
    discountAmount: clampedDiscount,
    packagingFee,
    deliveryFee,
    taxAmount,
    totalAmount,
    itemCount,
  };
}
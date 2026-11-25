import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Clock, Phone, MessageCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '@menuorbit/shared';

interface TrackedOrder {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  customer_name: string;
  subtotal: number;
  tax_amount: number;
  packaging_fee: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  estimated_ready_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  restaurant: {
    name: string;
    phone: string;
    whatsapp_phone: string | null;
    address: string;
  };
  items: {
    name: string;
    variant: string | null;
    quantity: number;
    total_price: number;
    addons: { name: string; price: number }[];
  }[];
}

const STEPS = [
  { key: 'new', label: 'Order Sent' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
];

export function OrderTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    if (!token) return;
    const { data } = await supabase.rpc('get_order_by_tracking_token', {
      p_tracking_token: token,
    });
    if (data) setOrder(data as TrackedOrder);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();
    // Poll every 8 seconds so guest status updates live without exposing full table SELECT RLS
    const interval = setInterval(fetchOrder, 8000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
          <h2 className="text-lg font-bold text-slate-900">Order Not Found</h2>
          <p className="text-sm text-slate-500 mt-1">Please check your order tracking link.</p>
        </div>
      </div>
    );
  }

  const isRejectedOrCancelled = ['rejected', 'cancelled'].includes(order.status);
  const effectiveStatus =
    order.status === 'out_for_delivery' ? 'ready' : order.status;
  const activeStepIdx = STEPS.findIndex((s) => s.key === effectiveStatus);

  const buildWhatsAppLink = () => {
    const rawPhone = (order.restaurant.whatsapp_phone || order.restaurant.phone).replace(
      /\D/g,
      ''
    );
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const itemLines = order.items
      .map((i) => `• ${i.quantity}x ${i.name}${i.variant ? ` (${i.variant})` : ''}`)
      .join('\n');
    const text = encodeURIComponent(
      `Hi ${order.restaurant.name}, I placed order *${order.order_number}* (${order.order_type.toUpperCase()}):\n${itemLines}\nTotal: *${formatCurrency(order.total_amount)}*`
    );
    return `https://wa.me/${phone}?text=${text}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:py-10">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-mono font-semibold text-orange-600">
                {order.order_number}
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">
                {order.restaurant.name}
              </h1>
              <p className="text-xs text-slate-500 capitalize">
                {order.order_type.replace('_', ' ')} Order · {order.customer_name}
              </p>
            </div>
            <button
              onClick={fetchOrder}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              title="Refresh Status"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {isRejectedOrCancelled ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
              <p className="font-bold text-sm capitalize">Order {order.status}</p>
              {order.rejection_reason && (
                <p className="text-xs">Reason: {order.rejection_reason}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 px-3.5 py-2.5 rounded-xl">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  Current Status:{' '}
                  <span className="uppercase">{order.status.replace(/_/g, ' ')}</span>
                </span>
              </div>

              {order.estimated_ready_at && (
                <p className="text-xs text-slate-600">
                  Estimated Ready Time:{' '}
                  <strong>
                    {new Date(order.estimated_ready_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>
                </p>
              )}

              {/* Stepper */}
              <div className="grid grid-cols-5 gap-1 pt-2">
                {STEPS.map((step, idx) => {
                  const done = idx <= activeStepIdx;
                  return (
                    <div key={step.key} className="text-center space-y-1.5">
                      <div
                        className={`h-2 rounded-full ${
                          done ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                      <p
                        className={`text-[10px] font-semibold ${
                          done ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Contact & WhatsApp Actions */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <a
              href={`tel:${order.restaurant.phone}`}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Phone className="h-3.5 w-3.5" />
              Call Restaurant
            </a>
            <a
              href={buildWhatsAppLink()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Send on WhatsApp
            </a>
          </div>
        </div>

        {/* Receipt Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Order Summary
          </h2>

          <div className="divide-y divide-slate-100 text-sm">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-2.5 flex justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-800">
                    {item.quantity} × {item.name}
                    {item.variant ? ` (${item.variant})` : ''}
                  </p>
                  {item.addons.length > 0 && (
                    <p className="text-xs text-slate-500">
                      + {item.addons.map((a) => a.name).join(', ')}
                    </p>
                  )}
                </div>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(item.total_price)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount_amount)}</span>
              </div>
            )}
            {order.packaging_fee > 0 && (
              <div className="flex justify-between">
                <span>Packaging</span>
                <span>{formatCurrency(order.packaging_fee)}</span>
              </div>
            )}
            {order.delivery_fee > 0 && (
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
            )}
            {order.tax_amount > 0 && (
              <div className="flex justify-between">
                <span>Taxes</span>
                <span>{formatCurrency(order.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2">
              <span>Total</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  BellRing,
  Check,
  X,
  Clock,
  Printer,
  MessageCircle,
  MapPin,
  Phone,
  ChefHat,
  PackageCheck,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Order, OrderStatus, formatCurrency } from '@menuorbit/shared';
import { OrderPrintModal } from '../../components/admin/OrderPrintModal';

type TabFilter = 'active' | 'new' | 'preparing' | 'ready' | 'history';

export function LiveOrdersPage() {
  const { restaurant, settings } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('active');

  // Sound Alert State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Accept with Prep Time Modal
  const [acceptingOrder, setAcceptingOrder] = useState<Order | null>(null);
  const [prepMins, setPrepMins] = useState<number>(settings?.avg_prep_time_mins || 25);

  // Reject Reason Modal
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('Kitchen is at full capacity right now');

  // Print Modal
  const [printingState, setPrintingState] = useState<{
    order: Order;
    mode: 'kot' | 'receipt';
  } | null>(null);

  const playChime = () => {
    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      [880, 1174.66].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);
        gain.gain.setValueAtTime(0.25, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.36);
      });
    } catch {
      // Browser autoplay restriction until user interacts with page
    }
  };
const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!restaurant) return;
    const { data, error } = await supabase
      .from('orders')
      .select(
        `*, tables(table_number, floor_or_zone), order_items(*, order_item_addons(*)), payments(*)`
      )
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('Error fetching orders:', error);
      setFetchError(error.message);
    } else if (data) {
      setFetchError(null);
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!restaurant) return;
    fetchOrders();

    // Subscribe to live INSERT/UPDATE events for this restaurant
    const channel = supabase
      .channel(`restaurant-orders-${restaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && soundEnabled) {
            playChime();
          }
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, soundEnabled]);

  // Repeat chime every 6 seconds while any order remains unacknowledged in 'new' status
  const newOrdersCount = orders.filter((o) => o.status === 'new').length;
  useEffect(() => {
    if (!soundEnabled || newOrdersCount === 0) return;
    const timer = setInterval(() => {
      playChime();
    }, 6000);
    return () => clearInterval(timer);
  }, [soundEnabled, newOrdersCount]);

  if (!restaurant) return null;

  const updateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    extra: Record<string, unknown> = {}
  ) => {
    await supabase
      .from('orders')
      .update({ status, ...extra })
      .eq('id', orderId);
    fetchOrders();
  };

  const handleConfirmAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptingOrder) return;

    const readyAt = new Date(Date.now() + prepMins * 60 * 1000).toISOString();
    await updateOrderStatus(acceptingOrder.id, 'accepted', { estimated_ready_at: readyAt });
    setAcceptingOrder(null);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingOrder) return;

    await updateOrderStatus(rejectingOrder.id, 'rejected', {
      rejection_reason: rejectReason.trim() || 'Unable to fulfill order',
    });
    setRejectingOrder(null);
  };

  const markPaymentPaid = async (paymentId: string) => {
    await supabase.from('payments').update({ status: 'paid' }).eq('id', paymentId);
    fetchOrders();
  };

  const getCustomerWhatsAppUrl = (order: Order) => {
    const digits = order.customer_phone.replace(/\D/g, '');
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const statusText = order.status.replace(/_/g, ' ').toUpperCase();
    const msg = encodeURIComponent(
      `Hello ${order.customer_name}, your order *${order.order_number}* from *${restaurant.name}* is now *${statusText}*.\nTrack live: ${window.location.origin}/track/${order.tracking_token}`
    );
    return `https://wa.me/${phone}?text=${msg}`;
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'new') return o.status === 'new';
    if (activeTab === 'preparing') return ['accepted', 'preparing'].includes(o.status);
    if (activeTab === 'ready') return ['ready', 'out_for_delivery'].includes(o.status);
    if (activeTab === 'history') return ['completed', 'rejected', 'cancelled'].includes(o.status);
    return !['completed', 'rejected', 'cancelled'].includes(o.status);
  });

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    {
      key: 'active',
      label: 'All Active',
      count: orders.filter((o) => !['completed', 'rejected', 'cancelled'].includes(o.status)).length,
    },
    { key: 'new', label: 'New Incoming', count: newOrdersCount },
    {
      key: 'preparing',
      label: 'In Kitchen',
      count: orders.filter((o) => ['accepted', 'preparing'].includes(o.status)).length,
    },
    {
      key: 'ready',
      label: 'Ready / Out',
      count: orders.filter((o) => ['ready', 'out_for_delivery'].includes(o.status)).length,
    },
    {
      key: 'history',
      label: 'Completed / Past',
      count: orders.filter((o) => ['completed', 'rejected', 'cancelled'].includes(o.status)).length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            Live Order Queue
            {newOrdersCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-600 text-white text-xs font-bold animate-pulse">
                <BellRing className="h-3.5 w-3.5" />
                {newOrdersCount} New
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Orders update in real time. Accept incoming orders to notify customers immediately.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={playChime}
            className="px-3 py-2 text-xs font-medium border border-slate-200 bg-white rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Test Alert Sound
          </button>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {soundEnabled ? 'Sound Alerts ON' : 'Muted'}
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === tab.key
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[11px] ${
                activeTab === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading live orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
          <BellRing className="h-8 w-8 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No orders in this queue</h3>
          <p className="text-xs text-slate-500">
            New customer orders from your storefront or table QR codes will appear here instantly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredOrders.map((order) => {
            const isNew = order.status === 'new';
            const payment = order.payments?.[0];

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border-2 p-5 flex flex-col justify-between space-y-4 shadow-2xs ${
                  isNew ? 'border-orange-500 ring-4 ring-orange-500/10' : 'border-slate-200'
                }`}
              >
                {/* Card Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-base text-slate-900">
                          {order.order_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                            order.order_type === 'dine_in'
                              ? 'bg-indigo-50 text-indigo-700'
                              : order.order_type === 'pickup'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-sky-50 text-sky-700'
                          }`}
                        >
                          {order.order_type.replace('_', ' ')}
                        </span>
                        {order.tables && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold">
                            Table {order.tables.table_number}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Placed at{' '}
                        {new Date(order.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                        isNew
                          ? 'bg-orange-100 text-orange-700'
                          : ['rejected', 'cancelled'].includes(order.status)
                          ? 'bg-rose-100 text-rose-700'
                          : order.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Customer & Address Info */}
                  <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{order.customer_name}</span>
                      <a
                        href={`tel:${order.customer_phone}`}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-orange-600 font-medium"
                      >
                        <Phone className="h-3 w-3" />
                        {order.customer_phone}
                      </a>
                    </div>
                    {order.order_type === 'delivery' && order.delivery_address?.address_line && (
                      <p className="text-slate-600 flex items-start gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          {order.delivery_address.address_line}
                          {order.delivery_address.landmark
                            ? ` (${order.delivery_address.landmark})`
                            : ''}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Ordered Items */}
                  <div className="divide-y divide-slate-100 border-y border-slate-100 py-1">
                    {(order.order_items || []).map((item) => (
                      <div key={item.id} className="py-2 flex justify-between gap-2 text-sm">
                        <div>
                          <p className="font-semibold text-slate-900">
                            <span className="text-orange-600 font-extrabold">{item.quantity}×</span>{' '}
                            {item.item_name_snapshot}
                            {item.variant_name_snapshot ? ` (${item.variant_name_snapshot})` : ''}
                          </p>
                          {(item.order_item_addons || []).length > 0 && (
                            <p className="text-xs text-slate-500">
                              + {item.order_item_addons!.map((a) => a.addon_name_snapshot).join(', ')}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-amber-700 font-medium mt-0.5">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                        <span className="font-semibold text-slate-800 shrink-0">
                          {formatCurrency(item.total_price)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.special_instructions && (
                    <div className="p-2.5 rounded-lg bg-amber-50 text-amber-900 text-xs font-medium">
                      Instructions: {order.special_instructions}
                    </div>
                  )}

                  {/* Total & Payment Pill */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {payment?.method || 'COD'}
                      </span>
                      {payment && (
                        <button
                          type="button"
                          onClick={() =>
                            payment.status === 'pending' && markPaymentPaid(payment.id)
                          }
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            payment.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                          title={payment.status === 'pending' ? 'Click to mark Paid' : 'Paid'}
                        >
                          {payment.status === 'paid' ? 'PAID' : 'MARK PAID'}
                        </button>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 mr-1.5">Total:</span>
                      <span className="text-base font-extrabold text-slate-900">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  {/* Utility Buttons (KOT, Bill, WhatsApp) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPrintingState({ order, mode: 'kot' })}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                      title="Print Kitchen Ticket"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      KOT
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintingState({ order, mode: 'receipt' })}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                      title="Print Customer Bill"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Bill
                    </button>
                    <a
                      href={getCustomerWhatsAppUrl(order)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100"
                      title="Send WhatsApp Status Update"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>

                  {/* Primary Workflow Buttons */}
                  <div className="flex items-center gap-2">
                    {order.status === 'new' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setRejectingOrder(order)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPrepMins(settings?.avg_prep_time_mins || 25);
                            setAcceptingOrder(order);
                          }}
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Accept Order
                        </button>
                      </>
                    )}

                    {order.status === 'accepted' && (
                      <button
                        type="button"
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700"
                      >
                        <ChefHat className="h-3.5 w-3.5" />
                        Start Preparing
                      </button>
                    )}

                    {order.status === 'preparing' && (
                      <button
                        type="button"
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                      >
                        <PackageCheck className="h-3.5 w-3.5" />
                        Mark Ready
                      </button>
                    )}

                    {order.status === 'ready' && order.order_type === 'delivery' && (
                      <button
                        type="button"
                        onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Out for Delivery
                      </button>
                    )}

                    {((order.status === 'ready' && order.order_type !== 'delivery') ||
                      order.status === 'out_for_delivery') && (
                      <button
                        type="button"
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Complete Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Accept Order + Prep Time Modal */}
      {acceptingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmAccept}
            className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900">
              Accept {acceptingOrder.order_number}
            </h3>
            <p className="text-xs text-slate-500">
              Select estimated preparation time to show on the customer&apos;s live tracker:
            </p>

            <div className="grid grid-cols-4 gap-2">
              {[15, 25, 40, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPrepMins(m)}
                  className={`py-2.5 rounded-xl border text-xs font-bold ${
                    prepMins === m
                      ? 'border-orange-600 bg-orange-50 text-orange-700'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  {m} mins
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <input
                type="number"
                min={5}
                max={180}
                value={prepMins}
                onChange={(e) => setPrepMins(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAcceptingOrder(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Confirm & Notify
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reject Order Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmReject}
            className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900">
              Reject {rejectingOrder.order_number}
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reason shown to customer
              </label>
              <input
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
              >
                Reject Order
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KOT / Customer Bill Print Modal */}
      {printingState && (
        <OrderPrintModal
          order={printingState.order}
          restaurant={restaurant}
          settings={settings}
          initialMode={printingState.mode}
          onClose={() => setPrintingState(null)}
        />
      )}
    </div>
  );

  
}


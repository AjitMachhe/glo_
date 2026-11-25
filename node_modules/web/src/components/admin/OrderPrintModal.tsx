import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';
import { Order, Restaurant, RestaurantSettings, formatCurrency } from '@menuorbit/shared';

interface OrderPrintModalProps {
  order: Order;
  restaurant: Restaurant;
  settings: RestaurantSettings | null;
  initialMode?: 'kot' | 'receipt';
  onClose: () => void;
}

export function OrderPrintModal({
  order,
  restaurant,
  settings,
  initialMode = 'receipt',
  onClose,
}: OrderPrintModalProps) {
  const [mode, setMode] = useState<'kot' | 'receipt'>(initialMode);

  const halfTax = Math.round((Number(order.tax_amount) / 2) * 100) / 100;
  const halfTaxPct = settings ? Number(settings.tax_percentage) / 2 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #thermal-print-area, #thermal-print-area * { visibility: visible; }
          #thermal-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 4mm;
            font-family: monospace;
            color: #000;
            background: #fff;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('receipt')}
              className={`px-3 py-1 text-xs font-bold rounded-md ${
                mode === 'receipt' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Customer Bill
            </button>
            <button
              type="button"
              onClick={() => setMode('kot')}
              className={`px-3 py-1 text-xs font-bold rounded-md ${
                mode === 'kot' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Kitchen Ticket (KOT)
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable Ticket Preview */}
        <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center">
          <div
            id="thermal-print-area"
            className="bg-white w-[300px] p-4 shadow-sm border border-slate-200 font-mono text-xs text-slate-900 space-y-2.5"
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-400 pb-2">
              {mode === 'kot' ? (
                <p className="text-sm font-bold">*** KITCHEN ORDER TICKET ***</p>
              ) : (
                <>
                  <p className="text-sm font-bold uppercase">{restaurant.name}</p>
                  <p className="text-[11px]">{restaurant.address}, {restaurant.city}</p>
                  <p className="text-[11px]">Ph: {restaurant.phone}</p>
                  {settings?.gstin && <p className="text-[11px]">GSTIN: {settings.gstin}</p>}
                  {settings?.fssai_number && (
                    <p className="text-[11px]">FSSAI: {settings.fssai_number}</p>
                  )}
                </>
              )}
            </div>

            {/* Order Meta */}
            <div className="border-b border-dashed border-slate-400 pb-2 space-y-0.5 text-[11px]">
              <div className="flex justify-between font-bold">
                <span>Order: {order.order_number}</span>
                <span className="uppercase">{order.order_type.replace('_', ' ')}</span>
              </div>
              {order.tables && (
                <p className="font-bold text-xs">TABLE: {order.tables.table_number}</p>
              )}
              <p>Date: {new Date(order.created_at).toLocaleString('en-IN')}</p>
              <p>Customer: {order.customer_name} ({order.customer_phone})</p>
              {order.order_type === 'delivery' && order.delivery_address?.address_line && (
                <p>Addr: {order.delivery_address.address_line}</p>
              )}
            </div>

            {/* Items */}
            <div className="border-b border-dashed border-slate-400 pb-2 space-y-2">
              {(order.order_items || []).map((item) => (
                <div key={item.id}>
                  <div className="flex justify-between font-bold">
                    <span>
                      {item.quantity} x {item.item_name_snapshot}
                      {item.variant_name_snapshot ? ` (${item.variant_name_snapshot})` : ''}
                    </span>
                    {mode === 'receipt' && <span>{formatCurrency(item.total_price)}</span>}
                  </div>
                  {(item.order_item_addons || []).map((addon) => (
                    <div key={addon.id} className="pl-3 flex justify-between text-[11px]">
                      <span>+ {addon.addon_name_snapshot}</span>
                      {mode === 'receipt' && addon.addon_price > 0 && (
                        <span>{formatCurrency(addon.addon_price)}</span>
                      )}
                    </div>
                  ))}
                  {item.notes && (
                    <p className="pl-3 text-[11px] font-bold">** NOTE: {item.notes}</p>
                  )}
                </div>
              ))}
            </div>

            {order.special_instructions && (
              <div className="border-b border-dashed border-slate-400 pb-2 text-[11px] font-bold">
                ORDER NOTE: {order.special_instructions}
              </div>
            )}

            {/* Totals (Customer Receipt Only) */}
            {mode === 'receipt' && (
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between">
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
                  <>
                    <div className="flex justify-between">
                      <span>CGST ({halfTaxPct}%)</span>
                      <span>{formatCurrency(halfTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST ({halfTaxPct}%)</span>
                      <span>{formatCurrency(halfTax)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-400">
                  <span>GRAND TOTAL</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
                <p className="text-center pt-2 text-[10px]">
                  Payment: {(order.payments?.[0]?.method || 'cod').toUpperCase()} (
                  {(order.payments?.[0]?.status || 'pending').toUpperCase()})
                </p>
                <p className="text-center pt-1 text-[10px]">Thank you for ordering with us!</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 flex justify-end gap-2 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            Print {mode === 'kot' ? 'KOT' : 'Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}
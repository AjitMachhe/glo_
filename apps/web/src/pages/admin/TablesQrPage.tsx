import React, { useEffect, useState } from 'react';
import {
  Plus,
  QrCode,
  Download,
  Printer,
  Trash2,
  Copy,
  Check,
  Users,
  ExternalLink,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { RestaurantTable } from '@menuorbit/shared';

export function TablesQrPage() {
  const { restaurant } = useTenant();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Table Form
  const [tableNumber, setTableNumber] = useState('');
  const [zone, setZone] = useState('Main Dining');
  const [capacity, setCapacity] = useState(4);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadTables = async () => {
    if (!restaurant) return;
    setLoading(true);
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('table_number', { ascending: true });

    if (data) setTables(data as RestaurantTable[]);
    setLoading(false);
  };

  useEffect(() => {
    loadTables();
  }, [restaurant?.id]);

  if (!restaurant) return null;

  const baseStoreUrl = `${window.location.origin}/r/${restaurant.slug}`;

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;
    setAdding(true);
    setError('');

    const { data: createdTable, error: insertErr } = await supabase
      .from('tables')
      .insert({
        restaurant_id: restaurant.id,
        table_number: tableNumber.trim(),
        floor_or_zone: zone.trim() || 'Main Dining',
        capacity: Number(capacity),
      })
      .select()
      .single();

    if (insertErr) {
      setError(
        insertErr.code === '23505'
          ? `Table "${tableNumber.trim()}" already exists.`
          : insertErr.message
      );
      setAdding(false);
      return;
    }

    // Record corresponding qr_codes entry
    if (createdTable) {
      await supabase.from('qr_codes').insert({
        restaurant_id: restaurant.id,
        table_id: createdTable.id,
        qr_type: 'table',
        target_url: `${baseStoreUrl}?table=${createdTable.id}`,
      });
    }

    setTableNumber('');
    setAdding(false);
    loadTables();
  };

  const toggleTableActive = async (table: RestaurantTable) => {
    await supabase
      .from('tables')
      .update({ is_active: !table.is_active })
      .eq('id', table.id);

    setTables((prev) =>
      prev.map((t) => (t.id === table.id ? { ...t, is_active: !t.is_active } : t))
    );
  };

  const handleDeleteTable = async (tableId: string) => {
    await supabase.from('tables').delete().eq('id', tableId);
    loadTables();
  };

  const copyLink = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadQrPng = (canvasId: string, filename: string) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;

    // Create a padded white card canvas with restaurant & table label
    const exportCanvas = document.createElement('canvas');
    const width = 420;
    const height = 500;
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(restaurant.name, width / 2, 55);

    ctx.drawImage(canvas, (width - 280) / 2, 85, 280, 280);

    ctx.fillStyle = '#ea580c';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(filename.replace('.png', '').toUpperCase(), width / 2, 415);

    ctx.fillStyle = '#64748b';
    ctx.font = '15px sans-serif';
    ctx.fillText('Scan with phone camera to view menu & order', width / 2, 450);

    const link = document.createElement('a');
    link.download = filename;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Print-only styling */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-qr-grid, #printable-qr-grid * { visibility: visible; }
          #printable-qr-grid {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            padding: 16px;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tables & QR Code Ordering</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate table-specific QR standees so dine-in guests can scan and order directly.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800"
        >
          <Printer className="h-4 w-4" />
          Print All QR Cards
        </button>
      </div>

      {/* Add Table Form */}
      <form
        onSubmit={handleAddTable}
        className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 no-print"
      >
        <p className="text-sm font-bold text-slate-900">Add Dining Table</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Table Number / Name *
            </label>
            <input
              required
              placeholder="e.g., T-01 or 1"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Floor / Zone</label>
            <input
              placeholder="e.g., Main Dining, AC Hall"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Seating Capacity</label>
            <input
              type="number"
              min={1}
              max={30}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={adding}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {adding ? 'Adding...' : 'Create Table QR'}
            </button>
          </div>
        </div>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      </form>

      {/* QR Standees Grid (General Restaurant QR + Table QRs) */}
      <div id="printable-qr-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* General Restaurant Storefront QR Card */}
        <div className="bg-white rounded-2xl border-2 border-orange-200 p-6 flex flex-col items-center text-center shadow-2xs">
          <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[11px] font-bold uppercase tracking-wider">
            General Menu & Takeaway QR
          </span>

          <div className="mt-3 flex items-center gap-2">
            {restaurant.logo_url && (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="h-7 w-7 rounded-lg object-cover"
              />
            )}
            <h3 className="font-extrabold text-slate-900 text-base">{restaurant.name}</h3>
          </div>

          <div className="my-4 p-3 bg-white rounded-xl border border-slate-200">
            <QRCodeCanvas
              id="qr-canvas-general"
              value={baseStoreUrl}
              size={176}
              level="H"
              fgColor="#0f172a"
            />
          </div>

          <p className="text-xs font-semibold text-slate-700">Scan to Order Online</p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-full">{baseStoreUrl}</p>

          <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-center gap-2 no-print">
            <button
              type="button"
              onClick={() => downloadQrPng('qr-canvas-general', `${restaurant.slug}-menu-qr.png`)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              PNG
            </button>
            <button
              type="button"
              onClick={() => copyLink('general', baseStoreUrl)}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
            >
              {copiedId === 'general' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy URL
                </>
              )}
            </button>
            <a
              href={baseStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-500 hover:text-orange-600 rounded-lg border border-slate-200"
              title="Open Link"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Table-Specific QR Cards */}
        {loading ? (
          <div className="col-span-full py-8 text-center text-sm text-slate-400 no-print">
            Loading tables...
          </div>
        ) : (
          tables.map((table) => {
            const tableUrl = `${baseStoreUrl}?table=${table.id}`;
            const canvasId = `qr-canvas-${table.id}`;

            return (
              <div
                key={table.id}
                className={`bg-white rounded-2xl border p-6 flex flex-col items-center text-center shadow-2xs ${
                  table.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'
                }`}
              >
                <div className="w-full flex items-center justify-between text-xs no-print">
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Users className="h-3.5 w-3.5" />
                    {table.capacity} Seats · {table.floor_or_zone}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleTableActive(table)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      table.is_active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {table.is_active ? 'Active' : 'Disabled'}
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  {restaurant.logo_url && (
                    <img
                      src={restaurant.logo_url}
                      alt={restaurant.name}
                      className="h-6 w-6 rounded-md object-cover"
                    />
                  )}
                  <span className="font-bold text-slate-800 text-sm">{restaurant.name}</span>
                </div>

                <div className="my-3.5 p-3 bg-white rounded-xl border border-slate-200">
                  <QRCodeCanvas
                    id={canvasId}
                    value={tableUrl}
                    size={176}
                    level="H"
                    fgColor="#0f172a"
                  />
                </div>

                <div className="px-3.5 py-1 rounded-full bg-orange-600 text-white font-extrabold text-sm">
                  TABLE {table.table_number}
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Scan to View Menu & Order</p>

                <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-center gap-2 no-print">
                  <button
                    type="button"
                    onClick={() =>
                      downloadQrPng(canvasId, `${restaurant.slug}-table-${table.table_number}.png`)
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => copyLink(table.id, tableUrl)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
                  >
                    {copiedId === table.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Link
                      </>
                    )}
                  </button>
                  <a
                    href={tableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-500 hover:text-orange-600 rounded-lg border border-slate-200"
                    title="Test Table Ordering"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteTable(table.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    title="Delete Table"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
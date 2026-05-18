import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, Medicine, InventoryItem, FactoryLogEntry } from '../lib/types';
import { formatTime, formatDate, formatDateKey, FACTORY_LABELS } from '../lib/types';
import {
  PlusCircle, MinusCircle, AlertCircle, Factory, Loader2, FileDown, RefreshCw, X
} from 'lucide-react';

function openFactoryPDF(factoryLabel: string, operatorName: string, dateKey: string, logs: FactoryLogEntry[]) {
  const dayLogs = logs.filter(l => formatDateKey(l.created_at) === dateKey);
  let html = `<div class="section-title">Stock Movement History - ${dateKey}</div>`;
  if (dayLogs.length === 0) {
    html += `<p style="color:#94a3b8;padding:8px 0;">No activity recorded on this date.</p>`;
  } else {
    html += `<table><thead><tr><th>Exact Time</th><th>Medicine Name</th><th class="center">Type (In/Out)</th><th class="right">Quantity</th></tr></thead><tbody>`;
    dayLogs.forEach(l => {
      html += `<tr><td>${formatTime(l.created_at)}</td><td>${l.medicine_name}</td><td class="center"><span class="${l.log_type === 'In' ? 'badge-in' : 'badge-out'}">${l.log_type}</span></td><td class="right">${l.quantity}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${factoryLabel} - Daily Report</title>
<style>
  @page { margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; font-size: 11px; line-height: 1.5; }
  .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 18px; font-weight: 700; color: #059669; letter-spacing: -0.5px; }
  .header .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  .header .meta { font-size: 10px; color: #94a3b8; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f1f5f9; color: #475569; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .right { text-align: right; }
  .center { text-align: center; }
  .badge-in { color: #059669; font-weight: 600; }
  .badge-out { color: #d97706; font-weight: 600; }
  .section-title { font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 20px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
  .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8; }
</style></head><body>
<div class="header">
  <h1>HomeoPOS</h1>
  <div class="sub">${factoryLabel} - Daily Activity Report</div>
  <div class="meta">Operator: ${operatorName} | Currency: PKR (Rs.) | Date: ${dateKey}</div>
</div>
${html}
<div class="footer">HomeoPOS Cloud ERP - Confidential Report</div>
</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 300);
}

interface FactoryManagerProps {
  user: Profile;
}

export default function FactoryManager({ user }: FactoryManagerProps) {
  const factoryId = user.role === 'factory1' ? 'factory1' : 'factory2';
  const factoryLabel = FACTORY_LABELS[factoryId];

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<FactoryLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [activePopup, setActivePopup] = useState<{ medId: number; type: 'In' | 'Out' } | null>(null);
  const [popupQty, setPopupQty] = useState('');
  const [popupError, setPopupError] = useState('');
  const [popupSuccess, setPopupSuccess] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [medRes, invRes, logRes] = await Promise.all([
      supabase.from('medicines').select('*').order('id'),
      supabase.from('inventory').select('*').eq('factory_id', factoryId).order('id'),
      supabase.from('factory_logs').select('*').eq('factory_id', factoryId).order('created_at', { ascending: false }),
    ]);
    if (medRes.data) setMedicines(medRes.data as Medicine[]);
    if (invRes.data) setInventory(invRes.data as InventoryItem[]);
    if (logRes.data) setLogs(logRes.data as FactoryLogEntry[]);
    setLoading(false);
  }, [factoryId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getStock = (medId: number) => {
    const entry = inventory.find(i => i.medicine_id === medId);
    return entry?.stock_quantity ?? 0;
  };

  const handleStockAction = async () => {
    if (!activePopup || !popupQty) return;
    setPopupError('');
    setPopupSuccess('');

    const qty = parseInt(popupQty);
    if (qty <= 0) {
      setPopupError('Quantity must be a positive number.');
      return;
    }

    const med = medicines.find(m => m.id === activePopup.medId);
    if (!med) return;

    if (activePopup.type === 'Out') {
      const currentStock = getStock(activePopup.medId);
      if (qty > currentStock) {
        setPopupError(`Cannot dispatch ${qty} units. Only ${currentStock} available in stock.`);
        return;
      }
    }

    const invEntry = inventory.find(i => i.medicine_id === activePopup.medId);
    if (!invEntry) return;

    const newQty = activePopup.type === 'In'
      ? invEntry.stock_quantity + qty
      : invEntry.stock_quantity - qty;

    const { error: invError } = await supabase
      .from('inventory')
      .update({ stock_quantity: newQty })
      .eq('id', invEntry.id);

    if (invError) {
      setPopupError('Failed to update inventory. Please try again.');
      return;
    }

    const medLabel = `${med.name}${med.potency ? ' ' + med.potency : ''}`;
    await supabase.from('factory_logs').insert({
      factory_id: factoryId,
      log_type: activePopup.type,
      medicine_name: medLabel,
      quantity: qty,
      operator_name: user.full_name,
    });

    setPopupSuccess(`Successfully recorded ${activePopup.type === 'In' ? 'addition of' : 'dispatch of'} ${qty} units of ${medLabel}.`);
    setTimeout(() => {
      setActivePopup(null);
      setPopupQty('');
      setPopupError('');
      setPopupSuccess('');
    }, 1200);
    fetchData();
  };

  const exportDailyLog = () => {
    const today = new Date().toISOString().split('T')[0];
    openFactoryPDF(factoryLabel, user.full_name, today, logs);
  };

  const dateGroups: Record<string, FactoryLogEntry[]> = {};
  logs.forEach(l => {
    const dk = formatDateKey(l.created_at);
    if (!dateGroups[dk]) dateGroups[dk] = [];
    dateGroups[dk].push(l);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Factory className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">{factoryLabel} Workspace</h1>
            <p className="text-xs text-slate-400">Record production and dispatch movements</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={exportDailyLog} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors">
            <FileDown className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {/* Medicine Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {medicines.map(med => {
          const stock = getStock(med.id);
          const label = `${med.name}${med.potency ? ' ' + med.potency : ''}`;
          return (
            <div key={med.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-800 truncate">{label}</h3>
                {med.potency && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 mt-1">
                    {med.potency}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center mb-4">
                <div className={`text-3xl font-bold tabular-nums ${stock < 50 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {stock}
                </div>
                <span className="text-xs text-slate-400 ml-2 mt-3">units</span>
              </div>

              {stock < 50 && (
                <div className="mb-3 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Low stock alert
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setActivePopup({ medId: med.id, type: 'In' }); setPopupQty(''); setPopupError(''); setPopupSuccess(''); }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium transition-colors border border-emerald-200"
                >
                  <PlusCircle className="w-4 h-4" />
                  Stock In
                </button>
                <button
                  onClick={() => { setActivePopup({ medId: med.id, type: 'Out' }); setPopupQty(''); setPopupError(''); setPopupSuccess(''); }}
                  disabled={stock === 0}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-medium transition-colors border border-amber-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MinusCircle className="w-4 h-4" />
                  Stock Out
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stock Action Popup */}
      {activePopup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { if (!popupSuccess) setActivePopup(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-800">
                {activePopup.type === 'In' ? 'Stock In (Add)' : 'Stock Out (Dispatch)'}
              </h3>
              {!popupSuccess && (
                <button onClick={() => setActivePopup(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <p className="text-sm text-slate-500 mb-4">
              {medicines.find(m => m.id === activePopup.medId)?.name}
              {medicines.find(m => m.id === activePopup.medId)?.potency ? ` ${medicines.find(m => m.id === activePopup.medId)?.potency}` : ''}
              {' '}&mdash; Current stock: <span className="font-semibold text-slate-800">{getStock(activePopup.medId)}</span>
            </p>

            {popupError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {popupError}
              </div>
            )}

            {popupSuccess && (
              <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
                {popupSuccess}
              </div>
            )}

            {!popupSuccess && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={popupQty}
                    onChange={e => setPopupQty(e.target.value)}
                    placeholder="Enter quantity"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center text-lg font-semibold"
                    min="1"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleStockAction}
                  className={`w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                    activePopup.type === 'In'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  {activePopup.type === 'In' ? 'Add to Stock' : 'Dispatch from Stock'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Read-Only Log History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Activity Log (Read-Only)</h2>
          <p className="text-xs text-slate-400 mt-0.5">{logs.length} records</p>
        </div>
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No activity recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {Object.keys(dateGroups).sort().reverse().map(dk => (
              <div key={dk}>
                <div className="px-5 py-2.5 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {formatDate(dk + 'T00:00:00')}
                </div>
                {dateGroups[dk].map(l => (
                  <div key={l.id} className="px-5 py-2.5 flex items-center gap-3 text-sm hover:bg-slate-50/50 transition-colors">
                    <span className="text-xs text-slate-400 font-mono w-20 shrink-0">{formatTime(l.created_at)}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                      l.log_type === 'In' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {l.log_type}
                    </span>
                    <span className="text-slate-700 font-medium truncate">{l.medicine_name}</span>
                    <span className="text-slate-500 shrink-0">x{l.quantity}</span>
                    <span className="text-slate-400 text-xs ml-auto shrink-0">by {l.operator_name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

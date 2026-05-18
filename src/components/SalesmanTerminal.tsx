import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, Medicine, InventoryItem, SalesLedgerEntry } from '../lib/types';
import { formatPKR, formatTime, formatDate, formatDateKey, FACTORY_LABELS } from '../lib/types';
import {
  ShoppingCart, AlertCircle, Receipt, Loader2, FileDown, RefreshCw
} from 'lucide-react';

function openSalesmanPDF(salesmanName: string, dateKey: string, sales: SalesLedgerEntry[]) {
  const daySales = sales.filter(s => formatDateKey(s.created_at) === dateKey);
  let totalPaid = 0;
  let totalPending = 0;

  let html = `<div class="section-title">Shift Sales Summary - ${dateKey}</div>`;
  if (daySales.length === 0) {
    html += `<p style="color:#94a3b8;padding:8px 0;">No sales recorded on this date.</p>`;
  } else {
    html += `<table><thead><tr><th>Customer / Shop Name</th><th>Formula Item</th><th class="right">Quantity</th><th class="right">Paid (Rs.)</th><th class="right">Pending (Rs.)</th></tr></thead><tbody>`;
    daySales.forEach(s => {
      const paid = Number(s.amount_paid);
      const pending = Number(s.amount_pending);
      totalPaid += paid;
      totalPending += pending;
      html += `<tr><td>${s.shop_name}</td><td>${s.medicine_name} ${s.potency_used || ''}</td><td class="right">${s.quantity}</td><td class="right currency">${formatPKR(paid)}</td><td class="right currency">${formatPKR(pending)}</td></tr>`;
    });
    html += `</tbody></table>`;
    html += `<div style="margin-top:12px;padding:8px 0;border-top:1px solid #e2e8f0;">
      <table style="width:auto;"><tbody>
      <tr><td style="font-weight:700;padding-right:16px;">Total Collected:</td><td class="right currency" style="color:#059669;">${formatPKR(totalPaid)}</td></tr>
      <tr><td style="font-weight:700;">Total Pending:</td><td class="right currency" style="color:#d97706;">${formatPKR(totalPending)}</td></tr>
      <tr><td style="font-weight:700;">Grand Total:</td><td class="right currency" style="font-weight:700;font-size:13px;">${formatPKR(totalPaid + totalPending)}</td></tr>
      </tbody></table>
    </div>`;
  }

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Salesman Shift Report - ${dateKey}</title>
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
  .currency { font-weight: 600; }
  .section-title { font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 20px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
  .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8; }
</style></head><body>
<div class="header">
  <h1>HomeoPOS</h1>
  <div class="sub">Salesman Shift Report</div>
  <div class="meta">Salesman: ${salesmanName} | Currency: PKR (Rs.) | Date: ${dateKey}</div>
</div>
${html}
<div class="footer">HomeoPOS Cloud ERP - Confidential Report</div>
</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 300);
}

interface SalesmanTerminalProps {
  user: Profile;
}

export default function SalesmanTerminal({ user }: SalesmanTerminalProps) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SalesLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [shopName, setShopName] = useState('');
  const [sourceFactory, setSourceFactory] = useState<'factory1' | 'factory2'>('factory1');
  const [selectedMedId, setSelectedMedId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [medRes, invRes, salesRes] = await Promise.all([
      supabase.from('medicines').select('*').order('id'),
      supabase.from('inventory').select('*').order('id'),
      supabase.from('sales_ledger').select('*').order('created_at', { ascending: false }),
    ]);
    if (medRes.data) setMedicines(medRes.data as Medicine[]);
    if (invRes.data) setInventory(invRes.data as InventoryItem[]);
    if (salesRes.data) setSales(salesRes.data as SalesLedgerEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getStock = useCallback((medId: number, factoryId: string) => {
    const entry = inventory.find(i => i.medicine_id === medId && i.factory_id === factoryId);
    return entry?.stock_quantity ?? 0;
  }, [inventory]);

  const availableItems = useMemo(() => {
    return medicines.map(med => ({
      ...med,
      stock: getStock(med.id, sourceFactory),
      label: `${med.name}${med.potency ? ' ' + med.potency : ''}`,
    }));
  }, [medicines, sourceFactory, getStock]);

  const selectedMed = medicines.find(m => m.id === Number(selectedMedId));
  const qty = parseInt(quantity) || 0;
  const totalCost = selectedMed ? qty * Number(selectedMed.price) : 0;

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!shopName.trim() || !selectedMedId || !quantity) {
      setError('All fields are required.');
      return;
    }

    const qtyNum = parseInt(quantity);
    if (qtyNum <= 0) {
      setError('Quantity must be at least 1.');
      return;
    }

    const medId = Number(selectedMedId);
    const currentStock = getStock(medId, sourceFactory);
    if (qtyNum > currentStock) {
      setError(`Insufficient stock! Only ${currentStock} units available in ${FACTORY_LABELS[sourceFactory]}.`);
      return;
    }

    const med = medicines.find(m => m.id === medId);
    if (!med) return;

    const medLabel = `${med.name}${med.potency ? ' ' + med.potency : ''}`;
    const amountPaid = isPaid ? totalCost : 0;
    const amountPending = isPaid ? 0 : totalCost;
    const paymentStatus = isPaid ? 'Paid' : 'Unpaid';

    const { error: saleError } = await supabase.from('sales_ledger').insert({
      shop_name: shopName.trim(),
      medicine_name: medLabel,
      potency_used: med.potency,
      quantity: qtyNum,
      amount_paid: amountPaid,
      amount_pending: amountPending,
      payment_status: paymentStatus,
      factory_source: sourceFactory,
    });

    if (saleError) {
      setError('Failed to record sale. Please try again.');
      return;
    }

    const invEntry = inventory.find(i => i.medicine_id === medId && i.factory_id === sourceFactory);
    if (invEntry) {
      await supabase.from('inventory').update({
        stock_quantity: invEntry.stock_quantity - qtyNum,
      }).eq('id', invEntry.id);
    }

    setSuccess(`Bill finalized: ${qtyNum}x ${medLabel} to ${shopName.trim()} - ${paymentStatus}`);
    setShopName('');
    setSelectedMedId('');
    setQuantity('');
    setIsPaid(true);
    setTimeout(() => setSuccess(''), 4000);
    fetchData();
  };

  const exportDailyLog = () => {
    const today = new Date().toISOString().split('T')[0];
    openSalesmanPDF(user.full_name, today, sales);
  };

  const dateGroups: Record<string, SalesLedgerEntry[]> = {};
  sales.forEach(s => {
    const dk = formatDateKey(s.created_at);
    if (!dateGroups[dk]) dateGroups[dk] = [];
    dateGroups[dk].push(s);
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
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Sales Terminal</h1>
            <p className="text-xs text-slate-400">Process retail orders and track payments</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* POS Form */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              New Sale
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleFinalize} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Client / Shop Name</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    placeholder="e.g. City Medical Store"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Source Factory</label>
                  <select
                    value={sourceFactory}
                    onChange={e => { setSourceFactory(e.target.value as 'factory1' | 'factory2'); setSelectedMedId(''); }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                  >
                    <option value="factory1">Factory 1</option>
                    <option value="factory2">Factory 2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Medicine</label>
                <select
                  value={selectedMedId}
                  onChange={e => setSelectedMedId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                  required
                >
                  <option value="">Select medicine...</option>
                  {availableItems.map(item => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={item.stock === 0}
                    >
                      {item.label} - {formatPKR(Number(item.price))} | Stock: {item.stock}
                      {item.stock === 0 ? ' [OUT OF STOCK]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  min="1"
                  required
                />
              </div>

              {/* Payment Toggle */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Payment Status</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPaid(true)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all border-2 ${
                      isPaid
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">&#10003;</span>
                    Mark as FULLY PAID
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPaid(false)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all border-2 ${
                      !isPaid
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">&#9888;</span>
                    Mark as UNPAID
                  </button>
                </div>
              </div>

              {/* Bill Summary */}
              {selectedMed && qty > 0 && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Bill Summary</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-400">Total Cost</div>
                      <div className="font-bold text-slate-800">{formatPKR(totalCost)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">{isPaid ? 'Paid' : 'To Pay'}</div>
                      <div className={`font-bold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {isPaid ? formatPKR(totalCost) : 'Rs. 0'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Pending</div>
                      <div className={`font-bold ${!isPaid ? 'text-amber-600' : 'text-slate-400'}`}>
                        {!isPaid ? formatPKR(totalCost) : 'Rs. 0'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-emerald-600/20"
              >
                Finalize Bill
              </button>
            </form>
          </div>
        </div>

        {/* Shift Log */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Shift Log (Read-Only)</h2>
            <p className="text-xs text-slate-400 mt-0.5">{sales.length} entries</p>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {sales.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No sales recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {Object.keys(dateGroups).sort().reverse().map(dk => (
                  <div key={dk}>
                    <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0">
                      {formatDate(dk + 'T00:00:00')}
                    </div>
                    {dateGroups[dk].map(sale => (
                      <div key={sale.id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-800">{sale.shop_name}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            sale.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {sale.payment_status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {sale.medicine_name} x{sale.quantity} from {sale.factory_source === 'factory1' ? 'F1' : 'F2'}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="text-slate-600">Total: {formatPKR(Number(sale.amount_paid) + Number(sale.amount_pending))}</span>
                          {Number(sale.amount_paid) > 0 && (
                            <span className="text-emerald-600 font-medium">Paid: {formatPKR(Number(sale.amount_paid))}</span>
                          )}
                          {Number(sale.amount_pending) > 0 && (
                            <span className="text-amber-600 font-medium">Due: {formatPKR(Number(sale.amount_pending))}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">{formatTime(sale.created_at)}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

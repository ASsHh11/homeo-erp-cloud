import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, Medicine, InventoryItem, SalesLedgerEntry, FactoryLogEntry } from '../lib/types';
import { ROLE_LABELS, formatPKR, formatTime, formatDate, formatDateKey } from '../lib/types';
import { DollarSign, CreditCard, Package, Plus, Trash2, AlertTriangle, Users, Pencil, Save, X, ChevronDown, FileDown, RefreshCw, Loader2 } from 'lucide-react';

function openPrintWindow(title: string, bodyHtml: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
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
  .badge-paid { color: #059669; font-weight: 600; }
  .badge-unpaid { color: #dc2626; font-weight: 600; }
  .badge-in { color: #059669; font-weight: 600; }
  .badge-out { color: #d97706; font-weight: 600; }
  .section-title { font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 20px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
  .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8; }
  .currency { font-weight: 600; }
</style></head><body>
<div class="header">
  <h1>HomeoPOS</h1>
  <div class="sub">${title}</div>
  <div class="meta">Currency: PKR (Rs.) | Generated: ${new Date().toLocaleString()}</div>
</div>
${bodyHtml}
<div class="footer">HomeoPOS Cloud ERP - Confidential Report</div>
</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 300);
}

export default function OwnerDashboard() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SalesLedgerEntry[]>([]);
  const [factoryLogs, setFactoryLogs] = useState<FactoryLogEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newPotency, setNewPotency] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newFactory, setNewFactory] = useState<'factory1' | 'factory2'>('factory1');
  const [newInitQty, setNewInitQty] = useState('100');

  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editProfileData, setEditProfileData] = useState<Partial<Profile>>({});
  const [editingSale, setEditingSale] = useState<number | null>(null);
  const [editSaleData, setEditSaleData] = useState<Partial<SalesLedgerEntry>>({});
  const [editingLog, setEditingLog] = useState<number | null>(null);
  const [editLogData, setEditLogData] = useState<Partial<FactoryLogEntry>>({});
  const [confirmDeleteMed, setConfirmDeleteMed] = useState<number | null>(null);
  const [confirmDeleteSale, setConfirmDeleteSale] = useState<number | null>(null);
  const [confirmDeleteLog, setConfirmDeleteLog] = useState<number | null>(null);

  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'medicines' | 'sales' | 'factory'>('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [medRes, invRes, salesRes, logRes, profRes] = await Promise.all([
      supabase.from('medicines').select('*').order('id'),
      supabase.from('inventory').select('*').order('id'),
      supabase.from('sales_ledger').select('*').order('created_at', { ascending: false }),
      supabase.from('factory_logs').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('role'),
    ]);
    if (medRes.data) setMedicines(medRes.data as Medicine[]);
    if (invRes.data) setInventory(invRes.data as InventoryItem[]);
    if (salesRes.data) setSales(salesRes.data as SalesLedgerEntry[]);
    if (logRes.data) setFactoryLogs(logRes.data as FactoryLogEntry[]);
    if (profRes.data) setProfiles(profRes.data as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const grossRevenue = sales.reduce((s, x) => s + Number(x.amount_paid), 0);
  const accountsReceivable = sales.reduce((s, x) => s + Number(x.amount_pending), 0);
  const totalStock = inventory.reduce((s, x) => s + x.stock_quantity, 0);

  const getStock = (medId: number, factoryId: string) => {
    const entry = inventory.find(i => i.medicine_id === medId && i.factory_id === factoryId);
    return entry?.stock_quantity ?? 0;
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice) return;
    const initQty = parseInt(newInitQty) || 0;
    const { data: medData } = await supabase.from('medicines').insert({
      name: newName.trim(),
      category: newCategory,
      potency: newPotency || null,
      price: parseFloat(newPrice),
      cost: parseFloat(newCost) || 0,
    }).select().single();
    if (medData) {
      const med = medData as Medicine;
      await supabase.from('inventory').insert([
        { medicine_id: med.id, factory_id: 'factory1', stock_quantity: newFactory === 'factory1' ? initQty : 0 },
        { medicine_id: med.id, factory_id: 'factory2', stock_quantity: newFactory === 'factory2' ? initQty : 0 },
      ]);
      if (initQty > 0) {
        await supabase.from('factory_logs').insert({
          factory_id: newFactory,
          log_type: 'In',
          medicine_name: `${newName.trim()}${newPotency ? ' ' + newPotency : ''}`,
          quantity: initQty,
          operator_name: 'Owner',
        });
      }
    }
    setNewName(''); setNewCategory('General'); setNewPotency(''); setNewPrice(''); setNewCost(''); setNewFactory('factory1'); setNewInitQty('100');
    fetchData();
  };

  const handleDeleteMedicine = async (id: number) => {
    if (confirmDeleteMed !== id) { setConfirmDeleteMed(id); setTimeout(() => setConfirmDeleteMed(null), 3000); return; }
    await supabase.from('medicines').delete().eq('id', id);
    setConfirmDeleteMed(null);
    fetchData();
  };

  const handleSaveProfile = async (id: string) => {
    await supabase.from('profiles').update({
      username: editProfileData.username,
      full_name: editProfileData.full_name,
      password_plain: editProfileData.password_plain,
    }).eq('id', id);
    setEditingProfile(null);
    fetchData();
  };

  const handleSaveSale = async (id: number) => {
    await supabase.from('sales_ledger').update({
      shop_name: editSaleData.shop_name,
      medicine_name: editSaleData.medicine_name,
      quantity: editSaleData.quantity,
      amount_paid: editSaleData.amount_paid,
      amount_pending: editSaleData.amount_pending,
      payment_status: editSaleData.payment_status,
    }).eq('id', id);
    setEditingSale(null);
    fetchData();
  };

  const handleDeleteSale = async (id: number) => {
    if (confirmDeleteSale !== id) { setConfirmDeleteSale(id); setTimeout(() => setConfirmDeleteSale(null), 3000); return; }
    await supabase.from('sales_ledger').delete().eq('id', id);
    setConfirmDeleteSale(null);
    fetchData();
  };

  const handleSaveLog = async (id: number) => {
    await supabase.from('factory_logs').update({
      log_type: editLogData.log_type,
      medicine_name: editLogData.medicine_name,
      quantity: editLogData.quantity,
      operator_name: editLogData.operator_name,
    }).eq('id', id);
    setEditingLog(null);
    fetchData();
  };

  const handleDeleteLog = async (id: number) => {
    if (confirmDeleteLog !== id) { setConfirmDeleteLog(id); setTimeout(() => setConfirmDeleteLog(null), 3000); return; }
    await supabase.from('factory_logs').delete().eq('id', id);
    setConfirmDeleteLog(null);
    fetchData();
  };

  const generatePDF = (dateKey: string) => {
    const daySales = sales.filter(s => formatDateKey(s.created_at) === dateKey);
    const dayLogs = factoryLogs.filter(f => formatDateKey(f.created_at) === dateKey);

    let html = '';

    html += `<div class="section-title">Sales Ledger - ${dateKey}</div>`;
    if (daySales.length === 0) {
      html += `<p style="color:#94a3b8;padding:8px 0;">No sales recorded on this date.</p>`;
    } else {
      html += `<table><thead><tr><th>Time</th><th>Shop / Client</th><th>Medicine</th><th class="right">Qty</th><th class="right">Paid (Rs.)</th><th class="right">Pending (Rs.)</th><th class="center">Status</th><th class="center">Factory</th></tr></thead><tbody>`;
      daySales.forEach(s => {
        html += `<tr><td>${formatTime(s.created_at)}</td><td>${s.shop_name}</td><td>${s.medicine_name} ${s.potency_used || ''}</td><td class="right">${s.quantity}</td><td class="right currency">${formatPKR(Number(s.amount_paid))}</td><td class="right currency">${formatPKR(Number(s.amount_pending))}</td><td class="center"><span class="${s.payment_status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}">${s.payment_status}</span></td><td class="center">${s.factory_source === 'factory1' ? 'F1' : 'F2'}</td></tr>`;
      });
      html += `</tbody></table>`;
    }

    html += `<div class="section-title">Factory Logs - ${dateKey}</div>`;
    if (dayLogs.length === 0) {
      html += `<p style="color:#94a3b8;padding:8px 0;">No factory logs on this date.</p>`;
    } else {
      html += `<table><thead><tr><th>Time</th><th>Factory</th><th>Type</th><th>Medicine</th><th class="right">Qty</th><th>Operator</th></tr></thead><tbody>`;
      dayLogs.forEach(f => {
        html += `<tr><td>${formatTime(f.created_at)}</td><td class="center">${f.factory_id === 'factory1' ? 'F1' : 'F2'}</td><td class="center"><span class="${f.log_type === 'In' ? 'badge-in' : 'badge-out'}">${f.log_type}</span></td><td>${f.medicine_name}</td><td class="right">${f.quantity}</td><td>${f.operator_name}</td></tr>`;
      });
      html += `</tbody></table>`;
    }

    html += `<div class="section-title">Stock Snapshot</div>`;
    html += `<table><thead><tr><th>Medicine</th><th>Potency</th><th class="right">Price (Rs.)</th><th class="right">Factory 1</th><th class="right">Factory 2</th><th class="right">Total</th></tr></thead><tbody>`;
    medicines.forEach(m => {
      const f1 = getStock(m.id, 'factory1');
      const f2 = getStock(m.id, 'factory2');
      html += `<tr><td>${m.name}</td><td>${m.potency || '--'}</td><td class="right currency">${formatPKR(Number(m.price))}</td><td class="right">${f1}</td><td class="right">${f2}</td><td class="right" style="font-weight:700;">${f1 + f2}</td></tr>`;
    });
    html += `</tbody></table>`;

    openPrintWindow(`Daily Report - ${dateKey}`, html);
  };

  const allDates = [...new Set([
    ...sales.map(s => formatDateKey(s.created_at)),
    ...factoryLogs.map(f => formatDateKey(f.created_at)),
  ])].sort().reverse();

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users' },
    { key: 'medicines', label: 'Medicines' },
    { key: 'sales', label: 'Sales Ledger' },
    { key: 'factory', label: 'Factory Logs' },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 shadow-sm overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === t.key ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-slate-500">Gross Cash Collected</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{formatPKR(grossRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-slate-500">Outstanding Arrears</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{formatPKR(accountsReceivable)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-slate-500">Global Combined Stock</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{totalStock.toLocaleString()} units</p>
            </div>
          </div>

          {/* Date-wise Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">Date-wise Timeline History</h2>
              <button onClick={fetchData} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {allDates.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No activity recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {allDates.map(dateKey => {
                  const daySales = sales.filter(s => formatDateKey(s.created_at) === dateKey);
                  const dayLogs = factoryLogs.filter(f => formatDateKey(f.created_at) === dateKey);
                  const isExpanded = expandedDate === dateKey;
                  return (
                    <div key={dateKey}>
                      <button
                        onClick={() => setExpandedDate(isExpanded ? null : dateKey)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          </div>
                          <span className="text-sm font-semibold text-slate-800">{formatDate(dateKey + 'T00:00:00')}</span>
                          <span className="text-xs text-slate-400">{daySales.length} sales, {dayLogs.length} logs</span>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); generatePDF(dateKey); }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors"
                        >
                          <FileDown className="w-3 h-3" /> PDF
                        </button>
                      </button>
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="px-5 pb-4 space-y-2">
                          {dayLogs.map(l => (
                            <div key={`log-${l.id}`} className="flex items-center gap-3 text-xs py-1.5 px-3 bg-slate-50 rounded-lg">
                              <span className="text-slate-400 font-mono w-20 shrink-0">{formatTime(l.created_at)}</span>
                              <span className={`px-2 py-0.5 rounded-full font-medium shrink-0 ${l.log_type === 'In' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                {l.log_type}
                              </span>
                              <span className="text-slate-700">{l.medicine_name}</span>
                              <span className="text-slate-500">x{l.quantity}</span>
                              <span className="text-slate-400">by {l.operator_name}</span>
                              <span className="text-slate-300">({l.factory_id})</span>
                            </div>
                          ))}
                          {daySales.map(s => (
                            <div key={`sale-${s.id}`} className="flex items-center gap-3 text-xs py-1.5 px-3 bg-blue-50/50 rounded-lg">
                              <span className="text-slate-400 font-mono w-20 shrink-0">{formatTime(s.created_at)}</span>
                              <span className="text-blue-700 font-medium shrink-0">SALE</span>
                              <span className="text-slate-700">{s.shop_name}</span>
                              <span className="text-slate-500">{s.medicine_name} x{s.quantity}</span>
                              <span className="text-emerald-600">{formatPKR(Number(s.amount_paid))}</span>
                              {Number(s.amount_pending) > 0 && <span className="text-amber-600">{formatPKR(Number(s.amount_pending))} due</span>}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${s.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {s.payment_status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* USERS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" /> User Profile Management
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Role</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Username</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Full Name</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Password</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        {ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] || p.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {editingProfile === p.id ? (
                        <input value={editProfileData.username || ''} onChange={e => setEditProfileData(d => ({ ...d, username: e.target.value }))}
                          className="px-2 py-1 border border-slate-200 rounded text-sm w-full" />
                      ) : (
                        <span className="font-mono text-slate-700">{p.username}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {editingProfile === p.id ? (
                        <input value={editProfileData.full_name || ''} onChange={e => setEditProfileData(d => ({ ...d, full_name: e.target.value }))}
                          className="px-2 py-1 border border-slate-200 rounded text-sm w-full" />
                      ) : (
                        <span className="text-slate-700">{p.full_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {editingProfile === p.id ? (
                        <input value={editProfileData.password_plain || ''} onChange={e => setEditProfileData(d => ({ ...d, password_plain: e.target.value }))}
                          className="px-2 py-1 border border-slate-200 rounded text-sm w-full" />
                      ) : (
                        <span className="font-mono text-slate-400">{p.password_plain}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {editingProfile === p.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleSaveProfile(p.id)} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingProfile(null)} className="p-1.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-md transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingProfile(p.id); setEditProfileData({ username: p.username, full_name: p.full_name, password_plain: p.password_plain }); }}
                          className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MEDICINES */}
      {activeTab === 'medicines' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" /> Global Medicine Formulation Console
            </h2>
            <form onSubmit={handleAddMedicine} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Formula name"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="General"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Potency (optional)</label>
                <select value={newPotency} onChange={e => setNewPotency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                  <option value="">None</option>
                  <option value="30C">30C</option>
                  <option value="200C">200C</option>
                  <option value="1M">1M</option>
                  <option value="Q">Q</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Price (PKR)</label>
                <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="MSRP"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" min="1" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Init Factory</label>
                <select value={newFactory} onChange={e => setNewFactory(e.target.value as 'factory1' | 'factory2')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                  <option value="factory1">Factory 1</option>
                  <option value="factory2">Factory 2</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Initial Stock Quantity (Units)</label>
                <input type="number" value={newInitQty} onChange={e => setNewInitQty(e.target.value)} placeholder="e.g. 100"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" min="0" required />
              </div>
              <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                Add Medicine
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Master Medicine Control Matrix</h2>
              <p className="text-xs text-slate-400 mt-0.5">{medicines.length} items in catalog</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">#</th>
                    <th className="px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Potency</th>
                    <th className="px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Price</th>
                    <th className="px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Factory 1</th>
                    <th className="px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Factory 2</th>
                    <th className="px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Total</th>
                    <th className="px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medicines.map((med, i) => {
                    const f1 = getStock(med.id, 'factory1');
                    const f2 = getStock(med.id, 'factory2');
                    return (
                      <tr key={med.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{med.name}</td>
                        <td className="px-4 py-2.5">
                          {med.potency ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{med.potency}</span>
                          ) : <span className="text-slate-300">--</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{formatPKR(Number(med.price))}</td>
                        <td className={`px-4 py-2.5 text-right font-mono font-medium ${f1 < 50 ? 'bg-red-50 text-red-700' : 'text-slate-700'}`}>
                          {f1}{f1 < 50 && <AlertTriangle className="inline w-3 h-3 ml-1 text-red-500" />}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono font-medium ${f2 < 50 ? 'bg-red-50 text-red-700' : 'text-slate-700'}`}>
                          {f2}{f2 < 50 && <AlertTriangle className="inline w-3 h-3 ml-1 text-red-500" />}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800">{f1 + f2}</td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => handleDeleteMedicine(med.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                              confirmDeleteMed === med.id ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                            {confirmDeleteMed === med.id ? 'Confirm?' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SALES LEDGER */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Sales Ledger (Full Edit Override)</h2>
              <p className="text-xs text-slate-400 mt-0.5">{sales.length} transactions</p>
            </div>
            <button onClick={fetchData} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {sales.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No sales recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Date/Time</th>
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Shop</th>
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Medicine</th>
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Qty</th>
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Paid</th>
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Pending</th>
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Factory</th>
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map(sale => (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-slate-400">
                        <div>{formatDate(sale.created_at)}</div>
                        <div className="font-mono">{formatTime(sale.created_at)}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        {editingSale === sale.id ? (
                          <input value={editSaleData.shop_name || ''} onChange={e => setEditSaleData(d => ({ ...d, shop_name: e.target.value }))}
                            className="px-2 py-1 border border-slate-200 rounded text-sm w-full" />
                        ) : (
                          <span className="font-medium text-slate-800">{sale.shop_name}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {editingSale === sale.id ? (
                          <input value={editSaleData.medicine_name || ''} onChange={e => setEditSaleData(d => ({ ...d, medicine_name: e.target.value }))}
                            className="px-2 py-1 border border-slate-200 rounded text-sm w-full" />
                        ) : (
                          <span className="text-slate-600">{sale.medicine_name} {sale.potency_used || ''}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {editingSale === sale.id ? (
                          <input type="number" value={editSaleData.quantity || 0} onChange={e => setEditSaleData(d => ({ ...d, quantity: parseInt(e.target.value) }))}
                            className="px-2 py-1 border border-slate-200 rounded text-sm w-16 text-right" />
                        ) : (
                          <span className="text-slate-700">{sale.quantity}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-600">
                        {editingSale === sale.id ? (
                          <input type="number" value={editSaleData.amount_paid || 0} onChange={e => setEditSaleData(d => ({ ...d, amount_paid: parseFloat(e.target.value) }))}
                            className="px-2 py-1 border border-slate-200 rounded text-sm w-20 text-right" />
                        ) : (
                          formatPKR(Number(sale.amount_paid))
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-amber-600">
                        {editingSale === sale.id ? (
                          <input type="number" value={editSaleData.amount_pending || 0} onChange={e => setEditSaleData(d => ({ ...d, amount_pending: parseFloat(e.target.value) }))}
                            className="px-2 py-1 border border-slate-200 rounded text-sm w-20 text-right" />
                        ) : (
                          formatPKR(Number(sale.amount_pending))
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {editingSale === sale.id ? (
                          <select value={editSaleData.payment_status || 'Paid'} onChange={e => setEditSaleData(d => ({ ...d, payment_status: e.target.value as 'Paid' | 'Unpaid' }))}
                            className="px-2 py-1 border border-slate-200 rounded text-sm bg-white">
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sale.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {sale.payment_status}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sale.factory_source === 'factory1' ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'}`}>
                          {sale.factory_source === 'factory1' ? 'F1' : 'F2'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {editingSale === sale.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleSaveSale(sale.id)} className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors">
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingSale(null)} className="p-1 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => { setEditingSale(sale.id); setEditSaleData({ shop_name: sale.shop_name, medicine_name: sale.medicine_name, quantity: sale.quantity, amount_paid: Number(sale.amount_paid), amount_pending: Number(sale.amount_pending), payment_status: sale.payment_status }); }}
                              className="p-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSale(sale.id)}
                              className={`p-1 rounded transition-colors ${confirmDeleteSale === sale.id ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* FACTORY LOGS */}
      {activeTab === 'factory' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Factory Logs (Full Edit Override)</h2>
              <p className="text-xs text-slate-400 mt-0.5">{factoryLogs.length} records</p>
            </div>
            <button onClick={fetchData} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {factoryLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No factory logs recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Date/Time</th>
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Factory</th>
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Type</th>
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Medicine</th>
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Qty</th>
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider">Operator</th>
                    <th className="px-3 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {factoryLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-slate-400">
                        <div>{formatDate(log.created_at)}</div>
                        <div className="font-mono">{formatTime(log.created_at)}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${log.factory_id === 'factory1' ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'}`}>
                          {log.factory_id === 'factory1' ? 'F1' : 'F2'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {editingLog === log.id ? (
                          <select value={editLogData.log_type || 'In'} onChange={e => setEditLogData(d => ({ ...d, log_type: e.target.value as 'In' | 'Out' }))}
                            className="px-2 py-1 border border-slate-200 rounded text-sm bg-white">
                            <option value="In">In</option>
                            <option value="Out">Out</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${log.log_type === 'In' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {log.log_type}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {editingLog === log.id ? (
                          <input value={editLogData.medicine_name || ''} onChange={e => setEditLogData(d => ({ ...d, medicine_name: e.target.value }))}
                            className="px-2 py-1 border border-slate-200 rounded text-sm w-full" />
                        ) : (
                          <span className="text-slate-700">{log.medicine_name}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {editingLog === log.id ? (
                          <input type="number" value={editLogData.quantity || 0} onChange={e => setEditLogData(d => ({ ...d, quantity: parseInt(e.target.value) }))}
                            className="px-2 py-1 border border-slate-200 rounded text-sm w-16 text-right" />
                        ) : (
                          <span className="text-slate-700">{log.quantity}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {editingLog === log.id ? (
                          <input value={editLogData.operator_name || ''} onChange={e => setEditLogData(d => ({ ...d, operator_name: e.target.value }))}
                            className="px-2 py-1 border border-slate-200 rounded text-sm w-full" />
                        ) : (
                          <span className="text-slate-500 text-xs">{log.operator_name}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {editingLog === log.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleSaveLog(log.id)} className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors">
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingLog(null)} className="p-1 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => { setEditingLog(log.id); setEditLogData({ log_type: log.log_type, medicine_name: log.medicine_name, quantity: log.quantity, operator_name: log.operator_name }); }}
                              className="p-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className={`p-1 rounded transition-colors ${confirmDeleteLog === log.id ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

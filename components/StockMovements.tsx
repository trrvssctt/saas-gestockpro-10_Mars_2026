
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowUpCircle, ArrowDownCircle, RefreshCw, Plus, Search, 
  History, TrendingUp, Filter, Calendar, X, Check, Boxes,
  Loader2, ArrowRight, Package, User as UserIcon, SlidersHorizontal,
  Download, FileText, Printer, MapPin, Phone, Mail, ShieldAlert, Lock,
  CheckCircle2, Info, Trash2, ChevronDown
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { apiClient } from '../services/api';
import { StockItem } from '../types';

const StockMovements = ({ currency, tenantSettings }: { currency: string, tenantSettings?: any }) => {
  const [movements, setMovements] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInModal, setShowInModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeInventory, setActiveInventory] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '', 
    dateFrom: '', 
    dateTo: '', 
    type: 'ALL',
    operator: '',
    reason: 'ALL'
  });

  const [bulkInForm, setBulkInForm] = useState({
    items: [] as { productId: string, quantity: number }[],
    reason: 'Réapprovisionnement standard',
    reference: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [movs, stats, items, campaigns] = await Promise.all([
        apiClient.get('/stock/movements'),
        apiClient.get('/stock/movements/stats'),
        apiClient.get('/stock'),
        apiClient.get('/stock/campaigns')
      ]);
      setMovements(movs || []);
      setChartData((stats || []).map((s: any) => ({
        day: new Date(s.day).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        Entrées: parseInt(s.totalIn || 0), Sorties: parseInt(s.totalOut || 0)
      })));
      setStocks(items || []);
      setActiveInventory(campaigns.find((c: any) => c.status === 'DRAFT'));
    } catch (err) {
      console.error("Kernel Sync Error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleBulkIn = async () => {
    if (bulkInForm.items.length === 0) return;
    setActionLoading(true);
    try {
      await apiClient.post('/stock/movements/bulk-in', bulkInForm);
      setShowInModal(false);
      setBulkInForm({ items: [], reason: 'Réapprovisionnement standard', reference: '' });
      fetchData();
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  const addItemToBulk = (id: string) => {
    if (bulkInForm.items.find(i => i.productId === id)) return;
    setBulkInForm({ ...bulkInForm, items: [...bulkInForm.items, { productId: id, quantity: 1 }] });
  };

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const p = m.stock_item || m.stockItem || m.StockItem;
      const mDate = new Date(m.createdAt).toISOString().split('T')[0];
      
      const matchesSearch = (p?.name || '').toLowerCase().includes(filters.search.toLowerCase()) || 
                           (p?.sku || '').toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesType = filters.type === 'ALL' || m.type === filters.type;
      const matchesFrom = filters.dateFrom === '' || mDate >= filters.dateFrom;
      const matchesTo = filters.dateTo === '' || mDate <= filters.dateTo;
      const matchesOperator = filters.operator === '' || (m.userRef || '').toLowerCase().includes(filters.operator.toLowerCase());
      
      const matchesReason = filters.reason === 'ALL' || 
                           (filters.reason === 'MANUAL' && (m.reason || '').includes('MANUEL')) ||
                           (filters.reason === 'SALE' && (m.reason || '').toLowerCase().includes('vente')) ||
                           (filters.reason === 'ADJUST' && m.type === 'ADJUSTMENT');

      return matchesSearch && matchesType && matchesFrom && matchesTo && matchesOperator && matchesReason;
    });
  }, [movements, filters]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {activeInventory && (
        <div className="absolute inset-0 z-50 bg-slate-50/60 backdrop-blur-sm flex items-center justify-center p-6 rounded-[3rem]">
           <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-4 border-indigo-600 max-w-lg text-center space-y-8 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
                <History size={48} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 uppercase">Flux Suspendus</h3>
              <p className="text-sm text-slate-500 font-medium uppercase leading-relaxed">Inventaire en cours : {activeInventory.name}</p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center gap-3">
                 <Lock size={16} className="text-slate-400" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registre temporairement scellé</span>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
        <div className="lg:col-span-4 grid grid-cols-1 gap-6">
           <div className="bg-emerald-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><ArrowUpCircle size={80}/></div>
              <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1">Logistique Entrées</p>
              <h3 className="text-3xl font-black">Réception</h3>
           </div>
           <div className="bg-rose-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><ArrowDownCircle size={80}/></div>
              <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-1">Audit des Sorties</p>
              <h3 className="text-3xl font-black">Expédition</h3>
           </div>
        </div>

        <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <div className="h-60 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData}>
                      <defs>
                         <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                         <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold'}} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Area type="monotone" dataKey="Entrées" stroke="#10b981" fill="url(#colorIn)" strokeWidth={3} />
                      <Area type="monotone" dataKey="Sorties" stroke="#f43f5e" fill="url(#colorOut)" strokeWidth={3} />
                   </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-widest">Calcul de vélocité...</div>
              )}
           </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <History className="text-indigo-600" size={32} /> Registre des Flux
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">Traçabilité logistique intégrale</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-4 rounded-2xl transition-all shadow-sm flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${showFilters ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 hover:text-indigo-600'}`}
          >
            <Filter size={20} /> FILTRES {filteredMovements.length !== movements.length && <span className="bg-white text-indigo-600 w-4 h-4 rounded-full flex items-center justify-center text-[8px]">!</span>}
          </button>
          <button onClick={() => setShowInModal(true)} disabled={!!activeInventory} className={`px-8 py-4 rounded-2xl font-black transition-all shadow-xl flex items-center gap-3 text-xs uppercase tracking-widest ${activeInventory ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}>
            <Plus size={18} /> RÉAPPROVISIONNER
          </button>
          <button onClick={fetchData} className="p-4 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all shadow-sm">
             <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ZONE FILTRES AVANCÉS */}
      {showFilters && (
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl animate-in slide-in-from-top-4 duration-300 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Article / SKU</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input type="text" placeholder="Rechercher produit..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Type de Flux</label>
              <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                <option value="ALL">Tous les flux</option>
                <option value="IN">ENTRÉES (+)</option>
                <option value="OUT">SORTIES (-)</option>
                <option value="ADJUSTMENT">AJUSTEMENTS</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Motif / Source</label>
              <select value={filters.reason} onChange={e => setFilters({...filters, reason: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                <option value="ALL">Tous les motifs</option>
                <option value="MANUAL">MANUEL</option>
                <option value="SALE">VENTES</option>
                <option value="ADJUST">INVENTAIRE</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Opérateur</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input type="text" placeholder="Nom opérateur..." value={filters.operator} onChange={e => setFilters({...filters, operator: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-xs font-bold outline-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Période (Du)</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input type="date" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-xs font-bold outline-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Période (Au)</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input type="date" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-xs font-bold outline-none" />
              </div>
            </div>
            <div className="flex items-end">
              <button onClick={() => setFilters({search:'', dateFrom:'', dateTo:'', type:'ALL', operator:'', reason:'ALL'})} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all">RÉINITIALISER LES FILTRES</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
             <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b">
                   <th className="px-10 py-6">Horodatage</th>
                   <th className="px-10 py-6">Article / Référence</th>
                   <th className="px-10 py-6">Source / Motif</th>
                   <th className="px-10 py-6 text-center">Action</th>
                   <th className="px-10 py-6 text-right">Mouvement</th>
                   <th className="px-10 py-6 text-right">Opérateur</th>
                   <th className="px-10 py-6 text-right">Solde Final</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {loading ? (
                   <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></td></tr>
                ) : filteredMovements.length === 0 ? (
                   <tr><td colSpan={7} className="py-20 text-center text-slate-300 uppercase font-black text-[10px]">Aucun flux trouvé dans les critères</td></tr>
                ) : filteredMovements.map((m: any) => {
                   const p = m.stock_item || m.stockItem || m.StockItem;
                   return (
                   <tr key={m.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-10 py-6">
                         <p className="text-xs font-black text-slate-800">{new Date(m.createdAt).toLocaleDateString()}</p>
                         <p className="text-[9px] text-slate-400 font-bold">{new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </td>
                      <td className="px-10 py-6">
                         <p className="text-sm font-black text-slate-900 uppercase truncate max-w-[180px]">{p?.name || 'Article Inconnu'}</p>
                         <p className="text-[8px] font-mono text-slate-400 font-bold uppercase tracking-tighter">SKU: {p?.sku || 'N/A'}</p>
                      </td>
                      <td className="px-10 py-6">
                         <p className="text-[10px] font-black text-slate-600 uppercase">{m.reason || 'MANUEL'}</p>
                         <p className="text-[8px] text-indigo-400 font-bold mt-1 uppercase tracking-widest">Ref: {m.referenceId || 'GSP-AUTO'}</p>
                      </td>
                      <td className="px-10 py-6 text-center">
                         <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase border ${m.type === 'IN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : m.type === 'ADJUSTMENT' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                            {m.type === 'IN' ? 'ENTRÉE' : m.type === 'ADJUSTMENT' ? 'AJUSTEMENT' : 'SORTIE'}
                         </span>
                      </td>
                      <td className={`px-10 py-6 text-right font-black text-base ${m.type === 'IN' ? 'text-emerald-600' : m.type === 'ADJUSTMENT' ? 'text-amber-600' : 'text-rose-600'}`}>
                         {m.type === 'IN' ? '+' : ''}{m.qty}
                      </td>
                      <td className="px-10 py-6 text-right">
                         <p className="text-[10px] font-black text-slate-600 uppercase">{m.userRef || 'Kernel'}</p>
                      </td>
                      <td className="px-10 py-6 text-right font-black text-slate-400">
                         {m.newLevel}
                      </td>
                   </tr>
                )})}
             </tbody>
          </table>
        </div>
      </div>

      {/* MODAL RÉAPPROVISIONNEMENT PAR LOTS */}
      {showInModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-500">
              <div className="px-10 py-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-4"><Boxes size={28}/><h3 className="text-xl font-black uppercase tracking-tight">Réception Stock</h3></div>
                 <button onClick={() => setShowInModal(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24}/></button>
              </div>
              <div className="flex-1 grid grid-cols-12 overflow-hidden">
                 <div className="col-span-7 border-r border-slate-100 flex flex-col bg-slate-50/30">
                    <div className="flex-1 overflow-y-auto p-8 space-y-3 custom-scrollbar">
                       {stocks.map(item => (
                          <button key={item.id} onClick={() => addItemToBulk(item.id)} className="w-full p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-500 transition-all active:scale-95">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Package size={20}/></div>
                                <div className="text-left"><p className="text-xs font-black text-slate-800 uppercase">{item.name}</p><p className="text-[9px] text-slate-400 font-bold">SKU: {item.sku}</p></div>
                             </div>
                             <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">AJOUTER</span>
                          </button>
                       ))}
                    </div>
                 </div>
                 <div className="col-span-5 flex flex-col bg-white">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center"><h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Saisie par lot</h4><span className="text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">{bulkInForm.items.length} items</span></div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                       {bulkInForm.items.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-40"><ArrowUpCircle size={40}/><p className="text-[9px] font-black uppercase">Cliquez sur un article à gauche</p></div>
                       ) : bulkInForm.items.map((entry, i) => {
                          const product = stocks.find(s => s.id === entry.productId);
                          return (
                             <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                                <div className="flex-1 overflow-hidden pr-4"><p className="text-[10px] font-black text-slate-800 uppercase truncate">{product?.name}</p></div>
                                <div className="flex items-center gap-3">
                                   <input type="number" min="1" value={entry.quantity} onChange={e => setBulkInForm({...bulkInForm, items: bulkInForm.items.map((it, idx) => idx === i ? {...it, quantity: parseInt(e.target.value) || 0} : it)})} className="w-20 bg-white border border-slate-200 rounded-xl px-2 py-2 text-center text-xs font-black outline-none focus:ring-4 focus:ring-indigo-500/10" />
                                   <button onClick={() => setBulkInForm({...bulkInForm, items: bulkInForm.items.filter((_, idx) => idx !== i)})} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                    <div className="p-8 bg-slate-900 text-white space-y-4">
                       <input type="text" placeholder="Référence Bon de Livraison" value={bulkInForm.reference} onChange={e => setBulkInForm({...bulkInForm, reference: e.target.value.toUpperCase()})} className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-3 text-xs font-bold outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all" />
                       <button onClick={handleBulkIn} disabled={actionLoading || bulkInForm.items.length === 0} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                          {actionLoading ? <Loader2 className="animate-spin" /> : <>SCELLER LA RÉCEPTION <CheckCircle2 size={18}/></>}
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StockMovements;

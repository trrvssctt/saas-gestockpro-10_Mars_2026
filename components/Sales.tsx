import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Eye, X, RefreshCw, ShoppingCart, Wallet, 
  Loader2, DollarSign, Trash2, ArrowRight,
  Package, PlusCircle, MinusCircle, FileText, 
  CheckCircle, Printer, Truck, Sparkles, Receipt,
  History, Info, ChevronRight, Ban, Boxes, CreditCard,
  Plus as PlusSmall, Minus as MinusSmall, FileDown,
  Download,
  RotateCcw, AlertTriangle, Edit3, Save, Lock, Clock, Zap, ShieldAlert,
  User as UserIcon, CheckCircle2, Percent, ClipboardList, Filter, Calendar,
  ChevronDown
} from 'lucide-react';
import { apiClient } from '../services/api';
import { authBridge } from '../services/authBridge';
import { User, StockItem, Customer, SubscriptionPlan } from '../types';
import DocumentPreview from './DocumentPreview';

const Sales = ({ currency, user, tenantSettings, plan }: { currency: string, user: User, tenantSettings?: any, plan?: SubscriptionPlan }) => {
  const [sales, setSales] = useState<any[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editModeId, setEditModeId] = useState<string | null>(null);
  const [cartTab, setCartTab] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [showPaymentModal, setShowPaymentModal] = useState<any>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState<any>(null);
  const [showDocGenerator, setShowDocGenerator] = useState<{ sale: any, mode: 'FACTURE' | 'RECU' | 'BON_SORTIE' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<any>(null);
  const [pageSize, setPageSize] = useState<number>(30);
  const [activeInventory, setActiveInventory] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filtres
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    customerId: 'ALL',
    dateFrom: '',
    dateTo: '',
    paymentState: 'ALL', // ALL, PAID, UNPAID, PARTIAL
    deliveryState: 'ALL'  // ALL, DELIVERED, PENDING, PARTIAL
  });

  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'CASH', reference: '' });
  const [deliveryQuantities, setDeliveryQuantities] = useState<Record<string, number>>({});
  const [cancelForm, setCancelForm] = useState({ reason: '', returnToStock: {} as Record<string, number> });

  const [saleForm, setSaleForm] = useState({
    customerId: '', 
    paymentMethod: 'CASH',
    amountPaid: 0,
    items: [] as { productId: string, quantity: number, price: number, name: string, type: 'PRODUCT' | 'SERVICE' }[]
  });

  let limit = 99999;
  if (plan?.id === 'FREE_TRIAL') limit = 5;
  else if (plan?.id === 'BASIC') limit = 20;
  else if (plan?.id === 'PRO') limit = 50;

  const now = new Date();
  const monthlySalesCount = sales.filter(s => {
    const d = new Date(s.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const salesAllowed = authBridge.isCreationAllowed(user, 'sales', monthlySalesCount);
  const isLimitReached = !salesAllowed;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesData, stocksData, srvData, customersData, campaigns] = await Promise.all([
        apiClient.get('/sales'),
        apiClient.get('/stock'),
        apiClient.get('/services'),
        apiClient.get('/customers'),
        apiClient.get('/stock/campaigns')
      ]);
      setSales(salesData || []);
      setStocks(stocksData || []);
      setServices((srvData || []).filter((s: any) => s.isActive));
      setCustomers(customersData || []);
      setActiveInventory(campaigns.find((c: any) => c.status === 'DRAFT'));
    } catch (err) {
      console.error("Kernel Sync Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getRates = (sale: any) => {
    const total = parseFloat(sale.totalTtc);
    const paid = parseFloat(sale.amountPaid);
    const payRate = Math.min(100, Math.round((paid / (total || 1)) * 100));

    const productItems = (sale.items || []).filter((i: any) => i.stock_item_id || i.stockItemId);
    const totalQty = productItems.reduce((sum: number, i: any) => sum + i.quantity, 0);
    const deliveredQty = productItems.reduce((sum: number, i: any) => sum + (i.quantityDelivered || 0), 0);
    const delivRate = totalQty > 0 ? Math.min(100, Math.round((deliveredQty / totalQty) * 100)) : 100;

    return { payRate, delivRate, isDeliverable: productItems.length > 0 };
  };

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const { payRate, delivRate } = getRates(sale);
      const sDate = new Date(sale.createdAt).toISOString().split('T')[0];
      
      const matchesSearch = (sale.reference || '').toLowerCase().includes(filters.search.toLowerCase()) || 
                           (sale.customer?.companyName || '').toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesStatus = filters.status === 'ALL' || sale.status === filters.status;
      const matchesCustomer = filters.customerId === 'ALL' || sale.customer_id === filters.customerId;
      const matchesFrom = filters.dateFrom === '' || sDate >= filters.dateFrom;
      const matchesTo = filters.dateTo === '' || sDate <= filters.dateTo;
      
      const matchesPayment = filters.paymentState === 'ALL' || 
                            (filters.paymentState === 'PAID' && payRate === 100) ||
                            (filters.paymentState === 'UNPAID' && payRate === 0) ||
                            (filters.paymentState === 'PARTIAL' && payRate > 0 && payRate < 100);
                            
      const matchesDelivery = filters.deliveryState === 'ALL' ||
                             (filters.deliveryState === 'DELIVERED' && delivRate === 100) ||
                             (filters.deliveryState === 'PENDING' && delivRate === 0) ||
                             (filters.deliveryState === 'PARTIAL' && delivRate > 0 && delivRate < 100);

      return matchesSearch && matchesStatus && matchesCustomer && matchesFrom && matchesTo && matchesPayment && matchesDelivery;
    });
  }, [sales, filters]);

  const visibleSales = useMemo(() => {
    let filtered = filteredSales;
    if (plan?.id === 'BASIC') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(s => new Date(s.createdAt) >= sevenDaysAgo);
    }
    if (pageSize === -1) return filtered;
    return filtered.slice(0, pageSize);
  }, [filteredSales, plan, pageSize]);

  const addToCart = (item: any, type: 'PRODUCT' | 'SERVICE') => {
    const existing = saleForm.items.find(i => i.productId === item.id && i.type === type);
    if (existing) {
      setSaleForm({
        ...saleForm,
        items: saleForm.items.map(i => i.productId === item.id && i.type === type ? { ...i, quantity: i.quantity + 1 } : i)
      });
    } else {
      setSaleForm({
        ...saleForm,
        items: [...saleForm.items, { 
          productId: item.id, 
          quantity: 1, 
          price: type === 'PRODUCT' ? parseFloat(item.unitPrice) : parseFloat(item.price), 
          name: item.name,
          type 
        }]
      });
    }
  };

  const updateCartQty = (idx: number, delta: number) => {
    const newItems = [...saleForm.items];
    newItems[idx].quantity = Math.max(1, newItems[idx].quantity + delta);
    setSaleForm({ ...saleForm, items: newItems });
  };

  const removeFromCart = (idx: number) => {
    setSaleForm({ ...saleForm, items: saleForm.items.filter((_, i) => i !== idx) });
  };

  const cartTotal = useMemo(() => {
    return saleForm.items.reduce((sum, i) => sum + (i.price * i.quantity), 0) * 1.18;
  }, [saleForm.items]);

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeInventory) return alert("Ventes bloquées durant l'inventaire.");
    if (saleForm.items.length === 0) return alert("Le panier est vide.");
    setActionLoading(true);
      try {
      if (!editModeId && !authBridge.isCreationAllowed(user, 'sales', monthlySalesCount)) {
        if (plan?.id === 'PRO') alert('Limite du plan PRO atteinte : maximum 50 ventes par mois.');
        else alert('Limite du plan Basic atteinte : maximum 20 ventes par mois.');
        setActionLoading(false);
        return;
      }
      if (editModeId) {
        await apiClient.put(`/sales/${editModeId}`, { customerId: saleForm.customerId || null, items: saleForm.items });
      } else {
        await apiClient.post('/sales', { 
          customerId: saleForm.customerId || null, 
          items: saleForm.items, 
          amountPaid: parseFloat(saleForm.amountPaid.toString()), 
          paymentMethod: saleForm.paymentMethod 
        });
      }
      setShowCreateModal(false);
      setEditModeId(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (paymentForm.amount <= 0) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/sales/${showPaymentModal.id}/payments`, paymentForm);
      setShowPaymentModal(null);
      setSelectedSaleDetails(null);
      fetchData();
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  const handleDelivery = async () => {
    const itemsToDeliver = Object.entries(deliveryQuantities).map(([itemId, qty]) => ({ itemId, qtyToDeliver: qty }));
    if (itemsToDeliver.length === 0) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/sales/${showDeliveryModal.id}/delivery`, { items: itemsToDeliver });
      setShowDeliveryModal(null);
      setSelectedSaleDetails(null);
      fetchData();
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  const handleCancelSale = async () => {
    if (!cancelForm.reason) return alert("Raison obligatoire.");
    setActionLoading(true);
    try {
      await apiClient.post(`/sales/${showCancelModal.id}/cancel`, { 
        reason: cancelForm.reason, 
        returnToStockMap: cancelForm.returnToStock 
      });
      setShowCancelModal(null);
      setSelectedSaleDetails(null);
      fetchData();
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  const handleEditSaleRequest = (sale: any) => {
    setEditModeId(sale.id);
    const formattedItems = sale.items.map((item: any) => ({
      productId: item.stock_item_id || item.stockItemId || item.service_id || item.serviceId,
      quantity: item.quantity,
      price: parseFloat(item.unitPrice),
      name: item.stock_item?.name || item.service?.name || item.name,
      type: item.service_id ? 'SERVICE' as const : 'PRODUCT' as const
    }));
    setSaleForm({
      customerId: sale.customer_id || sale.customerId || '',
      paymentMethod: 'CASH',
      amountPaid: parseFloat(sale.amountPaid),
      items: formattedItems
    });
    setSelectedSaleDetails(null);
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {activeInventory && (
        <div className="absolute inset-0 z-50 bg-slate-50/60 backdrop-blur-sm flex items-center justify-center p-6 rounded-[3rem]">
           <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-4 border-indigo-600 max-w-lg text-center space-y-8 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
                <ShoppingCart size={48} />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Ventes Suspendues</h3>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Inventaire en cours : {activeInventory.name}</p>
              </div>
              <p className="text-sm text-slate-500 font-medium leading-relaxed uppercase">
                Toutes les opérations commerciales sont suspendues pour garantir l'intégrité de l'audit physique.
              </p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center gap-3">
                 <Lock size={16} className="text-slate-400" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registre temporairement scellé</span>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <ShoppingCart className="text-indigo-600" size={32} /> Registre des Ventes
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">
            Management hybride {plan?.id === 'BASIC' && '• 7 derniers jours'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={() => setShowFilters(!showFilters)} className={`p-4 rounded-2xl transition-all shadow-sm flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${showFilters ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 hover:text-indigo-600'}`}>
            <Filter size={20} /> FILTRES {filteredSales.length !== sales.length && <span className="bg-white text-indigo-600 w-4 h-4 rounded-full flex items-center justify-center text-[8px]">!</span>}
          </button>
          <button onClick={fetchData} className="p-4 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all shadow-sm">
             <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          {isLimitReached ? (
             <div className="flex items-center gap-3 px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-[10px] font-black uppercase tracking-widest shadow-sm">
                <Lock size={16} /> Limite {limit} ventes atteinte
             </div>
          ) : (
            <button 
              onClick={() => { if (activeInventory) return; setEditModeId(null); setSaleForm({ customerId: '', paymentMethod: 'CASH', amountPaid: 0, items: [] }); setShowCreateModal(true); }} 
              disabled={!!activeInventory}
              className={`px-10 py-5 rounded-[1.5rem] font-black transition-all shadow-xl flex items-center gap-3 text-xs uppercase tracking-widest active:scale-95 ${activeInventory ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
            >
              <Plus size={18} /> CRÉER UNE VENTE
            </button>
          )}
        </div>
      </div>

      {/* ZONE FILTRES AVANCÉS */}
      {showFilters && (
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl animate-in slide-in-from-top-4 duration-300 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Recherche libre</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input type="text" placeholder="Ref, Client..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Statut Transactionnel</label>
              <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                <option value="ALL">Tous les statuts</option>
                <option value="EN_COURS">EN COURS</option>
                <option value="TERMINE">TERMINÉ</option>
                <option value="ANNULE">ANNULÉ</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Client</label>
              <select value={filters.customerId} onChange={e => setFilters({...filters, customerId: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                <option value="ALL">Tous les clients</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">État de Paiement</label>
              <select value={filters.paymentState} onChange={e => setFilters({...filters, paymentState: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                <option value="ALL">Tout</option>
                <option value="PAID">Totalement Payé</option>
                <option value="PARTIAL">Partiel</option>
                <option value="UNPAID">Non Payé</option>
              </select>
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
              <button onClick={() => setFilters({search:'', status:'ALL', customerId:'ALL', dateFrom:'', dateTo:'', paymentState:'ALL', deliveryState:'ALL'})} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all">RÉINITIALISER</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b">
                <th className="px-8 py-6">Référence</th>
                <th className="px-8 py-6">Client</th>
                <th className="px-8 py-6 text-center">Taux Paiement</th>
                <th className="px-8 py-6 text-center">Taux Livraison</th>
                <th className="px-8 py-6 text-right">Montant TTC</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" size={40} /></td></tr>
              ) : visibleSales.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center font-black text-slate-300 uppercase text-[10px]">Aucune vente trouvée</td></tr>
              ) : visibleSales.map((sale) => {
                const { payRate, delivRate } = getRates(sale);
                const isAnnule = sale.status === 'ANNULE';
                return (
                  <tr key={sale.id} className={`hover:bg-slate-50/50 transition-all group ${isAnnule ? 'bg-rose-50/20 opacity-60' : ''}`}>
                    <td className="px-8 py-6">
                      <p className={`font-mono text-xs font-black ${isAnnule ? 'text-rose-400 line-through' : 'text-indigo-600'}`}>#{sale.reference}</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1">{new Date(sale.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <p className={`font-black text-slate-800 text-sm uppercase truncate max-w-[150px] ${isAnnule ? 'text-slate-400' : ''}`}>
                          {sale.customer?.companyName || 'VENTE DIRECTE'}
                        </p>
                        {isAnnule && <span className="bg-rose-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">ANNULÉ</span>}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col items-center gap-1.5">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                             <div className={`h-full transition-all duration-700 ${isAnnule ? 'bg-slate-300' : payRate === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${payRate}%` }}></div>
                          </div>
                          <span className={`text-[8px] font-black ${isAnnule ? 'text-slate-400' : payRate === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{payRate}% PAYÉ</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col items-center gap-1.5">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                             <div className={`h-full transition-all duration-700 ${isAnnule ? 'bg-slate-300' : delivRate === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${delivRate}%` }}></div>
                          </div>
                          <span className={`text-[8px] font-black ${isAnnule ? 'text-slate-400' : delivRate === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>{delivRate}% LIVRÉ</span>
                       </div>
                    </td>
                    <td className={`px-8 py-6 text-right font-black ${isAnnule ? 'text-slate-400' : 'text-slate-900'}`}>
                      {parseFloat(sale.totalTtc).toLocaleString()} {currency}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button onClick={() => setSelectedSaleDetails(sale)} className={`p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm transition-all ${isAnnule ? 'text-rose-400 hover:text-rose-600' : 'text-slate-400 hover:text-indigo-600'}`}><Eye size={16}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRÉATION / ÉDITION DE VENTE */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-6xl rounded-[4rem] shadow-2xl overflow-hidden flex h-[85vh] animate-in zoom-in-95 duration-500">
             <div className="w-2/3 border-r border-slate-100 flex flex-col bg-slate-50/50">
                <div className="p-8 space-y-6">
                   <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-slate-100 w-fit">
                      <button onClick={() => setCartTab('PRODUCT')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cartTab === 'PRODUCT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Package size={14} className="inline mr-2"/> Articles</button>
                      <button onClick={() => setCartTab('SERVICE')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cartTab === 'SERVICE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Sparkles size={14} className="inline mr-2"/> Services</button>
                   </div>
                   <div className="relative">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" placeholder="Rechercher..." className="w-full bg-white border border-slate-100 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm" />
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 pt-0 grid grid-cols-2 gap-6 custom-scrollbar">
                   {cartTab === 'PRODUCT' ? (
                     stocks.map(item => (
                       <button key={item.id} onClick={() => addToCart(item, 'PRODUCT')} disabled={item.currentLevel <= 0} className={`p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all text-left flex flex-col justify-between group active:scale-95 ${item.currentLevel <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
                          <div>
                            <div className="flex justify-between items-start mb-4">
                              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Package size={20}/></div>
                              <span className="text-[8px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full uppercase">Stock: {item.currentLevel}</span>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 uppercase truncate">{item.name}</h4>
                          </div>
                          <p className="text-lg font-black text-indigo-600 mt-4">{Number(item.unitPrice).toLocaleString()} {currency}</p>
                       </button>
                     ))
                   ) : (
                     services.map(s => (
                       <button key={s.id} onClick={() => addToCart(s, 'SERVICE')} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all text-left flex flex-col justify-between group active:scale-95">
                          <div>
                            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Sparkles size={20}/></div>
                            <h4 className="text-sm font-black text-slate-900 uppercase truncate">{s.name}</h4>
                          </div>
                          <p className="text-lg font-black text-amber-600 mt-4">{Number(s.price).toLocaleString()} {currency}</p>
                       </button>
                     ))
                   )}
                </div>
             </div>

             <div className="w-1/3 flex flex-col bg-white overflow-hidden relative">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                   <h3 className="text-lg font-black uppercase tracking-tight">{editModeId ? 'Révision Commande' : 'Panier Actif'}</h3>
                   <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X size={20}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                   {saleForm.items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 opacity-50"><ShoppingCart size={48}/><p className="text-[10px] font-black uppercase tracking-widest">Le panier est vide</p></div>
                   ) : saleForm.items.map((item, i) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                         <div className="flex-1">
                            <p className="text-xs font-black text-slate-800 uppercase truncate pr-4">{item.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1">{Number(item.price).toLocaleString()} {currency} / u</p>
                         </div>
                         <div className="flex items-center gap-3">
                            <button onClick={() => updateCartQty(i, -1)} className="p-1 bg-white text-slate-400 hover:text-rose-500 rounded-lg shadow-sm"><MinusSmall size={14}/></button>
                            <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateCartQty(i, 1)} className="p-1 bg-white text-slate-400 hover:text-indigo-600 rounded-lg shadow-sm"><PlusSmall size={14}/></button>
                            <button onClick={() => removeFromCart(i)} className="p-1.5 ml-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
                         </div>
                      </div>
                   ))}
                </div>

                <div className="p-8 bg-slate-900 text-white space-y-6">
                   <div className="space-y-4">
                      <select required value={saleForm.customerId} onChange={e => setSaleForm({...saleForm, customerId: e.target.value})} className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white">
                         <option value="" className="text-slate-900">VENTE DIRECTE (PASSAGE)</option>
                         {customers.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.companyName}</option>)}
                      </select>
                      {!editModeId && (
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                              <p className="text-[8px] font-black uppercase text-indigo-400 tracking-widest pl-2">Méthode</p>
                              <select value={saleForm.paymentMethod} onChange={e => setSaleForm({...saleForm, paymentMethod: e.target.value})} className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-black outline-none text-white appearance-none">
                                <option value="CASH">CASH</option>
                                <option value="WAVE">WAVE</option>
                                <option value="ORANGE_MONEY">ORANGE MONEY</option>
                                <option value="MTN_MOMO">MTN MOMO</option>
                              </select>
                           </div>
                           <div className="space-y-1.5">
                              <p className="text-[8px] font-black uppercase text-indigo-400 tracking-widest pl-2">Acompte</p>
                              <input type="number" placeholder="Montant" value={saleForm.amountPaid} onChange={e => setSaleForm({...saleForm, amountPaid: parseFloat(e.target.value) || 0})} className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-3 text-xs font-black outline-none text-white" />
                           </div>
                        </div>
                      )}
                   </div>
                   <div className="flex justify-between items-end border-t border-white/10 pt-6">
                      <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total TTC</p><p className="text-3xl font-black text-white">{cartTotal.toLocaleString()} <span className="text-xs">{currency}</span></p></div>
                      <button onClick={handleSubmitSale} disabled={actionLoading || saleForm.items.length === 0} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-indigo-900/50 flex items-center gap-3">
                         {actionLoading ? <Loader2 className="animate-spin" size={18}/> : <>{editModeId ? 'METTRE À JOUR' : 'VALIDER LA VENTE'} <ArrowRight size={18}/></>}
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAILS DE VENTE */}
      {selectedSaleDetails && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in zoom-in-95 duration-500">
              <div className="px-10 py-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl ${selectedSaleDetails.status === 'ANNULE' ? 'bg-rose-600' : 'bg-indigo-600'}`}><FileText size={32}/></div>
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">Détail Vente #{selectedSaleDetails.reference}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{new Date(selectedSaleDetails.createdAt).toLocaleString('fr-FR')}</p>
                        {selectedSaleDetails.status === 'ANNULE' && <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded uppercase">ANNULÉE</span>}
                      </div>
                    </div>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={() => setShowDocGenerator({ sale: selectedSaleDetails, mode: 'FACTURE' })} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all" title="Facture"><Printer size={24}/></button>
                    <button onClick={() => setShowDocGenerator({ sale: selectedSaleDetails, mode: 'BON_SORTIE' })} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-amber-400" title="Bon de Livraison"><ClipboardList size={24}/></button>
                    <button onClick={() => setSelectedSaleDetails(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"><X size={24}/></button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12 bg-slate-50/30 custom-scrollbar grid grid-cols-1 lg:grid-cols-12 gap-10">
                 <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-4">Articles & Prestations</h4>
                       <div className="divide-y divide-slate-50">
                          {selectedSaleDetails.items.map((item: any, i: number) => (
                             <div key={i} className="py-4 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.service_id ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                      {item.service_id ? <Sparkles size={18}/> : <Package size={18}/>}
                                   </div>
                                   <div>
                                      <p className={`text-xs font-black uppercase ${selectedSaleDetails.status === 'ANNULE' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.stock_item?.name || item.service?.name}</p>
                                      <p className="text-[9px] text-slate-400 font-bold">Qté: {item.quantity} × {parseFloat(item.unitPrice).toLocaleString()} {currency}</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className={`text-sm font-black ${selectedSaleDetails.status === 'ANNULE' ? 'text-slate-400' : 'text-slate-900'}`}>{parseFloat(item.totalTtc).toLocaleString()} {currency}</p>
                                   {!item.service_id && (
                                     <div className="flex items-center gap-2 justify-end mt-1">
                                       <Truck size={10} className={item.quantityDelivered === item.quantity ? 'text-emerald-500' : 'text-amber-500'} />
                                       <p className={`text-[8px] font-black uppercase ${item.quantityDelivered === item.quantity ? 'text-emerald-500' : 'text-amber-500'}`}>Livré: {item.quantityDelivered || 0}/{item.quantity}</p>
                                     </div>
                                   )}
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="lg:col-span-4 space-y-8">
                    <div className={`p-8 rounded-[3rem] text-white shadow-xl space-y-6 ${selectedSaleDetails.status === 'ANNULE' ? 'bg-rose-900' : 'bg-slate-900'}`}>
                       <div className="flex justify-between items-center"><span className="text-[10px] font-black text-indigo-400 uppercase">Statut Transaction</span><span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${selectedSaleDetails.status === 'TERMINE' ? 'bg-emerald-500/20 text-emerald-400' : selectedSaleDetails.status === 'ANNULE' ? 'bg-white/10 text-white' : 'bg-amber-500/20 text-amber-400'}`}>{selectedSaleDetails.status}</span></div>
                       <div className="space-y-1"><p className={`text-3xl font-black ${selectedSaleDetails.status === 'ANNULE' ? 'line-through opacity-50' : ''}`}>{parseFloat(selectedSaleDetails.totalTtc).toLocaleString()} {currency}</p><p className="text-[10px] font-bold text-slate-500 uppercase">Total Net à Payer</p></div>
                       <div className="space-y-4 pt-6 border-t border-white/10">
                          <div className="flex justify-between text-xs font-bold uppercase"><span className="text-slate-400">Déjà réglé</span><span className="text-emerald-400">-{parseFloat(selectedSaleDetails.amountPaid).toLocaleString()}</span></div>
                          <div className="flex justify-between text-xl font-black uppercase"><span>RESTE</span><span className="text-rose-500">{Math.max(0, parseFloat(selectedSaleDetails.totalTtc) - parseFloat(selectedSaleDetails.amountPaid)).toLocaleString()}</span></div>
                       </div>
                    </div>

                    <div className="space-y-3">
                       {selectedSaleDetails.status !== 'ANNULE' && parseFloat(selectedSaleDetails.amountPaid) === 0 && !selectedSaleDetails.items.some((i:any) => (i.quantityDelivered || 0) > 0) && (
                          <button onClick={() => handleEditSaleRequest(selectedSaleDetails)} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 hover:bg-amber-600 transition-all"><Edit3 size={16}/> MODIFIER LES ARTICLES</button>
                       )}
                       
                       {selectedSaleDetails.status !== 'ANNULE' && parseFloat(selectedSaleDetails.amountPaid) < parseFloat(selectedSaleDetails.totalTtc) && (
                          <button onClick={() => { setPaymentForm({ amount: Math.max(0, parseFloat(selectedSaleDetails.totalTtc) - parseFloat(selectedSaleDetails.amountPaid)), method: 'CASH', reference: '' }); setShowPaymentModal(selectedSaleDetails); }} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-3"><Wallet size={16}/> ENREGISTRER RÈGLEMENT</button>
                       )}
                       
                       {selectedSaleDetails.status !== 'ANNULE' && selectedSaleDetails.items.some((i:any) => !i.service_id && ((i.quantityDelivered || 0) < i.quantity)) && (
                          <button onClick={() => {
                            const initialQty: Record<string, number> = {};
                            selectedSaleDetails.items.forEach((i:any) => { if(!i.service_id) initialQty[i.id] = i.quantity - (i.quantityDelivered || 0); });
                            setDeliveryQuantities(initialQty);
                            setShowDeliveryModal(selectedSaleDetails);
                          }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-3"><Truck size={16}/> SORTIR DU STOCK (LIVRER)</button>
                       )}
                       
                       {selectedSaleDetails.status !== 'ANNULE' && (
                          <button onClick={() => { setCancelForm({ reason: '', returnToStock: {} }); setShowCancelModal(selectedSaleDetails); }} className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-rose-600 hover:text-white transition-all"><Ban size={16}/> ANNULER LA TRANSACTION</button>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL PAIEMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="px-10 py-8 bg-emerald-600 text-white flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase tracking-tight">Règlement Facture</h3>
                 <button onClick={() => setShowPaymentModal(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24}/></button>
              </div>
              <div className="p-10 space-y-6">
                 <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-[10px] font-bold uppercase">Solde restant : {(parseFloat(showPaymentModal.totalTtc) - parseFloat(showPaymentModal.amountPaid)).toLocaleString()} {currency}</div>
                 <div className="space-y-4">
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2 block">Montant versé</label><input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none" /></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2 block">Canal</label><select value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none appearance-none"><option value="CASH">ESPÈCES</option><option value="WAVE">WAVE</option><option value="ORANGE_MONEY">ORANGE MONEY</option><option value="MTN_MOMO">MTN MOMO</option></select></div>
                    <input type="text" placeholder="Référence (Optionnel)" value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
                 </div>
                 <button onClick={handleAddPayment} disabled={actionLoading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                    {actionLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18}/> VALIDER L'ENCAISSEMENT</>}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL LIVRAISON */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col">
              <div className="px-10 py-8 bg-indigo-600 text-white flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase tracking-tight">Sortie Logistique</h3>
                 <button onClick={() => setShowDeliveryModal(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24}/></button>
              </div>
              <div className="p-10 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-4">Validation du retrait physique</p>
                 {showDeliveryModal.items.filter((i:any) => !i.service_id && ((i.quantityDelivered || 0) < i.quantity)).map((item: any) => (
                    <div key={item.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                       <div className="flex-1">
                          <p className="text-xs font-black text-slate-800 uppercase">{item.stock_item?.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Reste à livrer: {item.quantity - (item.quantityDelivered || 0)}</p>
                       </div>
                       <input 
                         type="number" 
                         max={item.quantity - (item.quantityDelivered || 0)}
                         min={0}
                         value={deliveryQuantities[item.id] || 0}
                         onChange={e => setDeliveryQuantities({...deliveryQuantities, [item.id]: parseInt(e.target.value) || 0})}
                         className="w-24 bg-white border border-slate-200 rounded-xl px-4 py-3 text-center text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10" 
                       />
                    </div>
                 ))}
                 {showDeliveryModal.items.filter((i:any) => !i.service_id && ((i.quantityDelivered || 0) < i.quantity)).length === 0 && (
                   <div className="p-10 text-center text-[10px] font-black uppercase text-slate-400">Tous les produits ont été livrés.</div>
                 )}
              </div>
              <div className="p-10 border-t border-slate-100">
                 <button onClick={handleDelivery} disabled={actionLoading} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                    {actionLoading ? <Loader2 className="animate-spin" /> : <><Truck size={18}/> SCELLER LA SORTIE DE STOCK</>}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL ANNULATION */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="px-10 py-8 bg-rose-600 text-white flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase tracking-tight">Annulation Transaction</h3>
                 <button onClick={() => setShowCancelModal(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24}/></button>
              </div>
              <div className="p-10 space-y-8">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Motif de l'annulation</label>
                    <textarea 
                      required 
                      placeholder="Indiquez la raison (ex: Erreur saisie, désistement client...)"
                      value={cancelForm.reason}
                      onChange={e => setCancelForm({...cancelForm, reason: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-rose-500/10 min-h-[100px]"
                    />
                 </div>

                 {showCancelModal.items.some((i:any) => (i.quantityDelivered || 0) > 0) && (
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Réintégration en Stock (Articles livrés)</label>
                      <div className="space-y-3">
                         {showCancelModal.items.filter((i:any) => (i.quantityDelivered || 0) > 0).map((item: any) => (
                           <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                              <p className="text-xs font-black text-slate-700 uppercase">{item.stock_item?.name || 'Article'}</p>
                              <div className="flex items-center gap-3">
                                 <span className="text-[9px] font-bold text-slate-400">Rendre :</span>
                                 <input 
                                   type="number" 
                                   max={item.quantityDelivered || 0}
                                   min={0}
                                   value={cancelForm.returnToStock[item.id] || 0}
                                   onChange={e => setCancelForm({...cancelForm, returnToStock: {...cancelForm.returnToStock, [item.id]: parseInt(e.target.value) || 0 }})}
                                   className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-black text-xs" 
                                 />
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                 )}

                 <button onClick={handleCancelSale} disabled={actionLoading || !cancelForm.reason} className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95">
                    {actionLoading ? <Loader2 className="animate-spin" /> : <><Ban size={18}/> CONFIRMER L'ANNULATION</>}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW WRAPPER */}
      {showDocGenerator && (
        <div className="fixed inset-0 z-[1200] flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="w-full max-w-5xl h-[90vh] bg-white rounded-[3rem] overflow-hidden flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-500">
              <div className="px-10 py-6 bg-slate-900 text-white flex justify-between items-center shrink-0 print:hidden">
                 <h3 className="text-lg font-black uppercase tracking-tight">Générateur Documentaire</h3>
                 <div className="flex gap-4">
                    <div className="flex items-center justify-end gap-3 mb-2">
                      <button onClick={async () => {
                        try {
                          // Ensure html2canvas is available (load from CDN if necessary)
                          if (!(window as any).html2canvas) {
                            await new Promise<void>((resolve, reject) => {
                              const s = document.createElement('script');
                              s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                              s.async = true;
                              s.onload = () => resolve();
                              s.onerror = () => reject(new Error('Chargement html2canvas échoué'));
                              document.head.appendChild(s);
                            });
                          }

                          const html2canvas = (window as any).html2canvas;
                          if (!html2canvas) throw new Error('html2canvas non disponible');

                          const node = document.getElementById('document-render');
                          if (!node) throw new Error('Aperçu introuvable');

                          // Render at higher scale for better quality
                          const canvas = await html2canvas(node as HTMLElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                          // Prefer PNG
                          const mime = 'image/png';
                          canvas.toBlob((blob: Blob | null) => {
                            if (!blob) {
                              alert('Impossible de générer l\'image');
                              return;
                            }
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            const filename = `${(showDocGenerator?.sale?.reference || showDocGenerator?.sale?.id)}.png`;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.URL.revokeObjectURL(url);
                          }, mime, 0.95);
                        } catch (err: any) {
                          console.error('Capture/download error', err);
                          alert(err?.message || 'Erreur lors de la génération de l\'image');
                        }
                      }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all"><Download size={14}/> Télécharger</button>
                    </div>
                    <button onClick={() => setShowDocGenerator(null)} className="p-2.5 hover:bg-white/10 rounded-xl transition-all"><X size={20}/></button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-slate-100/50 p-10 print:p-0 print:bg-white">
                 <DocumentPreview 
                    type={showDocGenerator.mode} 
                    sale={showDocGenerator.sale} 
                    tenant={tenantSettings} 
                    currency={currency} 
                 />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
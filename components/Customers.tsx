import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Search, Plus, Mail, Phone, Building2, Eye, Edit3, Trash2, X,
  ChevronRight, Star, UserCheck, AlertCircle, RefreshCw, ArrowRight, Save, Loader2, MapPin,
  History, DollarSign, FileText, Clock, Lock, ShieldCheck, TrendingUp, BarChart3,
  CreditCard, Activity, CheckCircle2, Calendar, Info, ShieldAlert
} from 'lucide-react';
import { Customer, UserRole, User, SubscriptionPlan } from '../types';
import { authBridge } from '../services/authBridge';
import { apiClient } from '../services/api';

interface CustomersProps {
  user: User;
  currency: string;
  plan?: SubscriptionPlan;
}

const Customers: React.FC<CustomersProps> = ({ user, currency, plan }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSegment, setFilterSegment] = useState<'ALL' | 'ELITE' | 'RISK'>('ALL');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Customer | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<Customer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Customer | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);

  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    mainContact: '',
    billingAddress: '',
    paymentTerms: 30,
    maxCreditLimit: 5000
  });

  const canModify = authBridge.canPerform(user, 'EDIT', 'customers');
  const customersAllowed = authBridge.isCreationAllowed(user, 'customers', customers.length);
  const isCustomersLimitReached = !customersAllowed;
  const currentPlanId = (plan?.id || (user as any).planId || 'BASIC') as string;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [custData, salesData] = await Promise.all([
        apiClient.get('/customers'),
        apiClient.get('/sales')
      ]);
      setCustomers(custData || []);
      setSales(salesData || []);
    } catch (err: any) {
      setError(err.message || "Erreur de liaison Kernel.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Vérifie si un client a des ventes liées
  const hasLinkedSales = (customerId: string) => {
    return sales.some(s => (s.customerId || s.customer_id) === customerId);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
      try {
      if (!authBridge.isCreationAllowed(user, 'customers', customers.length)) {
        if (currentPlanId === 'PRO') setError('Limite du plan PRO atteinte : maximum 12 clients.');
        else setError('Limite du plan Basic atteinte : maximum 5 clients.');
        setActionLoading(false);
        return;
      }
      const data = await apiClient.post('/customers', formData);
      setCustomers([data, ...customers]);
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Échec de l'enregistrement.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await apiClient.put(`/customers/${showEditModal.id}`, formData);
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
      setShowEditModal(null);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Échec de la mise à jour.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm) return;
    setActionLoading(true);
    setError(null);
    try {
      await apiClient.delete(`/customers/${showDeleteConfirm.id}`);
      setCustomers(customers.filter(c => c.id !== showDeleteConfirm.id));
      const deletedName = showDeleteConfirm.companyName || 'Client';
      setShowDeleteConfirm(null);
      setShowSuccessMessage(`Le client "${deletedName}" a été supprimé avec succès.`);
      setTimeout(() => setShowSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression.");
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      companyName: '', email: '', phone: '',
      mainContact: '', billingAddress: '',
      paymentTerms: 30, maxCreditLimit: 5000
    });
  };

  const openEdit = (customer: Customer) => {
    if (hasLinkedSales(customer.id)) {
      alert("Modification bloquée : Ce client possède un historique de ventes.");
      return;
    }
    setFormData({
      companyName: customer.companyName, email: customer.email,
      phone: customer.phone || '', mainContact: customer.mainContact || '',
      billingAddress: customer.billingAddress || '',
      paymentTerms: customer.paymentTerms || 30,
      maxCreditLimit: customer.maxCreditLimit || 5000
    });
    setShowEditModal(customer);
  };

  const openDetails = async (customer: Customer) => {
    setShowDetailModal(customer);
    setHistoryLoading(true);
    setCustomerHistory([]);
    setCustomerStats(null);
    try {
      const response = await apiClient.get(`/customers/${customer.id}`);
      setCustomerHistory(response.recentSales || []);
      setCustomerStats(response.stats);
    } catch (err) {
      console.error("Erreur chargement historique client");
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const searchStr = search.toLowerCase();
      const matchesSearch = (c.companyName || '').toLowerCase().includes(searchStr) || 
                            (c.email || '').toLowerCase().includes(searchStr);
      if (!matchesSearch) return false;
      if (filterSegment === 'ALL') return true;
      if (filterSegment === 'ELITE') return (c.outstandingBalance || 0) > 10000;
      if (filterSegment === 'RISK') return c.healthStatus === 'CRITICAL';
      return true;
    });
  }, [customers, search, filterSegment]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            <Users className="text-indigo-600" size={32} /> Hub Relation Clients
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Intelligence Commerciale • Instance Isolé</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="p-4 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all shadow-sm">
             <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          {canModify && (
            isCustomersLimitReached ? (
              <div className="flex items-center gap-3 px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-[10px] font-black uppercase tracking-widest shadow-sm">
                <Lock size={16} /> {currentPlanId === 'PRO' ? 'Limite du plan PRO atteinte : maximum 12 clients.' : 'Limite du plan Basic atteinte : maximum 5 clients.'}
              </div>
            ) : (
              <button 
                onClick={() => { resetForm(); setShowCreateModal(true); }}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-xl flex items-center gap-3 text-xs uppercase tracking-widest"
              >
                <Plus size={18} /> CRÉER UN CLIENT
              </button>
            )
          )}
        </div>
      </div>

      {showSuccessMessage && (
        <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-3xl text-emerald-600 text-[10px] font-black uppercase flex items-center gap-4 animate-in slide-in-from-top-4 shadow-sm">
           <CheckCircle2 size={24} /> {showSuccessMessage}
        </div>
      )}

      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Rechercher par nom, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-4 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" />
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          {(['ALL', 'ELITE', 'RISK'] as const).map(seg => (
            <button key={seg} onClick={() => setFilterSegment(seg)} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterSegment === seg ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{seg === 'ALL' ? 'Tous' : seg === 'ELITE' ? 'VIP' : 'Risque'}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-white rounded-[2.5rem] animate-pulse border border-slate-100"></div>)}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center col-span-1 md:col-span-2 xl:col-span-3">
           <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aucun client trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCustomers.map(customer => {
            const isLinked = hasLinkedSales(customer.id);
            return (
              <div key={customer.id} className={`bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all p-8 flex flex-col h-full group relative overflow-hidden border-b-4 border-transparent hover:border-indigo-500 ${isLinked ? 'grayscale-[0.3]' : ''}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner group-hover:scale-110 transition-transform uppercase">
                    {(customer.companyName || 'C').charAt(0)}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${customer.healthStatus === 'GOOD' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : customer.healthStatus === 'WARNING' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                    {customer.healthStatus === 'GOOD' ? 'SOLVABLE' : customer.healthStatus === 'WARNING' ? 'VIGILANCE' : 'RISQUE'}
                  </div>
                </div>
                <h3 className="font-black text-slate-900 text-lg uppercase truncate leading-none">{customer.companyName || 'Passage'}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest truncate flex items-center gap-2"><Mail size={12}/> {customer.email}</p>
                
                <div className="mt-8 grid grid-cols-2 gap-4 flex-1">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Encours</p>
                    <p className="text-sm font-black text-slate-900">{(customer.outstandingBalance || 0).toLocaleString()} {currency}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Délai</p>
                    <p className="text-sm font-black text-slate-900">{customer.paymentTerms || 30} Jours</p>
                  </div>
                </div>

                {isLinked && (
                  <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl w-fit">
                    <Info size={12} className="text-slate-400" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ventes liées détectées</span>
                  </div>
                )}
                
                <div className="mt-8 flex justify-between gap-2 border-t pt-6">
                  <button onClick={() => openDetails(customer)} className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-2 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all">DÉTAILS <Eye size={16} /></button>
                  {canModify && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openEdit(customer)} 
                        title={isLinked ? "Modification verrouillée" : "Modifier"}
                        className={`p-3 rounded-xl shadow-sm transition-all ${isLinked ? 'bg-slate-50 text-slate-200 cursor-not-allowed' : 'bg-white border border-slate-100 text-slate-400 hover:text-amber-600'}`}
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => !isLinked && setShowDeleteConfirm(customer)} 
                        title={isLinked ? "Suppression verrouillée" : "Supprimer"}
                        className={`p-3 rounded-xl shadow-sm transition-all ${isLinked ? 'bg-slate-50 text-slate-200 cursor-not-allowed' : 'bg-white border border-slate-100 text-slate-400 hover:text-rose-600'}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CRÉATION / MODIFICATION */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
             <div className={`px-10 py-8 text-white flex justify-between items-center ${showEditModal ? 'bg-amber-500' : 'bg-slate-900'}`}>
                <div className="flex items-center gap-4">
                  {showEditModal ? <Edit3 size={28}/> : <Plus size={28}/>}
                  <h3 className="text-xl font-black uppercase tracking-tight">
                    {showEditModal ? 'Révision Fiche Client' : 'Nouveau Partenaire'}
                  </h3>
                </div>
                <button onClick={() => { setShowCreateModal(false); setShowEditModal(null); }} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24}/></button>
             </div>
             <form onSubmit={showEditModal ? handleUpdate : handleCreate} className="p-10 space-y-8 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Identité Entreprise</label>
                      <input type="text" required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black focus:ring-4 focus:ring-indigo-500/10 outline-none" placeholder="Raison Sociale" />
                      <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black focus:ring-4 focus:ring-indigo-500/10 outline-none" placeholder="Email de contact" />
                      <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black focus:ring-4 focus:ring-indigo-500/10 outline-none" placeholder="Téléphone" />
                      <input type="text" value={formData.mainContact} onChange={e => setFormData({...formData, mainContact: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black focus:ring-4 focus:ring-indigo-500/10 outline-none" placeholder="Nom du responsable" />
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Logistique & Crédit</label>
                      <textarea value={formData.billingAddress} onChange={e => setFormData({...formData, billingAddress: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none min-h-[100px]" placeholder="Adresse de facturation"></textarea>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <p className="text-[9px] font-black text-slate-400 uppercase px-2">Délai (jours)</p>
                           <input type="number" value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none" />
                         </div>
                         <div className="space-y-2">
                           <p className="text-[9px] font-black text-slate-400 uppercase px-2">Plafond ({currency})</p>
                           <input type="number" value={formData.maxCreditLimit} onChange={e => setFormData({...formData, maxCreditLimit: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none" />
                         </div>
                      </div>
                   </div>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(null); }} className="flex-1 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">ANNULER</button>
                  <button type="submit" disabled={actionLoading} className={`flex-1 py-5 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${showEditModal ? 'bg-amber-600' : 'bg-indigo-600'}`}>
                    {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <>{showEditModal ? 'METTRE À JOUR' : 'SCELLER LE PROFIL'} <ArrowRight size={18}/></>}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-10 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                <ShieldAlert size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Confirmer la suppression ?</h3>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest leading-relaxed mb-8">
                Souhaitez-vous marquer le client <span className="text-rose-600 font-black">"{showDeleteConfirm.companyName}"</span> comme "supprimer" ?<br/>
                Cette action est enregistrée dans le journal d'audit AlwaysData.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleConfirmDelete} 
                  disabled={actionLoading}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-rose-200"
                >
                  {actionLoading ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  OUI, RÉVOQUER LE COMPTE
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(null)} 
                  className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                >
                  Annuler l'action
                </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DÉTAILS VUE 360 */}
      {showDetailModal && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-500">
            <div className="px-12 py-10 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl uppercase">
                  {(showDetailModal.companyName || 'C').charAt(0)}
                </div>
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">{showDetailModal.companyName}</h3>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-[10px] font-black text-indigo-400 uppercase bg-indigo-500/10 px-3 py-1 rounded-full">ID: {showDetailModal.id.slice(0, 8)}</span>
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${showDetailModal.healthStatus === 'GOOD' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400 animate-pulse'}`}>
                      SOLVABILITÉ: {showDetailModal.healthStatus}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-3xl transition-all"><X size={32}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 grid grid-cols-12 gap-10 bg-slate-50/30 custom-scrollbar">
               <div className="col-span-12 lg:col-span-4 space-y-8">
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Phone size={14}/> Coordonnées</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Mail size={18}/></div>
                        <div className="overflow-hidden"><p className="text-[8px] font-black text-slate-400 uppercase">Email</p><p className="text-sm font-bold text-slate-800 truncate">{showDetailModal.email}</p></div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Phone size={18}/></div>
                        <div><p className="text-[8px] font-black text-slate-400 uppercase">Téléphone</p><p className="text-sm font-bold text-slate-800">{showDetailModal.phone || 'Non renseigné'}</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><MapPin size={14}/> Logistique</h4>
                    <div><p className="text-[8px] font-black text-slate-400 uppercase">Siège Social</p><p className="text-sm font-bold text-slate-800 leading-relaxed">{showDetailModal.billingAddress || 'Non renseignée'}</p></div>
                  </div>
               </div>

               <div className="col-span-12 lg:col-span-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden ${ (customerStats?.outstanding || 0) > 0 ? 'bg-rose-600' : 'bg-emerald-600'}`}>
                       <div className="absolute right-0 top-0 p-4 opacity-10"><TrendingUp size={80}/></div>
                       <h4 className="text-[9px] font-black uppercase tracking-[0.2em] mb-4 opacity-70">Encours Actuel</h4>
                       <p className="text-4xl font-black">{(customerStats?.outstanding || 0).toLocaleString()} <span className="text-sm uppercase">{currency}</span></p>
                    </div>
                    <div className="p-8 rounded-[2.5rem] bg-indigo-600 text-white shadow-xl relative overflow-hidden">
                       <div className="absolute right-0 top-0 p-4 opacity-10"><BarChart3 size={80}/></div>
                       <h4 className="text-[9px] font-black uppercase tracking-[0.2em] mb-4 opacity-70">Volume d'affaires</h4>
                       <p className="text-4xl font-black">{(customerStats?.totalInvoiced || 0).toLocaleString()} <span className="text-sm uppercase">{currency}</span></p>
                    </div>
                  </div>

                  <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col min-h-[350px]">
                     <div className="flex items-center justify-between mb-8">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><History size={18}/> Dernières commandes</h4>
                        {historyLoading && <Loader2 className="animate-spin text-indigo-500" size={16}/>}
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                        {customerHistory.length === 0 && !historyLoading ? (
                           <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-40 py-20">
                              <FileText size={48}/>
                              <p className="text-[10px] font-black uppercase tracking-widest">Aucune vente enregistrée</p>
                           </div>
                        ) : customerHistory.map((sale: any) => (
                           <div key={sale.id} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-500 transition-all shadow-sm">
                              <div className="flex items-center gap-5">
                                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${sale.status === 'ANNULE' ? 'bg-rose-50' : 'bg-indigo-50'}`}>
                                    <FileText size={20} className={sale.status === 'ANNULE' ? 'text-rose-400' : 'text-indigo-600'}/>
                                 </div>
                                 <div>
                                    <p className={`text-sm font-black uppercase tracking-tight ${sale.status === 'ANNULE' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>#{sale.reference}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{new Date(sale.createdAt).toLocaleDateString()}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className={`text-base font-black ${sale.status === 'ANNULE' ? 'text-slate-300' : 'text-slate-900'}`}>{parseFloat(sale.totalTtc).toLocaleString()} {currency}</p>
                                 <span className={`inline-block px-2 py-0.5 rounded text-[7px] font-black uppercase mt-1 ${sale.status === 'TERMINE' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{sale.status}</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
            <div className="p-10 bg-white border-t border-slate-100 flex gap-4 shrink-0">
               <button onClick={() => setShowDetailModal(null)} className="px-12 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">FERMER LE DOSSIER</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
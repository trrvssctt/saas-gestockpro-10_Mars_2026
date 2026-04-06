
import React, { useState, useEffect } from 'react';
import {
  Sparkles, Plus, Search, Edit3, Trash2, X, RefreshCw,
  Lock, Save, AlertCircle, ArrowRight, Loader2, DollarSign,
  Briefcase, ShieldAlert, CheckCircle2, XCircle, Info, Upload, ImageIcon, Eye, Tag, MapPin, ChevronRight
} from 'lucide-react';
import { authBridge } from '../services/authBridge';
import { apiClient } from '../services/api';
import { uploadFile } from '../services/uploadService';
import { useToast } from './ToastProvider';

const Services = ({ currency }: { currency: string }) => {
  const [services, setServices] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // View mode, pagination and filters
  const [viewMode, setViewMode] = useState<'CARD' | 'LIST'>('CARD');
  const [pageSize, setPageSize] = useState<number>(6);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ search: '', dateFrom: '', dateTo: '', status: 'ALL', minPrice: '', maxPrice: '' });
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT' | 'VIEW' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<any | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const emptyService = () => ({ name: '', description: '', price: 0, isActive: true, imageUrl: '' });
  const [formDataList, setFormDataList] = useState([emptyService()]);

  const currentUser = authBridge.getSession()?.user;
  const canModify = currentUser ? authBridge.canPerform(currentUser, 'EDIT', 'services') : false;
  const showToast = useToast();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [srvData, salesData] = await Promise.all([
        apiClient.get('/services'),
        apiClient.get('/sales')
      ]);
      setServices(srvData || []);
      setSales(salesData || []);
    } catch (err: any) { 
      setError("Erreur de liaison avec le Kernel.");
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredServices = services.filter(s => {
    const q = filters.search || '';
    const matchesText = (s.name || '').toLowerCase().includes(q.toLowerCase()) || (s.description || '').toLowerCase().includes(q.toLowerCase());

    const created = (s as any).createdAt || (s as any).created_at || '';
    const createdDate = created ? new Date(created).toISOString().split('T')[0] : '';
    const matchesFrom = filters.dateFrom === '' || (createdDate && createdDate >= filters.dateFrom);
    const matchesTo = filters.dateTo === '' || (createdDate && createdDate <= filters.dateTo);

    const price = Number(s.price || 0);
    const matchesMin = filters.minPrice === '' || price >= Number(filters.minPrice);
    const matchesMax = filters.maxPrice === '' || price <= Number(filters.maxPrice);

    const statusMatch = filters.status === 'ALL' || (filters.status === 'ACTIVE' && s.isActive) || (filters.status === 'INACTIVE' && !s.isActive);

    return matchesText && matchesFrom && matchesTo && matchesMin && matchesMax && statusMatch;
  });

  const visibleServices = viewMode === 'CARD' ? filteredServices.slice(0, pageSize) : filteredServices;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await uploadFile(file, 'images');
      setFormDataList(prev => prev.map((f, i) => i === idx ? { ...f, imageUrl: result.url } : f));
    } catch (err) {
      console.error("Upload Error:", err);
      showToast("Échec de l'envoi de l'image.", 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Vérifie si un service est présent dans une vente
  const isServiceLinked = (serviceId: string) => {
    return sales.some(sale => 
      (sale.items || []).some((item: any) => (item.serviceId || item.service_id) === serviceId)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;
    
    setActionLoading(true);
    setError(null);
    try {
      if (modalMode === 'CREATE') {
        const validForms = formDataList.filter(f => f.name && f.price);
        if (validForms.length === 0) {
          showToast("Veuillez remplir au moins un service.", 'error');
          setActionLoading(false);
          return;
        }
        const created = await Promise.all(validForms.map(f => apiClient.post('/services', f)));
        setServices(prev => [...created, ...prev]);
      } else if (modalMode === 'EDIT' && selectedService) {
        const res = await apiClient.put(`/services/${selectedService.id}`, formDataList[0]);
        setServices(services.map(s => s.id === res.id ? res : s));
      }
      setModalMode(null);
    } catch (err: any) {
      setError(err.message || "L'opération a été rejetée par le Kernel.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm || !canModify) return;
    
    setActionLoading(true);
    setError(null);
    try {
      await apiClient.delete(`/services/${showDeleteConfirm.id}`);
      setServices(services.filter(s => s.id !== showDeleteConfirm.id));
      const deletedName = showDeleteConfirm.name;
      setShowDeleteConfirm(null);
      setShowSuccessMessage(`Le service "${deletedName}" a été supprimé avec succès.`);
      setTimeout(() => setShowSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression.");
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (service: any) => {
    if (isServiceLinked(service.id)) {
      showToast("Modification bloquée : Ce service est déjà rattaché à une ou plusieurs ventes.", 'error');
      return;
    }
    setSelectedService(service);
    setFormDataList([{
      name: service.name,
      description: service.description || '',
      price: Number(service.price),
      isActive: service.isActive,
      imageUrl: service.imageUrl || ''
    }]);
    setModalMode('EDIT');
  };

  const openDetails = (service: any) => {
    setSelectedService(service);
    setModalMode('VIEW');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <Sparkles className="text-indigo-600" size={32} /> Catalogue Prestations
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Services & Forfaits métier</p>
        </div>
        {canModify && (
          <button 
            onClick={() => { setFormDataList([emptyService()]); setModalMode('CREATE'); setError(null); }}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-xl flex items-center gap-3 text-xs uppercase tracking-widest"
          >
            <Plus size={18} /> CRÉER UN SERVICE
          </button>
        )}
      </div>

      {showSuccessMessage && (
        <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-3xl text-emerald-600 text-[10px] font-black uppercase flex items-center gap-4 animate-in slide-in-from-top-4 shadow-sm">
           <CheckCircle2 size={24} /> {showSuccessMessage}
        </div>
      )}

      <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher une prestation..." 
            value={filters.search} 
            onChange={e => setFilters({...filters, search: e.target.value})} 
            className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" 
          />
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button onClick={() => setViewMode('CARD')} className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest ${viewMode === 'CARD' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'}`}>Carte</button>
          <button onClick={() => setViewMode('LIST')} className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest ${viewMode === 'LIST' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'}`}>Liste</button>
          <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest ${showFilters ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>FILTRES</button>
        </div>

        <button onClick={fetchData} className="p-4 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-black uppercase flex items-center gap-3 animate-in shake">
          <AlertCircle size={16}/> {error}
        </div>
      )}

      {/* Filtres avancés */}
      {showFilters && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl animate-in slide-in-from-top-4 duration-300 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Recherche</label>
            <input type="text" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Nom ou description..." />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Période (Du)</label>
            <input type="date" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Période (Au)</label>
            <input type="date" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Statut</label>
            <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer">
              <option value="ALL">Tous</option>
              <option value="ACTIVE">Actifs</option>
              <option value="INACTIVE">Inactifs</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Prix (Min / Max)</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" value={filters.minPrice} onChange={e => setFilters({...filters, minPrice: e.target.value})} className="w-1/2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
              <input type="number" placeholder="Max" value={filters.maxPrice} onChange={e => setFilters({...filters, maxPrice: e.target.value})} className="w-1/2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
            </div>
          </div>

          <div className="md:col-span-4 flex gap-2 pt-2">
            <button onClick={() => setFilters({ search: '', dateFrom: '', dateTo: '', status: 'ALL', minPrice: '', maxPrice: '' })} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all w-full">RÉINITIALISER LES FILTRES</button>
          </div>
        </div>
      )}

      {viewMode === 'CARD' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? [...Array(3)].map((_, i) => <div key={i} className="h-64 bg-white rounded-[2.5rem] animate-pulse border border-slate-100"></div>) : 
             filteredServices.length === 0 ? (
               <div className="py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center col-span-1 md:col-span-2 lg:col-span-3">
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aucun service trouvé</p>
               </div>
             ) : visibleServices.map(service => {
              const isLinked = isServiceLinked(service.id);
              return (
                <div key={service.id} className={`bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl transition-all group relative flex flex-col h-full border-b-4 border-b-transparent hover:border-b-indigo-500 ${!service.isActive ? 'opacity-60' : ''} ${isLinked ? 'grayscale-[0.3]' : ''}`}>
                   <div className="flex justify-between items-start mb-6 shrink-0">
                      <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner overflow-hidden">
                        {service.imageUrl ? (
                          <img src={service.imageUrl} className="w-full h-full object-cover" alt={service.name} />
                        ) : (
                          <Briefcase size={24}/>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${service.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {service.isActive ? 'ACTIF' : 'INACTIF'}
                        </span>
                        {canModify && (
                          <div className="flex gap-1">
                            <button 
                              onClick={() => openEdit(service)} 
                              title={isLinked ? "Modification verrouillée" : "Modifier"}
                              className={`p-2 rounded-xl transition-all ${isLinked ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
                            >
                              <Edit3 size={16}/>
                            </button>
                            <button 
                              onClick={() => !isLinked && setShowDeleteConfirm(service)} 
                              title={isLinked ? "Suppression verrouillée" : "Supprimer"}
                              className={`p-2 rounded-xl transition-all ${isLinked ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
                            >
                              <Trash2 size={16}/>
                            </button>
                          </div>
                        )}
                      </div>
                   </div>
                   <div className="flex-1">
                     <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2 truncate">{service.name}</h3>
                     <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2 mb-4">{service.description || 'Prestation métier.'}</p>
                     <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-50">
                        <button onClick={() => openDetails(service)} className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-2 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all">DÉTAILS <Eye size={16}/></button>
                        <p className="text-2xl font-black text-indigo-600">{Number(service.price).toLocaleString()} <span className="text-[10px] text-slate-400">{currency}</span></p>
                     </div>
                     
                     {isLinked && (
                       <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl w-fit">
                          <Info size={12} className="text-slate-400" />
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Liens transactionnels détectés</span>
                       </div>
                     )}
                   </div>
                </div>
              );
            })}
          </div>

          {filteredServices.length > visibleServices.length && (
            <div className="flex justify-center mt-6">
              <button onClick={() => setPageSize(prev => prev + 6)} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase tracking-widest">VOIR PLUS</button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b">
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-center">Statut</th>
                <th className="px-6 py-4 text-right">Prix</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? [...Array(6)].map((_, i) => (
                <tr key={i} className="h-16 bg-slate-50 animate-pulse"><td colSpan={5}></td></tr>
              )) : filteredServices.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Aucun service trouvé</td></tr>
              ) : filteredServices.map(service => {
                const isLinked = isServiceLinked(service.id);
                return (
                  <tr key={service.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4 font-black text-slate-900">{service.name}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm truncate">{service.description}</td>
                    <td className="px-6 py-4 text-center text-[11px] font-black">{service.isActive ? 'Actif' : 'Inactif'}</td>
                    <td className="px-6 py-4 text-right font-black">{Number(service.price).toLocaleString()} {currency}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button onClick={() => openDetails(service)} className="px-3 py-2 rounded-xl text-slate-400 hover:text-indigo-600">Voir</button>
                      {canModify && (
                        <>
                          <button onClick={() => openEdit(service)} className={`px-3 py-2 rounded-xl ${isLinked ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}><Edit3 size={16} /></button>
                          <button onClick={() => !isLinked && setShowDeleteConfirm(service)} className={`px-3 py-2 rounded-xl ${isLinked ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}><Trash2 size={16} /></button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {(modalMode === 'CREATE' || modalMode === 'EDIT') && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-500">
             <div className={`px-10 py-8 text-white flex justify-between items-center shrink-0 ${modalMode === 'CREATE' ? 'bg-slate-900' : 'bg-amber-500'}`}>
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                   {modalMode === 'CREATE' ? <Sparkles size={24}/> : <Edit3 size={24}/>}
                   {modalMode === 'CREATE' ? 'Nouvelle Prestation' : 'Révision Service'}
                </h3>
                <button onClick={() => setModalMode(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24}/></button>
             </div>
             <form onSubmit={handleSubmit} className="p-10 space-y-6 flex-1 overflow-y-auto">
                {formDataList.map((fd, idx) => (
                  <div key={idx} className={`space-y-6 ${modalMode === 'CREATE' && formDataList.length > 1 ? 'border-b border-slate-100 pb-6 mb-2' : ''}`}>
                    {modalMode === 'CREATE' && (
                      <div className="flex justify-between items-center">
                        <span className="font-black text-indigo-600 text-xs uppercase">Service {idx + 1}</span>
                        {formDataList.length > 1 && (
                          <button type="button" onClick={() => setFormDataList(list => list.filter((_, i) => i !== idx))} className="text-rose-500 text-xs font-black hover:text-rose-700 transition-colors">Supprimer</button>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Identification <span className="text-rose-600">*</span></label>
                        <input type="text" required value={fd.name} onChange={e => setFormDataList(list => list.map((f, i) => i === idx ? { ...f, name: e.target.value } : f))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Nom du service" />
                        <div className="relative">
                          <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input type="number" required value={fd.price} onChange={e => setFormDataList(list => list.map((f, i) => i === idx ? { ...f, price: Number(e.target.value) } : f))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-black outline-none" placeholder="Prix de vente" />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Illustration</label>
                        <div className="relative group">
                          <input type="file" id={`service_img_up_${idx}`} hidden onChange={e => handleFileUpload(e, idx)} accept="image/*" />
                          <label htmlFor={`service_img_up_${idx}`} className={`block p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${fd.imageUrl ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-indigo-600'}`}>
                            {isUploading ? (
                              <Loader2 className="animate-spin mx-auto text-indigo-600" />
                            ) : fd.imageUrl ? (
                              <img src={fd.imageUrl} className="h-16 mx-auto rounded-lg object-contain" alt="Preview" />
                            ) : (
                              <div className="py-2">
                                <ImageIcon className="mx-auto text-slate-300" size={24} />
                                <p className="text-[8px] font-black uppercase mt-1 text-slate-500">Ajouter Image</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>

                    <textarea value={fd.description} onChange={e => setFormDataList(list => list.map((f, i) => i === idx ? { ...f, description: e.target.value } : f))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium outline-none min-h-[80px]" placeholder="Description détaillée de la prestation..."></textarea>

                    <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <input type="checkbox" id={`srv_active_${idx}`} checked={fd.isActive} onChange={e => setFormDataList(list => list.map((f, i) => i === idx ? { ...f, isActive: e.target.checked } : f))} className="w-5 h-5 rounded accent-indigo-600" />
                      <label htmlFor={`srv_active_${idx}`} className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Service Actif pour la vente</label>
                    </div>
                  </div>
                ))}

                {modalMode === 'CREATE' && formDataList.length < 5 && (
                  <button type="button" onClick={() => setFormDataList(list => [...list, emptyService()])} className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all">+ Ajouter un service</button>
                )}

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setModalMode(null)} className="flex-1 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">ANNULER</button>
                  <button type="submit" disabled={actionLoading || isUploading} className={`flex-1 py-5 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${modalMode === 'CREATE' ? 'bg-indigo-600 hover:bg-slate-900' : 'bg-amber-500 hover:bg-amber-600'}`}>
                    {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <>SCELLER LA PRESTATION <ArrowRight size={18}/></>}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* MODAL VUE DÉTAILLÉE (VIEW) */}
      {modalMode === 'VIEW' && selectedService && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl mx-auto rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-300">

            {/* ── Header ── */}
            <div className="px-6 md:px-10 py-6 bg-gradient-to-r from-slate-900 to-violet-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-violet-500/30 border border-violet-400/30 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden shrink-0">
                  {selectedService.imageUrl
                    ? <img src={selectedService.imageUrl} className="w-full h-full object-cover" alt={selectedService.name} />
                    : <Sparkles size={26} />}
                </div>
                <div>
                  <p className="text-[9px] font-black text-violet-300 uppercase tracking-[0.3em] mb-1">Détail Service</p>
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none">{selectedService.name}</h3>
                  <p className="text-[9px] text-violet-300/70 font-mono mt-1 uppercase tracking-widest">REF: {selectedService.id.slice(0, 8)}</p>
                </div>
              </div>
              <button onClick={() => setModalMode(null)} className="p-3 bg-white/5 hover:bg-white/15 rounded-2xl transition-all shrink-0"><X size={22} /></button>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/60 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Colonne gauche */}
                <div className="lg:col-span-1 space-y-4">

                  {/* KPI tarif */}
                  <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg shadow-violet-200 relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-10"><Sparkles size={80} /></div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-70 mb-3">Tarification Fixe</p>
                    <p className="text-4xl font-black">{Number(selectedService.price).toLocaleString()}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mt-1">{currency} par prestation</p>
                  </div>

                  {/* Statut */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedService.isActive ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                      {selectedService.isActive ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Statut opérationnel</p>
                      <p className={`text-xs font-black mt-0.5 ${selectedService.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {selectedService.isActive ? 'Service actif — disponible à la vente' : 'Service suspendu'}
                      </p>
                    </div>
                  </div>

                  {/* Image si disponible */}
                  {selectedService.imageUrl && (
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <img src={selectedService.imageUrl} className="w-full rounded-xl object-cover aspect-square" alt={selectedService.name} />
                    </div>
                  )}

                  {/* Infos système */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Info size={13} /> Informations Système</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">Créé le</p>
                        <p className="text-xs font-bold text-slate-800">{new Date(selectedService.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">Identifiant</p>
                        <p className="text-[10px] font-mono font-bold text-slate-400">{selectedService.id.slice(0, 12).toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colonne droite — description + détails */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2 shrink-0">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <ChevronRight size={14} className="text-violet-400" /> Périmètre d'intervention
                    </h4>
                  </div>
                  <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {selectedService.description ? (
                      <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedService.description}</p>
                    ) : (
                      <div className="py-16 flex flex-col items-center gap-3 text-slate-300">
                        <Info size={32} />
                        <p className="text-[9px] font-black uppercase tracking-widest">Aucune description fournie pour ce service.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-10 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                <ShieldAlert size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Confirmer la suppression ?</h3>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest leading-relaxed mb-8">
                Êtes-vous sûr de vouloir supprimer le service <span className="text-rose-600 font-black">"{showDeleteConfirm.name}"</span> ?<br/>
                Il sera marqué comme "supprimer" dans le registre AlwaysData.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleConfirmDelete} 
                  disabled={actionLoading}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-rose-200"
                >
                  {actionLoading ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  OUI, SUPPRIMER LE SERVICE
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
    </div>
  );
};

export default Services;
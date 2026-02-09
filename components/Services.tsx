
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Plus, Search, Edit3, Trash2, X, RefreshCw, 
  Lock, Save, AlertCircle, ArrowRight, Loader2, DollarSign,
  Briefcase, ShieldAlert, CheckCircle2, Info, Upload, ImageIcon, Eye, Tag, MapPin
} from 'lucide-react';
import { authBridge } from '../services/authBridge';
import { apiClient } from '../services/api';

const Services = ({ currency }: { currency: string }) => {
  const [services, setServices] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT' | 'VIEW' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<any | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    price: 0,
    isActive: true,
    imageUrl: ''
  });

  const currentUser = authBridge.getSession()?.user;
  const canModify = currentUser ? authBridge.canPerform(currentUser, 'EDIT', 'services') : false;

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

  const filteredServices = services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    const cloudinaryData = new FormData();
    cloudinaryData.append('file', file);
    cloudinaryData.append('upload_preset', 'ml_default'); 
    cloudinaryData.append('cloud_name', 'dq7avew9h');

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/dq7avew9h/image/upload`, {
        method: 'POST',
        body: cloudinaryData
      });
      
      const data = await response.json();
      if (data.secure_url) {
        setFormData(prev => ({ ...prev, imageUrl: data.secure_url }));
      }
    } catch (err) {
      console.error("Upload Error:", err);
      alert("Échec de l'envoi de l'image.");
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
        const res = await apiClient.post('/services', formData);
        setServices([res, ...services]);
      } else if (modalMode === 'EDIT' && selectedService) {
        const res = await apiClient.put(`/services/${selectedService.id}`, formData);
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
      alert("Modification bloquée : Ce service est déjà rattaché à une ou plusieurs ventes.");
      return;
    }
    setSelectedService(service);
    setFormData({ 
      name: service.name, 
      description: service.description || '', 
      price: Number(service.price), 
      isActive: service.isActive,
      imageUrl: service.imageUrl || ''
    });
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
            onClick={() => { setFormData({ name: '', description: '', price: 0, isActive: true, imageUrl: '' }); setModalMode('CREATE'); setError(null); }}
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
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" 
          />
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? [...Array(3)].map((_, i) => <div key={i} className="h-64 bg-white rounded-[2.5rem] animate-pulse border border-slate-100"></div>) : 
         filteredServices.length === 0 ? (
           <div className="py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center col-span-1 md:col-span-2 lg:col-span-3">
             <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aucun service trouvé</p>
           </div>
         ) : filteredServices.map(service => {
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

      {/* CREATE / EDIT MODAL */}
      {(modalMode === 'CREATE' || modalMode === 'EDIT') && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
             <div className={`px-10 py-8 text-white flex justify-between items-center ${modalMode === 'CREATE' ? 'bg-slate-900' : 'bg-amber-500'}`}>
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                   {modalMode === 'CREATE' ? <Sparkles size={24}/> : <Edit3 size={24}/>}
                   {modalMode === 'CREATE' ? 'Nouvelle Prestation' : 'Révision Service'}
                </h3>
                <button onClick={() => setModalMode(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24}/></button>
             </div>
             <form onSubmit={handleSubmit} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Identification</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Nom du service" />
                    <div className="relative">
                        <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-black outline-none" placeholder="Prix de vente" />
                    </div>
                  </div>
                  <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Illustration</label>
                      <div className="relative group">
                        <input type="file" id="service_img_up" hidden onChange={handleFileUpload} accept="image/*" />
                        <label htmlFor="service_img_up" className={`block p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${formData.imageUrl ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-indigo-600'}`}>
                          {isUploading ? (
                            <Loader2 className="animate-spin mx-auto text-indigo-600" />
                          ) : formData.imageUrl ? (
                            <img src={formData.imageUrl} className="h-16 mx-auto rounded-lg object-contain" alt="Preview" />
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
                
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium outline-none min-h-[100px]" placeholder="Description détaillée de la prestation..."></textarea>
                
                <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <input type="checkbox" id="srv_active" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 rounded accent-indigo-600" />
                    <label htmlFor="srv_active" className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Service Actif pour la vente</label>
                </div>

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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-500">
              <div className="px-12 py-10 bg-slate-900 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-3xl shadow-2xl shadow-indigo-500/20 overflow-hidden">
                      {selectedService.imageUrl ? (
                        <img src={selectedService.imageUrl} className="w-full h-full object-cover" alt={selectedService.name} />
                      ) : (
                        <Sparkles size={40}/>
                      )}
                    </div>
                    <div>
                       <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">{selectedService.name}</h3>
                       <div className="flex items-center gap-4 mt-3">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${selectedService.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400 animate-pulse'}`}>
                          {selectedService.isActive ? 'SERVICE OPÉRATIONNEL' : 'SERVICE SUSPENDU'}
                        </span>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setModalMode(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-3xl transition-all"><X size={32}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 grid grid-cols-12 gap-10 bg-slate-50/30 custom-scrollbar">
                 <div className="col-span-12 lg:col-span-5 space-y-8">
                    {selectedService.imageUrl && (
                      <div className="bg-white p-4 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                        <img src={selectedService.imageUrl} className="w-full rounded-2xl object-cover aspect-square shadow-inner" alt={selectedService.name} />
                      </div>
                    )}
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-4">
                       <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Tag size={14}/> Tarification Fixe</h4>
                       <p className="text-3xl font-black text-indigo-600">{Number(selectedService.price).toLocaleString()} <span className="text-xs uppercase">{currency}</span></p>
                    </div>
                 </div>
                 <div className="col-span-12 lg:col-span-7 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">Périmètre d'intervention</h4>
                       <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedService.description || 'Aucune description technique fournie pour ce service.'}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                       <h4 className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2"><Info size={14}/> Informations Système</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase">Créé le</p>
                             <p className="text-[10px] font-bold text-slate-800">{new Date(selectedService.createdAt).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase">Identifiant</p>
                             <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">{selectedService.id.slice(0,12)}</p>
                          </div>
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
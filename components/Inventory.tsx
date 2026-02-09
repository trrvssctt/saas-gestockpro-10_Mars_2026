
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, AlertTriangle, Trash2, Edit3, Plus, 
  Search, RefreshCw, Eye, Boxes, Lock, X, Save,
  ArrowRight, Loader2, AlertCircle, MapPin, Tag, Layers,
  TrendingUp, History, ArrowUpCircle, ArrowDownCircle, Info, ShieldAlert,
  ShieldCheck, CheckCircle2, Upload, ImageIcon
} from 'lucide-react';
import { StockItem, UserRole, SubscriptionPlan, User, StockMovement } from '../types';
import { apiClient } from '../services/api';
import { authBridge } from '../services/authBridge';

const Inventory = ({ currency, plan }: { currency: string, userRole?: UserRole, plan?: SubscriptionPlan }) => {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT' | 'VIEW' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<StockItem | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeInventory, setActiveInventory] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    unitPrice: 0,
    minThreshold: 5,
    quantity: 0,
    subcategoryId: '',
    location: '',
    imageUrl: ''
  });
  
  const currentUser = authBridge.getSession()?.user;
  const canModify = currentUser ? authBridge.canPerform(currentUser, 'EDIT', 'inventory') : false;
  const isLimitReached = plan?.id === 'FREE_TRIAL' && stocks.length >= 5;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stockData, subData, campaigns, salesData] = await Promise.all([
        apiClient.get('/stock'),
        apiClient.get('/subcategories'),
        apiClient.get('/stock/campaigns'),
        apiClient.get('/sales')
      ]);
      setStocks(stockData || []);
      setSubcategories(subData || []);
      setActiveInventory(campaigns.find((c: any) => c.status === 'DRAFT'));
      setSales(salesData || []);
    } catch (err: any) { 
      setError("Échec de synchronisation avec le Kernel.");
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

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

  const isProductLinked = (productId: string) => {
    return sales.some(sale => 
      (sale.items || []).some((item: any) => (item.stock_item_id || item.stockItemId) === productId)
    );
  };

  const openCreate = () => {
    if (activeInventory) return;
    setFormData({ name: '', unitPrice: 0, minThreshold: 5, quantity: 0, subcategoryId: subcategories[0]?.id || '', location: '', imageUrl: '' });
    setModalMode('CREATE');
  };

  const openEdit = (item: StockItem) => {
    if (activeInventory) return;
    if (isProductLinked(item.id)) {
      alert("Modification bloquée : Ce produit est déjà lié à des ventes.");
      return;
    }
    setSelectedItem(item);
    setFormData({
      name: item.name,
      unitPrice: Number(item.unitPrice),
      minThreshold: item.minThreshold,
      quantity: item.currentLevel,
      subcategoryId: item.subcategoryId || '',
      location: item.location || '',
      imageUrl: item.imageUrl || ''
    });
    setModalMode('EDIT');
  };

  const openDetails = async (item: StockItem) => {
    setSelectedItem(item);
    setModalMode('VIEW');
    try {
      const allMovements = await apiClient.get('/stock/movements');
      const itemMovements = allMovements.filter((m: any) => 
        (m.stockItemId || m.stock_item_id || m.stockItem?.id) === item.id
      );
      setSelectedItem(prev => prev ? { ...prev, movements: itemMovements } : null);
    } catch (e) {
      console.error("Erreur flux");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify || activeInventory) return;
    setActionLoading(true);
    setError(null);

    try {
      if (modalMode === 'CREATE') {
        const newItem = await apiClient.post('/stock', formData);
        setStocks([newItem, ...stocks]);
      } else if (modalMode === 'EDIT' && selectedItem) {
        const updated = await apiClient.put(`/stock/${selectedItem.id}`, formData);
        setStocks(stocks.map(s => s.id === updated.id ? updated : s));
      }
      setModalMode(null);
    } catch (err: any) {
      setError(err.message || "Erreur Kernel");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm || !canModify || activeInventory) return;
    setActionLoading(true);
    setError(null);
    try {
      await apiClient.delete(`/stock/${showDeleteConfirm.id}`);
      setStocks(stocks.filter(s => s.id !== showDeleteConfirm.id));
      const deletedName = showDeleteConfirm.name;
      setShowDeleteConfirm(null);
      setShowSuccessMessage(`Le produit "${deletedName}" a été marqué comme supprimé avec succès.`);
      setTimeout(() => setShowSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Erreur Kernel lors de la suppression.");
      setShowDeleteConfirm(null);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredStocks = stocks.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {activeInventory && (
        <div className="absolute inset-0 z-50 bg-slate-50/60 backdrop-blur-sm flex items-center justify-center p-6 rounded-[3rem]">
           <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-4 border-indigo-600 max-w-lg text-center space-y-8 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
                <ShieldAlert size={48} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 uppercase">Instance Verrouillée</h3>
              <p className="text-sm text-slate-500 font-medium uppercase leading-relaxed">Opérations suspendues par l'inventaire : {activeInventory.name}</p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center gap-3">
                 <Lock size={16} className="text-slate-400" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mode Lecture Seule</span>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase">
            <Boxes className="text-indigo-600" size={32} /> Centre Logistique
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Gestion Active du Stock</p>
        </div>
        {canModify && !isLimitReached && (
          <button onClick={openCreate} disabled={!!activeInventory} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-xl flex items-center gap-3 text-xs uppercase tracking-widest">
            <Plus size={18} /> RÉFÉRENCER ARTICLE
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
          <input type="text" placeholder="Rechercher par nom ou SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner" />
        </div>
        <button onClick={fetchData} className="p-4 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all shadow-sm">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-black uppercase flex items-center gap-3 animate-in shake">
          <AlertCircle size={16}/> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading ? [...Array(6)].map((_, i) => <div key={i} className="h-64 bg-white rounded-[3rem] animate-pulse border border-slate-100"></div>) : 
         filteredStocks.length === 0 ? (
           <div className="py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center col-span-1 md:col-span-2 xl:col-span-3">
             <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aucun produit trouvé</p>
           </div>
         ) : filteredStocks.map((item) => {
          const isLinked = isProductLinked(item.id);
          return (
            <div key={item.id} className={`bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all p-8 flex flex-col group border-b-4 border-transparent hover:border-indigo-500 ${isLinked ? 'grayscale-[0.3]' : ''}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                  ) : (
                    <Package size={28} />
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${item.currentLevel <= item.minThreshold ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                    {item.currentLevel <= item.minThreshold ? 'ALERTE STOCK' : 'EN STOCK'}
                  </span>
                  {isLinked && (
                    <span className="text-[7px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">Ventes liées</span>
                  )}
                </div>
              </div>
              <h3 className="font-black text-slate-900 text-lg uppercase truncate leading-none">{item.name}</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-3 truncate font-bold">SKU: {item.sku}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Disponible</p>
                   <p className="text-sm font-black text-slate-900">{item.currentLevel}</p>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Prix Unit.</p>
                   <p className="text-sm font-black text-slate-900">{Number(item.unitPrice).toLocaleString()} {currency}</p>
                 </div>
              </div>

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-50">
                 <button onClick={() => openDetails(item)} className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-2 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all">DÉTAILS <Eye size={16}/></button>
                 {canModify && (
                   <div className="flex gap-1">
                      <button 
                        onClick={() => openEdit(item)} 
                        disabled={!!activeInventory} 
                        title={isLinked ? "Modification verrouillée" : "Modifier"}
                        className={`p-2.5 rounded-xl transition-all ${isLinked ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
                      >
                        <Edit3 size={18}/>
                      </button>
                      <button 
                        onClick={() => !isLinked && setShowDeleteConfirm(item)} 
                        disabled={!!activeInventory}
                        title={isLinked ? "Suppression verrouillée" : "Supprimer"}
                        className={`p-2.5 rounded-xl transition-all ${isLinked ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                      >
                        <Trash2 size={18}/>
                      </button>
                   </div>
                 )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CRÉATION / ÉDITION */}
      {(modalMode === 'CREATE' || modalMode === 'EDIT') && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
             <div className={`px-10 py-8 text-white flex justify-between items-center ${modalMode === 'CREATE' ? 'bg-slate-900' : 'bg-amber-500'}`}>
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                   {modalMode === 'CREATE' ? <Plus size={24}/> : <Edit3 size={24}/>}
                   {modalMode === 'CREATE' ? 'Nouvel Article' : 'Révision Article'}
                </h3>
                <button onClick={() => setModalMode(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24}/></button>
             </div>
             <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Désignation Produit <span className="text-rose-500">*</span></label>
                     <input type="text" required placeholder="Désignation" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner" />
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Visual Produit</label>
                      <div className="relative group">
                        <input type="file" id="product_img_up" hidden onChange={handleFileUpload} accept="image/*" />
                        <label htmlFor="product_img_up" className={`block p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${formData.imageUrl ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-indigo-600'}`}>
                          {isUploading ? (
                            <Loader2 className="animate-spin mx-auto text-indigo-600" />
                          ) : formData.imageUrl ? (
                            <img src={formData.imageUrl} className="h-16 mx-auto rounded-lg object-contain" alt="Preview" />
                          ) : (
                            <div className="py-2">
                               <ImageIcon className="mx-auto text-slate-300" size={24} />
                               <p className="text-[8px] font-black uppercase mt-1 text-slate-500">Ajouter Photo</p>
                            </div>
                          )}
                        </label>
                      </div>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tarification & Catégorie</label>
                      <input type="number" required placeholder="Prix Unit. TTC" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner" />
                      <select value={formData.subcategoryId} onChange={e => setFormData({...formData, subcategoryId: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none appearance-none cursor-pointer shadow-inner">
                        <option value="">Sélectionner Sous-Catégorie</option>
                        {subcategories.map((sc: any) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                      </select>
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Gestion Stock</label>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase px-2">Seuil d'alerte</label>
                        <input type="number" value={formData.minThreshold} onChange={e => setFormData({...formData, minThreshold: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none shadow-inner" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase px-2">Emplacement</label>
                        <input type="text" placeholder="Ex: Zone A-04" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none shadow-inner" />
                      </div>
                   </div>
                </div>
                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setModalMode(null)} className="flex-1 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">ANNULER</button>
                  <button type="submit" disabled={actionLoading || isUploading} className={`flex-1 py-5 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${modalMode === 'CREATE' ? 'bg-indigo-600' : 'bg-amber-600'}`}>
                    {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <>{modalMode === 'CREATE' ? 'SCELLER LE PRODUIT' : 'ENREGISTRER'} <ArrowRight size={18}/></>}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-10 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                <ShieldAlert size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Confirmer la suppression ?</h3>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest leading-relaxed mb-8">
                Souhaitez-vous marquer le produit <span className="text-rose-600 font-black">"{showDeleteConfirm.name}"</span> comme "supprimer" ?<br/>
                Il sera retiré du catalogue actif du Kernel AlwaysData.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleConfirmDelete} 
                  disabled={actionLoading}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-rose-200"
                >
                  {actionLoading ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  OUI, SUPPRIMER L'ARTICLE
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

      {/* MODAL VUE DÉTAILLÉE (VIEW) */}
      {modalMode === 'VIEW' && selectedItem && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-500">
              <div className="px-12 py-10 bg-slate-900 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-3xl shadow-2xl shadow-indigo-500/20 overflow-hidden">
                      {selectedItem.imageUrl ? (
                        <img src={selectedItem.imageUrl} className="w-full h-full object-cover" alt={selectedItem.name} />
                      ) : (
                        <Package size={40}/>
                      )}
                    </div>
                    <div>
                       <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">{selectedItem.name}</h3>
                       <div className="flex items-center gap-4 mt-3">
                        <span className="text-[10px] font-black text-indigo-400 uppercase bg-indigo-500/10 px-3 py-1 rounded-full tracking-widest">SKU: {selectedItem.sku}</span>
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${selectedItem.currentLevel > selectedItem.minThreshold ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400 animate-pulse'}`}>
                          STOCK: {selectedItem.currentLevel > selectedItem.minThreshold ? 'OPÉRA' : 'CRITIQUE'}
                        </span>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setModalMode(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-3xl transition-all"><X size={32}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 grid grid-cols-12 gap-10 bg-slate-50/30 custom-scrollbar">
                 <div className="col-span-12 lg:col-span-4 space-y-8">
                    {selectedItem.imageUrl && (
                      <div className="bg-white p-4 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                        <img src={selectedItem.imageUrl} className="w-full rounded-2xl object-cover aspect-square shadow-inner" alt={selectedItem.name} />
                      </div>
                    )}
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                       <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><MapPin size={14}/> Localisation</h4>
                       <p className="text-sm font-black text-slate-800 uppercase leading-none">{selectedItem.location || 'ZONE DE STOCKAGE INDÉFINIE'}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                       <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Tag size={14}/> Valorisation PRMP</h4>
                       <p className="text-2xl font-black text-indigo-600">{(selectedItem.currentLevel * Number(selectedItem.unitPrice)).toLocaleString()} <span className="text-xs">{currency}</span></p>
                    </div>
                 </div>
                 <div className="col-span-12 lg:col-span-8 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col min-h-[450px]">
                    <div className="flex items-center justify-between mb-8">
                       <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><History size={18}/> Flux Logistiques</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                       {(!selectedItem.movements || selectedItem.movements.length === 0) ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-40 py-20">
                            <Boxes size={48}/>
                            <p className="text-[10px] font-black uppercase tracking-widest">Aucun flux tracé pour cet article</p>
                          </div>
                       ) : (
                          selectedItem.movements.map((m: any) => (
                             <div key={m.id} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-500 transition-all shadow-sm">
                                <div className="flex items-center gap-5">
                                   {m.type === 'IN' ? <ArrowUpCircle className="text-emerald-500" size={24}/> : <ArrowDownCircle className="text-rose-500" size={24}/>}
                                   <div>
                                     <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{m.reason || 'Saisie Manuelle'}</p>
                                     <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{new Date(m.createdAt || m.movementDate).toLocaleDateString('fr-FR')} • {m.userRef || 'Kernel Node'}</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className={`text-base font-black ${m.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>{m.type === 'IN' ? '+' : '-'}{m.qty}</p>
                                   <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest mt-1">Stock : {m.newLevel}</p>
                                </div>
                             </div>
                          ))
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
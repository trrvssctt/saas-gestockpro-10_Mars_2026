import React, { useState, useEffect } from 'react';
import { 
  Layers, Plus, Search, Edit3, Trash2, X, 
  RefreshCw, ChevronRight, Lock, Eye, Save, AlertCircle, ArrowRight,
  ShieldAlert, Info, CheckCircle2
} from 'lucide-react';
import { authBridge } from '../services/authBridge';
import { apiClient } from '../services/api';
import { SubscriptionPlan } from '../types';
import { useToast } from './ToastProvider';

interface Category {
  id: string;
  name: string;
  description: string;
}

const CategoryManager: React.FC<{ plan?: SubscriptionPlan }> = ({ plan }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  // View mode and pagination for cards
  const [viewMode, setViewMode] = useState<'CARD' | 'LIST'>('CARD');
  const [pageSize, setPageSize] = useState<number>(6); // number of cards to show initially

  // Filter state (search + simple filters similar to Payments)
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    linked: 'ALL'
  });
  const [showModal, setShowModal] = useState<'CREATE' | 'EDIT' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Category | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showDetailsCategory, setShowDetailsCategory] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', description: '' });

  const currentUser = authBridge.getSession()?.user;
  const canModify = currentUser ? authBridge.canPerform(currentUser, 'EDIT', 'categories') : false;
  const isLimitReached = plan?.id === 'FREE_TRIAL' && categories.length >= 3;
  const showToast = useToast();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catData, subData] = await Promise.all([
        apiClient.get('/categories'),
        apiClient.get('/subcategories')
      ]);
      setCategories(catData || []);
      setSubcategories(subData || []);
    } catch (err: any) { 
      setError("Erreur de liaison avec le Kernel.");
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Vérifie si une catégorie a des sous-catégories liées
  const hasLinkedSubs = (catId: string) => {
    return subcategories.some(s => (s.categoryId || s.category_id) === catId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;
    
    setActionLoading(true);
    setError(null);

    try {
      if (showModal === 'CREATE') {
        const newCat = await apiClient.post('/categories', formData);
        setCategories([newCat, ...categories]);
      } else if (showModal === 'EDIT' && selectedCategory) {
        const updatedCat = await apiClient.put(`/categories/${selectedCategory.id}`, formData);
        setCategories(categories.map(c => c.id === updatedCat.id ? updatedCat : c));
      }
      setShowModal(null);
      setFormData({ name: '', description: '' });
      setSelectedCategory(null);
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
      await apiClient.delete(`/categories/${showDeleteConfirm.id}`);
      setCategories(categories.filter(c => c.id !== showDeleteConfirm.id));
      setShowDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression.");
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (cat: Category) => {
    if (hasLinkedSubs(cat.id)) {
      showToast("Modification bloquée : Cette catégorie possède des sous-catégories liées.", 'error');
      return;
    }
    setSelectedCategory(cat);
    setFormData({ name: cat.name, description: cat.description || '' });
    setShowModal('EDIT');
  };

  const filteredCategories = categories.filter(c => {
    const q = filters.search || '';
    const matchesSearch = c.name.toLowerCase().includes(q.toLowerCase()) || (c.description || '').toLowerCase().includes(q.toLowerCase());

    const created = (c as any).createdAt ? new Date((c as any).createdAt).toISOString().split('T')[0] : '';
    const matchesFrom = filters.dateFrom === '' || (created && created >= filters.dateFrom);
    const matchesTo = filters.dateTo === '' || (created && created <= filters.dateTo);

    const linkedFlag = hasLinkedSubs(c.id);
    const matchesLinked = filters.linked === 'ALL' || (filters.linked === 'LINKED' && linkedFlag) || (filters.linked === 'UNLINKED' && !linkedFlag);

    return matchesSearch && matchesFrom && matchesTo && matchesLinked;
  });

  const visibleCategories = viewMode === 'CARD' ? filteredCategories.slice(0, pageSize) : filteredCategories;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <Layers className="text-indigo-600" size={32} /> Architecture Catalogue
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
            {canModify ? 'Gestion Active des Segments' : 'Liste Consultative (Vue Seule)'}
          </p>
        </div>
        {canModify ? (
          isLimitReached ? (
            <div className="flex items-center gap-3 px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-[10px] font-black uppercase tracking-widest shadow-sm">
              <Lock size={16} /> Limite 3 catégories atteinte (Trial)
            </div>
          ) : (
            <button 
              onClick={() => { setFormData({ name: '', description: '' }); setShowModal('CREATE'); }}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-xl flex items-center gap-3 text-xs uppercase tracking-widest"
            >
              <Plus size={18} /> CRÉER UNE CATÉGORIE
            </button>
          )
        ) : (
          <div className="flex items-center gap-3 px-6 py-3 bg-slate-100 text-slate-400 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest">
            <Lock size={14} /> Mode Lecture Seule
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher une catégorie..." 
            value={filters.search} 
            onChange={(e) => setFilters({...filters, search: e.target.value})} 
            className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" 
          />
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => setViewMode('CARD')}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest ${viewMode === 'CARD' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'}`}
          >
            Carte
          </button>
          <button
            onClick={() => setViewMode('LIST')}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest ${viewMode === 'LIST' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'}`}
          >
            Liste
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest ${showFilters ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            FILTRES
          </button>
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

      {/* Filtres avancés (similaire à Payments) */}
      {showFilters && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl animate-in slide-in-from-top-4 duration-300 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Recherche</label>
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="Nom ou description..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Période (Du)</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => setFilters({...filters, dateFrom: e.target.value})}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Période (Au)</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => setFilters({...filters, dateTo: e.target.value})}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Liés</label>
            <select
              value={filters.linked}
              onChange={e => setFilters({...filters, linked: e.target.value})}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
            >
              <option value="ALL">Tous</option>
              <option value="LINKED">Avec sous-catégories</option>
              <option value="UNLINKED">Sans sous-catégorie</option>
            </select>
          </div>

          <div className="md:col-span-3 flex gap-2 pt-2">
            <button
              onClick={() => setFilters({ search: '', dateFrom: '', dateTo: '', linked: 'ALL' })}
              className="px-6 py-3 bg-slate-100 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all w-full"
            >
              RÉINITIALISER LES FILTRES
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hydratation des segments...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center">
           <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aucune catégorie trouvée</p>
        </div>
      ) : (
        <>
          {viewMode === 'CARD' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleCategories.map(cat => {
                  const isLinked = hasLinkedSubs(cat.id);
                  return (
                    <div key={cat.id} className={`bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl transition-all group relative flex flex-col h-full border-b-4 border-b-transparent hover:border-b-indigo-500 ${isLinked ? 'grayscale-[0.5]' : ''}`}>
                       <div className="flex justify-between items-start mb-6 shrink-0">
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black transition-transform group-hover:scale-110 shadow-inner">
                            <Layers size={24}/>
                          </div>
                          {canModify && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShowDetailsCategory(cat)}
                                title="Détails"
                                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                              >
                                <Eye size={18} />
                              </button>
                              <button 
                                onClick={() => openEdit(cat)} 
                                title={isLinked ? "Modification verrouillée" : "Modifier"}
                                className={`p-2 rounded-xl transition-all ${isLinked ? 'bg-slate-50 text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                              >
                                <Edit3 size={18}/>
                              </button>
                              
                              <button 
                                onClick={() => !isLinked && setShowDeleteConfirm(cat)} 
                                title={isLinked ? "Suppression verrouillée" : "Supprimer"}
                                className={`p-2 rounded-xl transition-all ${isLinked ? 'bg-slate-50 text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
                              >
                                <Trash2 size={18}/>
                              </button>
                            </div>
                          )}
                       </div>
                       <div className="flex-1">
                         <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2 truncate">{cat.name}</h3>
                         <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-3">{cat.description || 'Segment de produits métier défini dans le Kernel.'}</p>
                         {isLinked && (
                           <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl w-fit">
                              <Info size={12} className="text-slate-400" />
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Liens actifs détectés</span>
                           </div>
                         )}
                       </div>
                       <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center shrink-0">
                          
                          <span className="text-[8px] font-mono text-slate-300 font-bold uppercase tracking-widest">ID:{cat.id.slice(0,8)}</span>
                       </div>
                    </div>
                  );
                })}
              </div>

              {filteredCategories.length > visibleCategories.length && (
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
                    <th className="px-6 py-4">Nom</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-center">Liés</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredCategories.map(cat => {
                    const isLinked = hasLinkedSubs(cat.id);
                    return (
                      <tr key={cat.id} className="group hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4 font-black text-slate-900">{cat.name}</td>
                        <td className="px-6 py-4 text-slate-500 text-sm">{cat.description}</td>
                        <td className="px-6 py-4 text-center text-[11px] font-black">{isLinked ? 'Oui' : 'Non'}</td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          {canModify && (
                            <>
                            <button onClick={() => setShowDetailsCategory(cat)} className="px-3 py-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                                <Eye size={16} />
                              </button>
                              <button onClick={() => openEdit(cat)} className={`px-3 py-2 rounded-xl ${isLinked ? 'bg-slate-50 text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}>
                                <Edit3 size={16} />
                              </button>
                              
                              <button onClick={() => !isLinked && setShowDeleteConfirm(cat)} className={`px-3 py-2 rounded-xl ${isLinked ? 'bg-slate-50 text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}>
                                <Trash2 size={16} />
                              </button>
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
        </>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
             <div className={`px-10 py-8 text-white flex justify-between items-center ${showModal === 'CREATE' ? 'bg-slate-900' : 'bg-amber-500'}`}>
                <div className="flex items-center gap-4">
                  {showModal === 'CREATE' ? <Plus size={28}/> : <Edit3 size={28}/>}
                  <h3 className="text-xl font-black uppercase tracking-tight">
                    {showModal === 'CREATE' ? 'Nouveau Segment' : 'Modifier Segment'}
                  </h3>
                </div>
                <button onClick={() => setShowModal(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24}/></button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-10 space-y-8">
                <div className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Désignation de la catégorie <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        required 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" 
                        placeholder="Ex: Hardware, Services..."
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Description / Note technique</label>
                      <textarea 
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all min-h-[120px] shadow-inner"
                        placeholder="Précisez le périmètre de cette catégorie..."
                      ></textarea>
                   </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(null)} 
                    className="flex-1 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    ANNULER
                  </button>
                  <button 
                    type="submit" 
                    disabled={actionLoading} 
                    className={`flex-1 py-5 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 ${showModal === 'CREATE' ? 'bg-indigo-600 hover:bg-slate-900' : 'bg-amber-600 hover:bg-amber-700'}`}
                  >
                    {actionLoading ? <RefreshCw className="animate-spin" size={18} /> : (
                      <>SCELLER <ArrowRight size={18}/></>
                    )}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-10 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                <ShieldAlert size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Confirmer la suppression ?</h3>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest leading-relaxed mb-8">
                Êtes-vous sûr de vouloir supprimer la catégorie <span className="text-rose-600 font-black">"{showDeleteConfirm.name}"</span> ?<br/>
                Cette action marquera le segment comme "supprimer" dans le registre.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleConfirmDelete} 
                  disabled={actionLoading}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-rose-200"
                >
                  {actionLoading ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  OUI, SUPPRIMER LE SEGMENT
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

      {/* DETAILS MODAL */}
      {showDetailsCategory && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
              <div className="px-10 py-8 bg-slate-900 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                   <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                     <Layers size={28} />
                   </div>
                   <div>
                     <h3 className="text-2xl font-black uppercase tracking-tight">{showDetailsCategory.name}</h3>
                     <p className="text-xs text-indigo-200 uppercase tracking-widest mt-1">ID: {showDetailsCategory.id.slice(0,8)}</p>
                   </div>
                 </div>
                 <button onClick={() => setShowDetailsCategory(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                     <h4 className="text-xs font-black uppercase text-slate-400">Détails</h4>
                     <p className="text-sm font-black text-slate-800 mt-3">{showDetailsCategory.description || '—'}</p>
                     <div className="mt-6">
                       <h5 className="text-[10px] font-black text-slate-400 uppercase">Sous-catégories liées</h5>
                       <p className="text-2xl font-black text-indigo-700 mt-2">{subcategories.filter(s => (s.categoryId || s.category_id) === showDetailsCategory.id).length}</p>
                     </div>
                   </div>
                   <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                     <h4 className="text-xs font-black uppercase text-slate-400">Liste des sous-catégories</h4>
                     <div className="mt-4 space-y-3">
                       {subcategories.filter(s => (s.categoryId || s.category_id) === showDetailsCategory.id).length === 0 ? (
                         <div className="py-10 text-center text-slate-300">Aucune sous-catégorie liée</div>
                       ) : (
                         subcategories.filter(s => (s.categoryId || s.category_id) === showDetailsCategory.id).map(sc => (
                           <div key={sc.id} className="p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                             <div>
                               <p className="font-black text-slate-800">{sc.name}</p>
                               <p className="text-xs text-slate-400 mt-1">ID: {sc.id.slice(0,8)}</p>
                             </div>
                           </div>
                         ))
                       )}
                     </div>
                   </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
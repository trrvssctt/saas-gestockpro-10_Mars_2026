
import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Plus, Search, Calendar, ChevronRight, 
  Trash2, Loader2, FileText, CheckCircle2, AlertCircle, RefreshCw, X, ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { apiClient } from '../services/api';
import InventoryCampaignAudit from './InventoryCampaignAudit';

const InventoryCampaign = ({ settings }: { settings: any }) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCampaign, setActiveCampaign] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState(`Inventaire du ${new Date().toLocaleDateString()}`);
  const [actionLoading, setActionLoading] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/stock/campaigns');
      setCampaigns(data || []);
    } catch (e) {
      console.error("Fetch Campaigns error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreate = async () => {
    if (!newCampaignName.trim()) return;
    setActionLoading(true);
    setCreationError(null);
    try {
      const data = await apiClient.post('/stock/campaigns', { name: newCampaignName });
      setCampaigns([data, ...campaigns]);
      setActiveCampaign(data);
      setShowCreateModal(false);
    } catch (e: any) {
      // Affichage du message d'erreur spécifique demandé
      setCreationError(e.message || "Une campagne d'inventaire est déjà en cours. Veuillez la clôturer avant d'en créer une nouvelle.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCreateModal = async () => {
    setCreationError(null);
    setActionLoading(true);
    try {
      const data = await apiClient.get('/stock/campaigns');
      setCampaigns(data || []);
      const draft = data.find((c: any) => c.status === 'DRAFT');
      
      if (draft) {
        alert("Une campagne d'inventaire est déjà en cours. Veuillez la clôturer avant d'en créer une nouvelle.");
        return;
      }
      
      setNewCampaignName(`Inventaire du ${new Date().toLocaleDateString()}`);
      setShowCreateModal(true);
    } catch (e) {
      alert("Impossible de vérifier l'état du Kernel.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {activeCampaign ? (
        <InventoryCampaignAudit 
          campaign={activeCampaign} 
          settings={settings} 
          onBack={() => { setActiveCampaign(null); fetchCampaigns(); }} 
          onNewCampaign={handleOpenCreateModal}
        />
      ) : (
        <>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
                <ClipboardCheck className="text-indigo-600" size={32} /> Audit Inventaire
              </h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Saisie Physique & Réconciliation</p>
            </div>
            <button 
              onClick={handleOpenCreateModal}
              disabled={actionLoading}
              className={`px-8 py-4 rounded-2xl font-black transition-all shadow-xl flex items-center gap-3 text-xs uppercase tracking-widest active:scale-95 ${actionLoading ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
            >
              {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <><Plus size={18} /> NOUVELLE CAMPAGNE</>}
            </button>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
            {loading && campaigns.length === 0 ? (
              <div className="py-40 text-center flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Initialisation des registres...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-40 text-center flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[2.5rem] flex items-center justify-center">
                  <ClipboardCheck size={40} />
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Aucune campagne d'inventaire archivée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b">
                      <th className="px-10 py-6">Campagne</th>
                      <th className="px-10 py-6">Date de création</th>
                      <th className="px-10 py-6 text-center">État</th>
                      <th className="px-10 py-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-10 py-6">
                          <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{c.name}</p>
                          <p className="text-[8px] font-mono text-slate-400">ID: {c.id.slice(0,8)}</p>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-3">
                            <Calendar size={14} className="text-slate-300" />
                            <span className="text-xs font-bold text-slate-600">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${c.status === 'VALIDATED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {c.status === 'VALIDATED' ? 'ARCHIVÉ / SCELLÉ' : 'EN COURS'}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <button 
                            onClick={() => setActiveCampaign(c)}
                            className="px-6 py-2.5 bg-white border border-slate-100 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2 ml-auto"
                          >
                            {c.status === 'VALIDATED' ? <FileText size={14}/> : <ChevronRight size={14}/>}
                            {c.status === 'VALIDATED' ? 'VOIR RAPPORT' : 'REPRENDRE LA SAISIE'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="px-10 py-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3"><ClipboardCheck size={24}/><h3 className="text-lg font-black uppercase">Initialisation Audit</h3></div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-10 space-y-6">
              {creationError && (
                <div className="p-5 bg-rose-50 border border-rose-100 rounded-3xl text-rose-600 flex items-start gap-4 animate-in shake">
                  <ShieldAlert size={24} className="shrink-0" />
                  <p className="text-[10px] font-black uppercase leading-relaxed">
                    {creationError}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2 block">Désignation de la campagne</label>
                <input 
                  type="text" 
                  value={newCampaignName} 
                  onChange={e => setNewCampaignName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10" 
                />
              </div>
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <p className="text-[9px] font-bold text-indigo-700 uppercase leading-relaxed">Cette opération fige les quantités théoriques actuelles pour permettre une comparaison fidèle avec vos stocks physiques.</p>
              </div>
              <button 
                onClick={handleCreate}
                disabled={actionLoading}
                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all ${actionLoading ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-slate-900'}`}
              >
                {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <><Plus size={18} /> DÉMARRER LA CAMPAGNE</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryCampaign;

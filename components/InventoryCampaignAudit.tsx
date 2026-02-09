import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle2, Loader2, Printer, Download,
  Search, Package, RefreshCw, FileText, Plus,
  AlertTriangle, ArrowRight, ShieldCheck, History,
  X, Info, Database, Zap
} from 'lucide-react';
import { apiClient } from '../services/api';
import InventoryAuditReport from './InventoryAuditReport';

interface Props {
  campaign: any;
  settings: any;
  onBack: () => void;
  onNewCampaign: () => void;
}

const InventoryCampaignAudit: React.FC<Props> = ({ campaign, settings, onBack, onNewCampaign }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [shouldSyncStock, setShouldSyncStock] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get(`/stock/campaigns/${campaign.id}`);
      setItems(data.items || []);
    } catch (e) {
      console.error("Fetch Campaign Items error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [campaign.id]);

  const handleUpdateQty = async (itemId: string, val: string) => {
    const qty = parseInt(val) || 0;
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, countedQty: qty } : i));
    
    setIsSaving(itemId);
    try {
      await apiClient.put(`/stock/campaigns/${campaign.id}/items/${itemId}`, { countedQty: qty });
    } catch (e) {
      console.error("Autosave error");
    } finally {
      setIsSaving(null);
    }
  };

  const finalizeClosure = async () => {
    setIsValidating(true);
    try {
      await apiClient.post(`/stock/campaigns/${campaign.id}/validate`, { syncStock: shouldSyncStock });
      campaign.status = 'VALIDATED';
      setShowValidationModal(false);
      setShowReport(true);
    } catch (e: any) {
      alert(e.message || "Erreur lors de la clôture.");
    } finally {
      setIsValidating(false);
    }
  };

  const filteredItems = items.filter(i => 
    (i.stock_item?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.stock_item?.sku || '').toLowerCase().includes(search.toLowerCase())
  );

  const isLocked = campaign.status === 'VALIDATED';

  if (showReport || isLocked) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
           <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-inner"><ArrowLeft size={20} /></button>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{campaign.name}</h2>
              <p className="text-emerald-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                <ShieldCheck size={12}/> AUDIT SCELLÉ & ARCHIVÉ
              </p>
            </div>
          </div>
          <div className="flex gap-4">
             <button 
                onClick={onNewCampaign}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-xl flex items-center gap-3 text-xs uppercase tracking-widest"
              >
                <Plus size={18} /> NOUVELLE CAMPAGNE
              </button>
              <div className="flex items-center justify-end gap-3">
                <button onClick={async () => {
                  try {
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

                    const canvas = await html2canvas(node as HTMLElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                    canvas.toBlob((blob: Blob | null) => {
                      if (!blob) { alert('Impossible de générer l\'image'); return; }
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      const filename = `${(campaign?.name || campaign?.id)}.png`;
                      a.download = filename;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    }, 'image/png', 0.95);
                  } catch (err: any) {
                    console.error('Capture/download error', err);
                    alert(err?.message || 'Erreur lors de la génération de l\'image');
                  }
                }} className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-sm hover:bg-slate-50"><Download size={18}/> Télécharger</button>
              </div>
          </div>
        </div>
        
        <div id="document-render" className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm p-10">
          <InventoryAuditReport items={items} settings={settings} campaign={campaign} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20 relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-inner"><ArrowLeft size={20} /></button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{campaign.name}</h2>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1 italic">
              INVENTAIRE À L'AVEUGLE : SAISIE PHYSIQUE UNIQUEMENT
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowValidationModal(true)}
          className="bg-indigo-600 text-white px-10 py-5 rounded-[1.5rem] font-black hover:bg-slate-900 transition-all shadow-xl flex items-center gap-3 text-xs uppercase tracking-widest active:scale-95"
        >
          <CheckCircle2 size={18} /> CLÔTURER L'AUDIT
        </button>
      </div>

      <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input 
            type="text" 
            placeholder="Rechercher un article à compter..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-[1.5rem] pl-16 pr-6 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner" 
          />
        </div>
        <div className="flex items-center gap-2 px-6 py-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 text-[10px] font-black uppercase">
          <RefreshCw size={14} className="animate-spin" /> SAUVEGARDE AUTO
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/80 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b">
              <th className="px-10 py-6">Désignation de l'Article</th>
              <th className="px-10 py-6 text-center">Quantité Physique Comptée</th>
              <th className="px-10 py-6 text-right">Statut Saisie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={3} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></td></tr>
            ) : filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/30 transition-all group">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-white transition-colors"><Package size={24}/></div>
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{item.stock_item?.name}</p>
                      <p className="text-[9px] font-mono text-slate-400 font-bold uppercase">SKU: {item.stock_item?.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="px-10 py-6 text-center">
                  <div className="relative inline-block w-40">
                    <input 
                      type="number" 
                      min="0"
                      value={item.countedQty} 
                      onChange={e => handleUpdateQty(item.id, e.target.value)}
                      className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-center text-xl font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all ${isSaving === item.id ? 'opacity-50' : ''}`} 
                    />
                    {isSaving === item.id && (
                      <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-indigo-600"><Loader2 className="animate-spin" size={14}/></div>
                    )}
                  </div>
                </td>
                <td className="px-10 py-6 text-right">
                  {item.countedQty > 0 ? (
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 justify-end">
                       <CheckCircle2 size={12}/> COMPTÉ
                    </span>
                  ) : (
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 justify-end">
                       À COMPTER
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE VALIDATION AVANT CLÔTURE AVEC DEMANDE DE SYNCHRONISATION */}
      {showValidationModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh]">
             <div className="px-10 py-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <AlertTriangle className="text-amber-400" size={28}/>
                  <h3 className="text-xl font-black uppercase tracking-tight">Clôture & Réconciliation</h3>
                </div>
                <button onClick={() => setShowValidationModal(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24} className="text-white"/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4">
                   <Info size={24} className="text-amber-600 shrink-0" />
                   <p className="text-[10px] font-bold text-amber-800 uppercase leading-relaxed">
                     Voici les écarts détectés entre votre comptage physique et le stock théorique du système. 
                     Veuillez choisir si vous souhaitez synchroniser les stocks réels.
                   </p>
                </div>

                <InventoryAuditReport items={items} settings={settings} campaign={campaign} />

                {/* Question de réconciliation */}
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white space-y-6 shadow-2xl border border-white/10">
                   <div className="flex items-start gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${shouldSyncStock ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                         {shouldSyncStock ? <RefreshCw className="animate-spin-slow" size={24}/> : <Database size={24}/>}
                      </div>
                      <div className="flex-1">
                         <h4 className="text-lg font-black uppercase tracking-tight">Réajustement Logistique Automatique</h4>
                         <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1 uppercase tracking-widest">
                           Souhaitez-vous aligner les quantités du catalogue sur vos saisies physiques ?
                         </p>
                      </div>
                      <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                         <button 
                           onClick={() => setShouldSyncStock(true)}
                           className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${shouldSyncStock ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                         >
                           OUI (SYNCHRO)
                         </button>
                         <button 
                           onClick={() => setShouldSyncStock(false)}
                           className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${!shouldSyncStock ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                         >
                           NON (ARCHIVE)
                         </button>
                      </div>
                   </div>
                   
                   {shouldSyncStock && (
                     <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2">
                        <Zap size={20} className="text-indigo-400" />
                        <p className="text-[9px] font-bold text-indigo-300 uppercase leading-relaxed">
                          Chaque écart générera une écriture de type "ADJUSTMENT" dans votre registre de mouvements flux pour une traçabilité totale.
                        </p>
                     </div>
                   )}
                </div>
             </div>

             <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
                <button 
                  onClick={() => setShowValidationModal(false)}
                  className="flex-1 py-5 border-2 border-slate-200 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all"
                >
                  ANNULER / REPRENDRE
                </button>
                <button 
                  onClick={finalizeClosure}
                  disabled={isValidating}
                  className={`flex-1 py-5 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${shouldSyncStock ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-black'}`}
                >
                  {isValidating ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18}/> {shouldSyncStock ? "VALIDER & RÉAJUSTER LES STOCKS" : "VALIDER & ARCHIVER SANS MODIF"}</>}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryCampaignAudit;

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, Search, RefreshCw, Mail, MessageCircle, 
  AlertCircle, ChevronRight, DollarSign, Users, 
  Send, X, Loader2, CheckCircle2, History, Info,
  TrendingDown, Phone, Eye
} from 'lucide-react';
import { apiClient } from '../services/api';
import { useToast } from './ToastProvider';
import { Customer } from '../types';

const Recovery = ({ currency }: { currency: string }) => {
  const [debtors, setDebtors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showEmailModal, setShowEmailModal] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [emailContent, setEmailContent] = useState({ subject: '', body: '' });
  const [showRemindersModal, setShowRemindersModal] = useState(false);
  const [selectedDebtors, setSelectedDebtors] = useState<string[]>([]);
  const [perPage, setPerPage] = useState<number | 'ALL'>(25);
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const showToast = useToast();

  const fetchDebtors = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/sales');
      
      const debtMap: Record<string, any> = {};
      data.forEach((sale: any) => {
        if (sale.status === 'EN_COURS' || sale.status === 'TERMINE') {
          const ttc = parseFloat(sale.totalTtc || sale.total_ttc || 0);
          const paid = parseFloat(sale.amountPaid || sale.amount_paid || 0);
          const due = Math.max(0, ttc - paid);

          const customer = sale.customer;
          const customerId = sale.customerId || sale.customer_id;

          if (due > 0 && customer && customerId) {
            if (!debtMap[customerId]) {
              debtMap[customerId] = { 
                id: customerId,
                companyName: customer.companyName, 
                email: customer.email,
                phone: customer.phone,
                outstandingBalance: 0 
              };
            }
            debtMap[customerId].outstandingBalance += due;
          }
        }
      });
      setDebtors(Object.values(debtMap));
    } catch (err) {
      console.error("Recovery fetch error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDebtors(); }, []);

  const stats = useMemo(() => {
    const totalDebt = debtors.reduce((sum, d) => sum + (d.outstandingBalance || 0), 0);
    return { total: totalDebt, count: debtors.length, average: debtors.length > 0 ? totalDebt / debtors.length : 0 };
  }, [debtors]);

  const filteredDebtors = debtors.filter(d => 
    (d.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const displayedDebtors = useMemo(() => {
    if (perPage === 'ALL') return filteredDebtors;
    return filteredDebtors.slice(0, perPage as number);
  }, [filteredDebtors, perPage]);

  const handleWhatsApp = (customer: any) => {
    if (!customer.phone) { showToast("Numéro de téléphone manquant pour ce client.", 'error'); return; }
    const message = `Bonjour ${customer.companyName}, nous vous contactons concernant votre solde client de ${customer.outstandingBalance.toLocaleString()} ${currency} dans notre établissement. Merci de nous recontacter pour la régularisation.`;
    window.open(`https://wa.me/${customer.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const openEmailPreview = (customer: any) => {
    const subject = `Relance de paiement - ${customer.companyName}`;
    const body = `Bonjour ${customer.companyName},\n\nSauf erreur de notre part, votre compte client présente un solde débiteur de ${customer.outstandingBalance.toLocaleString()} ${currency}.\n\nNous vous remercions de bien vouloir régulariser cette situation dans les plus brefs délais.\n\nRestant à votre disposition,\nL'équipe administrative.`;
    
    setEmailContent({ subject, body });
    setShowEmailModal(customer);
  };

  const toggleSelect = (id: string) => {
    setSelectedDebtors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = (list: any[]) => {
    const allIds = list.map(d => d.id).filter(Boolean);
    setSelectedDebtors(prev => {
      const allSelected = allIds.every(id => prev.includes(id));
      return allSelected ? [] : allIds;
    });
  };

  const sendSelectedViaGmail = (list: any[]) => {
    const targets = list.filter(d => selectedDebtors.includes(d.id));
    if (targets.length === 0) {
      setNotification({ message: 'Aucun destinataire sélectionné.', type: 'error' });
      window.setTimeout(() => setNotification(null), 4000);
      return;
    }
    targets.forEach((t: any) => {
      const subject = `Relance de paiement - ${t.companyName}`;
      const body = `Bonjour ${t.companyName},\n\nSauf erreur de notre part, votre compte client présente un solde débiteur de ${t.outstandingBalance.toLocaleString()} ${currency}.\n\nNous vous remercions de bien vouloir régulariser cette situation dans les plus brefs délais.\n\nRestant à votre disposition,\nL'équipe administrative.`;
      const to = t.email;
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(gmailUrl, '_blank');
    });
    setShowRemindersModal(false);
    setSelectedDebtors([]);
  };

  const sendViaGmail = () => {
    if (!showEmailModal) return;
    const to = showEmailModal.email;
    const { subject, body } = emailContent;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
    setShowEmailModal(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {notification && (
        <div className={`fixed top-6 right-6 z-[900] w-full max-w-xs rounded-2xl text-white shadow-lg px-4 py-3 flex items-start gap-3 ${notification.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          <div className="mt-0.5">
            {notification.type === 'error' ? (
              <AlertCircle size={20} />
            ) : (
              <CheckCircle2 size={20} />
            )}
          </div>
          <div className="flex-1 text-sm font-black">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="opacity-80 hover:opacity-100 p-1 rounded-full">
            <X size={18} />
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-rose-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Landmark size={80}/></div>
          <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-1">Encours Global Débiteurs</p>
          <h3 className="text-3xl font-black">{stats.total.toLocaleString()} {currency}</h3>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dossiers à Recouvrer</p>
             <h3 className="text-2xl font-black text-slate-900">{stats.count} Clients</h3>
           </div>
           <div className="flex items-center gap-3">
             <button onClick={() => setShowRemindersModal(true)} className="px-4 py-3 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all">Envoyer Rappels</button>
             <button onClick={fetchDebtors} className="p-4 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all shadow-inner">
               <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
             </button>
           </div>
        </div>
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl flex items-center gap-6">
           <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md"><TrendingDown size={24}/></div>
           <div><p className="text-[10px] font-black uppercase opacity-60">Dette Moyenne / Client</p><h3 className="text-xl font-black">{Math.round(stats.average).toLocaleString()} {currency}</h3></div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/30">
          <div className="relative flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Filtrer par nom client ou email..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-black text-slate-500">Afficher</label>
              <select value={perPage} onChange={e => setPerPage(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black outline-none">
                <option value={5}>5</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={'ALL'}>Tous</option>
              </select>
            </div>
          </div>
        </div>
        {loading ? (
           <div className="py-32 text-center flex flex-col items-center gap-4">
             <Loader2 className="animate-spin text-rose-600" size={40} />
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Analyse des flux transactionnels...</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b">
                  <th className="px-10 py-6">Débiteur</th>
                  <th className="px-10 py-6 text-right">Encours Total</th>
                  <th className="px-10 py-6 text-right">Relance Rapide</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDebtors.length === 0 ? (
                  <tr><td colSpan={3} className="py-20 text-center font-black text-slate-300 uppercase text-[10px]">Aucun impayé détecté</td></tr>
                ) : displayedDebtors.map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-10 py-6">
                      <p className="text-sm font-black text-slate-800 uppercase">{d.companyName}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{d.email || 'Aucun email'}</p>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <span className="text-lg font-black text-rose-600">{d.outstandingBalance.toLocaleString()}</span>
                       <span className="text-[10px] font-black text-slate-400 ml-2">{currency}</span>
                    </td>
                    <td className="px-10 py-6 text-right space-x-2">
                       <button onClick={() => handleWhatsApp(d)} className="p-3 bg-white border border-slate-100 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl shadow-sm transition-all" title="Relancer via WhatsApp"><MessageCircle size={18} /></button>
                       {d.email && (
                         <button onClick={() => openEmailPreview(d)} className="p-3 bg-white border border-slate-100 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl shadow-sm transition-all" title="Relancer par Email"><Mail size={18} /></button>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 text-xs text-slate-500 font-black flex justify-end">Affichage {displayedDebtors.length} sur {filteredDebtors.length} résultats</div>
          </div>
        )}
      </div>
      
      {/* MODAL PREVIEW EMAIL */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="px-10 py-8 bg-indigo-600 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4"><Mail size={28}/><h3 className="text-xl font-black uppercase tracking-tight">Prévisualisation Relance</h3></div>
                 <button onClick={() => setShowEmailModal(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24}/></button>
              </div>
              <div className="p-10 space-y-8">
                 <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Destinataire</p>
                       <p className="text-sm font-black text-slate-900">{showEmailModal.companyName} ({showEmailModal.email})</p>
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Objet du mail</label>
                       <input 
                         type="text" 
                         value={emailContent.subject} 
                         onChange={e => setEmailContent({...emailContent, subject: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10" 
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Corps du message</label>
                       <textarea 
                         rows={8}
                         value={emailContent.body} 
                         onChange={e => setEmailContent({...emailContent, body: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10" 
                       />
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => setShowEmailModal(null)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">ANNULER</button>
                    <button onClick={sendViaGmail} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3">
                       <Send size={18}/> ENVOYER VIA GMAIL
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: SEND REMINDERS */}
      {showRemindersModal && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="px-8 py-6 bg-indigo-600 text-white flex items-center justify-between">
              <h3 className="font-black uppercase">Envoyer des rappels</h3>
              <button onClick={() => { setShowRemindersModal(false); setSelectedDebtors([]); }} className="p-3 rounded-2xl hover:bg-white/10"><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input id="select-all" type="checkbox" className="w-4 h-4" onChange={() => toggleSelectAll(debtors.filter(d => d.email))} checked={debtors.filter(d => d.email).every(d => selectedDebtors.includes(d.id)) && debtors.filter(d => d.email).length>0} />
                  <label htmlFor="select-all" className="text-sm font-black">Sélectionner tous ({debtors.filter(d => d.email).length})</label>
                </div>
                <div className="text-sm text-slate-500">Clients avec email seulement affichés</div>
              </div>
              <div className="max-h-80 overflow-y-auto border rounded-2xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[11px] font-black uppercase tracking-widest border-b">
                      <th className="px-6 py-3"> </th>
                      <th className="px-6 py-3">Client</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3 text-right">Montant dû</th>
                      <th className="px-6 py-3"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {debtors.filter(d => d.email).length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-400 font-black text-sm">Aucun débiteur avec email trouvé</td></tr>
                    ) : debtors.filter(d => d.email).map((d: any) => (
                      <tr key={d.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4">
                          <input type="checkbox" checked={selectedDebtors.includes(d.id)} onChange={() => toggleSelect(d.id)} className="w-4 h-4" />
                        </td>
                        <td className="px-6 py-4 font-black text-sm">{d.companyName}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{d.email}</td>
                        <td className="px-6 py-4 text-right font-black text-rose-600">{d.outstandingBalance.toLocaleString()} <span className="text-xs text-slate-400">{currency}</span></td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => { openEmailPreview(d); setShowRemindersModal(false); }} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 hover:bg-indigo-600 hover:text-white transition-all">Voir l'aperçu</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-4 mt-6">
                <button onClick={() => { setShowRemindersModal(false); setSelectedDebtors([]); }} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black">ANNULER</button>
                <button onClick={() => sendSelectedViaGmail(debtors)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black">ENVOYER VIA GMAIL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-10 bg-indigo-50 border border-indigo-100 rounded-[3rem] flex items-start gap-6">
         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0"><Info size={24}/></div>
         <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-indigo-900">Intelligence de recouvrement</h4>
            <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">Cette liste est générée dynamiquement en analysant l'écart entre le montant TTC scellé des ventes et les acomptes réellement encaissés. Les ventes annulées sont automatiquement exclues des calculs de solde.</p>
         </div>
      </div>
    </div>
  );
};

export default Recovery;

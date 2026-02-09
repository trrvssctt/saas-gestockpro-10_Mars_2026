
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, Check, ShieldCheck, Zap, Download, Calendar, 
  Receipt, Info, Lock, ArrowUpRight, Loader2, X, AlertTriangle,
  History, TrendingUp, ShieldAlert, Sparkles, Star, ChevronRight,
  FileText, CheckCircle2, Clock, RefreshCw, Smartphone, QrCode,
  Camera, CheckCircle, ArrowRight, BadgeCheck, ToggleLeft, ToggleRight,
  FileDown, Printer
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../constants';
import { User, UserRole, SubscriptionPlan } from '../types';
import { apiClient } from '../services/api';
import DocumentPreview from './DocumentPreview';
import waveQr from '../assets/qr_code_marchant_wave.png';
import waveLogo from '../assets/wave_logo.png';

interface SubscriptionProps {
  user: User;
  currency: string;
}

const Subscription: React.FC<SubscriptionProps> = ({ user, currency }) => {
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // États de transaction (forçons Wave pour le moment)
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'MOBILE' | null>('MOBILE');
  const [operator, setOperator] = useState<'WAVE' | 'ORANGE' | null>('WAVE');
  const [txReference, setTxReference] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // État pour l'aperçu de facture d'abonnement
  const [showDocGenerator, setShowDocGenerator] = useState<{ sale: any, mode: 'SUBSCRIPTION_INVOICE' } | null>(null);

  const isAdmin = user.roles?.includes(UserRole.ADMIN) || user.role === UserRole.ADMIN;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subInfo, plans] = await Promise.all([
        apiClient.get('/billing/my-subscription'),
        apiClient.get('/billing/plans')
      ]);
      setSubscriptionData(subInfo);
      setAvailablePlans(plans);
    } catch (e) {
      console.error("Erreur sync abonnement", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentSubscription = subscriptionData?.subscription;
  const paymentHistory = subscriptionData?.payments || [];

  const currentPlan = useMemo(() => {
    return availablePlans.find(p => p.id === currentSubscription?.planId) || availablePlans[0] || SUBSCRIPTION_PLANS[0];
  }, [currentSubscription, availablePlans]);

  const filteredPlans = useMemo(() => {
    const currentPrice = Number(currentPlan?.price || 0);
    return (availablePlans || [])
      .filter(p => p.id !== 'FREE_TRIAL')
      .filter(p => Number(p?.price || 0) > currentPrice);
  }, [availablePlans, currentPlan]);

  const handleUpgradeClick = (plan: SubscriptionPlan) => {
    if (!isAdmin) return;
    setSelectedPlan(plan);
    setPaymentMethod(null);
    setOperator(null);
    setTxReference('');
    setPhoneNumber('');
    setShowPaymentModal(true);
  };

  

  const plansSection = useMemo(() => {
    if (!filteredPlans || filteredPlans.length === 0) {
      return (
        <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm text-center">
          <div className="flex flex-col items-center justify-center py-12">
            <Sparkles size={64} className="text-amber-400 animate-bounce" />
            <h3 className="text-2xl font-black text-slate-900 mt-6">Votre entreprise est au sommet de la chaîne humanitaire 🎉</h3>
            <p className="text-sm text-slate-500 mt-2">Aucune offre supérieure disponible — merci pour votre soutien.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPlans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-[3rem] border-2 border-slate-100 p-10 hover:border-indigo-600 transition-all group relative overflow-hidden flex flex-col shadow-sm hover:shadow-2xl">
            {plan.isPopular && (
              <div className="absolute top-6 right-6 bg-indigo-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">RECOMMANDÉ</div>
            )}
            <div className="mb-8">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 tracking-tighter">{plan.price.toLocaleString()}</span>
                <span className="text-slate-400 font-bold uppercase text-[10px]">{currency} / mois</span>
              </div>
            </div>
            <div className="space-y-4 flex-1 mb-10">
              <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                <div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100"><Check size={12}/></div>
                {plan.maxUsers} Utilisateur(s)
              </div>
              {plan.hasAiChatbot && (
                <div className="flex items-center gap-3 text-xs font-bold text-indigo-600">
                  <div className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100"><Zap size={12}/></div>
                  IA Orchestrator Pro
                </div>
              )}
            </div>
            <button 
              onClick={() => handleUpgradeClick(plan)}
              disabled={!isAdmin}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              MIGRER VERS CE PLAN
            </button>
          </div>
        ))}
      </div>
    );
  }, [filteredPlans, currency, handleUpgradeClick, isAdmin]);


  const processPayment = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    try {
      const transactionId = operator === 'WAVE' ? txReference : `TX-${Date.now()}`;
      const payload = {
        planId: selectedPlan.id,
        paymentMethod: operator || paymentMethod,
        transactionId,
        status: 'PENDING'
      };

      await apiClient.post('/billing/upgrade', payload);

      // Optimistically apply the new plan locally while waiting for admin validation
      setSubscriptionData((prev: any) => {
        const now = new Date();
        const fakePayment = {
          id: `local-${Date.now()}`,
          reference: transactionId || `LOCAL-${Date.now()}`,
          amount: selectedPlan.price,
          method: operator || paymentMethod || 'WAVE',
          paymentDate: now.toISOString(),
          status: 'PENDING'
        };
        const updatedSub = {
          ...(prev?.subscription || {}),
          planId: selectedPlan.id,
          status: 'PENDING',
          planDetails: selectedPlan
        };
        return {
          ...prev,
          subscription: updatedSub,
          payments: [fakePayment, ...(prev?.payments || [])]
        };
      });

      setSuccess(true);
      setTimeout(() => {
        setShowPaymentModal(false);
        setSuccess(false);
        fetchData();
      }, 3000);
    } catch (err: any) {
      alert("Erreur : " + (err.message || "Erreur Kernel"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadInvoice = async (paymentId: string) => {
    try {
      const invoiceData = await apiClient.get(`/billing/invoice/${paymentId}`);
      
      // On mock un objet "sale" compatible avec DocumentPreview
      const subSale = {
        id: paymentId,
        reference: invoiceData.invoiceId,
        createdAt: invoiceData.date,
        totalTtc: invoiceData.amount,
        amountPaid: invoiceData.amount,
        customer: {
           companyName: invoiceData.tenant.name,
           billingAddress: invoiceData.tenant.address,
           phone: invoiceData.tenant.phone,
           email: invoiceData.tenant.email
        },
        items: [
          {
             name: `Abonnement GeStocPro Cloud - Plan ${invoiceData.plan.name}`,
             quantity: 1,
             unitPrice: invoiceData.amount,
             totalTtc: invoiceData.amount,
             taxRate: 18
          }
        ]
      };

      setShowDocGenerator({ sale: subSale, mode: 'SUBSCRIPTION_INVOICE' });
    } catch (e) {
      alert("Erreur lors de la récupération de la facture d'abonnement.");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Accès au Kernel Billing...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      
      {/* SECTION 1: ABONNEMENT ACTUEL */}
      <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <Zap size={300} className="text-indigo-500" />
        </div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
              <ShieldCheck size={18} className="text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Contrat Instance Actif</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">
              Plan <span className="text-indigo-400">{currentPlan?.name || 'INITIAL'}</span>
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Statut Contrat</p>
                  <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${currentSubscription?.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
                     <p className="text-sm font-black uppercase tracking-tight">{currentSubscription?.status || 'TRIAL'}</p>
                  </div>
               </div>
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Prochaine Échéance</p>
                  <p className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                     <Calendar size={14} className="text-indigo-400" />
                     {currentSubscription?.nextBillingDate ? new Date(currentSubscription.nextBillingDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: HISTORIQUE DES PAIEMENTS */}
      <div className="space-y-6">
         <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <History className="text-indigo-600" /> Historique des règlements
            </h2>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{paymentHistory.length} Transactions</span>
         </div>

         <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b">
                     <th className="px-10 py-6">Date de transaction</th>
                     <th className="px-10 py-6">Référence</th>
                     <th className="px-10 py-6">Méthode</th>
                     <th className="px-10 py-6 text-right">Montant</th>
                     <th className="px-10 py-6 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {paymentHistory.length === 0 ? (
                     <tr><td colSpan={5} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Aucun paiement d'abonnement tracé</td></tr>
                  ) : paymentHistory.map((p: any) => (
                     <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-10 py-6">
                           <p className="text-sm font-black text-slate-900">{new Date(p.paymentDate || p.createdAt).toLocaleDateString('fr-FR')}</p>
                           <p className="text-[10px] text-slate-400 font-bold">{new Date(p.paymentDate || p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-10 py-6">
                           <p className="font-mono text-xs font-black text-indigo-600 uppercase tracking-tighter">#{p.reference || p.id.slice(0,12)}</p>
                        </td>
                        <td className="px-10 py-6">
                           <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-600">{p.method}</span>
                        </td>
                        <td className="px-10 py-6 text-right font-black text-slate-900">
                           {Number(p.amount).toLocaleString()} {currency}
                        </td>
                        <td className="px-10 py-6 text-right">
                           <button 
                             onClick={() => handleDownloadInvoice(p.id)}
                             className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm group"
                           >
                              <FileDown size={14} className="group-hover:animate-bounce" /> Facture PDF
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* APERÇU FACTURE ABONNEMENT */}
      {showDocGenerator && (
        <div className="fixed inset-0 z-[900] flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="w-full max-w-5xl h-[90vh] bg-white rounded-[3rem] overflow-hidden flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-500">
              <div className="px-10 py-6 bg-slate-900 text-white flex justify-between items-center shrink-0 print:hidden">
                 <div className="flex items-center gap-4"><FileText size={24} className="text-indigo-400"/><h3 className="text-lg font-black uppercase tracking-tight">Facture SaaS GeStocPro</h3></div>
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
                    tenant={null} // Non utilisé pour SUBSCRIPTION_INVOICE car émetteur GeStocPro
                    currency={currency} 
                 />
              </div>
           </div>
        </div>
      )}

      {/* SECTION 3: PLANS D'UPGRADE */}
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <TrendingUp className="text-emerald-500" /> Upgrades du Kernel
          </h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Boostez les capacités de votre écosystème</p>
        </div>

        {plansSection}
      </div>

      {/* MODAL DE PAIEMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh]">
            {success ? (
              <div className="p-20 text-center space-y-8 animate-in zoom-in-90">
                <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tight">Paiement enregistré</h3>
                <p className="text-slate-400 text-xs font-bold uppercase">Le paiement a bien été enregistré et est en attente de validation par l'administrateur.</p>
              </div>
            ) : (
              <>
                <div className="px-10 py-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><RefreshCw size={24}/></div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Règlement Upgrade</h3>
                      <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Sécurisation du flux</p>
                    </div>
                  </div>
                  <button onClick={() => setShowPaymentModal(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">
                   <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[2.5rem] flex justify-between items-center">
                      <div>
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Nouveau montant mensuel</p>
                        <p className="text-xs text-indigo-900 font-bold uppercase tracking-widest">{selectedPlan?.name}</p>
                      </div>
                      <div className="text-right">
                         <span className="text-3xl font-black text-indigo-600">{selectedPlan?.price.toLocaleString()}</span>
                         <span className="text-sm font-black text-indigo-400 ml-2">{currency}</span>
                      </div>
                   </div>

                   {/* Forcons l'affichage Wave uniquement */}
                   <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div className="flex flex-col items-center gap-4">
                          <img src={waveQr} alt="Wave QR" className="w-48 h-48 object-contain rounded-xl shadow-md border" />
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Scannez le QR avec l'application Wave puis renseignez la référence de transaction ci-dessous.</p>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <img src={waveLogo} alt="Wave" className="w-12 h-12 object-contain" />
                            <div>
                              <p className="text-sm font-black uppercase">Wave - Paiement Mobile</p>
                              <p className="text-xs text-slate-400">Suivez les instructions sur votre application Wave pour transférer le montant indiqué.</p>
                            </div>
                          </div>
                          <input type="text" placeholder="Référence Transaction Wave" value={txReference} onChange={e => setTxReference(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10" />
                          <button onClick={processPayment} disabled={isProcessing || !txReference} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                            {isProcessing ? <Loader2 className="animate-spin" /> : <>VALIDER LE PAIEMENT <ArrowRight size={18}/></>}
                          </button>
                        </div>
                      </div>
                   </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;

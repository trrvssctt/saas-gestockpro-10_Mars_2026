
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, Smartphone, Check, ArrowLeft, 
  Loader2, ShieldCheck, Zap, Globe, AlertCircle,
  QrCode, Receipt, Smartphone as MobileIcon, ArrowRight,
  Info, Camera, CheckCircle2, Copy
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../constants';
import { SubscriptionPlan } from '../types';
import { apiClient } from '../services/api';
import waveQr from '../assets/qr_code_marchant_wave.png';
import waveLogo from '../assets/wave_logo.png';
import { useToast } from './ToastProvider';

interface CheckoutProps {
  planId: string;
  user: any;
  planObj?: SubscriptionPlan;
  onSuccess: () => void;
  onCancel: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ planId, user, planObj, onSuccess, onCancel }) => {
  // Forçons Wave uniquement pour l'instant
  const [method, setMethod] = useState<'CARD' | 'MOBILE' | null>('MOBILE');
  const [operator, setOperator] = useState<'WAVE' | 'ORANGE' | 'MTN' | null>('WAVE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [txReference, setTxReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'WAITING' | 'SUCCESS'>('IDLE');
  const showToast = useToast();

  // On utilise l'objet plan passé dynamiquement s'il existe, sinon on cherche dans les constantes par ID
  const plan = useMemo(() => {
    if (planObj) return planObj;
    return SUBSCRIPTION_PLANS.find(p => p.id === planId) || SUBSCRIPTION_PLANS[0];
  }, [planObj, planId]);

  const finalizePayment = async (provider: string, reference: string) => {
    setIsProcessing(true);
    setStatus('WAITING');

    try {
      // Appel du webhook Kernel pour valider l'abonnement initial
      await apiClient.post('/payments/callback', {
        provider,
        tenantId: user.tenantId,
        amount: plan.price,
        status: 'PENDING',
        transactionId: reference,
        planId: plan.id
      });

      // On signale que le paiement est enregistré et en attente de validation manuelle
      setStatus('SUCCESS');
      setTimeout(onSuccess, 2500);
    } catch (e) {
      console.error("Kernel Validation Error:", e);
      setStatus('IDLE');
      showToast("Échec de la validation Kernel. Le service de paiement n'a pas pu confirmer la transaction avec votre instance.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMobilePayment = () => {
    if (operator === 'WAVE' && !txReference) return;
    if (operator !== 'WAVE' && phoneNumber.length < 8) return;
    
    const ref = operator === 'WAVE' ? txReference : `MOB-${Date.now()}`;
    finalizePayment(operator || 'MOBILE_MONEY', ref);
  };

  const handleCardPayment = () => {
    finalizePayment('STRIPE', `STP-${Date.now()}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[100px]"></div>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Recap Plan */}
        <div className="lg:col-span-5 space-y-6">
          <button onClick={onCancel} className="text-[10px] font-black text-slate-500 hover:text-white flex items-center gap-2 uppercase tracking-widest transition-colors">
            <ArrowLeft size={16}/> ABANDONNER L'ACTIVATION
          </button>
          
          <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity"><Zap size={80}/></div>
            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Activation de l'Instance</h2>
            <h3 className="text-4xl font-black text-white tracking-tighter mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-2 mb-10">
              <span className="text-3xl font-black text-white">{plan.price.toLocaleString()} F CFA</span>
              <span className="text-xs font-bold text-slate-500 uppercase">/ mois</span>
            </div>

            <ul className="space-y-4">
              {plan.features && plan.features.length > 0 ? plan.features.map((f: any, i: number) => (
                <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-300">
                  <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center shrink-0 border border-indigo-500/30">
                    <Check size={14}/>
                  </div>
                  {f}
                </li>
              )) : (
                <>
                  <li className="flex items-center gap-3 text-xs font-bold text-slate-300">
                    <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center shrink-0 border border-indigo-500/30">
                      <Check size={14}/>
                    </div>
                    Accès illimité aux modules
                  </li>
                  <li className="flex items-center gap-3 text-xs font-bold text-slate-300">
                    <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center shrink-0 border border-indigo-500/30">
                      <Check size={14}/>
                    </div>
                    Quota Utilisateurs : {plan.maxUsers}
                  </li>
                </>
              )}
            </ul>

            <div className="mt-12 pt-8 border-t border-white/10 flex items-center gap-4 text-slate-500">
               <ShieldCheck size={20} className="text-emerald-500" />
               <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
                 Le Kernel GeStock sera débloqué dès confirmation du flux monétaire par notre centre de sécurité.
               </p>
            </div>
          </div>
        </div>

        {/* Payment Logic */}
        <div className="lg:col-span-7 bg-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden flex flex-col text-slate-900">
          {status === 'IDLE' ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full flex flex-col">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8 uppercase">Choisir un moyen de règlement</h3>
              
              <div className="mb-8">
                <div className="p-6 rounded-[2.5rem] border-2 bg-indigo-50 shadow-inner flex items-center gap-4">
                  <Smartphone size={32} className="text-cyan-600" />
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-cyan-700">Mode de Paiement</div>
                    <div className="text-lg font-black uppercase text-slate-900">Wave (Mobile Money)</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {method === 'CARD' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="p-8 bg-slate-900 text-white rounded-[2rem] relative overflow-hidden shadow-xl">
                      <div className="flex justify-between mb-8">
                        <CreditCard size={32} />
                        <Globe size={20} className="opacity-50" />
                      </div>
                      <p className="text-sm font-black tracking-[0.3em] mb-4 text-center py-2 bg-white/5 rounded-xl">•••• •••• •••• ••••</p>
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                        <span>Visa / Mastercard / Amex</span>
                        <span>SSL Encrypted</span>
                      </div>
                    </div>
                    <button onClick={handleCardPayment} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3 group">
                      DÉCLENCHER STRIPE <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                    </button>
                  </div>
                )}

                {method === 'MOBILE' && (
                  <div className="space-y-6 animate-in fade-in duration-300 pb-4">
                          <div className="flex justify-center gap-4 mb-6">
                            <div className="w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all border-cyan-500 bg-cyan-50 shadow-inner">
                              <img src={waveLogo} alt="Wave" className="w-8 h-8 object-contain" />
                              <span className="text-[9px] font-black uppercase">Wave</span>
                            </div>
                          </div>
                    
                    {operator === 'WAVE' && (
                      <div className="space-y-6 animate-in zoom-in-95 duration-500">
                        <div className="bg-cyan-50 rounded-[2.5rem] p-8 border border-cyan-100 text-center relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10"><QrCode size={100} className="text-cyan-600"/></div>
                          <h4 className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-6">Scannez pour Activer</h4>
                          
                          <div className="bg-white p-4 rounded-3xl inline-block shadow-xl mb-6 relative group">
                            <img 
                              src={waveQr} 
                              alt="Wave QR Code" 
                              className="w-48 h-48 rounded-xl group-hover:scale-105 transition-transform duration-500 object-contain"
                            />
                          </div>
                          
                          <div className="space-y-1 text-left bg-white/60 p-4 rounded-2xl border border-cyan-100/50">
                            <p className="text-[9px] font-bold text-cyan-800">• Montant : <span className="font-black">{plan.price.toLocaleString()} F CFA</span></p>
                            <p className="text-[9px] font-bold text-cyan-800">• Saisissez la référence après paiement</p>
                          </div>
                        </div>

                        <input 
                          type="text" 
                          value={txReference}
                          onChange={(e) => setTxReference(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-2 focus:ring-cyan-500 transition-all uppercase" 
                          placeholder="Référence Transaction Wave" 
                        />

                        <button 
                          onClick={handleMobilePayment} 
                          disabled={!txReference}
                          className="w-full py-5 bg-cyan-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                        >
                          VÉRIFIER LE RÈGLEMENT <CheckCircle2 size={18} />
                        </button>
                      </div>
                    )}

                    {/* Orange operator removed - Wave only for now */}
                  </div>
                )}

                {!method && (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <QrCode size={48} className="text-slate-200" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-[200px]">Sélectionnez une méthode pour activer votre abonnement</p>
                  </div>
                )}
              </div>
            </div>
          ) : status === 'WAITING' ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-10 animate-in zoom-in-95 duration-500">
              <div className="relative">
                <div className={`w-32 h-32 border-[6px] rounded-full animate-spin border-indigo-100 border-t-indigo-600`}></div>
                <Loader2 size={56} className={`absolute inset-0 m-auto animate-pulse text-indigo-600`} />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Vérification Kernel</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                  En attente de la confirmation de votre banque...
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-10 animate-in zoom-in-90 duration-500">
              <div className="w-32 h-32 bg-emerald-500 text-white rounded-[3rem] flex items-center justify-center shadow-2xl">
                <Check size={64} />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Paiement enregistré</h3>
                <p className="text-sm text-slate-500 font-medium">Le paiement a été enregistré et est en attente de validation par l'administrateur.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;

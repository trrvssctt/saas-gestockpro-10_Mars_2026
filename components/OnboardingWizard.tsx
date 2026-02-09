
import React, { useState, useEffect } from 'react';
import { 
  Building2, Globe, CreditCard, Sparkles, ArrowRight, 
  Check, ChevronRight, Palette, FileText, Smartphone,
  ShieldCheck, Zap, Image as ImageIcon, CheckCircle2,
  Upload, Loader2, Stamp, AlertCircle, RefreshCw
} from 'lucide-react';
import { apiClient } from '../services/api';
import { authBridge } from '../services/authBridge';

interface Props {
  onComplete: (data: any) => void;
  companyName: string;
  user: any; 
}

const OnboardingWizard: React.FC<Props> = ({ onComplete, companyName, user }) => {
  const [step, setStep] = useState(2);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: companyName,
    currency: 'F CFA',
    taxRate: 18,
    invoicePrefix: 'INV-',
    legalMentions: 'Paiement à réception. Escompte pour paiement anticipé : néant.',
    primaryColor: '#4f46e5',
    logoUrl: '', 
    factureUrl: '', 
    cachetUrl: ''  
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-kernel', formData.primaryColor);
  }, [formData.primaryColor]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'factureUrl' | 'cachetUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(field);
    setError(null);
    
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
        setFormData(prev => ({ ...prev, [field]: data.secure_url }));
      } else {
        if (data.error?.message?.includes('whitelist')) {
          throw new Error("Cloudinary Error: Preset non autorisé pour l'unsigned upload.");
        }
        throw new Error(data.error?.message || "Erreur Cloudinary.");
      }
    } catch (err: any) {
      console.error("Cloudinary Error:", err);
      setError(err.message || "Échec de l'envoi du visuel.");
    } finally {
      setIsUploading(null);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);

  const handleSubmit = async () => {
    setIsFinalizing(true);
    setError(null);
    try {
      // 1. EXTRACTION DU TOKEN : On vérifie si le token est bien là
      const token = user?.token;
      if (!token) throw new Error("Le jeton d'accès n'a pas été détecté. Veuillez rafraîchir la page.");

      // 2. SCELLER LA SESSION : On enregistre dans le sessionStorage AVANT l'appel put
      // Cela permet aux futurs composants d'être authentifiés par défaut
      authBridge.saveSession(user, token);

      const payload = {
        name: formData.name,
        currency: formData.currency,
        taxRate: Number(formData.taxRate),
        invoicePrefix: formData.invoicePrefix,
        invoiceFooter: formData.legalMentions,
        primaryColor: formData.primaryColor,
        logoUrl: formData.logoUrl,
        onboardingCompleted: true
      };

      // 3. SYNCHRONISATION : On utilise le token explicite pour l'appel de finalisation
      await apiClient.request('/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      onComplete({ ...formData, onboardingCompleted: true });
    } catch (err: any) {
      console.error("Onboarding Sync Error:", err);
      setError(err.message || "Erreur critique de synchronisation Kernel.");
      setIsFinalizing(false);
    }
  };

  const steps = [
    { id: 1, label: 'Identité', icon: Building2, desc: 'Profil validé' },
    { id: 2, label: 'Fiscalité', icon: CreditCard, desc: 'Taxes & Devises' },
    { id: 3, label: 'Branding', icon: Palette, desc: 'Design & Logo' },
    { id: 4, label: 'Légal', icon: FileText, desc: 'Conformité' }
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center p-6 overflow-hidden font-sans">
      <style>{`
        :root { --primary-kernel: ${formData.primaryColor}; }
        .bg-kernel { background-color: var(--primary-kernel); }
        .text-kernel { color: var(--primary-kernel); }
        .border-kernel { border-color: var(--primary-kernel); }
        .ring-kernel { --tw-ring-color: var(--primary-kernel); }
      `}</style>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-0 bg-white rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden animate-in zoom-in-95 duration-700">
        
        <div className="lg:col-span-4 bg-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={200} /></div>
          
          <div className="space-y-12 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600 rounded-full mb-4">
                <ShieldCheck size={14} className="text-white" />
                <span className="text-[10px] font-black uppercase tracking-widest">Instance Activée</span>
              </div>
              <h2 className="text-3xl font-black tracking-tighter leading-tight">Configuration <span className="text-kernel text-nowrap">GeStockPro</span></h2>
              <p className="text-slate-400 text-xs font-medium mt-3 leading-relaxed uppercase tracking-widest">Initialisation des assets de {companyName}.</p>
            </div>

            <div className="space-y-6">
              {steps.map((s) => (
                <div key={s.id} className={`flex items-center gap-5 transition-all duration-500 ${step === s.id ? 'opacity-100 translate-x-3' : step > s.id || s.id === 1 ? 'opacity-50' : 'opacity-30'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${step === s.id ? 'bg-kernel border-kernel shadow-xl shadow-kernel/20 scale-110' : (step > s.id || s.id === 1) ? 'bg-emerald-50 border-emerald-400' : 'border-slate-700'}`}>
                    {(step > s.id || s.id === 1) ? <Check size={24} /> : <s.icon size={20} />}
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-widest ${step === s.id ? 'text-kernel' : 'text-white'}`}>{s.label}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 p-16 flex flex-col justify-between h-[80vh] overflow-y-auto">
          <div className="flex-1">
            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-black uppercase flex items-center gap-3 animate-in shake">
                <AlertCircle size={16}/> {error}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Pilotage Financier</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Définit vos calculs de marge et de taxes par défaut.</p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Devise Système</label>
                    <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-kernel/10 shadow-inner appearance-none cursor-pointer">
                      <option value="F CFA">Franc CFA (F CFA)</option>
                      <option value="€">Euro (€)</option>
                      <option value="$">US Dollar ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Taux TVA Standard (%)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                      <input type="number" value={formData.taxRate} onChange={e => setFormData({...formData, taxRate: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-3xl pl-14 pr-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-kernel/10 shadow-inner" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Identité Visuelle</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Uploadez vos visuels vers le cloud Cloudinary.</p>
                </div>

                <div className="space-y-10">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5 px-2">Thème de l'Instance</label>
                    <div className="flex flex-wrap gap-4">
                      {['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#0f172a', '#7c3aed'].map(color => (
                        <button 
                          key={color} 
                          onClick={() => setFormData({...formData, primaryColor: color})}
                          className={`w-12 h-12 rounded-2xl transition-all relative flex items-center justify-center ${formData.primaryColor === color ? 'ring-4 ring-offset-2 ring-kernel scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: color }}
                        >
                          {formData.primaryColor === color && <Check size={20} className="text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="relative group">
                      <input type="file" id="logo_up" hidden onChange={e => handleFileUpload(e, 'logoUrl')} accept="image/*" />
                      <label htmlFor="logo_up" className={`block p-6 border-2 border-dashed rounded-[2.5rem] text-center cursor-pointer transition-all ${formData.logoUrl ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-kernel'}`}>
                        {isUploading === 'logoUrl' ? <Loader2 className="animate-spin mx-auto text-kernel" /> : formData.logoUrl ? <img src={formData.logoUrl} className="h-12 mx-auto rounded-lg object-contain" /> : <ImageIcon className="mx-auto text-slate-300" size={32} />}
                        <p className="text-[9px] font-black uppercase mt-3 text-slate-500">Logo App</p>
                      </label>
                    </div>

                    <div className="relative group" hidden>
                      <input type="file" id="facture_up" hidden onChange={e => handleFileUpload(e, 'factureUrl')} accept="image/*" />
                      <label htmlFor="facture_up" className={`block p-6 border-2 border-dashed rounded-[2.5rem] text-center cursor-pointer transition-all ${formData.factureUrl ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-kernel'}`}>
                        {isUploading === 'factureUrl' ? <Loader2 className="animate-spin mx-auto text-kernel" /> : formData.factureUrl ? <img src={formData.factureUrl} className="h-12 mx-auto rounded-lg object-contain" /> : <FileText className="mx-auto text-slate-300" size={32} />}
                        <p className="text-[9px] font-black uppercase mt-3 text-slate-500">Logo Facture</p>
                      </label>
                    </div>

                    <div className="relative group" hidden>
                      <input type="file" id="cachet_up" hidden onChange={e => handleFileUpload(e, 'cachetUrl')} accept="image/*" />
                      <label htmlFor="cachet_up" className={`block p-6 border-2 border-dashed rounded-[2.5rem] text-center cursor-pointer transition-all ${formData.cachetUrl ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-kernel'}`}>
                        {isUploading === 'cachetUrl' ? <Loader2 className="animate-spin mx-auto text-kernel" /> : formData.cachetUrl ? <img src={formData.cachetUrl} className="h-12 mx-auto rounded-lg object-contain" /> : <Stamp className="mx-auto text-slate-300" size={32} />}
                        <p className="text-[9px] font-black uppercase mt-3 text-slate-500">Cachet Payé</p>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Conformité & Légal</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Paramétrez le pied de vos documents commerciaux.</p>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Préfixe de Numérotation</label>
                    <input type="text" value={formData.invoicePrefix} onChange={e => setFormData({...formData, invoicePrefix: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-5 text-sm font-mono font-black focus:ring-4 focus:ring-kernel/10 shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Mentions Légales Obligatoires</label>
                    <textarea value={formData.legalMentions} onChange={e => setFormData({...formData, legalMentions: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-5 text-sm font-bold focus:ring-4 focus:ring-kernel/10 shadow-inner min-h-[150px]"></textarea>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 flex items-center gap-6 pt-10 border-t border-slate-100">
            {step > 2 && (
              <button 
                onClick={() => setStep(prev => prev - 1)} 
                disabled={isFinalizing}
                className="px-10 py-5 bg-white border-2 border-slate-100 text-slate-400 rounded-3xl font-black text-[10px] uppercase tracking-widest"
              >
                RETOUR
              </button>
            )}
            <button 
              onClick={step === steps.length ? handleSubmit : nextStep}
              disabled={!!isUploading || isFinalizing}
              className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:bg-kernel transition-all flex items-center justify-center gap-4 active:scale-95 group disabled:opacity-50"
            >
              {isFinalizing ? (
                <><RefreshCw className="animate-spin" size={20} /> SYNCHRONISATION...</>
              ) : step === steps.length ? (
                <>DÉMARRER L'INSTANCE <CheckCircle2 size={20} /></>
              ) : (
                <>CONTINUER <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;

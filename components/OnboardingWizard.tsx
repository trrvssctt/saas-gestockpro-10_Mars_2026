
import React, { useState, useEffect } from 'react';
import {
  Building2, CreditCard, Palette, FileText, Check,
  ChevronRight, Sparkles, ShieldCheck, CheckCircle2,
  Upload, Loader2, AlertCircle, RefreshCw, Zap, X
} from 'lucide-react';
import { apiClient } from '../services/api';
import { authBridge } from '../services/authBridge';
import logo from '../assets/logo_gestockpro.png';

interface Props {
  onComplete: (data: any) => void;
  onExit?: () => void;
  companyName: string;
  user: any;
}

const OnboardingWizard: React.FC<Props> = ({ onComplete, onExit, companyName, user }) => {
  const storageKey = `onboarding_${user?.id || user?.tenantId || 'anon'}`;

  // Restore from localStorage on mount
  const getInitialState = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { step: parsed.step || 2, formData: { ...defaultFormData, ...parsed.formData } };
      }
    } catch {}
    return { step: 2, formData: defaultFormData };
  };

  const defaultFormData = {
    name: companyName,
    currency: 'F CFA',
    taxRate: 18,
    invoicePrefix: 'INV-',
    legalMentions: 'Paiement à réception. Escompte pour paiement anticipé : néant.',
    primaryColor: '#4f46e5',
    buttonColor: '#63452c',
    logoUrl: '',
    factureUrl: '',
    cachetUrl: ''
  };

  const initial = getInitialState();
  const [step, setStep] = useState(initial.step);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(initial.formData);

  // Persist progress on every change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ step, formData }));
    } catch {}
  }, [step, formData]);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-kernel', formData.primaryColor);
    document.documentElement.style.setProperty('--button-kernel', formData.buttonColor || '#63452c');
  }, [formData.primaryColor, formData.buttonColor]);

  const handleExit = () => {
    // Progress already saved in useEffect above
    onExit?.();
  };

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
        throw new Error(data.error?.message || "Erreur Cloudinary.");
      }
    } catch (err: any) {
      setError(err.message || "Échec de l'envoi du visuel.");
    } finally {
      setIsUploading(null);
    }
  };

  const handleSubmit = async () => {
    setIsFinalizing(true);
    setError(null);
    try {
      const token = user?.token;
      if (!token) throw new Error("Le jeton d'accès n'a pas été détecté. Veuillez rafraîchir la page.");
      authBridge.saveSession(user, token);

      const payload = {
        name: formData.name,
        currency: formData.currency,
        taxRate: Number(formData.taxRate),
        invoicePrefix: formData.invoicePrefix,
        invoiceFooter: formData.legalMentions,
        primaryColor: formData.primaryColor,
        buttonColor: formData.buttonColor,
        logoUrl: formData.logoUrl,
        onboardingCompleted: true
      };

      await apiClient.request('/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'Authorization': `Bearer ${token}` }
      });

      localStorage.removeItem(storageKey);
      onComplete({ ...formData, onboardingCompleted: true });
    } catch (err: any) {
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

  const PRESET_COLORS = ['#0f172a', '#4f46e5', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#63452c'];

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center p-3 sm:p-6 overflow-hidden font-sans">
      <style>{`
        :root { --primary-kernel: ${formData.primaryColor}; --button-kernel: ${formData.buttonColor || '#63452c'}; }
        .bg-kernel { background-color: var(--primary-kernel); }
        .text-kernel { color: var(--primary-kernel); }
        .border-kernel { border-color: var(--primary-kernel); }
      `}</style>

      {/* Glowing background blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl w-full flex flex-col lg:grid lg:grid-cols-12 gap-0 bg-white rounded-[2rem] shadow-[0_40px_120px_rgba(0,0,0,0.5)] overflow-hidden max-h-[92dvh] animate-in zoom-in-95 duration-700">

        {/* ── Mobile progress bar ── */}
        <div className="flex lg:hidden items-center justify-between px-5 pt-4 pb-3 bg-slate-900 text-white shrink-0">
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Configuration</p>
            <p className="text-xs font-black uppercase tracking-tight">{steps.find(s => s.id === step)?.label}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {steps.map(s => (
                <div key={s.id} className={`h-1.5 rounded-full transition-all duration-500 ${
                  step === s.id ? 'w-6 bg-indigo-400' : (step > s.id || s.id === 1) ? 'w-3 bg-emerald-400' : 'w-3 bg-slate-600'
                }`} />
              ))}
            </div>
            {onExit && (
              <button onClick={handleExit} className="text-slate-400 hover:text-white p-1" title="Continuer plus tard">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ── Left panel ── */}
        <div className="hidden lg:flex lg:col-span-4 bg-slate-900 p-10 xl:p-12 text-white flex-col justify-between relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl" />
          <div className="absolute inset-0 opacity-[0.03]">
            <Zap size={320} className="absolute -right-16 -top-16 text-white" />
          </div>

          <div className="relative z-10 space-y-8">
            {/* Logo + exit */}
            <div className="flex items-center justify-between">
              <img src={logo} alt="GeStockPro" className="h-9 opacity-90" />
              {onExit && (
                <button onClick={handleExit} title="Continuer plus tard"
                  className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors">
                  <X size={12} /> Quitter
                </button>
              )}
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 rounded-full mb-4">
                <ShieldCheck size={12} className="text-emerald-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Instance Activée</span>
              </div>
              <h2 className="text-xl xl:text-2xl font-black tracking-tight leading-tight">
                Configuration<br />
                <span className="text-indigo-400">de votre instance</span>
              </h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-3 leading-relaxed">
                Initialisation des assets<br />de <span className="text-slate-300">{companyName}</span>
              </p>
            </div>

            {/* Step indicators */}
            <div className="space-y-4">
              {steps.map((s) => {
                const isDone = step > s.id || s.id === 1;
                const isActive = step === s.id;
                return (
                  <div key={s.id} className={`flex items-center gap-4 transition-all duration-500 ${
                    isActive ? 'opacity-100 translate-x-2' : isDone ? 'opacity-60' : 'opacity-25'
                  }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 shadow-lg shadow-indigo-600/30 scale-110'
                        : isDone
                        ? 'bg-emerald-600/20 border border-emerald-500/40'
                        : 'border border-slate-700'
                    }`}>
                      {isDone
                        ? <Check size={18} className="text-emerald-400" />
                        : <s.icon size={16} className={isActive ? 'text-white' : 'text-slate-500'} />
                      }
                    </div>
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-400' : 'text-white'}`}>
                        {s.label}
                      </p>
                      <p className="text-[9px] font-bold text-slate-600 uppercase">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom badge */}
          <div className="relative z-10">
            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/50 flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                <Sparkles size={14} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">GeStockPro Kernel</p>
                <p className="text-[8px] text-slate-500 uppercase">Infrastructure SaaS isolée</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="lg:col-span-8 p-5 sm:p-8 lg:p-14 flex flex-col justify-between flex-1 overflow-y-auto">
          <div className="flex-1">

            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in shake">
                <AlertCircle size={16} className="text-rose-500 shrink-0" />
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">{error}</p>
              </div>
            )}

            {/* STEP 2 — Fiscalité */}
            {step === 2 && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div>
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Étape 2 / 4</p>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Pilotage Financier</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Définit vos calculs de marge et de taxes par défaut
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Devise Système</label>
                    <select
                      value={formData.currency}
                      onChange={e => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-200 cursor-pointer"
                    >
                      <option value="F CFA">Franc CFA (F CFA)</option>
                      <option value="€">Euro (€)</option>
                      <option value="$">US Dollar ($)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Taux TVA Standard (%)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input
                        type="number"
                        value={formData.taxRate}
                        onChange={e => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Info box */}
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <CreditCard size={14} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Calcul automatique</p>
                    <p className="text-[9px] text-indigo-500 mt-0.5 leading-relaxed">
                      Ces paramètres seront appliqués à toutes vos factures et devis. Modifiables à tout moment dans les paramètres.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 — Branding */}
            {step === 3 && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div>
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Étape 3 / 4</p>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Identité Visuelle</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Personnalisez votre instance avec vos couleurs et votre logo
                  </p>
                </div>

                {/* Logo upload */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Logo de l'application</label>
                  <input type="file" id="logo_up" hidden onChange={e => handleFileUpload(e, 'logoUrl')} accept="image/*" />
                  <label
                    htmlFor="logo_up"
                    className={`flex items-center gap-5 p-5 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                      formData.logoUrl
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                    }`}
                  >
                    {isUploading === 'logoUrl' ? (
                      <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                        <Loader2 className="animate-spin text-indigo-500" size={20} />
                      </div>
                    ) : formData.logoUrl ? (
                      <img src={formData.logoUrl} className="h-14 w-14 rounded-xl object-contain bg-slate-50 shrink-0" alt="logo" />
                    ) : (
                      <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                        <Upload size={20} className="text-slate-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-black text-slate-700">
                        {formData.logoUrl ? 'Logo importé' : 'Importer votre logo'}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">PNG, JPG, SVG · Max 5 MB</p>
                    </div>
                    {formData.logoUrl && (
                      <div className="ml-auto">
                        <Check size={18} className="text-emerald-500" />
                      </div>
                    )}
                  </label>
                </div>

                {/* Color theme */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Thème de couleur</label>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setFormData({ ...formData, primaryColor: c })}
                          className={`w-9 h-9 rounded-xl shadow-sm transition-all ${formData.primaryColor === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={formData.primaryColor}
                          onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                          className="w-10 h-10 rounded-xl cursor-pointer border-none p-0 shrink-0"
                        />
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase">Couleur bouton</p>
                          <p className="text-[9px] font-mono text-slate-400">{formData.primaryColor}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={formData.buttonColor}
                          onChange={e => setFormData({ ...formData, buttonColor: e.target.value })}
                          className="w-10 h-10 rounded-xl cursor-pointer border-none p-0 shrink-0"
                        />
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase">Couleur principale</p>
                          <p className="text-[9px] font-mono text-slate-400">{formData.buttonColor}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 — Légal */}
            {step === 4 && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div>
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Étape 4 / 4</p>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Conformité & Légal</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Paramétrez le pied de vos documents commerciaux
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Préfixe de numérotation</label>
                    <input
                      type="text"
                      value={formData.invoicePrefix}
                      onChange={e => setFormData({ ...formData, invoicePrefix: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-mono font-black outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-200"
                      placeholder="INV-"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Mentions légales obligatoires</label>
                    <textarea
                      value={formData.legalMentions}
                      onChange={e => setFormData({ ...formData, legalMentions: e.target.value })}
                      rows={5}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-200 resize-none"
                    />
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
                  <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-emerald-800 font-bold uppercase leading-relaxed">
                    En validant, vous déployez une infrastructure isolée conforme aux protocoles GSP-3.2. Toutes vos données restent cloisonnées.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Navigation buttons ── */}
          <div className="mt-8 flex items-center gap-3 pt-6 border-t border-slate-100 shrink-0">
            {step > 2 && (
              <button
                onClick={() => setStep(prev => prev - 1)}
                disabled={isFinalizing}
                className="px-6 py-4 border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-40"
              >
                RETOUR
              </button>
            )}
            <button
              onClick={step === steps.length ? handleSubmit : () => setStep(prev => prev + 1)}
              disabled={!!isUploading || isFinalizing}
              className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {isFinalizing ? (
                <><RefreshCw className="animate-spin" size={16} /> SYNCHRONISATION...</>
              ) : step === steps.length ? (
                <>DÉMARRER L'INSTANCE <CheckCircle2 size={16} /></>
              ) : (
                <>CONTINUER <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;

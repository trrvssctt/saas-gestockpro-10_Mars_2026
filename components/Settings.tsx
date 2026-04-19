
import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Globe, Image as ImageIcon,
  ShieldCheck, Save, Check, FileText, ShieldAlert,
  Lock, Palette,
  LayoutDashboard, CreditCard, Sparkles,
  CheckCircle2, Building2,
  Stamp, RefreshCw, Upload, Loader2, Pipette, AlertTriangle, Trash2, PowerOff
} from 'lucide-react';
import { AppSettings, Currency, Language } from '../types';
import { apiClient } from '../services/api';
import { uploadFile } from '../services/uploadService';
import { authBridge } from '../services/authBridge';

interface SettingsProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onLogout?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSave, onLogout }) => {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'branding' | 'fiscal' | 'profile'>('general');
  const [localTenant, setLocalTenant] = useState<any>(null);
  const [buttonColor, setButtonColor] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);

  // Account deactivation / deletion state
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [accountActionLoading, setAccountActionLoading] = useState(false);

  const handleDeactivateAccount = async () => {
    setAccountActionLoading(true);
    try {
      await apiClient.post('/auth/deactivate-account', {});
      authBridge.clearSession();
      if (onLogout) onLogout();
      else window.location.reload();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la désactivation du compte.');
    } finally {
      setAccountActionLoading(false);
      setShowDeactivateConfirm(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') return;
    setAccountActionLoading(true);
    try {
      await apiClient.delete('/auth/delete-account');
      authBridge.clearSession();
      if (onLogout) onLogout();
      else window.location.reload();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la suppression du compte.');
    } finally {
      setAccountActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // Password change state
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwShowCurrent, setPwShowCurrent] = useState(false);
  const [pwShowNew, setPwShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const generateStrongPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let pwd = '';
    const arr = new Uint32Array(16);
    window.crypto.getRandomValues(arr);
    arr.forEach(v => { pwd += chars[v % chars.length]; });
    setPwNew(pwd);
    setPwConfirm(pwd);
    setPwShowNew(true);
  };

  const getPasswordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (pwd.length === 0) return { label: '', color: 'bg-slate-200', width: '0%' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    if (score <= 1) return { label: 'Faible', color: 'bg-red-500', width: '20%' };
    if (score === 2) return { label: 'Moyen', color: 'bg-orange-400', width: '40%' };
    if (score === 3) return { label: 'Correct', color: 'bg-yellow-400', width: '60%' };
    if (score === 4) return { label: 'Fort', color: 'bg-green-400', width: '80%' };
    return { label: 'Très fort', color: 'bg-green-600', width: '100%' };
  };

  const handleChangePassword = async () => {
    setPwError(null);
    if (!pwCurrent || !pwNew || !pwConfirm) { setPwError('Tous les champs sont requis.'); return; }
    if (pwNew !== pwConfirm) { setPwError('Les mots de passe ne correspondent pas.'); return; }
    if (pwNew.length < 8) { setPwError('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return; }
    setPwSaving(true);
    try {
      await apiClient.post('/auth/change-password', { currentPassword: pwCurrent, newPassword: pwNew });
      setPwSuccess(true);
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: any) {
      setPwError(err?.message || 'Erreur lors du changement de mot de passe.');
    } finally {
      setPwSaving(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await apiClient.get('/settings');
        const defaultFont = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial";
        setLocalTenant({ 
          ...data, 
          fontFamily: data.fontFamily || defaultFont, 
          baseFontSize: data.baseFontSize || 14,
          theme: data.theme || data.is_dark || 'light',
          buttonColor: data.buttonColor || data.button_color || ''
        });
        // also populate local button color state for the picker
        setButtonColor(data.buttonColor || data.button_color || '');
      } catch (e) {
        console.error("Fetch Settings Error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(field);
    try {
      const folder = field === 'logoUrl' ? 'logos' : field === 'cachetUrl' ? 'cachets' : 'uploads';
      const result = await uploadFile(file, folder);
      setLocalTenant({ ...localTenant, [field]: result.url });
    } catch (err) {
      console.error("Upload Error:", err);
      alert("Échec de l'envoi de l'image.");
    } finally {
      setIsUploading(null);
    }
  };

  const toggleTheme = () => {
    const next = localTenant?.theme === 'dark' ? 'light' : 'dark';
    setLocalTenant({ ...localTenant, theme: next });
    const isDark = next === 'dark';
    document.documentElement.classList.toggle('dark', Boolean(isDark));
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.style.setProperty('--kernel-theme', isDark ? 'dark' : 'light');
    try { window.dispatchEvent(new CustomEvent('tenant-theme-updated')); } catch (e) {}
  };

  // Normalize a hex color string to full 7-char form (#rrggbb)
  const normalizeHex = (raw?: string) => {
    if (!raw) return '';
    let s = raw.trim();
    if (!s) return '';
    if (!s.startsWith('#')) s = '#' + s;
    if (s.length === 4) {
      // expand #rgb to #rrggbb
      const r = s[1];
      const g = s[2];
      const b = s[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return s.substring(0, 7).toLowerCase();
  };

  // Return an 8-digit hex (with alpha hex) for preview if base hex present
  const withAlphaHex = (hex?: string, alpha = '30') => {
    const base = normalizeHex(hex);
    if (!base) return '';
    return `${base}${alpha}`;
  };

  // Apply primary color to CSS variable in real-time for immediate preview
  useEffect(() => {
    if (localTenant && localTenant.primaryColor) {
      document.documentElement.style.setProperty('--primary-kernel', normalizeHex(localTenant.primaryColor));
    }
  }, [localTenant?.primaryColor]);

  // Apply button color (falls back to primary if not set)
  useEffect(() => {
    const btn = localTenant?.buttonColor || localTenant?.button_color || buttonColor || localTenant?.primaryColor || '#4f46e5';
    if (btn) {
      document.documentElement.style.setProperty('--button-kernel', normalizeHex(btn));
    }
  }, [localTenant?.buttonColor, localTenant?.button_color, localTenant?.primaryColor, buttonColor]);

  // Apply font family and base font size to document for live preview
  useEffect(() => {
    if (localTenant && localTenant.fontFamily) {
      document.documentElement.style.setProperty('--kernel-font-family', localTenant.fontFamily);
      document.documentElement.style.fontFamily = localTenant.fontFamily;
    }
    if (localTenant && localTenant.baseFontSize) {
      const size = typeof localTenant.baseFontSize === 'number' ? localTenant.baseFontSize : parseInt(localTenant.baseFontSize) || 14;
      document.documentElement.style.setProperty('--base-font-size', `${size}px`);
      document.documentElement.style.fontSize = `${size}px`;
    }
  }, [localTenant?.fontFamily, localTenant?.baseFontSize]);

  // Apply theme (dark / light) whenever it changes
  useEffect(() => {
    if (!localTenant) return;
    const themeVal = localTenant.theme ?? localTenant.is_dark ?? 'light';
    const isDark = themeVal === 'dark' || themeVal === true;
    document.documentElement.classList.toggle('dark', Boolean(isDark));
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    // Optional: set a CSS variable for components to read
    document.documentElement.style.setProperty('--kernel-theme', isDark ? 'dark' : 'light');
    // notify other components (Layout) to recompute colors/contrast
    try { window.dispatchEvent(new CustomEvent('tenant-theme-updated')); } catch (e) {}
  }, [localTenant?.theme]);

  const handleSave = async () => {
    if (!localTenant) return;
    setIsSaving(true);
    try {
      // ensure primaryColor is normalized before saving
      const toSave = { 
        ...localTenant, 
        primaryColor: normalizeHex(localTenant.primaryColor),
        buttonColor: normalizeHex(buttonColor || localTenant.buttonColor || localTenant.button_color),
        fontFamily: localTenant.fontFamily,
        baseFontSize: Number(localTenant.baseFontSize) || 14,
        theme: localTenant.theme || 'light'
      };
      const response = await apiClient.put('/settings', toSave);
      const updatedTenant = response.tenant;
      setLocalTenant(updatedTenant);
      // ensure local button state matches saved value
      setButtonColor(updatedTenant.buttonColor || updatedTenant.button_color || '');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Mise à jour de l'état global avec les nouveaux paramètres du Kernel
      onSave({ 
        ...settings, 
        companyName: updatedTenant.name,
        platformLogo: updatedTenant.logoUrl,
        invoiceLogo: updatedTenant.logoUrl,
        currency: updatedTenant.currency,
        ...updatedTenant // Injecte primaryColor, taxRate, invoicePrefix etc.
      });
      
      // Répercussion immédiate de la variable CSS
      if (updatedTenant.primaryColor) {
        document.documentElement.style.setProperty('--primary-kernel', normalizeHex(updatedTenant.primaryColor));
        window.dispatchEvent(new CustomEvent('tenant-theme-updated'));
      }
      if (updatedTenant.buttonColor || updatedTenant.button_color) {
        document.documentElement.style.setProperty('--button-kernel', normalizeHex(updatedTenant.buttonColor || updatedTenant.button_color));
        window.dispatchEvent(new CustomEvent('tenant-theme-updated'));
      }
      // Répercussion immédiate police / taille
      if (updatedTenant.fontFamily) {
        document.documentElement.style.setProperty('--kernel-font-family', updatedTenant.fontFamily);
        document.documentElement.style.fontFamily = updatedTenant.fontFamily;
      }
      if (updatedTenant.baseFontSize) {
        const size = Number(updatedTenant.baseFontSize) || 14;
        document.documentElement.style.setProperty('--base-font-size', `${size}px`);
        document.documentElement.style.fontSize = `${size}px`;
      }
      // Répercussion immédiate du thème
      if (typeof updatedTenant.theme !== 'undefined') {
        const isDark = updatedTenant.theme === 'dark' || updatedTenant.theme === true;
        document.documentElement.classList.toggle('dark', Boolean(isDark));
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      }
    } catch (e: any) {
      console.error("Save Settings Error:", e);
      alert(`Erreur Kernel: ${e.message || 'Échec de sauvegarde'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="p-40 text-center flex flex-col items-center gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <p className="uppercase font-black text-slate-400 text-xs tracking-[0.3em]">Accès au noyau de configuration...</p>
    </div>
  );

  if (!localTenant) return (
    <div className="p-20 text-center space-y-6">
      <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
        <ShieldAlert size={40} />
      </div>
      <p className="uppercase font-black text-slate-400 text-xs tracking-widest">Échec de la liaison avec le Kernel</p>
      <button onClick={() => window.location.reload()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Réessayer</button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-4">
            <SettingsIcon className="text-indigo-600" size={32} />
            Personnalisation Instance
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Architecture & Identité Visuelle de votre espace</p>
        </div>
        <div className="flex justify-end flex-wrap gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 ${success ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-slate-200'}`}
          >
            {isSaving ? <RefreshCw className="animate-spin" size={18} /> : success ? <CheckCircle2 size={18} /> : <Save size={18} />} 
            {success ? 'CONFIGURATION SCELLÉE' : 'SCELLER LES MODIFICATIONS'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex flex-wrap gap-2 p-1.5 bg-white border border-slate-100 rounded-[2rem] w-fit shadow-sm min-w-0">
          {[
            { id: 'general', label: 'Profil Structure', icon: Building2 },
            { id: 'branding', label: 'Design & Branding', icon: Palette },
            { id: 'fiscal', label: 'Fiscalité & Factures', icon: FileText },
            { id: 'profile', label: 'Accès Sécurité', icon: Lock },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-6 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-3 ${activeSubTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 animate-in slide-in-from-bottom-4">
          <div className="lg:col-span-8 bg-white p-5 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2 mb-4"><Globe size={16}/> Identité Légale</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Raison Sociale</label>
                <input type="text" value={localTenant.name} onChange={e => setLocalTenant({...localTenant, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black focus:ring-4 focus:ring-indigo-500/10 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">SIRET / Identifiant Fiscal</label>
                <input type="text" value={localTenant.siret || ''} onChange={e => setLocalTenant({...localTenant, siret: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black focus:ring-4 focus:ring-indigo-500/10 outline-none" placeholder="Ex: 123 456 789" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Email Structure</label>
                <input type="email" value={localTenant.email || ''} onChange={e => setLocalTenant({...localTenant, email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black focus:ring-4 focus:ring-indigo-500/10 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Téléphone</label>
                <input type="text" value={localTenant.phone || ''} onChange={e => setLocalTenant({...localTenant, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black focus:ring-4 focus:ring-indigo-500/10 outline-none" />
              </div>
              <div className="col-span-full space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Adresse du Siège Social</label>
                <textarea value={localTenant.address || ''} onChange={e => setLocalTenant({...localTenant, address: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none min-h-[100px]" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 bg-indigo-900 rounded-[3rem] p-5 md:p-10 text-white relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Building2 size={120}/></div>
            <h4 className="text-lg md:text-xl font-black uppercase mb-4">Isolation Multi-Tenant</h4>
            <p className="text-xs text-indigo-200 leading-relaxed font-medium uppercase tracking-widest">Vos données sont stockées dans un schéma PostgreSQL dédié. L'exactitude de ces informations garantit la validité de vos documents Factur-X.</p>
          </div>
        </div>
      )}

      {activeSubTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 animate-in slide-in-from-bottom-4">
           {/* Section Couleurs */}
           <div className="lg:col-span-6 bg-white p-5 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2"><Palette size={16}/> Personnalisation des Couleurs</h3>
              <Pipette size={18} className="text-slate-300" />
            </div>
            
            <div className="space-y-8">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Couleur Primaire de l'Interface</label>
                <div className="flex flex-wrap gap-4 mb-8">
                  {['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#0f172a'].map(color => (
                    <button 
                      key={color} 
                      onClick={() => {
                        const v = normalizeHex(color);
                        setLocalTenant({...localTenant, primaryColor: v});
                        document.documentElement.style.setProperty('--primary-kernel', v);
                        window.dispatchEvent(new CustomEvent('tenant-theme-updated'));
                      }}
                      className={`w-10 h-10 md:w-14 md:h-14 rounded-2xl transition-all relative flex items-center justify-center ${localTenant.primaryColor === color ? 'ring-4 ring-indigo-100 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    >
                      {localTenant.primaryColor === color && <Check size={24} className="text-white drop-shadow-md" />}
                    </button>
                  ))}
                </div>
                
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Ou choisir une couleur précise (Hex)</p>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      value={normalizeHex(localTenant.primaryColor) || '#4f46e5'}
                      onChange={e => {
                        const v = normalizeHex(e.target.value);
                        setLocalTenant({...localTenant, primaryColor: v});
                        document.documentElement.style.setProperty('--primary-kernel', v);
                        window.dispatchEvent(new CustomEvent('tenant-theme-updated'));
                      }}
                      className="w-16 h-16 rounded-xl border-none p-0 bg-transparent cursor-pointer overflow-hidden shadow-lg"
                    />
                    <div className="flex-1 relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">#</span>
                       <input 
                        type="text" 
                        value={(normalizeHex(localTenant.primaryColor) || '#4f46e5').replace('#', '')}
                        onChange={e => setLocalTenant({...localTenant, primaryColor: normalizeHex('#' + e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded-2xl pl-8 pr-4 py-4 text-sm font-mono font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10"
                        placeholder="FFFFFF"
                        maxLength={6}
                       />
                    </div>
                  </div>
                </div>
                </div>

                {/* Button color selector */}
                <div className="p-6 bg-white rounded-2xl border border-slate-100">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Couleur des Boutons</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={normalizeHex(buttonColor || localTenant.buttonColor || localTenant.button_color) || '#4f46e5'}
                      onChange={e => { const v = normalizeHex(e.target.value); setButtonColor(v); setLocalTenant({ ...localTenant, buttonColor: v }); document.documentElement.style.setProperty('--button-kernel', v); window.dispatchEvent(new CustomEvent('tenant-theme-updated')); }}
                      className="w-12 h-12 rounded-xl border-none p-0 bg-transparent cursor-pointer"
                    />
                    <div className="flex gap-3">
                      {['#4f46e5', '#0f172a', '#06b6d4', '#ef4444'].map(c => (
                        <button key={c} onClick={() => { const v = normalizeHex(c); setButtonColor(v); setLocalTenant({ ...localTenant, buttonColor: v }); document.documentElement.style.setProperty('--button-kernel', v); window.dispatchEvent(new CustomEvent('tenant-theme-updated')); }} className={`w-10 h-10 rounded-xl ${ (buttonColor === c || localTenant.buttonColor === c || localTenant.button_color === c) ? 'ring-2 ring-indigo-200 scale-105' : 'hover:scale-105' }`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3">Si non renseigné, la couleur des boutons reprendra la couleur primaire.</p>
                </div>

                <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Sparkles size={80}/></div>
                 <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Aperçu en temps réel</h4>
                  <div className="space-y-4">
                    <div className="h-4 w-3/4 rounded-full" style={{ backgroundColor: withAlphaHex(localTenant.primaryColor, '30') }}></div>
                    <div className="flex items-center gap-3">
                      <button className="px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg" style={{ backgroundColor: normalizeHex(localTenant.primaryColor) }}>Bouton Principal</button>
                      <button className="px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg" style={{ backgroundColor: normalizeHex(buttonColor || localTenant.buttonColor || localTenant.button_color || localTenant.primaryColor) }}>Bouton (Couleur Bouton)</button>
                    </div>
                  </div>
              </div>

              {/* Police & Taille */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2"><LayoutDashboard size={16}/> Police & Taille</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Aperçu global</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2 block">Choisir une police</label>
                    <div className="flex gap-3 flex-wrap">
                      {[
                        { key: 'inter', label: 'Inter', family: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" },
                        { key: 'poppins', label: 'Poppins', family: "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" },
                        { key: 'roboto', label: 'Roboto', family: "'Roboto', system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial" },
                        { key: 'montserrat', label: 'Montserrat', family: "'Montserrat', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" },
                        { key: 'lora', label: 'Lora', family: "'Lora', Georgia, 'Times New Roman', serif" },
                      ].map(f => (
                        <button
                          key={f.key}
                          onClick={() => setLocalTenant({ ...localTenant, fontFamily: f.family })}
                          className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border ${localTenant.fontFamily === f.family ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                          style={{ fontFamily: f.family }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">Remarque: pour utiliser Poppins/Montserrat/Lora, ajouter le chargement des polices (Google Fonts) dans votre layout.</p>
                    
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2 block">Taille de base</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={12}
                        max={20}
                        value={localTenant.baseFontSize || 14}
                        onChange={e => setLocalTenant({ ...localTenant, baseFontSize: parseInt(e.target.value) })}
                        className="flex-1 h-2 bg-slate-100 rounded-lg"
                      />
                      <input
                        type="number"
                        min={12}
                        max={24}
                        value={localTenant.baseFontSize || 14}
                        onChange={e => setLocalTenant({ ...localTenant, baseFontSize: parseInt(e.target.value || '14') })}
                        className="w-20 bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2 text-sm font-black outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <p className="text-base font-medium" style={{ fontFamily: localTenant.fontFamily, fontSize: `${localTenant.baseFontSize || 14}px`, lineHeight: 1.6 }}>Exemple — Le vif renard brun saute par-dessus le chien paresseux.</p>
                    <div className="mt-3 text-[12px] text-slate-500">Police active: <span className="font-bold text-slate-700">{localTenant.fontFamily?.split(',')[0]}</span> · Taille: <span className="font-bold">{localTenant.baseFontSize || 14}px</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section Logos */}
          <div className="lg:col-span-6 bg-white p-5 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
             <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2 mb-4"><ImageIcon size={16}/> Assets Visuels (Cloud Storage)</h3>
             
             <div className="grid grid-cols-1 gap-8">
                {/* Logo Plateforme */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Logo Principal de la Plateforme</label>
                  <div className="relative group">
                    <input type="file" id="logo_up_settings" hidden onChange={e => handleFileUpload(e, 'logoUrl')} accept="image/*" />
                    <label htmlFor="logo_up_settings" className={`block w-full p-8 border-4 border-dashed rounded-[2.5rem] text-center cursor-pointer transition-all relative overflow-hidden group ${localTenant.logoUrl ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-100 hover:border-indigo-400 hover:bg-slate-50'}`}>
                      {isUploading === 'logoUrl' ? (
                        <div className="py-10"><Loader2 className="animate-spin mx-auto text-indigo-600" size={32} /></div>
                      ) : localTenant.logoUrl ? (
                        <img src={localTenant.logoUrl} className="h-24 mx-auto object-contain transition-transform group-hover:scale-105" alt="Logo Platform" />
                      ) : (
                        <div className="py-6">
                           <Upload className="mx-auto text-slate-300 group-hover:text-indigo-600 transition-colors" size={40} />
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Importer le logo de l'instance</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors pointer-events-none"></div>
                    </label>
                  </div>
                </div>

                {/* Cachet / Signature */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Cachet "PAYÉ" ou Signature Digitale</label>
                  <div className="relative group">
                    <input type="file" id="cachet_up_settings" hidden onChange={e => handleFileUpload(e, 'cachetUrl')} accept="image/*" />
                    <label htmlFor="cachet_up_settings" className={`block w-full p-8 border-4 border-dashed rounded-[2.5rem] text-center cursor-pointer transition-all relative overflow-hidden group ${localTenant.cachetUrl ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-100 hover:border-indigo-400 hover:bg-slate-50'}`}>
                      {isUploading === 'cachetUrl' ? (
                        <div className="py-10"><Loader2 className="animate-spin mx-auto text-indigo-600" size={32} /></div>
                      ) : localTenant.cachetUrl ? (
                        <img src={localTenant.cachetUrl} className="h-24 mx-auto object-contain mix-blend-multiply transition-transform group-hover:scale-105" alt="Cachet" />
                      ) : (
                        <div className="py-6">
                           <Stamp className="mx-auto text-slate-300 group-hover:text-indigo-600 transition-colors" size={40} />
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Importer le cachet d'entreprise</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
             </div>
             
             <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-start gap-4">
                <ShieldCheck size={20} className="text-indigo-600 shrink-0" />
                <p className="text-[10px] font-bold text-indigo-800 uppercase leading-relaxed">
                  Ces assets sont stockés de manière sécurisée et immuable. Le logo de facture est utilisé pour la génération des documents PDF et Factur-X certifiés.
                </p>
             </div>
          </div>
        </div>
      )}

      {activeSubTab === 'fiscal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 animate-in slide-in-from-bottom-4">
          <div className="lg:col-span-8 bg-white p-5 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2 mb-4"><CreditCard size={16}/> Paramètres de Facturation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
               <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Devise Système</label>
                <select value={localTenant.currency} onChange={e => setLocalTenant({...localTenant, currency: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10">
                  <option>F CFA</option>
                  <option>€</option>
                  <option>$</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Taux TVA (%)</label>
                <input type="number" value={localTenant.taxRate} onChange={e => setLocalTenant({...localTenant, taxRate: parseFloat(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Préfixe Facture</label>
                <input type="text" value={localTenant.invoicePrefix} onChange={e => setLocalTenant({...localTenant, invoicePrefix: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-mono font-black outline-none focus:ring-4 focus:ring-indigo-500/10" />
              </div>
              <div className="col-span-full space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Mentions Légales / Pied de Facture</label>
                <textarea value={localTenant.invoiceFooter || ''} onChange={e => setLocalTenant({...localTenant, invoiceFooter: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 min-h-[100px]" placeholder="Ex: Conditions de règlement à 30 jours..." />
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 bg-slate-900 rounded-[3rem] p-5 md:p-10 text-white flex flex-col justify-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5"><FileText size={120}/></div>
             <h4 className="text-lg md:text-xl font-black uppercase mb-4 tracking-tighter">Moteur Factur-X</h4>
             <p className="text-xs text-slate-400 leading-relaxed font-bold uppercase tracking-widest">Chaque réglage fiscal ici impacte la signature électronique de vos factures pour la conformité européenne et africaine.</p>
          </div>
        </div>
      )}

      {activeSubTab === 'profile' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="flex items-center gap-4 p-6 bg-indigo-900 rounded-[2.5rem] text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 p-8 opacity-10"><ShieldCheck size={100}/></div>
            <div className="w-14 h-14 bg-indigo-700 rounded-2xl flex items-center justify-center shrink-0">
              <Lock size={28} className="text-white"/>
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Sécurité de votre Session Administrateur</h3>
              <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mt-1">Gérez vos accès, mots de passe et le cycle de vie de votre compte</p>
            </div>
          </div>

          {/* Grille principale : mot de passe (gauche) + actions rapides (droite) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* — Changement de mot de passe — */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
                  <Lock size={18} className="text-indigo-600"/>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase">Changer le mot de passe</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mise à jour sécurisée de vos identifiants</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Mot de passe actuel</label>
                  <input
                    type={pwShowCurrent ? 'text' : 'password'}
                    value={pwCurrent}
                    onChange={e => setPwCurrent(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-5 py-3.5 pr-12 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                  />
                  <button type="button" onClick={() => setPwShowCurrent(v => !v)} className="absolute right-4 bottom-3.5 text-slate-400 hover:text-slate-700">
                    <Lock size={15}/>
                  </button>
                </div>

                <div className="relative">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nouveau mot de passe</label>
                  <input
                    type={pwShowNew ? 'text' : 'password'}
                    value={pwNew}
                    onChange={e => setPwNew(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-5 py-3.5 pr-12 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                  />
                  <button type="button" onClick={() => setPwShowNew(v => !v)} className="absolute right-4 bottom-3.5 text-slate-400 hover:text-slate-700">
                    <Lock size={15}/>
                  </button>
                </div>

                {pwNew && (() => {
                  const s = getPasswordStrength(pwNew);
                  return (
                    <div className="space-y-1.5 px-1">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${s.color}`} style={{ width: s.width }}/>
                      </div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
                    </div>
                  );
                })()}

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Confirmer le nouveau mot de passe</label>
                  <input
                    type="password"
                    value={pwConfirm}
                    onChange={e => setPwConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                  />
                </div>
              </div>

              {pwError && <p className="text-xs text-red-500 font-bold px-1">{pwError}</p>}
              {pwSuccess && <p className="text-xs text-green-600 font-bold px-1 flex items-center gap-2"><CheckCircle2 size={14}/> Mot de passe mis à jour avec succès.</p>}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="flex-1 min-w-[140px] px-5 py-3 bg-slate-100 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={13}/> Générer
                </button>
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                  className="flex-1 min-w-[140px] px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {pwSaving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>}
                  Enregistrer
                </button>
              </div>
            </div>

            {/* — Actions rapides (MFA + Sessions) — */}
            <div className="space-y-4">
              <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
                    <ShieldCheck size={22} className="text-indigo-600"/>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase">Double Authentification</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Sécurise l'accès par code mobile</p>
                  </div>
                </div>
                <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shrink-0">GÉRER</button>
              </div>

              <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0">
                    <FileText size={22} className="text-slate-500"/>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase">Registre de connexion</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Historique des accès de l'instance</p>
                  </div>
                </div>
                <button className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shrink-0">VOIR</button>
              </div>

              {/* Conseil sécurité */}
              <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] flex items-start gap-4">
                <ShieldCheck size={20} className="text-indigo-500 shrink-0 mt-0.5"/>
                <p className="text-[10px] font-bold text-indigo-700 uppercase leading-relaxed">
                  Activez le MFA pour doubler la protection de votre compte administrateur. En cas de compromission du mot de passe, votre espace restera sécurisé.
                </p>
              </div>
            </div>
          </div>

          {/* — Zone dangereuse — */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-8 py-5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
              <AlertTriangle size={18} className="text-amber-400"/>
              <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Zone Dangereuse</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

              {/* Désactivation */}
              <div className="p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center shrink-0">
                    <PowerOff size={18} className="text-orange-600"/>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase">Désactiver le compte</p>
                    <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mt-0.5">Suspension temporaire de l'accès</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Suspend l'accès à votre espace pour tous vos utilisateurs. Vos données sont conservées. Vous pouvez réactiver à tout moment en contactant le support.
                </p>
                {!showDeactivateConfirm ? (
                  <button
                    onClick={() => setShowDeactivateConfirm(true)}
                    className="w-full py-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-100 transition-all flex items-center justify-center gap-2"
                  >
                    <PowerOff size={13}/> Désactiver le compte
                  </button>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-3">
                    <p className="text-[10px] text-orange-800 font-black uppercase">Confirmer la désactivation ?</p>
                    <p className="text-[10px] text-orange-600">Tous vos utilisateurs perdront l'accès immédiatement.</p>
                    <div className="flex gap-3">
                      <button onClick={handleDeactivateAccount} disabled={accountActionLoading} className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-orange-800 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {accountActionLoading ? <Loader2 size={12} className="animate-spin"/> : <PowerOff size={12}/>} Confirmer
                      </button>
                      <button onClick={() => setShowDeactivateConfirm(false)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Annuler</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Suppression définitive */}
              <div className="p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                    <Trash2 size={18} className="text-red-600"/>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase">Supprimer le compte</p>
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-0.5">Action irréversible après 30 jours</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Programme la suppression définitive de votre espace et toutes vos données sous 30 jours. Vous pouvez annuler pendant ce délai via le support.
                </p>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={13}/> Supprimer définitivement
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
                    <p className="text-[10px] text-red-800 font-black uppercase">Tapez <span className="bg-red-100 px-1.5 py-0.5 rounded font-mono">SUPPRIMER</span> pour confirmer</p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmText(e.target.value)}
                      placeholder="SUPPRIMER"
                      className="w-full px-4 py-3 border border-red-200 rounded-2xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-red-400 bg-white uppercase tracking-widest"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'SUPPRIMER' || accountActionLoading}
                        className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-800 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {accountActionLoading ? <Loader2 size={12} className="animate-spin"/> : <Trash2 size={12}/>} Supprimer
                      </button>
                      <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Annuler</button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

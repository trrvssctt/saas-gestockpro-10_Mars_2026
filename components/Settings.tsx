
import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Globe, DollarSign, Image as ImageIcon, 
  ShieldCheck, Save, Check, X, FileText, ShieldAlert, 
  User as UserIcon, Lock, Fingerprint, Shield, Palette, 
  LayoutDashboard, CreditCard, Sparkles, History,
  CheckCircle2, ChevronRight, Building2, Phone, Mail, MapPin,
  Stamp, RefreshCw, Upload, Loader2, Pipette
} from 'lucide-react';
import { AppSettings, UserRole, Currency, Language } from '../types';
import { apiClient } from '../services/api';

interface SettingsProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'branding' | 'fiscal' | 'profile'>('general');
  const [localTenant, setLocalTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await apiClient.get('/settings');
        setLocalTenant(data);
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
        setLocalTenant({ ...localTenant, [field]: data.secure_url });
      }
    } catch (err) {
      console.error("Upload Error:", err);
      alert("Échec de l'envoi de l'image.");
    } finally {
      setIsUploading(null);
    }
  };

  const handleSave = async () => {
    if (!localTenant) return;
    setIsSaving(true);
    try {
      const response = await apiClient.put('/settings', localTenant);
      const updatedTenant = response.tenant;
      setLocalTenant(updatedTenant);
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
        document.documentElement.style.setProperty('--primary-kernel', updatedTenant.primaryColor);
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
        <div className="flex gap-4">
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

      <div className="flex flex-wrap gap-2 p-1.5 bg-white border border-slate-100 rounded-[2rem] w-fit shadow-sm">
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

      {activeSubTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4">
          <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
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
          <div className="lg:col-span-4 bg-indigo-900 rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Building2 size={120}/></div>
            <h4 className="text-xl font-black uppercase mb-4">Isolation Multi-Tenant</h4>
            <p className="text-xs text-indigo-200 leading-relaxed font-medium uppercase tracking-widest">Vos données sont stockées dans un schéma PostgreSQL dédié. L'exactitude de ces informations garantit la validité de vos documents Factur-X.</p>
          </div>
        </div>
      )}

      {activeSubTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4">
           {/* Section Couleurs */}
           <div className="lg:col-span-6 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10">
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
                      onClick={() => setLocalTenant({...localTenant, primaryColor: color})}
                      className={`w-14 h-14 rounded-2xl transition-all relative flex items-center justify-center ${localTenant.primaryColor === color ? 'ring-4 ring-indigo-100 scale-110' : 'hover:scale-105'}`}
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
                      value={localTenant.primaryColor || '#4f46e5'}
                      onChange={e => setLocalTenant({...localTenant, primaryColor: e.target.value})}
                      className="w-16 h-16 rounded-xl border-none p-0 bg-transparent cursor-pointer overflow-hidden shadow-lg"
                    />
                    <div className="flex-1 relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">#</span>
                       <input 
                        type="text" 
                        value={(localTenant.primaryColor || '').replace('#', '')}
                        onChange={e => setLocalTenant({...localTenant, primaryColor: '#' + e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-2xl pl-8 pr-4 py-4 text-sm font-mono font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10"
                        placeholder="FFFFFF"
                        maxLength={6}
                       />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Sparkles size={80}/></div>
                 <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Aperçu en temps réel</h4>
                 <div className="space-y-4">
                    <div className="h-4 w-3/4 rounded-full" style={{ backgroundColor: localTenant.primaryColor + '30' }}></div>
                    <button className="px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg" style={{ backgroundColor: localTenant.primaryColor }}>Bouton Principal</button>
                 </div>
              </div>
            </div>
          </div>

          {/* Section Logos */}
          <div className="lg:col-span-6 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
             <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2 mb-4"><ImageIcon size={16}/> Assets Visuels (Cloud Storage)</h3>
             
             <div className="grid grid-cols-1 gap-8">
                {/* Logo Plateforme */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Logo Principal de la Plateforme</label>
                  <div className="relative group">
                    <input type="file" id="logo_up_settings" hidden onChange={e => handleFileUpload(e, 'logoUrl')} accept="image/*" />
                    <label htmlFor="logo_up_settings" className={`block p-8 border-4 border-dashed rounded-[2.5rem] text-center cursor-pointer transition-all relative overflow-hidden group ${localTenant.logoUrl ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-100 hover:border-indigo-400 hover:bg-slate-50'}`}>
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
                    <label htmlFor="cachet_up_settings" className={`block p-8 border-4 border-dashed rounded-[2.5rem] text-center cursor-pointer transition-all relative overflow-hidden group ${localTenant.cachetUrl ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-100 hover:border-indigo-400 hover:bg-slate-50'}`}>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4">
          <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2 mb-4"><CreditCard size={16}/> Paramètres de Facturation</h3>
            <div className="grid grid-cols-2 gap-8">
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
          <div className="lg:col-span-4 bg-slate-900 rounded-[3rem] p-10 text-white flex flex-col justify-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5"><FileText size={120}/></div>
             <h4 className="text-xl font-black uppercase mb-4 tracking-tighter">Moteur Factur-X</h4>
             <p className="text-xs text-slate-400 leading-relaxed font-bold uppercase tracking-widest">Chaque réglage fiscal ici impacte la signature électronique de vos factures pour la conformité européenne et africaine.</p>
          </div>
        </div>
      )}

      {activeSubTab === 'profile' && (
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm max-w-2xl animate-in slide-in-from-bottom-4">
           <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2 mb-8"><Lock size={16}/> Sécurité de votre Session Administrateur</h3>
           <div className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                 <div>
                    <p className="text-sm font-black text-slate-900 uppercase">Double Authentification (MFA)</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sécurise l'accès par code mobile</p>
                 </div>
                 <button className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all">GÉRER LE MFA</button>
              </div>
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                 <div>
                    <p className="text-sm font-black text-slate-900 uppercase">Registre de connexion</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Historique des accès de l'instance</p>
                 </div>
                 <button className="px-6 py-2 bg-slate-200 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">CONSULTER</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

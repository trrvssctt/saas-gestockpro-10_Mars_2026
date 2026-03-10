
import React, { useState, useEffect } from 'react';
import { 
  Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, 
  Eye, EyeOff, Zap, Check, ChevronLeft, RefreshCw,
  Building2, CreditCard, Sparkles, User as UserIcon,
  Star, WifiOff, X, MapPin, Phone, Briefcase, Info,
  Terminal, Shield, Smartphone
} from 'lucide-react';
import { User, SubscriptionPlan, UserRole } from '../types';
import logo from '../assets/logo_gestockpro.png';
import { authBridge } from '../services/authBridge';
import { apiClient, ApiError } from '../services/api';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onBackToLanding: () => void;
  initialMode?: 'LOGIN' | 'REGISTER' | 'SUPERADMIN' | 'MFA';
  initialPlanId?: string;
  initialRegStep?: number;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onBackToLanding, initialMode, initialPlanId, initialRegStep }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'SUPERADMIN' | 'MFA'>('LOGIN');
  const [regStep, setRegStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [dynamicPlans, setDynamicPlans] = useState<SubscriptionPlan[]>([]);
  
  // États Auth
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [tempUserId, setTempUserId] = useState<string | null>(null);

  const [regData, setRegData] = useState({
    planId: '', companyName: '', siret: '', address: '', phone: '',
    paymentMethod: 'Orange Money', adminName: '', adminEmail: '', adminPassword: '',
    primaryColor: '#0f172a', buttonColor: '#63452c'
  });

  useEffect(() => {
    // Apply initial navigation options (e.g., open register with preselected plan)
    if (initialMode) {
      setMode(initialMode);
    }
    if (typeof initialRegStep === 'number') {
      setRegStep(initialRegStep);
    }
    if (initialPlanId) {
      setRegData(prev => ({ ...prev, planId: initialPlanId }));
    }

    const fetchPlans = async () => {
      try {
        const data = await apiClient.get('/plans');
        setDynamicPlans(data);
        if (data.length > 0) {
          const proPlan = data.find((p: any) => p.id === 'PRO' || p.isPopular);
          setRegData(prev => ({ ...prev, planId: prev.planId || proPlan?.id || data[0].id }));
        }
      } catch (err) {
        console.error("Kernel Plans Error", err);
      }
    };
    fetchPlans();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApiError(null);
    try {
      const endpoint = mode === 'SUPERADMIN' ? '/auth/superadmin/login' : '/auth/login';
      const data = await apiClient.post(endpoint, { email: loginEmail, password: loginPassword });
      
      if (data.mfaRequired) {
        setTempUserId(data.tempUserId);
        setMode('MFA');
        return;
      }

      const apiUser = mode === 'SUPERADMIN'
        ? { ...data.user, role: UserRole.SUPER_ADMIN, roles: [UserRole.SUPER_ADMIN], tenantId: 'SYSTEM' }
        : data.user;

      // Bloquer la connexion si le tenant est inactif ou si le paiement n'est pas à jour (sauf SuperAdmin)
      if (mode !== 'SUPERADMIN') {
        const tenant = data.user?.tenant;
        const sub = data.user?.subscription;
        const tenantInactive = tenant && tenant.isActive === false;
        const paymentNotUpToDate = tenant && !(tenant.paymentStatus === 'UP_TO_DATE' || tenant.paymentStatus === 'TRIAL');

        if (tenantInactive) {
          setApiError({ message: 'Instance désactivée. Contactez le support.' } as any);
          setLoading(false);
          return;
        }

        if (paymentNotUpToDate) {
          const roles = Array.isArray(apiUser?.roles) ? apiUser.roles : [apiUser?.role];
          const isAdmin = roles && (roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN));
          if (!isAdmin) {
            setApiError({ message: 'Accès suspendu : votre paiement n\'est pas à jour.' } as any);
            setLoading(false);
            return;
          }
          // allow ADMIN to login for remediation; frontend will restrict modules to dashboard only
        }

        // fallback: si backend fournit subscription et elle est non-active
        if (sub && sub.status && sub.status !== 'ACTIVE' && sub.status !== 'TRIAL') {
          setApiError({ message: 'Votre abonnement est en attente de validation. Connexion refusée.' } as any);
          setLoading(false);
          return;
        }
      }

      const user = {
        ...apiUser,
        planId: apiUser?.planId || null,
        plan: apiUser?.plan || null,
        subscription: apiUser?.subscription || null,
        isPaid: Boolean(apiUser?.isPaid),
        isSubscriptionPastDue: Boolean(apiUser?.isSubscriptionPastDue),
        lastLogin: apiUser?.lastLogin || apiUser?.last_login || null
      };

      authBridge.saveSession(user, data.token);
      onLoginSuccess(user);
    } catch (err: any) {
      setApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApiError(null);
    try {
      const data = await apiClient.post('/auth/mfa/verify', { userId: tempUserId, code: mfaCode });
      const apiUser = data.user;
      if (mode !== 'SUPERADMIN') {
        const tenant = data.user?.tenant;
        const sub = data.user?.subscription;
        const tenantInactive = tenant && tenant.isActive === false;
        const paymentNotUpToDate = tenant && !(tenant.paymentStatus === 'UP_TO_DATE' || tenant.paymentStatus === 'TRIAL');

        if (tenantInactive) {
          setApiError({ message: 'Instance désactivée. Contactez le support.' } as any);
          setLoading(false);
          return;
        }

        if (paymentNotUpToDate) {
          const roles = Array.isArray(apiUser?.roles) ? apiUser.roles : [apiUser?.role];
          const isAdmin = roles && (roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN));
          if (!isAdmin) {
            setApiError({ message: 'Accès suspendu : votre paiement n\'est pas à jour.' } as any);
            setLoading(false);
            return;
          }
          // allow ADMIN to proceed when tenant payment is late; modules will be gated
        }

        if (sub && sub.status && sub.status !== 'ACTIVE' && sub.status !== 'TRIAL') {
          setApiError({ message: 'Votre abonnement est en attente de validation. Connexion refusée.' } as any);
          setLoading(false);
          return;
        }
      }
      const user = {
        ...apiUser,
        planId: apiUser?.planId || null,
        plan: apiUser?.plan || null,
        subscription: apiUser?.subscription || null,
        isPaid: Boolean(apiUser?.isPaid),
        isSubscriptionPastDue: Boolean(apiUser?.isSubscriptionPastDue),
        lastLogin: apiUser?.lastLogin || apiUser?.last_login || null
      };

      authBridge.saveSession(user, data.token);
      onLoginSuccess(user);
    } catch (err: any) {
      setApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApiError(null);

    const payload = {
      companyName: regData.companyName, siret: regData.siret, phone: regData.phone, address: regData.address,
      planId: regData.planId, paymentMethod: regData.paymentMethod,
      primaryColor: regData.primaryColor, buttonColor: regData.buttonColor,
      admin: { name: regData.adminName, email: regData.adminEmail, password: regData.adminPassword }
    };

    try {
      const response = await apiClient.post('/auth/register', payload);
      const mustPay = response.subscription?.status === 'PENDING';
      const planObj = dynamicPlans.find(p => p.id === regData.planId);
      
      onLoginSuccess({ 
        ...response.user,
        token: response.token, 
        planId: response.subscription?.planId,
        selectedPlanDetails: planObj,
        mustPay: mustPay
      } as any);

    } catch (err: any) {
      setApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const renderRegistrationStep = () => {
    switch(regStep) {
      case 1: 
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="mb-6">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sélectionnez votre moteur</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Choisissez la puissance de votre instance</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dynamicPlans.map(plan => (
                <button 
                  key={plan.id}
                  onClick={() => setRegData({...regData, planId: plan.id})}
                  className={`p-6 rounded-[2rem] border-2 text-left transition-all relative group ${regData.planId === plan.id ? 'border-indigo-600 bg-indigo-50 shadow-inner' : 'border-slate-100 hover:border-indigo-200'}`}
                >
                  {regData.planId === plan.id && <Check className="absolute top-4 right-4 text-indigo-600" size={18} />}
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">{plan.name}</h4>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-xl font-black text-slate-900">{plan.price.toLocaleString()}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">F CFA/m</span>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setRegStep(2)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 mt-8 shadow-xl">CONTINUER L'IDENTITÉ <ArrowRight size={18} /></button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             <div className="mb-6">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Identité de la Structure</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Information légale pour l'isolation du tenant</p>
            </div>
            <div className="space-y-4">
              <div className="relative"><Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="text" required value={regData.companyName} onChange={e => setRegData({...regData, companyName: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Raison Sociale" /></div>
              <div className="relative"><Shield className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="text" required value={regData.siret} onChange={e => setRegData({...regData, siret: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="N° SIRET / Registre Commerce" /></div>
              <div className="relative"><Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="tel" required value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Téléphone Entreprise" /></div>
              <div className="relative"><MapPin className="absolute left-5 top-4 text-slate-300" size={18} /><textarea required value={regData.address} onChange={e => setRegData({...regData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 min-h-[100px]" placeholder="Adresse du Siège Social" /></div>
            </div>
            
            <div className="flex gap-4 mt-8">
              <button onClick={() => setRegStep(1)} className="px-8 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">RETOUR</button>
              <button onClick={() => setRegStep(3)} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-xl">CRÉER L'ADMIN <ArrowRight size={18} /></button>
            </div>
          </div>
        );
      case 3:
        return (
          <form onSubmit={handleRegister} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             <div className="mb-6">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Compte Propriétaire</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Accès Maître de l'instance {regData.companyName}</p>
            </div>
            <div className="space-y-4">
              <div className="relative"><UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="text" required value={regData.adminName} onChange={e => setRegData({...regData, adminName: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Nom Complet" /></div>
              <div className="relative"><Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="email" required value={regData.adminEmail} onChange={e => setRegData({...regData, adminEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Email Administrateur" /></div>
              <div className="relative"><Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type={showPassword ? 'text' : 'password'} required value={regData.adminPassword} onChange={e => setRegData({...regData, adminPassword: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-14 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Clé d'Accès de Sécurité" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3"><ShieldCheck size={20} className="text-emerald-600 shrink-0" /><p className="text-[9px] text-emerald-800 font-bold uppercase leading-relaxed">En validant, vous déployez une infrastructure isolée conforme aux protocoles GSP-3.2.</p></div>
            <div className="flex gap-4 mt-8">
              <button type="button" onClick={() => setRegStep(2)} className="px-8 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">RETOUR</button>
              <button type="submit" disabled={loading} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-3 shadow-xl">{loading ? <RefreshCw className="animate-spin" size={18} /> : <>LANCER LE DÉPLOIEMENT <Sparkles size={18} /></>}</button>
            </div>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans text-slate-900">
      <button type="button" onClick={onBackToLanding} className="absolute left-6 top-6 z-40 text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 hover:text-indigo-300">
        <ChevronLeft size={16} /> Accueil
      </button>
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
      
      <div className={`w-full transition-all duration-700 ${mode === 'REGISTER' ? 'max-w-5xl' : 'max-w-md'}`}>
        <div className="text-center mb-10">
          
          <img src={logo} alt="GeStockPro" className="mx-auto mb-4 h-14" />
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
            {mode === 'REGISTER' ? 'Déploiement Instance SaaS' : mode === 'SUPERADMIN' ? 'Console Maître Kernel' : mode === 'MFA' ? 'Vérification de Sécurité' : 'Accès Privé GeStock'}
          </h1>
        </div>

        <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden relative">
          {apiError && (
            <div className="absolute top-8 left-8 right-8 z-20 p-5 bg-rose-50 border-2 border-rose-100 rounded-3xl animate-in shake duration-500 flex items-center justify-between">
              <div className="flex items-center gap-4"><AlertCircle size={20} className="text-rose-600" /><p className="text-xs font-bold text-rose-700">{apiError.message}</p></div>
              <button onClick={() => setApiError(null)}><X size={18} className="text-rose-300" /></button>
            </div>
          )}

          {mode === 'LOGIN' || mode === 'SUPERADMIN' ? (
            <form onSubmit={handleLogin} className="p-12 space-y-6">
              <div className="space-y-5">
                <div className="relative"><Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value.toLowerCase())} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder={mode === 'SUPERADMIN' ? 'MASTER_ID' : 'Email Opérateur'} /></div>
                <div className="relative"><Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type={showPassword ? 'text' : 'password'} required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-14 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="ACCESS_KEY" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                <button type="submit" disabled={loading} className={`w-full py-5 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${mode === 'SUPERADMIN' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-slate-900 hover:bg-indigo-600'}`}>{loading ? <RefreshCw className="animate-spin" size={18} /> : <>OUVRIR LA SESSION <ArrowRight size={18} /></>}</button>
              </div>
            </form>
          ) : mode === 'MFA' ? (
            <form onSubmit={handleVerifyMFA} className="p-16 space-y-8 animate-in zoom-in-95">
               <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner"><Smartphone size={40} className="animate-bounce" /></div>
                  <h3 className="text-lg font-black uppercase text-slate-800">Double Authentification</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed px-4">Un code de sécurité à 6 chiffres a été généré pour sécuriser votre accès.</p>
               </div>
               <div className="space-y-4">
                  <input 
                    type="text" required maxLength={6} value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-6 text-center text-3xl font-black tracking-[0.5em] outline-none focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="000000"
                  />
                  <button type="submit" disabled={loading || mfaCode.length !== 6} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3">
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : <>VÉRIFIER L'IDENTITÉ <ArrowRight size={18} /></>}
                  </button>
               </div>
               <button type="button" onClick={() => setMode('LOGIN')} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Annuler la session</button>
            </form>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
              <div className="lg:col-span-4 bg-slate-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={200} /></div>
                <div className="space-y-8 relative z-10">
                  {[{ step: 1, label: 'Choix du Plan', icon: Star }, { step: 2, label: 'L\'Entreprise', icon: Building2 }, { step: 3, label: 'Administrateur', icon: UserIcon }].map(s => (
                    <div key={s.step} className={`flex items-center gap-4 transition-all duration-500 ${regStep === s.step ? 'opacity-100 translate-x-2' : regStep > s.step ? 'opacity-60 grayscale' : 'opacity-40'}`}><div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${regStep === s.step ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-500/30' : regStep > s.step ? 'bg-emerald-50 border-emerald-500' : 'border-slate-700'}`}>{regStep > s.step ? <Check size={20} /> : <s.icon size={18} />}</div><div><span className="text-[10px] font-black uppercase tracking-widest block">Étape {s.step}</span><span className="text-xs font-bold text-slate-400">{s.label}</span></div></div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-8 p-12 flex flex-col">{renderRegistrationStep()}</div>
            </div>
          )}

          <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-center">
           
            {mode === 'LOGIN' && (
              <button type="button" onClick={() => { setMode('REGISTER'); setRegStep(1); }} className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest flex items-center gap-3">
                <Sparkles size={16} /> Créer un espace entreprise
              </button>
            )}
            {mode === 'REGISTER' && (
              <button type="button" onClick={() => setMode('LOGIN')} className="text-[11px] font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest flex items-center gap-3"><ChevronLeft size={18} /> Retour Connexion</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

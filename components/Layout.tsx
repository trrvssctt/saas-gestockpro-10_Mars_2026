
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, FileText, ShieldAlert, LogOut, 
  Users as UsersIcon, Settings as SettingsIcon, Activity,
  CreditCard, ShieldCheck, Terminal, ShieldHalf, Loader2,
  Layers, GitMerge, Wallet, History, TrendingDown, Sparkles
} from 'lucide-react';
import { User } from '../types';
import { authBridge } from '../services/authBridge';

interface LayoutProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
  isSuperAdminMode?: boolean;
  logoUrl?: string;
  companyName?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  user, 
  activeTab, 
  setActiveTab, 
  onLogout, 
  children, 
  isSuperAdminMode = false,
  logoUrl,
  companyName
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const allMenuItems = [
    { id: 'superadmin', label: 'Kernel SuperAdmin', icon: Terminal },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'categories', label: 'Catégories', icon: Layers },
    { id: 'subcategories', label: 'Sous-Catégories', icon: GitMerge },
    { id: 'inventory', label: 'Catalogue Stocks', icon: Package },
    { id: 'services', label: 'Catalogue Services', icon: Sparkles },
    { id: 'movements', label: 'Mouvements Flux', icon: History },
    { id: 'inventorycampaigns', label: 'Inventaire', icon: Package },
    { id: 'customers', label: 'Clients', icon: UsersIcon },
    { id: 'sales', label: 'Ventes & Factures', icon: FileText },
    { id: 'recovery', label: 'Recouvrement', icon: TrendingDown },
    { id: 'payments', label: 'Trésorerie', icon: Wallet },
    { id: 'governance', label: 'Gouvernance IAM', icon: ShieldHalf },
    { id: 'subscription', label: 'Abonnement', icon: CreditCard },
    { id: 'security', label: 'Cyber-Sécurité', icon: ShieldAlert },
    { id: 'audit', label: 'Journal d\'Audit', icon: Activity },
    { id: 'settings', label: 'Paramétrage', icon: SettingsIcon }
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onLogout();
  };

  useEffect(() => {
    try {
      console.log('Layout debug - user.planId:', (user as any)?.planId, 'roles:', (user as any)?.roles);
      console.log('Layout debug - module access:', allMenuItems.map(i => ({ id: i.id, allowed: authBridge.canAccess(user, i.id) })));
    } catch (e) {
      console.warn('Layout debug failed', e);
    }
  }, [user]);

  return (
    <div className={`flex h-screen ${isSuperAdminMode ? 'bg-slate-950' : 'bg-slate-50'} overflow-hidden transition-colors duration-500`}>
      <aside className={`w-64 ${isSuperAdminMode ? 'bg-slate-950' : 'bg-slate-900'} text-white flex flex-col shadow-2xl z-20`}>
        <div className="p-6 flex items-center gap-3">
          {logoUrl ? (
            <div className="flex items-center gap-3">
              <img src={logoUrl} className="h-10 w-10 object-contain rounded-xl bg-white p-1" alt="Logo" />
              <span className="text-sm font-black tracking-tighter truncate max-w-[140px] uppercase">{companyName}</span>
            </div>
          ) : (
            <h1 className={`text-xl font-bold tracking-tight ${isSuperAdminMode ? 'text-rose-500' : 'text-indigo-500'}`}>
              GESTOCK<span className="text-white">PRO</span>
            </h1>
          )}
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {allMenuItems.filter(item => authBridge.canAccess(user, item.id)).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id 
                ? (isSuperAdminMode ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20')
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} className={`${activeTab === item.id ? 'text-white' : 'text-slate-500'}`} />
              <span className="font-bold text-[10px] uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 bg-slate-800/50 m-4 rounded-2xl border border-slate-800/50">
          <div className="flex flex-col gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-black text-white shrink-0 uppercase shadow-lg">
                {user.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-black truncate">{user.name}</p>
                <p className="text-[9px] text-indigo-400 font-bold uppercase truncate">{user.email}</p>
              </div>
            </div>
          </div>
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700 uppercase tracking-widest">
            <LogOut size={12} /> DÉCONNEXION
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative custom-scrollbar">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b sticky top-0 z-10 flex items-center justify-between px-8">
          <div className="flex items-center gap-2">
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Instance / </span>
             <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{activeTab}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck size={14} /> KERNEL ACTIVE
            </div>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden p-10 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                <ShieldAlert size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Fermer la session ?</h3>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest leading-relaxed mb-8">L'isolation du tenant sera maintenue.</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleLogout} disabled={isLoggingOut} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-3">
                  {isLoggingOut ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
                  {isLoggingOut ? 'RÉVOCATION...' : 'OUI, DÉCONNEXION'}
                </button>
                <button onClick={() => setShowLogoutConfirm(false)} className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Annuler</button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;

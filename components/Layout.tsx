
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, FileText, ShieldAlert, LogOut,
  Users as UsersIcon, Settings as SettingsIcon, Activity,
  CreditCard, ShieldCheck, Terminal, ShieldHalf, Loader2,
  Layers, GitMerge, Wallet, History, TrendingDown, Sparkles,
  AlertTriangle, Clock, Calendar
} from 'lucide-react';
import { User, UserRole } from '../types';
import { authBridge } from '../services/authBridge';
import { useCurrentEmployeeAbsenceStatus, getLeaveTypeLabel, getDaysUntilReturn } from '../services/employeeStatusService';

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
  const [asideTextColor, setAsideTextColor] = useState<string>('#ffffff');
  const [primaryTextOnPrimary, setPrimaryTextOnPrimary] = useState<string>('#ffffff');
  const [primaryHex, setPrimaryHex] = useState<string>('#4f46e5');
  const [buttonHex, setButtonHex] = useState<string>('#4f46e5');
  const [hoveredMenuId, setHoveredMenuId] = useState<string | null>(null);
  const [rhOpen, setRhOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(true);
  
  // Hook pour vérifier le statut d'absence de l'employé connecté
  const { absenceStatus, loading: absenceLoading } = useCurrentEmployeeAbsenceStatus();

  const allMenuItems = [
    { id: 'superadmin', label: 'Kernel SuperAdmin', icon: Terminal },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'categories', label: 'Catégories', icon: Layers },
    { id: 'subcategories', label: 'Sous-Catégories', icon: GitMerge },
    { id: 'inventory', label: 'Catalogue Stocks', icon: Package },
    { id: 'services', label: 'Catalogue Services', icon: Sparkles },
    { id: 'movements', label: 'Mouvements Flux', icon: History },
    { id: 'inventorycampaigns', label: 'Inventaire', icon: Package },
    { id: 'rh', label: 'Ressources Humaines', icon: UsersIcon },
    { id: 'my-leaves', label: 'Mes Congés', icon: Activity },
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

  const rhSubItems = [
    { id: 'rh.employees', label: 'Employés' },
    { id: 'rh.contracts', label: 'Contrats' },
    { id: 'rh.org', label: 'Organigramme' },
    { id: 'rh.docs', label: 'Documents' },
    { id: 'rh.leaves', label: 'Congés' },
    { id: 'rh.recruitment', label: 'Recrutement' },
    { id: 'rh.training', label: 'Formation' },
    { id: 'rh.performance', label: 'Performance' },
    { id: 'rh.payroll.settings', label: 'Paramétrage Paie' },
    { id: 'rh.payroll.generation', label: 'Génération Paie' },
    { id: 'rh.payroll.slips', label: 'Fiches de Paie' },
    { id: 'rh.payroll.bonuses', label: 'Primes' },
    { id: 'rh.payroll.advances', label: 'Avances' },
    { id: 'rh.payroll.declarations', label: 'Déclarations' }
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

  // Helpers: normalize hex and compute relative luminance for contrast decisions
  const normalizeHex = (raw?: string) => {
    if (!raw) return '';
    let s = raw.trim();
    if (!s) return '';
    if (!s.startsWith('#')) s = '#' + s;
    if (s.length === 4) {
      const r = s[1];
      const g = s[2];
      const b = s[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return s.substring(0, 7).toLowerCase();
  };

  const hexToRgb = (hex: string) => {
    const h = normalizeHex(hex);
    if (!h) return null;
    const r = parseInt(h.substr(1, 2), 16);
    const g = parseInt(h.substr(3, 2), 16);
    const b = parseInt(h.substr(5, 2), 16);
    return { r, g, b };
  };

  const hexToRgba = (hex: string, alpha = 1) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return `rgba(0,0,0,${alpha})`;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  };

  const relativeLuminance = (r: number, g: number, b: number) => {
    const srgb = [r, g, b].map(v => v / 255).map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  };

  useEffect(() => {
    const recomputeColors = () => {
      try {
        const style = getComputedStyle(document.documentElement);
        const primaryRaw = style.getPropertyValue('--primary-kernel') || '#4f46e5';
        const buttonRaw = style.getPropertyValue('--button-kernel') || primaryRaw;
        const pHex = normalizeHex(primaryRaw) || '#4f46e5';
        const bHex = normalizeHex(buttonRaw) || pHex;
        setPrimaryHex(pHex);
        setButtonHex(bHex);
        const pRgb = hexToRgb(pHex);
        const bRgb = hexToRgb(bHex);
        const pLum = pRgb ? relativeLuminance(pRgb.r, pRgb.g, pRgb.b) : 0;
        const bLum = bRgb ? relativeLuminance(bRgb.r, bRgb.g, bRgb.b) : 0;
        const primaryIsLight = pLum > 0.5;
        const buttonIsLight = bLum > 0.5;
        setAsideTextColor(buttonIsLight ? '#0f172a' : '#ffffff');
        setPrimaryTextOnPrimary(primaryIsLight ? '#0f172a' : '#ffffff');
      } catch (e) {
        // ignore
      }
    };

    // initial compute
    recomputeColors();

    // listen for explicit theme updates dispatched by Settings
    const handler = () => recomputeColors();
    window.addEventListener('tenant-theme-updated', handler as EventListener);

    return () => {
      window.removeEventListener('tenant-theme-updated', handler as EventListener);
    };
  }, []);

  const roles = Array.isArray(user.roles) ? user.roles : [user.role];
  const tenantStatus = (user as any)?.tenant?.paymentStatus;
  const isTenantOk = !tenantStatus || tenantStatus === 'UP_TO_DATE' || tenantStatus === 'TRIAL';
  const isTenantLate = !isTenantOk;
  const isAdminOrSuper = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN);

  // Enrichit le user avec planId résolu depuis toutes les sources disponibles
  const enrichedUser = (() => {
    const u = user as any;
    if (u.planId) return user;
    const resolvedPlanId =
      u?.subscription?.planId ||
      u?.plan?.id ||
      u?.tenant?.plan ||
      u?.tenant?.planId;
    if (resolvedPlanId) return { ...user, planId: String(resolvedPlanId).toUpperCase() };
    return user;
  })();

  return (
    <div className={`flex h-screen ${isSuperAdminMode ? 'bg-slate-950' : 'bg-slate-50'} overflow-hidden transition-colors duration-500`}>
      <aside 
        className={`${sidebarCollapsed ? 'w-16' : 'w-64'} text-white flex flex-col shadow-2xl z-20 transition-all duration-300 ease-in-out`} 
        style={!isSuperAdminMode ? { backgroundColor: 'var(--button-kernel)', color: asideTextColor } : undefined}
        onMouseEnter={() => setSidebarCollapsed(false)}
        onMouseLeave={() => setSidebarCollapsed(true)}
      >
        <div className={`${sidebarCollapsed ? 'p-3' : 'p-6'} flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} transition-all duration-300`}>
          {logoUrl ? (
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <img 
                src={logoUrl} 
                className={`${sidebarCollapsed ? 'h-8 w-8' : 'h-10 w-10'} object-contain rounded-xl bg-white p-1 flex-shrink-0 transition-all duration-300`} 
                alt="Logo" 
                title={sidebarCollapsed ? companyName : undefined}
              />
              {!sidebarCollapsed && <span className="text-sm font-black tracking-tighter truncate max-w-[140px] uppercase">{companyName}</span>}
            </div>
          ) : (
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
              <div 
                className={`${sidebarCollapsed ? 'text-lg' : 'text-xl'} font-bold tracking-tight ${isSuperAdminMode ? 'text-rose-500' : ''} flex-shrink-0 transition-all duration-300`} 
                style={isSuperAdminMode ? undefined : { color: asideTextColor }}
                title={sidebarCollapsed ? 'GESTOCKPRO' : undefined}
              >
                G{!sidebarCollapsed && 'ESTOCK'}
              </div>
              {!sidebarCollapsed && (
                <span style={{ backgroundColor: 'var(--primary-kernel)', color: primaryTextOnPrimary, padding: '0 6px', marginLeft: 6, borderRadius: 6, fontSize: '1.25rem', fontWeight: 'bold' }}>PRO</span>
              )}
            </div>
          )}
        </div>

        <nav className={`flex-1 ${sidebarCollapsed ? 'px-2' : 'px-4'} py-2 space-y-1 overflow-y-auto custom-scrollbar transition-all duration-300`}>
          {allMenuItems.filter(item => {
            // Accès de base via authBridge
            const hasBaseAccess = authBridge.canAccess(enrichedUser, item.id);
            
            // Restriction spéciale pour RH : seuls les admins y ont accès
            if (item.id === 'rh') {
              return hasBaseAccess && isAdminOrSuper;
            }
            
            // Menu "Mes Congés" : pour tous les employés (gestionnaires, comptables, commerciaux, etc.) sauf admins, uniquement pour les plans ENTERPRISE
            if (item.id === 'my-leaves') {
              const canAccessLeaves = roles.some(role => 
                [UserRole.EMPLOYEE, UserRole.STOCK_MANAGER, UserRole.SALES, UserRole.ACCOUNTANT, UserRole.HR_MANAGER].includes(role)
              );
              // Vérifier que le plan est ENTERPRISE/ENTERPRISE CLOUD
              const planId = String((enrichedUser as any)?.planId || '').toUpperCase();
              const isEnterprisePlan = planId.includes('ENTERPRISE');
              
              return canAccessLeaves && !isAdminOrSuper && isEnterprisePlan;
            }
            
            return hasBaseAccess;
          }).map((item) => {

            const isActive = activeTab === item.id;
            const isHovered = hoveredMenuId === item.id;
            const defaultTextColor = asideTextColor;
            const inactiveTextColor = defaultTextColor;
            const activeBg = 'var(--primary-kernel)';
            const hoverBg = isHovered ? hexToRgba(buttonHex || primaryHex, 0.12) : 'transparent';
            const bgStyle = isSuperAdminMode ? undefined : (isActive ? { backgroundColor: activeBg } : { backgroundColor: hoverBg });
            const itemTextColor = isActive ? '#ffffff' : inactiveTextColor;

            // RH menu: bouton standard qui navigue directement vers HRDashboard

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                onMouseEnter={() => setHoveredMenuId(item.id)}
                onMouseLeave={() => setHoveredMenuId(null)}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'} rounded-xl transition-all duration-200 group`}
                style={!isSuperAdminMode ? { ...bgStyle, color: itemTextColor } : undefined}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon 
                  size={sidebarCollapsed ? 18 : 20} 
                  style={{ color: isActive ? '#ffffff' : hexToRgba(itemTextColor, 0.9) }} 
                  className="flex-shrink-0 transition-all duration-200" 
                />
                {!sidebarCollapsed && (
                  <span className="font-bold text-[10px] uppercase tracking-widest whitespace-nowrap transition-all duration-300" style={{ color: isActive ? '#ffffff' : itemTextColor }}>{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className={`${sidebarCollapsed ? 'p-2 m-2' : 'p-4 m-4'} bg-slate-800/50 rounded-2xl border border-slate-800/50 transition-all duration-300`}>
          {/* Indicateur d'absence dans le sidebar */}
          {!absenceLoading && absenceStatus && !absenceStatus.isPresent && (
            <div className={`${sidebarCollapsed ? 'mb-2' : 'mb-3'} ${sidebarCollapsed ? 'p-2' : 'p-3'} bg-red-500/20 border border-red-500/30 rounded-xl transition-all duration-300`}>
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
                <AlertTriangle 
                  size={sidebarCollapsed ? 16 : 14} 
                  className="text-red-400 animate-pulse" 
                  title={sidebarCollapsed ? "Vous êtes en absence approuvée" : undefined}
                />
                {!sidebarCollapsed && (
                  <span className="text-[9px] font-black text-red-400 uppercase tracking-wider">
                    EN ABSENCE
                  </span>
                )}
              </div>
            </div>
          )}

          <div className={`flex flex-col ${sidebarCollapsed ? 'gap-2 mb-2' : 'gap-3 mb-3'} ${sidebarCollapsed ? 'items-center' : ''} transition-all duration-300`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'flex-col gap-1' : 'gap-3'} transition-all duration-300`}>
              <div 
                className={`${sidebarCollapsed ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center font-black text-white shrink-0 uppercase shadow-lg transition-all duration-300 relative`} 
                style={{ backgroundColor: 'var(--primary-kernel)' }}
                title={sidebarCollapsed ? `${user.name} (${user.email})` : undefined}
              >
                {user.name.charAt(0)}
                {/* Badge d'absence sur l'avatar */}
                {!absenceLoading && absenceStatus && !absenceStatus.isPresent && (
                  <div className={`absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse`}></div>
                )}
              </div>
              {!sidebarCollapsed && (
                <div className="overflow-hidden transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black truncate">{user.name}</p>
                    {!absenceLoading && absenceStatus && !absenceStatus.isPresent && (
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="En absence"></div>
                    )}
                  </div>
                  <p className="text-[9px] font-bold uppercase truncate" style={{ color: 'var(--primary-kernel)' }}>{user.email}</p>
                  {!absenceLoading && absenceStatus && !absenceStatus.isPresent && absenceStatus.leave && (
                    <p className="text-[8px] font-bold uppercase text-red-400 truncate">
                      Jusqu'au {new Date(absenceStatus.leave.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => setShowLogoutConfirm(true)} 
            className={`w-full flex items-center justify-center ${sidebarCollapsed ? 'gap-0 py-2 px-1' : 'gap-2 py-2 px-2'} text-[10px] font-black text-slate-400 hover:text-white rounded-lg transition-all duration-300 border border-slate-700 uppercase tracking-widest`} 
            style={{ backgroundColor: 'transparent' }}
            title={sidebarCollapsed ? "Déconnexion" : undefined}
          >
            <LogOut size={sidebarCollapsed ? 14 : 12} className="transition-all duration-200" /> 
            {!sidebarCollapsed && (
              <span className="transition-all duration-300">DÉCONNEXION</span>
            )}
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
            {/* Indicateur d'absence dans le header */}
            {!absenceLoading && absenceStatus && !absenceStatus.isPresent && absenceStatus.leave && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200 text-[10px] font-black uppercase tracking-widest animate-pulse">
                <AlertTriangle size={14} className="animate-bounce" />
                <span>EN ABSENCE - Retour le {new Date(absenceStatus.leave.endDate).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
            
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck size={14} /> KERNEL ACTIVE
            </div>
          </div>
        </header>
        <div className="p-8">
          {isTenantLate && isAdminOrSuper && (
            <div className="mb-6 p-6 rounded-2xl border-2 bg-amber-50 border-amber-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black uppercase tracking-tight text-amber-700">Instance en retard de paiement</h4>
                <p className="text-xs text-amber-700 font-bold">Seul le tableau de bord est accessible. Régularisez votre abonnement pour rétablir l'accès à tous les modules.</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveTab('subscription')} className="px-4 py-2 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Régulariser</button>
              </div>
            </div>
          )}
          
          {/* Alerte d'absence pour l'employé connecté */}
          {!absenceLoading && absenceStatus && !absenceStatus.isPresent && absenceStatus.leave && (
            <div className="mb-6 p-6 rounded-2xl border-2 bg-red-50 border-red-200 animate-pulse shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg">
                    <AlertTriangle size={24} className="animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black uppercase tracking-tight text-red-700">VOUS ÊTES EN ABSENCE APPROUVÉE</h4>
                    <p className="text-sm text-red-600 font-bold">
                      {getLeaveTypeLabel(absenceStatus.leaveType || 'OTHER')} du {new Date(absenceStatus.leave.startDate).toLocaleDateString('fr-FR')} au {new Date(absenceStatus.leave.endDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-red-100 rounded-full">
                  <Clock size={16} className="text-red-600" />
                  <span className="text-xs font-black text-red-700 uppercase">
                    Retour dans {getDaysUntilReturn(absenceStatus.leave.endDate)} jour{getDaysUntilReturn(absenceStatus.leave.endDate) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              <div className="bg-red-100 p-4 rounded-xl border border-red-200 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <ShieldAlert size={20} className="text-red-600" />
                  <h5 className="text-sm font-black uppercase text-red-700">AVERTISSEMENT IMPORTANT</h5>
                </div>
                <div className="space-y-2 text-xs text-red-600 font-semibold">
                  <p>• ⚠️ Vous ne devriez pas effectuer de traitements dans l'application pendant votre absence</p>
                  <p>• ⚠️ Toute action effectuée sera tracée et pourra être auditée</p>
                  <p>• ⚠️ En cas d'urgence, contactez votre responsable hiérarchique</p>
                  <p>• ⚠️ L'accès reste ouvert uniquement pour la consultation en cas de besoin</p>
                </div>
              </div>
              
              {absenceStatus.leave.reason && (
                <div className="flex items-center gap-3 text-xs">
                  <Calendar size={14} className="text-red-500" />
                  <span className="text-red-600 font-medium">
                    <strong>Motif :</strong> {absenceStatus.leave.reason}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {children}
        </div>
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

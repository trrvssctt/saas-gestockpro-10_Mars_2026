
import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import Layout from './components/Layout';
import ToastProvider from './components/ToastProvider';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import InventoryCampaign from './components/InventoryCampaign';
import StockMovements from './components/StockMovements';
import CategoryManager from './components/CategoryManager';
import SubcategoryManager from './components/SubcategoryManager';
import Customers from './components/Customers';
import Suppliers from './components/Suppliers';
import Deliveries from './components/Deliveries';
import Sales from './components/Sales';
import Recovery from './components/Recovery';
import Payments from './components/Payments';
import Services from './components/Services';
import SecurityPanel from './components/SecurityPanel';
import AuditLogs from './components/AuditLogs';
import Settings from './components/Settings';
import Subscription from './components/Subscription';
import ChatInterface from './components/ChatInterface';
import SuperAdmin from './components/SuperAdmin';
import SuperAdminLogin from './components/SuperAdminLogin';
import Governance from './components/Governance';
import HRDashboard from './components/rh/HRDashboard';
import EmployeeList from './components/rh/EmployeeList';
import EmployeeProfile from './components/rh/EmployeeProfile';
import ContractList from './components/rh/ContractList';
import PayrollManagement from './components/rh/PayrollManagement';
import LeaveManagement from './components/rh/LeaveManagement';
import DocumentCenter from './components/rh/DocumentCenter';
import OrgChart from './components/rh/OrgChart';
import DepartmentManager from './components/rh/DepartmentManager';
import ModulePlaceholder from './components/rh/ModulePlaceholder';
import Attendance from './components/rh/Attendance';
import TimeDeductionSettings from './components/rh/TimeDeductionSettings';
import EmployeePointage from './components/rh/EmployeePointage';
import OvertimeRequests from './components/rh/OvertimeRequests';
import Login from './components/Login';
import RegistrationSuccess from './components/RegistrationSuccess';
import Checkout from './components/Checkout';
import OnboardingWizard from './components/OnboardingWizard';
import DashboardTour, { shouldShowTour } from './components/DashboardTour';
import AIAnalysis from './components/AIAnalysis';
import { StripeSuccessPage, StripeCancelPage, StripeErrorPage } from './components/StripeRedirect';
import Support from './components/Support';
import Info from './components/Info';
import { MOCK_USERS, MOCK_TENANTS, SUBSCRIPTION_PLANS } from './constants';
import { UserRole, AppSettings, User, Tenant, SubscriptionPlan } from './types';
import { authBridge } from './services/authBridge';
import { apiClient } from './services/api';
import { AlertCircle, ShieldAlert, RefreshCw, Terminal, History, Lock, Zap, CreditCard, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

/**
 * Module 10: Error Boundary for SaaS Resilience
 */
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[KERNEL PANIC] Module 10 Failure:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-center">
          <div className="max-w-xl w-full bg-white rounded-[4rem] p-16 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-lg border border-rose-100 animate-pulse">
              <ShieldAlert size={48} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-4">Kernel Panic</h1>
            <p className="text-slate-500 font-medium uppercase text-[10px] tracking-[0.3em] leading-relaxed mb-10">
              Une erreur critique a été interceptée. Votre session est isolée pour protéger l'intégrité du tenant.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl flex items-center justify-center gap-3"
            >
              <RefreshCw size={18} /> RÉINITIALISER L'INSTANCE
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  // Permet de sortir des pages de redirection Stripe sans rechargement complet
  const [stripeHandled, setStripeHandled] = useState(false);
  const [navigationMetadata, setNavigationMetadata] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // États de flux post-inscription
  const [showRegSuccess, setShowRegSuccess] = useState<{ mustPay: boolean, planId: string, user: User, planObj?: SubscriptionPlan } | null>(null);
  const [showCheckout, setShowCheckout] = useState<{ planId: string, user: User, planObj?: SubscriptionPlan } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<{ companyName: string, user: User, mustPay: boolean, planId: string, planObj?: SubscriptionPlan } | null>(null);
  const [activationPending, setActivationPending] = useState(false);
  const [initialLoginOptions, setInitialLoginOptions] = useState<{ mode?: string; planId?: string; regStep?: number; period?: string; wavePending?: boolean } | null>(null);
  // Upgrade de plan depuis Subscription.tsx → Checkout.tsx
  const [upgradeContext, setUpgradeContext] = useState<{ planObj: SubscriptionPlan } | null>(null);

  // Tour de démarrage — affiché à la première connexion
  const [showTour, setShowTour] = useState(false);
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [customersRefreshKey, setCustomersRefreshKey] = useState(0);

  // Rappel pointage pour les employés
  const [pointageReminder, setPointageReminder] = useState(false);

  const [appSettings, setAppSettings] = useState<AppSettings>({
    language: 'Français',
    currency: 'F CFA',
    platformLogo: '',
    invoiceLogo: '',
    companyName: 'GeStockPro Cloud'
  });

  // Résout le planId depuis toutes les sources disponibles
  const resolvePlanId = (u: any): string => {
    if (u.planId) return u.planId;
    // Souvent le backend inclut le plan dans user.tenant.plan ou user.tenant.subscription_plan
    const tenantPlan = u?.tenant?.plan || u?.tenant?.subscription_plan || u?.tenant?.planId;
    if (tenantPlan) return String(tenantPlan).toUpperCase();
    // Fallback sur les données mock
    const mock = MOCK_TENANTS.find((t: any) => t.id === u.tenantId);
    if (mock?.plan) return mock.plan;
    return 'BASIC';
  };

  useEffect(() => {
    const primaryColor = (appSettings as any).primaryColor || '#4f46e5';
    document.documentElement.style.setProperty('--primary-kernel', primaryColor);
  }, [appSettings]);

  const syncTenantSettings = async (user: User) => {
    try {
      const settings = await apiClient.get('/settings');
      if (settings) {
        setAppSettings({
          language: settings.language === 'en' ? 'English' : 'Français',
          currency: settings.currency || 'F CFA',
          platformLogo: settings.logoUrl || '',
          invoiceLogo: settings.logoUrl || '',
          companyName: settings.name || 'Ma Société',
          ...settings
        });
        // Apply visual preferences globally so entire app reflects tenant settings
        try {
          if (settings.primaryColor) {
            document.documentElement.style.setProperty('--primary-kernel', settings.primaryColor);
          }
          if (settings.buttonColor || settings.button_color) {
            document.documentElement.style.setProperty('--button-kernel', settings.buttonColor || settings.button_color);
          }
          if (settings.fontFamily) {
            document.documentElement.style.setProperty('--kernel-font-family', settings.fontFamily);
            document.documentElement.style.fontFamily = settings.fontFamily;
          }
          if (settings.baseFontSize) {
            document.documentElement.style.setProperty('--base-font-size', `${settings.baseFontSize}px`);
            document.documentElement.style.fontSize = `${settings.baseFontSize}px`;
          }
          const themeVal = settings.theme ?? settings.is_dark ?? 'light';
          const isDark = themeVal === 'dark' || themeVal === true;
          document.documentElement.classList.toggle('dark', Boolean(isDark));
          document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        } catch (e) {
          // ignore apply errors
        }
      }
    } catch (e) {
      console.warn("Settings Sync failed");
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const session = authBridge.getSession();
      if (session) {
        const freshUser = await authBridge.fetchMe(session.token);
        if (freshUser && freshUser.isActive) {
          // Ensure planId is present: resolve from all sources
          (freshUser as any).planId = resolvePlanId(freshUser);
          await syncTenantSettings(freshUser);

          // Vérifier si l'onboarding est terminé (restauration de progression si non)
          try {
            const settings = await apiClient.get('/settings');
            if (settings && settings.onboardingCompleted === false) {
              setShowLanding(false);
              setShowOnboarding({
                companyName: settings.name || (freshUser as any).companyName || 'Ma Société',
                user: freshUser,
                mustPay: false,
                planId: (freshUser as any).planId || 'BASIC',
                planObj: undefined
              });
              setIsInitializing(false);
              return;
            }
          } catch {}

          setCurrentUser(freshUser);
          setIsLoggedIn(true);
          if (freshUser.role === UserRole.SUPER_ADMIN) setActiveTab('superadmin');
        } else {
          authBridge.clearSession();
        }
      }
      setIsInitializing(false);
    };
    initAuth();
  }, []);

  // Vérifie si l'employé connecté n'a pas encore pointé aujourd'hui (si déductions activées)
  // Seulement pour les plans ENTERPRISE
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;
    const role = currentUser.role || (currentUser as any).roles?.[0];
    if (role !== UserRole.EMPLOYEE) return;
    const planId = String((currentUser as any)?.planId || '').toUpperCase();
    if (!planId.includes('ENTERPRISE')) return;

    const check = async () => {
      try {
        const res = await apiClient.get('/hr/attendance/my/today');
        if (res?.settings?.deductionEnabled && !res?.attendance?.clockIn) {
          setPointageReminder(true);
        } else {
          setPointageReminder(false);
        }
      } catch { /* silencieux si pas encore d'employé lié */ }
    };
    check();
  }, [isLoggedIn, currentUser]);

  const handleLoginSuccess = async (user: User) => {
    const registerMeta = user as any;
    // Only treat as a freshly-registered flow when backend/registration set explicit flags
    if ((registerMeta.mustPay === true || registerMeta.selectedPlanDetails) && !registerMeta.onboardingCompleted) {
      setShowRegSuccess({
        mustPay: registerMeta.mustPay === true,
        planId: registerMeta.planId,
        user: user,
        planObj: registerMeta.selectedPlanDetails
      });
      return;
    }

    // Ensure planId is set from all available sources
    (user as any).planId = resolvePlanId(user);
    setCurrentUser(user);
    setIsLoggedIn(true);
    await syncTenantSettings(user);
    setActiveTab(user.role === UserRole.SUPER_ADMIN ? 'superadmin' : 'dashboard');
    if (user.role !== UserRole.SUPER_ADMIN && shouldShowTour(user.id)) {
      setTimeout(() => setShowTour(true), 1200);
    }
  };

  const resetToLogin = () => {
    authBridge.clearSession();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setShowRegSuccess(null);
    setShowCheckout(null);
    setShowOnboarding(null);
    setActivationPending(false);
    setNavigationMetadata(null);
    setShowLanding(true);
    setInitialLoginOptions(null);
  };

  const handleLogout = () => {
    resetToLogin();
    setActiveTab('dashboard');
  };

  const handleContextualNavigate = (tab: string, meta?: any) => {
    if (currentUser && authBridge.canAccess(currentUser, tab)) {
      setNavigationMetadata(meta);
      setActiveTab(tab);
    }
  };

  const currentTenant = MOCK_TENANTS.find(t => t.id === currentUser?.tenantId);
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === (currentUser?.planId || currentTenant?.plan));

  // Restriction d'accès quand l'abonnement est expiré.
  // IMPORTANT : 'PENDING' = nouveau compte (pas encore payé la 1ère fois) → jamais bloqué.
  // On ne bloque que sur des états EXPLICITEMENT mauvais, pas des états ambigus.
  const tenantPaymentStatus = (currentUser as any)?.tenant?.paymentStatus;
  const subStatus           = (currentUser as any)?.subscription?.status;
  const subNextBilling      = (currentUser as any)?.subscription?.nextBillingDate;

  const isTenantExpired = !!(currentUser && (
    // Cas 1 : le SuperAdmin a explicitement rejeté le paiement
    tenantPaymentStatus === 'REJECTED' ||
    // Cas 2 : la subscription est marquée explicitement expirée
    subStatus === 'EXPIRED' ||
    // Cas 3 : la subscription était ACTIVE mais la date de renouvellement est dépassée
    (subStatus === 'ACTIVE' && subNextBilling && new Date(subNextBilling) < new Date())
  ));

  const isAdminUser = !!(currentUser && (
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.SUPER_ADMIN ||
    (Array.isArray((currentUser as any).roles) &&
      ((currentUser as any).roles.includes('ADMIN') || (currentUser as any).roles.includes('SUPER_ADMIN')))
  ));
  const EXPIRED_ALLOWED_TABS = ['dashboard', 'subscription'];

  if (isInitializing) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-white text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Initialisation du Kernel...</p>
      </div>
    );
  }

  if (showRegSuccess) {
    const plan = showRegSuccess.planObj || SUBSCRIPTION_PLANS.find(p => p.id === showRegSuccess.planId);
    return <RegistrationSuccess mustPay={showRegSuccess.mustPay} onContinue={() => {
      setShowOnboarding({
        companyName: (showRegSuccess?.user as any)?.tenant?.name || showRegSuccess?.user.name.replace('Admin ', '') || 'Ma Société',
        user: showRegSuccess!.user,
        mustPay: showRegSuccess!.mustPay,
        planId: showRegSuccess!.planId,
        planObj: showRegSuccess!.planObj
      });
      setShowRegSuccess(null);
    }} planName={plan?.name || 'Plan Initial'} />;
  }

  if (showOnboarding) return <OnboardingWizard
    companyName={showOnboarding.companyName}
    user={showOnboarding.user}
    planId={showOnboarding.planId}
    onExit={() => {
      setShowOnboarding(null);
      setShowLanding(true);
    }}
    onComplete={async (data) => {
      if (showOnboarding?.mustPay) {
        setShowCheckout({
          planId: showOnboarding.planId,
          user: showOnboarding.user,
          planObj: showOnboarding.planObj
        });
        setShowOnboarding(null);
      } else if ((showOnboarding?.user as any)?.tenant?.isActive === false) {
        // Compte Wave en attente de validation SuperAdmin → retour au Login avec notice
        setShowOnboarding(null);
        setInitialLoginOptions({ mode: 'LOGIN', wavePending: true });
      } else {
        setCurrentUser(showOnboarding.user);
        setIsLoggedIn(true);
        setActiveTab(data?.goToHR ? 'rh' : 'dashboard');
        setShowOnboarding(null);
        if (shouldShowTour(showOnboarding.user.id)) {
          setTimeout(() => setShowTour(true), 1500);
        }
      }
    }}
  />;

  if (showCheckout) return <Checkout
    planId={showCheckout.planId}
    user={showCheckout.user}
    planObj={showCheckout.planObj}
    onSuccess={() => {
      setActivationPending(true);
      setShowCheckout(null);
    }}
    onCancel={() => resetToLogin()}
  />;

  if (upgradeContext && currentUser) return <Checkout
    planId={upgradeContext.planObj.id}
    user={currentUser}
    planObj={upgradeContext.planObj}
    isUpgrade={true}
    onSuccess={() => {
      setUpgradeContext(null);
      setActiveTab('subscription');
    }}
    onCancel={() => setUpgradeContext(null)}
  />;

  if (activationPending) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full animate-in zoom-in-95 duration-700 space-y-10">
          <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl animate-bounce">
            <CheckCircle2 size={48} />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Paiement Reçu !</h1>
            <p className="text-slate-400 font-medium leading-relaxed uppercase text-[10px] tracking-[0.3em] px-8">
              Votre dossier a été transmis au Kernel pour activation. Vous pourrez vous connecter dès validation définitive de votre flux.
            </p>
          </div>
          <button
            onClick={() => resetToLogin()}
            className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 active:scale-95 group"
          >
            RETOURNER À LA CONNEXION <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Stripe redirect pages — detected from URL pathname
  const stripePathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const leaveStripePage = (tab = 'subscription') => {
    window.history.replaceState({}, '', '/');
    setStripeHandled(true);
    if (isLoggedIn) setActiveTab(tab);
  };
  if (!stripeHandled && stripePathname === '/stripe/success') {
    return <StripeSuccessPage
      onContinue={() => leaveStripePage('subscription')}
      onAutoLogin={({ token, user: stripeUser }) => {
        // Sauvegarder la session
        authBridge.saveSession(stripeUser, token, undefined);
        // Effacer l'URL Stripe
        window.history.replaceState({}, '', '/');
        setStripeHandled(true);
        // Résoudre le planId
        const planId = stripeUser?.subscription?.planId || stripeUser?.planId || 'BASIC';
        (stripeUser as any).planId = planId;
        // Aller directement à l'OnboardingWizard
        setShowOnboarding({
          companyName: stripeUser?.tenant?.name || stripeUser?.name || 'Ma Société',
          user: stripeUser,
          mustPay: false,
          planId,
          planObj: undefined
        });
      }}
    />;
  }
  if (!stripeHandled && stripePathname === '/stripe/cancel') {
    return <StripeCancelPage onBack={() => leaveStripePage('subscription')} />;
  }
  if (!stripeHandled && stripePathname === '/stripe/error') {
    return <StripeErrorPage onBack={() => leaveStripePage('subscription')} />;
  }

  // Direct access to Super-Admin login via /superadmin
  if (!isLoggedIn) {
    if (typeof window !== 'undefined' && window.location.pathname === '/neka_super_admin_pagie') {
      return <SuperAdminLogin onLoginSuccess={handleLoginSuccess} />;
    }
    if (showLanding) {
      return <LandingPage onLogin={(opts) => {
        setShowLanding(false);
        if (opts && opts.openRegister) {
          setInitialLoginOptions({ mode: 'REGISTER', planId: opts.planId, regStep: opts.regStep || 1, period: opts.period });
        } else {
          setInitialLoginOptions(null);
        }
      }} />;
    }
    return <Login onLoginSuccess={handleLoginSuccess} onBackToLanding={() => { setShowLanding(true); setInitialLoginOptions(null); }} initialMode={initialLoginOptions?.mode} initialPlanId={initialLoginOptions?.planId} initialRegStep={initialLoginOptions?.regStep} initialPeriod={initialLoginOptions?.period} initialWavePending={initialLoginOptions?.wavePending} />;
  }

  const renderContent = () => {
    if (!currentUser) return null;

    // Quand l'abonnement est expiré, bloquer tout sauf dashboard et subscription
    if (isTenantExpired && isAdminUser && !EXPIRED_ALLOWED_TABS.includes(activeTab) && activeTab !== 'superadmin') {
      return <Dashboard user={currentUser} currency={appSettings.currency} onNavigate={handleContextualNavigate} />;
    }

    // Normalize module check for RH subpages (rh.employees -> rh)
    const moduleCheck = activeTab && String(activeTab).startsWith('rh') ? 'rh' : activeTab;

    if (!authBridge.canAccess(currentUser, moduleCheck)) {
      return (
        <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-8 border border-rose-100 shadow-inner">
            <Lock size={48} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">Isolation Active</h2>
          <p className="text-slate-500 font-medium uppercase text-[10px] tracking-[0.3em] max-w-sm">
            Vos privilèges ne permettent pas d'accéder au module <span className="text-rose-500 font-black">{activeTab}</span>.
          </p>
          <button onClick={() => setActiveTab('dashboard')} className="mt-10 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Retour</button>
        </div>
      );
    }

    // RH: Gestion spécifique des modules RH
    if (activeTab && String(activeTab).startsWith('rh')) {
      switch (activeTab) {
        case 'rh': return <HRDashboard onNavigate={handleContextualNavigate} />;
        case 'rh.employees': return <EmployeeList onNavigate={handleContextualNavigate} />;
        case 'rh.departments': return <DepartmentManager plan={currentPlan} onNavigate={handleContextualNavigate} />;
        case 'rh.employee.profile': return <EmployeeProfile employeeId={navigationMetadata?.employeeId || ''} onNavigate={handleContextualNavigate} />;
        case 'rh.contracts': return <ContractList onNavigate={handleContextualNavigate} />;
        case 'rh.org': return <OrgChart onNavigate={handleContextualNavigate} />;
        case 'rh.docs': return <DocumentCenter onNavigate={handleContextualNavigate} />;
        case 'rh.leaves': return <LeaveManagement onNavigate={handleContextualNavigate} />;
        case 'rh.recruitment': 
          return <ModulePlaceholder 
            onNavigate={handleContextualNavigate} 
            moduleName="Recrutement" 
            description="Gestion des offres d'emploi, processus de recrutement, suivi des candidatures et onboarding des nouveaux collaborateurs." 
          />;
        case 'rh.training':
          return <ModulePlaceholder 
            onNavigate={handleContextualNavigate} 
            moduleName="Formation" 
            description="Planification des sessions de formation, suivi des compétences, catalogues de formation et évaluations." 
          />;
        case 'rh.performance': 
          return <ModulePlaceholder 
            onNavigate={handleContextualNavigate} 
            moduleName="Performance" 
            description="Campagnes d'évaluation, suivi des objectifs, entretiens annuels et plans de développement." 
          />;
        case 'rh.payroll': return <PayrollManagement onNavigate={handleContextualNavigate} initialTab={navigationMetadata?.initialTab || 'generation'} />;
        case 'rh.payroll.settings': return <PayrollManagement onNavigate={handleContextualNavigate} initialTab="settings" />;
        case 'rh.payroll.generation': return <PayrollManagement onNavigate={handleContextualNavigate} initialTab="generation" />;
        case 'rh.payroll.slips': return <PayrollManagement onNavigate={handleContextualNavigate} initialTab="slips" />;
        case 'rh.payroll.bonuses': return <PayrollManagement onNavigate={handleContextualNavigate} initialTab="advances" />;
        case 'rh.payroll.advances': return <PayrollManagement onNavigate={handleContextualNavigate} initialTab="advances" />;
        case 'rh.payroll.declarations': return <PayrollManagement onNavigate={handleContextualNavigate} initialTab="declarations" />;
        case 'rh.attendance': return <Attendance onNavigate={handleContextualNavigate} />;
        case 'rh.overtime': return <OvertimeRequests onNavigate={handleContextualNavigate} />;
        case 'rh.time-settings': return <TimeDeductionSettings onNavigate={handleContextualNavigate} />;
        default: return <HRDashboard onNavigate={handleContextualNavigate} />;
      }
    }

    switch (activeTab) {
      case 'superadmin': return <SuperAdmin />;
      case 'dashboard': return <Dashboard user={currentUser} currency={appSettings.currency} onNavigate={handleContextualNavigate} />;
      case 'ai_analysis': return <AIAnalysis user={currentUser} />;
      case 'categories': return <CategoryManager plan={currentPlan} />;
      case 'subcategories': return <SubcategoryManager plan={currentPlan} />;
      case 'inventory': return <Inventory currency={appSettings.currency} userRole={currentUser.role} plan={currentPlan} refreshKey={inventoryRefreshKey} />;
      case 'audit_inventory': return <InventoryCampaign settings={appSettings} />;
      case 'inventorycampaigns': return <InventoryCampaign settings={appSettings} />;
      case 'movements': return <StockMovements currency={appSettings.currency} tenantSettings={appSettings} />;
      case 'customers': return <Customers user={currentUser} currency={appSettings.currency} plan={currentPlan} refreshKey={customersRefreshKey} />;
      case 'suppliers': return <Suppliers user={currentUser} currency={appSettings.currency} />;
      case 'deliveries': return <Deliveries user={currentUser} currency={appSettings.currency} />;
      case 'sales': return <Sales currency={appSettings.currency} user={currentUser} tenantSettings={appSettings} plan={currentPlan} />;
      case 'services': return <Services currency={appSettings.currency} />;
      case 'recovery': return <Recovery currency={appSettings.currency} />;
      case 'payments': return <Payments currency={appSettings.currency} tenantSettings={appSettings} />;
      case 'my-leaves': return <LeaveManagement onNavigate={handleContextualNavigate} user={currentUser} />;
      case 'employee-pointage': {
        const roles = Array.isArray((currentUser as any).roles) ? (currentUser as any).roles : [currentUser.role];
        const canUsePointage = roles.some((r: any) =>
          [UserRole.EMPLOYEE, UserRole.STOCK_MANAGER, UserRole.SALES, UserRole.ACCOUNTANT, UserRole.HR_MANAGER].includes(r)
        );
        const planId = String((currentUser as any)?.planId || '').toUpperCase();
        if (!canUsePointage || !planId.includes('ENTERPRISE')) {
          return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center">
                <Lock size={36} className="text-indigo-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Fonctionnalité Enterprise</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-xs">
                  Le pointage employé est disponible uniquement dans le plan Enterprise.
                  Contactez votre administrateur pour mettre à niveau votre abonnement.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all"
              >
                Retour au tableau de bord
              </button>
            </div>
          );
        }
        return <EmployeePointage onNavigate={handleContextualNavigate} />;
      }
      case 'governance': return <Governance tenantId={currentUser.tenantId} plan={currentPlan} />;
      case 'subscription': return <Subscription user={currentUser} currency={appSettings.currency} onUpgrade={(plan) => setUpgradeContext({ planObj: plan })} onLogout={handleLogout} />;
      case 'info': return <Info user={currentUser} />;
      case 'support': return <Support user={currentUser} />;
      case 'security': return <SecurityPanel />;
      case 'audit': return <AuditLogs tenantSettings={appSettings} />;
      case 'settings': return <Settings settings={appSettings} onSave={setAppSettings} />;
      default: return <Dashboard user={currentUser} currency={appSettings.currency} onNavigate={handleContextualNavigate} />;
    }
  };

  return (
    <ErrorBoundary children={
      <ToastProvider>
        <div className={`min-h-screen ${activeTab === 'superadmin' ? 'bg-slate-950' : 'bg-slate-50'}`}>
          {/* Tour de démarrage interactif */}
          {showTour && isLoggedIn && currentUser && (
            <DashboardTour
              user={currentUser}
              planId={(currentUser as any)?.planId || 'BASIC'}
              currentTab={activeTab}
              onNavigate={(tab: string) => { setNavigationMetadata(null); setActiveTab(tab); }}
              onComplete={() => setShowTour(false)}
              onSkip={() => setShowTour(false)}
              onDemoCreated={(type: 'inventory' | 'customers') => {
                if (type === 'inventory') setInventoryRefreshKey((k: number) => k + 1);
                if (type === 'customers') setCustomersRefreshKey((k: number) => k + 1);
              }}
            />
          )}
          {/* Bannière rappel pointage — employé non pointé */}
          {pointageReminder && activeTab !== 'employee-pointage' && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-4 px-6 py-4 bg-slate-900 text-white rounded-[2rem] shadow-2xl border border-indigo-500/30 max-w-sm w-full mx-4">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white">Pensez à pointer !</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Vous n'avez pas encore pointé aujourd'hui</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setActiveTab('employee-pointage'); setPointageReminder(false); }}
                  className="px-3 py-2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all"
                >
                  Pointer
                </button>
                <button
                  onClick={() => setPointageReminder(false)}
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
          <Layout
            user={currentUser!}
            activeTab={activeTab}
            setActiveTab={(tab) => {
              if (isTenantExpired && isAdminUser && !EXPIRED_ALLOWED_TABS.includes(tab) && tab !== 'superadmin') return;
              setNavigationMetadata(null);
              setActiveTab(tab);
            }}
            onLogout={handleLogout}
            isSuperAdminMode={activeTab === 'superadmin'}
            logoUrl={appSettings.platformLogo}
            companyName={appSettings.companyName}
          >
            {renderContent()}
          </Layout>
          {activeTab !== 'superadmin' && activeTab !== 'ai_analysis' && currentPlan?.hasAiChatbot && <ChatInterface user={currentUser!} />}
        </div>
      </ToastProvider>
    } />
  );
};

export default App;

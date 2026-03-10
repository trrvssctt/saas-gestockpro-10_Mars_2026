import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Globe, Users, CreditCard, Activity, AlertTriangle, 
  Search, RefreshCw, Power, PowerOff, TrendingUp, BarChart3, 
  Mail, ExternalLink, ArrowUpRight, Ban, CheckCircle2, Loader2,
  Lock, Zap, DollarSign, Wallet, Shield, Plus, X, Eye, 
  Settings, Layers, Target, Fingerprint, Key, Save, UserPlus,
  ShieldAlert, Clock, History, ChevronRight, Terminal, User as UserIcon,
  Filter, Check, ShieldQuestion, Cpu, Send, LayoutDashboard,
  CreditCard as PaymentIcon, Trash2, ArrowLeft, BadgeCheck
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { apiClient } from '../services/api';
import { useToast } from './ToastProvider';

const SuperAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'VALIDATIONS' | 'TENANTS' | 'SUBSCRIPTIONS' | 'PLANS' | 'UPGRADES' | 'BILLING_ALERTS' | 'LOGS'>('DASHBOARD');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logTenantFilter, setLogTenantFilter] = useState<string | null>(null);
  const [logUserFilter, setLogUserFilter] = useState<string | null>(null);
  const [usersForTenant, setUsersForTenant] = useState<any[]>([]);
  const [billingOverdue, setBillingOverdue] = useState<any[]>([]);
  const [billingUpcoming, setBillingUpcoming] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showBillingDetail, setShowBillingDetail] = useState<any>(null);
  const [showPlanModal, setShowPlanModal] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    id: '',
    name: '',
    priceMonthly: 0,
    priceYearly: 0,
    maxUsers: 1,
    hasAiChatbot: false,
    hasStockForecast: false,
    isActive: true
  });
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    msg: string;
    icon: any;
    type: 'danger' | 'success' | 'warning';
    action: () => Promise<void>;
  } | null>(null);
  
  // Filtres pour les paiements
  const [paymentFilterMethod, setPaymentFilterMethod] = useState('ALL');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentPageSize, setPaymentPageSize] = useState(25);

  const showToast = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, tenantsRes, plansRes] = await Promise.all([
        apiClient.get('/admin/dashboard'),
        apiClient.get('/admin/tenants'),
        apiClient.get('/admin/plans')
      ]);

      setData(statsRes);
      setTenants(tenantsRes || []);
      setPlans(plansRes || []);
      // Admin dashboard already returns pending validations / upgrade requests
      setUpgradeRequests(statsRes?.pendingValidations || []);

      // Récupérer les alertes de facturation
      fetchBillingAlerts();
    } catch (err: any) {
      showToast(`Erreur lors du chargement: ${err?.message || err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingAlerts = async () => {
    setBillingLoading(true);
    try {
      const [overdue, upcoming] = await Promise.all([
        apiClient.get('/admin/billing/overdue'),
        apiClient.get('/admin/billing/upcoming')
      ]);
      setBillingOverdue(overdue || []);
      setBillingUpcoming(upcoming || []);
    } catch (err) {
      console.error('Erreur fetch billing alerts', err);
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Récupérer les validations récentes pour le dashboard
  const recentPendingValidations = Array.isArray(data?.pendingValidations) 
    ? data.pendingValidations.slice(0, 5) 
    : [];

  const handleToggleLock = (tenantId: string, tenantName: string, currentStatus: boolean) => {
    setConfirmAction({
      title: currentStatus ? 'VERROUILLER L\'INSTANCE' : 'DÉVERROUILLER L\'INSTANCE',
      msg: currentStatus 
        ? `Confirmez-vous le verrouillage immédiat de "${tenantName}" ? L'accès sera coupé.` 
        : `Confirmez-vous la réactivation de "${tenantName}" ?`,
      icon: currentStatus ? Ban : Power,
      type: currentStatus ? 'danger' : 'success',
      action: async () => {
        setActionLoading(true);
        try {
          await apiClient.post(`/admin/tenants/${tenantId}/toggle-lock`, {});
          showToast(`Instance ${currentStatus ? 'verrouillée' : 'déverrouillée'} avec succès`, 'success');
          fetchData();
          setConfirmAction(null);
        } catch (err: any) {
          showToast(`Erreur: ${err?.message || err}`, 'error');
          setConfirmAction(null);
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleValidateSubscription = (validation: any) => {
    setConfirmAction({
      title: 'VALIDER LE PAIEMENT',
      msg: `Valider le paiement pour ${validation.tenantName || validation.tenant?.name || 'cette instance'} ?`,
      icon: CheckCircle2,
      type: 'success',
      action: async () => {
        setActionLoading(true);
        try {
          const tenantId = validation.tenantId || validation.id || validation.tenant?.id;
          let amount = validation.amount || validation.planPrice || 0;

          if (!amount && validation.planId) {
            const plan = plans.find((p: any) => p.id === validation?.planId || String(p.id) === String(validation?.planId));
            if (plan) amount = plan.priceMonthly || plan.price || 0;
          }

          if (!amount) {
            const tenantRecord = tenants.find(t => t.id === tenantId);
            if (tenantRecord) amount = tenantRecord.subscription?.planDetails?.priceMonthly || tenantRecord.subscription?.planPrice || 0;
          }

          const method = 'WAVE';
          const reference = validation?.reference || validation?.transactionId || `VALID-${Date.now()}`;

          await apiClient.post(`/admin/tenants/${tenantId}/subscription/validate`, { amount, method, reference, transactionId: reference });

          if (amount && data) {
            setData((prev: any) => ({
              ...prev,
              stats: {
                ...(prev?.stats || {}),
                mrr: Number((prev?.stats?.mrr || 0)) + Number(amount)
              }
            }));
          }

          fetchData();
          setConfirmAction(null);
        } catch (err: any) {
          showToast(`Échec de validation : ${err.message || 'Erreur interne'}`, 'error');
          setConfirmAction(null);
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleApproveUpgrade = (request: any) => {
    setConfirmAction({
      title: 'Approuver la demande d\'upgrade',
      msg: `Approuver la demande d'upgrade de "${request.tenantName || request.tenant?.name}" vers "${request.requestedPlan}" ?`,
      icon: Check,
      type: 'success',
      action: async () => {
        setActionLoading(true);
        try {
          // Approve by validating the tenant subscription
          const tenantId = request.tenantId || request.tenant?.id || request.id;
          await apiClient.post(`/admin/tenants/${tenantId}/subscription/validate`, {});
          fetchData();
          setConfirmAction(null);
        } catch (err: any) {
          showToast(`Erreur lors de l'approbation : ${err?.message || err}`, 'error');
          setConfirmAction(null);
        } finally { setActionLoading(false); }
      }
    });
  };

  const handleRejectUpgrade = (request: any) => {
    setConfirmAction({
      title: 'Rejeter la demande d\'upgrade',
      msg: `Rejeter la demande d'upgrade de "${request.tenantName || request.tenant?.name}" ?`,
      icon: Ban,
      type: 'danger',
      action: async () => {
        setActionLoading(true);
        try {
          // Reject by calling the admin reject endpoint for tenant subscription
          const tenantId = request.tenantId || request.tenant?.id || request.id;
          await apiClient.post(`/admin/tenants/${tenantId}/subscription/reject`, {});
          fetchData();
          setConfirmAction(null);
        } catch (err: any) {
          showToast(`Erreur lors du rejet : ${err?.message || err}`, 'error');
          setConfirmAction(null);
        } finally { setActionLoading(false); }
      }
    });
  };

  const fetchUsersForTenant = async (tenantId: string | null) => {
    if (!tenantId) { setUsersForTenant([]); return; }
    try {
      const res = await apiClient.get(`/admin/tenants/${tenantId}/users`);
      setUsersForTenant(res || []);
    } catch (err) {
      console.error('Erreur fetch users for tenant', err);
      setUsersForTenant([]);
    }
  };

  const fetchLogs = async (tenantId?: string | null, userId?: string | null) => {
    setLogsLoading(true);
    try {
      const q = [] as string[];
      if (tenantId) q.push(`tenantId=${encodeURIComponent(tenantId)}`);
      if (userId) q.push(`userId=${encodeURIComponent(userId)}`);
      const url = `/admin/logs${q.length ? '?' + q.join('&') : ''}`;
      const res = await apiClient.get(url);
      setLogs(res || []);
    } catch (err) {
      console.error('Erreur fetch logs', err);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  // Reusable email sender for reminders/notifications with UX feedback
  const sendEmail = async ({ tenantId, tenantName, toEmail, subject, body }: { tenantId?: string; tenantName?: string; toEmail?: string; subject: string; body: string }) => {
    setActionLoading(true);
    try {
      const payload: any = { subject, body };
      if (tenantId) payload.tenantId = tenantId;
      if (tenantName) payload.tenantName = tenantName;
      if (toEmail) payload.toEmail = toEmail;

      const res = await apiClient.post('/admin/email/send', payload);
      // show server info when available
      if (res && (res.message || res.info)) {
        showToast(String(res.message || res.info), 'success');
      } else {
        showToast('Message placé en file ou envoyé.', 'success');
      }
      fetchData();
      return res;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erreur envoi email';
      showToast(msg, 'error');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (showPlanModal?.id) {
        await apiClient.put(`/admin/plans/${showPlanModal.id}`, planForm);
      } else {
        await apiClient.post('/admin/plans', planForm);
      }
      setShowPlanModal(null);
      fetchData();
    } catch (err) { showToast("Erreur lors de l'enregistrement de l'offre.", 'error'); }
    finally { setActionLoading(false); }
  };

  const handleDeletePlan = (id: string, name: string) => {
    setConfirmAction({
      title: "Supprimer l'Offre",
      msg: `Voulez-vous désactiver définitivement l'offre "${name}" du catalogue commercial ?`,
      icon: Trash2,
      type: 'danger',
      action: async () => {
        try {
          await apiClient.delete(`/admin/plans/${id}`);
          fetchData();
          setConfirmAction(null);
        } catch (err) { showToast("Erreur suppression.", 'error'); setConfirmAction(null); }
      }
    });
  };

  const openBillingDetail = async (tenantId: string) => {
    setActionLoading(true);
    try {
      const res = await apiClient.get(`/admin/tenants/${tenantId}/billing`);
      setShowBillingDetail(res);
    } catch (err) { showToast("Erreur de lecture du registre billing.", 'error'); }
    finally { setActionLoading(false); }
  };

  const StatCard = ({ title, value, color, icon: Icon, sub }: any) => (
    <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col justify-between group shadow-2xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-3xl font-black text-white">{value}</h3>
        </div>
        <div className={`p-4 rounded-2xl bg-opacity-10 ${color} text-white group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
      </div>
      {sub && <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">{sub}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 space-y-10 animate-in fade-in duration-700">
      {/* Header Stratégique */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-rose-500/20 text-rose-500 p-2 rounded-xl">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Kernel SaaS Master</h2>
          </div>
          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-fit mt-4 overflow-x-auto max-w-[80vw]">
            {[
              { id: 'DASHBOARD', label: 'Dashboard Financier', icon: BarChart3 },
              { id: 'VALIDATIONS', label: 'Validation Paiements', icon: CheckCircle2 },
              { id: 'TENANTS', label: 'Comptes & Users', icon: Globe },
              { id: 'SUBSCRIPTIONS', label: 'Facturation SaaS', icon: CreditCard },
              { id: 'PLANS', label: 'Catalogue Offres', icon: Layers },
              { id: 'UPGRADES', label: 'Traitement Upgrades', icon: ArrowUpRight },
              { id: 'BILLING_ALERTS', label: 'Alertes Facturation', icon: Wallet },
              { id: 'LOGS', label: 'Journal Logs', icon: Terminal }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'text-slate-400 hover:text-slate-300'}`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={fetchData} className="p-4 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all active:rotate-180">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="animate-spin text-rose-500" size={48} />
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Lecture du registre SaaS AlwaysData...</p>
        </div>
      ) : (
        <>
          {activeTab === 'DASHBOARD' && data && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="MRR Actuel" value={`${Number(data?.stats?.mrr || 0).toLocaleString('fr-FR')} F`} color="bg-indigo-500" icon={TrendingUp} sub="Revenu Mensuel Récurrent" />
                <StatCard title="Comptes Clients" value={Number(data?.stats?.totalTenants || 0)} color="bg-emerald-500" icon={Globe} sub={`${Number(data?.stats?.activeTenants || 0)} Actifs`} />
                <StatCard title="Alerte Paiement" value={Number(data?.stats?.latePayments || 0)} color="bg-rose-500" icon={AlertTriangle} sub="Défaut de paiement détecté" />
                <StatCard title="Dossiers Pending" value={Number(data?.stats?.pendingSub || 0)} color="bg-amber-500" icon={Clock} sub="Attente validation manuelle" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl overflow-hidden flex flex-col">
                   <div className="flex justify-between items-center mb-10">
                      <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><DollarSign size={16} className="text-emerald-500"/> Flux Financiers (Abonnements)</h4>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Derniers 6 mois</span>
                   </div>
                   <div className="h-80 w-full min-w-0">
                      {Array.isArray(data?.revenueStats) && data.revenueStats.length > 0 ? (
                        <ResponsiveContainer width="99%" height="100%">
                           <AreaChart data={data.revenueStats.map((r: any) => ({ 
                             month: new Date(r.month).toLocaleDateString('fr-FR', { month: 'short' }),
                             total: Number(r.total || 0)
                           }))}>
                              <defs>
                                 <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                 </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                              <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff'}} />
                              <Area type="monotone" dataKey="total" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={4} />
                           </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 text-[10px] font-black uppercase">Aucune donnée historique trouvée</div>
                      )}
                   </div>
                </div>

                <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-[3rem] p-10 overflow-hidden flex flex-col min-h-[450px]">
                   <h4 className="text-xs font-black uppercase tracking-widest mb-8 text-amber-500">Validations Requises</h4>
                   <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                      {Array.isArray(data?.pendingValidations) && data.pendingValidations.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                          <Zap size={48}/>
                          <p className="text-[10px] font-black uppercase mt-4">Tous les flux sont scellés</p>
                        </div>
                      ) : (
                        recentPendingValidations.map((v: any) => {
                          const tenantName = v?.tenantName || v?.tenant?.name || v?.tenant?.domain || 'Inconnu';
                          return (
                            <div key={v.tenantId || v.id} className="p-5 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center hover:border-amber-500 transition-colors">
                              <div>
                                <p className="text-xs font-black text-white uppercase">{tenantName}</p>
                                <p className="text-[9px] text-slate-500 uppercase mt-1">Plan cible: {v.planId}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleValidateSubscription(v)} className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 text-[12px] font-black uppercase">
                                  <Check size={14}/> VALIDER
                                </button>
                                <button onClick={() => openBillingDetail(v.tenantId || v.id)} className="p-3 bg-slate-800 text-white rounded-xl hover:bg-rose-500 transition-all"><Eye size={14}/></button>
                              </div>
                            </div>
                          );
                        })
                      )}
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'VALIDATIONS' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-6">
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl p-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-black text-slate-400 uppercase">Filtrer</label>
                    <select value={paymentFilterMethod} onChange={e => setPaymentFilterMethod(e.target.value)} className="bg-slate-950 text-white rounded-xl px-3 py-2 text-sm">
                      <option value="ALL">Tous</option>
                      <option value="WAVE">WAVE</option>
                      <option value="STRIPE">STRIPE</option>
                      <option value="CARD">CARD</option>
                      <option value="MOBILE">MOBILE</option>
                    </select>
                    <input placeholder="Référence..." value={paymentSearch} onChange={e => setPaymentSearch(e.target.value)} className="bg-slate-950 text-white rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-black text-slate-400 uppercase">Afficher</label>
                    <select value={paymentPageSize} onChange={e => setPaymentPageSize(parseInt(e.target.value))} className="bg-slate-950 text-white rounded-xl px-3 py-2 text-sm">
                      <option value={5}>5</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={-1}>Tous</option>
                    </select>
                  </div>
                </div>

                <table className="w-full text-left">
                  <thead className="bg-slate-950 border-b border-slate-800">
                    <tr className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="px-8 py-5">Date</th>
                      <th className="px-8 py-5">Référence</th>
                      <th className="px-8 py-5">Méthode</th>
                      <th className="px-8 py-5 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(() => {
                      const payments = Array.isArray(showBillingDetail?.payments) ? showBillingDetail.payments : [];
                      const filtered = payments
                        .filter((p: any) => {
                          const methodOk = paymentFilterMethod === 'ALL' || String((p.method || '').toUpperCase()) === String(paymentFilterMethod);
                          const searchOk = !paymentSearch || String((p.reference || p.id || '')).toLowerCase().includes(paymentSearch.toLowerCase());
                          return methodOk && searchOk;
                        })
                        .sort((a: any, b: any) => { 
                          const ta = new Date(b.paymentDate || b.createdAt).getTime(); 
                          const tb = new Date(a.paymentDate || a.createdAt).getTime(); 
                          return ta - tb; 
                        });

                      const limited = paymentPageSize === -1 ? filtered : filtered.slice(0, paymentPageSize || 25);

                      if (limited.length === 0) {
                        return (<tr><td colSpan={4} className="py-20 text-center text-[10px] font-black text-slate-600 uppercase">Aucun paiement d'abonnement détecté</td></tr>);
                      }

                      return limited.map((p: any) => (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-8 py-5 text-xs text-white font-bold">
                            {new Date(p.paymentDate || p.createdAt).toLocaleDateString('fr-FR')} {new Date(p.paymentDate || p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-8 py-5 text-xs font-mono text-indigo-400 font-black">
                            #{p.reference || String(p.id).slice(0,12)}
                          </td>
                          <td className="px-8 py-5">
                            <span className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black uppercase">
                              {(p.method || 'UNKNOWN').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right text-white font-black">
                            {Number(p.amount || 0).toLocaleString('fr-FR')} F
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl p-4">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 border-b border-slate-800">
                    <tr className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="px-8 py-5">Instance</th>
                      <th className="px-8 py-5">Plan</th>
                      <th className="px-8 py-5">Montant</th>
                      <th className="px-8 py-5">Demande</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data?.pendingValidations?.map((v: any) => (
                      <tr key={v.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-8 py-6">
                          <p className="font-black text-white uppercase text-sm">{v.tenantName || v.tenant?.name || 'Inconnu'}</p>
                          <p className="text-[9px] text-slate-500 font-mono">{v.tenantId || v.id}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg uppercase">
                            {v.planId || v.subscription?.planName}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-white font-black">
                          {Number(v.amount || v.planPrice || 0).toLocaleString()} F
                        </td>
                        <td className="px-8 py-6 text-xs text-slate-400">
                          {v.requestedAt ? new Date(v.requestedAt).toLocaleString() : v.nextBillingDate ? new Date(v.nextBillingDate).toLocaleString() : '—'}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => openBillingDetail(v.tenant || v.id)} className="p-3 bg-slate-800 text-white rounded-xl hover:bg-rose-500 transition-all flex items-center gap-2 text-[9px] font-black uppercase ml-auto">
                              <Eye size={14}/> DÉTAILS
                            </button>
                            <button onClick={() => handleValidateSubscription(v)} className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 text-[9px] font-black uppercase">
                              <Check size={14}/> VALIDER
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'TENANTS' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-6">
              <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                   <div className="relative w-80">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                      <input type="text" placeholder="Filtrer par instance..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-rose-500" />
                   </div>
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{tenants.length} Instances enregistrées</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <tr>
                        <th className="px-10 py-6">Instance & Domaine</th>
                        <th className="px-10 py-6">Abonnement</th>
                        <th className="px-10 py-6 text-center">Users / Quota</th>
                        <th className="px-10 py-6 text-center">Santé Flux</th>
                        <th className="px-10 py-6 text-center">État</th>
                        <th className="px-10 py-6 text-right">Kill-Switch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase())).map((t: any) => (
                        <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-10 py-6">
                            <p className="font-black text-white uppercase text-sm">{t.name}</p>
                            <p className="text-[9px] text-slate-500 font-mono">{t.domain}</p>
                          </td>
                          <td className="px-10 py-6">
                            <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg uppercase">{t.planName}</span>
                            <p className="text-[8px] text-slate-500 mt-1 uppercase italic">MAJ: {t.lastPaymentDate ? new Date(t.lastPaymentDate).toLocaleDateString() : 'N/A'}</p>
                          </td>
                          <td className="px-10 py-6 text-center">
                            <p className="text-sm font-black text-white">{t.userCount} <span className="text-slate-500 text-[10px]">/ {t.planMaxUsers || '∞'}</span></p>
                          </td>
                          <td className="px-10 py-6 text-center">
                             <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${t.isUpToDate ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400 animate-pulse'}`}>
                               {t.paymentStatus === 'UP_TO_DATE' ? 'À JOUR' : t.paymentStatus === 'TRIAL' ? 'ESSAI' : 'RETARD'}
                             </span>
                          </td>
                          <td className="px-10 py-6 text-center">
                            <div className={`w-3 h-3 rounded-full mx-auto ${t.isActive ? 'bg-emerald-500' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}></div>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <button onClick={() => handleToggleLock(t.id, t.name, t.isActive)} className={`p-4 rounded-2xl transition-all ${t.isActive ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white' : 'bg-emerald-500 text-white'}`}>
                              {t.isActive ? <Ban size={20}/> : <Power size={20}/>}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SUBSCRIPTIONS' && (
             <div className="space-y-8 animate-in slide-in-from-bottom-6">
                <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 overflow-hidden shadow-2xl">
                   <h3 className="text-xl font-black uppercase text-white mb-8 flex items-center gap-3">
                      <CreditCard className="text-rose-500" /> Registre de Facturation SaaS
                   </h3>
                   <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                           <tr>
                              <th className="px-8 py-4">Tenant</th>
                              <th className="px-8 py-4">Offre Active</th>
                              <th className="px-8 py-4">Status Souscription</th>
                              <th className="px-8 py-4">Prochain Prélèvement</th>
                              <th className="px-8 py-4 text-right">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                           {tenants.map((t: any) => (
                              <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                                 <td className="px-8 py-6">
                                    <p className="font-bold text-white uppercase">{t.name}</p>
                                    <p className="text-[8px] text-slate-500 font-mono mt-0.5">{t.id}</p>
                                 </td>
                                 <td className="px-8 py-6 text-indigo-400 font-black">{t.planName}</td>
                                 <td className="px-8 py-6">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${t.subscription?.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                       {t.subscription?.status || 'UNKNOWN'}
                                    </span>
                                 </td>
                                 <td className="px-8 py-6 text-xs text-slate-400">
                                    {t.subscription?.nextBillingDate ? new Date(t.subscription.nextBillingDate).toLocaleDateString() : 'N/A'}
                                 </td>
                                 <td className="px-8 py-6 text-right">
                                    <button 
                                      onClick={() => openBillingDetail(t.id)}
                                      className="p-3 bg-slate-800 text-white rounded-xl hover:bg-rose-500 transition-all flex items-center gap-2 text-[9px] font-black uppercase ml-auto"
                                    >
                                      <Eye size={14}/> DÉTAILS
                                    </button>
                                      {t.subscription?.status !== 'ACTIVE' && (
                                        <button
                                          onClick={() => handleValidateSubscription({ tenantId: t.id, tenantName: t.name, planId: t.subscription?.planDetails?.id || t.subscription?.planId, planPrice: t.subscription?.planDetails?.priceMonthly || t.subscription?.planPrice || 0, amount: t.subscription?.lastPaymentAmount || 0 })}
                                          className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 text-[9px] font-black uppercase ml-3"
                                        >
                                          <Check size={14}/> VALIDER
                                        </button>
                                      )}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                      </table>
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'PLANS' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-6">
              <div className="flex justify-end">
                <button onClick={() => { setPlanForm({ id: '', name: '', priceMonthly: 0, priceYearly: 0, maxUsers: 1, hasAiChatbot: false, hasStockForecast: false, isActive: true }); setShowPlanModal(true); }} className="px-10 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl hover:bg-rose-500 transition-all">
                  <Plus size={20}/> FORGER UNE NOUVELLE OFFRE
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((p: any) => (
                  <div key={p.id} className="bg-slate-900 border border-slate-800 p-10 rounded-[3.5rem] space-y-8 relative overflow-hidden group shadow-2xl">
                    <div className="flex justify-between items-start">
                      <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform"><Layers size={32}/></div>
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${p.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {p.isActive ? 'ACTIF' : 'SUSPENDU'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-white uppercase tracking-tighter">{p.name}</h4>
                      <p className="text-4xl font-black mt-3 text-indigo-400">{p.priceMonthly.toLocaleString()} <span className="text-xs uppercase text-slate-600 font-bold tracking-widest">F CFA /m</span></p>
                    </div>
                    <div className="space-y-4 pt-6 border-t border-slate-800">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400"><span>Quota Utilisateurs</span><span className="text-white font-black">{p.maxUsers}</span></div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400"><span>IA Orchestrator</span><span className={p.hasAiChatbot ? 'text-emerald-500' : 'text-rose-500'}>{p.hasAiChatbot ? 'OUI' : 'NON'}</span></div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400"><span>Prévisions AI</span><span className={p.hasStockForecast ? 'text-emerald-500' : 'text-rose-500'}>{p.hasStockForecast ? 'OUI' : 'NON'}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-4">
                      <button onClick={() => { setPlanForm(p); setShowPlanModal(p); }} className="py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-600 transition-all">MODIFIER</button>
                      <button onClick={() => handleDeletePlan(p.id, p.name)} className="py-4 bg-rose-500/10 text-rose-500 rounded-2xl font-black text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16} className="mx-auto"/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'BILLING_ALERTS' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-rose-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                  <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-1">Comptes en Retard</p>
                  <h3 className="text-3xl font-black">{billingOverdue.length} Comptes</h3>
                  <p className="text-sm text-rose-200 mt-4">Instances avec paiements manquants ou abonnements expirés.</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Abonnements Proches d'Échéance</p>
                  <h3 className="text-2xl font-black text-slate-900">{billingUpcoming.length} Clients</h3>
                  <p className="text-sm text-slate-500 mt-4">Abonnements avec prochain prélèvement dans les prochains jours.</p>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black uppercase">Détails Alertes de Facturation</h4>
                  <div className="flex items-center gap-3">
                    <button onClick={fetchData} className="p-3 bg-slate-50 text-slate-500 rounded-2xl hover:text-indigo-600"><RefreshCw size={18} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase mb-2">Comptes qui nous doivent</p>
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {billingLoading ? <div className="text-sm text-slate-500">Chargement...</div> : billingOverdue.length === 0 ? <div className="text-sm text-slate-400">Aucun compte en retard</div> : billingOverdue.map((t: any) => (
                        <div key={t.id} className="p-3 border rounded-2xl flex justify-between items-center">
                          <div>
                            <div className="font-black">{t.name}</div>
                            <div className="text-xs text-slate-400">{t.domain}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openBillingDetail(t.id)} className="px-3 py-2 bg-indigo-600 text-white rounded-2xl text-xs font-black">Voir Détails</button>
                            <button onClick={async () => { try { await sendEmail({ tenantId: t.id, subject: 'Rappel de paiement', body: `Bonjour ${t.name}, nous avons constaté un retard de paiement.` }); } catch (e) {} }} disabled={actionLoading} className="px-3 py-2 bg-rose-500/10 text-rose-500 rounded-2xl text-xs font-black disabled:opacity-40">Envoyer Rappel</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase mb-2">Abonnements proches d'échéance</p>
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {billingLoading ? <div className="text-sm text-slate-500">Chargement...</div> : billingUpcoming.length === 0 ? <div className="text-sm text-slate-400">Aucun abonnement imminent</div> : billingUpcoming.map((u: any) => (
                        <div key={u.tenant || u.tenantId} className="p-3 border rounded-2xl flex justify-between items-center">
                          <div>
                            <div className="font-black">{u.tenant || u.tenantName}</div>
                            <div className="text-xs text-slate-400">Échéance: {u.nextBillingDate ? new Date(u.nextBillingDate).toLocaleDateString() : 'N/A'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => { /* find tenant id by name and open billing */ const t = tenants.find(tt => tt.name === (u.tenant || u.tenantName)); if (t) openBillingDetail(t.id); else showToast('Ouvrir détails indisponible', 'error'); }} className="px-3 py-2 bg-indigo-600 text-white rounded-2xl text-xs font-black">Voir Détails</button>
                            <button onClick={async () => { try { const tenantRecord = tenants.find(tt => tt.name === (u.tenant || u.tenantName)); await sendEmail({ tenantId: tenantRecord?.id, tenantName: u.tenant || u.tenantName, subject: 'Votre abonnement arrive à échéance', body: `Bonjour, votre prochain prélèvement est prévu le ${u.nextBillingDate ? new Date(u.nextBillingDate).toLocaleDateString() : 'prochainement'}.` }); } catch (e) {} }} disabled={actionLoading} className="px-3 py-2 bg-amber-500 text-white rounded-2xl text-xs font-black disabled:opacity-40">Notifier</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'UPGRADES' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-6">
              <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-6 overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black uppercase text-white">Traitement des demandes d'upgrade</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-500 uppercase">{upgradeRequests.length} demandes</span>
                    <button onClick={fetchData} className="p-3 bg-slate-800 text-slate-400 rounded-2xl hover:text-white"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-3">Instance</th>
                        <th className="px-6 py-3">Offre courante</th>
                        <th className="px-6 py-3">Offre demandée</th>
                        <th className="px-6 py-3">Message</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {upgradeRequests.length === 0 ? (
                        <tr><td colSpan={5} className="py-12 text-center text-slate-500 font-black">Aucune demande d'upgrade en attente</td></tr>
                      ) : upgradeRequests.map((r: any) => (
                        <tr key={r.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-black text-white">{r.tenantName || r.tenant?.name}</td>
                          <td className="px-6 py-4 text-slate-400">{r.currentPlan}</td>
                          <td className="px-6 py-4 text-indigo-300 font-black">{r.requestedPlan}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-[40ch] truncate">{r.message || '—'}</td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                            <button onClick={() => handleApproveUpgrade(r)} className="px-3 py-2 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase hover:bg-emerald-600 flex items-center gap-2"><Check size={14}/>Approuver</button>
                            <button onClick={() => handleRejectUpgrade(r)} className="px-3 py-2 bg-rose-500/10 text-rose-500 rounded-2xl font-black text-xs uppercase hover:bg-rose-500 hover:text-white flex items-center gap-2"><Ban size={14}/>Rejeter</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'LOGS' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-6">
              <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-6 overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black uppercase text-white">Journal des Logs</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-500 uppercase">Filtrer et parcourir</span>
                    <button onClick={() => fetchLogs(logTenantFilter, logUserFilter)} className="p-3 bg-slate-800 text-slate-400 rounded-2xl hover:text-white"><RefreshCw size={18} className={logsLoading ? 'animate-spin' : ''} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">Compte</label>
                    <select value={logTenantFilter || ''} onChange={e => { const v = e.target.value || null; setLogTenantFilter(v); fetchUsersForTenant(v); setLogUserFilter(null); }} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-black text-white outline-none">
                      <option value="">Tous les comptes</option>
                      {tenants.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">Utilisateur</label>
                    <select value={logUserFilter || ''} onChange={e => { const v = e.target.value || null; setLogUserFilter(v); }} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-black text-white outline-none">
                      <option value="">Tous les utilisateurs</option>
                      {usersForTenant.map(u => (<option key={u.id} value={u.id}>{u.email || u.name || u.username}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">Recherche</label>
                    <input placeholder="Filtrer par message / niveau..." onKeyDown={e => { if (e.key === 'Enter') fetchLogs(logTenantFilter, logUserFilter); }} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-black text-white outline-none" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Instance</th>
                        <th className="px-6 py-3">Utilisateur</th>
                        <th className="px-6 py-3">Niveau</th>
                        <th className="px-6 py-3">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {logs.length === 0 ? (
                        <tr><td colSpan={5} className="py-12 text-center text-slate-500 font-black">Aucun log trouvé</td></tr>
                      ) : logs.map((l: any) => (
                        <tr key={l.id || `${l.timestamp}-${Math.random()}`} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-xs text-slate-400">{new Date(l.timestamp || l.createdAt || Date.now()).toLocaleString()}</td>
                          <td className="px-6 py-4 font-black text-white">{l.tenantName || l.tenant?.name || l.tenantId}</td>
                          <td className="px-6 py-4 text-slate-400">{l.userName || l.user?.name || l.user?.email || '-'}</td>
                          <td className={`px-6 py-4 font-black ${l.level === 'error' ? 'text-rose-400' : l.level === 'warn' ? 'text-amber-400' : 'text-emerald-400'}`}>{(l.level || 'info').toUpperCase()}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-[60ch] truncate">{l.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL DÉTAILS BILLING (REGISTRE FACTURATION) */}
      {showBillingDetail && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="w-full max-w-4xl h-full bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
              <div className="p-10 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-xl">
                      <CreditCard size={32}/>
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{showBillingDetail.tenant.name}</h3>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1 italic">Registry Cloud Billing Details</p>
                    </div>
                 </div>
                 <button onClick={() => setShowBillingDetail(null)} className="p-4 hover:bg-white/5 rounded-2xl transition-all text-slate-500"><X size={32}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                 {/* Dashboard Interne */}
                 <div className="grid grid-cols-3 gap-6">
                    <div className="p-8 bg-slate-900 rounded-[2rem] border border-slate-800">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Offre en cours</p>
                       <p className="text-xl font-black text-rose-500 uppercase">{showBillingDetail.tenant.subscription?.planDetails?.name || 'FREE'}</p>
                    </div>
                    <div className="p-8 bg-slate-900 rounded-[2rem] border border-slate-100/10">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Membres Actifs</p>
                       <p className="text-xl font-black text-white">{showBillingDetail.stats.userCount} <span className="text-slate-600 text-xs">/ {showBillingDetail.tenant.subscription?.planDetails?.maxUsers || '∞'}</span></p>
                    </div>
                    <div className="p-8 bg-slate-900 rounded-[2rem] border border-slate-100/10">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Flux</p>
                       <div className="flex items-center gap-2 mt-1">
                          <div className={`w-2.5 h-2.5 rounded-full ${showBillingDetail.tenant.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                          <p className="text-sm font-black text-white uppercase">{showBillingDetail.tenant.isActive ? 'ACTIF' : 'VERROUILLÉ'}</p>
                       </div>
                    </div>
                 </div>

                 {/* Historique Transactions */}
                 <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-3">
                       <History size={16} className="text-indigo-400" /> Flux Monétaires Sortants
                    </h4>
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                       <table className="w-full text-left">
                          <thead className="bg-slate-950 border-b border-slate-800">
                             <tr className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-8 py-5">Date</th>
                                <th className="px-8 py-5">Référence</th>
                                <th className="px-8 py-5">Méthode</th>
                                <th className="px-8 py-5 text-right">Montant</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                             {showBillingDetail.payments.length === 0 ? (
                                <tr><td colSpan={4} className="py-20 text-center text-[10px] font-black text-slate-600 uppercase">Aucun paiement d'abonnement détecté</td></tr>
                             ) : showBillingDetail.payments.map((p: any) => (
                                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                   <td className="px-8 py-5 text-xs text-white font-bold">{new Date(p.paymentDate).toLocaleDateString()}</td>
                                   <td className="px-8 py-5 text-xs font-mono text-indigo-400 font-black">#{p.reference || p.id.slice(0,8)}</td>
                                   <td className="px-8 py-5"><span className="px-2 py-1 bg-slate-800 rounded text-[7px] font-black text-slate-400">{p.method}</span></td>
                                   <td className="px-8 py-5 text-right text-white font-black">{Number(p.amount).toLocaleString()} F</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>

                 {/* Actions Administratives */}
                 <div className="bg-rose-500/5 border border-rose-500/20 p-8 rounded-[3rem] space-y-6">
                    <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest">Contrôle de l'Instance</h4>
                    <div className="grid grid-cols-2 gap-4">
                       <button 
                         onClick={() => { setShowBillingDetail(null); handleToggleLock(showBillingDetail.tenant.id, showBillingDetail.tenant.name, showBillingDetail.tenant.isActive); }}
                         className={`py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-3 transition-all ${showBillingDetail.tenant.isActive ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}
                       >
                          {showBillingDetail.tenant.isActive ? <Ban size={16}/> : <Power size={16}/>}
                          {showBillingDetail.tenant.isActive ? 'BLOQUER IMMÉDIATEMENT' : 'DÉBLOQUER L\'ACCÈS'}
                       </button>
                       <button className="py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-3 hover:bg-slate-700">
                          <Mail size={16}/> ENVOYER UNE RELANCE
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL PLAN CRUD */}
      {showPlanModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 w-full max-w-xl rounded-[4rem] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95">
             <div className="px-10 py-8 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-black uppercase text-white tracking-tight">{showPlanModal?.id ? 'Révision de l\'Offre' : 'Forger une Nouvelle Offre'}</h3>
                <button onClick={() => setShowPlanModal(null)} className="p-2 hover:bg-white/5 rounded-xl text-slate-500"><X size={24}/></button>
             </div>
             <form onSubmit={handlePlanSubmit} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-2">ID Technique (Clé Unique)</label>
                      <input type="text" required disabled={!!showPlanModal?.id} value={planForm.id} onChange={e => setPlanForm({...planForm, id: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-black text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-30" placeholder="ex: STARTER_V2" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-2">Désignation Commerciale</label>
                      <input type="text" required value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-black text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="ex: Business Ultra" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-2">Tarification (F CFA/mois)</label>
                      <input type="number" required value={planForm.priceMonthly} onChange={e => setPlanForm({...planForm, priceMonthly: parseFloat(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-black text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase px-2">Capacité Opérateurs</label>
                      <input type="number" required value={planForm.maxUsers} onChange={e => setPlanForm({...planForm, maxUsers: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-black text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                   </div>
                </div>
                <div className="flex gap-4">
                   <button type="button" onClick={() => setPlanForm({...planForm, hasAiChatbot: !planForm.hasAiChatbot})} className={`flex-1 p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${planForm.hasAiChatbot ? 'border-indigo-600 bg-indigo-50/10 text-white' : 'border-slate-800 text-slate-500'}`}>
                      <span className="text-[10px] font-black uppercase">IA Chatbot</span>
                      <Zap size={16} className={planForm.hasAiChatbot ? 'text-indigo-400' : ''}/>
                   </button>
                   <button type="button" onClick={() => setPlanForm({...planForm, hasStockForecast: !planForm.hasStockForecast})} className={`flex-1 p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${planForm.hasStockForecast ? 'border-indigo-600 bg-indigo-50/10 text-white' : 'border-slate-800 text-slate-500'}`}>
                      <span className="text-[10px] font-black uppercase">Prév. IA</span>
                      <TrendingUp size={16} className={planForm.hasStockForecast ? 'text-indigo-400' : ''}/>
                   </button>
                </div>
                <button type="submit" disabled={actionLoading} className="w-full py-5 bg-rose-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                  {actionLoading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> SCELLER DANS LE KERNEL</>}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL (High Fidelity Replacement) */}
      {confirmAction && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-slate-900 w-full max-w-md rounded-[3rem] border border-slate-800 p-10 text-center space-y-8 animate-in zoom-in-95 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
              <div className={`w-24 h-24 rounded-[2rem] mx-auto flex items-center justify-center shadow-inner ${confirmAction.type === 'danger' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                 <confirmAction.icon size={48} />
              </div>
              <div>
                 <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-4">{confirmAction.title}</h3>
                 <p className="text-xs text-slate-400 font-bold leading-relaxed uppercase tracking-widest">{confirmAction.msg}</p>
              </div>
              <div className="flex flex-col gap-3">
                 <button 
                   onClick={confirmAction.action}
                   className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${confirmAction.type === 'danger' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                 >
                    CONFIRMER L'OPÉRATION
                 </button>
                 <button 
                   onClick={() => setConfirmAction(null)}
                   className="w-full py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
                 >
                    ANNULER
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Globe, Users, CreditCard, AlertTriangle,
  Search, RefreshCw, Power, TrendingUp, BarChart3,
  Mail, ArrowUpRight, Ban, CheckCircle2, Loader2,
  Zap, DollarSign, Wallet, Plus, X, Eye,
  Layers, Save, Clock, History, ChevronRight, Terminal,
  Filter, Check, Send, Trash2, ArrowLeft, BadgeCheck,
  Building2, TrendingDown, ArrowDown, ArrowUp, Activity
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, Cell
} from 'recharts';
import { apiClient } from '../services/api';
import { useToast } from './ToastProvider';

const SuperAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'COMPTES' | 'PAIEMENTS' | 'PLANS' | 'ALERTES' | 'MESSAGES' | 'LOGS'>('DASHBOARD');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logTenantFilter, setLogTenantFilter] = useState<string | null>(null);
  const [logUserFilter, setLogUserFilter] = useState<string | null>(null);
  const [usersForTenant, setUsersForTenant] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tenantPlanFilter, setTenantPlanFilter] = useState('ALL');
  const [tenantStatusFilter, setTenantStatusFilter] = useState('ALL');
  const [showBillingDetail, setShowBillingDetail] = useState<any>(null);
  const [showPlanModal, setShowPlanModal] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    id: '', name: '', priceMonthly: 0, priceYearly: 0,
    maxUsers: 1, hasAiChatbot: false, hasStockForecast: false, isActive: true
  });
  const [confirmAction, setConfirmAction] = useState<{
    title: string; msg: string; icon: any;
    type: 'danger' | 'success' | 'warning'; action: () => Promise<void>;
  } | null>(null);
  const [paymentFilterMethod, setPaymentFilterMethod] = useState('ALL');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentPageSize, setPaymentPageSize] = useState(25);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesStats, setMessagesStats] = useState({ total_messages: 0, non_lus: 0, lus: 0, unique_contacts: 0 });
  const [messagesFilter, setMessagesFilter] = useState<'all' | 'non_lus' | 'lus'>('all');
  const [messagesSearch, setMessagesSearch] = useState('');
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesPagination, setMessagesPagination] = useState<any>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showMessageDetail, setShowMessageDetail] = useState(false);
  const [emailModal, setEmailModal] = useState<{ tenantId: string; tenantName: string } | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const showToast = useToast();

  /* ─── DATA FETCHING ─── */
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
    } catch (err: any) {
      showToast(`Erreur de chargement: ${err?.message || err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    setMessagesLoading(true);
    try {
      const params = new URLSearchParams({ page: messagesPage.toString(), limit: '20' });
      if (messagesFilter !== 'all') params.append('status', messagesFilter);
      if (messagesSearch.trim()) params.append('search', messagesSearch.trim());
      const response = await apiClient.get(`/admin/contact/messages?${params}`);
      if (response.success) {
        setMessages(response.data.messages || []);
        setMessagesPagination(response.data.pagination);
        setMessagesStats(response.data.stats);
      }
    } catch (err: any) {
      showToast(`Erreur messages: ${err?.message || err}`, 'error');
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchUsersForTenant = async (tenantId: string | null) => {
    if (!tenantId) { setUsersForTenant([]); return; }
    try {
      const res = await apiClient.get(`/admin/tenants/${tenantId}/users`);
      setUsersForTenant(res || []);
    } catch { setUsersForTenant([]); }
  };

  const fetchLogs = async (tenantId?: string | null, userId?: string | null) => {
    setLogsLoading(true);
    try {
      const q: string[] = [];
      if (tenantId) q.push(`tenantId=${encodeURIComponent(tenantId)}`);
      if (userId) q.push(`userId=${encodeURIComponent(userId)}`);
      const url = `/admin/logs${q.length ? '?' + q.join('&') : ''}`;
      const res = await apiClient.get(url);
      setLogs(res || []);
    } catch { setLogs([]); } finally { setLogsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (activeTab === 'MESSAGES') fetchMessages(); }, [activeTab, messagesFilter, messagesSearch, messagesPage]);

  /* ─── ACTIONS ─── */
  const handleToggleLock = (tenantId: string, tenantName: string, currentStatus: boolean) => {
    setConfirmAction({
      title: currentStatus ? 'VERROUILLER LE COMPTE' : 'DÉVERROUILLER LE COMPTE',
      msg: currentStatus
        ? `Verrouiller "${tenantName}" ? L'accès sera immédiatement coupé.`
        : `Réactiver l'accès de "${tenantName}" ?`,
      icon: currentStatus ? Ban : Power,
      type: currentStatus ? 'danger' : 'success',
      action: async () => {
        setActionLoading(true);
        try {
          await apiClient.post(`/admin/tenants/${tenantId}/toggle-lock`, {});
          showToast(`Compte ${currentStatus ? 'verrouillé' : 'déverrouillé'}`, 'success');
          fetchData(); setConfirmAction(null);
        } catch (err: any) {
          showToast(`Erreur: ${err?.message || err}`, 'error'); setConfirmAction(null);
        } finally { setActionLoading(false); }
      }
    });
  };

  const handleValidateSubscription = (validation: any) => {
    setConfirmAction({
      title: 'VALIDER LE PAIEMENT',
      msg: `Valider le paiement pour ${validation.tenantName || validation.tenant?.name || 'cette instance'} ?`,
      icon: CheckCircle2, type: 'success',
      action: async () => {
        setActionLoading(true);
        try {
          const tenantId = validation.tenantId || validation.id || validation.tenant?.id;
          let amount = validation.amount || validation.planPrice || 0;
          if (!amount && validation.planId) {
            const plan = plans.find((p: any) => p.id === validation.planId);
            if (plan) amount = plan.priceMonthly || 0;
          }
          if (!amount) {
            const t = tenants.find(t => t.id === tenantId);
            if (t) amount = t.subscription?.planDetails?.priceMonthly || 0;
          }
          const reference = validation?.reference || `VALID-${Date.now()}`;
          await apiClient.post(`/admin/tenants/${tenantId}/subscription/validate`, { amount, method: 'WAVE', reference });
          showToast('Paiement validé avec succès', 'success');
          fetchData(); setConfirmAction(null);
        } catch (err: any) {
          showToast(`Échec: ${err.message || 'Erreur'}`, 'error'); setConfirmAction(null);
        } finally { setActionLoading(false); }
      }
    });
  };

  const handleRejectUpgrade = (request: any) => {
    setConfirmAction({
      title: 'Rejeter la demande',
      msg: `Rejeter la demande de "${request.tenantName || request.tenant?.name}" ?`,
      icon: Ban, type: 'danger',
      action: async () => {
        setActionLoading(true);
        try {
          const tenantId = request.tenantId || request.tenant?.id || request.id;
          await apiClient.post(`/admin/tenants/${tenantId}/subscription/reject`, {});
          showToast('Demande rejetée', 'success');
          fetchData(); setConfirmAction(null);
        } catch (err: any) {
          showToast(`Erreur: ${err?.message || err}`, 'error'); setConfirmAction(null);
        } finally { setActionLoading(false); }
      }
    });
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (showPlanModal?.id) await apiClient.put(`/admin/plans/${showPlanModal.id}`, planForm);
      else await apiClient.post('/admin/plans', planForm);
      setShowPlanModal(null); fetchData();
    } catch { showToast("Erreur lors de l'enregistrement.", 'error'); }
    finally { setActionLoading(false); }
  };

  const handleDeletePlan = (id: string, name: string) => {
    setConfirmAction({
      title: "Désactiver l'Offre",
      msg: `Désactiver "${name}" du catalogue ?`,
      icon: Trash2, type: 'danger',
      action: async () => {
        try {
          await apiClient.delete(`/admin/plans/${id}`);
          fetchData(); setConfirmAction(null);
        } catch { showToast("Erreur suppression.", 'error'); setConfirmAction(null); }
      }
    });
  };

  const openBillingDetail = async (tenantId: string) => {
    setActionLoading(true);
    try {
      const res = await apiClient.get(`/admin/tenants/${tenantId}/billing`);
      setShowBillingDetail(res);
    } catch { showToast("Erreur lecture registre billing.", 'error'); }
    finally { setActionLoading(false); }
  };

  const sendEmail = async (payload: { tenantId?: string; tenantName?: string; subject: string; body: string }) => {
    setActionLoading(true);
    try {
      const res = await apiClient.post('/admin/email/send', payload);
      showToast(res?.message || 'Email envoyé / mis en file', 'success');
      return res;
    } catch (err: any) {
      showToast(err?.message || 'Erreur envoi email', 'error'); throw err;
    } finally { setActionLoading(false); }
  };

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailModal) return;
    try {
      await sendEmail({ tenantId: emailModal.tenantId, tenantName: emailModal.tenantName, subject: emailSubject, body: emailBody });
      setEmailModal(null); setEmailSubject(''); setEmailBody('');
    } catch { /* toast already shown */ }
  };

  const handleMarkMessageAsRead = async (messageId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'non_lus' ? 'lus' : 'non_lus';
      const response = await apiClient.put(`/admin/contact/messages/${messageId}/status`, { status: newStatus });
      if (response.success) {
        setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, status: newStatus } : msg));
        setMessagesStats(prev => ({
          ...prev,
          non_lus: newStatus === 'lus' ? prev.non_lus - 1 : prev.non_lus + 1,
          lus: newStatus === 'lus' ? prev.lus + 1 : prev.lus - 1
        }));
        showToast('Statut mis à jour', 'success');
      }
    } catch (err: any) { showToast(`Erreur: ${err?.message || err}`, 'error'); }
  };

  const handleDeleteMessage = async (messageId: string, senderName: string) => {
    setConfirmAction({
      title: 'Supprimer le message',
      msg: `Supprimer définitivement le message de "${senderName}" ?`,
      icon: Trash2, type: 'danger',
      action: async () => {
        try {
          const response = await apiClient.delete(`/admin/contact/messages/${messageId}`);
          if (response.success) {
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
            setMessagesStats(prev => ({ ...prev, total_messages: prev.total_messages - 1 }));
            showToast('Message supprimé', 'success');
          }
        } catch (err: any) { showToast(`Erreur: ${err?.message || err}`, 'error'); }
        finally { setConfirmAction(null); }
      }
    });
  };

  /* ─── DERIVED DATA ─── */
  const pendingValidations: any[] = Array.isArray(data?.pendingValidations) ? data.pendingValidations : [];
  const overdueTenantsRaw = tenants.filter(t => t.paymentStatus === 'PENDING' || t.paymentStatus === 'REJECTED');
  const upcomingAlerts: any[] = Array.isArray(data?.subscriptionAlerts) ? data.subscriptionAlerts : [];
  const totalCollectedAllTime = tenants.reduce((sum: number, t: any) => {
    const payments: any[] = [];
    return sum;
  }, 0);
  const mrr = Number(data?.stats?.mrr || 0);
  const arr = mrr * 12;
  const activeTenants = Number(data?.stats?.activeTenants || 0);
  const arpu = activeTenants > 0 ? mrr / activeTenants : 0;

  const filteredTenants = tenants.filter(t => {
    const nameMatch = t.name?.toLowerCase().includes(search.toLowerCase()) || t.domain?.toLowerCase().includes(search.toLowerCase());
    const planMatch = tenantPlanFilter === 'ALL' || t.planName === tenantPlanFilter;
    const statusMatch = tenantStatusFilter === 'ALL' ||
      (tenantStatusFilter === 'UP_TO_DATE' && t.paymentStatus === 'UP_TO_DATE') ||
      (tenantStatusFilter === 'TRIAL' && t.paymentStatus === 'TRIAL') ||
      (tenantStatusFilter === 'OVERDUE' && (t.paymentStatus === 'PENDING' || t.paymentStatus === 'REJECTED')) ||
      (tenantStatusFilter === 'LOCKED' && !t.isActive);
    return nameMatch && planMatch && statusMatch;
  });

  const planRevenue = plans.map((p: any) => ({
    name: p.name,
    count: tenants.filter(t => t.planName === p.name && t.subscription?.status === 'ACTIVE').length,
    revenue: tenants.filter(t => t.planName === p.name && t.subscription?.status === 'ACTIVE').length * (p.priceMonthly || 0)
  }));

  /* ─── HELPERS ─── */
  const fmt = (n: number) => Number(n || 0).toLocaleString('fr-FR');
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  const paymentStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      UP_TO_DATE: 'bg-emerald-500/15 text-emerald-400',
      TRIAL: 'bg-sky-500/15 text-sky-400',
      PENDING: 'bg-amber-500/15 text-amber-400',
      REJECTED: 'bg-rose-500/15 text-rose-400'
    };
    const labels: Record<string, string> = { UP_TO_DATE: 'À JOUR', TRIAL: 'ESSAI', PENDING: 'EN ATTENTE', REJECTED: 'REJETÉ' };
    return <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${map[status] || 'bg-slate-500/15 text-slate-400'}`}>{labels[status] || status}</span>;
  };

  const StatCard = ({ title, value, icon: Icon, sub, highlight }: any) => (
    <div className={`bg-white border p-5 flex flex-col justify-between ${highlight ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
          <h3 className={`text-2xl font-bold ${highlight ? 'text-rose-600' : 'text-slate-900'}`}>{value}</h3>
        </div>
        <div className={`p-2.5 ${highlight ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
          <Icon size={18} />
        </div>
      </div>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 p-6 space-y-6">

      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-slate-100 text-slate-600 p-2"><ShieldCheck size={20} /></div>
            <h2 className="text-xl font-bold text-slate-900">Administration SaaS</h2>
            {pendingValidations.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                {pendingValidations.length} EN ATTENTE
              </span>
            )}
          </div>
          <div className="flex bg-white border border-slate-200 p-1 w-fit overflow-x-auto max-w-[80vw] gap-0.5">
            {[
              { id: 'DASHBOARD', label: 'Dashboard', icon: BarChart3 },
              { id: 'COMPTES', label: 'Comptes', icon: Globe },
              { id: 'PAIEMENTS', label: 'Paiements', icon: CreditCard },
              { id: 'PLANS', label: 'Offres', icon: Layers },
              { id: 'ALERTES', label: 'Alertes', icon: AlertTriangle },
              { id: 'MESSAGES', label: 'Messages', icon: Mail },
              { id: 'LOGS', label: 'Logs', icon: Terminal }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap relative ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <tab.icon size={13} /> {tab.label}
                {tab.id === 'ALERTES' && overdueTenantsRaw.length > 0 && (
                  <span className="bg-rose-500 text-white text-[8px] font-black px-1 rounded-full">{overdueTenantsRaw.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <button onClick={fetchData} className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="animate-spin text-slate-500" size={36} />
          <p className="text-sm text-slate-500">Chargement...</p>
        </div>
      ) : (
        <>
          {/* ══════════ DASHBOARD ══════════ */}
          {activeTab === 'DASHBOARD' && (
            <div className="space-y-6">
              {/* KPI Row 1 */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <StatCard title="MRR" value={`${fmt(mrr)} F`} icon={TrendingUp} sub="Revenus mensuels récurrents" />
                <StatCard title="ARR" value={`${fmt(arr)} F`} icon={BarChart3} sub="Revenus annuels projetés" />
                <StatCard title="Comptes Total" value={fmt(data?.stats?.totalTenants || 0)} icon={Globe} sub={`${fmt(activeTenants)} actifs`} />
                <StatCard title="ARPU" value={`${fmt(Math.round(arpu))} F`} icon={Users} sub="Revenu moyen / client" />
                <StatCard title="En retard" value={overdueTenantsRaw.length} icon={AlertTriangle} highlight={overdueTenantsRaw.length > 0} sub="Paiements manquants" />
                <StatCard title="Validations" value={pendingValidations.length} icon={Clock} highlight={pendingValidations.length > 0} sub="Requièrent approbation" />
              </div>

              {/* KPI Row 2 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Ventes" value={`${fmt(data?.stats?.totalRevenue || 0)} F`} icon={DollarSign} sub="Toutes entreprises" />
                <StatCard title="Collecté" value={`${fmt(data?.stats?.totalCollected || 0)} F`} icon={CheckCircle2} sub="Paiements reçus" />
                <StatCard title="Impayé" value={`${fmt(data?.stats?.totalUnpaid || 0)} F`} icon={TrendingDown} highlight={(data?.stats?.totalUnpaid || 0) > 0} sub="Créances en cours" />
                <StatCard title="Utilisateurs" value={fmt(data?.stats?.usersCount || 0)} icon={Users} sub="Tous comptes confondus" />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Revenue Area Chart */}
                <div className="lg:col-span-8 bg-white border border-slate-200 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><DollarSign size={16} className="text-slate-500" /> Revenus collectés par mois</h4>
                    <span className="text-xs text-slate-400">6 derniers mois</span>
                  </div>
                  <div className="h-56">
                    {Array.isArray(data?.revenueStats) && data.revenueStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.revenueStats.map((r: any) => ({
                          month: new Date(r.month).toLocaleDateString('fr-FR', { month: 'short' }),
                          total: Number(r.total || 0)
                        }))}>
                          <defs>
                            <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: 12 }} />
                          <Area type="monotone" dataKey="total" stroke="#10b981" fill="url(#grad1)" strokeWidth={2.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">Aucune donnée disponible</div>
                    )}
                  </div>
                </div>

                {/* Validations Pending */}
                <div className="lg:col-span-4 bg-white border border-slate-200 p-6">
                  <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" /> Validations en attente
                  </h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {pendingValidations.length === 0 ? (
                      <div className="text-center py-10 text-slate-400">
                        <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={28} />
                        <p className="text-xs">Tout est à jour</p>
                      </div>
                    ) : pendingValidations.slice(0, 6).map((v: any) => {
                      const name = v?.tenantName || v?.tenant?.name || 'Inconnu';
                      return (
                        <div key={v.tenantId || v.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{name}</p>
                            <p className="text-[10px] text-slate-500">{v.planId}</p>
                          </div>
                          <button onClick={() => handleValidateSubscription(v)} className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded hover:bg-emerald-600 flex items-center gap-1">
                            <Check size={11} /> Valider
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Revenue per Plan + Top Debtors */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue par plan */}
                <div className="bg-white border border-slate-200 p-6">
                  <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><Layers size={16} className="text-slate-500" /> Revenus par offre (MRR)</h4>
                  <div className="space-y-3">
                    {planRevenue.filter(p => p.count > 0).map(p => (
                      <div key={p.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-700 w-24 truncate">{p.name}</span>
                          <div className="h-1.5 bg-slate-100 rounded-full w-32">
                            <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${mrr > 0 ? (p.revenue / mrr) * 100 : 0}%` }} />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-800">{fmt(p.revenue)} F</p>
                          <p className="text-[10px] text-slate-400">{p.count} compte(s)</p>
                        </div>
                      </div>
                    ))}
                    {planRevenue.filter(p => p.count > 0).length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">Aucun compte actif</p>
                    )}
                  </div>
                </div>

                {/* Top débiteurs */}
                <div className="bg-white border border-slate-200 p-6">
                  <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><TrendingDown size={16} className="text-rose-500" /> Top débiteurs (clients)</h4>
                  <div className="space-y-2">
                    {Array.isArray(data?.topDebtors) && data.topDebtors.length > 0 ? (
                      data.topDebtors.map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between p-3 border border-slate-100 rounded">
                          <p className="text-xs font-semibold text-slate-700">{d.name}</p>
                          <span className="text-xs font-bold text-rose-600">{fmt(d.total)} F</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">Aucun débiteur</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Comptes SaaS en retard */}
              {overdueTenantsRaw.length > 0 && (
                <div className="bg-white border border-rose-200 p-6">
                  <h4 className="text-sm font-semibold text-rose-700 mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} /> Comptes SaaS qui vous doivent ({overdueTenantsRaw.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {overdueTenantsRaw.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-rose-50 border border-rose-100 rounded">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{t.name}</p>
                          <p className="text-[10px] text-slate-500">{t.planName} • {fmtDate(t.lastPaymentDate)}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => openBillingDetail(t.id)} className="p-1.5 bg-slate-100 rounded hover:bg-slate-200" title="Voir détails">
                            <Eye size={13} className="text-slate-600" />
                          </button>
                          <button onClick={() => handleValidateSubscription({ tenantId: t.id, tenantName: t.name, planId: t.subscription?.planId })} className="p-1.5 bg-emerald-100 rounded hover:bg-emerald-200" title="Valider">
                            <Check size={13} className="text-emerald-700" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Latest Payments */}
              {Array.isArray(data?.latestPayments) && data.latestPayments.length > 0 && (
                <div className="bg-white border border-slate-200 p-6">
                  <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><History size={16} className="text-slate-500" /> Derniers paiements reçus</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead><tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase">
                        <th className="pb-2 pr-4">Date</th>
                        <th className="pb-2 pr-4">Client</th>
                        <th className="pb-2 pr-4 text-right">Montant</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {data.latestPayments.slice(0, 8).map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-2 pr-4 text-slate-500">{fmtDate(p.createdAt)}</td>
                            <td className="py-2 pr-4 font-medium text-slate-700">{p.customer || '—'}</td>
                            <td className="py-2 text-right font-bold text-emerald-600">{fmt(p.amount)} F</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════ COMPTES ══════════ */}
          {activeTab === 'COMPTES' && (
            <div className="space-y-5">
              {/* Filtres */}
              <div className="bg-white border border-slate-200 p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <select value={tenantPlanFilter} onChange={e => setTenantPlanFilter(e.target.value)}
                  className="border border-slate-200 px-3 py-2 text-xs text-slate-600 outline-none bg-white">
                  <option value="ALL">Toutes les offres</option>
                  {plans.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
                <select value={tenantStatusFilter} onChange={e => setTenantStatusFilter(e.target.value)}
                  className="border border-slate-200 px-3 py-2 text-xs text-slate-600 outline-none bg-white">
                  <option value="ALL">Tous les statuts</option>
                  <option value="UP_TO_DATE">À jour</option>
                  <option value="TRIAL">Essai</option>
                  <option value="OVERDUE">En retard</option>
                  <option value="LOCKED">Verrouillé</option>
                </select>
                <span className="text-xs text-slate-400 ml-auto">{filteredTenants.length} compte(s)</span>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-5 py-3">Entreprise</th>
                        <th className="px-5 py-3">Offre</th>
                        <th className="px-5 py-3 text-center">Utilisateurs</th>
                        <th className="px-5 py-3 text-center">Paiement</th>
                        <th className="px-5 py-3 text-center">Statut</th>
                        <th className="px-5 py-3 text-center">Dernier paiement</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTenants.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{t.domain}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{t.planName || 'N/A'}</span>
                            <p className="text-[10px] text-slate-400 mt-0.5">{t.subscription?.planDetails?.priceMonthly ? `${fmt(t.subscription.planDetails.priceMonthly)} F/mois` : ''}</p>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-sm font-bold text-slate-700">{t.userCount}</span>
                            <span className="text-[10px] text-slate-400"> / {t.planMaxUsers || '∞'}</span>
                          </td>
                          <td className="px-5 py-4 text-center">{paymentStatusBadge(t.paymentStatus)}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`text-[10px] font-bold ${t.isActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {t.isActive ? 'ACTIF' : 'VERROUILLÉ'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center text-xs text-slate-500">{fmtDate(t.lastPaymentDate)}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => openBillingDetail(t.id)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Détails billing">
                                <Eye size={14} />
                              </button>
                              <button onClick={() => { setEmailModal({ tenantId: t.id, tenantName: t.name }); setEmailSubject(''); setEmailBody(''); }}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 rounded text-indigo-600 transition-colors" title="Envoyer email">
                                <Mail size={14} />
                              </button>
                              {t.paymentStatus === 'PENDING' && (
                                <button onClick={() => handleValidateSubscription({ tenantId: t.id, tenantName: t.name, planId: t.subscription?.planId })}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded text-emerald-600 transition-colors" title="Valider paiement">
                                  <Check size={14} />
                                </button>
                              )}
                              <button onClick={() => handleToggleLock(t.id, t.name, t.isActive)}
                                className={`p-1.5 rounded transition-colors ${t.isActive ? 'bg-rose-50 hover:bg-rose-100 text-rose-500' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'}`}
                                title={t.isActive ? 'Verrouiller' : 'Déverrouiller'}>
                                {t.isActive ? <Ban size={14} /> : <Power size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredTenants.length === 0 && (
                        <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">Aucun compte trouvé</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ PAIEMENTS ══════════ */}
          {activeTab === 'PAIEMENTS' && (
            <div className="space-y-6">
              {/* Section: Validations en attente */}
              <div className="bg-white border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 bg-amber-50">
                  <Clock size={16} className="text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-800">Validations en attente ({pendingValidations.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-100">
                      <tr className="text-[10px] font-bold text-slate-500 uppercase">
                        <th className="px-5 py-3">Instance</th>
                        <th className="px-5 py-3">Plan</th>
                        <th className="px-5 py-3">Montant</th>
                        <th className="px-5 py-3">Date demande</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingValidations.length === 0 ? (
                        <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">Aucune validation en attente</td></tr>
                      ) : pendingValidations.map((v: any) => (
                        <tr key={v.id || v.tenantId} className="hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-sm text-slate-800">{v.tenantName || v.tenant?.name || 'Inconnu'}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{v.tenantId || v.id}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{v.planId}</span>
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-700">
                            {v.amount ? `${fmt(v.amount)} F` : (() => { const p = plans.find(pl => pl.id === v.planId); return p ? `${fmt(p.priceMonthly)} F` : '—'; })()}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500">
                            {v.requestedAt ? fmtDate(v.requestedAt) : v.nextBillingDate ? fmtDate(v.nextBillingDate) : '—'}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openBillingDetail(v.tenantId || v.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded flex items-center gap-1">
                                <Eye size={12} /> Détails
                              </button>
                              <button onClick={() => handleValidateSubscription(v)}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded flex items-center gap-1">
                                <Check size={12} /> Valider
                              </button>
                              <button onClick={() => handleRejectUpgrade(v)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded flex items-center gap-1">
                                <Ban size={12} /> Rejeter
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section: Historique abonnements par compte */}
              <div className="bg-white border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History size={16} className="text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-800">Registre des paiements SaaS</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <input placeholder="Référence..." value={paymentSearch} onChange={e => setPaymentSearch(e.target.value)}
                      className="border border-slate-200 px-3 py-1.5 text-xs outline-none w-40" />
                    <select value={paymentFilterMethod} onChange={e => setPaymentFilterMethod(e.target.value)}
                      className="border border-slate-200 px-3 py-1.5 text-xs bg-white outline-none">
                      <option value="ALL">Tous modes</option>
                      <option value="WAVE">WAVE</option>
                      <option value="ORANGE_MONEY">ORANGE</option>
                      <option value="STRIPE">STRIPE</option>
                      <option value="TRANSFER">VIREMENT</option>
                    </select>
                    <select value={paymentPageSize} onChange={e => setPaymentPageSize(parseInt(e.target.value))}
                      className="border border-slate-200 px-3 py-1.5 text-xs bg-white outline-none">
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={-1}>Tous</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-100">
                      <tr className="text-[10px] font-bold text-slate-500 uppercase">
                        <th className="px-5 py-3">Compte</th>
                        <th className="px-5 py-3">Plan</th>
                        <th className="px-5 py-3">Statut abonnement</th>
                        <th className="px-5 py-3">Prochain prélèvement</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tenants.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-sm text-slate-800">{t.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{t.id}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{t.planName || 'N/A'}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              t.subscription?.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                              t.subscription?.status === 'TRIAL' ? 'bg-sky-100 text-sky-700' :
                              t.subscription?.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>{t.subscription?.status || 'N/A'}</span>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500">{fmtDate(t.subscription?.nextBillingDate)}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openBillingDetail(t.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded flex items-center gap-1">
                                <Eye size={12} /> Détails
                              </button>
                              {t.subscription?.status !== 'ACTIVE' && (
                                <button onClick={() => handleValidateSubscription({ tenantId: t.id, tenantName: t.name, planId: t.subscription?.planId })}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded flex items-center gap-1">
                                  <Check size={12} /> Valider
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ PLANS ══════════ */}
          {activeTab === 'PLANS' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button onClick={() => { setPlanForm({ id: '', name: '', priceMonthly: 0, priceYearly: 0, maxUsers: 1, hasAiChatbot: false, hasStockForecast: false, isActive: true }); setShowPlanModal(true); }}
                  className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors">
                  <Plus size={16} /> Nouvelle offre
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {plans.map((p: any) => (
                  <div key={p.id} className="bg-white border border-slate-200 p-6 space-y-5">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 bg-slate-100 text-slate-600"><Layers size={22} /></div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                        {p.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{p.name}</h4>
                      <p className="text-xs text-slate-400 font-mono">{p.id}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-2">{fmt(p.priceMonthly)} <span className="text-xs text-slate-400 font-normal">F CFA/mois</span></p>
                    </div>
                    <div className="space-y-2 border-t border-slate-100 pt-4 text-xs">
                      <div className="flex justify-between text-slate-600"><span>Utilisateurs max</span><span className="font-bold text-slate-800">{p.maxUsers}</span></div>
                      <div className="flex justify-between text-slate-600"><span>IA Chatbot</span><span className={p.hasAiChatbot ? 'text-emerald-600 font-bold' : 'text-slate-400'}>{ p.hasAiChatbot ? 'Oui' : 'Non'}</span></div>
                      <div className="flex justify-between text-slate-600"><span>Prévisions IA</span><span className={p.hasStockForecast ? 'text-emerald-600 font-bold' : 'text-slate-400'}>{p.hasStockForecast ? 'Oui' : 'Non'}</span></div>
                      <div className="flex justify-between text-slate-600"><span>Clients actifs</span><span className="font-bold text-indigo-600">{tenants.filter(t => t.planName === p.name && t.subscription?.status === 'ACTIVE').length}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button onClick={() => { setPlanForm(p); setShowPlanModal(p); }} className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded transition-colors">Modifier</button>
                      <button onClick={() => handleDeletePlan(p.id, p.name)} className="py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded transition-colors">Désactiver</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════ ALERTES ══════════ */}
          {activeTab === 'ALERTES' && (
            <div className="space-y-6">
              {/* KPI alertes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-rose-50 border border-rose-200 p-5">
                  <p className="text-[10px] font-bold text-rose-600 uppercase mb-1">Comptes en retard</p>
                  <p className="text-3xl font-bold text-rose-700">{overdueTenantsRaw.length}</p>
                  <p className="text-xs text-rose-400 mt-1">Paiements SaaS manquants</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-5">
                  <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Échéances proches</p>
                  <p className="text-3xl font-bold text-amber-700">{upcomingAlerts.length}</p>
                  <p className="text-xs text-amber-400 mt-1">Dans les 7 prochains jours</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 p-5">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Validations requises</p>
                  <p className="text-3xl font-bold text-indigo-700">{pendingValidations.length}</p>
                  <p className="text-xs text-indigo-400 mt-1">En attente d'approbation</p>
                </div>
              </div>

              {/* Comptes en retard */}
              <div className="bg-white border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 bg-rose-50">
                  <AlertTriangle size={16} className="text-rose-600" />
                  <h3 className="text-sm font-bold text-slate-800">Comptes SaaS en retard de paiement</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {overdueTenantsRaw.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-400">Aucun compte en retard</div>
                  ) : overdueTenantsRaw.map((t: any) => (
                    <div key={t.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-semibold text-slate-800">{t.name}</p>
                        <p className="text-xs text-slate-500">{t.domain} • Plan: {t.planName} • Dernier paiement: {fmtDate(t.lastPaymentDate)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {paymentStatusBadge(t.paymentStatus)}
                        <button onClick={() => openBillingDetail(t.id)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded flex items-center gap-1">
                          <Eye size={12} /> Détails
                        </button>
                        <button onClick={() => { setEmailModal({ tenantId: t.id, tenantName: t.name }); setEmailSubject('Rappel de paiement'); setEmailBody(`Bonjour ${t.name},\n\nNous constatons un retard de paiement sur votre abonnement GeStockPro.\n\nMerci de régulariser votre situation.\n\nCordialement,\nL'équipe GeStockPro`); }}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded flex items-center gap-1">
                          <Mail size={12} /> Relancer
                        </button>
                        <button onClick={() => handleValidateSubscription({ tenantId: t.id, tenantName: t.name, planId: t.subscription?.planId })}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded flex items-center gap-1">
                          <Check size={12} /> Valider
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Échéances proches */}
              <div className="bg-white border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 bg-amber-50">
                  <Clock size={16} className="text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-800">Abonnements proches d'échéance (7 jours)</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {upcomingAlerts.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-400">Aucune échéance imminente</div>
                  ) : upcomingAlerts.map((s: any, i: number) => {
                    const tenant = tenants.find(t => t.name === s.tenant);
                    return (
                      <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-semibold text-slate-800">{s.tenant}</p>
                          <p className="text-xs text-slate-500">Échéance: {fmtDate(s.nextBillingDate)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{s.status}</span>
                          {tenant && (
                            <button onClick={() => { setEmailModal({ tenantId: tenant.id, tenantName: tenant.name }); setEmailSubject('Votre abonnement arrive à échéance'); setEmailBody(`Bonjour ${tenant.name},\n\nVotre abonnement GeStockPro arrive à échéance le ${fmtDate(s.nextBillingDate)}.\n\nMerci de prévoir le renouvellement.\n\nCordialement,\nL'équipe GeStockPro`); }}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded flex items-center gap-1">
                              <Mail size={12} /> Notifier
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Validations en attente (rappel) */}
              {pendingValidations.length > 0 && (
                <div className="bg-white border border-slate-200">
                  <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 bg-indigo-50">
                    <BadgeCheck size={16} className="text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-800">Demandes d'upgrade / validations</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {pendingValidations.map((v: any) => (
                      <div key={v.id || v.tenantId} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-semibold text-slate-800">{v.tenantName || v.tenant?.name}</p>
                          <p className="text-xs text-slate-500">Plan: {v.planId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleValidateSubscription(v)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded flex items-center gap-1">
                            <Check size={12} /> Approuver
                          </button>
                          <button onClick={() => handleRejectUpgrade(v)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded flex items-center gap-1">
                            <Ban size={12} /> Rejeter
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════ MESSAGES ══════════ */}
          {activeTab === 'MESSAGES' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total', value: messagesStats.total_messages, icon: Mail, color: 'text-indigo-500' },
                  { label: 'Non lus', value: messagesStats.non_lus, icon: AlertTriangle, color: 'text-amber-500' },
                  { label: 'Traités', value: messagesStats.lus, icon: CheckCircle2, color: 'text-emerald-500' },
                  { label: 'Contacts uniques', value: messagesStats.unique_contacts, icon: Users, color: 'text-purple-500' }
                ].map(s => (
                  <div key={s.label} className="bg-white border border-slate-200 p-5 flex items-center gap-4">
                    <s.icon size={20} className={s.color} />
                    <div>
                      <p className="text-xl font-bold text-slate-800">{s.value}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-slate-200 p-4 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-2">
                  {(['all', 'non_lus', 'lus'] as const).map(f => (
                    <button key={f} onClick={() => { setMessagesFilter(f); setMessagesPage(1); }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${messagesFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {f === 'all' ? 'Tous' : f === 'non_lus' ? 'Non lus' : 'Lus'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input value={messagesSearch} onChange={e => setMessagesSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') setMessagesPage(1); }}
                      placeholder="Rechercher..." className="pl-8 pr-3 py-1.5 border border-slate-200 text-xs outline-none focus:ring-1 focus:ring-slate-300 w-52" />
                  </div>
                  <button onClick={fetchMessages} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600">
                    <RefreshCw size={14} className={messagesLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 overflow-hidden">
                {messagesLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400"><Mail className="mx-auto mb-2 text-slate-300" size={32} />Aucun message</div>
                ) : (
                  <>
                    <table className="w-full text-left">
                      <thead className="border-b border-slate-100">
                        <tr className="text-[10px] font-bold text-slate-500 uppercase">
                          <th className="px-5 py-3">Contact</th>
                          <th className="px-5 py-3">Message</th>
                          <th className="px-5 py-3 text-center">Statut</th>
                          <th className="px-5 py-3 text-center">Date</th>
                          <th className="px-5 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {messages.map((msg: any) => (
                          <tr key={msg.id} className={`hover:bg-slate-50 ${msg.status === 'non_lus' ? 'bg-amber-50/30' : ''}`}>
                            <td className="px-5 py-4">
                              <p className="font-semibold text-sm text-slate-800">{msg.full_name}</p>
                              <p className="text-xs text-slate-400">{msg.email}</p>
                              {msg.phone && <p className="text-[10px] text-slate-400">{msg.phone}</p>}
                            </td>
                            <td className="px-5 py-4 max-w-xs">
                              <p className="text-xs text-slate-600 truncate">{msg.message}</p>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${msg.status === 'non_lus' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {msg.status === 'non_lus' ? 'NON LU' : 'LU'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center text-xs text-slate-500">{fmtDate(msg.created_at)}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button onClick={() => { setSelectedMessage(msg); setShowMessageDetail(true); }} className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded" title="Voir"><Eye size={13} /></button>
                                <button onClick={() => handleMarkMessageAsRead(msg.id, msg.status)} className={`p-1.5 rounded ${msg.status === 'non_lus' ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600' : 'bg-amber-50 hover:bg-amber-100 text-amber-600'}`} title={msg.status === 'non_lus' ? 'Marquer lu' : 'Marquer non lu'}>
                                  {msg.status === 'non_lus' ? <Check size={13} /> : <Clock size={13} />}
                                </button>
                                <button onClick={() => handleDeleteMessage(msg.id, msg.full_name)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded" title="Supprimer"><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {messagesPagination && messagesPagination.totalPages > 1 && (
                      <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-xs text-slate-400">Page {messagesPagination.currentPage} / {messagesPagination.totalPages} • {messagesPagination.totalItems} messages</p>
                        <div className="flex gap-2">
                          <button onClick={() => setMessagesPage(p => Math.max(1, p - 1))} disabled={!messagesPagination.hasPrev} className="p-1.5 bg-slate-100 rounded disabled:opacity-40"><ArrowLeft size={14} /></button>
                          <button onClick={() => setMessagesPage(p => p + 1)} disabled={!messagesPagination.hasNext} className="p-1.5 bg-slate-100 rounded disabled:opacity-40"><ChevronRight size={14} /></button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ══════════ LOGS ══════════ */}
          {activeTab === 'LOGS' && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Compte</label>
                  <select value={logTenantFilter || ''} onChange={e => { const v = e.target.value || null; setLogTenantFilter(v); fetchUsersForTenant(v); setLogUserFilter(null); }}
                    className="border border-slate-200 px-3 py-2 text-xs bg-white outline-none min-w-40">
                    <option value="">Tous les comptes</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Utilisateur</label>
                  <select value={logUserFilter || ''} onChange={e => setLogUserFilter(e.target.value || null)}
                    className="border border-slate-200 px-3 py-2 text-xs bg-white outline-none min-w-40">
                    <option value="">Tous</option>
                    {usersForTenant.map(u => <option key={u.id} value={u.id}>{u.email || u.name}</option>)}
                  </select>
                </div>
                <button onClick={() => fetchLogs(logTenantFilter, logUserFilter)}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold flex items-center gap-2 hover:bg-slate-700 transition-colors">
                  <Filter size={13} /> Filtrer
                </button>
                <button onClick={() => fetchLogs(logTenantFilter, logUserFilter)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 ml-auto">
                  <RefreshCw size={14} className={logsLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="bg-white border border-slate-200 overflow-hidden">
                {logsLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={28} /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="border-b border-slate-100">
                        <tr className="text-[10px] font-bold text-slate-500 uppercase">
                          <th className="px-5 py-3">Date</th>
                          <th className="px-5 py-3">Compte</th>
                          <th className="px-5 py-3">Utilisateur</th>
                          <th className="px-5 py-3">Action</th>
                          <th className="px-5 py-3">Ressource</th>
                          <th className="px-5 py-3 text-center">Sévérité</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {logs.length === 0 ? (
                          <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">Aucun log trouvé</td></tr>
                        ) : logs.map((l: any) => (
                          <tr key={l.id} className="hover:bg-slate-50 text-xs">
                            <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{new Date(l.createdAt || l.timestamp || Date.now()).toLocaleString('fr-FR')}</td>
                            <td className="px-5 py-3 font-medium text-slate-700">{l.tenantId ? (tenants.find(t => t.id === l.tenantId)?.name || l.tenantId.slice(0, 8)) : '—'}</td>
                            <td className="px-5 py-3 text-slate-600">{l.userName || '—'}</td>
                            <td className="px-5 py-3 font-mono font-bold text-slate-700 text-[10px]">{l.action || '—'}</td>
                            <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{l.resource || '—'}</td>
                            <td className="px-5 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                l.severity === 'HIGH' ? 'bg-rose-100 text-rose-700' :
                                l.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>{l.severity || 'LOW'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ MODAL: BILLING DETAIL ══ */}
      {showBillingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 text-slate-600"><Building2 size={22} /></div>
                <div>
                  <h3 className="font-bold text-slate-900">{showBillingDetail.tenant?.name}</h3>
                  <p className="text-xs text-slate-500">{showBillingDetail.tenant?.domain}</p>
                </div>
              </div>
              <button onClick={() => setShowBillingDetail(null)} className="p-2 hover:bg-slate-200 rounded text-slate-500"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stats rapides */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">Offre</p>
                  <p className="font-bold text-slate-800">{showBillingDetail.tenant?.subscription?.planDetails?.name || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">Utilisateurs</p>
                  <p className="font-bold text-slate-800">{showBillingDetail.stats?.userCount} / {showBillingDetail.tenant?.subscription?.planDetails?.maxUsers || '∞'}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">Statut</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${showBillingDetail.tenant?.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <p className="font-bold text-slate-800 text-xs">{showBillingDetail.tenant?.isActive ? 'ACTIF' : 'VERROUILLÉ'}</p>
                  </div>
                </div>
              </div>

              {/* Paiements */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><History size={15} /> Historique des paiements</h4>
                <div className="border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-[10px] font-bold text-slate-500 uppercase">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Référence</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {showBillingDetail.payments?.length === 0 ? (
                        <tr><td colSpan={4} className="py-8 text-center text-slate-400">Aucun paiement enregistré</td></tr>
                      ) : showBillingDetail.payments?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-600">{fmtDate(p.paymentDate || p.createdAt)}</td>
                          <td className="px-4 py-3 font-mono text-indigo-600">#{p.reference || p.id?.slice(0, 8)}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold">{p.method}</span></td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(p.amount)} F</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="border border-slate-200 p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-600 uppercase">Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setShowBillingDetail(null); handleToggleLock(showBillingDetail.tenant.id, showBillingDetail.tenant.name, showBillingDetail.tenant.isActive); }}
                    className={`py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${showBillingDetail.tenant.isActive ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>
                    {showBillingDetail.tenant.isActive ? <><Ban size={15} /> Verrouiller</> : <><Power size={15} /> Débloquer</>}
                  </button>
                  <button onClick={() => { setEmailModal({ tenantId: showBillingDetail.tenant.id, tenantName: showBillingDetail.tenant.name }); setEmailSubject('Rappel de paiement'); setEmailBody(`Bonjour ${showBillingDetail.tenant.name},\n\nNous constatons un impayé sur votre compte. Merci de régulariser.\n\nCordialement`); setShowBillingDetail(null); }}
                    className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                    <Mail size={15} /> Envoyer relance
                  </button>
                  {showBillingDetail.tenant?.paymentStatus === 'PENDING' && (
                    <button onClick={() => { handleValidateSubscription({ tenantId: showBillingDetail.tenant.id, tenantName: showBillingDetail.tenant.name }); setShowBillingDetail(null); }}
                      className="col-span-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                      <Check size={15} /> Valider le paiement en attente
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: EMAIL ══ */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Envoyer un email</h3>
                <p className="text-xs text-slate-500">À : {emailModal.tenantName}</p>
              </div>
              <button onClick={() => setEmailModal(null)} className="p-2 hover:bg-slate-100 rounded text-slate-500"><X size={18} /></button>
            </div>
            <form onSubmit={handleSendEmailSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sujet</label>
                <input type="text" required value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Message</label>
                <textarea required value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6}
                  className="w-full border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={actionLoading}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><Send size={15} /> Envoyer</>}
                </button>
                <button type="button" onClick={() => setEmailModal(null)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: PLAN CRUD ══ */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">{showPlanModal?.id ? 'Modifier l\'offre' : 'Nouvelle offre'}</h3>
              <button onClick={() => setShowPlanModal(null)} className="p-2 hover:bg-slate-100 rounded text-slate-500"><X size={18} /></button>
            </div>
            <form onSubmit={handlePlanSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ID Technique</label>
                  <input type="text" required disabled={!!showPlanModal?.id} value={planForm.id} onChange={e => setPlanForm({ ...planForm, id: e.target.value.toUpperCase() })}
                    className="w-full border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400" placeholder="ex: STARTER" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nom commercial</label>
                  <input type="text" required value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full border border-slate-200 px-3 py-2 text-sm outline-none" placeholder="ex: Starter" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Prix mensuel (F CFA)</label>
                  <input type="number" required value={planForm.priceMonthly} onChange={e => setPlanForm({ ...planForm, priceMonthly: parseFloat(e.target.value) })}
                    className="w-full border border-slate-200 px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Utilisateurs max</label>
                  <input type="number" required value={planForm.maxUsers} onChange={e => setPlanForm({ ...planForm, maxUsers: parseInt(e.target.value) })}
                    className="w-full border border-slate-200 px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setPlanForm({ ...planForm, hasAiChatbot: !planForm.hasAiChatbot })}
                  className={`p-3 border-2 text-xs font-bold flex items-center justify-between transition-colors ${planForm.hasAiChatbot ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`}>
                  IA Chatbot <Zap size={14} />
                </button>
                <button type="button" onClick={() => setPlanForm({ ...planForm, hasStockForecast: !planForm.hasStockForecast })}
                  className={`p-3 border-2 text-xs font-bold flex items-center justify-between transition-colors ${planForm.hasStockForecast ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`}>
                  Prév. IA <TrendingUp size={14} />
                </button>
              </div>
              <button type="submit" disabled={actionLoading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={15} /> Enregistrer</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: MESSAGE DETAIL ══ */}
      {showMessageDetail && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Message de contact</h3>
              <button onClick={() => { setShowMessageDetail(false); setSelectedMessage(null); }} className="p-2 hover:bg-slate-100 rounded text-slate-500"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Nom</label><p className="font-semibold text-slate-800">{selectedMessage.full_name}</p></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Email</label><p className="text-indigo-600 font-medium">{selectedMessage.email}</p></div>
                {selectedMessage.phone && <div className="col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase">Téléphone</label><p className="text-slate-700">{selectedMessage.phone}</p></div>}
              </div>
              <div className="bg-slate-50 p-4 border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Message</label>
                <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{selectedMessage.message}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Reçu le {fmtDate(selectedMessage.created_at)}</span>
                <span>•</span>
                <span className={`font-bold ${selectedMessage.status === 'non_lus' ? 'text-amber-600' : 'text-emerald-600'}`}>{selectedMessage.status === 'non_lus' ? 'Non lu' : 'Lu'}</span>
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex gap-3">
              <button onClick={() => handleMarkMessageAsRead(selectedMessage.id, selectedMessage.status)}
                className={`flex-1 py-2.5 text-sm font-bold transition-colors ${selectedMessage.status === 'non_lus' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-amber-400 hover:bg-amber-500 text-white'}`}>
                {selectedMessage.status === 'non_lus' ? 'Marquer comme lu' : 'Marquer comme non lu'}
              </button>
              <a href={`mailto:${selectedMessage.email}?subject=Re: Votre demande GeStockPro`}
                className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold text-center transition-colors">
                Répondre par email
              </a>
              <button onClick={() => { handleDeleteMessage(selectedMessage.id, selectedMessage.full_name); setShowMessageDetail(false); }}
                className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: CONFIRMATION ══ */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm shadow-2xl p-8 text-center space-y-6">
            <div className={`w-16 h-16 mx-auto flex items-center justify-center ${confirmAction.type === 'danger' ? 'bg-rose-100 text-rose-600' : confirmAction.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              <confirmAction.icon size={32} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">{confirmAction.title}</h3>
              <p className="text-sm text-slate-600">{confirmAction.msg}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={confirmAction.action} disabled={actionLoading}
                className={`w-full py-3 text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${confirmAction.type === 'danger' ? 'bg-rose-500 hover:bg-rose-600' : confirmAction.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'}`}>
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmer'}
              </button>
              <button onClick={() => setConfirmAction(null)} className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;

import React, { useMemo, useState, useEffect } from 'react';
import {
  TrendingUp, Package, Users, ShieldCheck,
  AlertTriangle, Zap, RefreshCw,
  Wallet, Landmark, Target, Activity,
  ShoppingCart, Boxes,
  Clock, CheckCircle2, UserPlus,
  TrendingDown, ShoppingBag, UserCheck,
  History, Scale, Receipt,
  HandCoins, PiggyBank, Sparkles,
  Trophy, Medal, AlertCircle, CreditCard,
  ShieldAlert, ArrowRight, Bell, ChevronRight,
  ArrowDownCircle, ArrowUpCircle, DollarSign,
  BarChart2, PieChart as PieIcon, Star
} from 'lucide-react';
import {
  Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Bar,
  Legend, ComposedChart
} from 'recharts';
import { User, UserRole, StockItem } from '../types';
import { apiClient } from '../services/api';
import { authBridge } from '../services/authBridge';
import waveQr from '../assets/qr_code_marchant_wave.png';

const fmt = (n: number, currency: string) => `${Number(n || 0).toLocaleString('fr-FR')} ${currency}`;
const fmtShort = (n: number) => Number(n || 0).toLocaleString('fr-FR');

const StatCard = ({ title, value, subValue, icon: Icon, color, trend, onClick }: any) => (
  <div
    onClick={onClick}
    className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-sm group hover:shadow-xl transition-all flex flex-col justify-between overflow-hidden relative ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="absolute -right-3 -top-3 p-6 opacity-5 group-hover:scale-110 transition-transform"><Icon size={64}/></div>
    <div className="flex justify-between items-start mb-4">
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{title}</p>
        <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter mt-1 truncate">{value}</h3>
      </div>
      <div className={`p-3 rounded-2xl ${color || ''} bg-opacity-10 ${(color || '').replace('bg-', 'text-')} shadow-inner flex-shrink-0`}><Icon size={20}/></div>
    </div>
    {subValue && (
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
        {trend === 'up' && <TrendingUp size={10} className="text-emerald-500"/>}
        {trend === 'down' && <TrendingDown size={10} className="text-rose-500"/>}
        <span className={trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'}>{subValue}</span>
      </p>
    )}
  </div>
);

const SectionHeader = ({ icon: Icon, title, badge, color = 'text-indigo-600' }: any) => (
  <div className="flex items-center justify-between mb-5">
    <h3 className={`text-sm font-black uppercase tracking-tight flex items-center gap-2 ${color}`}>
      <Icon size={18}/> {title}
    </h3>
    {badge && <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-full uppercase border border-slate-100">{badge}</span>}
  </div>
);

const ActivityItem = ({ icon: Icon, color, title, sub, time }: any) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
    <div className={`w-7 h-7 rounded-xl ${color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
      <Icon size={12} className="text-white"/>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black text-slate-800 truncate">{title}</p>
      <p className="text-[9px] text-slate-400 font-semibold truncate">{sub}</p>
    </div>
    <p className="text-[8px] text-slate-300 font-bold flex-shrink-0">{time}</p>
  </div>
);

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
};

const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const Dashboard: React.FC<{
  user: User,
  currency: string,
  onNavigate?: (tab: string, meta?: any) => void,
  onLogout?: () => void
}> = ({ user, currency, onNavigate, onLogout }) => {
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Extended state for admin dashboard
  const [adminStats, setAdminStats] = useState<any>(null);
  const [topDebtors, setTopDebtors] = useState<any[]>([]);
  const [latestPayments, setLatestPayments] = useState<any[]>([]);
  const [revenueStats, setRevenueStats] = useState<any[]>([]);
  const [pendingValidations, setPendingValidations] = useState<any[]>([]);

  const userRoles = user.roles || [user.role];

  useEffect(() => {
    const handleSessionExpired = () => {
      if (onLogout) onLogout();
      else window.location.href = '/';
    };
    const sessionMonitoringId = authBridge.startSessionMonitoring(handleSessionExpired, 300000);
    const initialCheckTimeout = setTimeout(async () => {
      await authBridge.validateCurrentSession();
    }, 30000);
    return () => {
      if (sessionMonitoringId) clearInterval(sessionMonitoringId);
      clearTimeout(initialCheckTimeout);
    };
  }, [onLogout]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        if (userRoles.includes(UserRole.ADMIN) || userRoles.includes(UserRole.SUPER_ADMIN)) {
          const res = await apiClient.get('/admin/dashboard');
          const payload = res.data || res;
          setSales((payload.recentSales || []).concat([]));
          setCustomers(payload.latestCustomers || []);
          setStocks(Array.isArray(payload.stocks) ? payload.stocks : []);
          setUsersList(payload.users?.recent || []);
          setMovements(payload.recentMovements || []);
          if (payload.subscription) setSubscription(payload.subscription);
          // Extended data
          setAdminStats(payload.stats || null);
          setTopDebtors(payload.topDebtors || []);
          setLatestPayments(payload.latestPayments || []);
          setRevenueStats(payload.revenueStats || []);
          setPendingValidations(payload.pendingValidations || []);
        } else {
          const toData = (r: any) => (r && r.data !== undefined) ? r.data : r;
          if (userRoles.includes(UserRole.ACCOUNTANT)) {
            const [salesRes, customersRes] = await Promise.all([
              apiClient.get('/sales'),
              apiClient.get('/customers')
            ]);
            setSales(toData(salesRes) || []);
            setCustomers(toData(customersRes) || []);
          } else {
            const endpoints: any[] = [
              apiClient.get('/sales'),
              apiClient.get('/customers'),
              apiClient.get('/stock'),
              apiClient.get('/services')
            ];
            if (userRoles.includes(UserRole.STOCK_MANAGER)) {
              endpoints.push(
                apiClient.get('/stock/movements'),
                apiClient.get('/categories'),
                apiClient.get('/subcategories')
              );
            }
            const results = await Promise.all(endpoints);
            setSales(toData(results[0]) || []);
            setCustomers(toData(results[1]) || []);
            setStocks(toData(results[2]) || []);
            setServices(toData(results[3]) || []);
            if (results.length > 4) {
              setMovements(toData(results[4]) || []);
              setCategories(toData(results[5]) || []);
              setSubcategories(toData(results[6]) || []);
            }
          }
        }
      } catch (err) {
        console.error("Dashboard data fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [userRoles]);

  // --- ABONNEMENT ALERT ---
  const subAlert = useMemo(() => {
    const subObj = subscription?.subscription || subscription;
    const nextBillingRaw = subObj?.nextBillingDate ?? subObj?.next_billing_date;
    if (!nextBillingRaw) return null;
    const expiry = new Date(nextBillingRaw);
    const diffDays = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return {
      daysLeft: diffDays,
      isCritical: diffDays <= 5 && diffDays >= 0,
      isExpired: diffDays < 0,
      formattedDate: expiry.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })
    };
  }, [subscription]);

  // --- SALES STATS ---
  const salesStats = useMemo(() => {
    const s = adminStats;
    if (s) {
      const totalRevenue = s.totalRevenue || 0;
      const totalCollected = s.totalCollected || 0;
      const totalUnpaid = s.totalUnpaid ?? (totalRevenue - totalCollected);
      const overdueCount = s.overdueCount || s.latePayments || 0;
      const totalSalesCount = s.totalSalesCount || sales.length;
      const avgBasket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
      const recoveryData = [
        { name: 'Encaissé', value: totalCollected, color: '#10b981' },
        { name: 'À Recouvrer', value: Math.max(0, totalUnpaid), color: '#f43f5e' }
      ];
      return { totalRevenue, totalCollected, totalUnpaid, overdueCount, totalSalesCount, avgBasket, recoveryData, monthRevenue: 0 };
    }
    const validSales = sales.filter(s => s.status !== 'ANNULE');
    const totalRevenue = validSales.reduce((sum, s) => sum + parseFloat(s.totalTtc || 0), 0);
    const totalCollected = validSales.reduce((sum, s) => sum + parseFloat(s.amountPaid || 0), 0);
    const totalUnpaid = totalRevenue - totalCollected;
    const overdueCount = validSales.filter(s => s.status === 'EN_COURS').length;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRevenue = validSales.filter(s => new Date(s.createdAt) >= startOfMonth).reduce((sum, s) => sum + parseFloat(s.totalTtc || 0), 0);
    const recoveryData = [
      { name: 'Encaissé', value: totalCollected, color: '#10b981' },
      { name: 'À Recouvrer', value: Math.max(0, totalUnpaid), color: '#f43f5e' }
    ];
    return { totalRevenue, totalCollected, totalUnpaid, overdueCount, totalSalesCount: sales.length, avgBasket: sales.length > 0 ? totalRevenue / sales.length : 0, recoveryData, monthRevenue };
  }, [sales, adminStats]);

  // --- STOCK STATS ---
  const stockStats = useMemo(() => {
    if (adminStats) {
      return {
        out: adminStats.stocksRupture || 0,
        low: adminStats.stocksLow || 0,
        total: adminStats.stocksTotal || stocks.length
      };
    }
    return {
      out: stocks.filter(s => (s.currentLevel || 0) <= 0).length,
      low: stocks.filter(s => (s.currentLevel || 0) > 0 && s.minThreshold != null && s.currentLevel <= s.minThreshold).length,
      total: stocks.length
    };
  }, [stocks, adminStats]);

  // --- STAFF PERFORMANCE ---
  const staffPerformance = useMemo(() => {
    const perfMap: Record<string, any> = {};
    const ensureOp = (name: string | null, role: string | null = 'EMPLOYEE') => {
      const key = (name || 'UNKNOWN').toString();
      if (!perfMap[key]) perfMap[key] = { name: key, role: role || 'EMPLOYEE', salesCount: 0, movCount: 0, score: 0 };
      return perfMap[key];
    };
    usersList.forEach((u: any) => {
      if (!u || !u.name) return;
      perfMap[u.name] = { name: u.name, role: u.role || 'EMPLOYEE', salesCount: 0, movCount: 0, score: 0 };
    });
    sales.forEach((s: any) => {
      const op = s.operator || s.operatorName || 'SYSTÈME';
      ensureOp(op, 'SALES').salesCount += 1;
    });
    movements.forEach((m: any) => {
      const op = m.userRef || m.userName || m.user || 'SYSTÈME';
      ensureOp(op, 'STOCK_MANAGER').movCount += 1;
    });
    return Object.values(perfMap).map((u: any) => ({
      ...u,
      score: (Number(u.salesCount || 0) * 10) + (Number(u.movCount || 0) * 2)
    })).sort((a: any, b: any) => b.score - a.score || b.salesCount - a.salesCount);
  }, [usersList, sales, movements]);

  // --- REVENUE CHART DATA ---
  const revenueChartData = useMemo(() => {
    if (revenueStats.length > 0) {
      return revenueStats.map((r: any) => {
        const d = new Date(r.month);
        return { label: MONTH_LABELS[d.getMonth()], total: r.total || 0 };
      });
    }
    // Fallback: build from recent sales grouped by month
    const map: Record<string, number> = {};
    sales.forEach((s: any) => {
      const d = new Date(s.createdAt);
      const key = MONTH_LABELS[d.getMonth()];
      map[key] = (map[key] || 0) + parseFloat(s.totalTtc || 0);
    });
    return Object.entries(map).map(([label, total]) => ({ label, total })).slice(-6);
  }, [revenueStats, sales]);

  // --- ACTIVITY FEED (movements + payments + customers combined) ---
  const activityFeed = useMemo(() => {
    const items: any[] = [];
    movements.slice(0, 5).forEach((m: any) => items.push({
      type: m.type === 'IN' ? 'stock_in' : 'stock_out',
      title: m.productName || 'Produit',
      sub: `${m.type === 'IN' ? '+' : '-'}${m.quantity} unités • ${m.userRef || 'Système'}`,
      date: m.createdAt,
      icon: m.type === 'IN' ? ArrowUpCircle : ArrowDownCircle,
      color: m.type === 'IN' ? 'bg-emerald-500' : 'bg-rose-500'
    }));
    latestPayments.slice(0, 5).forEach((p: any) => items.push({
      type: 'payment',
      title: p.customer || 'Paiement reçu',
      sub: `${Number(p.amount || 0).toLocaleString('fr-FR')} ${currency} encaissé`,
      date: p.createdAt,
      icon: DollarSign,
      color: 'bg-indigo-500'
    }));
    customers.slice(0, 3).forEach((c: any) => items.push({
      type: 'customer',
      title: c.companyName || c.name || 'Nouveau client',
      sub: 'Nouveau client enregistré',
      date: c.createdAt,
      icon: UserPlus,
      color: 'bg-sky-500'
    }));
    return items.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 12);
  }, [movements, latestPayments, customers, currency]);

  // --- STOCK ALERTS ---
  const stockAlerts = useMemo(() => {
    const ruptures = stocks.filter(s => (s.currentLevel || 0) <= 0);
    const low = stocks.filter(s => (s.currentLevel || 0) > 0 && s.minThreshold != null && s.currentLevel <= s.minThreshold);
    return { ruptures: ruptures.slice(0, 6), low: low.slice(0, 6) };
  }, [stocks]);

  // --- TODAY STATS ---
  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = sales.filter(s => new Date(s.createdAt) >= today);
    return {
      count: todaySales.length,
      revenue: todaySales.reduce((sum, s) => sum + parseFloat(s.totalTtc || 0), 0)
    };
  }, [sales]);

  // --- PAYMENT MODAL ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [txReference, setTxReference] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const processSubscriptionPayment = async () => {
    setIsProcessingPayment(true);
    try {
      const transactionId = txReference || `TX-${Date.now()}`;
      await apiClient.post('/billing/upgrade', {
        planId: subscription?.subscription?.planId || subscription?.planId || 'DEFAULT',
        paymentMethod: 'WAVE',
        transactionId,
        phone: phoneNumber,
        status: 'PENDING'
      });
      setSubscription((prev: any) => ({ ...(prev || {}), status: 'PENDING' }));
      setPaymentSuccess(true);
      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentSuccess(false);
        setTxReference('');
        setPhoneNumber('');
      }, 2200);
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement du paiement. " + (err?.message || 'Veuillez réessayer.'));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // ============================================================
  // ADMIN / SUPER-ADMIN DASHBOARD
  // ============================================================
  const renderAdminDashboard = () => {
    const collectionRate = salesStats.totalRevenue > 0
      ? Math.round((salesStats.totalCollected / salesStats.totalRevenue) * 100) : 0;

    return (
      <div className="space-y-8 animate-in fade-in duration-700">

        {/* ALERTE ABONNEMENT */}
        {subAlert && subAlert.isCritical && (
          <div className={`p-5 md:p-7 rounded-3xl border-2 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl ${subAlert.isExpired ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow ${subAlert.isExpired ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}`}>
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className={`text-base font-black uppercase tracking-tight ${subAlert.isExpired ? 'text-rose-700' : 'text-amber-700'}`}>
                  {subAlert.isExpired ? 'Abonnement Expiré' : `Abonnement expire dans ${subAlert.daysLeft} jours`}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {subAlert.isExpired ? `Instance en mode restreint depuis le ${subAlert.formattedDate}` : `Échéance le ${subAlert.formattedDate}`}
                </p>
              </div>
            </div>
            <button onClick={() => setShowPaymentModal(true)}
              className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg ${subAlert.isExpired ? 'bg-rose-600 text-white hover:bg-black' : 'bg-amber-600 text-white hover:bg-amber-700'} transition-all`}>
              <CreditCard size={14}/> Régulariser
            </button>
          </div>
        )}

        

        {/* ── ROW 1 : 8 KPI CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Chiffre d'Affaires" value={fmtShort(salesStats.totalRevenue) + ' ' + currency.split(' ')[0]} subValue={`${todayStats.count} vente(s) aujourd'hui`} icon={TrendingUp} color="bg-indigo-600" trend="up" onClick={() => onNavigate?.('sales')}/>
          <StatCard title="Trésorerie Réelle" value={fmtShort(salesStats.totalCollected) + ' ' + currency.split(' ')[0]} subValue={`Taux encaissement : ${collectionRate}%`} icon={Wallet} color="bg-emerald-500" trend="up" onClick={() => onNavigate?.('payments')}/>
          <StatCard title="Créances Clients" value={fmtShort(salesStats.totalUnpaid) + ' ' + currency.split(' ')[0]} subValue={`${salesStats.overdueCount} facture(s) en retard`} icon={Landmark} color="bg-rose-500" trend="down" onClick={() => onNavigate?.('recovery')}/>
          <StatCard title="Ventes du jour" value={`${todayStats.count}`} subValue={fmtShort(todayStats.revenue) + ' ' + currency.split(' ')[0]} icon={ShoppingCart} color="bg-violet-500" trend={todayStats.count > 0 ? 'up' : undefined} onClick={() => onNavigate?.('sales')}/>
          <StatCard title="Clients" value={(adminStats?.customersCount ?? customers.length).toLocaleString()} subValue={`${customers.slice(0,1)[0] ? 'Dernier : ' + (customers[0]?.companyName || customers[0]?.name || '—') : 'Portefeuille actif'}`} icon={Users} color="bg-sky-500" onClick={() => onNavigate?.('customers')}/>
          <StatCard title="Références Stock" value={(adminStats?.stocksTotal ?? stocks.length).toLocaleString()} subValue={`${stockStats.out} rupture(s) • ${stockStats.low} alerte(s)`} icon={Package} color="bg-amber-500" trend={stockStats.out > 0 ? 'down' : 'up'} onClick={() => onNavigate?.('inventory')}/>
          <StatCard title="Utilisateurs" value={(adminStats?.usersCount ?? usersList.length).toLocaleString()} subValue="Accès actifs" icon={UserCheck} color="bg-slate-700" onClick={() => onNavigate?.('governance')}/>
          <StatCard title="Panier Moyen" value={fmtShort(salesStats.avgBasket) + ' ' + currency.split(' ')[0]} subValue="Par transaction" icon={Target} color="bg-pink-500"/>
        </div>

        {/* ── ROW 2 : REVENUE TREND + RECOVERY DONUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Tendance CA 6 mois */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <SectionHeader icon={BarChart2} title="Tendance Revenus — 6 Derniers Mois" badge="Live" color="text-indigo-600"/>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenueChartData.length > 0 ? revenueChartData : sales.slice(-10).map((s: any) => ({
                  label: new Date(s.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }),
                  total: parseFloat(s.totalTtc)
                }))}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}/>
                  <YAxis hide/>
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: 11 }}
                    formatter={(v: any) => [`${Number(v).toLocaleString('fr-FR')} ${currency.split(' ')[0]}`, 'Revenus']}
                  />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fill="url(#gradRevenue)"/>
                  <Bar dataKey="total" fill="#6366f1" opacity={0.15} radius={[4,4,0,0]} barSize={20}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recouvrement Donut */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
            <SectionHeader icon={Scale} title="Recouvrement" color="text-emerald-600"/>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={salesStats.recoveryData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3} startAngle={90} endAngle={-270}>
                      {salesStats.recoveryData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color}/>
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${Number(v).toLocaleString('fr-FR')} ${currency.split(' ')[0]}`}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full grid grid-cols-2 gap-3 mt-2">
                {salesStats.recoveryData.map((d: any) => (
                  <div key={d.name} className="text-center">
                    <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ background: d.color }}/>
                    <p className="text-[8px] font-black text-slate-400 uppercase">{d.name}</p>
                    <p className="text-xs font-black text-slate-800">{fmtShort(d.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 3 : TOP DEBTORS + ACTIVITÉ RÉCENTE ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Top Débiteurs */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <SectionHeader icon={AlertCircle} title="Top Créances Clients" badge={`${topDebtors.length} clients`} color="text-rose-600"/>
            {topDebtors.length === 0 && (
              <div className="py-10 text-center">
                <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2"/>
                <p className="text-[10px] font-black text-slate-400 uppercase">Aucune créance en cours</p>
              </div>
            )}
            <div className="space-y-3">
              {topDebtors.map((d: any, i: number) => (
                <div key={d.id || i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl hover:bg-rose-50 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-[10px] flex-shrink-0">
                    {(d.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-800 truncate">{d.name || 'Client'}</p>
                    <div className="w-full bg-slate-200 rounded-full h-1 mt-1">
                      <div className="bg-rose-500 h-1 rounded-full" style={{ width: `${Math.min(100, (d.total / (topDebtors[0]?.total || 1)) * 100)}%` }}/>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] font-black text-rose-600">{fmtShort(d.total)}</p>
                    <p className="text-[8px] text-slate-400">{currency.split(' ')[0]}</p>
                  </div>
                </div>
              ))}
            </div>
            {topDebtors.length > 0 && (
              <button onClick={() => onNavigate?.('recovery')} className="mt-4 w-full py-3 border border-slate-200 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all flex items-center justify-center gap-2">
                Voir Recouvrement <ArrowRight size={12}/>
              </button>
            )}
          </div>

          {/* Flux d'Activité */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <SectionHeader icon={Activity} title="Flux d'Activité Récent" badge="Temps réel" color="text-indigo-600"/>
            {activityFeed.length === 0 ? (
              <div className="py-10 text-center text-slate-300 text-[10px] font-black uppercase">Aucune activité récente</div>
            ) : (
              <div className="overflow-y-auto max-h-72 pr-1">
                {activityFeed.map((item: any, i: number) => (
                  <ActivityItem key={i} {...item} time={timeAgo(item.date)}/>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 4 : ALERTES STOCK + LEADERBOARD ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Alertes Stock */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <SectionHeader icon={AlertTriangle} title="Alertes Stock" badge={`${stockStats.out + stockStats.low} items`} color="text-amber-600"/>
            {stockStats.out === 0 && stockStats.low === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2"/>
                <p className="text-[10px] font-black text-slate-400 uppercase">Stock en bonne santé</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stockAlerts.ruptures.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-rose-50 rounded-2xl border border-rose-100">
                    <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-800 truncate">{s.name}</p>
                      <p className="text-[8px] text-rose-600 font-bold uppercase">Rupture totale</p>
                    </div>
                    <span className="text-[9px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-lg">0</span>
                  </div>
                ))}
                {stockAlerts.low.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-100">
                    <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-800 truncate">{s.name}</p>
                      <p className="text-[8px] text-amber-600 font-bold uppercase">Sous le seuil min ({s.minThreshold})</p>
                    </div>
                    <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg">{s.currentLevel}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => onNavigate?.('inventory')} className="mt-4 w-full py-3 border border-slate-200 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all flex items-center justify-center gap-2">
              Gérer le Stock <ArrowRight size={12}/>
            </button>
          </div>

          {/* Leaderboard Performance */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <SectionHeader icon={Trophy} title="Classement Équipe" badge="Période totale" color="text-amber-600"/>
            <div className="space-y-3">
              {staffPerformance.slice(0, 5).map((staff: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl hover:bg-white hover:border hover:border-indigo-100 transition-all">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-800 shadow-sm text-sm uppercase">
                      {staff.name.charAt(0)}
                    </div>
                    {idx === 0 && <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-white p-0.5 rounded-full border border-white shadow-sm"><Medal size={9}/></div>}
                    {idx === 1 && <div className="absolute -top-1.5 -right-1.5 bg-slate-400 text-white p-0.5 rounded-full border border-white shadow-sm"><Star size={9}/></div>}
                    {idx === 2 && <div className="absolute -top-1.5 -right-1.5 bg-orange-400 text-white p-0.5 rounded-full border border-white shadow-sm"><Star size={9}/></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-900 uppercase truncate">{staff.name}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">{(staff.role || '').replace('_', ' ')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 justify-end text-indigo-600">
                      <Zap size={9} fill="currentColor"/>
                      <p className="text-xs font-black">{staff.score}</p>
                    </div>
                    <p className="text-[8px] text-slate-400 font-bold">{staff.salesCount}v • {staff.movCount}f</p>
                  </div>
                </div>
              ))}
              {staffPerformance.length === 0 && (
                <div className="py-8 text-center text-slate-300 font-black uppercase text-[10px]">Aucune activité tracée</div>
              )}
            </div>
            <button onClick={() => onNavigate?.('governance')} className="mt-4 w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2">
              Gestion des Accès <ArrowRight size={12}/>
            </button>
          </div>
        </div>

        {/* ── ROW 5 : VENTES RÉCENTES + PAIEMENTS RÉCENTS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Dernières Ventes */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <SectionHeader icon={ShoppingBag} title="Dernières Ventes" badge={`30 derniers jours`} color="text-indigo-600"/>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="text-left text-[8px] font-black text-slate-400 uppercase pb-2 pr-3">Référence</th>
                    <th className="text-left text-[8px] font-black text-slate-400 uppercase pb-2 pr-3">Client</th>
                    <th className="text-right text-[8px] font-black text-slate-400 uppercase pb-2 pr-3">Montant</th>
                    <th className="text-center text-[8px] font-black text-slate-400 uppercase pb-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 8).map((s: any) => (
                    <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all">
                      <td className="py-2.5 pr-3 text-[10px] font-black text-slate-700">{s.reference || `#${s.id?.slice(-6)}`}</td>
                      <td className="py-2.5 pr-3 text-[10px] text-slate-500 truncate max-w-[120px]">{s.customer || 'N/A'}</td>
                      <td className="py-2.5 pr-3 text-[10px] font-black text-slate-800 text-right">{Number(s.totalTtc).toLocaleString('fr-FR')}</td>
                      <td className="py-2.5 text-center">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase ${
                          s.status === 'TERMINE' ? 'bg-emerald-100 text-emerald-700' :
                          s.status === 'EN_COURS' ? 'bg-amber-100 text-amber-700' :
                          s.status === 'ANNULE' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {s.status === 'TERMINE' ? 'Soldé' : s.status === 'EN_COURS' ? 'En cours' : s.status === 'ANNULE' ? 'Annulé' : s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sales.length === 0 && (
                <div className="py-8 text-center text-slate-300 text-[10px] font-black uppercase">Aucune vente récente</div>
              )}
            </div>
            <button onClick={() => onNavigate?.('sales')} className="mt-4 w-full py-2.5 border border-slate-200 rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all flex items-center justify-center gap-2">
              Toutes les ventes <ArrowRight size={11}/>
            </button>
          </div>

          {/* Paiements Récents */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <SectionHeader icon={Receipt} title="Encaissements Récents" color="text-emerald-600"/>
            <div className="space-y-2">
              {latestPayments.slice(0, 8).map((p: any, i: number) => (
                <div key={p.id || i} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <DollarSign size={12} className="text-emerald-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-800 truncate">{p.customer || 'Paiement'}</p>
                    <p className="text-[8px] text-slate-400">{timeAgo(p.createdAt)} · Vente #{p.saleId?.slice(-6) || '—'}</p>
                  </div>
                  <p className="text-[10px] font-black text-emerald-600 flex-shrink-0">+{Number(p.amount).toLocaleString('fr-FR')}</p>
                </div>
              ))}
              {latestPayments.length === 0 && (
                <div className="py-8 text-center text-slate-300 text-[10px] font-black uppercase">Aucun encaissement récent</div>
              )}
            </div>
            <button onClick={() => onNavigate?.('payments')} className="mt-4 w-full py-2.5 border border-slate-200 rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all flex items-center justify-center gap-2">
              Tous les paiements <ArrowRight size={11}/>
            </button>
          </div>
        </div>

        {/* PAYMENT MODAL */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-[900] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
            <div className="w-full max-w-xl bg-white rounded-[2rem] shadow-2xl overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="text-sm font-black uppercase">Paiement Wave</h3>
                <button onClick={() => setShowPaymentModal(false)} className="p-1.5 hover:bg-white/10 rounded-xl transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="p-6">
                {paymentSuccess ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-emerald-500 text-white rounded-full mx-auto flex items-center justify-center mb-4"><CheckCircle2 size={28}/></div>
                    <h4 className="text-base font-black">Paiement enregistré</h4>
                    <p className="text-xs text-slate-500">En attente de validation.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                    <div className="flex flex-col items-center gap-3">
                      <img src={waveQr} alt="Wave QR" className="w-48 h-48 object-contain rounded-xl shadow border"/>
                      <p className="text-[9px] text-slate-500 text-center">Scannez avec l'app Wave puis saisissez la référence.</p>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400">Téléphone (optionnel)</label>
                        <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="22177xxxxxxx" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none"/>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400">Référence Transaction</label>
                        <input value={txReference} onChange={e => setTxReference(e.target.value)} placeholder="Référence Wave" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none"/>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-black uppercase text-xs">Annuler</button>
                        <button disabled={isProcessingPayment} onClick={processSubscriptionPayment} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-black uppercase text-xs disabled:opacity-50">
                          {isProcessingPayment ? '...' : 'Enregistrer'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // ACCOUNTANT DASHBOARD
  // ============================================================
  const renderAccountantDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total des ventes" value={fmtShort(salesStats.totalRevenue) + ' ' + currency.split(' ')[0]} subValue="Période totale" icon={HandCoins} color="bg-indigo-600"/>
        <StatCard title="Total encaissé" value={fmtShort(salesStats.totalCollected) + ' ' + currency.split(' ')[0]} subValue="Cash flow réel" icon={PiggyBank} color="bg-emerald-600" trend="up"/>
        <StatCard title="Total impayé" value={fmtShort(salesStats.totalUnpaid) + ' ' + currency.split(' ')[0]} subValue="Balance débitrice" icon={Landmark} color="bg-rose-600" trend="down"/>
        <StatCard title="Factures en retard" value={salesStats.overdueCount} subValue="Actions requises" icon={Clock} color="bg-amber-500"/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <SectionHeader icon={Scale} title="Encaissements vs Impayés" color="text-indigo-600"/>
          <div className="h-52 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={salesStats.recoveryData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>
                  {salesStats.recoveryData.map((entry: any, i: number) => <Cell key={i} fill={entry.color}/>)}
                </Pie>
                <Tooltip formatter={(v: any) => `${Number(v).toLocaleString('fr-FR')} ${currency.split(' ')[0]}`}/>
                <Legend iconSize={8} iconType="circle" formatter={(v) => <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <SectionHeader icon={ShoppingBag} title="Dernières Ventes" color="text-indigo-600"/>
          <div className="space-y-2 overflow-y-auto max-h-52">
            {sales.slice(0, 8).map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-800 truncate">{s.reference || `#${String(s.id).slice(-6)}`}</p>
                  <p className="text-[8px] text-slate-400">{s.customer || 'N/A'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-black text-slate-700">{Number(s.totalTtc).toLocaleString('fr-FR')}</p>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${s.status === 'TERMINE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {s.status === 'TERMINE' ? 'Soldé' : 'En cours'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // STOCK MANAGER DASHBOARD
  // ============================================================
  const renderStockManagerDashboard = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Références" value={stocks.length} subValue="Catalogue actif" icon={Boxes} color="bg-indigo-600"/>
        <StatCard title="Ruptures" value={stockStats.out} subValue="Réappro. urgent" icon={AlertTriangle} color="bg-rose-600" trend="down"/>
        <StatCard title="Stocks faibles" value={stockStats.low} subValue="Sous seuil min." icon={TrendingDown} color="bg-amber-500"/>
        <StatCard title="Catégories" value={categories.length} subValue={`${subcategories.length} sous-catégories`} icon={Boxes} color="bg-slate-800"/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <SectionHeader icon={AlertTriangle} title="Alertes Stock" color="text-amber-600"/>
          {stockAlerts.ruptures.length === 0 && stockAlerts.low.length === 0 ? (
            <div className="py-10 text-center"><CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2"/><p className="text-[10px] font-black text-slate-400 uppercase">Stock optimal</p></div>
          ) : (
            <div className="space-y-2">
              {stockAlerts.ruptures.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"/>
                  <p className="text-[10px] font-black text-slate-800 flex-1 truncate">{s.name}</p>
                  <span className="text-[9px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-lg">RUPTURE</span>
                </div>
              ))}
              {stockAlerts.low.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"/>
                  <p className="text-[10px] font-black text-slate-800 flex-1 truncate">{s.name}</p>
                  <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg">{s.currentLevel} / {s.minThreshold}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <SectionHeader icon={History} title="Mouvements Récents" badge={`${movements.length}`} color="text-indigo-600"/>
          <div className="space-y-2 overflow-y-auto max-h-60">
            {movements.slice(0, 10).map((m: any, i: number) => (
              <div key={m.id || i} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${m.type === 'IN' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                  {m.type === 'IN' ? <ArrowUpCircle size={12} className="text-emerald-600"/> : <ArrowDownCircle size={12} className="text-rose-600"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-800 truncate">{m.productName || 'Produit'}</p>
                  <p className="text-[8px] text-slate-400">{m.userRef || 'Système'} • {timeAgo(m.createdAt)}</p>
                </div>
                <span className={`text-[9px] font-black ${m.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {m.type === 'IN' ? '+' : '-'}{m.quantity}
                </span>
              </div>
            ))}
            {movements.length === 0 && <div className="py-8 text-center text-slate-300 text-[10px] font-black uppercase">Aucun mouvement récent</div>}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // SALES DASHBOARD
  // ============================================================
  const renderSalesDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Chiffre d'Affaires" value={fmtShort(salesStats.totalRevenue) + ' ' + currency.split(' ')[0]} subValue="Ventes enregistrées" icon={TrendingUp} color="bg-indigo-600" trend="up"/>
        <StatCard title="Ventes" value={sales.length} subValue="Transactions totales" icon={ShoppingBag} color="bg-emerald-600"/>
        <StatCard title="Clients actifs" value={customers.length} subValue="Portefeuille" icon={UserCheck} color="bg-sky-600"/>
        <StatCard title="Panier moyen" value={fmtShort(salesStats.avgBasket) + ' ' + currency.split(' ')[0]} subValue="Par transaction" icon={Target} color="bg-amber-500"/>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <SectionHeader icon={ShoppingBag} title="Mes Dernières Ventes" color="text-indigo-600"/>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-50">
              <th className="text-left text-[8px] font-black text-slate-400 uppercase pb-2 pr-3">Référence</th>
              <th className="text-left text-[8px] font-black text-slate-400 uppercase pb-2 pr-3">Client</th>
              <th className="text-right text-[8px] font-black text-slate-400 uppercase pb-2 pr-3">Montant</th>
              <th className="text-center text-[8px] font-black text-slate-400 uppercase pb-2">Statut</th>
            </tr></thead>
            <tbody>
              {sales.slice(0, 10).map((s: any) => (
                <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all">
                  <td className="py-2.5 pr-3 text-[10px] font-black text-slate-700">{s.reference || `#${String(s.id).slice(-6)}`}</td>
                  <td className="py-2.5 pr-3 text-[10px] text-slate-500 truncate max-w-[120px]">{s.customer || 'N/A'}</td>
                  <td className="py-2.5 pr-3 text-[10px] font-black text-slate-800 text-right">{Number(s.totalTtc).toLocaleString('fr-FR')}</td>
                  <td className="py-2.5 text-center">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase ${s.status === 'TERMINE' ? 'bg-emerald-100 text-emerald-700' : s.status === 'EN_COURS' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      {s.status === 'TERMINE' ? 'Soldé' : s.status === 'EN_COURS' ? 'En cours' : 'Annulé'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // EMPLOYEE DASHBOARD
  // ============================================================
  const renderEmployeeDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Produits Disponibles" value={stocks.length} subValue="Catalogue en rayon" icon={Package} color="bg-indigo-600"/>
        <StatCard title="Services Actifs" value={services.filter(s => s.isActive).length} subValue="Offres disponibles" icon={Sparkles} color="bg-amber-500"/>
        <StatCard title="Base Partenaires" value={customers.length} subValue="Clients enregistrés" icon={Users} color="bg-emerald-600"/>
      </div>
    </div>
  );

  // ============================================================
  // ROUTER
  // ============================================================
  const activeDashboard = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <RefreshCw className="animate-spin text-indigo-600" size={40}/>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Chargement du Centre de Commandement...</p>
        </div>
      );
    }
    if (userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN)) return renderAdminDashboard();
    if (userRoles.includes(UserRole.ACCOUNTANT)) return renderAccountantDashboard();
    if (userRoles.includes(UserRole.STOCK_MANAGER)) return renderStockManagerDashboard();
    if (userRoles.includes(UserRole.EMPLOYEE)) return renderEmployeeDashboard();
    return renderSalesDashboard();
  };

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase">
            {greeting}, <span className="text-indigo-600">{user.name}</span>
          </h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {userRoles.map(r => (
              <span key={r} className="text-slate-400 text-[8px] font-black uppercase tracking-widest border border-slate-200 px-2 py-0.5 rounded-lg bg-white shadow-sm">
                {r.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[9px] font-black uppercase tracking-widest">
          <ShieldCheck size={12}/> Connexion Sécurisée • Kernel v3.2.1
        </div>
      </div>

      {activeDashboard()}
    </div>
  );
};

export default Dashboard;

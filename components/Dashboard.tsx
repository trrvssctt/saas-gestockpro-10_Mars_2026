import React, { useMemo, useState, useEffect } from 'react';
// Added ShieldAlert, ArrowRight to the imports
import { 
  TrendingUp, Package, Users, ShieldCheck, 
  AlertTriangle, BrainCircuit, Zap, RefreshCw, 
  Wallet, Landmark, Calendar, Target, Activity, 
  Layers, ShoppingCart, ArrowRightCircle, Boxes,
  Clock, CheckCircle2, UserPlus, FileText, ArrowUpRight,
  TrendingDown, ShoppingBag, UserCheck, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, GitMerge, LayoutGrid,
  History, MinusCircle, PlusCircle, Scale, Receipt,
  HandCoins, PiggyBank, Sparkles, Briefcase, Eye,
  Trophy, Medal, Star, AlertCircle, CreditCard,
  ShieldAlert, ArrowRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  Legend, ComposedChart, Line
} from 'recharts';
// Added StockItem to the imports
import { User, UserRole, StockItem } from '../types';
import { apiClient } from '../services/api';
import waveQr from '../assets/qr_code_marchant_wave.png';

const StatCard = ({ title, value, subValue, icon: Icon, color, trend }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all flex flex-col justify-between h-full overflow-hidden relative">
    <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:scale-110 transition-transform"><Icon size={80}/></div>
    <div className="flex justify-between items-start mb-6">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 tracking-tighter mt-1">{value}</h3>
      </div>
      <div className={`p-4 rounded-2xl ${color || ''} bg-opacity-10 ${(color || '').replace('bg-', 'text-')} shadow-inner`}><Icon size={24}/></div>
    </div>
    {subValue && (
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-2">
        <span className={trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'}>{subValue}</span>
      </p>
    )}
  </div>
);

const Dashboard: React.FC<{ user: User, currency: string, onNavigate?: (tab: string, meta?: any) => void }> = ({ user, currency, onNavigate }) => {
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  // Fix: StockItem type is now imported from ../types
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const userRoles = user.roles || [user.role];

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // If tenant admin or super admin, fetch consolidated KPI endpoint
        if (userRoles.includes(UserRole.ADMIN) || userRoles.includes(UserRole.SUPER_ADMIN)) {
          const res = await apiClient.get('/admin/dashboard');
          const payload = res.data || res;
          // map returned fields into local states
          setSales((payload.recentSales || []).concat([]));
          setCustomers(payload.latestCustomers || []);
          setStocks(Array.isArray(payload.stocks) ? payload.stocks : []);
          setServices([]);
          setUsersList(payload.users?.recent || []);
          setMovements(payload.recentMovements || []);
          setCategories([]);
          setSubcategories([]);
          // also set more granular pieces if returned
          // keep subscription if present
          if (payload.subscription) setSubscription(payload.subscription);
        } else {
          // Helper to normalize axios-like responses
          const toData = (r: any) => (r && r.data !== undefined) ? r.data : r;

          // Accountant should not call /stock (RBAC denies access) — fetch only sales/customers
          if (userRoles.includes(UserRole.ACCOUNTANT)) {
            const [salesRes, customersRes] = await Promise.all([
              apiClient.get('/sales'),
              apiClient.get('/customers')
            ]);
            setSales(toData(salesRes) || []);
            setCustomers(toData(customersRes) || []);
            setStocks([]);
            setServices([]);
            setUsersList([]);
            setMovements([]);
            setCategories([]);
            setSubcategories([]);
          } else {
            // For other non-admin roles, fetch stock + services. Stock managers get extra endpoints.
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
            } else {
              setMovements([]);
              setCategories([]);
              setSubcategories([]);
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

  // --- LOGIQUE ABONNEMENT ---
  const subAlert = useMemo(() => {
    // Accept both camelCase (`nextBillingDate`) and snake_case (`next_billing_date`)
    const subObj = subscription?.subscription || subscription;
    const nextBillingRaw = subObj?.nextBillingDate ?? subObj?.next_billing_date;
    if (!nextBillingRaw) return null;
    const expiry = new Date(nextBillingRaw);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Show warning starting 5 days before expiry. Expired when diffDays < 0.
    return {
      daysLeft: diffDays,
      isCritical: diffDays <= 5 && diffDays >= 0,
      isExpired: diffDays < 0,
      formattedDate: expiry.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })
    };
  }, [subscription]);

  // --- LOGIQUE PERFORMANCE EMPLOYES ---
  const staffPerformance = useMemo(() => {
    const perfMap: Record<string, any> = {};

    // Helper to ensure an operator is present in the map
    const ensureOp = (name: string | null, role: string | null = 'EMPLOYEE') => {
      const key = (name || 'UNKNOWN').toString();
      if (!perfMap[key]) {
        perfMap[key] = { name: key, role: role || 'EMPLOYEE', salesCount: 0, movCount: 0, score: 0 };
      }
      return perfMap[key];
    };

    // Seed from known users (recent users list) so we show proper display names/roles
    usersList.forEach((u: any) => {
      if (!u || !u.name) return;
      perfMap[u.name] = { name: u.name, role: u.role || 'EMPLOYEE', salesCount: 0, movCount: 0, score: 0 };
    });

    // Accumulate from sales (use operator field or operatorName)
    sales.forEach((s: any) => {
      const op = s.operator || s.operatorName || (s.operatorId ? `user-${s.operatorId}` : null) || 'SYSTEM';
      const entry = ensureOp(op, 'SALES');
      entry.salesCount += 1;
    });

    // Accumulate from movements (use userRef or userName)
    movements.forEach((m: any) => {
      const op = m.userRef || m.userName || m.user || 'SYSTEM';
      const entry = ensureOp(op, 'STOCK_MANAGER');
      entry.movCount += 1;
    });

    // Convert to array and compute weighted score
    const arr = Object.values(perfMap).map((u: any) => ({
      ...u,
      score: (Number(u.salesCount || 0) * 10) + (Number(u.movCount || 0) * 2)
    }));

    // Sort by score desc, then by salesCount
    arr.sort((a: any, b: any) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.salesCount || 0) - (a.salesCount || 0);
    });

    return arr;
  }, [usersList, sales, movements]);

  // --- LOGIQUE DE CALCULS SALES & FINANCE ---
  const salesStats = useMemo(() => {
    const validSales = sales.filter(s => s.status !== 'ANNULE');
    const totalRevenue = validSales.reduce((sum, s) => sum + parseFloat(s.totalTtc || 0), 0);
    const totalCollected = validSales.reduce((sum, s) => sum + parseFloat(s.amountPaid || 0), 0);
    const totalUnpaid = totalRevenue - totalCollected;
    const overdueCount = validSales.filter(s => s.status === 'EN_COURS').length;
    
    const recoveryData = [
      { name: 'Encaissé', value: totalCollected, color: '#10b981' },
      { name: 'À Recouvrer', value: totalUnpaid, color: '#f43f5e' }
    ];

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSales = validSales.filter(s => new Date(s.createdAt) >= startOfMonth);
    const monthRevenue = monthSales.reduce((sum, s) => sum + parseFloat(s.totalTtc || 0), 0);

    return {
      totalRevenue,
      totalCollected,
      totalUnpaid,
      overdueCount,
      recoveryData,
      monthRevenue,
      totalSalesCount: sales.length,
      avgBasket: sales.length > 0 ? totalRevenue / sales.length : 0
    };
  }, [sales]);

  // --- LOGIQUE STOCK ---
  const stockStats = useMemo(() => {
    const out = stocks.filter(s => (s.currentLevel || 0) <= 0).length;
    const low = stocks.filter(s => (s.currentLevel || 0) > 0 && (s.minThreshold != null) && (s.currentLevel <= s.minThreshold)).length;
    return { out, low, total: stocks.length };
  }, [stocks]);

  // --- PAYMENT MODAL STATE FOR RE-SUBSCRIPTION VIA WAVE QR ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [txReference, setTxReference] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const processSubscriptionPayment = async () => {
    setIsProcessingPayment(true);
    try {
      const transactionId = txReference || `TX-${Date.now()}`;
      const payload = {
        planId: subscription?.subscription?.planId || subscription?.planId || 'DEFAULT',
        paymentMethod: 'WAVE',
        transactionId,
        phone: phoneNumber,
        status: 'PENDING'
      };

      await apiClient.post('/billing/upgrade', payload);

      // optimistic local update
      setSubscription((prev: any) => ({ ...(prev || {}), status: 'PENDING' }));
      setPaymentSuccess(true);
      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentSuccess(false);
        setTxReference('');
        setPhoneNumber('');
      }, 2200);
    } catch (err) {
      console.error('Payment error', err);
      // Try to show the API error message when available
      const serverMsg = err?.message || err?.error || (err && typeof err === 'string' ? err : null);
      alert("Erreur lors de l'enregistrement du paiement. " + (serverMsg || 'Veuillez réessayer.'));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const renderAdminDashboard = () => (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* ALERTE ABONNEMENT CRITIQUE (affiche seulement si échéance dans <=5 jours) */}
      {subAlert && subAlert.isCritical && (
        <div className={`p-8 rounded-[2.5rem] border-2 flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse shadow-2xl ${subAlert.isExpired ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-6 text-center md:text-left">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${subAlert.isExpired ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}`}>
              {/* Fix: ShieldAlert is now imported from lucide-react */}
              <ShieldAlert size={32} />
            </div>
            <div>
              <h3 className={`text-xl font-black uppercase tracking-tight ${subAlert.isExpired ? 'text-rose-700' : 'text-amber-700'}`}>
                {subAlert.isExpired ? 'Abonnement Expiré' : 'Abonnement en fin de cycle'}
              </h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">
                {subAlert.isExpired 
                  ? `Votre instance est en mode restreint depuis le ${subAlert.formattedDate}.` 
                  : `Votre licence expire dans ${subAlert.daysLeft} jours (le ${subAlert.formattedDate}).`}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowPaymentModal(true)}
            className={`px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 ${subAlert.isExpired ? 'bg-rose-600 text-white hover:bg-black' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
          >
            <CreditCard size={18}/> RÉGULARISER MAINTENANT
          </button>
        </div>
      )}

          {/* PAYMENT MODAL FOR WAVE QR */}
          {showPaymentModal && (
            <div className="fixed inset-0 z-[900] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
              <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
                <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center">
                  <h3 className="text-lg font-black uppercase">Réaliser le paiement - Wave</h3>
                  <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </div>
                <div className="p-8">
                  {paymentSuccess ? (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-emerald-500 text-white rounded-full mx-auto flex items-center justify-center mb-6"><CheckCircle2 size={36}/></div>
                      <h4 className="text-xl font-black">Paiement enregistré</h4>
                      <p className="text-sm text-slate-500">Le paiement est en attente de validation.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <div className="flex flex-col items-center gap-4">
                        <img src={waveQr} alt="Wave QR" className="w-64 h-64 object-contain rounded-xl shadow-md border" />
                        <p className="text-[10px] text-slate-500">Scannez le QR avec l'app Wave puis saisissez la référence ci-dessous.</p>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400">Numéro téléphone (optionnel)</label>
                        <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Ex: 22177xxxxxxx" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none" />
                        <label className="text-[10px] font-black uppercase text-slate-400">Référence Transaction Wave</label>
                        <input value={txReference} onChange={e => setTxReference(e.target.value)} placeholder="Référence fournie par Wave" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none" />

                        <div className="flex items-center gap-3 pt-4">
                          <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 rounded-2xl border border-slate-200 font-black uppercase text-sm">Annuler</button>
                          <button disabled={isProcessingPayment} onClick={processSubscriptionPayment} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-black uppercase text-sm disabled:opacity-50">{isProcessingPayment ? 'Traitement...' : 'Enregistrer paiement'}</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

      {/* KPI GRID HOLISTIQUE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Chiffre d'Affaires" value={`${salesStats.totalRevenue.toLocaleString()} ${currency}`} subValue={`+${salesStats.monthRevenue.toLocaleString()} ce mois`} icon={TrendingUp} color="bg-indigo-600" trend="up" />
        <StatCard title="Trésorerie Réelle" value={`${salesStats.totalCollected.toLocaleString()} ${currency}`} subValue="Flux nets encaissés" icon={Wallet} color="bg-emerald-500" trend="up" />
        <StatCard title="Créances Clients" value={`${salesStats.totalUnpaid.toLocaleString()} ${currency}`} subValue={`${salesStats.overdueCount} factures en retard`} icon={Landmark} color="bg-rose-500" trend="down" />
        <StatCard title="Performance Stock" value={stockStats.out > 0 ? "Critique" : "Optimale"} subValue={`${stockStats.out} ruptures / ${stockStats.low} alertes`} icon={Package} color="bg-amber-500" trend={stockStats.out > 0 ? 'down' : 'up'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEADERBOARD DES EMPLOYÉS (RH & COMPÉTENCE) */}
        <div className="lg:col-span-5 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8 flex flex-col">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-3">
              <Trophy className="text-amber-500" size={24}/> Classement Performance
            </h3>
            <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase">Période Totale</span>
          </div>
          
          <div className="space-y-4 flex-1">
            {staffPerformance.slice(0, 5).map((staff, idx) => (
              <div key={idx} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-transparent hover:border-indigo-100 hover:bg-white transition-all group">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-slate-900 shadow-sm uppercase group-hover:scale-110 transition-transform">
                      {staff.name.charAt(0)}
                    </div>
                    {idx === 0 && <div className="absolute -top-2 -right-2 bg-amber-400 text-white p-1 rounded-full border-2 border-white shadow-sm"><Medal size={12}/></div>}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{staff.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{(staff.role || '').replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end text-indigo-600">
                    <Zap size={10} fill="currentColor"/>
                    <p className="text-sm font-black">{staff.score}</p>
                  </div>
                  <p className="text-[8px] text-slate-400 font-bold uppercase">{staff.salesCount} ventes • {staff.movCount} flux</p>
                </div>
              </div>
            ))}
            {staffPerformance.length === 0 && (
              <div className="py-20 text-center text-slate-300 font-black uppercase text-[10px]">Aucune activité tracé</div>
            )}
          </div>
          
          <button onClick={() => onNavigate?.('governance')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 mt-4">
            {/* Fix: ArrowRight is now imported from lucide-react */}
            GESTION DES ACCÈS <ArrowRight size={14}/>
          </button>
        </div>

        {/* GRAPHIQUE PERFORMANCE GLOBALE */}
        <div className="lg:col-span-7 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-3">
              <Activity className="text-indigo-600" size={24}/> Pilotage Analytique
            </h3>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[8px] font-black rounded-full uppercase tracking-widest border border-indigo-100">Live Engine</div>
            </div>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sales.slice(-10).map((s: any) => ({
                date: new Date(s.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
                total: parseFloat(s.totalTtc),
                paid: parseFloat(s.amountPaid)
              }))}>
                <defs>
                  <linearGradient id="colorAdmin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-kernel)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="var(--primary-kernel)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWait: 700, fill: '#64748b'}} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="total" name="Total TTC" stroke="var(--primary-kernel)" strokeWidth={4} fill="url(#colorAdmin)" />
                <Bar dataKey="paid" name="Encaissé" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-50">
             <div className="text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Panier Moyen</p>
                <p className="text-xl font-black text-slate-900">{Math.round(salesStats.avgBasket).toLocaleString()} {currency.split(' ')[0]}</p>
             </div>
             <div className="text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Taux Recouvrement</p>
                <p className="text-xl font-black text-emerald-600">{Math.round((salesStats.totalCollected / (salesStats.totalRevenue || 1)) * 100)}%</p>
             </div>
             <div className="text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume Stock</p>
                <p className="text-xl font-black text-indigo-600">{stockStats.total} Réf.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAccountantDashboard = () => (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Total des ventes" value={`${salesStats.totalRevenue.toLocaleString()} ${currency}`} subValue="Période totale" icon={HandCoins} color="bg-indigo-600" />
        <StatCard title="Total encaissé" value={`${salesStats.totalCollected.toLocaleString()} ${currency}`} subValue="Cash flow réel" icon={PiggyBank} color="bg-emerald-600" trend="up" />
        <StatCard title="Total impayé" value={`${salesStats.totalUnpaid.toLocaleString()} ${currency}`} subValue="Balance débitrice" icon={Landmark} color="bg-rose-600" trend="down" />
        <StatCard title="Factures en retard" value={salesStats.overdueCount} subValue="Actions requises" icon={Clock} color="bg-amber-500" />
        <StatCard title="À recouvrer" value={`${salesStats.totalUnpaid.toLocaleString()} ${currency}`} subValue="Potentiel trésorerie" icon={Target} color="bg-slate-900" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-3">
            <Scale className="text-indigo-600" size={20} /> Encaissements vs Impayés
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={salesStats.recoveryData} dataKey="value" innerRadius={50} outerRadius={90} paddingAngle={4}>
                  {salesStats.recoveryData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${v.toLocaleString()} ${currency.split(' ')[0]}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStockManagerDashboard = () => (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Total Références" value={stocks.length} subValue="Catalogue Actif" icon={Boxes} color="bg-indigo-600" />
        <StatCard title="Ruptures" value={stockStats.out} subValue="Réappro. Urgent" icon={AlertTriangle} color="bg-rose-600" trend="down" />
        <StatCard title="Stocks faibles" value={stockStats.low} subValue="Sous le seuil min." icon={TrendingDown} color="bg-amber-500" />
        <StatCard title="Flux récents" value={movements.length} subValue="7 derniers jours" icon={History} color="bg-emerald-500" />
        <StatCard title="Catégories" value={categories.length} subValue={`${subcategories.length} sous-catégories`} icon={GitMerge} color="bg-slate-800" />
      </div>
    </div>
  );

  const renderSalesDashboard = () => (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Chiffre d'Affaires" value={`${salesStats.totalRevenue.toLocaleString()} ${currency}`} subValue="Ventes enregistrées" icon={TrendingUp} color="bg-indigo-600" trend="up" />
        <StatCard title="Nombre de ventes" value={sales.length} subValue="Transactions totales" icon={ShoppingBag} color="bg-emerald-600" />
        <StatCard title="Clients actifs" value={customers.length} subValue="Portefeuille" icon={UserCheck} color="bg-blue-600" />
        <StatCard title="Panier moyen" value={`${Math.round(salesStats.avgBasket).toLocaleString()} ${currency.split(' ')[0]}`} subValue="Panier moyen" icon={Target} color="bg-amber-500" />
      </div>
    </div>
  );

  const renderEmployeeDashboard = () => (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Produits Disponibles" value={stocks.length} subValue="Catalogue en rayon" icon={Package} color="bg-indigo-600" />
        <StatCard title="Services Actifs" value={services.filter(s => s.isActive).length} subValue="Offres disponibles" icon={Sparkles} color="bg-amber-500" />
        <StatCard title="Base Partenaires" value={customers.length} subValue="Clients enregistrés" icon={Users} color="bg-emerald-600" />
      </div>
    </div>
  );

  const activeDashboard = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <RefreshCw className="animate-spin text-indigo-600" size={48} />
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Initialisation du Centre de Commandement...</p>
        </div>
      );
    }
    
    if (userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN)) return renderAdminDashboard();
    if (userRoles.includes(UserRole.ACCOUNTANT)) return renderAccountantDashboard();
    if (userRoles.includes(UserRole.STOCK_MANAGER)) return renderStockManagerDashboard();
    if (userRoles.includes(UserRole.EMPLOYEE)) return renderEmployeeDashboard();
    return renderSalesDashboard();
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
            Hello, <span className="text-indigo-600">{user.name}</span>
          </h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {userRoles.map(r => (
              <span key={r} className="text-slate-400 text-[9px] font-black uppercase tracking-widest border border-slate-200 px-2 py-0.5 rounded-lg italic bg-white shadow-sm">
                Session: {r.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
          <ShieldCheck size={14} /> Connexion Sécurisée • Kernel v3.2.1
        </div>
      </div>

      {activeDashboard()}
    </div>
  );
};

export default Dashboard;
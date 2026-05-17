import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Search, Eye, X, Loader2, Calendar, CheckCircle2,
  AlertTriangle, Ban, RefreshCw, ChevronDown,
  ChevronRight, User as UserIcon, Sparkles, FileText,
  Receipt, Clock, TrendingUp, Zap, ExternalLink,
  Filter, ArrowUpDown, Info, XCircle, ShieldAlert,
  Download, CreditCard, Pause, Play, Trash2, Edit3
} from 'lucide-react';
import { apiClient } from '../services/api';
import { useToast } from './ToastProvider';
import DocumentPreview from './DocumentPreview';

interface RecurringContractsProps {
  currency: string;
  onNavigate?: (tab: string) => void;
  tenantSettings?: any;
}

const FREQ_LABELS: Record<string, { label: string; short: string; color: string }> = {
  HEBDOMADAIRE: { label: 'Hebdomadaire', short: '7j', color: 'bg-violet-100 text-violet-700' },
  MENSUEL:      { label: 'Mensuel',      short: '1m', color: 'bg-blue-100 text-blue-700' },
  TRIMESTRIEL:  { label: 'Commercial (Trimestriel)', short: '3m', color: 'bg-cyan-100 text-cyan-700' }
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  ACTIF:    { label: 'Actif',     dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  TERMINE:  { label: 'Terminé',   dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-500 border border-slate-200' },
  ANNULE:   { label: 'Annulé',    dot: 'bg-red-400',     badge: 'bg-red-50 text-red-600 border border-red-200' },
  EN_PAUSE: { label: 'En pause',  dot: 'bg-yellow-400',  badge: 'bg-yellow-50 text-yellow-700 border border-yellow-200' }
};

const INST_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  EN_ATTENTE: { label: 'En attente', color: 'bg-amber-50 text-amber-700 border border-amber-200', icon: <Clock size={11} /> },
  PAYE:       { label: 'Payée',      color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: <CheckCircle2 size={11} /> },
  EN_RETARD:  { label: 'En retard',  color: 'bg-red-50 text-red-600 border border-red-200', icon: <AlertTriangle size={11} /> },
  ANNULE:     { label: 'Annulée',    color: 'bg-slate-50 text-slate-400 border border-slate-200', icon: <Ban size={11} /> }
};

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'MTN_MOMO', label: 'MTN MoMo' },
  { value: 'TRANSFER', label: 'Virement' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'STRIPE', label: 'Stripe' }
];

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces', ORANGE_MONEY: 'Orange Money', WAVE: 'Wave',
  MTN_MOMO: 'MTN MoMo', TRANSFER: 'Virement bancaire', CHEQUE: 'Chèque', STRIPE: 'Stripe'
};

const RecurringContracts: React.FC<RecurringContractsProps> = ({ currency, onNavigate, tenantSettings }) => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [freqFilter, setFreqFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<'date' | 'amount' | 'progress'>('date');

  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDocForSale, setShowDocForSale] = useState<any>(null);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const generateCalledRef = useRef(false);

  const showToast = useToast();

  const emptyForm = {
    title: '', description: '', customerId: '', walkinName: '', walkinPhone: '',
    serviceItems: [] as { serviceId: string; name: string; unitPrice: string; quantity: number }[],
    frequency: 'MENSUEL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '', numberOfInstallments: 1, installmentAmount: '', notes: ''
  };
  const [form, setForm] = useState({ ...emptyForm });

  // ── Chargement + auto-génération au montage ──────────────────────────────
  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ctr, cust, svc] = await Promise.all([
        apiClient.get('/recurring'),
        apiClient.get('/customers'),
        apiClient.get('/services')
      ]);
      setContracts(Array.isArray(ctr) ? ctr : []);
      setCustomers(Array.isArray(cust) ? cust : []);
      setServices(Array.isArray(svc) ? svc : []);
    } catch {
      if (!silent) showToast('Erreur de chargement', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const triggerGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/recurring/generate-sales', {});
      if (res.generated > 0) {
        setGeneratedCount(res.generated);
        showToast(`${res.generated} facture(s) auto-générée(s) dans Ventes !`, 'success');
        await fetchAll(true);
        setTimeout(() => setGeneratedCount(null), 5000);
      }
    } catch {
      // silencieux
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchAll();
    if (!generateCalledRef.current) {
      generateCalledRef.current = true;
      triggerGenerate();
    }
  }, []);

  // ── Statistiques ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const allInstallments = contracts.flatMap(c => c.installments || []);
    return {
      total: contracts.length,
      actifs: contracts.filter(c => c.status === 'ACTIF').length,
      enPause: contracts.filter(c => c.status === 'EN_PAUSE').length,
      termines: contracts.filter(c => c.status === 'TERMINE').length,
      annules: contracts.filter(c => c.status === 'ANNULE').length,
      avecRetard: contracts.filter(c => (c.installments || []).some((i: any) => i.status === 'EN_RETARD')).length,
      totalDu: contracts.reduce((s, c) => s + Math.max(0, parseFloat(c.totalAmount || 0) - parseFloat(c.amountPaid || 0)), 0),
      totalEncaisse: contracts.reduce((s, c) => s + parseFloat(c.amountPaid || 0), 0),
      enAttente: allInstallments.filter(i => i.status === 'EN_ATTENTE').length,
      enRetard: allInstallments.filter(i => i.status === 'EN_RETARD').length,
      facturees: allInstallments.filter(i => i.generatedSaleId).length
    };
  }, [contracts]);

  // ── Filtrage + tri ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = contracts.filter(c => {
      if (statusFilter === 'RETARD') {
        if (!(c.installments || []).some((i: any) => i.status === 'EN_RETARD')) return false;
      } else if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }
      if (freqFilter !== 'ALL' && c.frequency !== freqFilter) return false;
      const q = search.toLowerCase();
      return !q ||
        c.title?.toLowerCase().includes(q) ||
        c.customer?.companyName?.toLowerCase().includes(q) ||
        c.walkinName?.toLowerCase().includes(q) ||
        c.service?.name?.toLowerCase().includes(q);
    });
    list = [...list].sort((a, b) => {
      if (sortKey === 'amount') return parseFloat(b.totalAmount) - parseFloat(a.totalAmount);
      if (sortKey === 'progress') {
        const pctA = a.numberOfInstallments > 0 ? (a.installments || []).filter((i: any) => i.status === 'PAYE').length / a.numberOfInstallments : 0;
        const pctB = b.numberOfInstallments > 0 ? (b.installments || []).filter((i: any) => i.status === 'PAYE').length / b.numberOfInstallments : 0;
        return pctB - pctA;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    return list;
  }, [contracts, statusFilter, freqFilter, search, sortKey]);

  // ── Date de fin suggérée ─────────────────────────────────────────────────
  const suggestEndDate = () => {
    if (!form.startDate || !form.numberOfInstallments) return;
    const start = new Date(form.startDate);
    const n = parseInt(String(form.numberOfInstallments));
    if (n < 1) return;
    let end = new Date(start);
    if (form.frequency === 'HEBDOMADAIRE') end.setDate(end.getDate() + 7 * (n - 1));
    else if (form.frequency === 'MENSUEL') end.setMonth(end.getMonth() + (n - 1));
    else end.setMonth(end.getMonth() + 3 * (n - 1));
    setForm(f => ({ ...f, endDate: end.toISOString().split('T')[0] }));
  };

  // Montant HT calculé depuis les lignes de service
  const serviceLineTotal = form.serviceItems.reduce(
    (sum, s) => sum + (parseFloat(s.unitPrice) || 0) * (s.quantity || 1),
    0
  );
  const totalAmount = parseFloat(String(form.installmentAmount) || '0') * parseInt(String(form.numberOfInstallments) || '1');

  // ── Constantes de validation fréquence ──────────────────────────────────
  const FREQ_MIN_DAYS: Record<string, number> = { HEBDOMADAIRE: 7, MENSUEL: 28, TRIMESTRIEL: 85 };
  const FREQ_EXPECTED_DAYS: Record<string, number> = { HEBDOMADAIRE: 7, MENSUEL: 30.44, TRIMESTRIEL: 91.31 };
  const FREQ_TOLERANCE: Record<string, number> = { HEBDOMADAIRE: 2, TRIMESTRIEL: 14, MENSUEL: 7 };
  const FREQ_LABEL_SHORT: Record<string, string> = { HEBDOMADAIRE: '7 jours', MENSUEL: '~30 jours', TRIMESTRIEL: '~91 jours' };

  // ── Validation complète du formulaire ─────────────────────────────────────
  const formErrors = useMemo(() => {
    const e: Record<string, string> = {};

    // Titre
    if (!form.title.trim()) e.title = 'Le titre est obligatoire.';

    // Client : fichier OU nom de passage
    if (!form.customerId && !form.walkinName.trim()) {
      e.client = 'Sélectionnez un client du fichier ou saisissez un nom de client de passage.';
    }

    // Services : au moins un requis pour la facturation automatique
    if (!form.serviceItems || form.serviceItems.length === 0) {
      e.service = 'Ajoutez au moins un service (utilisé pour générer les factures automatiques).';
    } else if (form.serviceItems.some(s => !s.serviceId)) {
      e.service = 'Chaque ligne de service doit avoir un service sélectionné.';
    }

    // Montant
    const amt = parseFloat(String(form.installmentAmount));
    if (!form.installmentAmount || isNaN(amt) || amt <= 0) {
      e.installmentAmount = 'Le montant par échéance doit être supérieur à 0.';
    }

    // Nombre d'échéances
    const n = parseInt(String(form.numberOfInstallments));
    if (!n || n < 1) e.numberOfInstallments = 'Minimum 1 échéance.';
    else if (n > 520) e.numberOfInstallments = 'Maximum 520 échéances (environ 10 ans hebdomadaire).';

    // Date de début
    if (!form.startDate) {
      e.startDate = 'La date de début est obligatoire.';
    }

    // Date de fin — optionnelle (calculée automatiquement selon fréquence si absente)
    if (form.endDate && form.startDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end <= start) {
        e.endDate = 'La date de fin doit être strictement postérieure à la date de début.';
      } else {
        const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
        const minDays = FREQ_MIN_DAYS[form.frequency] ?? 7;
        if (diffDays < minDays) {
          e.endDate = `Durée trop courte pour la fréquence "${FREQ_LABELS[form.frequency]?.label}" (minimum ${minDays} jours).`;
        } else if (diffDays > 365 * 30) {
          e.endDate = 'Durée excessive (maximum 30 ans).';
        }
      }
    }

    return e;
  }, [form]);

  // Avertissements non-bloquants (affichés mais n'empêchent pas la soumission)
  const formWarnings = useMemo(() => {
    const w: Record<string, string> = {};
    if (form.startDate) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(form.startDate) < today) {
        w.startDate = 'La date de début est dans le passé.';
      }
    }
    if (form.startDate && form.endDate && parseInt(String(form.numberOfInstallments)) > 1 && !formErrors.endDate && !formErrors.startDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      const n = parseInt(String(form.numberOfInstallments));
      const totalDays = (end.getTime() - start.getTime()) / 86400000;
      const actualInterval = totalDays / (n - 1);
      const expected = FREQ_EXPECTED_DAYS[form.frequency] ?? 30;
      const tolerance = FREQ_TOLERANCE[form.frequency] ?? 7;
      if (Math.abs(actualInterval - expected) > tolerance) {
        w.coherence = `Intervalle calculé : ${Math.round(actualInterval)} j — attendu pour "${FREQ_LABELS[form.frequency]?.label}" : ${FREQ_LABEL_SHORT[form.frequency]}. Cliquez "Auto" pour recalculer.`;
      }
    }
    return w;
  }, [form, formErrors]);

  // Résumé calendrier en temps réel (seulement si endDate fournie)
  const calSummary = useMemo(() => {
    if (!form.startDate || !form.endDate || formErrors.startDate || formErrors.endDate) return null;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (end <= start) return null;
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
    const diffMonths = parseFloat((diffDays / 30.44).toFixed(1));
    const n = parseInt(String(form.numberOfInstallments)) || 1;
    const intervalDays = n > 1 ? Math.round(diffDays / (n - 1)) : diffDays;
    const expected = FREQ_EXPECTED_DAYS[form.frequency] ?? 30;
    const tolerance = FREQ_TOLERANCE[form.frequency] ?? 7;
    const isCoherent = n === 1 || Math.abs(intervalDays - expected) <= tolerance;
    return { diffDays, diffMonths, intervalDays, isCoherent };
  }, [form, formErrors]);

  const hasBlockingErrors = Object.keys(formErrors).length > 0;

  // ── Création ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setSubmitAttempted(true);
    if (hasBlockingErrors) {
      showToast('Corrigez les erreurs indiquées avant de continuer.', 'error'); return;
    }
    setActionLoading(true);
    try {
      await apiClient.post('/recurring', {
        ...form,
        customerId: form.customerId || null,
        serviceItems: form.serviceItems,
        serviceId: form.serviceItems[0]?.serviceId || null,
        numberOfInstallments: parseInt(String(form.numberOfInstallments)),
        installmentAmount: parseFloat(String(form.installmentAmount)),
        totalAmount
      });
      showToast('Contrat créé avec succès !', 'success');
      setShowCreate(false);
      setForm({ ...emptyForm });
      setSubmitAttempted(false);
      await fetchAll(true);
    } catch (e: any) {
      showToast(e?.message || 'Erreur lors de la création', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Annulation contrat ───────────────────────────────────────────────────
  const handleCancel = async (contractId: string) => {
    if (!confirm('Annuler ce contrat ? Les échéances en attente seront annulées.')) return;
    try {
      await apiClient.post(`/recurring/${contractId}/cancel`, {});
      showToast('Contrat annulé.', 'success');
      await fetchAll(true);
      setShowDetail(null);
    } catch (e: any) {
      showToast(e?.message || 'Erreur', 'error');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedContracts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openDetail = async (contract: any) => {
    setShowDetail(contract);
    setDetailLoading(true);
    try {
      const fresh = await apiClient.get(`/recurring/${contract.id}`);
      setShowDetail(fresh);
    } catch {
      // keep basic data on error
    } finally {
      setDetailLoading(false);
    }
  };

  const openEditMode = (contract: any) => {
    // Restaurer les serviceItems depuis le contrat, ou construire depuis serviceId si ancienne donnée
    const existingItems = Array.isArray(contract.serviceItems) && contract.serviceItems.length > 0
      ? contract.serviceItems
      : (contract.serviceId || contract.service_id)
        ? [{ serviceId: contract.serviceId || contract.service_id, name: contract.service?.name || '', unitPrice: String(parseFloat(contract.installmentAmount || 0) / 1.18), quantity: 1 }]
        : [];
    setForm({
      title: contract.title || '',
      description: contract.description || '',
      customerId: contract.customerId || contract.customer_id || '',
      walkinName: contract.walkinName || contract.walkin_name || '',
      walkinPhone: contract.walkinPhone || contract.walkin_phone || '',
      serviceItems: existingItems,
      frequency: contract.frequency || 'MENSUEL',
      startDate: contract.startDate || contract.start_date || '',
      endDate: contract.endDate || contract.end_date || '',
      numberOfInstallments: contract.numberOfInstallments || contract.number_of_installments || 1,
      installmentAmount: contract.installmentAmount || contract.installment_amount || '',
      notes: contract.notes || ''
    });
    setEditingContractId(contract.id);
    setSubmitAttempted(false);
    setShowCreate(true);
  };

  const handleUpdate = async () => {
    setSubmitAttempted(true);
    if (hasBlockingErrors) { showToast('Corrigez les erreurs avant de continuer.', 'error'); return; }
    setActionLoading(true);
    try {
      await apiClient.put(`/recurring/${editingContractId}`, {
        ...form,
        customerId: form.customerId || null,
        serviceItems: form.serviceItems,
        serviceId: form.serviceItems[0]?.serviceId || null,
        numberOfInstallments: parseInt(String(form.numberOfInstallments)),
        installmentAmount: parseFloat(String(form.installmentAmount)),
        totalAmount
      });
      showToast('Contrat mis à jour !', 'success');
      setShowCreate(false);
      setEditingContractId(null);
      setForm({ ...emptyForm });
      setSubmitAttempted(false);
      if (showDetail) {
        const fresh = await apiClient.get(`/recurring/${editingContractId}`);
        setShowDetail(fresh);
      }
      await fetchAll(true);
    } catch (e: any) {
      showToast(e?.message || 'Erreur lors de la mise à jour', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async (contractId: string) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/recurring/${contractId}/pause`, {});
      showToast('Contrat mis en pause — aucune facturation ni alerte jusqu\'à la reprise.', 'success');
      await fetchAll(true);
      if (showDetail?.id === contractId) {
        const fresh = await apiClient.get(`/recurring/${contractId}`);
        setShowDetail(fresh);
      }
    } catch (e: any) {
      showToast(e?.message || 'Erreur', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async (contractId: string) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/recurring/${contractId}/resume`, {});
      showToast('Contrat relancé — la facturation automatique reprend.', 'success');
      await fetchAll(true);
      if (showDetail?.id === contractId) {
        const fresh = await apiClient.get(`/recurring/${contractId}`);
        setShowDetail(fresh);
      }
    } catch (e: any) {
      showToast(e?.message || 'Erreur', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (contractId: string) => {
    if (!confirm('Supprimer définitivement ce contrat ? Cette action est irréversible.')) return;
    setActionLoading(true);
    try {
      await apiClient.delete(`/recurring/${contractId}`);
      showToast('Contrat supprimé.', 'success');
      setShowDetail(null);
      await fetchAll(true);
    } catch (e: any) {
      showToast(e?.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const fmt = (n: any) => parseFloat(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0 });
  const pct = (paid: number, total: number) => total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Calendar size={20} className="text-white" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Contrats Récurrents</h1>
            </div>
            <p className="text-slate-500 text-sm font-medium ml-13 pl-1">Loyers, abonnements, services à échéances — facturation automatique</p>
          </div>
          <div className="flex items-center gap-3">
            {generating && (
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black">
                <Loader2 size={13} className="animate-spin" /> Vérification des échéances...
              </div>
            )}
            {generatedCount !== null && generatedCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black border border-emerald-200">
                <Zap size={13} /> {generatedCount} facture(s) créées dans Ventes
              </div>
            )}
            <button
              onClick={() => fetchAll()}
              className="p-3 border border-slate-200 rounded-xl hover:bg-white transition-all shadow-sm"
              title="Rafraîchir"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-indigo-400' : 'text-slate-500'} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-200 active:scale-95"
            >
              <Plus size={16} /> Nouveau Contrat
            </button>
          </div>
        </div>

        {/* ── Bandeau info facturation auto ──────────────────────────────── */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-4 mb-6 flex items-center gap-3 text-white">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Zap size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm">Facturation automatique activée</p>
            <p className="text-white/70 text-xs mt-0.5">5 jours avant chaque échéance, une facture est auto-créée dans <strong>Ventes & Factures</strong> et la créance apparaît dans <strong>Recouvrement</strong>.</p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('sales')}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-black transition-all"
            >
              Voir Ventes <ExternalLink size={11} />
            </button>
          )}
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Encaissé */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-2xl p-4 text-white shadow-lg shadow-emerald-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-black">{fmt(stats.totalEncaisse)}</p>
              <p className="text-xs text-white/80 font-semibold">{currency} encaissé</p>
            </div>
          </div>
          {/* Restant dû */}
          <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
              <Info size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-amber-700">{fmt(stats.totalDu)}</p>
              <p className="text-xs text-slate-400 font-medium">{currency} restant dû</p>
            </div>
          </div>
          {/* Échéances en retard */}
          <div
            onClick={() => setStatusFilter('RETARD')}
            className={`rounded-2xl p-4 border shadow-sm flex items-center gap-3 cursor-pointer transition-all hover:shadow-md ${
              stats.enRetard > 0 ? 'border-red-200 bg-red-50/40 hover:bg-red-50' : 'border-slate-100 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stats.enRetard > 0 ? 'bg-red-100' : 'bg-slate-50'}`}>
              <AlertTriangle size={18} className={stats.enRetard > 0 ? 'text-red-500' : 'text-slate-300'} />
            </div>
            <div>
              <p className={`text-2xl font-black ${stats.enRetard > 0 ? 'text-red-600' : 'text-slate-300'}`}>{stats.enRetard}</p>
              <p className="text-xs text-slate-400 font-medium">échéances en retard</p>
            </div>
          </div>
          {/* Facturées auto */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
              <Receipt size={18} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-indigo-600">{stats.facturees}</p>
              <p className="text-xs text-slate-400 font-medium">facturées dans Ventes</p>
            </div>
          </div>
        </div>

        {/* ── Onglets statut ──────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-100 rounded-2xl p-1.5 mb-4 shadow-sm overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {[
              { key: 'ALL',      label: 'Tous',       count: stats.total,      icon: <Filter size={12} />,         active: 'bg-indigo-600 text-white shadow-md',  inactive: 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700' },
              { key: 'ACTIF',    label: 'Actifs',     count: stats.actifs,     icon: <TrendingUp size={12} />,     active: 'bg-emerald-600 text-white shadow-md', inactive: 'text-emerald-700 hover:bg-emerald-50' },
              { key: 'EN_PAUSE', label: 'En pause',   count: stats.enPause,    icon: <Pause size={12} />,          active: 'bg-yellow-500 text-white shadow-md',  inactive: 'text-yellow-700 hover:bg-yellow-50' },
              { key: 'RETARD',   label: 'En retard',  count: stats.avecRetard, icon: <AlertTriangle size={12} />,  active: 'bg-red-600 text-white shadow-md',     inactive: 'text-red-600 hover:bg-red-50' },
              { key: 'TERMINE',  label: 'Terminés',   count: stats.termines,   icon: <CheckCircle2 size={12} />,   active: 'bg-slate-700 text-white shadow-md',   inactive: 'text-slate-500 hover:bg-slate-100' },
              { key: 'ANNULE',   label: 'Annulés',    count: stats.annules,    icon: <Ban size={12} />,            active: 'bg-rose-600 text-white shadow-md',    inactive: 'text-rose-600 hover:bg-rose-50' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                  statusFilter === tab.key ? tab.active : tab.inactive
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className={`min-w-[20px] text-center px-1.5 py-0.5 rounded-md text-[10px] font-black transition-all ${
                  statusFilter === tab.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Barre recherche + fréquence + tri ───────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par titre, client ou service..."
              className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X size={14} />
              </button>
            )}
          </div>
          {/* Fréquence */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
            {[
              { key: 'ALL', label: 'Toutes' },
              { key: 'HEBDOMADAIRE', label: '7j' },
              { key: 'MENSUEL', label: '1 mois' },
              { key: 'TRIMESTRIEL', label: '3 mois' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFreqFilter(f.key)}
                className={`px-3 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                  freqFilter === f.key
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Tri */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
            {[
              { key: 'date',     label: 'Date',       icon: <Calendar size={11} /> },
              { key: 'amount',   label: 'Montant',    icon: <ArrowUpDown size={11} /> },
              { key: 'progress', label: 'Avancement', icon: <TrendingUp size={11} /> },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSortKey(s.key as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                  sortKey === s.key
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Résumé du filtre actif ───────────────────────────────────────── */}
        {(statusFilter !== 'ALL' || freqFilter !== 'ALL' || search) && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-slate-400 font-semibold">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black border border-indigo-200">
                <Filter size={10} />
                {{ALL:'Tous',ACTIF:'Actifs',EN_PAUSE:'En pause',RETARD:'En retard',TERMINE:'Terminés',ANNULE:'Annulés'}[statusFilter]}
                <button onClick={() => setStatusFilter('ALL')} className="ml-1 hover:text-red-500"><X size={10} /></button>
              </span>
            )}
            {freqFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-black border border-violet-200">
                <Calendar size={10} />
                {FREQ_LABELS[freqFilter]?.label}
                <button onClick={() => setFreqFilter('ALL')} className="ml-1 hover:text-red-500"><X size={10} /></button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-black border border-slate-200">
                <Search size={10} />
                "{search}"
                <button onClick={() => setSearch('')} className="ml-1 hover:text-red-500"><X size={10} /></button>
              </span>
            )}
            <button
              onClick={() => { setStatusFilter('ALL'); setFreqFilter('ALL'); setSearch(''); }}
              className="text-xs text-slate-400 hover:text-red-500 font-semibold underline underline-offset-2 transition-colors"
            >
              Tout effacer
            </button>
          </div>
        )}

        {/* ── Liste des contrats ──────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={36} className="animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              {contracts.length === 0 ? <FileText size={36} className="text-slate-300" /> : <Filter size={36} className="text-slate-300" />}
            </div>
            {contracts.length === 0 ? (
              <>
                <p className="font-black text-slate-400 text-lg">Aucun contrat récurrent</p>
                <p className="text-sm text-slate-400 mt-1">Créez votre premier contrat avec le bouton ci-dessus.</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all"
                >
                  <Plus size={14} /> Nouveau Contrat
                </button>
              </>
            ) : (
              <>
                <p className="font-black text-slate-400 text-lg">Aucun résultat</p>
                <p className="text-sm text-slate-400 mt-1">Aucun contrat ne correspond aux filtres actifs.</p>
                <button
                  onClick={() => { setStatusFilter('ALL'); setFreqFilter('ALL'); setSearch(''); }}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-200 transition-all"
                >
                  <X size={13} /> Effacer les filtres
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(contract => {
              const installments: any[] = contract.installments || [];
              const paid = installments.filter(i => i.status === 'PAYE').length;
              const overdue = installments.filter(i => i.status === 'EN_RETARD').length;
              const invoiced = installments.filter(i => i.generatedSaleId).length;
              const progress = pct(paid, contract.numberOfInstallments);
              const expanded = expandedContracts.has(contract.id);
              const sc = STATUS_CONFIG[contract.status] || STATUS_CONFIG.ACTIF;
              const fc = FREQ_LABELS[contract.frequency] || FREQ_LABELS.MENSUEL;
              const clientName = contract.customer?.companyName || contract.walkinName || 'Client passage';
              const remaining = Math.max(0, parseFloat(contract.totalAmount || 0) - parseFloat(contract.amountPaid || 0));

              return (
                <div key={contract.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all ${contract.status === 'EN_PAUSE' ? 'border-yellow-200 bg-yellow-50/20' : 'border-slate-100'}`}>
                  {/* Bandeau pause */}
                  {contract.status === 'EN_PAUSE' && (
                    <div className="flex items-center gap-2 px-5 py-2 bg-yellow-50 border-b border-yellow-100">
                      <Pause size={11} className="text-yellow-600" />
                      <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">Contrat en pause — facturation et alertes suspendues</p>
                    </div>
                  )}
                  {/* ── Ligne principale ── */}
                  <div className="p-5 lg:p-6">
                    <div className="flex items-start gap-4">
                      {/* Toggle expand */}
                      <button
                        onClick={() => toggleExpand(contract.id)}
                        className="mt-1 w-7 h-7 rounded-lg hover:bg-indigo-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all shrink-0"
                      >
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      {/* Infos principales */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-black text-base text-slate-900 truncate max-w-xs lg:max-w-lg">{contract.title}</h3>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${sc.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${fc.color}`}>{fc.label}</span>
                          {invoiced > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
                              <Receipt size={10} /> {invoiced} facturée(s)
                            </span>
                          )}
                          {overdue > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                              <AlertTriangle size={10} /> {overdue} en retard
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
                          <span className="flex items-center gap-1.5"><UserIcon size={12} className="text-slate-400" />{clientName}</span>
                          {Array.isArray(contract.serviceItems) && contract.serviceItems.length > 0 ? (
                            <span className="flex items-center gap-1.5">
                              <Sparkles size={12} className="text-slate-400" />
                              {contract.serviceItems.length === 1
                                ? (contract.serviceItems[0].name || contract.service?.name)
                                : `${contract.serviceItems.length} services`}
                            </span>
                          ) : contract.service ? (
                            <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-slate-400" />{contract.service.name}</span>
                          ) : null}
                          <span className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" />{contract.startDate} → {contract.endDate}</span>
                        </div>

                        {/* Barre de progression */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-emerald-400' : 'bg-indigo-500'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-slate-500 shrink-0">{paid}/{contract.numberOfInstallments}</span>
                          <span className="text-xs text-slate-400 shrink-0">{progress}%</span>
                        </div>
                      </div>

                      {/* Montants */}
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-xl font-black text-slate-900">{fmt(contract.installmentAmount)}</p>
                        <p className="text-xs text-slate-400 font-medium">{currency} / échéance</p>
                        <p className="text-xs font-bold text-slate-500 mt-1">Total : {fmt(contract.totalAmount)} {currency}</p>
                        {remaining > 0 && (
                          <p className="text-xs font-black text-amber-600 mt-0.5">Restant : {fmt(remaining)} {currency}</p>
                        )}
                      </div>

                      {/* Bouton détail */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {parseFloat(contract.amountPaid || 0) === 0 && !['ANNULE', 'TERMINE'].includes(contract.status) && (
                          <button
                            onClick={() => openEditMode(contract)}
                            className="p-2.5 rounded-xl hover:bg-amber-50 text-slate-300 hover:text-amber-600 transition-all border border-transparent hover:border-amber-200"
                            title="Modifier le contrat"
                          >
                            <Edit3 size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => openDetail(contract)}
                          className="p-2.5 rounded-xl hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-all border border-transparent hover:border-violet-200"
                          title="Voir détails complets"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Échéancier déplié ── */}
                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-5 lg:p-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Échéancier</p>
                      <div className="grid gap-2">
                        {installments
                          .slice()
                          .sort((a: any, b: any) => a.installmentNumber - b.installmentNumber)
                          .map((inst: any) => {
                            const ic = INST_CONFIG[inst.status] || INST_CONFIG.EN_ATTENTE;
                            const hasInvoice = !!inst.generatedSaleId;
                            const today = new Date().toISOString().split('T')[0];
                            const isUpcoming = inst.dueDate > today && inst.dueDate <= new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];

                            return (
                              <div
                                key={inst.id}
                                className={`flex items-center gap-3 bg-white rounded-xl px-4 py-3 border transition-all ${
                                  isUpcoming && inst.status === 'EN_ATTENTE' ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100'
                                }`}
                              >
                                <span className="text-xs font-black text-slate-400 w-7">#{inst.installmentNumber}</span>
                                <span className="text-sm text-slate-600 w-28 shrink-0">{inst.dueDate}</span>
                                <span className="font-black text-sm text-slate-900 flex-1">{fmt(inst.amount)} {currency}</span>

                                {isUpcoming && inst.status === 'EN_ATTENTE' && !hasInvoice && (
                                  <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                                    Facturation imminente
                                  </span>
                                )}

                                {hasInvoice && inst.status !== 'PAYE' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                                    <Receipt size={10} /> Facturée → Règlement dans Ventes
                                  </span>
                                )}

                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${ic.color}`}>
                                  {ic.icon} {ic.label}
                                </span>

                                {inst.status === 'PAYE' && inst.paidAt && (
                                  <span className="text-[10px] text-slate-400 shrink-0 hidden sm:block">
                                    {new Date(inst.paidAt).toLocaleDateString('fr-FR')}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL CRÉATION
      ══════════════════════════════════════════════════════════════════ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1060] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-slate-100 rounded-t-3xl">
              <div>
                <h2 className="font-black text-slate-900 text-xl uppercase tracking-tighter">
                  {editingContractId ? 'Modifier le Contrat' : 'Nouveau Contrat Récurrent'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingContractId ? 'Modifiez les données — les échéances seront régénérées' : 'Loyer, abonnement, service à facturation périodique'}
                </p>
              </div>
              <button onClick={() => { setShowCreate(false); setForm({ ...emptyForm }); setSubmitAttempted(false); setEditingContractId(null); }} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            {/* Avertissement mode édition */}
            {editingContractId && (
              <div className="mx-6 mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-amber-700">Modification avec régénération complète</p>
                  <p className="text-xs text-amber-600 mt-0.5">Toutes les échéances <strong>non payées</strong> seront supprimées et recréées selon les nouvelles données. Les ventes déjà générées seront déliées du contrat.</p>
                </div>
              </div>
            )}

            <div className="p-6 space-y-6">
              {/* Titre + Description */}
              <div className="grid gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    Titre <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ex: Loyer appartement A3, Maintenance mensuelle, Abonnement logiciel..."
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                      submitAttempted && formErrors.title
                        ? 'border-red-400 bg-red-50 focus:ring-red-200'
                        : 'border-slate-200 focus:ring-indigo-300 bg-white'
                    }`}
                  />
                  {submitAttempted && formErrors.title && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><XCircle size={11} />{formErrors.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Détails optionnels..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  />
                </div>
              </div>

              {/* Client */}
              <div className={`rounded-2xl border p-4 transition-all ${
                submitAttempted && formErrors.client ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <p className="text-xs font-black text-slate-600 uppercase tracking-widest mb-3">Client <span className="text-red-500">*</span></p>
                <select
                  value={form.customerId}
                  onChange={e => setForm(f => ({ ...f, customerId: e.target.value, walkinName: '', walkinPhone: '' }))}
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition-all ${
                    submitAttempted && formErrors.client && !form.customerId
                      ? 'border-red-400 bg-red-50'
                      : form.customerId ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <option value="">— Sélectionnez un client ou saisissez ci-dessous —</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
                {form.customerId && (
                  <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1"><CheckCircle2 size={11} />Client sélectionné dans le fichier</p>
                )}
                {!form.customerId && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nom (client de passage) <span className="text-red-500">*</span></label>
                      <input
                        value={form.walkinName}
                        onChange={e => setForm(f => ({ ...f, walkinName: e.target.value }))}
                        placeholder="Nom complet du client"
                        className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition-all ${
                          submitAttempted && formErrors.client && !form.walkinName.trim()
                            ? 'border-red-400 bg-red-50' : form.walkinName.trim() ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Téléphone</label>
                      <input value={form.walkinPhone} onChange={e => setForm(f => ({ ...f, walkinPhone: e.target.value }))} placeholder="+224 ..." className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white" />
                    </div>
                  </div>
                )}
                {submitAttempted && formErrors.client && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><XCircle size={11} />{formErrors.client}</p>
                )}
              </div>

              {/* Services — multi-lignes avec auto-fill prix */}
              <div className={`rounded-2xl border p-4 transition-all ${
                submitAttempted && formErrors.service ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Services facturés</p>
                    <span className="text-[10px] font-black text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Obligatoire</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, serviceItems: [...f.serviceItems, { serviceId: '', name: '', unitPrice: '', quantity: 1 }] }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black hover:bg-indigo-500 transition-all"
                  >
                    <Plus size={12} /> Ajouter un service
                  </button>
                </div>

                {form.serviceItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
                    <Sparkles size={24} className="text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400 font-semibold">Aucun service ajouté</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Cliquez "Ajouter un service" — le prix se remplira automatiquement</p>
                  </div>
                )}

                <div className="space-y-2">
                  {form.serviceItems.map((item, idx) => {
                    const selectedSvc = services.find((s: any) => s.id === item.serviceId);
                    const lineTtc = (parseFloat(item.unitPrice) || 0) * (item.quantity || 1) * 1.18;
                    return (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                        <div className="flex gap-2 items-start">
                          {/* Sélecteur de service */}
                          <div className="flex-1">
                            <select
                              value={item.serviceId}
                              onChange={e => {
                                const svc = services.find((s: any) => s.id === e.target.value);
                                setForm(f => {
                                  const updated = [...f.serviceItems];
                                  updated[idx] = {
                                    ...updated[idx],
                                    serviceId: e.target.value,
                                    name: svc?.name || '',
                                    unitPrice: svc ? String(parseFloat(svc.price) || '') : updated[idx].unitPrice
                                  };
                                  // Recalculer le montant total
                                  const newTotal = updated.reduce((s, l) => s + (parseFloat(l.unitPrice) || 0) * (l.quantity || 1), 0);
                                  return { ...f, serviceItems: updated, installmentAmount: newTotal > 0 ? String(newTotal.toFixed(0)) : f.installmentAmount };
                                });
                              }}
                              className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none transition-all ${
                                submitAttempted && !item.serviceId ? 'border-red-300 bg-red-50' : item.serviceId ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'
                              }`}
                            >
                              <option value="">— Service —</option>
                              {services
                                .filter((s: any) => !form.serviceItems.some((it, i) => it.serviceId === s.id && i !== idx))
                                .map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>
                          {/* Quantité */}
                          <div className="w-20 shrink-0">
                            <input
                              type="number" min={1}
                              value={item.quantity}
                              onChange={e => setForm(f => {
                                const updated = [...f.serviceItems];
                                updated[idx] = { ...updated[idx], quantity: parseInt(e.target.value) || 1 };
                                const newTotal = updated.reduce((s, l) => s + (parseFloat(l.unitPrice) || 0) * (l.quantity || 1), 0);
                                return { ...f, serviceItems: updated, installmentAmount: newTotal > 0 ? String(newTotal.toFixed(0)) : f.installmentAmount };
                              })}
                              placeholder="Qté"
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none"
                            />
                          </div>
                          {/* Prix unitaire */}
                          <div className="w-36 shrink-0">
                            <input
                              type="number" min={0}
                              value={item.unitPrice}
                              onChange={e => setForm(f => {
                                const updated = [...f.serviceItems];
                                updated[idx] = { ...updated[idx], unitPrice: e.target.value };
                                const newTotal = updated.reduce((s, l) => s + (parseFloat(l.unitPrice) || 0) * (l.quantity || 1), 0);
                                return { ...f, serviceItems: updated, installmentAmount: newTotal > 0 ? String(newTotal.toFixed(0)) : f.installmentAmount };
                              })}
                              placeholder={`Prix HT (${currency})`}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none"
                            />
                          </div>
                          {/* Supprimer */}
                          <button
                            type="button"
                            onClick={() => setForm(f => {
                              const updated = f.serviceItems.filter((_, i) => i !== idx);
                              const newTotal = updated.reduce((s, l) => s + (parseFloat(l.unitPrice) || 0) * (l.quantity || 1), 0);
                              return { ...f, serviceItems: updated, installmentAmount: newTotal > 0 ? String(newTotal.toFixed(0)) : '' };
                            })}
                            className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                          >
                            <X size={15} />
                          </button>
                        </div>
                        {/* Sous-total ligne */}
                        {item.serviceId && parseFloat(item.unitPrice) > 0 && (
                          <div className="flex items-center justify-between px-2 py-1.5 bg-indigo-50 rounded-lg">
                            <span className="text-[10px] text-indigo-500 font-semibold">
                              {selectedSvc?.name || 'Service'} × {item.quantity} = {fmt(parseFloat(item.unitPrice) * (item.quantity || 1))} HT
                            </span>
                            <span className="text-[10px] font-black text-indigo-700">
                              → {fmt(lineTtc)} {currency} TTC
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {form.serviceItems.length > 0 && (
                  <div className="mt-3 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl text-white">
                    <span className="text-xs font-black">Total TTC par échéance</span>
                    <span className="text-lg font-black">{fmt(serviceLineTotal * 1.18)} {currency}</span>
                  </div>
                )}

                {submitAttempted && formErrors.service && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><XCircle size={11} />{formErrors.service}</p>
                )}
              </div>

              {/* Fréquence */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Fréquence des échéances *</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(FREQ_LABELS).map(([val, f]) => (
                    <button
                      key={val}
                      onClick={() => setForm(ff => ({ ...ff, frequency: val }))}
                      className={`py-4 px-3 rounded-xl border-2 transition-all ${
                        form.frequency === val
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      <p className="font-black text-sm">{f.short}</p>
                      <p className="text-xs mt-0.5 font-medium opacity-75">{f.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Calendrier — Contrôles poussés ── */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
                    Calendrier <span className="text-red-500">*</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Fréquence sélectionnée : <strong className="text-slate-600">{FREQ_LABELS[form.frequency]?.label}</strong> · intervalle attendu : <strong>{FREQ_LABEL_SHORT[form.frequency]}</strong></span>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Date de début */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Date de début <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                        className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition-all ${
                          submitAttempted && formErrors.startDate
                            ? 'border-red-400 bg-red-50'
                            : formWarnings.startDate
                              ? 'border-amber-400 bg-amber-50'
                              : form.startDate ? 'border-slate-300' : 'border-slate-200'
                        }`}
                      />
                      {submitAttempted && formErrors.startDate && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><XCircle size={11} />{formErrors.startDate}</p>
                      )}
                      {!formErrors.startDate && formWarnings.startDate && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle size={11} />{formWarnings.startDate}</p>
                      )}
                    </div>

                    {/* Nombre d'échéances */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Nb d'échéances <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={520}
                        value={form.numberOfInstallments}
                        onChange={e => setForm(f => ({ ...f, numberOfInstallments: parseInt(e.target.value) || 1 }))}
                        className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition-all ${
                          submitAttempted && formErrors.numberOfInstallments
                            ? 'border-red-400 bg-red-50'
                            : 'border-slate-200'
                        }`}
                      />
                      {submitAttempted && formErrors.numberOfInstallments && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><XCircle size={11} />{formErrors.numberOfInstallments}</p>
                      )}
                      {!formErrors.numberOfInstallments && (
                        <p className="text-xs text-slate-400 mt-1">Entre 1 et 520 échéances</p>
                      )}
                    </div>

                    {/* Date de fin — optionnelle */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Date de fin
                        <span className="ml-1.5 text-[10px] font-normal text-slate-400 normal-case">(optionnelle)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={form.endDate}
                          min={form.startDate || undefined}
                          onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                          className={`flex-1 px-3 py-3 border rounded-xl text-sm focus:outline-none transition-all ${
                            formErrors.endDate
                              ? 'border-red-400 bg-red-50'
                              : form.endDate && !formErrors.endDate
                                ? 'border-slate-300'
                                : 'border-slate-200'
                          }`}
                        />
                        <button
                          onClick={suggestEndDate}
                          title={`Calculer la date de fin selon la fréquence ${FREQ_LABELS[form.frequency]?.label} et le nombre d'échéances`}
                          className="px-3 py-2 border border-indigo-300 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all text-[10px] font-black whitespace-nowrap"
                        >
                          Auto
                        </button>
                        {form.endDate && (
                          <button
                            onClick={() => setForm(f => ({ ...f, endDate: '' }))}
                            className="px-2 py-2 border border-slate-200 text-slate-400 rounded-xl hover:text-red-500 hover:border-red-200 transition-all"
                            title="Effacer la date de fin"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      {!form.endDate && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Info size={10} /> Si vide, calculée automatiquement selon la fréquence et le nombre d'échéances
                        </p>
                      )}
                      {formErrors.endDate && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><XCircle size={11} />{formErrors.endDate}</p>
                      )}
                    </div>
                  </div>

                  {/* Résumé calendrier dynamique */}
                  {calSummary && (
                    <div className={`rounded-xl p-4 border ${calSummary.isCoherent ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${calSummary.isCoherent ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                          {calSummary.isCoherent
                            ? <CheckCircle2 size={15} className="text-emerald-600" />
                            : <AlertTriangle size={15} className="text-amber-600" />
                          }
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs font-black mb-2 ${calSummary.isCoherent ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {calSummary.isCoherent ? 'Calendrier cohérent' : 'Incohérence détectée — vérifiez ou cliquez "Auto"'}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { label: 'Durée totale', value: `${calSummary.diffDays} jours` },
                              { label: 'Soit environ', value: `${calSummary.diffMonths} mois` },
                              { label: 'Intervalle réel', value: `${calSummary.intervalDays} jours` },
                              { label: 'Attendu', value: FREQ_LABEL_SHORT[form.frequency] }
                            ].map(kv => (
                              <div key={kv.label} className="bg-white/70 rounded-lg px-3 py-2">
                                <p className="text-[10px] text-slate-400 font-semibold">{kv.label}</p>
                                <p className="text-sm font-black text-slate-800 mt-0.5">{kv.value}</p>
                              </div>
                            ))}
                          </div>
                          {formWarnings.coherence && (
                            <p className="text-xs text-amber-700 mt-2">{formWarnings.coherence}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Montants */}
              <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-5 border border-indigo-100">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-black text-indigo-700 uppercase tracking-widest">
                    Montant par échéance <span className="text-red-500">*</span>
                  </label>
                  {form.serviceItems.length > 0 && serviceLineTotal > 0 && (
                    <span className="text-[10px] text-indigo-500 bg-indigo-100 px-2 py-1 rounded-lg font-black flex items-center gap-1">
                      <Zap size={10} /> Auto depuis services
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Montant HT / échéance ({currency})</label>
                    <input
                      type="number" min={0}
                      value={form.installmentAmount}
                      onChange={e => setForm(f => ({ ...f, installmentAmount: e.target.value }))}
                      placeholder="0"
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none shadow-sm font-bold text-slate-900 transition-all ${
                        submitAttempted && formErrors.installmentAmount
                          ? 'border-red-400 bg-red-50'
                          : form.serviceItems.length > 0 && serviceLineTotal > 0
                            ? 'border-indigo-300 bg-indigo-50/50'
                            : 'border-white bg-white'
                      }`}
                    />
                    {form.serviceItems.length > 0 && serviceLineTotal > 0 && (
                      <p className="text-[10px] text-indigo-500 mt-1">Calculé depuis les services — modifiable</p>
                    )}
                    {submitAttempted && formErrors.installmentAmount && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><XCircle size={11} />{formErrors.installmentAmount}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Montant total contrat</label>
                    <div className="px-4 py-3 bg-white border border-indigo-200 rounded-xl text-sm font-black text-indigo-700 shadow-sm">
                      {fmt(totalAmount)} {currency}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{fmt(form.installmentAmount || 0)} × {form.numberOfInstallments} échéance(s)</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Notes internes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none resize-none" />
              </div>
            </div>

            {/* Aperçu échéancier */}
            {form.startDate && form.endDate && form.numberOfInstallments >= 1 && new Date(form.endDate) > new Date(form.startDate) && (
              <div className="px-6 pb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Aperçu de l'échéancier</p>
                <div className="grid gap-1.5 max-h-44 overflow-y-auto">
                  {previewDates(form.startDate, form.endDate, parseInt(String(form.numberOfInstallments))).map((d, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                      <span className="text-slate-400 font-bold w-8">#{i + 1}</span>
                      <span className="text-slate-600">{d}</span>
                      <span className="font-black text-indigo-600">{fmt(form.installmentAmount)} {currency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Récapitulatif des erreurs bloquantes */}
            {submitAttempted && hasBlockingErrors && (
              <div className="mx-6 mb-2 bg-red-50 border border-red-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert size={15} className="text-red-600 shrink-0" />
                  <p className="text-xs font-black text-red-700 uppercase tracking-wide">{Object.keys(formErrors).length} erreur(s) à corriger</p>
                </div>
                <ul className="space-y-1">
                  {Object.values(formErrors).map((err, i) => (
                    <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />{err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button
                onClick={() => { setShowCreate(false); setForm({ ...emptyForm }); setSubmitAttempted(false); setEditingContractId(null); }}
                className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={editingContractId ? handleUpdate : handleCreate}
                disabled={actionLoading}
                className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${
                  submitAttempted && hasBlockingErrors
                    ? 'bg-red-100 text-red-400 border border-red-200 cursor-not-allowed shadow-none'
                    : editingContractId
                      ? 'bg-amber-500 text-white hover:bg-amber-400 shadow-amber-200 active:scale-95'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-200 active:scale-95'
                } disabled:opacity-60`}
              >
                {actionLoading
                  ? <Loader2 size={14} className="animate-spin" />
                  : submitAttempted && hasBlockingErrors
                    ? <XCircle size={14} />
                    : editingContractId ? <Edit3 size={14} /> : <Plus size={14} />
                }
                {submitAttempted && hasBlockingErrors
                  ? 'Corriger les erreurs'
                  : editingContractId ? 'Mettre à jour le contrat' : 'Créer le contrat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PAGE DÉTAIL CONTRAT — FULL SCREEN
      ══════════════════════════════════════════════════════════════════ */}
      {showDetail && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-3 md:p-5 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-7xl mx-auto rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95dvh] animate-in zoom-in-95 duration-500">

            {/* ── Header dark ── */}
            <div className="px-5 md:px-10 py-5 md:py-7 bg-slate-900 text-white flex justify-between items-start md:items-center shrink-0 gap-4">
              <div className="flex items-start md:items-center gap-4 md:gap-6 min-w-0">
                <div className="w-12 md:w-16 h-12 md:h-16 rounded-[1.2rem] md:rounded-[1.5rem] bg-violet-600 flex items-center justify-center shadow-xl shadow-violet-900/40 shrink-0">
                  <Calendar size={24} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <h2 className="text-base md:text-2xl font-black uppercase tracking-tighter leading-none truncate max-w-xs md:max-w-lg">
                      {showDetail.title}
                    </h2>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${STATUS_CONFIG[showDetail.status]?.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[showDetail.status]?.dot}`} />
                      {STATUS_CONFIG[showDetail.status]?.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${FREQ_LABELS[showDetail.frequency]?.color}`}>
                      {FREQ_LABELS[showDetail.frequency]?.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <UserIcon size={11} className="text-violet-400" />
                      {showDetail.customer?.companyName || showDetail.walkinName || 'Client de passage'}
                    </span>
                    {Array.isArray(showDetail.serviceItems) && showDetail.serviceItems.length > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={11} className="text-amber-400" />
                        {showDetail.serviceItems.length === 1
                          ? (showDetail.serviceItems[0].name || showDetail.service?.name)
                          : `${showDetail.serviceItems.length} services`}
                      </span>
                    ) : showDetail.service ? (
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={11} className="text-amber-400" />
                        {showDetail.service.name}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1.5">
                      <Calendar size={11} className="text-indigo-400" />
                      {showDetail.startDate} → {showDetail.endDate}
                    </span>
                    {showDetail.status === 'EN_PAUSE' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-[10px] font-black uppercase">
                        <Pause size={10} /> Facturation suspendue
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                {detailLoading && <Loader2 size={16} className="animate-spin text-violet-400" />}
                {onNavigate && (showDetail.installments || []).some((i: any) => i.generatedSaleId) && (
                  <button
                    onClick={() => { setShowDetail(null); onNavigate('sales'); }}
                    className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-violet-600/30 hover:bg-violet-600/50 rounded-xl text-[11px] font-black transition-all"
                  >
                    <ExternalLink size={13} /> Ventes
                  </button>
                )}
                <button
                  onClick={() => { setShowDetail(null); setShowDocForSale(null); }}
                  className="p-2.5 md:p-3 bg-white/5 hover:bg-white/15 rounded-xl md:rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-8">

                {/* ── Colonne gauche — Synthèse ── */}
                <div className="lg:col-span-4 space-y-4">

                  {/* Bloc montants (dark card) */}
                  <div className="bg-slate-900 rounded-[1.75rem] p-5 md:p-6 text-white space-y-5">
                    <div>
                      <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Montant / Échéance</p>
                      <p className="text-3xl md:text-4xl font-black tracking-tight">{fmt(showDetail.installmentAmount)}</p>
                      <p className="text-sm text-slate-400 font-medium">{currency}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mb-1">Total contrat</p>
                        <p className="text-base font-black">{fmt(showDetail.totalAmount)}</p>
                        <p className="text-[10px] text-slate-500">{currency}</p>
                      </div>
                      <div className="bg-emerald-500/15 rounded-xl p-3">
                        <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wide mb-1">Encaissé</p>
                        <p className="text-base font-black text-emerald-300">{fmt(showDetail.amountPaid)}</p>
                        <p className="text-[10px] text-emerald-500">{currency}</p>
                      </div>
                    </div>
                    {parseFloat(showDetail.totalAmount) - parseFloat(showDetail.amountPaid) > 0 && (
                      <div className="flex justify-between items-center pt-3 border-t border-white/10">
                        <p className="text-xs font-bold text-slate-400">Reste à encaisser</p>
                        <p className="text-lg font-black text-rose-400">{fmt(parseFloat(showDetail.totalAmount) - parseFloat(showDetail.amountPaid))} {currency}</p>
                      </div>
                    )}
                    {parseFloat(showDetail.amountPaid) >= parseFloat(showDetail.totalAmount) && (
                      <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <p className="text-xs font-black text-emerald-400">Contrat entièrement soldé</p>
                      </div>
                    )}
                  </div>

                  {/* Progression */}
                  <div className="bg-white rounded-[1.75rem] p-5 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Progression</p>
                      <span className="text-xs font-black text-slate-700">
                        {(showDetail.installments || []).filter((i: any) => i.status === 'PAYE').length}
                        <span className="text-slate-400 font-normal">/{showDetail.numberOfInstallments}</span>
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          pct((showDetail.installments || []).filter((i: any) => i.status === 'PAYE').length, showDetail.numberOfInstallments) === 100
                            ? 'bg-emerald-500' : 'bg-violet-500'
                        }`}
                        style={{ width: `${pct((showDetail.installments || []).filter((i: any) => i.status === 'PAYE').length, showDetail.numberOfInstallments)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-violet-600">
                        {pct((showDetail.installments || []).filter((i: any) => i.status === 'PAYE').length, showDetail.numberOfInstallments)}% encaissé
                      </span>
                      {(showDetail.installments || []).filter((i: any) => i.status === 'EN_RETARD').length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-600">
                          <AlertTriangle size={11} />
                          {(showDetail.installments || []).filter((i: any) => i.status === 'EN_RETARD').length} en retard
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Calendrier */}
                  <div className="bg-white rounded-[1.75rem] p-5 border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Calendrier du contrat</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Date de début', value: new Date(showDetail.startDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) },
                        { label: 'Date de fin', value: new Date(showDetail.endDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) },
                        { label: 'Fréquence', value: FREQ_LABELS[showDetail.frequency]?.label },
                        { label: 'Nb. échéances', value: `${showDetail.numberOfInstallments} échéance(s)` },
                        { label: 'Créé le', value: new Date(showDetail.createdAt).toLocaleDateString('fr-FR') },
                      ].map(kv => (
                        <div key={kv.label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                          <span className="text-xs text-slate-400 font-semibold">{kv.label}</span>
                          <span className="text-xs font-black text-slate-800">{kv.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Client */}
                  {(showDetail.customer || showDetail.walkinName) && (
                    <div className="bg-white rounded-[1.75rem] p-5 border border-slate-100 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                        {showDetail.customer ? 'Client' : 'Client de passage'}
                      </p>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
                          <UserIcon size={18} className="text-violet-600" />
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-900 uppercase leading-tight">
                            {showDetail.customer?.companyName || showDetail.walkinName}
                          </p>
                          {showDetail.customer?.phone && <p className="text-xs text-slate-500 mt-1">{showDetail.customer.phone}</p>}
                          {showDetail.customer?.email && <p className="text-xs text-slate-500">{showDetail.customer.email}</p>}
                          {showDetail.customer?.billingAddress && <p className="text-xs text-slate-400 mt-1 italic">{showDetail.customer.billingAddress}</p>}
                          {!showDetail.customer && showDetail.walkinPhone && (
                            <p className="text-xs text-sky-600 font-bold mt-1">{showDetail.walkinPhone}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Services */}
                  {(Array.isArray(showDetail.serviceItems) && showDetail.serviceItems.length > 0
                    ? true
                    : !!showDetail.service
                  ) && (
                    <div className="bg-white rounded-[1.75rem] p-5 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Services facturés
                        </p>
                        {Array.isArray(showDetail.serviceItems) && showDetail.serviceItems.length > 1 && (
                          <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            {showDetail.serviceItems.length} services
                          </span>
                        )}
                      </div>

                      {/* Multi-services (nouveau format) */}
                      {Array.isArray(showDetail.serviceItems) && showDetail.serviceItems.length > 0 ? (
                        <div className="space-y-2">
                          {showDetail.serviceItems.map((item: any, idx: number) => {
                            const svcDetail = services.find((s: any) => s.id === item.serviceId);
                            const unitHt = parseFloat(item.unitPrice) || 0;
                            const qty = parseInt(item.quantity) || 1;
                            const lineTtc = unitHt * qty * 1.18;
                            return (
                              <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                  <Sparkles size={14} className="text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-black text-sm text-slate-900 leading-tight">
                                    {item.name || svcDetail?.name || 'Service'}
                                  </p>
                                  {svcDetail?.description && (
                                    <p className="text-[10px] text-slate-400 mt-0.5">{svcDetail.description}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                                      Qté : {qty}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                                      PU HT : {fmt(unitHt)} {currency}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-black text-amber-700">{fmt(lineTtc)}</p>
                                  <p className="text-[10px] text-slate-400">{currency} TTC</p>
                                </div>
                              </div>
                            );
                          })}
                          {/* Total services */}
                          {showDetail.serviceItems.length > 1 && (
                            <div className="flex justify-between items-center pt-2 border-t border-amber-100 px-1">
                              <span className="text-xs text-slate-500 font-semibold">Total / échéance</span>
                              <span className="text-sm font-black text-amber-700">
                                {fmt(showDetail.serviceItems.reduce((s: number, it: any) => s + (parseFloat(it.unitPrice) || 0) * (parseInt(it.quantity) || 1) * 1.18, 0))} {currency} TTC
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Ancien format — service unique */
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                            <Sparkles size={18} className="text-amber-600" />
                          </div>
                          <div>
                            <p className="font-black text-sm text-slate-900">{showDetail.service?.name}</p>
                            {showDetail.service?.description && (
                              <p className="text-xs text-slate-400 mt-0.5">{showDetail.service.description}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {showDetail.notes && (
                    <div className="bg-amber-50 border border-amber-100 rounded-[1.75rem] p-5">
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">Notes internes</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{showDetail.notes}</p>
                    </div>
                  )}

                  {/* ── Actions contrat ── */}
                  <div className="space-y-2.5 pt-1">

                    {/* Modifier — si aucun paiement */}
                    {parseFloat(showDetail.amountPaid || 0) === 0 && !['ANNULE', 'TERMINE'].includes(showDetail.status) && (
                      <button
                        onClick={() => { openEditMode(showDetail); }}
                        disabled={actionLoading}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all shadow-md shadow-amber-100 active:scale-95 disabled:opacity-60"
                      >
                        <Edit3 size={14} /> Modifier le contrat
                      </button>
                    )}

                    {/* Mettre en pause */}
                    {showDetail.status === 'ACTIF' && (
                      <button
                        onClick={() => handlePause(showDetail.id)}
                        disabled={actionLoading}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-yellow-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-md shadow-yellow-100 active:scale-95 disabled:opacity-60"
                      >
                        {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
                        Mettre en pause
                      </button>
                    )}

                    {/* Reprendre */}
                    {showDetail.status === 'EN_PAUSE' && (
                      <button
                        onClick={() => handleResume(showDetail.id)}
                        disabled={actionLoading}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-md shadow-emerald-100 active:scale-95 disabled:opacity-60"
                      >
                        {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        Reprendre le contrat
                      </button>
                    )}

                    {/* Annuler — si pas déjà annulé */}
                    {['ACTIF', 'EN_PAUSE'].includes(showDetail.status) && (
                      <button
                        onClick={() => handleCancel(showDetail.id)}
                        disabled={actionLoading}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 border-2 border-red-200 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-60"
                      >
                        <Ban size={14} /> Annuler le contrat
                      </button>
                    )}

                    {/* Supprimer — si aucun paiement */}
                    {parseFloat(showDetail.amountPaid || 0) === 0 && (
                      <button
                        onClick={() => handleDelete(showDetail.id)}
                        disabled={actionLoading}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 border-2 border-slate-200 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-all disabled:opacity-60"
                      >
                        <Trash2 size={14} /> Supprimer définitivement
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Colonne droite — Échéancier ── */}
                <div className="lg:col-span-8 space-y-4">

                  {/* Info facturation auto */}
                  {(showDetail.installments || []).some((i: any) => i.generatedSaleId && i.status !== 'PAYE') && (
                    <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-start gap-3">
                      <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                        <Receipt size={16} className="text-violet-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-violet-700">Des factures ont été auto-générées</p>
                        <p className="text-xs text-violet-500 mt-0.5">
                          Le règlement s'effectue via <strong>"Règlement Facture"</strong> dans Ventes & Factures — l'échéance sera automatiquement marquée Payée.
                        </p>
                      </div>
                      {onNavigate && (
                        <button
                          onClick={() => { setShowDetail(null); onNavigate('sales'); }}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-xl text-[10px] font-black hover:bg-violet-700 transition-all"
                        >
                          <ExternalLink size={11} /> Ventes
                        </button>
                      )}
                    </div>
                  )}

                  {/* Échéancier */}
                  <div className="bg-white rounded-[1.75rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 md:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Échéancier complet</h4>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                          {showDetail.numberOfInstallments} échéances · {FREQ_LABELS[showDetail.frequency]?.label}
                        </p>
                      </div>
                      {detailLoading && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-violet-500">
                          <Loader2 size={13} className="animate-spin" /> Chargement...
                        </div>
                      )}
                    </div>

                    <div className="divide-y divide-slate-50">
                      {(showDetail.installments || [])
                        .slice()
                        .sort((a: any, b: any) => a.installmentNumber - b.installmentNumber)
                        .map((inst: any) => {
                          const ic = INST_CONFIG[inst.status] || INST_CONFIG.EN_ATTENTE;
                          const hasInvoice = !!inst.generatedSaleId;
                          const isPaid = inst.status === 'PAYE';
                          const isOverdue = inst.status === 'EN_RETARD';
                          const today = new Date().toISOString().split('T')[0];
                          const isUpcoming = inst.dueDate > today && inst.dueDate <= new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
                          const payments = inst.generatedSale?.payments || [];

                          return (
                            <div
                              key={inst.id}
                              className={`p-4 md:p-5 transition-all ${isPaid ? 'bg-emerald-50/40' : isOverdue ? 'bg-rose-50/40' : isUpcoming ? 'bg-violet-50/30' : ''}`}
                            >
                              <div className="flex items-start gap-3 md:gap-4">

                                {/* Numéro / icône statut */}
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 ${
                                  isPaid ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200' :
                                  isOverdue ? 'bg-rose-500 text-white shadow-sm shadow-rose-200' :
                                  hasInvoice ? 'bg-violet-100 text-violet-700' :
                                  'bg-slate-100 text-slate-500'
                                }`}>
                                  {isPaid ? <CheckCircle2 size={16} /> : inst.installmentNumber}
                                </div>

                                <div className="flex-1 min-w-0">
                                  {/* Ligne principale */}
                                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                                    <span className="text-xs font-black text-slate-600 uppercase tracking-wide">Éch. #{inst.installmentNumber}</span>
                                    <span className="text-xs text-slate-400 font-medium">
                                      {new Date(inst.dueDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                    <span className="font-black text-sm text-slate-900">{fmt(inst.amount)} {currency}</span>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${ic.color}`}>
                                      {ic.icon} {ic.label}
                                    </span>
                                    {isUpcoming && !hasInvoice && !isPaid && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                        <Zap size={9} /> Facturation imminente
                                      </span>
                                    )}
                                    {hasInvoice && !isPaid && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                                        <Receipt size={9} /> Facturée
                                      </span>
                                    )}
                                  </div>

                                  {/* Infos paiement si payée */}
                                  {isPaid && inst.paidAt && (
                                    <p className="text-[11px] text-slate-500 font-semibold mb-2">
                                      ✓ Payée le {new Date(inst.paidAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                      {inst.paymentMethod && <span className="ml-1 text-slate-400">· {METHOD_LABELS[inst.paymentMethod] || inst.paymentMethod}</span>}
                                      {inst.paymentReference && <span className="ml-1 text-slate-400">· Réf. {inst.paymentReference}</span>}
                                    </p>
                                  )}

                                  {/* Historique des règlements de la vente liée */}
                                  {payments.length > 0 && (
                                    <div className="mt-2 space-y-1.5">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Règlements enregistrés</p>
                                      {payments.map((pay: any) => {
                                        const payStatus: Record<string, string> = { PAID: 'text-emerald-600', PENDING: 'text-amber-600', REJECTED: 'text-red-600', FAILED: 'text-red-600' };
                                        const payStatusLabel: Record<string, string> = { PAID: 'Encaissé', PENDING: 'En attente', REJECTED: 'Rejeté', FAILED: 'Impayé', REGISTERED: 'Enregistré', DEPOSITED: 'Déposé', PROCESSING: 'En cours' };
                                        return (
                                          <div key={pay.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <CreditCard size={11} className="text-slate-400 shrink-0" />
                                              <span className="text-[11px] font-semibold text-slate-600">{METHOD_LABELS[pay.method] || pay.method}</span>
                                              {pay.reference && <span className="text-[10px] text-slate-400 truncate hidden md:inline">· {pay.reference}</span>}
                                              {pay.chequeNumber && <span className="text-[10px] text-slate-400 hidden md:inline">· Chq {pay.chequeNumber}</span>}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              <span className={`text-[10px] font-bold ${payStatus[pay.status] || 'text-slate-500'}`}>
                                                {payStatusLabel[pay.status] || pay.status}
                                              </span>
                                              <span className="text-xs font-black text-slate-800">{parseFloat(pay.amount).toLocaleString()} {currency}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Bouton Voir Facture */}
                                {hasInvoice && inst.generatedSale && (
                                  <button
                                    onClick={() => setShowDocForSale(inst.generatedSale)}
                                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-xl text-[10px] font-black hover:bg-violet-500 transition-all shadow-md shadow-violet-200 active:scale-95"
                                  >
                                    <FileText size={13} />
                                    <span className="hidden sm:inline">Voir Facture</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          APERÇU FACTURE PDF
      ══════════════════════════════════════════════════════════════════ */}
      {showDocForSale && (
        <div className="fixed inset-0 z-[1100] flex flex-col items-center justify-center p-4 md:p-6 bg-slate-950/97 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="w-full max-w-5xl mx-auto max-h-[92dvh] bg-white rounded-[2rem] md:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-400">

            {/* Header */}
            <div className="px-5 md:px-8 py-4 md:py-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-black uppercase tracking-tight">Facture #{showDocForSale.reference}</h3>
                  <p className="text-[10px] text-violet-400 font-bold mt-0.5">Contrat Récurrent · Aperçu document</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={async () => {
                    try {
                      if (!(window as any).html2canvas) {
                        await new Promise<void>((resolve, reject) => {
                          const s = document.createElement('script');
                          s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                          s.async = true;
                          s.onload = () => resolve();
                          s.onerror = () => reject(new Error('Chargement html2canvas échoué'));
                          document.head.appendChild(s);
                        });
                      }
                      const html2canvas = (window as any).html2canvas;
                      const node = document.getElementById('recurring-doc-render');
                      if (!node) throw new Error('Aperçu introuvable');
                      const canvas = await html2canvas(node as HTMLElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                      canvas.toBlob((blob: Blob | null) => {
                        if (!blob) { showToast('Impossible de générer l\'image', 'error'); return; }
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${showDocForSale.reference}.png`;
                        document.body.appendChild(a); a.click(); a.remove();
                        window.URL.revokeObjectURL(url);
                      }, 'image/png', 0.95);
                    } catch (err: any) {
                      showToast(err?.message || 'Erreur lors de la génération', 'error');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
                >
                  <Download size={13} /> Télécharger
                </button>
                <button
                  onClick={() => setShowDocForSale(null)}
                  className="p-2.5 bg-white/5 hover:bg-white/15 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Document */}
            <div className="flex-1 overflow-y-auto bg-slate-100/50 p-4 md:p-8">
              <div id="recurring-doc-render">
                <DocumentPreview
                  type="FACTURE"
                  sale={showDocForSale}
                  tenant={tenantSettings}
                  currency={currency}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Utilitaire aperçu des dates (identique à l'algo backend)
function previewDates(startDate: string, endDate: string, n: number): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (n <= 0 || end <= start) return [];
  if (n === 1) return [start.toISOString().split('T')[0]];
  const totalMs = end.getTime() - start.getTime();
  const intervalMs = totalMs / (n - 1);
  return Array.from({ length: n }, (_, i) =>
    new Date(start.getTime() + intervalMs * i).toISOString().split('T')[0]
  );
}

export default RecurringContracts;

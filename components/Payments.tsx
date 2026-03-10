import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, Search, RefreshCw, Eye, ArrowRight, 
  CreditCard, Smartphone, DollarSign, Calendar,
  ArrowUpRight, ArrowDownRight, Filter, Download,
  CheckCircle2, AlertCircle, Clock, ExternalLink,
  User as UserIcon, Tag, SlidersHorizontal, ChevronDown,
  X, Landmark, ArrowDownCircle, ArrowUpCircle, History,
  BadgeCheck, ChevronRight, FileText, FileSpreadsheet,
  Printer, Loader2, Globe, MapPin, Phone, Mail, Info
} from 'lucide-react';
import { apiClient } from '../services/api';
import waveLogo from '../assets/wave_logo.png';

// ─── Composant document paginé (défini HORS du composant principal) ────────

interface TreasuryHeaderProps {
  settings: any;
  dateFrom: string;
  dateTo: string;
  pageNumber: number;
  totalPages: number;
  currency: string;
}
const TreasuryHeader: React.FC<TreasuryHeaderProps> = ({ settings, dateFrom, dateTo, pageNumber, totalPages, currency }) => (
  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8">
    <div>
      {settings?.logoUrl ? (
        <img src={settings.logoUrl} className="h-14 w-auto object-contain mb-2 max-w-[180px]" alt="Logo" />
      ) : (
        <div className="text-2xl font-black text-indigo-600 mb-1 uppercase tracking-tighter">
          {settings?.name || 'VOTRE SOCIÉTÉ'}
        </div>
      )}
      <div className="space-y-0.5 text-[8px] uppercase font-bold text-slate-400">
        {settings?.address && <p className="flex items-center gap-1.5"><MapPin size={8} className="text-indigo-400"/>{settings.address}</p>}
        {settings?.phone   && <p className="flex items-center gap-1.5"><Phone  size={8} className="text-indigo-400"/>{settings.phone}</p>}
        {settings?.email   && <p className="flex items-center gap-1.5"><Mail   size={8} className="text-indigo-400"/>{settings.email}</p>}
      </div>
    </div>
    <div className="text-right">
      <h1 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">RAPPORT DE TRÉSORERIE</h1>
      <p className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block uppercase">
        Période : {dateFrom} au {dateTo}
      </p>
      {totalPages > 1 && (
        <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
          Page {pageNumber} / {totalPages}
        </p>
      )}
    </div>
  </div>
);

interface TreasuryFooterProps {
  isLastPage: boolean;
  tenantName: string;
  dateFrom: string;
  dateTo: string;
  totalAmount: number;
  currency: string;
  fingerprint: string;
}
const TreasuryFooter: React.FC<TreasuryFooterProps> = ({
  isLastPage, tenantName, dateFrom, dateTo, totalAmount, currency, fingerprint,
}) => (
  <div className="pt-5 border-t border-slate-100 mt-auto">
    {isLastPage ? (
      <div className="flex justify-between items-end">
        <div className="text-[7px] font-bold uppercase space-y-1 text-slate-300 italic">
          <p>Généré par GeStocPro Cloud Kernel v3.2 • {tenantName}</p>
          <p>Rapport de trésorerie — {dateFrom} au {dateTo}</p>
          <p className="mt-2">Empreinte de Sécurité : {fingerprint}</p>
        </div>
        <div className="w-24 h-12 border border-slate-300 rounded-lg flex items-center justify-center text-[6px] font-black uppercase text-slate-300 italic">
          Signature Kernel
        </div>
      </div>
    ) : (
      <div className="flex justify-between items-center">
        <p className="text-[7px] text-slate-300 font-bold uppercase italic">
          GeStocPro Cloud • {tenantName} — Rapport trésorerie — Suite →
        </p>
        <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">
          {dateFrom} / {dateTo}
        </p>
      </div>
    )}
  </div>
);

interface TreasuryTableProps {
  rows: any[];
  currency: string;
  showTotal?: boolean;
  totalAmount?: number;
}
const TreasuryTable: React.FC<TreasuryTableProps> = ({ rows, currency, showTotal, totalAmount }) => (
  <table className="w-full text-left border-collapse">
    <thead>
      <tr className="bg-slate-900 text-white text-[8px] font-black uppercase">
        <th className="p-3">DATE</th>
        <th className="p-3">RÉFÉRENCE</th>
        <th className="p-3">CLIENT</th>
        <th className="p-3 text-center">CANAL</th>
        <th className="p-3 text-right">MONTANT ({currency})</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {rows.length === 0 ? (
        <tr>
          <td colSpan={5} className="py-16 text-center text-[10px] font-black text-slate-300 uppercase">
            Aucune donnée pour cette période
          </td>
        </tr>
      ) : rows.map((p: any, i: number) => (
        <tr key={i} className="text-[9px] font-bold hover:bg-slate-50/50">
          <td className="p-3 text-slate-500">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</td>
          <td className="p-3 text-indigo-600 font-mono">#{p.saleRef}</td>
          <td className="p-3 text-slate-900 uppercase truncate max-w-[120px]">{p.customer}</td>
          <td className="p-3 text-center">
            <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border ${p.method === 'CASH' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
              {p.method}
            </span>
          </td>
          <td className="p-3 text-right font-black text-emerald-600">{parseFloat(p.amount).toLocaleString()}</td>
        </tr>
      ))}
    </tbody>
    {showTotal && (
      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
        <tr className="font-black text-[9px]">
          <td colSpan={4} className="p-3 text-right uppercase text-slate-400">Total Encaissé sur période</td>
          <td className="p-3 text-right text-indigo-600">{(totalAmount || 0).toLocaleString()} {currency}</td>
        </tr>
      </tfoot>
    )}
  </table>
);

const ROWS_FIRST_PAGE = 16; // Moins de lignes page 1 (KPIs prennent de la place)
const ROWS_PER_PAGE   = 24; // Lignes sur les pages suivantes

interface TreasuryReportProps {
  payments: any[];
  settings: any;
  dateFrom: string;
  dateTo: string;
  currency: string;
}
const TreasuryReport: React.FC<TreasuryReportProps> = ({ payments, settings, dateFrom, dateTo, currency }) => {
  const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const totalCash   = payments.filter(p => p.method === 'CASH').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const totalDigital = totalAmount - totalCash;
  const fingerprint  = useMemo(() => `${payments.length.toString(16)}-${Date.now().toString(36).toUpperCase().slice(-6)}`, []); // eslint-disable-line

  const pages: any[][] = [];
  pages.push(payments.slice(0, ROWS_FIRST_PAGE));
  const rest = payments.slice(ROWS_FIRST_PAGE);
  for (let i = 0; i < rest.length; i += ROWS_PER_PAGE) pages.push(rest.slice(i, i + ROWS_PER_PAGE));
  const totalPages = pages.length;

  return (
    <>
      <style>{`@media print { @page{size:A4;margin:0} body{margin:0} .treasury-page{box-shadow:none!important;border:none!important} }`}</style>
      {pages.map((pageRows, idx) => {
        const pageNumber  = idx + 1;
        const isLastPage  = pageNumber === totalPages;
        const isFirstPage = pageNumber === 1;
        return (
          <div
            key={pageNumber}
            className="treasury-page bg-white w-full mx-auto text-slate-800 font-sans flex flex-col shadow-xl border border-slate-200 mb-6"
            style={{ padding: '28px 36px', pageBreakAfter: isLastPage ? 'auto' : 'always', breakAfter: isLastPage ? 'auto' : 'page', minHeight: '297mm' }}
          >
            {/* ══ EN-TÊTE — toutes les pages ══ */}
            <TreasuryHeader settings={settings} dateFrom={dateFrom} dateTo={dateTo} pageNumber={pageNumber} totalPages={totalPages} currency={currency} />

            {/* ══ KPIs — page 1 uniquement ══ */}
            {isFirstPage && (
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Encaissé</p>
                  <p className="text-xl font-black text-slate-900">{totalAmount.toLocaleString()} {currency}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Espèces (CASH)</p>
                  <p className="text-xl font-black text-amber-600">{totalCash.toLocaleString()} {currency}</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Flux Digitaux</p>
                  <p className="text-xl font-black text-indigo-600">{totalDigital.toLocaleString()} {currency}</p>
                </div>
              </div>
            )}

            {/* ══ LABEL CONTINUATION — pages 2+ ══ */}
            {!isFirstPage && (
              <p className="mt-3 mb-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                Suite des règlements — {dateFrom} au {dateTo}
              </p>
            )}

            {/* ══ TABLEAU ══ */}
            <div className="mt-5 flex-1">
              <TreasuryTable
                rows={pageRows}
                currency={currency}
                showTotal={isLastPage}
                totalAmount={totalAmount}
              />
            </div>

            {/* ══ PIED DE PAGE — toutes les pages ══ */}
            <TreasuryFooter
              isLastPage={isLastPage}
              tenantName={settings?.name || 'GeStocPro'}
              dateFrom={dateFrom}
              dateTo={dateTo}
              totalAmount={totalAmount}
              currency={currency}
              fingerprint={fingerprint}
            />
          </div>
        );
      })}
    </>
  );
};

// ─── Composant principal ───────────────────────────────────────────────────

const Payments = ({ currency, tenantSettings }: { currency: string, tenantSettings?: any }) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [pageSize, setPageSize] = useState<number>(30);
  const [showExportModal, setShowExportModal] = useState(false);
  const [settings, setSettings] = useState<any>(tenantSettings || null);
  const [exportFormat, setExportFormat] = useState<'IMAGE' | 'EXCEL'>('IMAGE');
  const [imageFormat, setImageFormat] = useState<'PNG' | 'JPG'>('PNG');
  
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    method: 'ALL',
    status: 'ALL',
    minAmount: '',
    maxAmount: '',
    operator: 'WAVE'
  });

  const [exportDates, setExportDates] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/sales'); 
      const allPayments = data.flatMap((sale: any) => 
        (sale.payments || []).map((p: any) => ({
          ...p,
          saleRef: sale.reference,
          saleId: sale.id,
          customer: sale.customer?.companyName || 'Vente Directe',
          operator: sale.operator || 'Opérateur Admin',
          saleStatus: sale.status,
          items: sale.items || []
        }))
      );
      setPayments(allPayments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      if (!tenantSettings) {
        const s = await apiClient.get('/settings');
        setSettings(s);
      }
    } catch (err) {
      console.error("Finance fetch error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const exportPreviewData = useMemo(() => {
    return payments.filter(p => {
      const pDate = new Date(p.createdAt).toISOString().split('T')[0];
      return pDate >= exportDates.from && pDate <= exportDates.to;
    });
  }, [payments, exportDates]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const pAmount = parseFloat(p.amount);
      const pDate = new Date(p.createdAt).toISOString().split('T')[0];
      const matchesSearch = (p.saleRef || '').toLowerCase().includes(filters.search.toLowerCase()) || (p.customer || '').toLowerCase().includes(filters.search.toLowerCase());
      const matchesMethod = filters.method === 'ALL' || p.method === filters.method;
      const matchesStatus = filters.status === 'ALL' || p.saleStatus === filters.status;
      const matchesMin = filters.minAmount === '' || pAmount >= parseFloat(filters.minAmount || '0');
      const matchesMax = filters.maxAmount === '' || pAmount <= parseFloat(filters.maxAmount || '0');
      const matchesDateFrom = filters.dateFrom === '' || pDate >= filters.dateFrom;
      const matchesDateTo = filters.dateTo === '' || pDate <= filters.dateTo;
      return matchesSearch && matchesMethod && matchesStatus && matchesMin && matchesMax && matchesDateFrom && matchesDateTo;
    });
  }, [payments, filters]);

  const displayedPayments = useMemo(() => {
    if (pageSize === -1) return filteredPayments;
    return filteredPayments.slice(0, pageSize);
  }, [filteredPayments, pageSize]);

  const stats = useMemo(() => {
    const total = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const cash = filteredPayments.filter(p => p.method === 'CASH').reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const digital = total - cash;
    return { total, cash, digital, count: filteredPayments.length };
  }, [filteredPayments]);

  const loadHtml2Canvas = async () => {
    if ((window as any).html2canvas) return (window as any).html2canvas;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Chargement html2canvas échoué'));
      document.head.appendChild(s);
    });
    return (window as any).html2canvas;
  };

  const exportAsImage = async () => {
    try {
      const html2canvas = await loadHtml2Canvas();
      const node = document.getElementById('export-preview');
      if (!node) throw new Error('Aperçu introuvable pour export image');
      const canvas: HTMLCanvasElement = await html2canvas(node as HTMLElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const mime = imageFormat === 'PNG' ? 'image/png' : 'image/jpeg';
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) return alert('Impossible de générer l\'image');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_tresorerie_${exportDates.from}_${exportDates.to}.${imageFormat === 'PNG' ? 'png' : 'jpg'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }, mime, imageFormat === 'JPG' ? 0.92 : 0.95);
    } catch (err: any) {
      console.error('Export image failed', err);
      alert(err?.message || 'Erreur export image');
    }
  };

  const exportAsExcel = () => {
    const headers = ['Date', 'Heure', 'Reference', 'Client', 'Methode', 'Montant', 'Etat'];
    const rows = exportPreviewData.map(p => [
      new Date(p.createdAt).toLocaleDateString(),
      new Date(p.createdAt).toLocaleTimeString(),
      p.saleRef,
      p.customer,
      p.method,
      p.amount,
      p.saleStatus
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `export_tresorerie_${exportDates.from}_${exportDates.to}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async () => {
    if (exportFormat === 'IMAGE') await exportAsImage(); else exportAsExcel();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Statistique Premium */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:hidden">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group border border-slate-800">
          <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Wallet size={80}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume d'Encaissements</p>
          <h3 className="text-3xl font-black">{stats.total.toLocaleString()} {currency}</h3>
          <p className="text-[9px] text-indigo-400 font-bold mt-2 uppercase flex items-center gap-2"><BadgeCheck size={10}/> {stats.count} Versement(s) tracés</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden">
          <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:rotate-12 transition-transform"><Landmark size={60}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fonds de Caisse (Espèces)</p>
          <h3 className="text-2xl font-black text-slate-900">{stats.cash.toLocaleString()} {currency}</h3>
          <div className="w-full h-1.5 bg-slate-50 rounded-full mt-4 overflow-hidden shadow-inner">
            <div className="h-full bg-emerald-500" style={{ width: `${(stats.cash / (stats.total || 1)) * 100}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden">
          <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:-rotate-12 transition-transform"><Smartphone size={60}/></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Flux Mobiles & Digitaux</p>
          <h3 className="text-2xl font-black text-slate-900">{stats.digital.toLocaleString()} {currency}</h3>
          <div className="w-full h-1.5 bg-slate-50 rounded-full mt-4 overflow-hidden shadow-inner">
            <div className="h-full bg-indigo-500" style={{ width: `${(stats.digital / (stats.total || 1)) * 100}%` }}></div>
          </div>
        </div>
        <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-0 bottom-0 p-4 opacity-20"><History size={80} className="text-emerald-700"/></div>
          <div className="flex items-center gap-3 text-emerald-600 mb-2 relative z-10">
            <CheckCircle2 size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Registre Intègre</span>
          </div>
          <p className="text-xs font-bold text-emerald-800 leading-tight relative z-10">Signature SHA-256 active sur chaque versement.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
          <Landmark className="text-indigo-600" size={32} />
          Trésorerie Transactionnelle
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowExportModal(true)}
            className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl hover:bg-emerald-700 active:scale-95"
          >
            <Download size={18} /> EXPORTER
          </button>
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-3">Afficher</span>
            <select 
              value={pageSize} 
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer"
            >
              <option value={5}>5 lignes</option>
              <option value={10}>10 lignes</option>
              <option value={30}>30 lignes</option>
              <option value={50}>50 lignes</option>
              <option value={100}>100 lignes</option>
              <option value={-1}>Toutes les ventes</option>
            </select>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 border ${showFilters ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            <SlidersHorizontal size={18} /> {showFilters ? 'REPLIER FILTRES' : 'FILTRER LE FLUX'}
          </button>
          <button onClick={fetchPayments} className="p-4 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all shadow-sm">
             <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Panel de Filtres Avancés */}
      {showFilters && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl animate-in slide-in-from-top-4 duration-300 grid grid-cols-1 md:grid-cols-4 gap-6 print:hidden">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Recherche Client / Ref</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text" 
                value={filters.search} 
                onChange={e => setFilters({...filters, search: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="Ex: #V-123456 ou Nom..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Canal de règlement</label>
            <select 
              value={filters.method} 
              onChange={e => setFilters({...filters, method: e.target.value})}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
            >
              <option value="ALL">Tous les canaux</option>
              <option value="CHEQUE">CHEQUE</option>
              <option value="CASH">ESPECES (CASH)</option>
              <option value="MOBILE_MONEY">MOBILE MONEY</option>
              <option value="WAVE">WAVE</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">État de la vente</label>
            <select 
              value={filters.status} 
              onChange={e => setFilters({...filters, status: e.target.value})}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
            >
              <option value="ALL">Tous les états</option>
              <option value="TERMINE">PAYÉ (TERMINE)</option>
              <option value="EN_COURS">EN ATTENTE (EN COURS)</option>
              <option value="ANNULE">ANNULÉ</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Fourchette de Montant</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" value={filters.minAmount} onChange={e => setFilters({...filters, minAmount: e.target.value})} className="w-1/2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
              <input type="number" placeholder="Max" value={filters.maxAmount} onChange={e => setFilters({...filters, maxAmount: e.target.value})} className="w-1/2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Période (Du / Au)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input type="date" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
              </div>
              <div className="relative flex-1">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input type="date" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
              </div>
            </div>
          </div>
          <div className="md:col-span-2 flex items-end">
            <button onClick={() => setFilters({ search: '', dateFrom: '', dateTo: '', method: 'WAVE', status: 'ALL', minAmount: '', maxAmount: '', operator: 'WAVE' })} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all w-full">
              RÉINITIALISER LES FILTRES
            </button>
          </div>
        </div>
      )}

      {/* Table des Règlements */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden print:shadow-none print:border-none print:rounded-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
             <RefreshCw className="animate-spin text-indigo-600" size={40} />
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hydratation de la trésorerie...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b">
                  <th className="px-10 py-6">Date / Heure</th>
                  <th className="px-10 py-6">Source (Réf. Vente)</th>
                  <th className="px-10 py-6">Tier (Client)</th>
                  <th className="px-10 py-6 text-center">Canal de Règlement</th>
                  <th className="px-10 py-6 text-right">Montant Encaissé</th>
                  <th className="px-10 py-6 text-right">État Vente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-300">
                        <Search size={40} />
                        <p className="font-black uppercase text-[10px] tracking-widest">Aucune transaction ne correspond à vos filtres</p>
                      </div>
                    </td>
                  </tr>
                ) : displayedPayments.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shadow-inner print:hidden"><ArrowDownCircle size={14}/></div>
                        <div>
                          <p className="text-xs font-black text-slate-700">{new Date(p.createdAt).toLocaleDateString()}</p>
                          <p className="text-[9px] text-slate-400 font-bold">{new Date(p.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-black text-indigo-600">#{p.saleRef}</span>
                        <span className="text-[8px] text-slate-300 font-bold uppercase truncate max-w-[100px]">{p.reference || 'Auto-Sync'}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <p className="font-black text-slate-800 text-sm uppercase">{p.customer}</p>
                      {p.operator === 'WAVE' ? (
                        <div className="flex items-center gap-2 mt-1 print:hidden">
                          <img src={waveLogo} alt="Wave" className="w-5 h-5 object-contain" />
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Wave</span>
                        </div>
                      ) : (
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-1 print:hidden"><UserIcon size={10}/> {p.operator}</p>
                      )}
                    </td>
                    <td className="px-10 py-6 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${p.method === 'CASH' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                        {p.method}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right font-black text-emerald-600 text-base">+{parseFloat(p.amount).toLocaleString()} {currency}</td>
                    <td className="px-10 py-6 text-right">
                       <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter ${p.saleStatus === 'TERMINE' ? 'bg-emerald-100 text-emerald-700' : p.saleStatus === 'ANNULE' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                         {p.saleStatus}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black">
                 <tr>
                    <td colSpan={4} className="px-10 py-6 text-right text-[10px] uppercase tracking-widest text-slate-400">Consolidation des flux (sur {filteredPayments.length} lignes filtrées)</td>
                    <td className="px-10 py-6 text-right text-xl font-black">{stats.total.toLocaleString()} {currency}</td>
                    <td className="px-10 py-6"></td>
                 </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Résumé d'Intégrité de Caisse */}
      <div className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 print:hidden">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-inner"><History size={32}/></div>
           <div>
              <h4 className="text-lg font-black uppercase tracking-tight text-slate-900">Chainage des règlements</h4>
              <p className="text-xs text-slate-400 font-medium">Chaque règlement partiel est lié à sa vente mère pour une consolidation automatique.</p>
           </div>
        </div>
        <div className="flex gap-4">
           <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center min-w-[150px]">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Moyenne Règlement</p>
              <p className="text-lg font-black text-slate-800">{(stats.total / (stats.count || 1)).toLocaleString()} {currency}</p>
           </div>
           <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center min-w-[150px]">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ratio Digital</p>
              <p className="text-lg font-black text-indigo-600">{Math.round((stats.digital / (stats.total || 1)) * 100)}%</p>
           </div>
        </div>
      </div>

      {/* MODAL EXPORTATION */}
      {showExportModal && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300 print:hidden">
          <div className="bg-white w-full max-w-6xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-500">
             <div className="px-6 py-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <Download className="text-emerald-500" size={24}/>
                  <h3 className="text-lg font-black uppercase tracking-tight">Exportation Stratégique des Ventes</h3>
                </div>
                <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-white/10 rounded-2xl transition-all"><X size={20}/></button>
             </div>
             
             <div className="flex-1 overflow-hidden grid grid-cols-12 min-h-0">
                <div className="col-span-12 lg:col-span-4 border-r border-slate-100 flex flex-col bg-slate-50/50 min-h-0">
                  <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar min-h-0">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Période du Rapport</label>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input type="date" value={exportDates.from} onChange={e => setExportDates({...exportDates, from: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
                        </div>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input type="date" value={exportDates.to} onChange={e => setExportDates({...exportDates, to: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Format de Sortie</label>
                      <div className="grid grid-cols-1 gap-3">
                         {[
                           { id: 'IMAGE', label: 'Image (PNG / JPG)', icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50' },
                           { id: 'EXCEL', label: 'Feuille Excel (XLS)', icon: FileSpreadsheet, color: 'text-blue-500', bg: 'bg-blue-50' }
                         ].map(fmt => {
                           const Icon = fmt.icon as any;
                           const keyId = fmt.id === 'IMAGE' ? 'IMAGE' : 'EXCEL';
                           return (
                             <div key={fmt.id} className="relative">
                               <button onClick={() => setExportFormat(keyId as any)} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group w-full ${exportFormat === keyId ? 'border-indigo-600 bg-white shadow-lg shadow-indigo-50' : 'border-white bg-white/50 hover:border-slate-200'}`}>
                                 <div className="flex items-center gap-3">
                                   <div className={`w-8 h-8 ${fmt.bg} ${fmt.color} rounded-xl flex items-center justify-center shadow-inner`}><Icon size={16} /></div>
                                   <span className={`text-[9px] font-black uppercase ${exportFormat === keyId ? 'text-indigo-600' : 'text-slate-500'}`}>{fmt.label}</span>
                                 </div>
                                 {exportFormat === keyId && <CheckCircle2 className="text-indigo-600" size={16} />}
                               </button>
                               {fmt.id === 'IMAGE' && exportFormat === 'IMAGE' && (
                                 <div className="mt-2 flex items-center gap-2">
                                   <select value={imageFormat} onChange={e => setImageFormat(e.target.value as any)} className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-black">
                                     <option value="PNG">PNG</option>
                                     <option value="JPG">JPG</option>
                                   </select>
                                 </div>
                               )}
                             </div>
                           );
                         })}
                      </div>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                       <p className="text-[8px] text-indigo-700 font-bold uppercase leading-relaxed">
                         <Info className="inline-block mr-1 mb-0.5" size={8} /> 
                         L'export inclut automatiquement le logo et les mentions légales de votre instance "{settings?.name || 'GeStocPro'}".
                       </p>
                    </div>
                  </div>
                  <div className="p-6 bg-white border-t border-slate-100 flex flex-col gap-3 shrink-0">
                    <button onClick={handleExport} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3 active:scale-95">
                      {exportFormat === 'PDF' ? <Printer size={16}/> : <Download size={16}/>} GÉNÉRER LE FICHIER
                    </button>
                  </div>
                </div>

                {/* ══ ZONE PREVIEW — remplacée par TreasuryReport paginé ══ */}
                <div className="col-span-12 lg:col-span-8 flex flex-col bg-white overflow-hidden relative">
                  <div className="p-8 bg-slate-50/50 border-b flex justify-between items-center shrink-0">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aperçu en temps réel ({exportPreviewData.length} lignes)</h4>
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">Visualisation Dynamique</span>
                  </div>
                  <div id="export-preview" className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar bg-slate-100/30">
                    <TreasuryReport
                      payments={exportPreviewData}
                      settings={settings}
                      dateFrom={exportDates.from}
                      dateTo={exportDates.to}
                      currency={currency}
                    />
                  </div>
                </div>

             </div>
          </div>
        </div>
      )}

      {/* SECTION CACHÉE POUR L'IMPRESSION PDF RÉELLE */}
      <div className="hidden print:block bg-white text-slate-800 p-0 font-sans">
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10">
            <div>
              {settings?.logoUrl && <img src={settings.logoUrl} className="h-24 w-auto mb-4" alt="Logo" />}
              <div className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">{settings?.name}</div>
              <p className="text-xs uppercase font-bold text-slate-500">{settings?.address}</p>
              <p className="text-xs font-bold text-slate-500">{settings?.email} | {settings?.phone}</p>
            </div>
            <div className="text-right">
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 uppercase">Rapport de Trésorerie</h1>
              <p className="text-lg font-mono font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl inline-block">Période : {exportDates.from} au {exportDates.to}</p>
            </div>
          </div>
          <div className="mt-12">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-xs font-black uppercase">
                  <th className="p-5">Date</th>
                  <th className="p-5">Référence</th>
                  <th className="p-5">Client / Tiers</th>
                  <th className="p-5 text-center">Canal</th>
                  <th className="p-5 text-right">Montant ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100">
                {exportPreviewData.map((p, i) => (
                  <tr key={i} className="text-sm font-bold">
                    <td className="p-5">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="p-5 text-indigo-600 font-mono">#{p.saleRef}</td>
                    <td className="p-5 text-slate-900 uppercase">{p.customer}</td>
                    <td className="p-5 text-center">{p.method}</td>
                    <td className="p-5 text-right font-black">{parseFloat(p.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black">
                 <tr>
                    <td colSpan={4} className="p-6 text-right text-lg uppercase tracking-widest">Consolidation Totale sur Période</td>
                    <td className="p-6 text-right text-3xl">{exportPreviewData.reduce((sum, p) => sum + parseFloat(p.amount), 0).toLocaleString()}</td>
                 </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-20 pt-12 border-t-2 border-slate-100 flex justify-between items-end">
            <div className="text-[10px] font-bold text-slate-300 uppercase italic">
              GeStocPro AI-Native ERP • Kernel Cloud AlwaysData v3.2<br/>
              Généré le {new Date().toLocaleString()}
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-slate-900 uppercase tracking-widest mb-10 underline underline-offset-8">VISA DIRECTION / COMPTABILITÉ</p>
              <div className="h-24 w-48 border-2 border-dashed border-slate-200 rounded-2xl"></div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default Payments;

import React from 'react';
import { Package, ShieldCheck, MapPin, Phone, Mail, Globe, AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react';

interface Props {
  items: any[];
  settings: any;
  campaign: any;
}

const InventoryAuditReport: React.FC<Props> = ({ items, settings, campaign }) => {
  
  const getAuditVerdict = (counted: number, system: number) => {
    if (counted === system) return { label: 'Normal', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' };
    
    const deltaPercent = Math.abs((counted - system) / (system || 1)) * 100;
    
    if (deltaPercent <= 5) {
      return { label: 'Cohérent', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
    }
    
    return { label: 'Incohérent', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' };
  };

  const totalSystem = items.reduce((sum, i) => sum + i.systemQty, 0);
  const totalCounted = items.reduce((sum, i) => sum + i.countedQty, 0);
  const anomalies = items.filter(i => i.countedQty !== i.systemQty).length;

  return (
    <div id="document-render" className="bg-white p-12 w-[210mm] min-h-[297mm] mx-auto text-slate-800 shadow-sm border border-slate-100 font-sans print:shadow-none print:border-none print:p-12 selection:bg-indigo-100">
      {/* Header Rapport */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-10">
        <div>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} className="h-24 w-auto object-contain mb-4 max-w-[250px]" alt="Logo" />
          ) : (
            <div className="text-3xl font-black text-indigo-600 mb-2 uppercase tracking-tighter">{settings.name || 'GESTOCKPRO'}</div>
          )}
          <div className="space-y-1 text-[10px] uppercase font-bold text-slate-500">
            <p className="flex items-center gap-2"><MapPin size={10} className="text-indigo-500"/> {settings.address || 'Adresse Cloud'}</p>
            <p className="flex items-center gap-2"><Phone size={10} className="text-indigo-500"/> {settings.phone || 'Standard Standard'}</p>
            <p className="flex items-center gap-2"><Mail size={10} className="text-indigo-500"/> {settings.email || 'Contact Support'}</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2 uppercase">RAPPORT D'AUDIT</h1>
          <p className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg inline-block shadow-sm">Campagne: {campaign.name}</p>
          <p className="text-[10px] font-black text-slate-400 mt-4 uppercase tracking-widest">Date Audit : {new Date(campaign.createdAt).toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {/* Résumé Synthétique */}
      <div className="grid grid-cols-3 gap-6 mt-12">
        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Volume Système</p>
          <p className="text-2xl font-black text-slate-900">{totalSystem.toLocaleString()}</p>
        </div>
        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Volume Physique</p>
          <p className="text-2xl font-black text-indigo-600">{totalCounted.toLocaleString()}</p>
        </div>
        <div className={`p-6 rounded-3xl border text-center ${anomalies > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Articles avec écart</p>
          <p className={`text-2xl font-black ${anomalies > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{anomalies}</p>
        </div>
      </div>

      {/* Tableau Audit */}
      <div className="mt-12">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em]">
              <th className="p-5 rounded-l-2xl">ARTICLE / SKU</th>
              <th className="p-5 text-center">SYS. QTY</th>
              <th className="p-5 text-center">COUNT QTY</th>
              <th className="p-5 text-center">DIFF</th>
              <th className="p-5 text-center rounded-r-2xl">CONSTAT D'AUDIT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item: any, i: number) => {
              const verdict = getAuditVerdict(item.countedQty, item.systemQty);
              const diff = item.countedQty - item.systemQty;

              return (
                <tr key={i} className="text-sm font-bold">
                  <td className="p-5">
                    <p className="text-slate-900 uppercase truncate max-w-[180px]">{item.stock_item?.name}</p>
                    <p className="text-[8px] font-mono text-slate-400">SKU: {item.stock_item?.sku}</p>
                  </td>
                  <td className="p-5 text-center font-black text-slate-400">{item.systemQty}</td>
                  <td className="p-5 text-center font-black text-indigo-600">{item.countedQty}</td>
                  <td className={`p-5 text-center font-black ${diff === 0 ? 'text-slate-300' : diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {diff > 0 ? `+${diff}` : diff}
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${verdict.bg} ${verdict.color} ${verdict.border}`}>
                      {verdict.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Signatures & Certification */}
      <div className="mt-auto border-t border-slate-100 pt-12">
        <div className="flex justify-between items-end">
          <div className="text-[8px] text-slate-300 font-bold uppercase space-y-1 italic">
             <p>{settings.name} • Kernel Cloud AlwaysData v3.2</p>
             <p>Audit physique certifié conforme à la situation réelle du stock.</p>
             <p className="mt-4">ID TRACE : {campaign.id.toUpperCase()}</p>
          </div>
          <div className="text-center w-64 space-y-4">
             <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest underline decoration-indigo-500 underline-offset-8 decoration-2">
               VISA AUDITEUR / DIRECTION
             </p>
             <div className="h-32 flex items-center justify-center relative">
                {campaign.status === 'VALIDATED' && (
                   <div className="border-4 border-indigo-600/30 text-indigo-600 rounded-full px-6 py-2 rotate-12 font-black uppercase text-xl animate-in zoom-in-50 duration-700">
                    SCELLÉ
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryAuditReport;

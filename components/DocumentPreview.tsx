
import React, { useEffect, useState } from 'react';
import { authBridge } from '../services/authBridge';
import { apiClient } from '../services/api';
import { Mail, Phone, MapPin, CheckCircle2, Truck, Package, Sparkles, Globe, Download } from 'lucide-react';

interface DocumentProps {
  type: 'FACTURE' | 'RECU' | 'BON_SORTIE' | 'SUBSCRIPTION_INVOICE';
  sale: any;
  tenant: any;
  currency: string;
}

const DocumentPreview: React.FC<DocumentProps> = ({ type, sale, tenant, currency }) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const docs = await apiClient.get(`/documents/entity/${type}/${sale.id}`);
        setDocuments(Array.isArray(docs) ? docs : []);
      } catch (err) {
        console.warn('Failed to load documents', err);
      }
    };
    fetchDocs();
  }, [sale.id, type]);

  const downloadDocument = async (docId: string, filename: string) => {
    try {
      setDownloadLoading(docId);
      const session = authBridge.getSession();
      const token = session?.token;
      const res = await fetch(`http://localhost:3000/api/documents/download/${docId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Download failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document.bin';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error', err);
      alert(err.message || 'Erreur lors du téléchargement');
    } finally {
      setDownloadLoading(null);
    }
  };
  const isPaid = parseFloat(sale.amountPaid || 0) >= parseFloat(sale.totalTtc || 0);
  const totalTtc = parseFloat(sale.totalTtc || 0);
  const amountPaid = parseFloat(sale.amountPaid || 0);
  const remaining = Math.max(0, totalTtc - amountPaid);
  const isBonSortie = type === 'BON_SORTIE';
  const isSubInvoice = type === 'SUBSCRIPTION_INVOICE';

  // Émetteur de la facture
  const issuer = isSubInvoice ? {
    name: 'GESTOCKPRO SaaS',
    address: 'Centre Technologique, Avenue de l\'IA, Dakar, Sénégal',
    phone: '+221 78 131 13 71',
    email: 'diankaseydou@gestock.pro',
    logoUrl: null // Utilise le style textuel GeStocPro
  } : tenant;

  // Destinataire
  const recipient = isSubInvoice ? sale.customer : sale.customer;

  // FIX: On vérifie toutes les variantes de clés (Sequelize alias, DB column, ou objet inclus)
  const itemsToDisplay = isBonSortie 
    ? (sale.items?.filter((i: any) => i.stockItemId || i.stock_item_id || i.stock_item) || [])
    : (sale.items || []);

  return (
    <div id="document-render" className="bg-white p-12 w-[210mm] min-h-[297mm] mx-auto text-slate-800 shadow-sm border border-slate-100 font-sans print:shadow-none print:border-none selection:bg-indigo-100">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-10">
        <div>
          {isSubInvoice ? (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Globe size={24}/>
              </div>
              <div className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                GESTOCK<span className="text-indigo-600">PRO</span>
              </div>
            </div>
          ) : issuer.logoUrl ? (
            <img src={issuer.logoUrl} className="h-24 w-auto object-contain mb-4 max-w-[250px]" alt="Logo" />
          ) : (
            <div className="text-3xl font-black text-indigo-600 mb-2 uppercase tracking-tighter">{issuer.name}</div>
          )}
          <div className="space-y-1 text-[10px] uppercase font-bold text-slate-500">
            <p className="flex items-center gap-2"><MapPin size={10} className="text-indigo-500"/> {issuer.address || 'Adresse Cloud'}</p>
            <p className="flex items-center gap-2"><Phone size={10} className="text-indigo-500"/> {issuer.phone || 'Standard Standard'}</p>
            <p className="flex items-center gap-2"><Mail size={10} className="text-indigo-500"/> {issuer.email || 'Contact Support'}</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">
            {isBonSortie ? 'BON DE LIVRAISON' : isSubInvoice ? 'FACTURE SERVICES' : type}
          </h1>
          <p className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg inline-block shadow-sm">Ref: #{sale.reference}</p>
          <p className="text-[10px] font-black text-slate-400 mt-4 uppercase tracking-widest">Date d'émission : {new Date(sale.createdAt).toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {/* Infos Client */}
      <div className="grid grid-cols-2 gap-10 mt-12">
        <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Client / Destinataire</p>
          <h2 className="text-xl font-black text-slate-900 uppercase mb-2">{recipient?.companyName || recipient?.name || 'Client de Passage'}</h2>
          <div className="space-y-1 text-xs text-slate-600 font-medium leading-relaxed">
            <p>{recipient?.billingAddress || recipient?.address || 'Vente Directe'}</p>
            <p>{recipient?.phone}</p>
            <p>{recipient?.email}</p>
          </div>
        </div>
        <div className="flex flex-col justify-center text-right space-y-4">
           {isBonSortie ? (
              <div className="inline-flex items-center justify-end gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-2xl w-fit ml-auto border border-amber-100">
                <Truck size={20}/>
                <span className="text-lg font-black uppercase tracking-tight">LOGISTIQUE SORTIE</span>
              </div>
           ) : (isPaid || isSubInvoice) && (
             <div className="inline-flex items-center justify-end gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-2xl w-fit ml-auto border border-emerald-100">
                <CheckCircle2 size={20}/>
                <span className="text-lg font-black uppercase tracking-tight">SOLDE ENCAISSÉ</span>
             </div>
           )}
           <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-tight">
             {isBonSortie ? "Validation de sortie physique des marchandises :" : "Note légale :"}<br/>
             <span className="text-slate-900 font-black italic">{isSubInvoice ? "Facture acquittée. Merci de votre confiance en GeStocPro." : (tenant.invoiceFooter || 'Paiement selon conditions générales.')}</span>
           </div>
        </div>
      </div>

      {/* Tableau des articles */}
      <div className="mt-12">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em]">
              <th className="p-5 rounded-l-2xl">RÉFÉRENCE</th>
              <th className="p-5">DÉSIGNATION</th>
              <th className="p-5 text-center">{isBonSortie ? 'QTÉ LIVRÉE' : 'QTÉ'}</th>
              {!isBonSortie && <th className="p-5 text-right">P.U TTC</th>}
              {!isBonSortie && <th className="p-5 text-right rounded-r-2xl">TOTAL TTC</th>}
              {isBonSortie && <th className="p-5 text-center rounded-r-2xl">VÉRIFIÉ</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {itemsToDisplay.map((item: any, i: number) => {
              const name = item.stock_item?.name || item.service?.name || item.name || "Article sans nom";
              const skuLabel = item.stock_item?.sku ? item.stock_item.sku : (isSubInvoice ? "GSP-SaaS" : "SERVICE");
              
              // Normalisation des quantités (camelCase vs snake_case)
              const qtyDelivered = item.quantityDelivered ?? item.quantity_delivered ?? 0;
              const qtyTotal = item.quantity ?? 1;
              const unitPrice = parseFloat(item.unitPrice || item.price || 0);
              const lineTotalTtc = parseFloat(item.totalTtc || (unitPrice * qtyTotal) || 0);

              return (
                <tr key={i} className="text-sm font-bold group hover:bg-slate-50/50">
                  <td className="p-5">
                    <span className="text-[8px] font-mono text-slate-400">{skuLabel}</span>
                  </td>
                  <td className="p-5">
                    <p className="text-slate-900 uppercase tracking-tight">{name}</p>
                  </td>
                  <td className="p-5 text-center font-black">
                     {isBonSortie ? qtyDelivered : qtyTotal}
                  </td>
                  {!isBonSortie && <td className="p-5 text-right font-medium">{unitPrice.toLocaleString()}</td>}
                  {!isBonSortie && <td className="p-5 text-right font-black">{lineTotalTtc.toLocaleString()}</td>}
                  {isBonSortie && <td className="p-5 text-center text-[10px] text-slate-300 italic">[ ]</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totaux (Uniquement pour Factures/Reçus) */}
      {!isBonSortie && (
        <div className="mt-12 flex justify-end">
          <div className="w-80 space-y-4">
            <div className="flex justify-between items-center p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl">
               <span className="text-xs font-black uppercase tracking-widest">NET À PAYER</span>
               <span className="text-2xl font-black">{totalTtc.toLocaleString()} <span className="text-xs">{currency}</span></span>
            </div>
            <div className="px-6 space-y-2">
               <div className="flex justify-between text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                  <span>DÉJÀ RÉGLÉ</span>
                  <span>-{amountPaid.toLocaleString()} {currency}</span>
               </div>
               {remaining > 0 && (
                 <div className="flex justify-between text-sm font-black text-rose-600 uppercase tracking-widest pt-2 border-t border-slate-100">
                    <span>SOLDE À PAYER</span>
                    <span>{remaining.toLocaleString()} {currency}</span>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Footer / Signatures */}
      <div className="mt-24 flex justify-between items-end border-t border-slate-100 pt-12">
        <div className="text-[8px] text-slate-300 font-bold uppercase space-y-1 italic">
           <p>{isSubInvoice ? "GeStocPro AI-Native SaaS" : tenant.name} • Kernel Cloud AlwaysData v3.2</p>
           <p>Généré automatiquement par le moteur de facturation GeStockPro.</p>
           <p className="mt-4">ID TRANSACTION : {sale.id.toUpperCase()}</p>
        </div>
        <div className="text-center w-64 space-y-4">
           <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest underline decoration-indigo-500 underline-offset-8 decoration-2">
             {isBonSortie ? 'LE CLIENT / RÉCEPTIONNAIRE' : 'VISA & CACHET'}
           </p>
           <div className="h-32 flex items-center justify-center relative">
              {isSubInvoice ? (
                 <div className="border-4 border-indigo-600/30 text-indigo-600 rounded-full px-6 py-2 rotate-12 font-black uppercase text-xl animate-in fade-in">
                  GESTORPRO
                 </div>
              ) : isPaid && !isBonSortie && tenant.cachetUrl ? (
                <img 
                  src={tenant.cachetUrl} 
                  className="h-32 w-auto object-contain mix-blend-multiply animate-in zoom-in-50 duration-700 hover:scale-110 transition-transform" 
                  alt="Tampon Officiel" 
                />
              ) : isPaid && !isBonSortie && !tenant.cachetUrl ? (
                <div className="border-4 border-emerald-500/30 text-emerald-500 rounded-full px-6 py-2 rotate-12 font-black uppercase text-xl animate-in fade-in">
                  PAYÉ
                </div>
              ) : isBonSortie ? (
                <div className="w-full h-24 border-2 border-dashed border-slate-100 rounded-xl"></div>
              ) : null}
           </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;

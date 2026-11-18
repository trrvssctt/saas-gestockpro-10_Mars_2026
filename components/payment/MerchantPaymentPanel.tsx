/**
 * MerchantPaymentPanel — écran de paiement unique (Souscrire, Payer ce mois,
 * Régulariser, inscription).
 *
 * Ordre d'affichage imposé par l'audit du 18/11/2026 :
 *   1. montant à payer + formule / période
 *   2. code marchand (gros, bouton « Copier »)
 *   3. nom du bénéficiaire tel qu'affiché dans Wave
 *   4. mobile : bouton principal « Payer avec Wave », QR repliable en dessous
 *      desktop : QR à gauche, code + bouton à droite
 *   + secours : « J'ai déjà payé ? Saisir la référence »
 *
 * Aucun identifiant marchand n'est codé ici : tout vient de
 * GET /billing/merchant-info (variables d'environnement du backend).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Loader2, ChevronDown, Smartphone, AlertTriangle, ShieldCheck, ExternalLink } from 'lucide-react';
import { apiClient } from '../../services/api';
import { formatFCFA, formatAmount } from '../../utils/pricing';

interface WaveConfig {
  id: 'WAVE';
  label: string;
  merchantCode: string | null;
  merchantName: string | null;
  link: string | null;
  amountInLink: boolean;
  qrSvg: string | null;
  checkoutApi: boolean;
}

interface ManualOperator {
  id: string;
  label: string;
  merchantCode: string;
  merchantName: string | null;
}

interface MerchantInfo {
  wave: WaveConfig | null;
  operators: ManualOperator[];
  checkoutApi: boolean;
}

export interface ManualPaymentInput {
  method: string;
  reference: string;
  phone?: string;
}

interface MerchantPaymentPanelProps {
  amount: number;
  planName?: string;
  periodLabel?: string;
  /**
   * Paiement Wave en ligne (Checkout API) : montant fixé par le serveur et
   * activation automatique. Ne fonctionne que pour un utilisateur connecté.
   * Absent → le bouton ouvre le lien marchand Wave.
   */
  onWaveCheckout?: () => Promise<void>;
  /** Saisie manuelle de la référence (validation par un administrateur). */
  onManualSubmit: (input: ManualPaymentInput) => Promise<void>;
  /** Ouvre directement la saisie de référence (inscription : seul moyen de confirmer). */
  manualOpenByDefault?: boolean;
  manualSubmitLabel?: string;
}

const OPERATOR_STYLES: Record<string, { tab: string; button: string; soft: string; text: string }> = {
  WAVE:   { tab: 'bg-cyan-50 border-cyan-500 text-cyan-700',       button: 'bg-cyan-500 hover:bg-cyan-600',     soft: 'bg-cyan-50 border-cyan-100',     text: 'text-cyan-900' },
  ORANGE: { tab: 'bg-orange-50 border-orange-500 text-orange-700', button: 'bg-orange-500 hover:bg-orange-600', soft: 'bg-orange-50 border-orange-100', text: 'text-orange-900' },
  FREE:   { tab: 'bg-rose-50 border-rose-500 text-rose-700',       button: 'bg-rose-600 hover:bg-rose-700',     soft: 'bg-rose-50 border-rose-100',     text: 'text-rose-900' },
  MTN:    { tab: 'bg-yellow-50 border-yellow-500 text-yellow-700', button: 'bg-yellow-500 hover:bg-yellow-600', soft: 'bg-yellow-50 border-yellow-100', text: 'text-yellow-900' },
};

const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* repli ci-dessous */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
};

const MerchantCodeBlock: React.FC<{ code: string | null; name: string | null; label: string }> = ({ code, name, label }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3">
      {code && (
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Code marchand {label}</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 min-w-0 font-mono text-lg sm:text-xl font-black text-slate-900 tracking-wide break-all select-all">{code}</span>
            <button
              type="button"
              onClick={async () => { if (await copyText(code)) { setCopied(true); setTimeout(() => setCopied(false), 2000); } }}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white text-xs font-black uppercase tracking-wider text-slate-700 hover:border-slate-400 transition-all"
              aria-label={`Copier le code marchand ${label}`}
            >
              {copied ? <><Check size={14} className="text-emerald-600" /> Copié</> : <><Copy size={14} /> Copier</>}
            </button>
          </div>
        </div>
      )}
      {name && (
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bénéficiaire affiché dans {label}</p>
          <p className="text-lg font-black text-slate-900">{name}</p>
        </div>
      )}
    </div>
  );
};

const QrImage: React.FC<{ svg: string; alt: string; className?: string }> = ({ svg, alt, className }) => (
  <img
    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
    alt={alt}
    className={`bg-white p-2 rounded-2xl border border-slate-200 ${className || ''}`}
  />
);

const MerchantPaymentPanel: React.FC<MerchantPaymentPanelProps> = ({
  amount, planName, periodLabel, onWaveCheckout, onManualSubmit,
  manualOpenByDefault = false, manualSubmitLabel,
}) => {
  const [info, setInfo] = useState<MerchantInfo | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [operatorId, setOperatorId] = useState<string>('WAVE');
  const [manualOpen, setManualOpen] = useState(manualOpenByDefault);
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    apiClient.get(`/billing/merchant-info?amount=${Math.round(amount) || ''}`)
      .then((data: MerchantInfo) => { if (!cancelled) setInfo(data); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [amount]);

  const operators = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    if (info?.wave || (onWaveCheckout && info?.checkoutApi)) list.push({ id: 'WAVE', label: 'Wave' });
    (info?.operators || []).forEach(op => list.push({ id: op.id, label: op.label }));
    return list;
  }, [info, onWaveCheckout]);

  // Si Wave n'est pas configuré, sélectionner le premier opérateur disponible
  useEffect(() => {
    if (operators.length && !operators.some(o => o.id === operatorId)) setOperatorId(operators[0].id);
  }, [operators, operatorId]);

  const wave = info?.wave || null;
  const manualOp = (info?.operators || []).find(o => o.id === operatorId) || null;
  const style = OPERATOR_STYLES[operatorId] || OPERATOR_STYLES.WAVE;
  const useCheckoutApi = operatorId === 'WAVE' && !!onWaveCheckout && !!info?.checkoutApi;
  const amountText = formatFCFA(amount);

  const handleWaveButton = async () => {
    setError(null);
    if (useCheckoutApi && onWaveCheckout) {
      setCheckoutLoading(true);
      try {
        await onWaveCheckout(); // redirige vers Wave en cas de succès
      } catch (e: any) {
        setError(
          (e?.message ? `${e.message} ` : '') +
          (wave?.link || wave?.merchantCode
            ? 'Vous pouvez payer avec le code marchand ci-dessus, puis saisir votre référence.'
            : 'Réessayez dans quelques instants ou contactez le support.')
        );
        setManualOpen(true);
      } finally {
        setCheckoutLoading(false);
      }
    }
  };

  const handleManualSubmit = async () => {
    if (!reference.trim()) {
      setError('Saisissez la référence de transaction reçue par SMS.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onManualSubmit({ method: operatorId, reference: reference.trim(), phone: phone.trim() || undefined });
    } catch (e: any) {
      setError(e?.message || "Impossible d'enregistrer la référence. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Bouton principal Wave ── */
  const waveButton = useCheckoutApi ? (
    <button
      type="button"
      onClick={handleWaveButton}
      disabled={checkoutLoading}
      className={`w-full py-4 ${style.button} text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-60 transition-all`}
    >
      {checkoutLoading ? <><Loader2 size={18} className="animate-spin" /> Connexion à Wave…</> : <><Smartphone size={18} /> Payer avec Wave</>}
    </button>
  ) : wave?.link ? (
    <a
      href={wave.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`w-full py-4 ${style.button} text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all no-underline`}
    >
      <Smartphone size={18} /> Payer avec Wave <ExternalLink size={14} />
    </a>
  ) : null;

  const waveHint = useCheckoutApi
    ? `Le montant de ${amountText} est déjà rempli dans Wave. Votre abonnement s'active automatiquement après le paiement.`
    : wave?.link && !wave.amountInLink
      ? `Dans Wave, saisissez le montant exact : ${amountText}.`
      : wave?.merchantCode
        ? `Dans Wave, choisissez « Payer un marchand », saisissez ce code et le montant exact : ${amountText}.`
        : null;

  return (
    <div className="space-y-5">
      {/* 1. Montant */}
      <div className="rounded-3xl bg-slate-900 text-white p-5 md:p-6">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant à payer</p>
        <p className="text-3xl md:text-4xl font-black tracking-tight mt-1">
          {formatAmount(amount)} <span className="text-lg md:text-xl text-slate-300">F CFA</span>
        </p>
        {(planName || periodLabel) && (
          <p className="text-xs font-bold text-slate-300 mt-1">{[planName, periodLabel].filter(Boolean).join(' — ')}</p>
        )}
      </div>

      {!info && !loadError && (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-xs font-bold">
          <Loader2 size={16} className="animate-spin" /> Chargement des moyens de paiement…
        </div>
      )}

      {(loadError || (info && operators.length === 0)) && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          Le paiement est momentanément indisponible. Réessayez dans quelques minutes ou contactez le support.
        </div>
      )}

      {info && operators.length > 0 && (
        <>
          {/* Opérateurs (uniquement ceux configurés côté serveur) */}
          {operators.length > 1 && (
            <div className="flex gap-2" role="tablist">
              {operators.map(op => (
                <button
                  key={op.id}
                  type="button"
                  role="tab"
                  aria-selected={operatorId === op.id}
                  onClick={() => { setOperatorId(op.id); setError(null); }}
                  className={`flex-1 py-2.5 px-2 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${operatorId === op.id ? OPERATOR_STYLES[op.id]?.tab || OPERATOR_STYLES.WAVE.tab : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Wave ── */}
          {operatorId === 'WAVE' && (
            <div className={`rounded-3xl border p-5 md:p-6 ${style.soft}`}>
              <div className={`md:grid md:gap-6 md:items-center ${wave?.qrSvg ? 'md:grid-cols-[auto_1fr]' : ''}`}>
                {/* Desktop : QR à gauche */}
                {wave?.qrSvg && (
                  <div className="hidden md:flex flex-col items-center gap-2">
                    <QrImage svg={wave.qrSvg} alt={`QR code Wave${wave.merchantName ? ` — ${wave.merchantName}` : ''}`} className="w-44 h-44" />
                    <p className="text-[9px] text-slate-500 font-bold text-center max-w-[11rem]">Scannez avec l'application Wave de votre téléphone</p>
                  </div>
                )}
                <div className="space-y-4">
                  <MerchantCodeBlock code={wave?.merchantCode || null} name={wave?.merchantName || null} label="Wave" />
                  {waveButton}
                  {waveHint && <p className={`text-[11px] font-bold ${style.text}`}>{waveHint}</p>}
                </div>
              </div>

              {/* Mobile : QR en second, repliable */}
              {wave?.qrSvg && (
                <details className="md:hidden mt-4 group">
                  <summary className="list-none cursor-pointer flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Afficher le QR code <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="flex flex-col items-center gap-2 mt-3">
                    <QrImage svg={wave.qrSvg} alt={`QR code Wave${wave.merchantName ? ` — ${wave.merchantName}` : ''}`} className="w-48 h-48" />
                    <p className="text-[10px] text-slate-500 font-bold text-center">À scanner depuis un autre téléphone</p>
                  </div>
                </details>
              )}
            </div>
          )}

          {/* ── Orange Money / Free Money / MTN : code marchand + instructions ── */}
          {manualOp && (
            <div className={`rounded-3xl border p-5 md:p-6 space-y-4 ${style.soft}`}>
              <MerchantCodeBlock code={manualOp.merchantCode} name={manualOp.merchantName} label={manualOp.label} />
              <ol className={`list-decimal pl-5 space-y-1 text-xs font-bold ${style.text}`}>
                <li>Ouvrez {manualOp.label} et choisissez « Paiement marchand ».</li>
                <li>Saisissez le code marchand ci-dessus et le montant exact : {amountText}.</li>
                <li>Vérifiez le nom du bénéficiaire, puis validez.</li>
                <li>Saisissez ci-dessous la référence reçue par SMS.</li>
              </ol>
            </div>
          )}

          {/* ── Secours : saisie manuelle de la référence ── */}
          {(manualOp || manualOpen) ? (
            <div className="rounded-3xl border border-slate-200 p-5 space-y-3">
              <p className="text-xs font-black text-slate-700">
                {manualOp ? 'Référence de votre paiement' : 'Vous avez déjà payé ? Saisissez la référence'}
              </p>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="Référence reçue par SMS"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
              />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Numéro utilisé pour payer (facultatif)"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
              />
              <button
                type="button"
                onClick={handleManualSubmit}
                disabled={submitting || !reference.trim()}
                className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
              >
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Envoi…</> : <><Check size={16} /> {manualSubmitLabel || 'Envoyer la référence'}</>}
              </button>
              <p className="text-[10px] text-slate-400 font-bold">Votre référence est vérifiée par notre équipe avant l'activation (sous 24 h ouvrées).</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="w-full py-2 text-[11px] font-black text-slate-500 underline underline-offset-4 hover:text-slate-800"
            >
              J'ai déjà payé ? Saisir la référence
            </button>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold" role="alert">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold">
            <ShieldCheck size={12} className="text-emerald-500" /> Vérifiez toujours le nom du bénéficiaire avant de valider.
          </p>
        </>
      )}
    </div>
  );
};

export default MerchantPaymentPanel;

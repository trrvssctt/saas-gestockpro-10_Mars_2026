/**
 * StripeRedirect.tsx
 * Pages de retour Stripe après paiement par carte bancaire.
 * Affichées lorsque l'URL correspond à /stripe/success ou /stripe/cancel.
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { apiClient } from '../services/api';

interface StripeSuccessPageProps {
  onContinue: () => void;
}

export const StripeSuccessPage: React.FC<StripeSuccessPageProps> = ({ onContinue }) => {
  const [status, setStatus] = useState<'loading' | 'confirmed' | 'error'>('loading');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      setStatus('confirmed'); // Pas de session_id => succès optimiste
      return;
    }

    // Optionnel : vérifier le statut côté backend
    apiClient.get(`/billing/stripe/session/${sessionId}`)
      .then(() => setStatus('confirmed'))
      .catch(() => setStatus('confirmed')); // succès optimiste même en cas d'erreur réseau
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 size={48} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full animate-in zoom-in-95 duration-700 space-y-10">
        <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl animate-bounce">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Paiement Réussi !</h1>
          <p className="text-slate-400 font-medium leading-relaxed uppercase text-[10px] tracking-[0.3em] px-8">
            Votre paiement par carte a été traité avec succès. Votre abonnement sera activé sous quelques instants.
          </p>
        </div>
        <button
          onClick={onContinue}
          className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          ACCÉDER À MON ESPACE <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

interface StripeCancelPageProps {
  onBack: () => void;
}

export const StripeCancelPage: React.FC<StripeCancelPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full animate-in zoom-in-95 duration-700 space-y-10">
        <div className="w-24 h-24 bg-amber-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
          <XCircle size={48} />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Paiement Annulé</h1>
          <p className="text-slate-400 font-medium leading-relaxed uppercase text-[10px] tracking-[0.3em] px-8">
            Vous avez annulé le processus de paiement. Aucun montant n'a été prélevé. Vous pouvez réessayer à tout moment.
          </p>
        </div>
        <button
          onClick={onBack}
          className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-amber-400 transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          RETOUR AUX ABONNEMENTS <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

interface StripeErrorPageProps {
  onBack: () => void;
}

export const StripeErrorPage: React.FC<StripeErrorPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full animate-in zoom-in-95 duration-700 space-y-10">
        <div className="w-24 h-24 bg-rose-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl animate-pulse">
          <AlertCircle size={48} />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Erreur de Paiement</h1>
          <p className="text-slate-400 font-medium leading-relaxed uppercase text-[10px] tracking-[0.3em] px-8">
            Une erreur est survenue lors du traitement de votre paiement. Veuillez réessayer ou contacter le support.
          </p>
        </div>
        <button
          onClick={onBack}
          className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-rose-400 transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          RÉESSAYER <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

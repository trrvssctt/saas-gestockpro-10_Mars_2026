/**
 * WaveRedirect.tsx
 * Pages de retour Wave après paiement en ligne.
 * /wave/success?ref=GSP_...  →  WaveSuccessPage
 * /wave/cancel               →  WaveCancelPage
 */

import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { apiClient } from '../services/api';

interface WaveSuccessPageProps {
  onContinue: () => void;
}

export const WaveSuccessPage: React.FC<WaveSuccessPageProps> = ({ onContinue }) => {
  const [status, setStatus] = useState<'loading' | 'confirmed' | 'error'>('loading');
  const [pollMsg, setPollMsg] = useState('Vérification du paiement Wave...');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const MAX_ATTEMPTS = 30; // 30 × 2s = 60 secondes max

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientReference = params.get('ref');

    if (!clientReference) {
      // Pas de référence — Wave a redirigé sans paramètre (cas d'erreur)
      setStatus('error');
      setPollMsg('Référence de paiement introuvable.');
      return;
    }

    const checkPayment = async () => {
      try {
        const data: any = await apiClient.get(`/billing/wave/session/${clientReference}`);
        if (data?.paymentStatus === 'COMPLETED') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus('confirmed');
          setPollMsg('Paiement confirmé !');
          // Nettoyage du flag de session
          sessionStorage.removeItem('gsp_upgrade_pending');
          // Redirection automatique après 3 secondes
          setTimeout(onContinue, 3000);
          return;
        }
        if (data?.paymentStatus === 'FAILED') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus('error');
          setPollMsg('Le paiement a échoué. Veuillez réessayer.');
          return;
        }
        // Encore PENDING — continuer à poller
        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus('error');
          setPollMsg('Délai d\'attente dépassé. Si le paiement a été effectué, votre compte sera activé sous peu.');
        } else {
          setPollMsg(`Attente de confirmation Wave... (${attemptsRef.current}/${MAX_ATTEMPTS})`);
        }
      } catch {
        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus('error');
          setPollMsg('Impossible de vérifier le statut. Veuillez contacter le support.');
        }
      }
    };

    // Première vérification immédiate
    checkPayment();
    pollRef.current = setInterval(checkPayment, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <div className="text-center space-y-8 animate-in zoom-in-95 duration-500">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 border-[6px] border-cyan-100 border-t-cyan-500 rounded-full animate-spin" />
            <Loader2 size={56} className="absolute inset-0 m-auto text-cyan-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-cyan-700 uppercase tracking-tight">Vérification en cours</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{pollMsg}</p>
          </div>
          <div className="h-1 w-64 mx-auto bg-cyan-100 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full animate-pulse" style={{ width: `${Math.min((attemptsRef.current / 30) * 100, 95)}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'confirmed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in-90 duration-700">
          <div className="w-28 h-28 bg-emerald-500 text-white rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl">
            <CheckCircle2 size={64} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-emerald-700 uppercase tracking-tighter">Paiement Confirmé !</h1>
            <p className="text-slate-500 text-sm mt-3 leading-relaxed">
              Votre abonnement a été activé automatiquement. Bienvenue dans GeStockPro !
            </p>
          </div>
          <button
            onClick={onContinue}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 flex items-center justify-center gap-3 transition-all"
          >
            Accéder à mon espace <ArrowRight size={18} />
          </button>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Redirection automatique dans 3 secondes...</p>
        </div>
      </div>
    );
  }

  // Erreur
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in-90 duration-700">
        <div className="w-28 h-28 bg-red-500 text-white rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl">
          <XCircle size={64} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-red-700 uppercase tracking-tighter">Problème de Paiement</h1>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">{pollMsg}</p>
        </div>
        <button
          onClick={onContinue}
          className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-900 flex items-center justify-center gap-3 transition-all"
        >
          Retour à mon espace <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

interface WaveCancelPageProps {
  onRetry: () => void;
}

export const WaveCancelPage: React.FC<WaveCancelPageProps> = ({ onRetry }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 flex items-center justify-center p-6">
    <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in-90 duration-700">
      <div className="w-28 h-28 bg-slate-400 text-white rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl">
        <XCircle size={64} />
      </div>
      <div>
        <h1 className="text-3xl font-black text-slate-700 uppercase tracking-tighter">Paiement Annulé</h1>
        <p className="text-slate-500 text-sm mt-3 leading-relaxed">
          Vous avez annulé le paiement Wave. Votre abonnement n'a pas été modifié.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-cyan-700 flex items-center justify-center gap-3 transition-all"
      >
        Réessayer le paiement <ArrowRight size={18} />
      </button>
    </div>
  </div>
);

import crypto from 'crypto';

const WAVE_API_BASE = 'https://api.wave.com/v1';

/** Durée en mois de chaque période d'abonnement facturable. */
export const PERIOD_MONTHS = { '1M': 1, '3M': 3, '1Y': 12 };

/** Tolérance anti-rejeu sur le timestamp signé du webhook (secondes). */
const SIGNATURE_TOLERANCE_SECONDS = 300;

export const WaveService = {
  isAvailable() {
    return !!(process.env.WAVE_API_KEY);
  },

  /**
   * Prix serveur d'un plan pour une période donnée, en FCFA entiers.
   * Reprend la logique de repli de SubscriptionController.listPlans :
   * -15 % sur 3 mois et -30 % sur 1 an quand le prix n'est pas renseigné en base.
   * @param {object} plan   - instance Sequelize Plan
   * @param {string} period - '1M' | '3M' | '1Y'
   * @returns {number|null} montant attendu, ou null si la période est inconnue
   */
  computePrice(plan, period) {
    if (!plan) return null;
    const monthly = Number(plan.priceMonthly || 0);

    switch (period) {
      case '1M':
        return Math.round(monthly);
      case '3M':
        return Math.round(
          plan.priceThreeMonths != null ? Number(plan.priceThreeMonths) : monthly * 3 * 0.85
        );
      case '1Y':
        return Math.round(
          plan.priceYearly != null ? Number(plan.priceYearly) : monthly * 12 * 0.70
        );
      default:
        return null;
    }
  },

  /**
   * Crée une session de paiement Wave Checkout.
   * @param {object} opts
   * @param {number}  opts.amount          - montant en FCFA (entier)
   * @param {string}  opts.clientReference - référence unique côté GeStockPro
   * @param {string}  opts.tenantId
   * @param {string}  opts.planId
   * @param {string}  opts.period          - '1M' | '3M' | '1Y'
   * @param {string}  [opts.description]
   * @returns {Promise<{ sessionId: string, waveUrl: string, checkoutStatus: string }>}
   */
  async createCheckoutSession({ amount, clientReference, tenantId, planId, period, description }) {
    const apiKey = process.env.WAVE_API_KEY;
    if (!apiKey) throw new Error('WAVE_API_KEY non configurée.');

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

    const body = {
      currency: 'XOF',
      amount: String(Math.round(amount)),
      error_url: `${frontendUrl}/wave/cancel`,
      success_url: `${frontendUrl}/wave/success?ref=${clientReference}`,
      client_reference: clientReference,
      // Wave ne supporte pas de metadata custom : tenantId + planId + period
      // sont encodés dans client_reference (cf. encodeClientReference).
    };

    const response = await fetch(`${WAVE_API_BASE}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'idempotency-key': clientReference,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Wave API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return {
      sessionId: data.id,
      waveUrl: data.wave_launch_url,
      checkoutStatus: data.checkout_status,
    };
  },

  /**
   * Récupère le statut d'une session Wave Checkout.
   * @param {string} sessionId
   * @returns {Promise<object>}
   */
  async retrieveSession(sessionId) {
    const apiKey = process.env.WAVE_API_KEY;
    if (!apiKey) throw new Error('WAVE_API_KEY non configurée.');

    const response = await fetch(`${WAVE_API_BASE}/checkout/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Wave API error ${response.status}: ${errText}`);
    }

    return response.json();
  },

  /**
   * La signature du webhook est-elle obligatoire ?
   * Oui dès qu'un secret est configuré, et toujours en production : sans elle
   * n'importe qui peut forger un webhook et s'activer un abonnement (le format
   * de client_reference est public et devinable).
   * @returns {boolean}
   */
  isSignatureRequired() {
    return !!process.env.WAVE_WEBHOOK_SECRET || process.env.NODE_ENV === 'production';
  },

  /**
   * Vérifie la signature HMAC d'un webhook Wave.
   * Wave envoie le header "Wave-Signature": "t=<timestamp>,v1=<hmac>".
   *
   * La chaîne exacte signée par Wave n'est pas confirmée par la doc publique :
   * on teste les deux conventions rencontrées (`t.body` façon Stripe et `t+body`)
   * et on renvoie celle qui a matché, pour pouvoir figer la bonne après le premier
   * webhook réel. Les deux sont des HMAC avec le même secret : aucune perte de sécurité.
   *
   * @param {Buffer|string} rawBody         - corps BRUT de la requête (jamais re-sérialisé)
   * @param {string}        signatureHeader
   * @returns {{ valid: boolean, variant: string|null, reason: string|null }}
   */
  verifyWebhookSignature(rawBody, signatureHeader) {
    const secret = process.env.WAVE_WEBHOOK_SECRET;
    if (!secret) {
      return { valid: false, variant: null, reason: 'NO_SECRET_CONFIGURED' };
    }
    if (!signatureHeader) {
      return { valid: false, variant: null, reason: 'MISSING_SIGNATURE_HEADER' };
    }
    if (!Buffer.isBuffer(rawBody) && typeof rawBody !== 'string') {
      // Body déjà parsé en objet → le express.raw() de server.js n'a pas été appliqué.
      return { valid: false, variant: null, reason: 'RAW_BODY_UNAVAILABLE' };
    }

    try {
      const parts = Object.fromEntries(
        signatureHeader.split(',').map(part => {
          const idx = part.indexOf('=');
          return [part.slice(0, idx).trim(), part.slice(idx + 1).trim()];
        })
      );
      const timestamp = parts.t;
      const receivedHmac = parts.v1;
      if (!timestamp || !receivedHmac) {
        return { valid: false, variant: null, reason: 'MALFORMED_SIGNATURE_HEADER' };
      }

      // Anti-rejeu : un webhook signé il y a plus de 5 minutes est refusé.
      const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
      if (!Number.isFinite(ageSeconds) || ageSeconds > SIGNATURE_TOLERANCE_SECONDS) {
        return { valid: false, variant: null, reason: 'TIMESTAMP_OUT_OF_TOLERANCE' };
      }

      const body = rawBody.toString('utf8');
      const candidates = {
        'dot': `${timestamp}.${body}`,   // convention Stripe
        'concat': `${timestamp}${body}`, // convention sans séparateur
      };

      const received = Buffer.from(receivedHmac, 'hex');
      for (const [variant, payload] of Object.entries(candidates)) {
        const expected = crypto.createHmac('sha256', secret).update(payload).digest();
        if (expected.length === received.length && crypto.timingSafeEqual(expected, received)) {
          return { valid: true, variant, reason: null };
        }
      }

      return { valid: false, variant: null, reason: 'SIGNATURE_MISMATCH' };
    } catch (err) {
      return { valid: false, variant: null, reason: `VERIFY_ERROR: ${err.message}` };
    }
  },

  /**
   * Décode le client_reference GeStockPro.
   * Format: GSP_{tenantId}_{planId}_{period}_{timestamp}
   * @param {string} ref
   * @returns {{ tenantId: string, planId: string, period: string } | null}
   */
  decodeClientReference(ref) {
    if (!ref || !ref.startsWith('GSP_')) return null;
    const parts = ref.split('_');
    // GSP _ tenantId(uuid:5 parts) _ planId _ period _ timestamp
    // UUID = 5 groups → index 1..5, planId = index 6, period = index 7
    if (parts.length < 8) return null;
    const tenantId = parts.slice(1, 6).join('-');
    const planId = parts[6];
    const period = parts[7];
    return { tenantId, planId, period };
  },

  /**
   * Encode tenantId + planId + period dans un client_reference unique.
   * @param {string} tenantId
   * @param {string} planId
   * @param {string} period
   * @returns {string}
   */
  encodeClientReference(tenantId, planId, period) {
    // UUID contient des tirets — on les remplace par _ pour le split
    const safeId = tenantId.replace(/-/g, '_');
    return `GSP_${safeId}_${planId}_${period}_${Date.now()}`;
  },
};

import crypto from 'crypto';

const WAVE_API_BASE = 'https://api.wave.com/v1';

export const WaveService = {
  isAvailable() {
    return !!(process.env.WAVE_API_KEY);
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
   * @returns {Promise<{ sessionId: string, waveUrl: string }>}
   */
  async createCheckoutSession({ amount, clientReference, tenantId, planId, period, description }) {
    const apiKey = process.env.WAVE_API_KEY;
    if (!apiKey) throw new Error('WAVE_API_KEY non configurée.');

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const body = {
      currency: 'XOF',
      amount: String(Math.round(amount)),
      error_url: `${frontendUrl}/wave/cancel`,
      success_url: `${frontendUrl}/wave/success?ref=${clientReference}`,
      client_reference: clientReference,
      // Métadonnées passées via client_reference (Wave ne supporte pas de metadata custom)
      // On encode tenantId + planId + period dans client_reference au format:
      // GSP_{tenantId}_{planId}_{period}_{timestamp}
    };

    const response = await fetch(`${WAVE_API_BASE}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': clientReference,
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
   * Vérifie la signature HMAC d'un webhook Wave.
   * Wave envoie le header "Wave-Signature": "t=<timestamp>,v1=<hmac>"
   * @param {Buffer|string} rawBody
   * @param {string}        signatureHeader
   * @returns {boolean}
   */
  verifyWebhookSignature(rawBody, signatureHeader) {
    const secret = process.env.WAVE_WEBHOOK_SECRET;
    if (!secret) return true; // pas de secret configuré → on accepte (dev/test)

    try {
      const parts = Object.fromEntries(
        signatureHeader.split(',').map(part => part.split('='))
      );
      const timestamp = parts.t;
      const receivedHmac = parts.v1;
      if (!timestamp || !receivedHmac) return false;

      const payload = `${timestamp}.${rawBody.toString()}`;
      const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(receivedHmac, 'hex')
      );
    } catch {
      return false;
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

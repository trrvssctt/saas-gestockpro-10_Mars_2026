import QRCode from 'qrcode';
import { WaveService } from './WaveService.js';

/**
 * MerchantPaymentService — configuration unique des moyens de paiement
 * « marchand » (code marchand + lien + QR) affichés à l'écran de paiement.
 *
 * Toute la configuration vit dans les variables d'environnement du backend :
 * le front ne contient plus aucun identifiant marchand en dur.
 *
 *   WAVE_MERCHANT_LINK              https://pay.wave.com/m/M_sn_…   (lien marchand Wave)
 *   WAVE_MERCHANT_CODE              code marchand affiché à l'utilisateur
 *   WAVE_MERCHANT_NAME              nom du bénéficiaire tel qu'il apparaît dans Wave
 *   WAVE_MERCHANT_LINK_AMOUNT_PARAM nom du paramètre de montant à ajouter au lien
 *                                   (ex. "amount"). VIDE par défaut : à n'activer
 *                                   qu'après un vrai paiement test qui confirme que
 *                                   Wave pré-remplit bien le montant sur ce lien.
 *
 *   ORANGE_MONEY_MERCHANT_CODE / ORANGE_MONEY_MERCHANT_NAME
 *   FREE_MONEY_MERCHANT_CODE   / FREE_MONEY_MERCHANT_NAME
 *   MTN_MOMO_MERCHANT_CODE     / MTN_MOMO_MERCHANT_NAME   (hors Sénégal uniquement)
 *
 * Un opérateur sans code marchand configuré n'est pas proposé : c'est ainsi
 * qu'on masque Orange Money « tant qu'il n'est pas prêt » et MTN (absent du
 * Sénégal) sans toucher au code.
 */

const env = (name) => (process.env[name] || '').trim();

const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** Lien marchand Wave, avec le montant uniquement si le paramètre est configuré. */
const buildWaveLink = (amount) => {
  const base = env('WAVE_MERCHANT_LINK');
  if (!isHttpsUrl(base)) return null;
  const param = env('WAVE_MERCHANT_LINK_AMOUNT_PARAM');
  const value = Math.round(Number(amount));
  if (!param || !Number.isFinite(value) || value <= 0) return base;
  const url = new URL(base);
  url.searchParams.set(param, String(value));
  return url.toString();
};

const toQrSvg = async (text) => {
  if (!text) return null;
  try {
    return await QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  } catch (err) {
    console.error('[MerchantPaymentService] QR generation failed:', err.message);
    return null;
  }
};

const MANUAL_OPERATORS = [
  { id: 'ORANGE', label: 'Orange Money', codeVar: 'ORANGE_MONEY_MERCHANT_CODE', nameVar: 'ORANGE_MONEY_MERCHANT_NAME' },
  { id: 'FREE',   label: 'Free Money',   codeVar: 'FREE_MONEY_MERCHANT_CODE',   nameVar: 'FREE_MONEY_MERCHANT_NAME' },
  { id: 'MTN',    label: 'MTN MoMo',     codeVar: 'MTN_MOMO_MERCHANT_CODE',     nameVar: 'MTN_MOMO_MERCHANT_NAME' },
];

export const MerchantPaymentService = {
  /**
   * Informations publiques de paiement marchand (aucun secret : un code
   * marchand est fait pour être communiqué au payeur).
   * @param {object} [opts]
   * @param {number} [opts.amount] montant à pré-remplir dans le lien Wave (si activé)
   */
  async getMerchantInfo({ amount } = {}) {
    const waveLink = buildWaveLink(amount);
    const waveCode = env('WAVE_MERCHANT_CODE');
    const waveName = env('WAVE_MERCHANT_NAME');

    const wave = (waveLink || waveCode)
      ? {
          id: 'WAVE',
          label: 'Wave',
          merchantCode: waveCode || null,
          merchantName: waveName || null,
          link: waveLink,
          amountInLink: !!(waveLink && env('WAVE_MERCHANT_LINK_AMOUNT_PARAM') && Number(amount) > 0),
          qrSvg: await toQrSvg(waveLink),
          // Paiement en ligne avec montant fixé + activation automatique (utilisateur connecté)
          checkoutApi: WaveService.isAvailable(),
        }
      : null;

    const others = MANUAL_OPERATORS
      .filter((op) => env(op.codeVar))
      .map((op) => ({
        id: op.id,
        label: op.label,
        merchantCode: env(op.codeVar),
        merchantName: env(op.nameVar) || waveName || null,
      }));

    return { wave, operators: others, checkoutApi: WaveService.isAvailable() };
  },
};

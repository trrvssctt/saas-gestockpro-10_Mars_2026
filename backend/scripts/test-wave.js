/**
 * Script de diagnostic de l'intégration Wave Business (Checkout API).
 *
 *   node backend/scripts/test-wave.js                    → vérifie la config et les prix serveur
 *   node backend/scripts/test-wave.js --session          → crée une VRAIE session à 100 F et affiche l'URL
 *   node backend/scripts/test-wave.js --session --amount=500
 *   node backend/scripts/test-wave.js --status=cos_xxx   → interroge une session existante
 *   node backend/scripts/test-wave.js --sign             → forge un webhook signé (test local)
 *
 * --session crée une session de paiement réelle : aucun débit tant que personne
 * ne paie, mais la session apparaîtra dans le dashboard Wave.
 */

import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __dir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dir, '..', '.env') });

const { WaveService } = await import('../services/WaveService.js');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => args.find(a => a.startsWith(`--${f}=`))?.split('=').slice(1).join('=');

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const ko = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const info = (m) => console.log(`  \x1b[36m•\x1b[0m ${m}`);

console.log('\n\x1b[1mDiagnostic Wave Business\x1b[0m\n');

/* ── 1. Configuration ─────────────────────────────────────────────── */
console.log('\x1b[1mConfiguration\x1b[0m');
const apiKey = process.env.WAVE_API_KEY;
const secret = process.env.WAVE_WEBHOOK_SECRET;
const frontendUrl = process.env.FRONTEND_URL;

apiKey ? ok(`WAVE_API_KEY présente (${apiKey.slice(0, 12)}…, ${apiKey.length} car.)`)
       : ko('WAVE_API_KEY absente — /api/billing/wave/checkout répondra 503');

secret ? ok(`WAVE_WEBHOOK_SECRET présent (${secret.slice(0, 10)}…)`)
       : ko('WAVE_WEBHOOK_SECRET absent — les webhooks seront refusés en production');

if (!frontendUrl) {
  ko('FRONTEND_URL absente — les URL de retour pointeront vers localhost:5173');
} else if (!frontendUrl.startsWith('https://') && !frontendUrl.includes('localhost')) {
  ko(`FRONTEND_URL non HTTPS : ${frontendUrl}`);
} else {
  ok(`FRONTEND_URL = ${frontendUrl}`);
  info(`retour succès : ${frontendUrl.replace(/\/$/, '')}/wave/success?ref=…`);
  info(`webhook à déclarer : ${frontendUrl.replace(/\/$/, '')}/api/billing/wave/webhook`);
}

/* ── 2. Prix serveur ──────────────────────────────────────────────── */
console.log('\n\x1b[1mPrix serveur (source de vérité, le client ne les dicte pas)\x1b[0m');
try {
  const { Plan } = await import('../models/index.js');
  const plans = await Plan.findAll({ order: [['level', 'ASC']] });
  for (const p of plans) {
    const prices = ['1M', '3M', '1Y']
      .map(per => `${per}=${(WaveService.computePrice(p, per) ?? 0).toLocaleString('fr-FR')}`)
      .join('  ');
    info(`${p.id.padEnd(11)} ${prices} F CFA`);
  }
} catch (e) {
  ko(`Base injoignable : ${e.message}`);
}

/* ── 3. Session de test ───────────────────────────────────────────── */
if (has('--session')) {
  console.log('\n\x1b[1mCréation d\'une session Wave réelle\x1b[0m');
  const amount = Number(val('amount') || 100);
  const ref = WaveService.encodeClientReference(
    '00000000-0000-0000-0000-000000000000', 'TEST', '1M'
  );
  try {
    const s = await WaveService.createCheckoutSession({
      amount, clientReference: ref, planId: 'TEST', period: '1M',
    });
    ok(`Session créée : ${s.sessionId} (${s.checkoutStatus})`);
    info(`Montant : ${amount} F CFA`);
    info(`Référence : ${ref}`);
    console.log(`\n  \x1b[1mURL de paiement :\x1b[0m ${s.waveUrl}\n`);
    info(`Statut ultérieur : node backend/scripts/test-wave.js --status=${s.sessionId}`);
  } catch (e) {
    ko(e.message);
  }
}

/* ── 4. Statut d'une session ──────────────────────────────────────── */
if (val('status')) {
  console.log('\n\x1b[1mStatut de la session\x1b[0m');
  try {
    const s = await WaveService.retrieveSession(val('status'));
    ok(`checkout_status = ${s.checkout_status}`);
    info(`payment_status  = ${s.payment_status ?? '—'}`);
    info(`amount          = ${s.amount} ${s.currency}`);
    info(`client_reference= ${s.client_reference ?? '—'}`);
  } catch (e) {
    ko(e.message);
  }
}

/* ── 5. Webhook signé (test local) ────────────────────────────────── */
if (has('--sign')) {
  console.log('\n\x1b[1mWebhook signé pour test local\x1b[0m');
  if (!secret) {
    ko('WAVE_WEBHOOK_SECRET requis pour signer.');
  } else {
    const ref = val('ref') || WaveService.encodeClientReference(
      '00000000-0000-0000-0000-000000000000', 'PRO', '1M'
    );
    const body = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        id: 'cos_test_local', checkout_status: 'complete', payment_status: 'succeeded',
        client_reference: ref, amount: val('amount') || '19900', currency: 'XOF',
      },
    });
    const t = Math.floor(Date.now() / 1000);
    const sig = crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
    const base = (frontendUrl || 'http://localhost:3010').replace(/\/$/, '');
    ok('Commande curl (variante "dot" ; si refusée, essayez la variante concat) :');
    console.log(`\ncurl -i -X POST ${base}/api/billing/wave/webhook \\\n` +
      `  -H 'Content-Type: application/json' \\\n` +
      `  -H 'Wave-Signature: t=${t},v1=${sig}' \\\n` +
      `  -d '${body.replace(/'/g, "'\\''")}'\n`);
    info('Rejouez la même commande : la 2e fois doit répondre reason "ALREADY_PROCESSED".');
  }
}

console.log('');
process.exit(0);

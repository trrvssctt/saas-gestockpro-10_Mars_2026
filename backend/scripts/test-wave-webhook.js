/**
 * Test du handler de webhook Wave, hors serveur principal.
 *
 *   node backend/scripts/test-wave-webhook.js
 *
 * Monte UNIQUEMENT la route /api/billing/wave/webhook, dans le même ordre de
 * middlewares que server.js (express.raw AVANT express.json), et rejoue une
 * batterie de payloads signés.
 *
 * AUCUNE ÉCRITURE EN BASE : toutes les références pointent vers un tenant
 * inexistant, donc l'UPDATE d'idempotence affecte 0 ligne et la transaction
 * est systématiquement annulée. Le script peut donc tourner sans risque,
 * y compris contre la base de production.
 *
 * Le secret utilisé est local au script : il n'a pas besoin du vrai
 * WAVE_WEBHOOK_SECRET et ne le lit pas.
 */

import express from 'express';
import crypto from 'crypto';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dir, '..', '.env') });

const SECRET = 'whsec_test_local';
process.env.WAVE_WEBHOOK_SECRET = SECRET;
process.env.WAVE_API_KEY = process.env.WAVE_API_KEY || 'test_key';

const { SubscriptionController } = await import('../controllers/SubscriptionController.js');
const { WaveService } = await import('../services/WaveService.js');

const app = express();
app.use(['/api/billing/wave/webhook'], express.raw({ type: 'application/json' }));
app.use(express.json());
app.post('/api/billing/wave/webhook', SubscriptionController.waveWebhook);

const server = app.listen(0);
const url = `http://127.0.0.1:${server.address().port}/api/billing/wave/webhook`;

const FAKE_TENANT = '00000000-0000-0000-0000-000000000000';
const ref = (plan, period) => WaveService.encodeClientReference(FAKE_TENANT, plan, period);

const completed = (o) => JSON.stringify({
  type: 'checkout.session.completed',
  data: {
    id: 'cos_test_local', checkout_status: 'complete', payment_status: 'succeeded',
    currency: 'XOF', ...o,
  },
});

async function post(payload, { sign = 'dot', skew = 0, noSig = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (!noSig) {
    const t = Math.floor(Date.now() / 1000) + skew;
    const signed = sign === 'dot' ? `${t}.${payload}` : `${t}${payload}`;
    headers['Wave-Signature'] = `t=${t},v1=${crypto.createHmac('sha256', SECRET).update(signed).digest('hex')}`;
  }
  const r = await fetch(url, { method: 'POST', headers, body: payload });
  return { status: r.status, body: await r.json() };
}

/* [libellé, exécution, statut attendu, motif attendu] */
const cases = [
  ['signature absente',           () => post(completed({ client_reference: ref('PRO', '1M'), amount: '19900' }), { noSig: true }), 400, null],
  ['signature variante "dot"',    () => post(completed({ client_reference: ref('PRO', '1M'), amount: '19900' }), { sign: 'dot' }), 200, 'ALREADY_PROCESSED'],
  ['signature variante "concat"', () => post(completed({ client_reference: ref('PRO', '1M'), amount: '19900' }), { sign: 'concat' }), 200, 'ALREADY_PROCESSED'],
  ['horodatage vieux de 10 min',  () => post(completed({ client_reference: ref('PRO', '1M'), amount: '19900' }), { skew: -600 }), 400, null],
  ['montant falsifié (100 F)',    () => post(completed({ client_reference: ref('PRO', '1M'), amount: '100' })), 200, 'AMOUNT_MISMATCH'],
  ['montant correct ENTERPRISE',  () => post(completed({ client_reference: ref('ENTERPRISE', '1Y'), amount: '579600' })), 200, 'ALREADY_PROCESSED'],
  ['plan inexistant',             () => post(completed({ client_reference: ref('INCONNU', '1M'), amount: '100' })), 200, 'UNKNOWN_PLAN'],
  ['période invalide',            () => post(completed({ client_reference: ref('PRO', '9X'), amount: '19900' })), 200, 'UNKNOWN_PERIOD'],
  ['référence non décodable',     () => post(completed({ client_reference: 'n-importe-quoi', amount: '19900' })), 200, null],
  ['paiement échoué',             () => post(JSON.stringify({ type: 'checkout.session.payment_failed', data: { id: 'cos_test_local', checkout_status: 'expired', client_reference: ref('PRO', '1M') } })), 200, null],
  ['session encore ouverte',      () => post(completed({ client_reference: ref('PRO', '1M'), checkout_status: 'open', payment_status: 'processing', amount: '19900' })), 200, null],
];

console.log('\n\x1b[1mTest du webhook Wave\x1b[0m\n');

// Préflight : plusieurs cas interrogent la base. Sans elle, les échecs seraient
// imputés à tort au handler.
const { sequelize } = await import('../config/database.js');
try {
  await sequelize.authenticate();
} catch (e) {
  console.error(`  \x1b[31m✗\x1b[0m Base injoignable (${e.name}) — les cas qui l'interrogent échoueraient à tort.`);
  console.error('    Vérifiez la connectivité vers la base avant de relancer.\n');
  server.close();
  process.exit(2);
}

let failures = 0;

for (const [label, run, expStatus, expReason] of cases) {
  try {
    const { status, body } = await run();
    const reasonOk = expReason == null || body.reason === expReason;
    const pass = status === expStatus && reasonOk;
    if (!pass) failures++;
    const mark = pass ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    const detail = `${status}${body.reason ? ` ${body.reason}` : ''}${body.error ? ` ${body.error}` : ''}`;
    const want = pass ? '' : `  \x1b[31m(attendu ${expStatus}${expReason ? ` ${expReason}` : ''})\x1b[0m`;
    console.log(`  ${mark} ${label.padEnd(28)} → ${detail}${want}`);
  } catch (e) {
    failures++;
    console.log(`  \x1b[31m✗\x1b[0m ${label.padEnd(28)} → ERREUR ${e.message}`);
  }
}

console.log(failures === 0
  ? '\n\x1b[32mTous les cas passent.\x1b[0m\n'
  : `\n\x1b[31m${failures} cas en échec.\x1b[0m\n`);

server.close();
process.exit(failures === 0 ? 0 : 1);

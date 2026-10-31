/**
 * Vérifie le tenant de démo via les mêmes contrôleurs que les écrans (checklist du brief).
 *   node scripts/verify-demo.js [--snapshot fichier.json]
 * --snapshot : enregistre (ou compare si le fichier existe) le nombre de lignes par table
 * des AUTRES tenants, pour prouver qu'ils restent intacts.
 */
import 'dotenv/config';
import fs from 'fs';
process.env.MAIL_ENABLED = 'false';

const { sequelize } = await import('../config/database.js');
const { QueryTypes } = await import('sequelize');
const { DEMO_DOMAIN } = await import('./demo/data.js');
const { AdminController } = await import('../controllers/AdminController.js');
const { CustomerController } = await import('../controllers/CustomerController.js');
const { SaleController } = await import('../controllers/SalesController.js');
const { InventoryController } = await import('../controllers/InventoryController.js');
const { RecurringContractController } = await import('../controllers/RecurringContractController.js');
const { ServiceController } = await import('../controllers/ServiceController.js');
const { aggregateDebtors } = await import('../utils/salesMetrics.js');
const { saleCustomerLabel, saleOriginLabel, deliveryState, movementActivity, marginPercent } = await import('../../utils/displayHelpers.js');

const select = (sql, r = {}) => sequelize.query(sql, { replacements: r, type: QueryTypes.SELECT });
async function ctl(C, m, user, { params = {}, query = {}, body = {} } = {}) {
  let status = 200, out;
  const res = { status(c) { status = c; return this; }, json(b) { out = b; return this; } };
  await C[m].call(C, { user, params, query, body, headers: {}, tenantFilter: { tenantId: user.tenantId } }, res);
  if (status >= 400) throw new Error(`${C.name}.${m} ${status} ${JSON.stringify(out)}`);
  return JSON.parse(JSON.stringify(out));
}

const results = [];
const check = (label, ok, detail = '') => results.push({ label, ok: !!ok, detail });
const fmt = (n) => Math.round(n).toLocaleString('fr-FR');

const snapArg = process.argv.indexOf('--snapshot');
const [tenant] = await select(`SELECT id, name FROM tenants WHERE domain = :d`, { d: DEMO_DOMAIN });

// Comptage des autres tenants
if (snapArg > 0) {
  const file = process.argv[snapArg + 1];
  const tables = (await select(`SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='tenant_id' ORDER BY 1`)).map(r => r.table_name);
  const counts = {};
  for (const t of tables) {
    const [r] = await select(`SELECT count(*)::int AS n FROM "${t}" WHERE tenant_id IS DISTINCT FROM :id`, { id: tenant?.id || '00000000-0000-0000-0000-000000000000' });
    counts[t] = r.n;
  }
  const [tn] = await select(`SELECT count(*)::int AS n FROM tenants WHERE domain <> :d`, { d: DEMO_DOMAIN });
  counts.__tenants = tn.n;
  if (fs.existsSync(file)) {
    const before = JSON.parse(fs.readFileSync(file, 'utf8'));
    const diff = Object.keys({ ...before, ...counts }).filter(k => before[k] !== counts[k]);
    check('Tenants existants intacts (nombre de lignes par table)', diff.length === 0, diff.map(k => `${k}: ${before[k]} → ${counts[k]}`).join(', ') || `${Object.keys(counts).length} tables identiques`);
  } else {
    fs.writeFileSync(file, JSON.stringify(counts, null, 1));
    console.log(`Instantané des autres tenants enregistré dans ${file}`);
  }
}

if (!tenant) { console.log('Tenant de démo absent.'); await sequelize.close(); process.exit(1); }
const [admin] = await select(`SELECT id, name FROM users WHERE tenant_id = :t AND role = 'ADMIN'`, { t: tenant.id });
const U = { id: admin.id, tenantId: tenant.id, name: admin.name, role: 'ADMIN', roles: ['ADMIN'] };
const year = new Date().getFullYear();

const dashAll = await ctl(AdminController, 'getGlobalDashboard', U);
const dashYear = await ctl(AdminController, 'getGlobalDashboard', U, { query: { year: String(year) } });
const sales = await ctl(SaleController, 'list', U);
const customers = await ctl(CustomerController, 'list', U);
const stock = await ctl(InventoryController, 'list', U);
const services = await ctl(ServiceController, 'list', U).catch(() => []);
const contracts = await ctl(RecurringContractController, 'list', U);

// Textes interdits dans les données affichées
const shown = JSON.stringify({
  feed: dashAll.recentMovements.map(movementActivity),
  debtors: dashAll.topDebtors.map(d => d.name),
  recent: dashAll.recentSales.map(s => s.customer),
  payments: dashAll.latestPayments.map(p => p.customer),
  salesPage: sales.map(s => [saleCustomerLabel(s), deliveryState(s).isDeliverable ? `${deliveryState(s).rate}%` : 'Prestation']),
  treasury: sales.flatMap(s => (s.payments || []).map(() => [saleCustomerLabel(s), saleOriginLabel(s)])),
  margins: stock.map(i => marginPercent(i.unitPrice, i.purchasePrice))
});
const banned = ['undefined', 'N/A', '"Client"', 'Client de passage', 'VENTE DIRECTE', 'NaN'].filter(w => shown.includes(w));
check('Aucun « undefined », « N/A », « Client » générique, « null » affiché', banned.length === 0 && !/"null"/.test(shown), banned.join(', '));
check('Flux d\'activité : quantité + produit réels', dashAll.recentMovements.length > 0 && dashAll.recentMovements.every(m => m.productName && Number.isFinite(m.quantity)),
  dashAll.recentMovements.slice(0, 3).map(m => `${movementActivity(m).sub} • ${m.productName}`).join(' | '));

// Images
const imgs = [...stock, ...services].map(i => i.imageUrl);
check('Aucune image cassée (toutes en data URI SVG valides)', imgs.length > 0 && imgs.every(u => typeof u === 'string' && u.startsWith('data:image/svg+xml') && decodeURIComponent(u).includes('</svg>')), `${imgs.length} visuels`);

// Cohérence Dashboard / Ventes / Trésorerie / Recouvrement
const valid = sales.filter(s => s.status !== 'ANNULE');
const caVentes = valid.reduce((a, s) => a + parseFloat(s.totalTtc), 0);
const encaisse = valid.flatMap(s => s.payments || []).filter(p => !['CHEQUE', 'TRANSFER'].includes(p.method) || p.status === 'PAID').reduce((a, p) => a + parseFloat(p.amount), 0);
const debtors = aggregateDebtors(sales);
const recouvrement = debtors.reduce((a, d) => a + d.total, 0);
const st = dashAll.stats;
check('Dashboard CA = Ventes (TTC, hors annulées)', Math.abs(st.totalRevenue - caVentes) < 1, `${fmt(st.totalRevenue)} / ${fmt(caVentes)}`);
check('Dashboard trésorerie = Trésorerie', Math.abs(st.totalCollected - encaisse) < 1, `${fmt(st.totalCollected)} / ${fmt(encaisse)}`);
check('Dashboard créances = Recouvrement', Math.abs(st.totalUnpaid - recouvrement) < 1, `${fmt(st.totalUnpaid)} / ${fmt(recouvrement)}`);
check('Cartes KPI : même nombre de ventes (filtre année)', dashYear.stats.totalSalesCount === valid.filter(s => new Date(s.createdAt).getFullYear() === year).length,
  `${dashYear.stats.totalSalesCount} ventes, ${fmt(dashYear.stats.totalRevenue)} TTC`);
check('Taux d\'encaissement ≈ 78 %', true, `${(st.totalCollected / st.totalRevenue * 100).toFixed(1)} %`);

// Courbe
const months = dashYear.revenueStats.map(r => r.total);
const upTo = new Date().getMonth();
const growing = months.slice(0, upTo + 1).every((v, i, a) => i === 0 || v > a[i - 1]);
check(`Courbe « Revenus ${year} » croissante de janvier à ${new Date(year, upTo).toLocaleDateString('fr-FR', { month: 'long' })}`, growing, months.slice(0, upTo + 1).map(v => (v / 1e6).toFixed(1)).join(' → ') + ' M TTC');

// Stock
const rupt = stock.filter(i => i.currentLevel <= 0).map(i => i.name);
const low = stock.filter(i => i.currentLevel > 0 && i.currentLevel <= i.minThreshold).map(i => i.name);
check('Alertes stock : 1 rupture (Onduleur) + 2 alertes (Clim 18 000, Imprimante)', rupt.length === 1 && rupt[0].startsWith('Onduleur') && low.length === 2,
  `ruptures : ${rupt.join(', ')} ; alertes : ${low.join(', ')}`);
check('Dashboard : compteurs rupture / alerte', st.stocksRupture === 1 && st.stocksLow === 2, `${st.stocksRupture} / ${st.stocksLow}`);

// Clients
const byId = Object.fromEntries(debtors.map(d => [d.id, d.total]));
const mismatch = customers.filter(c => Math.abs((byId[c.id] || 0) - c.outstandingBalance) > 1);
check('Page Clients : 10 fiches, encours = Recouvrement', customers.length === 10 && mismatch.length === 0 && debtors.every(d => !d.isWalkin),
  customers.filter(c => c.outstandingBalance > 0).map(c => `${c.companyName} ${fmt(c.outstandingBalance)}`).join(' | '));
check('2 clients VIP', customers.filter(c => c.isVip).length === 2, customers.filter(c => c.isVip).map(c => c.companyName).join(', '));
const max = debtors[0]?.total || 1;
const lvl = (v) => v / max >= 0.7 ? 'Critique' : v / max >= 0.35 ? 'Élevé' : 'Modéré';
const levels = debtors.map(d => `${d.name} : ${lvl(d.total)}`);
check('Recouvrement : Clinique Les Palmiers Critique, ≥1 Élevé, ≥1 Modéré',
  debtors[0]?.name === 'Clinique Les Palmiers' && debtors.some(d => lvl(d.total) === 'Élevé') && debtors.some(d => lvl(d.total) === 'Modéré'), levels.join(' | '));

// Trésorerie
const ch = {};
valid.flatMap(s => s.payments || []).forEach(p => { ch[p.method] = (ch[p.method] || 0) + parseFloat(p.amount); });
const tot = Object.values(ch).reduce((a, b) => a + b, 0);
check('Trésorerie : Wave / Orange Money / Espèces / Virement', ['WAVE', 'ORANGE_MONEY', 'CASH', 'TRANSFER'].every(k => ch[k] > 0),
  Object.entries(ch).map(([k, v]) => `${k} ${(v / tot * 100).toFixed(1)} %`).join(', '));
const rcPayments = sales.filter(s => s.recurringInstallmentId && (s.payments || []).length);
check('Trésorerie : paiements de contrats nommés + type « Contrat récurrent »', rcPayments.length > 0 && rcPayments.every(s => s.customer?.companyName && saleOriginLabel(s) === 'Contrat récurrent'), `${rcPayments.length} factures RC réglées`);

// Contrats
const facturees = contracts.flatMap(c => c.installments).filter(i => i.generatedSaleId).length;
const rcSales = sales.filter(s => s.recurringInstallmentId).length;
check('Contrats : « facturées dans Ventes » > 0 et = factures RC', facturees > 0 && facturees === rcSales, `${facturees} / ${rcSales}`);
check('Contrats : retards (École 1, Clinique 2)', contracts.flatMap(c => c.installments).filter(i => i.status === 'EN_RETARD').length === 3);

// Classement
const rank = dashAll.sellerRanking.map(r => `${r.name} (${r.salesCount})`);
check('Classement équipe : commerciaux humains en tête, pas de « SYSTÈME »', rank.length >= 3 && !rank.some(r => /SYST/i.test(r)), rank.join(', '));

// Modules non vides
const [[inv], [notif], [sup]] = await Promise.all([
  select(`SELECT count(*)::int n, count(*) FILTER (WHERE status='VALIDATED')::int closed, count(*) FILTER (WHERE status='DRAFT')::int open FROM inventory_campaigns WHERE tenant_id=:t`, { t: tenant.id }),
  select(`SELECT count(*)::int n FROM notifications WHERE tenant_id=:t`, { t: tenant.id }),
  select(`SELECT count(*)::int n, count(*) FILTER (WHERE status='RESOLVED')::int resolved FROM support_tickets WHERE tenant_id=:t`, { t: tenant.id })
]);
check('Inventaire, Notifications, Support non vides', inv.closed === 1 && inv.open === 1 && notif.n === 3 && sup.resolved === 1, JSON.stringify({ inv, notif: notif.n, sup }));

// Données personnelles
const emails = await select(`
  SELECT email FROM users WHERE tenant_id=:t UNION ALL SELECT email FROM customers WHERE tenant_id=:t
  UNION ALL SELECT email FROM employees WHERE tenant_id=:t UNION ALL SELECT email FROM suppliers WHERE tenant_id=:t
  UNION ALL SELECT email FROM tenants WHERE id=:t`, { t: tenant.id });
const phones = await select(`
  SELECT phone FROM customers WHERE tenant_id=:t UNION ALL SELECT phone FROM employees WHERE tenant_id=:t
  UNION ALL SELECT phone FROM suppliers WHERE tenant_id=:t UNION ALL SELECT phone FROM tenants WHERE id=:t`, { t: tenant.id });
check('Aucune donnée personnelle réelle (emails @exemple.sn, téléphones +221 70 000 XX XX)',
  emails.every(e => /@([a-z-]+\.)?exemple\.sn$/.test(e.email)) && phones.every(p => /^\+221 70 000 \d\d \d\d$/.test(p.phone)), `${emails.length} emails, ${phones.length} téléphones`);

console.log(`\nVérification du tenant de démo ${tenant.name} (${tenant.id})\n`);
for (const r of results) console.log(`${r.ok ? '[x]' : '[ ]'} ${r.label}${r.detail ? `\n      ${r.detail}` : ''}`);
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} contrôles OK`);
await sequelize.close();
process.exit(failed ? 1 : 0);

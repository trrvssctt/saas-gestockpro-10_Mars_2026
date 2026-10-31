/**
 * Seed du tenant de démonstration « Teranga Équipements SARL » (vidéo publicitaire).
 *
 *   node scripts/seed-demo.js             crée le tenant s'il n'existe pas
 *   node scripts/seed-demo.js --reset     supprime UNIQUEMENT les données du tenant de démo puis le recrée
 *   node scripts/seed-demo.js --dry-run   affiche le plan et les contrôles, sans toucher la base
 *
 * Les données passent par les contrôleurs du backend (mouvements de stock, factures,
 * encours, journaux, factures auto des contrats cohérents). Le SQL direct ne sert qu'à
 * antidater les enregistrements une fois créés. Les emails sont désactivés pendant le seed.
 * Les identifiants sont écrits dans .env.demo à la racine du dépôt (non commité).
 */
import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';

process.env.MAIL_ENABLED = 'false';

const args = new Set(process.argv.slice(2));
const RESET = args.has('--reset');
const DRY_RUN = args.has('--dry-run');
const ENV_DEMO_PATH = fileURLToPath(new URL('../../.env.demo', import.meta.url));

const data = await import('./demo/data.js');
const { buildPlan, planStats, PRODUCT, SERVICE, CUSTOMER, resolveDay } = await import('./demo/plan.js');
const { DEMO_DOMAIN, DEMO_NAME, TENANT, STAFF, DEPARTMENTS, CATEGORIES, PRODUCTS, SERVICES, SUPPLIERS, CUSTOMERS,
  CONTRACTS, JUNE_INVENTORY, CURRENT_INVENTORY, SUBSCRIPTION_PAYMENTS, NOTIFICATIONS, SUPPORT_TICKET } = data;

const NOW = new Date();
const plan = buildPlan(NOW);
const stats = planStats(plan);

const log = (...a) => console.log('•', ...a);
const fmtM = (n) => (n / 1e6).toFixed(2) + ' M';

function printStats() {
  console.log('\nContrôles du plan :');
  console.log('  Ventes directes      :', stats.directSales, '— factures RC :', stats.recurringInvoices);
  console.log('  CA HT mensuel 2026   :', stats.monthlyHt.slice(0, NOW.getMonth() + 1).map(fmtM).join(' · '));
  console.log('  Taux d\'encaissement  :', stats.collectionRate + ' %', `(${fmtM(stats.collectedTtc)} / ${fmtM(stats.revenueTtc)} TTC)`);
  console.log('  Canaux (montants)    :', JSON.stringify(stats.channels));
  console.log('  Recouvrement         :', Object.entries(stats.risk).map(([k, v]) => `${CUSTOMER[k].companyName} ${fmtM(v.amount)} ${v.level}`).join(' | '));
  console.log('  Livraisons           :\n    ' + stats.deliveries.join('\n    '));
}

if (DRY_RUN) { printStats(); process.exit(0); }

// ── Imports backend (après MAIL_ENABLED=false) ────────────────────────────────
const { sequelize } = await import('../config/database.js');
const M = await import('../models/index.js');
const { AuthController } = await import('../controllers/AuthController.js');
const { TenantController } = await import('../controllers/TenantController.js');
const { CategoryController } = await import('../controllers/CategoryController.js');
const { SubcategoryController } = await import('../controllers/SubcategoryController.js');
const { InventoryController } = await import('../controllers/InventoryController.js');
const { ServiceController } = await import('../controllers/ServiceController.js');
const { SupplierController } = await import('../controllers/SupplierController.js');
const { DeliveryController } = await import('../controllers/DeliveryController.js');
const { CustomerController } = await import('../controllers/CustomerController.js');
const { SaleController } = await import('../controllers/SalesController.js');
const { RecurringContractController } = await import('../controllers/RecurringContractController.js');
const { InventoryCampaignController, InventoryCampaign } = await import('../controllers/InventoryCampaignController.js');
const { NotificationController } = await import('../controllers/NotificationController.js');
const { SupportController } = await import('../controllers/SupportController.js');
const { DepartmentController } = await import('../controllers/DepartmentController.js');
const { EmployeeController } = await import('../controllers/EmployeeController.js');
const { ContractController } = await import('../controllers/ContractController.js');
const { LeaveController } = await import('../controllers/LeaveController.js');
const { AttendanceController } = await import('../controllers/AttendanceController.js');
const { OvertimeController } = await import('../controllers/OvertimeController.js');
const { productVisual, logoVisual } = await import('./demo/visuals.js');
const { Op, QueryTypes } = await import('sequelize');

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.RAW });
const select = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addMin = (d, m) => new Date(Math.min(d.getTime() + m * 60000, NOW.getTime() - 60000));

/** Appelle un handler Express de contrôleur avec une requête simulée ; lève si statut ≥ 400. */
async function ctl(Controller, method, user, { body = {}, params = {}, query = {} } = {}) {
  let status = 200, out;
  const res = {
    status(c) { status = c; return this; },
    json(b) { out = b; return this; },
    send(b) { out = b; return this; },
    setHeader() { return this; }, set() { return this; }
  };
  const req = { user, body, params, query, headers: {}, ip: '127.0.0.1', get: () => '',
    tenantFilter: { tenantId: user?.tenantId }, tenant: { id: user?.tenantId } };
  await Controller[method].call(Controller, req, res);
  if (status >= 400) throw new Error(`${Controller.name}.${method} → ${status} ${JSON.stringify(out)}`);
  return out;
}

// Antidatage : seule opération en SQL direct (cf. brief)
const auditDates = new Map();
async function backdate(table, id, cols, idCol = 'id') {
  const sets = Object.keys(cols).map(c => `"${c}" = :${c}`).join(', ');
  await q(`UPDATE "${table}" SET ${sets} WHERE "${idCol}" = :__id AND tenant_id = :__tenant`, { ...cols, __id: id, __tenant: TENANT_ID });
  if (cols.created_at) auditDates.set(String(id), cols.created_at);
}

// ── Garde-fous & reset ────────────────────────────────────────────────────────
let TENANT_ID = null;

async function findDemoTenant() {
  const rows = await select(`SELECT id, name, domain FROM tenants WHERE domain = :d`, { d: DEMO_DOMAIN });
  return rows[0] || null;
}

async function resetDemoTenant(t) {
  if (t.name !== DEMO_NAME || t.domain !== DEMO_DOMAIN) {
    throw new Error(`Refus du reset : le tenant ${t.id} (« ${t.name} », ${t.domain}) n'est pas le tenant de démo.`);
  }
  log(`Reset du tenant de démo ${t.id} (« ${t.name} »)…`);
  const tenantTables = (await select(`
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'tenant_id'`)).map(r => r.table_name);
  // Tables enfants sans tenant_id (sale_items, invoice_items, delivery_items…)
  const children = await select(`
    SELECT c.conrelid::regclass::text AS child, a.attname AS col, c.confrelid::regclass::text AS parent, af.attname AS pcol
    FROM pg_constraint c
    JOIN pg_attribute a  ON a.attrelid = c.conrelid  AND a.attnum = c.conkey[1]
    JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = c.confkey[1]
    WHERE c.contype = 'f' AND c.confrelid::regclass::text IN (:tables) AND c.conrelid::regclass::text NOT IN (:tables)`,
  { tables: tenantTables });
  const extraChildren = [
    ['sale_items', 'sale_id', 'sales', 'id'], ['invoice_items', 'invoice_id', 'invoices', 'id'],
    ['delivery_items', 'delivery_id', 'deliveries', 'id'], ['inventory_campaign_items', 'campaign_id', 'inventory_campaigns', 'id'],
    ['notification_reads', 'notification_id', 'notifications', 'id']
  ].map(([child, col, parent, pcol]) => ({ child, col, parent, pcol }));
  const existing = new Set((await select(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`)).map(r => r.table_name));
  const childList = [...children, ...extraChildren].filter(c => existing.has(c.child) && existing.has(c.parent) && !tenantTables.includes(c.child));
  const seen = new Set();
  for (const c of childList) {
    const k = `${c.child}.${c.col}`;
    if (seen.has(k)) continue; seen.add(k);
    await q(`DELETE FROM "${c.child}" WHERE "${c.col}"::text IN (SELECT "${c.pcol}"::text FROM "${c.parent}" WHERE tenant_id = :t)`, { t: t.id });
  }
  let pending = [...tenantTables];
  for (let pass = 0; pass < 8 && pending.length; pass++) {
    const failed = [];
    for (const table of pending) {
      try { await q(`DELETE FROM "${table}" WHERE tenant_id = :t`, { t: t.id }); }
      catch (e) { failed.push(table); if (pass === 7) console.error(`  ${table}: ${e.message}`); }
    }
    pending = failed;
  }
  if (pending.length) throw new Error(`Reset incomplet (tables : ${pending.join(', ')})`);
  await q(`DELETE FROM tenants WHERE id = :t AND domain = :d AND name = :n`, { t: t.id, d: DEMO_DOMAIN, n: DEMO_NAME });
  log('Reset terminé : données des autres tenants non touchées.');
}

async function preflight() {
  const emails = [TENANT.email, ...STAFF.map(s => s.email)].map(e => e.toLowerCase());
  const users = await select(`SELECT email FROM users WHERE lower(email) IN (:emails)`, { emails });
  const tenants = await select(`SELECT name FROM tenants WHERE lower(email) IN (:emails) OR replace(phone,' ','') = :phone OR siret = :siret`,
    { emails, phone: TENANT.phone.replace(/\s/g, ''), siret: TENANT.siret });
  const emps = await select(`SELECT email FROM employees WHERE lower(email) IN (:emails)`, { emails });
  if (users.length || tenants.length || emps.length) {
    throw new Error(`Conflit avec des données existantes : ${JSON.stringify({ users, tenants, emps })}`);
  }
}

// ── Seed ──────────────────────────────────────────────────────────────────────
async function main() {
  await sequelize.authenticate();
  // Colonnes ajoutées par cette version (idempotent, identique à connectDB)
  await q(`ALTER TABLE IF EXISTS sales ADD COLUMN IF NOT EXISTS operator_name VARCHAR(150);
           ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT false;`);

  const existing = await findDemoTenant();
  if (existing && !RESET) {
    console.log(`Le tenant de démo existe déjà (${existing.id}). Relancer avec --reset pour le régénérer.`);
    return;
  }
  if (existing) await resetDemoTenant(existing);
  await preflight();
  printStats();

  const adminPassword = `Demo-${crypto.randomBytes(9).toString('base64url')}`;
  const teamPassword = `Equipe-${crypto.randomBytes(9).toString('base64url')}`;
  const tenantStart = new Date(2026, 0, 5, 9, 0);

  // 1. Inscription (contrôleur) puis activation de l'abonnement Enterprise
  const fatou = STAFF.find(s => s.key === 'FATOU');
  const reg = await ctl(AuthController, 'register', null, { body: {
    companyName: DEMO_NAME, siret: TENANT.siret, phone: TENANT.phone, address: TENANT.address,
    planId: TENANT.planId, period: '1M', primaryColor: TENANT.primaryColor, buttonColor: TENANT.buttonColor,
    admin: { name: fatou.name, email: fatou.email, password: adminPassword }
  } });
  TENANT_ID = reg.user.tenantId;
  const lastSub = SUBSCRIPTION_PAYMENTS[SUBSCRIPTION_PAYMENTS.length - 1];
  const lastSubDate = resolveDay(lastSub.date, NOW, 10);
  const nextBilling = new Date(lastSubDate); nextBilling.setMonth(nextBilling.getMonth() + 1);
  await M.Tenant.update({
    domain: DEMO_DOMAIN, isActive: true, paymentStatus: 'UP_TO_DATE', planId: TENANT.planId,
    subscriptionEndsAt: nextBilling, lastPaymentDate: lastSubDate, lastPaymentAmount: lastSub.amount, onboardingCompleted: true
  }, { where: { id: TENANT_ID } });
  await M.Subscription.update({ status: 'ACTIVE', planId: TENANT.planId, currentPeriod: '1M', nextBillingDate: nextBilling },
    { where: { tenantId: TENANT_ID } });
  log(`Tenant créé : ${TENANT_ID} — abonnement Enterprise actif jusqu'au ${isoDay(nextBilling)}`);

  const users = {};
  users.FATOU = { id: reg.user.id, tenantId: TENANT_ID, name: fatou.name, email: fatou.email, role: 'ADMIN', roles: ['ADMIN'] };
  const ADMIN = users.FATOU;

  for (const [i, p] of SUBSCRIPTION_PAYMENTS.entries()) {
    const d = resolveDay(p.date, NOW, 10, 5 + i * 7);
    const ref = `TX-${isoDay(d).slice(2).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const pay = await M.Payment.create({ tenantId: TENANT_ID, saleId: null, amount: p.amount, method: 'WAVE', reference: ref, status: 'COMPLETED', paymentDate: d });
    await backdate('payments', pay.id, { created_at: d, updated_at: d, payment_date: d });
  }

  // 2. Paramétrage (profil, branding, fiscalité)
  await ctl(TenantController, 'updateSettings', ADMIN, { body: {
    name: DEMO_NAME, address: TENANT.address, phone: TENANT.phone, email: TENANT.email, siret: TENANT.siret,
    currency: 'F CFA', taxRate: 18, invoicePrefix: TENANT.invoicePrefix, invoiceFooter: TENANT.invoiceFooter,
    primaryColor: TENANT.primaryColor, buttonColor: TENANT.buttonColor, logoUrl: logoVisual(), onboardingCompleted: true, theme: 'light'
  } });
  await q(`UPDATE tenants SET created_at = :d WHERE id = :t`, { d: new Date(2026, 0, 4, 18, 0), t: TENANT_ID });
  auditDates.set('Settings', tenantStart);

  // 3. RH : départements, employés, contrats, comptes IAM
  const depts = {};
  for (const d of DEPARTMENTS) {
    const r = await ctl(DepartmentController, 'create', ADMIN, { body: { name: d.name, description: d.description } });
    depts[d.key] = r.data || r.department || r;
    await backdate('departments', depts[d.key].id, { created_at: tenantStart, updated_at: tenantStart });
  }
  const emps = {};
  for (const s of STAFF) {
    const e = await ctl(EmployeeController, 'create', ADMIN, { body: {
      firstName: s.firstName, lastName: s.lastName, email: s.email, phone: s.phone, gender: s.gender,
      position: s.position, departmentId: depts[s.dept].id, hireDate: s.hire, baseSalary: s.salary,
      contractType: s.contract, status: 'ACTIVE', city: 'Dakar', country: 'Sénégal', address: 'Dakar'
    } });
    emps[s.key] = e;
    await ctl(ContractController, 'create', ADMIN, { body: {
      employeeId: e.id, type: s.contract, startDate: s.hire, endDate: s.end || null, salary: s.salary,
      workingHours: 40, currency: 'F CFA', workLocation: 'Siège — Liberté 6, Dakar', status: 'ACTIVE', signedDate: s.hire
    } });
    await backdate('employees', e.id, { created_at: tenantStart, updated_at: tenantStart });
  }
  await q(`UPDATE contracts SET created_at = :d, updated_at = :d WHERE tenant_id = :t`, { d: tenantStart, t: TENANT_ID });
  for (const d of DEPARTMENTS) {
    await ctl(DepartmentController, 'update', ADMIN, { params: { id: depts[d.key].id },
      body: { name: d.name, description: d.description, managerId: emps[d.manager].id } });
  }
  await ctl(AuthController, 'updateUser', ADMIN, { params: { id: ADMIN.id }, body: { employeeId: emps.FATOU.id } });
  ADMIN.employeeId = emps.FATOU.id;
  for (const s of STAFF.filter(x => x.role && x.key !== 'FATOU')) {
    const u = await ctl(AuthController, 'createUser', ADMIN, { body: {
      name: s.name, email: s.email, password: teamPassword, role: s.role, roles: [s.role], employeeId: emps[s.key].id
    } });
    users[s.key] = { id: u.id, tenantId: TENANT_ID, name: s.name, email: s.email, role: s.role, roles: [s.role], employeeId: emps[s.key].id };
  }
  const lastLogins = { FATOU: 0.3, AWA: 1.5, CHEIKH: 5, NDEYE: 20, MAMADOU: 26, COUMBA: 30 };
  for (const [k, h] of Object.entries(lastLogins)) {
    await q(`UPDATE users SET last_login = :d, created_at = :c WHERE id = :id`, { d: new Date(NOW.getTime() - h * 3600000), c: tenantStart, id: users[k].id });
  }
  log(`RH : ${DEPARTMENTS.length} départements, ${STAFF.length} employés, ${Object.keys(users).length} comptes`);

  // 4. Catalogue
  const catDate = new Date(2026, 0, 5, 10, 0);
  const subs = {}, catColor = {};
  for (const c of CATEGORIES) {
    const cat = await ctl(CategoryController, 'create', ADMIN, { body: { name: c.name, description: c.description } });
    await backdate('categories', cat.id, { created_at: catDate, updated_at: catDate });
    for (const [key, name] of c.subs) {
      const sc = await ctl(SubcategoryController, 'create', ADMIN, { body: { name, description: `${c.name} — ${name}`, categoryId: cat.id } });
      await backdate('subcategories', sc.id, { created_at: catDate, updated_at: catDate });
      subs[key] = sc; catColor[key] = c.color;
    }
  }
  const items = {};
  for (const p of PRODUCTS) {
    const it = await ctl(InventoryController, 'createItem', users.MAMADOU, { body: {
      name: p.name, quantity: 0, unitPrice: p.pv, purchasePrice: p.pa, minThreshold: p.min,
      subcategoryId: subs[p.sub].id, location: p.loc, imageUrl: await productVisual(p.icon, catColor[p.sub])
    } });
    items[p.key] = it;
    await backdate('stock_items', it.id, { created_at: catDate, updated_at: catDate });
  }
  const services = {};
  for (const s of SERVICES) {
    const sv = await ctl(ServiceController, 'create', ADMIN, { body: {
      name: s.name, description: s.description, price: s.price, isActive: true, imageUrl: await productVisual(s.icon, ['#10b981', '#047857'])
    } });
    services[s.key] = sv;
    await backdate('services', sv.id, { created_at: catDate, updated_at: catDate });
    auditDates.set(`Service: ${s.name}`, catDate);
  }
  log(`Catalogue : ${PRODUCTS.length} produits, ${SERVICES.length} services`);

  // 5. Partenaires
  const suppliers = {};
  for (const s of SUPPLIERS) {
    const { key, ...body } = s;
    suppliers[key] = await ctl(SupplierController, 'create', ADMIN, { body });
    await backdate('suppliers', suppliers[key].id, { created_at: new Date(2026, 0, 4, 11), updated_at: new Date(2026, 0, 4, 11) });
  }
  const customers = {};
  for (const c of CUSTOMERS) {
    const r = await ctl(CustomerController, 'create', users.AWA, { body: {
      companyName: c.companyName, mainContact: c.mainContact, email: c.email, phone: c.phone, billingAddress: c.address,
      paymentTerms: c.terms, maxCreditLimit: c.particulier ? 1000000 : 10000000, isVip: !!c.vip
    } });
    customers[c.key] = r;
    const d = resolveDay(c.created, NOW, 9, 30);
    await backdate('customers', r.id, { created_at: d, updated_at: d });
  }

  // 6. Chronologie : livraisons fournisseurs, ventes (livraison + règlements), inventaire de juin
  const deliveryRefCount = {};
  const recordPayment = async (sale, p, user) => {
    await ctl(SaleController, 'addPayment', user, { params: { id: sale.id }, body: { amount: p.amount, method: p.method, reference: p.note } });
    const pay = await M.Payment.findOne({ where: { saleId: sale.id }, order: [['createdAt', 'DESC']] });
    if (p.method === 'TRANSFER') {
      await ctl(SaleController, 'updatePaymentStatus', users.COUMBA, { params: { paymentId: pay.id }, body: { status: 'PAID' } });
    }
    await backdate('payments', pay.id, { created_at: p.date, updated_at: p.date, payment_date: p.date });
  };

  const timeline = [
    ...plan.deliveries.map(d => ({ t: d.date, kind: 'DELIVERY', d })),
    ...plan.sales.map(s => ({ t: s.date, kind: 'SALE', s })),
    { t: resolveDay(JUNE_INVENTORY.date, NOW, 17), kind: 'JUNE_INVENTORY' }
  ].sort((a, b) => a.t - b.t);

  for (const ev of timeline) {
    if (ev.kind === 'DELIVERY') {
      const d = ev.d;
      const r = await ctl(DeliveryController, 'create', users[d.by], { body: {
        supplierId: suppliers[d.s].id, deliveryDate: isoDay(d.date), notes: d.notes || null, purchaseOrderRef: d.ref,
        status: d.partial ? 'PARTIAL' : 'RECEIVED',
        items: d.items.map(i => ({ stockItemId: items[i.code].id, quantityReceived: i.qty, purchasePrice: i.purchasePrice }))
      } });
      const day = isoDay(d.date).replace(/-/g, '');
      deliveryRefCount[day] = (deliveryRefCount[day] || 0) + 1;
      await backdate('deliveries', r.id, { created_at: d.date, updated_at: d.date, reference: `LIV-${day}-${String(deliveryRefCount[day]).padStart(4, '0')}` });
      await q(`UPDATE product_movements SET created_at = :d, movement_date = :d WHERE tenant_id = :t AND ref = :ref`, { d: d.date, t: TENANT_ID, ref: r.id });
    } else if (ev.kind === 'SALE') {
      const s = ev.s;
      const seller = users[s.seller];
      const res = await ctl(SaleController, 'create', seller, { body: {
        customerId: customers[s.customer].id, amountPaid: 0,
        items: s.lines.map(l => ({ type: l.type, productId: (l.type === 'PRODUCT' ? items : services)[l.code].id, quantity: l.qty, price: l.price, name: l.name }))
      } });
      const sale = res.sale;
      const productLines = await M.SaleItem.findAll({ where: { saleId: sale.id, stockItemId: { [Op.ne]: null } } });
      const deliveredAt = addMin(s.date, 50);
      if (productLines.length) {
        await ctl(SaleController, 'recordDelivery', seller, { params: { id: sale.id },
          body: { items: productLines.map(li => ({ itemId: li.id, qtyToDeliver: li.quantity })) } });
        await q(`UPDATE product_movements SET created_at = :d, movement_date = :d WHERE tenant_id = :t AND ref = :ref`, { d: deliveredAt, t: TENANT_ID, ref: sale.reference });
      }
      await backdate('sales', sale.id, { created_at: s.date, updated_at: s.date, sale_date: s.date });
      const due = new Date(s.date.getTime() + Math.max(1, CUSTOMER[s.customer].terms) * 86400000);
      await q(`UPDATE invoices SET created_at = :d, updated_at = :d, invoice_date = :d, due_date = :due WHERE tenant_id = :t AND sale_id = :sid`,
        { d: s.date, due, t: TENANT_ID, sid: sale.id });
      for (const p of s.payments) await recordPayment(sale, p, users.COUMBA);
      if (s.payments.length) {
        const last = s.payments[s.payments.length - 1].date;
        await q(`UPDATE sales SET updated_at = :d WHERE id = :id`, { d: last, id: sale.id });
      }
      await sleep(3); // références V-xxxxxx basées sur l'horodatage
    } else if (ev.kind === 'JUNE_INVENTORY') {
      const camp = await ctl(InventoryCampaignController, 'create', users.MAMADOU, { body: { name: JUNE_INVENTORY.name } });
      const det = await ctl(InventoryCampaignController, 'getDetails', users.MAMADOU, { params: { id: camp.id } });
      for (const [code, diff] of Object.entries(JUNE_INVENTORY.diffs)) {
        const line = det.items.find(i => i.stockItemId === items[code].id);
        await ctl(InventoryCampaignController, 'updateItem', users.MAMADOU, { params: { campaignId: camp.id, itemId: line.id }, body: { countedQty: line.systemQty + diff } });
      }
      await ctl(InventoryCampaignController, 'validate', users.MAMADOU, { params: { id: camp.id }, body: { syncStock: true } });
      const start = new Date(ev.t.getTime() - 2 * 86400000);
      await backdate('inventory_campaigns', camp.id, { created_at: start, updated_at: ev.t });
      await q(`UPDATE product_movements SET created_at = :d, movement_date = :d WHERE tenant_id = :t AND ref = :ref`, { d: ev.t, t: TENANT_ID, ref: camp.id.slice(0, 8) });
    }
  }
  log(`Ventes directes : ${plan.sales.length} ; livraisons fournisseurs : ${plan.deliveries.length}`);

  // 7. Contrats récurrents, factures auto RC-…, règlements des échéances
  const contracts = {};
  for (const c of plan.contracts) {
    const svc = SERVICE[c.service];
    const r = await ctl(RecurringContractController, 'create', users[c.manager], { body: {
      title: c.title, customerId: customers[c.c].id, frequency: c.freq, startDate: c.start,
      numberOfInstallments: c.n, installmentAmount: c.amountTtc, paymentDay: data.PAYMENT_DAY,
      description: `${c.lineName || svc.name} — ${c.qty > 1 ? `${c.qty} × ` : ''}${c.unit.toLocaleString('fr-FR')} F CFA HT par échéance.`,
      serviceItems: [{ serviceId: services[c.service].id, name: c.lineName || svc.name, unitPrice: c.unit, quantity: c.qty }],
      notes: 'Facturation automatique 5 jours avant chaque échéance.'
    } });
    contracts[c.key] = r;
    const created = new Date(new Date(c.start + 'T09:00:00').getTime() - 3 * 86400000);
    await backdate('recurring_contracts', r.id, { created_at: created, updated_at: created });
  }
  const gen = await ctl(RecurringContractController, 'generateUpcomingSales', ADMIN);
  log(`Factures auto des contrats générées : ${gen.generated}`);
  for (const c of plan.contracts) {
    const insts = await M.RecurringInstallment.findAll({ where: { contractId: contracts[c.key].id } });
    for (const pi of c.installments.filter(i => i.generated)) {
      const inst = insts.find(i => i.installmentNumber === pi.number);
      if (!inst?.generatedSaleId) throw new Error(`Échéance ${c.key} #${pi.number} sans facture générée`);
      const sale = await M.Sale.findByPk(inst.generatedSaleId);
      await backdate('sales', sale.id, { created_at: pi.invoiceDate, updated_at: pi.invoiceDate, sale_date: pi.invoiceDate });
      await q(`UPDATE invoices SET created_at = :d, updated_at = :d, invoice_date = :d WHERE tenant_id = :t AND sale_id = :sid`, { d: pi.invoiceDate, t: TENANT_ID, sid: sale.id });
      for (const p of pi.payments) await recordPayment(sale, p, users.COUMBA);
      if (pi.payments.length) {
        const last = pi.payments[pi.payments.length - 1].date;
        await backdate('recurring_installments', inst.id, { paid_at: last, updated_at: last, payment_method: pi.payments[0].method, payment_reference: pi.payments[0].note });
        await q(`UPDATE sales SET updated_at = :d WHERE id = :id`, { d: last, id: sale.id });
      }
    }
  }
  const overdue = await ctl(RecurringContractController, 'markOverdue', users.COUMBA);
  log(`Échéances passées en retard : ${overdue.updated}`);

  // 8. Paie & temps : pointage des 10 derniers jours ouvrés, congés, heures supplémentaires
  const workDays = [];
  for (let k = 1; workDays.length < 10; k++) {
    const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - k);
    if (d.getDay() !== 0 && d.getDay() !== 6) workDays.unshift(d);
  }
  const lates = { [`CHEIKH:${isoDay(workDays[2])}`]: '08:24', [`PAPE:${isoDay(workDays[5])}`]: '08:41', [`NDEYE:${isoDay(workDays[8])}`]: '08:17' };
  for (const [di, d] of workDays.entries()) {
    const day = isoDay(d);
    for (const [si, s] of STAFF.entries()) {
      const late = lates[`${s.key}:${day}`];
      const hhmm = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      const inMin = 7 * 60 + 48 + (si * 7 + di * 3) % 13;     // 07:48 → 08:00
      const clockIn = `${day}T${late || hhmm(inMin)}:00`;
      const clockOut = `${day}T${hhmm(17 * 60 + 5 + (si * 11 + di * 5) % 40)}:00`;
      await ctl(AttendanceController, 'create', ADMIN, { body: {
        employeeId: emps[s.key].id, date: day, clockIn, clockOut, status: late ? 'LATE' : 'PRESENT', source: 'manual', expectedStart: '08:00'
      } });
    }
  }
  const leaveStart = (offset, len) => {
    const a = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + offset);
    while (a.getDay() !== 1) a.setDate(a.getDate() + 1);  // un lundi
    const b = new Date(a); b.setDate(b.getDate() + len - 1);
    return [isoDay(a), isoDay(b)];
  };
  const [aS, aE] = leaveStart(1, 5);
  const approved = await ctl(LeaveController, 'create', ADMIN, { body: { employeeId: emps.LAMINE.id, type: 'ANNUAL', startDate: aS, endDate: aE, reason: 'Congés annuels — événement familial à Saint-Louis' } });
  await ctl(LeaveController, 'approve', ADMIN, { params: { id: (approved.leave || approved.data || approved).id }, body: {} });
  const [pS, pE] = leaveStart(21, 5);
  await ctl(LeaveController, 'create', users.NDEYE, { body: { employeeId: emps.NDEYE.id, type: 'ANNUAL', startDate: pS, endDate: pE, reason: 'Congés annuels' } });
  const otDay = isoDay(workDays[6]);
  const ot = await ctl(OvertimeController, 'create', { tenantId: TENANT_ID, employeeId: emps.LAMINE.id, id: null, name: 'Lamine Sène' }, { body: {
    requestedDate: otDay, startTime: '17:30', endTime: '20:00', reason: 'Intervention urgente sur les chambres froides du Supermarché Diama Market'
  } });
  await ctl(OvertimeController, 'approve', ADMIN, { params: { id: ot.id }, body: { reviewNote: 'Validé — intervention client sous contrat' } });
  log('RH : pointage 10 jours, 1 congé validé, 1 congé en attente, 1 heure sup. validée');

  // 9. Notifications et support
  for (const n of NOTIFICATIONS) {
    const r = await ctl(NotificationController, 'create', ADMIN, { body: { title: n.title, body: n.body, type: n.type } });
    const d = new Date(NOW.getTime() - n.daysAgo * 86400000 - 2 * 3600000);
    await backdate('notifications', r.id, { created_at: d, updated_at: d });
  }
  const t = await ctl(SupportController, 'createTicket', ADMIN, { body: { subject: SUPPORT_TICKET.subject, message: SUPPORT_TICKET.message, category: SUPPORT_TICKET.category, priority: 'NORMAL' } });
  await ctl(SupportController, 'updateTicket', { name: 'Support GeStockPro', role: 'SUPER_ADMIN' }, { params: { id: t.ticket.id }, body: { status: 'RESOLVED', adminReply: SUPPORT_TICKET.reply } });
  const tOpen = new Date(NOW.getTime() - SUPPORT_TICKET.daysAgo * 86400000);
  const tDone = new Date(tOpen.getTime() + 5 * 3600000);
  await backdate('support_tickets', t.ticket.id, { created_at: tOpen, updated_at: tDone, resolved_at: tDone });

  // 10. Inventaire en cours (en dernier : une campagne ouverte bloque la création de produits)
  const cur = await ctl(InventoryCampaignController, 'create', users.MAMADOU, { body: { name: CURRENT_INVENTORY.name } });
  const curStart = new Date(NOW.getTime() - CURRENT_INVENTORY.daysAgo * 86400000);
  await backdate('inventory_campaigns', cur.id, { created_at: curStart, updated_at: new Date(NOW.getTime() - 3 * 3600000) });

  // 11. Journaux d'audit alignés sur les dates antidatées
  for (const [resource, d] of auditDates) {
    await q(`UPDATE audit_logs SET created_at = :d WHERE tenant_id = :t AND resource = :r`, { d, t: TENANT_ID, r: resource });
  }

  fs.writeFileSync(ENV_DEMO_PATH, [
    '# Identifiants du tenant de démo (vidéo) — NE PAS COMMITTER',
    `# Généré le ${NOW.toISOString()} par backend/scripts/seed-demo.js`,
    `DEMO_TENANT_ID=${TENANT_ID}`,
    `DEMO_TENANT_NAME="${DEMO_NAME}"`,
    `DEMO_ADMIN_EMAIL=${fatou.email}`,
    `DEMO_ADMIN_PASSWORD=${adminPassword}`,
    `# Comptes équipe (même mot de passe) : ${STAFF.filter(s => s.role && s.key !== 'FATOU').map(s => `${s.email} (${s.role})`).join(', ')}`,
    `DEMO_TEAM_PASSWORD=${teamPassword}`,
    ''
  ].join('\n'), { mode: 0o600 });
  log(`Identifiants écrits dans ${ENV_DEMO_PATH}`);
}

try {
  await main();
  await sequelize.close();
  process.exit(0);
} catch (e) {
  console.error('\n✖ Échec du seed :', e.message);
  if (TENANT_ID) console.error(`  Tenant partiellement créé (${TENANT_ID}) : relancer avec --reset.`);
  await sequelize.close().catch(() => {});
  process.exit(1);
}

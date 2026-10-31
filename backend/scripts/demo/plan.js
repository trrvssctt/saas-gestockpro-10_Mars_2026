/**
 * Planification déterministe du jeu de démo (sans base de données) :
 * dates, échéancier des paiements, canaux, quantités livrées et contrôles des cibles.
 */
import {
  PRODUCTS, SERVICES, SALES, CONTRACTS, DELIVERIES, JUNE_INVENTORY, CUSTOMERS,
  PAYMENT_DAY, PAYMENT_CHANNEL_TARGETS, TVA
} from './data.js';

const DAY = 86400000;
const byKey = (arr) => Object.fromEntries(arr.map(x => [x.key, x]));
export const PRODUCT = byKey(PRODUCTS);
export const SERVICE = byKey(SERVICES);
export const CUSTOMER = byKey(CUSTOMERS);
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const round2 = (n) => Math.round(n * 100) / 100;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Date locale à partir d'un ISO (YYYY-MM-DD) ou d'un décalage en jours (≤ 0) par rapport à aujourd'hui. */
export function resolveDay(day, now, hour = 10, minute = 0) {
  if (typeof day === 'number') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hour, minute);
    // Vente du jour : quelques minutes avant l'exécution
    if (day === 0) return new Date(Math.min(d.getTime(), now.getTime() - 25 * 60000));
    return d;
  }
  const [y, m, dd] = day.split('-').map(Number);
  return new Date(y, m - 1, dd, hour, minute);
}

// Même règle que RecurringContractController.generateDueDates (jour fixe)
function dueDates(start, n, freq, payDay) {
  const s = new Date(start + 'T00:00:00');
  const step = freq === 'TRIMESTRIEL' ? 3 : 1;
  let y = s.getFullYear(), m = s.getMonth();
  if (s.getDate() >= payDay) { m += step; y += Math.floor(m / 12); m %= 12; }
  return Array.from({ length: n }, (_, i) => {
    const bm = m + step * i;
    return new Date(y + Math.floor(bm / 12), ((bm % 12) + 12) % 12, payDay);
  });
}

const lineInfo = ([code, qty]) => {
  const p = PRODUCT[code], s = SERVICE[code];
  if (!p && !s) throw new Error(`Code article inconnu : ${code}`);
  return { code, qty, type: p ? 'PRODUCT' : 'SERVICE', price: p ? p.pv : s.price, name: (p || s).name };
};

export function buildPlan(now = new Date()) {
  const clampToNow = (d) => new Date(Math.min(d.getTime(), now.getTime() - 5 * 60000));
  const payments = [];   // { date, amount, note, saleRef(index|rc), channelHint }

  // ── Ventes directes ──
  const sales = SALES.map((s, i) => {
    const date = resolveDay(s.day, now, 9 + (i % 8), (i * 17) % 60);
    const lines = s.lines.map(lineInfo);
    const ht = lines.reduce((a, l) => a + l.price * l.qty, 0);
    const ttc = round2(ht * (1 + TVA));
    const sale = { idx: i, kind: 'DIRECT', date, customer: s.c, seller: s.by, lines, ht, ttc, payments: [] };
    const add = (d, amount, note) => sale.payments.push({ date: clampToNow(d), amount: round2(amount), note });
    const later = new Date(date.getTime() + 15 * DAY);
    if (s.pay === 'FULL') add(new Date(date.getTime() + 30 * 60000), ttc, 'Règlement comptant');
    else if (s.pay === 'SPLIT') {
      const acompte = round2(Math.round(ttc / 2));
      add(new Date(date.getTime() + 30 * 60000), acompte, 'Acompte 50 %');
      if (later < now) add(later, ttc - acompte, 'Solde');
    } else if (typeof s.pay === 'number') {
      add(new Date(date.getTime() + 30 * 60000), s.pay, s.note || 'Acompte');
    }
    return sale;
  });

  // ── Échéances des contrats (factures RC générées jusqu'à aujourd'hui + 5 j) ──
  const trigger = new Date(now.getTime() + 5 * DAY);
  const contracts = CONTRACTS.map(c => {
    const unitHt = c.unit * c.qty;
    const amountTtc = round2(unitHt * (1 + TVA));
    const dates = dueDates(c.start, c.n, c.freq, PAYMENT_DAY);
    const installments = dates.map((due, k) => {
      const number = k + 1;
      const generated = iso(due) <= iso(trigger);
      const invoiceDate = new Date(due.getFullYear(), due.getMonth(), due.getDate() - 5, 8, 0);
      const payDate = new Date(due.getFullYear(), due.getMonth(), due.getDate() + (k % 3), 11, 15);
      const paid = generated && !c.unpaid.includes(number) && payDate < now;
      const inst = { number, due, generated, invoiceDate: clampToNow(invoiceDate), amountTtc, payments: [] };
      if (paid) inst.payments.push({ date: payDate, amount: amountTtc, note: `Échéance ${MONTHS_FR[due.getMonth()]}` });
      return inst;
    });
    return { ...c, unitHt, amountTtc, installments };
  });

  // ── Canaux de paiement : affectation gloutonne vers la cible de répartition ──
  const all = [
    ...sales.flatMap(s => s.payments.map(p => ({ p, particulier: !!CUSTOMER[s.customer].particulier }))),
    ...contracts.flatMap(c => c.installments.flatMap(i => i.payments.map(p => ({ p, particulier: false }))))
  ].sort((a, b) => a.p.date - b.p.date);
  const assigned = { WAVE: 0, ORANGE_MONEY: 0, CASH: 0, TRANSFER: 0 };
  let total = 0;
  for (const { p, particulier } of all) {
    total += p.amount;
    const allowed = Object.keys(PAYMENT_CHANNEL_TARGETS).filter(m =>
      m !== 'TRANSFER' || (!particulier && p.amount >= 250000));
    const pick = allowed.sort((a, b) =>
      (PAYMENT_CHANNEL_TARGETS[b] * total - assigned[b]) - (PAYMENT_CHANNEL_TARGETS[a] * total - assigned[a]))[0];
    p.method = pick;
    assigned[pick] += p.amount;
  }

  // ── Stock : quantités 'REST' pour atteindre le stock final ──
  const sold = {};
  sales.forEach(s => s.lines.filter(l => l.type === 'PRODUCT').forEach(l => { sold[l.code] = (sold[l.code] || 0) + l.qty; }));
  const fixedIn = {};
  DELIVERIES.filter(d => !d.partial).forEach(d => Object.entries(d.items).forEach(([k, q]) => {
    if (q !== 'REST') fixedIn[k] = (fixedIn[k] || 0) + q;
  }));
  const deliveries = DELIVERIES.map(d => {
    const items = Object.entries(d.items).map(([code, q]) => {
      let qty = q;
      if (q === 'REST') {
        qty = PRODUCT[code].final + (sold[code] || 0) - (JUNE_INVENTORY.diffs[code] || 0) - (fixedIn[code] || 0);
        if (qty < 0) throw new Error(`Quantité livrée négative pour ${code}`);
      }
      return { code, qty, purchasePrice: PRODUCT[code].pa };
    }).filter(i => i.qty > 0);
    return { ...d, date: resolveDay(d.date, now, 8, 30), items };
  });

  // Simulation chronologique du stock (aucune vente ne doit manquer de stock)
  const level = Object.fromEntries(PRODUCTS.map(p => [p.key, 0]));
  const events = [
    ...deliveries.filter(d => !d.partial).map(d => ({ t: d.date, f: () => d.items.forEach(i => { level[i.code] += i.qty; }) })),
    ...sales.map(s => ({ t: s.date, f: () => s.lines.filter(l => l.type === 'PRODUCT').forEach(l => {
      level[l.code] -= l.qty;
      if (level[l.code] < 0) throw new Error(`Stock insuffisant : ${l.code} le ${iso(s.date)}`);
    }) })),
    { t: resolveDay(JUNE_INVENTORY.date, now, 18), f: () => Object.entries(JUNE_INVENTORY.diffs).forEach(([k, d]) => { level[k] += d; }) }
  ].sort((a, b) => a.t - b.t);
  events.forEach(e => e.f());
  PRODUCTS.forEach(p => { if (level[p.key] !== p.final) throw new Error(`Stock final ${p.key} = ${level[p.key]} ≠ ${p.final}`); });

  return { now, sales, contracts, deliveries, assigned, finalStock: level };
}

/** Indicateurs de contrôle (mêmes règles que le Dashboard et le Recouvrement). */
export function planStats(plan) {
  const { sales, contracts, assigned } = plan;
  const docs = [
    ...sales.map(s => ({ date: s.date, ht: s.ht, ttc: s.ttc, customer: s.customer, paid: s.payments.reduce((a, p) => a + p.amount, 0) })),
    ...contracts.flatMap(c => c.installments.filter(i => i.generated).map(i => ({
      date: i.invoiceDate, ht: c.unitHt, ttc: i.amountTtc, customer: c.c, paid: i.payments.reduce((a, p) => a + p.amount, 0)
    })))
  ];
  const monthlyHt = Array(12).fill(0);
  docs.forEach(d => { if (d.date.getFullYear() === plan.now.getFullYear()) monthlyHt[d.date.getMonth()] += d.ht; });
  const revenue = docs.reduce((a, d) => a + d.ttc, 0);
  const collected = docs.reduce((a, d) => a + d.paid, 0);
  const debt = {};
  docs.forEach(d => { const due = d.ttc - d.paid; if (due > 0.01) debt[d.customer] = (debt[d.customer] || 0) + due; });
  const max = Math.max(0, ...Object.values(debt));
  const risk = Object.fromEntries(Object.entries(debt).map(([k, v]) => [k, {
    amount: Math.round(v), level: v / max >= 0.7 ? 'Critique' : v / max >= 0.35 ? 'Élevé' : 'Modéré'
  }]));
  const payTotal = Object.values(assigned).reduce((a, b) => a + b, 0);
  const channels = Object.fromEntries(Object.entries(assigned).map(([k, v]) => [k, Math.round((v / payTotal) * 1000) / 10]));
  return {
    directSales: sales.length,
    recurringInvoices: docs.length - sales.length,
    monthlyHt, revenueTtc: Math.round(revenue), collectedTtc: Math.round(collected),
    collectionRate: Math.round((collected / revenue) * 1000) / 10,
    risk, channels, finalStock: plan.finalStock,
    deliveries: plan.deliveries.map(d => `${iso(d.date)} ${d.s}${d.partial ? ' (partielle)' : ''}: ` + d.items.map(i => `${i.code}×${i.qty}`).join(', '))
  };
}

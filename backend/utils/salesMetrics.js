/**
 * Calculs partagés sur les ventes (créances, encours, libellés client).
 * Une seule source de vérité pour le Dashboard, la page Clients et le Recouvrement.
 */

// Seules ces ventes constituent une créance (BROUILLON = paiement en transit)
export const CREANCE_STATUSES = ['EN_COURS', 'TERMINE'];

const num = (v) => parseFloat(v || 0) || 0;

/**
 * Nom affichable du client d'une vente : fiche client, sinon client de passage.
 * Accepte une instance Sequelize ou un objet brut.
 */
export function saleCustomerName(sale) {
  if (!sale) return null;
  const c = sale.customer || sale.Customer || null;
  return c?.companyName || c?.mainContact || sale.walkinName || null;
}

/**
 * Clé de regroupement d'un débiteur : id de la fiche client, sinon nom du client de passage.
 */
export function debtorKey(sale) {
  const cid = sale.customerId || sale.customer?.id || null;
  if (cid) return cid;
  return sale.walkinName ? `PASSAGE:${sale.walkinName.trim().toLowerCase()}` : 'PASSAGE';
}

/**
 * Agrège les restes à payer par débiteur.
 * @param {Array} sales ventes (avec customer inclus si possible)
 * @param {(sale) => number} [paidOf] montant réglé d'une vente (défaut : sale.amountPaid)
 * @returns {Array<{id, name, total, isWalkin}>} trié par dette décroissante
 */
export function aggregateDebtors(sales, paidOf = (s) => num(s.amountPaid)) {
  const map = {};
  for (const s of sales) {
    if (!CREANCE_STATUSES.includes(s.status)) continue;
    const due = num(s.totalTtc) - paidOf(s);
    if (due <= 0) continue;
    const key = debtorKey(s);
    if (!map[key]) {
      map[key] = {
        id: key,
        name: saleCustomerName(s) || 'Client de passage',
        total: 0,
        isWalkin: !(s.customerId || s.customer?.id)
      };
    }
    map[key].total += due;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

/**
 * Encours par fiche client (id → montant), même règle que la page Recouvrement.
 */
export function outstandingByCustomerId(sales) {
  const out = {};
  for (const s of sales) {
    if (!s.customerId || !CREANCE_STATUSES.includes(s.status)) continue;
    const due = num(s.totalTtc) - num(s.amountPaid);
    if (due > 0) out[s.customerId] = (out[s.customerId] || 0) + due;
  }
  return out;
}

/**
 * Classement de l'équipe : nombre de ventes et CA par vendeur.
 * Les factures automatiques des contrats (sans vendeur) sont exclues.
 */
export function rankSellers(sales) {
  const map = {};
  for (const s of sales) {
    if (s.status === 'ANNULE') continue;
    const op = s.operatorName;
    if (!op) continue;
    map[op] = map[op] || { name: op, salesCount: 0, revenue: 0 };
    map[op].salesCount += 1;
    map[op].revenue += num(s.totalTtc);
  }
  return Object.values(map).sort((a, b) => b.salesCount - a.salesCount || b.revenue - a.revenue);
}

/**
 * Santé de paiement d'un client à partir de ses ventes impayées échues
 * (âge de la vente > délai de paiement du client). Seuils historiques :
 * plus de 3 impayés échus → CRITICAL, au moins 1 → WARNING.
 */
export function customerHealth(sales, paymentTerms = 30, now = new Date()) {
  const termsMs = Math.max(0, parseInt(paymentTerms, 10) || 0) * 86400000;
  const overdue = sales.filter(s =>
    CREANCE_STATUSES.includes(s.status) &&
    num(s.totalTtc) - num(s.amountPaid) > 0 &&
    now.getTime() - new Date(s.createdAt).getTime() > termsMs
  ).length;
  if (overdue > 3) return 'CRITICAL';
  if (overdue > 0) return 'WARNING';
  return 'GOOD';
}

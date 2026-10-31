/**
 * Helpers d'affichage purs (sans React) partagés par plusieurs écrans.
 * En JS simple pour être testés directement avec `node --test`.
 */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Ligne du flux d'activité pour un mouvement de stock. */
export function movementActivity(m) {
  const qty = num(m?.quantity ?? m?.qty);
  // Ajustement d'inventaire : le sens vient de l'écart de niveau
  const hasLevels = m?.previousLevel != null && m?.newLevel != null;
  const isIn = m?.type === 'IN' || (m?.type === 'ADJUSTMENT' && hasLevels && num(m.newLevel) > num(m.previousLevel));
  const parts = [`${isIn ? '+' : '−'}${qty} unité${qty > 1 ? 's' : ''}`];
  if (m?.userRef) parts.push(m.userRef);
  return {
    title: m?.productName || m?.stock_item?.name || m?.reason || 'Mouvement de stock',
    sub: parts.join(' • ')
  };
}

/**
 * Marge en % sur le prix de vente, ou null si le PUMP est inconnu (0 / vide)
 * ou le prix de vente nul.
 */
export function marginPercent(unitPrice, purchasePrice) {
  const pv = num(unitPrice);
  const pa = num(purchasePrice);
  if (pa <= 0 || pv <= 0) return null;
  return Math.round(((pv - pa) / pv) * 100);
}

/**
 * État de livraison d'une vente. Une vente sans article physique
 * (prestations, contrats) n'a pas de taux de livraison.
 */
export function deliveryState(sale) {
  const productItems = (sale?.items || []).filter((i) => i.stock_item_id || i.stockItemId);
  if (productItems.length === 0) return { isDeliverable: false, rate: null, delivered: 0, total: 0 };
  const total = productItems.reduce((s, i) => s + num(i.quantity), 0);
  const delivered = productItems.reduce((s, i) => s + num(i.quantityDelivered), 0);
  const rate = total > 0 ? Math.min(100, Math.round((delivered / total) * 100)) : 0;
  return { isDeliverable: true, rate, delivered, total };
}

/** @type {Array<[string, RegExp]>} */
const ICON_RULES = [
  ['fridge', /r[ée]frig|cong[ée]l|froid/],
  ['washer', /lav(age|e)/],
  ['cooking', /cuisi|four|cuisson/],
  ['aircon', /clim|split|btu/],
  ['fan', /ventil/],
  ['printer', /imprim|photocop|impression/],
  ['energy', /onduleur|[ée]nergie|batterie/],
  ['computer', /ordinateur|informatique|portable|poste/],
  ['phone', /smartphone|t[ée]l[ée]phon/],
  ['chair', /fauteuil|si[èe]ge|chaise/],
  ['office', /bureau|mobilier/],
  ['install', /install|maintenance|config|sav|entretien|r[ée]paration/],
  ['delivery', /livraison|transport/],
  ['warranty', /garantie|assurance/],
  ['service', /location|service|prestation/]
];

/**
 * Clé d'icône déduite d'un libellé (catégorie, sous-catégorie ou nom), ou null.
 * @param {string} text
 * @returns {string | null}
 */
export function categoryIconKey(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return null;
  for (const [key, re] of ICON_RULES) if (re.test(t)) return key;
  return null;
}

/** Nom du client d'une vente (fiche client, sinon client de passage). */
export function saleCustomerLabel(sale) {
  return sale?.customer?.companyName
    || sale?.customer?.mainContact
    || sale?.walkinName
    || sale?.walkin_name
    || 'Client de passage';
}

/** Origine d'une vente pour la trésorerie. */
export function saleOriginLabel(sale) {
  return sale?.recurringInstallmentId ? 'Contrat récurrent' : 'Vente';
}

/**
 * pricing.ts — source unique des durées, remises et formats de prix côté front.
 *
 * Les prix eux-mêmes viennent du backend (`GET /plans`, `GET /billing/plans`),
 * qui applique la même règle que `WaveService.computePrice` :
 * 3 mois = -15 %, 1 an = -30 % quand le prix n'est pas fixé en base.
 * Landing, inscription, abonnement et page de paiement passent tous par ici.
 */

export type BillingPeriod = '1M' | '3M' | '1Y';

export interface PeriodOption {
  id: BillingPeriod;
  label: string;
  months: number;
  discountPct: number;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { id: '1M', label: '1 Mois', months: 1,  discountPct: 0  },
  { id: '3M', label: '3 Mois', months: 3,  discountPct: 15 },
  { id: '1Y', label: '1 An',   months: 12, discountPct: 30 },
];

export const PERIOD_LABELS: Record<string, string> = { '1M': '1 mois', '3M': '3 mois', '1Y': '1 an' };

/** Les prix arrivent parfois en chaîne DECIMAL ("69000.00") : on les ramène à un entier. */
export const toAmount = (value: unknown): number => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? Math.round(n) : 0;
};

/** 69000.00 → "69 000" */
export const formatAmount = (value: unknown): string =>
  toAmount(value).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

/** 69000.00 → "69 000 F CFA" */
export const formatFCFA = (value: unknown): string => `${formatAmount(value)} F CFA`;

interface PriceablePlan {
  price?: number | string | null;
  priceMonthly?: number | string | null;
  priceThreeMonths?: number | string | null;
  priceYearly?: number | string | null;
}

export const getMonthlyPrice = (plan: PriceablePlan | null | undefined): number =>
  toAmount(plan?.priceMonthly ?? plan?.price ?? 0);

export function getPeriodPrice(plan: PriceablePlan | null | undefined, period: string): number {
  if (!plan) return 0;
  if (period === '3M' && plan.priceThreeMonths != null) return toAmount(plan.priceThreeMonths);
  if (period === '1Y' && plan.priceYearly != null) return toAmount(plan.priceYearly);
  const opt = PERIOD_OPTIONS.find(p => p.id === period);
  const base = getMonthlyPrice(plan);
  if (!opt) return base;
  return Math.round(base * opt.months * (1 - opt.discountPct / 100));
}

/** Économie par rapport au tarif mensuel × nombre de mois. */
export function getSavings(plan: PriceablePlan | null | undefined, period: string): number {
  const opt = PERIOD_OPTIONS.find(p => p.id === period);
  if (!plan || !opt || opt.discountPct === 0) return 0;
  return Math.max(0, getMonthlyPrice(plan) * opt.months - getPeriodPrice(plan, period));
}

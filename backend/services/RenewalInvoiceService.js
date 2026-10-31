import { Op } from 'sequelize';
import crypto from 'crypto';
import { Tenant, Subscription, Plan, AuditLog, User } from '../models/index.js';
import { MailService } from './MailService.js';
import { ReceiptPdfService } from './ReceiptPdfService.js';
import * as T from './MailTemplates.js';

/**
 * RenewalInvoiceService — facturation anticipée des abonnements.
 *
 * Chaque jour, repère les abonnements arrivant à échéance dans N jours
 * (5 par défaut) et envoie au client sa facture de renouvellement avec le PDF
 * en pièce jointe, puis un récapitulatif interne.
 *
 * Anti-doublon : `subscriptions.renewal_notice_sent_for` mémorise la date
 * d'échéance déjà notifiée. Le renouvellement décale `subscriptionEndsAt`, ce
 * qui réarme automatiquement l'envoi pour la période suivante — sans avoir à
 * réinitialiser quoi que ce soit.
 */

const PERIOD_MONTHS = { '1M': 1, '2M': 2, '3M': 3, '6M': 6, '1Y': 12 };
const PERIOD_LABELS = { '1M': '1 mois', '2M': '2 mois', '3M': '3 mois', '6M': '6 mois', '1Y': '1 an' };

/** Bornes [00:00, 23:59:59.999] du jour situé à `daysAhead` jours d'ici. */
const dayWindow = (daysAhead) => {
  const start = new Date();
  start.setDate(start.getDate() + daysAhead);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/** Montant dû pour la période reconduite, d'après la grille tarifaire du plan. */
export const computeRenewalAmount = (plan, period) => {
  if (!plan) return 0;
  const months = PERIOD_MONTHS[period] || 1;
  if (period === '1Y' && plan.priceYearly) return Number(plan.priceYearly);
  if (period === '3M' && plan.priceThreeMonths) return Number(plan.priceThreeMonths);
  return Math.round(Number(plan.priceMonthly || 0) * months);
};

/** Référence de facture stable pour un tenant et une échéance donnés. */
const buildReference = (tenantId, dueDate) => {
  const d = new Date(dueDate);
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `F-REN-${String(tenantId).slice(0, 8).toUpperCase()}-${ym}`;
};

/** Email de contact du tenant (colonne `email`, sinon premier ADMIN). */
const resolveRecipient = async (tenant) => {
  let email = tenant.email || null;
  let name = tenant.name || 'Cher client';
  try {
    const admin = await User.findOne({
      where: { tenantId: tenant.id, role: 'ADMIN' },
      order: [['createdAt', 'ASC']],
    });
    if (admin) {
      email = email || admin.email;
      name = admin.name || name;
    }
  } catch { /* on garde les valeurs du tenant */ }
  return { email, name };
};

export class RenewalInvoiceService {
  /**
   * Exécute la campagne de facturation anticipée.
   *
   * @param {object} [opts]
   * @param {number}  [opts.daysBefore]  Nombre de jours avant l'échéance (défaut : RENEWAL_NOTICE_DAYS ou 5)
   * @param {boolean} [opts.dryRun]      Simule sans envoyer ni marquer
   * @param {string}  [opts.tenantId]    Restreint à un seul tenant (test)
   * @param {boolean} [opts.force]       Ignore le marqueur anti-doublon
   * @returns {Promise<{daysBefore:number, sent:number, failed:number, skipped:number, rows:Array}>}
   */
  static async run({ daysBefore, dryRun = false, tenantId = null, force = false } = {}) {
    const days = Number(daysBefore ?? process.env.RENEWAL_NOTICE_DAYS ?? 5);
    const { start, end } = dayWindow(days);

    const where = {
      subscriptionEndsAt: { [Op.between]: [start, end] },
      pendingDeletion: { [Op.not]: true },
    };
    if (tenantId) where.id = tenantId;

    let tenants = [];
    try {
      tenants = await Tenant.findAll({ where });
    } catch (err) {
      // `pendingDeletion` peut ne pas exister sur d'anciens schémas
      console.warn('[RenewalInvoice] Filtre pendingDeletion ignoré :', err.message);
      delete where.pendingDeletion;
      tenants = await Tenant.findAll({ where });
    }

    const result = { daysBefore: days, sent: 0, failed: 0, skipped: 0, rows: [], dryRun };

    console.log(
      `[RenewalInvoice] ${tenants.length} abonnement(s) à échéance le ${start.toLocaleDateString('fr-FR')} (J-${days})${dryRun ? ' — SIMULATION' : ''}`
    );

    for (const tenant of tenants) {
      try {
        const sub = await Subscription.findOne({ where: { tenantId: tenant.id } });
        const planId = tenant.planId || sub?.planId;

        // Les essais gratuits ne donnent pas lieu à facturation
        if (!planId || planId === 'FREE_TRIAL') {
          result.skipped++;
          continue;
        }

        const dueDate = tenant.subscriptionEndsAt || sub?.nextBillingDate;
        if (!dueDate) { result.skipped++; continue; }

        // Anti-doublon : cette échéance a-t-elle déjà été facturée ?
        const alreadySent =
          sub?.renewalNoticeSentFor &&
          new Date(sub.renewalNoticeSentFor).getTime() === new Date(dueDate).getTime();
        if (alreadySent && !force) {
          result.skipped++;
          continue;
        }

        const plan = await Plan.findByPk(planId).catch(() => null);
        const period = sub?.currentPeriod || '1M';
        const amount = computeRenewalAmount(plan, period);
        const currency = tenant.currency || 'F CFA';
        const reference = buildReference(tenant.id, dueDate);

        const { email, name } = await resolveRecipient(tenant);
        if (!email) {
          console.warn(`[RenewalInvoice] Tenant ${tenant.id} (${tenant.name}) sans email — ignoré.`);
          result.skipped++;
          continue;
        }

        const row = { company: tenant.name, amount, currency, dueDate, email, reference, ok: false };

        if (dryRun) {
          row.ok = true;
          result.rows.push(row);
          result.sent++;
          continue;
        }

        // Facture PDF — même gabarit que celui téléchargeable dans l'espace client
        const attachment = await ReceiptPdfService.buildRenewalInvoiceAttachment({
          tenant, plan, amount, dueDate, reference,
          periodLabel: PERIOD_LABELS[period] || period,
        });

        const tpl = T.renewalInvoiceClient({
          userName: name,
          companyName: tenant.name,
          amount,
          currency,
          planName: plan?.name || planId,
          period: PERIOD_LABELS[period] || period,
          dueDate,
          daysLeft: days,
          reference,
          autoRenew: sub?.autoRenew ?? false,
          hasPdf: !!attachment,
        });

        await MailService.send({
          mailbox: 'compta',
          to: email,
          subject: tpl.subject,
          html: tpl.html,
          attachments: attachment ? [attachment] : undefined,
        });

        // Marque l'échéance comme notifiée (idempotence)
        if (sub) {
          await sub.update({ renewalNoticeSentFor: dueDate }).catch((err) => {
            console.warn(`[RenewalInvoice] Marquage impossible pour ${tenant.id} :`, err.message);
          });
        }

        await AuditLog.create({
          tenantId: tenant.id,
          userId: null,
          userName: 'RENEWAL_CRON',
          action: 'RENEWAL_INVOICE_SENT',
          resource: `${reference} → ${email} (${amount} ${currency}, échéance ${new Date(dueDate).toISOString().slice(0, 10)})`,
          severity: 'LOW',
          sha256Signature: crypto
            .createHash('sha256')
            .update(`RENEWAL_INVOICE:${tenant.id}:${reference}`)
            .digest('hex'),
        }).catch(() => {});

        row.ok = true;
        result.rows.push(row);
        result.sent++;
      } catch (err) {
        console.error(`[RenewalInvoice] Échec pour ${tenant.name} (${tenant.id}) :`, err.message);
        result.rows.push({
          company: tenant.name,
          amount: 0,
          currency: tenant.currency || 'F CFA',
          dueDate: tenant.subscriptionEndsAt,
          ok: false,
          error: err.message,
        });
        result.failed++;
      }
    }

    // Récapitulatif interne — uniquement s'il s'est passé quelque chose
    if (!dryRun && (result.sent > 0 || result.failed > 0)) {
      const digest = T.adminRenewalDigest({
        daysBefore: days,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        rows: result.rows,
      });
      await MailService.notifyAdmin({ mailbox: 'compta', subject: digest.subject, html: digest.html });
    }

    console.log(
      `[RenewalInvoice] Terminé — ${result.sent} envoyée(s), ${result.failed} échec(s), ${result.skipped} ignorée(s).`
    );
    return result;
  }
}

export default RenewalInvoiceService;

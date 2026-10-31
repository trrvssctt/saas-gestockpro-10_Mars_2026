import { MailService } from './MailService.js';
import { ReceiptPdfService } from './ReceiptPdfService.js';
import * as T from './MailTemplates.js';
import { computeRenewalAmount } from './RenewalInvoiceService.js';
import { User, Tenant, Plan } from '../models/index.js';

/**
 * MailNotificationService — orchestration métier des emails.
 *
 * Chaque méthode compose « gabarit + boîte expéditrice + notification interne »
 * et n'échoue jamais : un email est un effet de bord, il ne doit jamais faire
 * échouer une inscription, un webhook de paiement ou un ticket.
 *
 * Les contrôleurs appellent ces méthodes sans `await` bloquant (fire-and-forget)
 * afin de ne pas ralentir la réponse HTTP.
 */

/** Retourne l'email de contact principal d'un tenant (admin/propriétaire). */
const resolveTenantEmail = async (tenant) => {
  if (!tenant) return null;
  if (tenant.email) return tenant.email;
  try {
    const admin = await User.findOne({
      where: { tenantId: tenant.id, role: 'ADMIN' },
      order: [['createdAt', 'ASC']],
    });
    return admin?.email || null;
  } catch {
    return null;
  }
};

/** Retourne le nom de la personne à saluer dans l'email. */
const resolveTenantContactName = async (tenant) => {
  try {
    const admin = await User.findOne({
      where: { tenantId: tenant?.id, role: 'ADMIN' },
      order: [['createdAt', 'ASC']],
    });
    return admin?.name || tenant?.name || 'Cher client';
  } catch {
    return tenant?.name || 'Cher client';
  }
};

const PERIOD_LABELS = { '1M': '1 mois', '2M': '2 mois', '3M': '3 mois', '6M': '6 mois', '1Y': '1 an' };

export class MailNotificationService {
  // ─── Inscription ───────────────────────────────────────────────────────────

  /**
   * Nouvelle inscription.
   *
   * Deux cas distincts :
   *  • Essai gratuit / paiement déjà encaissé (Stripe) → email de bienvenue
   *  • Plan payant avec paiement déclaré à valider     → email « en attente de
   *    validation » avec la facture PDF jointe, et alerte interne « à valider »
   *
   * @param {object} p
   * @param {object} p.user      Instance User (admin créé)
   * @param {object} p.tenant    Instance Tenant
   * @param {string} [p.planId]
   * @param {string} [p.period]  '1M' | '3M' | '1Y'…
   * @param {object} [p.payment] Instance Payment en attente, s'il y en a une
   * @param {string} [p.source]  Origine ('Formulaire web', 'Stripe Checkout'…)
   */
  static async onRegistration({ user, tenant, planId, period, payment, source }) {
    try {
      let plan = null;
      let planName = planId || 'FREE_TRIAL';
      try {
        plan = await Plan.findByPk(planId);
        if (plan?.name) planName = plan.name;
      } catch { /* le libellé brut suffit */ }

      const isTrial = (planId || 'FREE_TRIAL') === 'FREE_TRIAL';

      // ── Inscription payante en attente de validation ──────────────────────
      // Couvre aussi le cas sans paiement déclaré : le compte reste inactif
      // tant que l'administrateur n'a pas validé.
      if (!isTrial && (!payment || payment.status !== 'COMPLETED')) {
        await MailNotificationService.#sendPendingRegistration({
          user, tenant, plan, planId, planName, period, payment, source,
        });
        return;
      }

      const welcome = T.welcomeClient({
        userName: user?.name || 'Cher client',
        companyName: tenant?.name || 'Votre entreprise',
        email: user?.email,
        planName,
        isTrial,
        trialEndsAt: isTrial ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
      });

      await MailService.safeSend({
        mailbox: 'contact',
        to: user?.email,
        subject: welcome.subject,
        html: welcome.html,
      });

      const notif = T.adminNewRegistration({
        userName: user?.name,
        companyName: tenant?.name,
        email: user?.email,
        phone: tenant?.phone,
        siret: tenant?.siret,
        planName,
        tenantId: tenant?.id,
        source,
      });

      await MailService.notifyAdmin({
        mailbox: 'contact',
        subject: notif.subject,
        html: notif.html,
        replyTo: user?.email,
      });
    } catch (err) {
      console.error('[MailNotification] onRegistration :', err.message);
    }
  }

  /**
   * Inscription payante : facture PDF au client + alerte « à valider » interne.
   * Privée — appelée uniquement par `onRegistration`.
   */
  static async #sendPendingRegistration({ user, tenant, plan, planId, planName, period, payment, source }) {
    const currency = tenant?.currency || 'F CFA';
    // Sans paiement déclaré, on facture le tarif du plan pour la période choisie
    const amount = payment ? Number(payment.amount || 0) : computeRenewalAmount(plan, period || '1M');
    const periodLabel = PERIOD_LABELS[period] || period || null;
    const invoiceRef = `F-SUB-${String(payment?.id || tenant.id).slice(0, 8).toUpperCase()}`;

    // Facture PDF (non acquittée — paiement en cours de vérification)
    const attachment = await ReceiptPdfService.buildRegistrationInvoiceAttachment({
      tenant, plan, amount, payment, periodLabel,
    });

    const tpl = T.registrationPendingClient({
      userName: user?.name || 'Cher client',
      companyName: tenant?.name || 'Votre entreprise',
      email: user?.email,
      planName,
      period: periodLabel,
      amount,
      currency,
      method: payment?.method || null,
      reference: payment?.reference || null,
      invoiceRef,
      hasPdf: !!attachment,
    });

    await MailService.safeSend({
      mailbox: 'compta',
      to: user?.email,
      subject: tpl.subject,
      html: tpl.html,
      attachments: attachment ? [attachment] : undefined,
    });

    const notif = T.adminNewRegistrationPending({
      userName: user?.name,
      companyName: tenant?.name,
      email: user?.email,
      phone: tenant?.phone,
      siret: tenant?.siret,
      planName,
      period: periodLabel,
      amount,
      currency,
      method: payment?.method || null,
      reference: payment?.reference || null,
      tenantId: tenant?.id,
      source,
    });

    await MailService.notifyAdmin({
      mailbox: 'compta',
      subject: notif.subject,
      html: notif.html,
      replyTo: user?.email,
      attachments: attachment ? [attachment] : undefined,
    });
  }

  // ─── Paiement confirmé ─────────────────────────────────────────────────────

  /**
   * Paiement encaissé : reçu PDF au client + alerte interne (PDF joint).
   * @param {object} p
   * @param {object} p.payment  Instance Payment (status COMPLETED)
   * @param {object} p.tenant   Instance Tenant (ou tenantId)
   * @param {string} [p.planId]
   * @param {string} [p.period] '1M' | '3M' | '1Y'…
   */
  static async onPaymentCompleted({ payment, tenant, tenantId, planId, period }) {
    try {
      const t = tenant || (tenantId ? await Tenant.findByPk(tenantId) : null);
      if (!payment || !t) return;

      const plan = planId ? await Plan.findByPk(planId).catch(() => null) : null;
      const email = await resolveTenantEmail(t);
      const contactName = await resolveTenantContactName(t);
      const currency = t.currency || 'F CFA';

      // Reçu PDF identique à celui téléchargeable depuis la page Abonnement
      const attachment = await ReceiptPdfService.buildReceiptAttachment({ payment, tenant: t, plan });
      const attachments = attachment ? [attachment] : [];

      if (email) {
        const receipt = T.paymentReceiptClient({
          userName: contactName,
          companyName: t.name,
          amount: payment.amount,
          currency,
          planName: plan?.name || planId || 'Standard',
          period: PERIOD_LABELS[period] || period || null,
          method: payment.method,
          reference: payment.reference || payment.id,
          paymentDate: payment.paymentDate || new Date(),
          subscriptionEndsAt: t.subscriptionEndsAt,
          hasPdf: !!attachment,
        });

        await MailService.safeSend({
          mailbox: 'compta',
          to: email,
          subject: receipt.subject,
          html: receipt.html,
          attachments,
        });
      } else {
        console.warn(`[MailNotification] Aucun email pour le tenant ${t.id} — reçu non envoyé.`);
      }

      const notif = T.adminNewPayment({
        companyName: t.name,
        email: email || '—',
        amount: payment.amount,
        currency,
        planName: plan?.name || planId || 'Standard',
        period: PERIOD_LABELS[period] || period || null,
        method: payment.method,
        reference: payment.reference || payment.id,
        paymentDate: payment.paymentDate || new Date(),
        tenantId: t.id,
      });

      await MailService.notifyAdmin({
        mailbox: 'compta',
        subject: notif.subject,
        html: notif.html,
        attachments,
      });
    } catch (err) {
      console.error('[MailNotification] onPaymentCompleted :', err.message);
    }
  }

  // ─── Paiement déclaré, en attente de validation ────────────────────────────

  /** Paiement manuel déclaré : accusé au client + alerte interne à valider. */
  static async onPaymentPending({ payment, tenant, tenantId, userName, userEmail }) {
    try {
      const t = tenant || (tenantId ? await Tenant.findByPk(tenantId) : null);
      if (!payment || !t) return;

      const email = userEmail || (await resolveTenantEmail(t));
      const currency = t.currency || 'F CFA';

      if (email) {
        const ack = T.paymentPendingClient({
          userName: userName || (await resolveTenantContactName(t)),
          amount: payment.amount,
          currency,
          method: payment.method,
          reference: payment.reference || payment.id,
        });
        await MailService.safeSend({ mailbox: 'compta', to: email, subject: ack.subject, html: ack.html });
      }

      const notif = T.adminPendingPayment({
        companyName: t.name,
        email: email || '—',
        amount: payment.amount,
        currency,
        method: payment.method,
        reference: payment.reference || payment.id,
        tenantId: t.id,
      });
      await MailService.notifyAdmin({ mailbox: 'compta', subject: notif.subject, html: notif.html });
    } catch (err) {
      console.error('[MailNotification] onPaymentPending :', err.message);
    }
  }

  // ─── Formulaire de contact ─────────────────────────────────────────────────

  /** Message de contact : accusé au visiteur + alerte interne. */
  static async onContactMessage({ fullName, email, phone, message, ipAddress, messageId }) {
    try {
      const ack = T.contactAck({ fullName, message });
      await MailService.safeSend({ mailbox: 'contact', to: email, subject: ack.subject, html: ack.html });

      const notif = T.adminNewContactMessage({ fullName, email, phone, message, ipAddress, messageId });
      await MailService.notifyAdmin({
        mailbox: 'contact',
        subject: notif.subject,
        html: notif.html,
        replyTo: email,
      });
    } catch (err) {
      console.error('[MailNotification] onContactMessage :', err.message);
    }
  }

  // ─── Support ───────────────────────────────────────────────────────────────

  /** Ticket support : accusé au client + alerte interne. */
  static async onSupportTicket({ ticket, tenant, tenantId }) {
    try {
      const t = tenant || (tenantId ? await Tenant.findByPk(tenantId) : null);

      const ack = T.supportTicketAck({
        userName: ticket.userName || 'Cher client',
        subject: ticket.subject,
        message: ticket.message,
        ticketId: ticket.id,
        priority: ticket.priority,
      });

      if (ticket.userEmail) {
        await MailService.safeSend({
          mailbox: 'support',
          to: ticket.userEmail,
          subject: ack.subject,
          html: ack.html,
        });
      }

      const notif = T.adminNewSupportTicket({
        userName: ticket.userName,
        userEmail: ticket.userEmail,
        companyName: t?.name || '—',
        subject: ticket.subject,
        message: ticket.message,
        ticketId: ticket.id,
        priority: ticket.priority,
        category: ticket.category,
        tenantId: ticket.tenantId,
      });

      await MailService.notifyAdmin({
        mailbox: 'support',
        subject: notif.subject,
        html: notif.html,
        replyTo: ticket.userEmail,
      });
    } catch (err) {
      console.error('[MailNotification] onSupportTicket :', err.message);
    }
  }

  // ─── Sécurité ──────────────────────────────────────────────────────────────

  /** Mot de passe réinitialisé par un admin : envoie le nouveau mot de passe. */
  static async onPasswordResetByAdmin({ user, newPassword, operatorName }) {
    try {
      if (!user?.email) return;
      const tpl = T.passwordResetByAdmin({
        userName: user.name || 'Cher utilisateur',
        email: user.email,
        newPassword,
        operatorName,
      });
      await MailService.safeSend({ mailbox: 'support', to: user.email, subject: tpl.subject, html: tpl.html });
    } catch (err) {
      console.error('[MailNotification] onPasswordResetByAdmin :', err.message);
    }
  }

  /** Notification de sécurité après changement volontaire du mot de passe. */
  static async onPasswordChanged({ user, ipAddress }) {
    try {
      if (!user?.email) return;
      const tpl = T.passwordChangedNotice({
        userName: user.name || 'Cher utilisateur',
        email: user.email,
        ipAddress,
      });
      await MailService.safeSend({ mailbox: 'support', to: user.email, subject: tpl.subject, html: tpl.html });
    } catch (err) {
      console.error('[MailNotification] onPasswordChanged :', err.message);
    }
  }

  // ─── Message libre SuperAdmin ──────────────────────────────────────────────

  /**
   * Email personnalisé (relance, annonce) envoyé depuis la console SuperAdmin.
   * Lève en cas d'échec — l'opérateur doit savoir si l'envoi a échoué.
   */
  static async sendSuperAdminMessage({ to, subject, body, recipientName }) {
    const tpl = T.superAdminMessage({ subject, body, recipientName });
    return MailService.send({ mailbox: 'support', to, subject: tpl.subject, html: tpl.html });
  }
}

export default MailNotificationService;

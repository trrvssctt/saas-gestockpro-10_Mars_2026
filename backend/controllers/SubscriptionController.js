
import { Plan, Subscription, Tenant, AuditLog, Payment } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { StripeService } from '../services/StripeService.js';
import crypto from 'crypto';

export class SubscriptionController {
  /**
   * Récupère les détails de l'abonnement actuel et l'historique des paiements du tenant
   */
  static async getMySubscription(req, res) {
    try {
      const tenantId = req.user.tenantId;

      const subscription = await Subscription.findOne({
        where: { tenantId }
      });

      const payments = await Payment.findAll({
        where: { 
          tenantId,
          saleId: null // Filtre pour ne prendre que les paiements hors-ventes (abonnements)
        },
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        subscription,
        payments
      });
    } catch (error) {
      return res.status(500).json({ error: 'FetchError', message: error.message });
    }
  }

  /**
   * Enregistre un paiement d'abonnement en statut PENDING pour validation par SuperAdmin
   */
  static async recordPayment(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const tenantId = req.user.tenantId;
      const { subscriptionId, amount, period, transactionId, paymentMethod, reference } = req.body;

      // create payment record
      const payment = await Payment.create({
        tenantId,
        saleId: null,
        amount: Number(amount) || 0,
        method: paymentMethod || 'WAVE',
        reference: reference || transactionId || `PAY-${Date.now()}`,
        transactionId: transactionId || null,
        status: 'PENDING',
        paymentDate: new Date()
      }, { transaction });

      // mark tenant subscription/payment status as pending so admin sees it
      const tenant = await Tenant.findByPk(tenantId, { transaction });
      if (tenant) {
        await tenant.update({ paymentStatus: 'PENDING' }, { transaction });
      }

      // Audit entry
      await AuditLog.create({
        tenantId,
        userId: req.user?.id || null,
        userName: req.user?.name || 'UNKNOWN',
        action: 'SUBSCRIPTION_PAYMENT_SUBMITTED',
        resource: `subscription:${subscriptionId || 'unknown'}`,
        severity: 'MEDIUM',
        sha256Signature: crypto.createHash('sha256').update(`${tenantId}:${payment.id}:${Date.now()}`).digest('hex')
      }, { transaction });

      await transaction.commit();

      return res.status(200).json({ message: 'Paiement enregistré et en attente de validation.', payment });
    } catch (error) {
      if (transaction) await transaction.rollback();
      return res.status(500).json({ error: 'RecordPaymentError', message: error.message });
    }
  }

  /**
   * Récupère tous les plans actifs
   */
  static async listPlans(req, res) {
    try {
      const dbPlans = await Plan.findAll({
        where: { isActive: true },
        order: [['priceMonthly', 'ASC']]
      });
      
      if (!dbPlans || dbPlans.length === 0) {
        return res.status(200).json([
          { id: 'FREE_TRIAL', name: 'Essai Gratuit', price: 0, maxUsers: 5, hasAiChatbot: true, hasStockForecast: true },
          { id: 'BASIC', name: 'Starter AI', price: 30000, maxUsers: 1, hasAiChatbot: false, hasStockForecast: false },
          { id: 'PRO', name: 'Business Pro', price: 85000, maxUsers: 5, hasAiChatbot: true, hasStockForecast: true, isPopular: true },
          { id: 'ENTERPRISE', name: 'Enterprise Cloud', price: 250000, maxUsers: 100, hasAiChatbot: true, hasStockForecast: true }
        ]);
      }

      return res.status(200).json(dbPlans.map(p => ({
        id: p.id,
        name: p.name,
        price: p.priceMonthly,
        maxUsers: p.maxUsers,
        hasAiChatbot: p.hasAiChatbot,
        hasStockForecast: p.hasStockForecast,
        isPopular: p.id === 'PRO'
      })));
    } catch (error) {
      return res.status(200).json([
        { id: 'PRO', name: 'Business Pro (Fallback)', price: 85000, maxUsers: 5, hasAiChatbot: true, hasStockForecast: true, isPopular: true }
      ]);
    }
  }

  /**
   * Gère l'upgrade d'abonnement d'un Tenant avec enregistrement du paiement
   */
  static async upgradePlan(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { planId, paymentMethod, transactionId, amount, period, phone, reference } = req.body;
      const tenantId = req.user.tenantId;

      const tenant = await Tenant.findByPk(tenantId, { transaction });
      const plan = await Plan.findByPk(planId, { transaction });

      if (!tenant || !plan) throw new Error('Tenant ou Plan introuvable.');

      // Calculer nextBillingDate selon la période sélectionnée
      const PERIOD_MONTHS = { '1M': 1, '3M': 3, '1Y': 12 };
      const months = PERIOD_MONTHS[period] || 1;
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + months);

      // NE PAS changer tenant.planId pendant le PENDING — l'utilisateur garde son ancien plan
      // Sauvegarder le plan demandé en pendingPlanId pour que l'admin sache quoi valider
      await tenant.update({
        paymentStatus: 'PENDING',
        pendingPlanId: planId,          // plan cible de l'upgrade
        pendingPeriod: period || '1M',  // période sélectionnée
      }, { transaction });

      // Enregistrer le paiement avec le VRAI montant (total période avec remise)
      const paidAmount = Number(amount) > 0 ? Number(amount) : Number(plan.priceMonthly || 0) * months;
      const payRef = reference || transactionId || `UPGRADE-${planId}-${Date.now()}`;

      await Payment.create({
        tenantId,
        saleId: null,
        amount: paidAmount,
        method: paymentMethod || 'WAVE',
        reference: payRef,
        transactionId: transactionId || null,
        status: 'PENDING',
        paymentDate: new Date(),
        // Méta infos utiles
        notes: JSON.stringify({ planId, period: period || '1M', phone: phone || null }),
      }, { transaction });

      // Audit
      await AuditLog.create({
        tenantId,
        userId: req.user?.id || null,
        userName: req.user?.name || 'SYSTEM',
        action: 'SUBSCRIPTION_UPGRADE_REQUEST',
        resource: `Plan: ${planId} | Période: ${period} | Montant: ${paidAmount}`,
        severity: 'MEDIUM',
        sha256Signature: crypto.createHash('sha256').update(`${tenantId}:${planId}:${Date.now()}`).digest('hex')
      }, { transaction });

      await transaction.commit();

      return res.status(200).json({
        message: `Demande d'upgrade vers le plan ${plan.name} enregistrée en attente de validation.`,
        tenant: { paymentStatus: 'PENDING' },
        paidAmount,
        nextBillingDate: nextBilling,
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      return res.status(500).json({ error: 'UpgradeError', message: error.message });
    }
  }

  /**
   * Crée une Stripe Checkout Session et retourne l'URL de redirection
   * POST /api/billing/stripe/checkout
   */
  static async stripeCheckout(req, res) {
    try {
      if (!StripeService.isAvailable()) {
        return res.status(503).json({ error: 'StripeUnavailable', message: 'Stripe n\'est pas configuré sur ce serveur.' });
      }

      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { planId, period, amount, cardHolder } = req.body;

      if (!planId || !period || !amount) {
        return res.status(400).json({ error: 'MissingParams', message: 'planId, period et amount sont requis.' });
      }

      const plan = await Plan.findByPk(planId);
      const planName = plan ? plan.name : planId;

      const { url, sessionId } = await StripeService.createCheckoutSession({
        planId,
        planName,
        period,
        amount: Number(amount),
        tenantId,
        userId,
        cardHolder: cardHolder || '',
      });

      // Enregistre un paiement PENDING en base pour le retrouver au webhook
      const transaction = await sequelize.transaction();
      try {
        await Payment.create({
          tenantId,
          saleId: null,
          amount: Number(amount),
          method: 'STRIPE',
          reference: sessionId,
          transactionId: sessionId,
          status: 'PENDING',
          paymentDate: new Date(),
        }, { transaction });

        await AuditLog.create({
          tenantId,
          userId,
          userName: req.user?.name || 'ADMIN',
          action: 'STRIPE_CHECKOUT_INITIATED',
          resource: `plan:${planId} period:${period}`,
          severity: 'LOW',
          sha256Signature: crypto.createHash('sha256').update(`${tenantId}:${sessionId}:${Date.now()}`).digest('hex'),
        }, { transaction });

        await transaction.commit();
      } catch (dbErr) {
        await transaction.rollback();
        console.warn('[stripeCheckout] DB error (non-blocking):', dbErr.message);
      }

      return res.status(200).json({ url, sessionId });
    } catch (error) {
      return res.status(500).json({ error: 'StripeCheckoutError', message: error.message });
    }
  }

  /**
   * Webhook Stripe — traite les événements checkout.session.completed
   * POST /api/billing/stripe/webhook  (body: raw Buffer)
   */
  static async stripeWebhook(req, res) {
    let event;
    try {
      const signature = req.headers['stripe-signature'];
      event = StripeService.constructEvent(req.body, signature);
    } catch (err) {
      return res.status(400).json({ error: 'WebhookSignatureError', message: err.message });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { tenantId, planId, period } = session.metadata || {};

      if (!tenantId || !planId) {
        return res.status(200).json({ received: true }); // ignorer les sessions sans metadata
      }

      const t = await sequelize.transaction();
      try {
        // Marquer le paiement comme COMPLETED
        await Payment.update(
          { status: 'COMPLETED', transactionId: session.payment_intent || session.id },
          { where: { tenantId, reference: session.id, status: 'PENDING' }, transaction: t }
        );

        // Calculer la date de fin d'abonnement selon la période
        const PERIOD_MONTHS = { '1M': 1, '3M': 3, '1Y': 12 };
        const months = PERIOD_MONTHS[period] || 1;
        const nextBilling = new Date();
        nextBilling.setMonth(nextBilling.getMonth() + months);

        // Activer l'abonnement
        let sub = await Subscription.findOne({ where: { tenantId }, transaction: t });
        if (sub) {
          await sub.update({ planId, status: 'ACTIVE', nextBillingDate: nextBilling }, { transaction: t });
        } else {
          await Subscription.create({ tenantId, planId, status: 'ACTIVE', nextBillingDate: nextBilling, autoRenew: true }, { transaction: t });
        }

        // Mettre à jour le tenant
        await Tenant.update(
          { planId, paymentStatus: 'PAID', subscriptionEndsAt: nextBilling },
          { where: { id: tenantId }, transaction: t }
        );

        await AuditLog.create({
          tenantId,
          userId: null,
          userName: 'STRIPE_WEBHOOK',
          action: 'SUBSCRIPTION_ACTIVATED_STRIPE',
          resource: `plan:${planId} period:${period}`,
          severity: 'HIGH',
          sha256Signature: crypto.createHash('sha256').update(`${tenantId}:${planId}:${Date.now()}`).digest('hex'),
        }, { transaction: t });

        await t.commit();
      } catch (dbErr) {
        await t.rollback();
        console.error('[stripeWebhook] DB error:', dbErr.message);
        return res.status(500).json({ error: 'WebhookDBError', message: dbErr.message });
      }
    }

    return res.status(200).json({ received: true });
  }

  /**
   * Simulation de téléchargement de facture d'abonnement
   */
  static async downloadSubscriptionInvoice(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await Payment.findOne({ where: { id: paymentId, tenantId: req.user.tenantId, saleId: null } });
      
      if (!payment) return res.status(404).json({ error: 'Paiement introuvable.' });

      const tenant = await Tenant.findByPk(req.user.tenantId);
      const sub = await Subscription.findOne({ where: { tenantId: req.user.tenantId } });
      const plan = await Plan.findByPk(sub.planId);

      // Simule un retour PDF (Contenu Factur-X)
      return res.status(200).json({
        message: 'Facture d\'abonnement générée.',
        invoiceId: `F-SUB-${payment.id.slice(0,8).toUpperCase()}`,
        amount: payment.amount,
        date: payment.paymentDate || payment.createdAt,
        tenant: tenant,
        plan: plan,
        paymentMethod: payment.method
      });
    } catch (error) {
      return res.status(500).json({ error: 'InvoiceError', message: error.message });
    }
  }
}

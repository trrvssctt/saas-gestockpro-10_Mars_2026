
import { Customer, AuditLog, Sale } from '../models/index.js';
import { aggregateDebtors, CREANCE_STATUSES } from '../utils/salesMetrics.js';
import { NotificationService } from '../services/NotificationService.js';
import { Op } from 'sequelize';
import crypto from 'crypto';

export class RecoveryController {
  /**
   * Liste tous les clients ayant une dette (balance positive)
   */
  static async listDebtors(req, res) {
    try {
      // Dette calculée depuis les ventes (outstanding_balance n'est pas maintenu)
      const sales = await Sale.findAll({
        where: { tenantId: req.user.tenantId, status: { [Op.in]: CREANCE_STATUSES } },
        include: [{ model: Customer }]
      });
      const debtors = aggregateDebtors(sales).map(d => ({
        id: d.id, companyName: d.name, outstandingBalance: d.total, isWalkin: d.isWalkin
      }));
      return res.status(200).json(debtors);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Envoi d'un mail de relance formel via le Kernel
   */
  static async sendEmailReminder(req, res) {
    try {
      const { customerId, template } = req.body;
      const customer = await Customer.findOne({ 
        where: { id: customerId, tenantId: req.user.tenantId } 
      });

      if (!customer || !customer.email) {
        return res.status(400).json({ error: 'Client introuvable ou email manquant.' });
      }

      await NotificationService.send('EMAIL', customer.email, {
        subject: `Relance Paiement : ${customer.companyName}`,
        message: template || `Cher client, nous vous rappelons que vous avez un encours de ${customer.outstandingBalance} F CFA à régulariser.`
      });

      // Audit de la relance
      await AuditLog.create({
        tenantId: req.user.tenantId,
        userId: req.user.id,
        userName: req.user.name,
        action: 'RECOVERY_EMAIL_SENT',
        resource: `Customer: ${customer.companyName}`,
        severity: 'LOW',
        sha256Signature: crypto.createHash('sha256').update(`${customer.id}:email:${Date.now()}`).digest('hex')
      });

      return res.status(200).json({ message: 'Email de relance envoyé.' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}


import { Customer, Sale } from '../models/index.js';
import { Op } from 'sequelize';
import { CREANCE_STATUSES, customerHealth } from '../utils/salesMetrics.js';

export class CustomerService {
  /**
   * Analyse les retards de paiement (ventes impayées au-delà du délai client)
   * et met à jour le healthStatus.
   */
  static async refreshHealthStatus(customerId) {
    const customer = await Customer.findByPk(customerId);
    if (!customer) return;

    const sales = await Sale.findAll({
      where: { customerId, status: { [Op.in]: CREANCE_STATUSES } },
      attributes: ['totalTtc', 'amountPaid', 'status', 'createdAt']
    });
    const newStatus = customerHealth(sales, customer.paymentTerms);

    if (customer.healthStatus !== newStatus) {
      await customer.update({ healthStatus: newStatus });
    }
    
    return newStatus;
  }
}

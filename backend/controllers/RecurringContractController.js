
import { RecurringContract, RecurringInstallment, Customer, Service, Sale, SaleItem, Payment, StockItem, Invoice, InvoiceItem } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { Op } from 'sequelize';

/**
 * Construit une date ISO YYYY-MM-DD sur un jour fixe, plafonné au dernier jour du mois.
 */
function fixedDayDate(year, month0based, day) {
  const lastDay = new Date(year, month0based + 1, 0).getDate();
  const actualDay = Math.min(day, lastDay);
  return `${year}-${String(month0based + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
}

/**
 * Génère les dates d'échéances avec un JOUR FIXE par mois (paymentDay, défaut 5).
 *
 * Règle de la première échéance (MENSUEL / TRIMESTRIEL) :
 *   - Si startDate.day < paymentDay  → première échéance dans le MÊME mois
 *   - Si startDate.day >= paymentDay → première échéance le mois SUIVANT
 * Exemple : début 17 mai, paymentDay 5 → juin 5, juillet 5, août 5…
 * Exemple : début 3 mai,  paymentDay 5 → mai 5, juin 5, juillet 5…
 *
 * En HEBDOMADAIRE : +7 jours exacts à partir du startDate (pas de notion de jour fixe).
 */
function generateDueDates(startDate, endDate, numberOfInstallments, frequency = 'MENSUEL', paymentDay = 5) {
  const start = new Date(startDate + 'T00:00:00');
  const n = parseInt(numberOfInstallments);
  const day = Math.max(1, Math.min(28, parseInt(paymentDay) || 5));
  const dates = [];

  if (frequency === 'HEBDOMADAIRE') {
    for (let i = 0; i < n; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + 7 * i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }

  const monthStep = frequency === 'TRIMESTRIEL' ? 3 : 1;

  // Déterminer le mois de la première échéance
  let firstYear = start.getFullYear();
  let firstMonth = start.getMonth(); // 0-based
  if (start.getDate() >= day) {
    // Jour de début >= jour fixe → passer au cycle suivant
    firstMonth += monthStep;
    if (firstMonth > 11) {
      firstYear += Math.floor(firstMonth / 12);
      firstMonth = firstMonth % 12;
    }
  }

  for (let i = 0; i < n; i++) {
    const baseMonth = firstMonth + monthStep * i;
    const targetYear = firstYear + Math.floor(baseMonth / 12);
    const targetMonth = ((baseMonth % 12) + 12) % 12;
    dates.push(fixedDayDate(targetYear, targetMonth, day));
  }

  return dates;
}

/**
 * Calcule la date de fin en réutilisant generateDueDates.
 */
function computeEndDate(startDate, numberOfInstallments, frequency, paymentDay = 5) {
  const dates = generateDueDates(startDate, null, numberOfInstallments, frequency, paymentDay);
  return dates[dates.length - 1] || startDate;
}

export class RecurringContractController {

  static async list(req, res) {
    try {
      const contracts = await RecurringContract.findAll({
        where: { tenantId: req.user.tenantId },
        include: [
          { model: Customer, as: 'customer', attributes: ['companyName', 'email', 'phone'] },
          { model: Service, as: 'service', attributes: ['name'] },
          {
            model: RecurringInstallment,
            as: 'installments',
            attributes: ['id', 'installmentNumber', 'dueDate', 'amount', 'status', 'paidAt']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      return res.status(200).json(contracts);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getOne(req, res) {
    try {
      const contract = await RecurringContract.findOne({
        where: { id: req.params.id, tenantId: req.user.tenantId },
        include: [
          { model: Customer, as: 'customer', attributes: ['companyName', 'email', 'phone', 'billingAddress'] },
          { model: Service, as: 'service', attributes: ['name', 'description'] },
          {
            model: RecurringInstallment,
            as: 'installments',
            include: [
              {
                model: Sale,
                as: 'generatedSale',
                required: false,
                include: [
                  { model: Customer, attributes: ['companyName', 'email', 'phone', 'billingAddress'] },
                  {
                    model: SaleItem,
                    as: 'items',
                    include: [
                      { model: StockItem, as: 'stock_item', attributes: ['name', 'sku'] },
                      { model: Service, as: 'service', attributes: ['name'] }
                    ]
                  },
                  { model: Payment, as: 'payments' }
                ]
              }
            ],
            order: [['installmentNumber', 'ASC']]
          }
        ]
      });
      if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
      return res.status(200).json(contract);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async create(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const {
        title, description, customerId, walkinName, walkinPhone,
        serviceId, serviceItems, frequency, startDate, endDate,
        numberOfInstallments, installmentAmount, totalAmount, notes, paymentDay
      } = req.body;

      if (!title || !startDate || !numberOfInstallments || !installmentAmount) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Champs obligatoires manquants (titre, date de début, nombre et montant des échéances).' });
      }

      const freq = frequency || 'MENSUEL';
      const pDay = Math.max(1, Math.min(28, parseInt(paymentDay) || 5));
      const resolvedEndDate = endDate || computeEndDate(startDate, numberOfInstallments, freq, pDay);

      if (endDate && new Date(endDate) <= new Date(startDate)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'La date de fin doit être postérieure à la date de début.' });
      }

      const computedTotal = totalAmount || (parseFloat(installmentAmount) * parseInt(numberOfInstallments));
      const items = Array.isArray(serviceItems) && serviceItems.length > 0 ? serviceItems : null;
      const primaryServiceId = items ? (items[0]?.serviceId || null) : (serviceId || null);

      const contract = await RecurringContract.create({
        tenantId: req.user.tenantId,
        customerId: customerId || null,
        walkinName: walkinName || null,
        walkinPhone: walkinPhone || null,
        serviceId: primaryServiceId,
        serviceItems: items,
        title,
        description: description || null,
        frequency: freq,
        startDate,
        endDate: resolvedEndDate,
        numberOfInstallments: parseInt(numberOfInstallments),
        installmentAmount: parseFloat(installmentAmount),
        totalAmount: computedTotal,
        paymentDay: pDay,
        amountPaid: 0,
        status: 'ACTIF',
        notes: notes || null
      }, { transaction });

      const dueDates = generateDueDates(startDate, resolvedEndDate, parseInt(numberOfInstallments), freq, pDay);

      const installments = dueDates.map((dueDate, index) => ({
        tenantId: req.user.tenantId,
        contractId: contract.id,
        installmentNumber: index + 1,
        dueDate,
        amount: parseFloat(installmentAmount),
        status: 'EN_ATTENTE'
      }));

      await RecurringInstallment.bulkCreate(installments, { transaction });

      await transaction.commit();

      const result = await RecurringContract.findByPk(contract.id, {
        include: [
          { model: Customer, as: 'customer', attributes: ['companyName', 'email', 'phone'] },
          { model: Service, as: 'service', attributes: ['name'] },
          { model: RecurringInstallment, as: 'installments', order: [['installmentNumber', 'ASC']] }
        ]
      });

      return res.status(201).json(result);
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      return res.status(400).json({ error: error.message });
    }
  }

  static async payInstallment(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { installmentId } = req.params;
      const { method, reference, notes } = req.body;

      const installment = await RecurringInstallment.findOne({
        where: { id: installmentId, tenantId: req.user.tenantId },
        transaction
      });
      if (!installment) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Échéance introuvable' });
      }
      if (installment.status === 'PAYE') {
        await transaction.rollback();
        return res.status(400).json({ error: 'Cette échéance est déjà payée.' });
      }

      await installment.update({
        status: 'PAYE',
        paidAt: new Date(),
        paymentMethod: method || 'CASH',
        paymentReference: reference || null,
        notes: notes || installment.notes
      }, { transaction });

      // Recalculer le montant total payé sur le contrat
      const paidInstallments = await RecurringInstallment.count({
        where: { contractId: installment.contractId, status: 'PAYE' },
        transaction
      });
      const contract = await RecurringContract.findByPk(installment.contractId, { transaction });
      const newAmountPaid = parseFloat(contract.installmentAmount) * paidInstallments;
      const allPaid = paidInstallments >= contract.numberOfInstallments;

      await contract.update({
        amountPaid: newAmountPaid,
        status: allPaid ? 'TERMINE' : 'ACTIF'
      }, { transaction });

      await transaction.commit();
      return res.status(200).json({ message: 'Échéance encaissée.', allPaid });
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  static async markOverdue(req, res) {
    try {
      const today = new Date().toISOString().split('T')[0];
      // Exclure les échéances des contrats EN_PAUSE ou ANNULE
      const eligible = await RecurringInstallment.findAll({
        where: { tenantId: req.user.tenantId, status: 'EN_ATTENTE', dueDate: { [Op.lt]: today } },
        include: [{ model: RecurringContract, as: 'contract', where: { status: 'ACTIF' }, required: true }]
      });
      const ids = eligible.map(i => i.id);
      let count = 0;
      if (ids.length > 0) {
        [count] = await RecurringInstallment.update({ status: 'EN_RETARD' }, { where: { id: ids } });
      }
      return res.status(200).json({ updated: count });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async pause(req, res) {
    try {
      const contract = await RecurringContract.findOne({ where: { id: req.params.id, tenantId: req.user.tenantId } });
      if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
      if (contract.status !== 'ACTIF') return res.status(400).json({ error: 'Seuls les contrats actifs peuvent être mis en pause.' });
      await contract.update({ status: 'EN_PAUSE' });
      return res.status(200).json({ message: 'Contrat mis en pause.' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async resume(req, res) {
    try {
      const contract = await RecurringContract.findOne({ where: { id: req.params.id, tenantId: req.user.tenantId } });
      if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
      if (contract.status !== 'EN_PAUSE') return res.status(400).json({ error: 'Ce contrat n\'est pas en pause.' });
      await contract.update({ status: 'ACTIF' });
      return res.status(200).json({ message: 'Contrat relancé.' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async deleteContract(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const contract = await RecurringContract.findOne({
        where: { id: req.params.id, tenantId: req.user.tenantId },
        include: [{ model: RecurringInstallment, as: 'installments' }],
        transaction
      });
      if (!contract) { await transaction.rollback(); return res.status(404).json({ error: 'Contrat introuvable' }); }
      if (parseFloat(contract.amountPaid) > 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Impossible de supprimer un contrat ayant des paiements enregistrés.' });
      }
      // Délier les ventes auto-générées (elles restent dans Sales mais ne pointent plus vers l'échéance)
      const installmentIds = (contract.installments || []).map(i => i.id);
      if (installmentIds.length > 0) {
        await Sale.update({ recurringInstallmentId: null }, { where: { recurringInstallmentId: installmentIds }, transaction });
      }
      await RecurringInstallment.destroy({ where: { contractId: contract.id }, transaction });
      await contract.destroy({ transaction });
      await transaction.commit();
      return res.status(200).json({ message: 'Contrat supprimé.' });
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  static async updateContract(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const contract = await RecurringContract.findOne({ where: { id: req.params.id, tenantId: req.user.tenantId }, transaction });
      if (!contract) { await transaction.rollback(); return res.status(404).json({ error: 'Contrat introuvable' }); }
      if (parseFloat(contract.amountPaid) > 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Impossible de modifier un contrat avec des paiements enregistrés.' });
      }

      const {
        title, description, customerId, walkinName, walkinPhone,
        serviceId, serviceItems, frequency, startDate, endDate,
        numberOfInstallments, installmentAmount, totalAmount, notes, paymentDay
      } = req.body;

      const n = parseInt(numberOfInstallments) || contract.numberOfInstallments;
      const amt = parseFloat(installmentAmount) || parseFloat(contract.installmentAmount);
      const sd = startDate || contract.startDate;
      const freq = frequency || contract.frequency;
      const pDay = Math.max(1, Math.min(28, parseInt(paymentDay) || contract.paymentDay || 5));
      const ed = endDate !== undefined ? (endDate || null) : contract.endDate;
      const resolvedEd = ed || computeEndDate(sd, n, freq, pDay);
      const computed = totalAmount || amt * n;
      const items = Array.isArray(serviceItems) && serviceItems.length > 0 ? serviceItems : null;
      const primaryServiceId = items ? (items[0]?.serviceId || null) : (serviceId || null);

      // Collecter les ventes auto-générées avant de supprimer les échéances
      const existingInstallments = await RecurringInstallment.findAll({
        where: { contractId: contract.id },
        transaction
      });
      const generatedSaleIds = existingInstallments
        .filter(i => i.generatedSaleId)
        .map(i => i.generatedSaleId);

      if (generatedSaleIds.length > 0) {
        const invoices = await Invoice.findAll({ where: { saleId: generatedSaleIds }, transaction });
        const invoiceIds = invoices.map(inv => inv.id);
        if (invoiceIds.length > 0) {
          await InvoiceItem.destroy({ where: { invoiceId: invoiceIds }, transaction });
          await Invoice.destroy({ where: { id: invoiceIds }, transaction });
        }
        await SaleItem.destroy({ where: { saleId: generatedSaleIds }, transaction });
        await Sale.destroy({ where: { id: generatedSaleIds }, transaction });
      }

      // Supprimer et recréer les échéances
      await RecurringInstallment.destroy({ where: { contractId: contract.id }, transaction });

      await contract.update({
        title: title || contract.title,
        description: description !== undefined ? description : contract.description,
        customerId: customerId || null,
        walkinName: walkinName || null,
        walkinPhone: walkinPhone || null,
        serviceId: primaryServiceId,
        serviceItems: items !== null ? items : contract.serviceItems,
        frequency: freq,
        startDate: sd, endDate: resolvedEd,
        numberOfInstallments: n,
        installmentAmount: amt,
        totalAmount: computed,
        paymentDay: pDay,
        amountPaid: 0,
        notes: notes !== undefined ? notes : contract.notes
      }, { transaction });

      const dueDates = generateDueDates(sd, resolvedEd, n, freq, pDay);
      for (let i = 0; i < dueDates.length; i++) {
        await RecurringInstallment.create({
          tenantId: req.user.tenantId,
          contractId: contract.id,
          installmentNumber: i + 1,
          dueDate: dueDates[i],
          amount: amt,
          status: 'EN_ATTENTE'
        }, { transaction });
      }

      await transaction.commit();
      return res.status(200).json({ message: 'Contrat mis à jour.' });
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  static async cancel(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const contract = await RecurringContract.findOne({
        where: { id: req.params.id, tenantId: req.user.tenantId },
        transaction
      });
      if (!contract) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Contrat introuvable' });
      }

      await RecurringInstallment.update(
        { status: 'ANNULE' },
        { where: { contractId: contract.id, status: 'EN_ATTENTE' }, transaction }
      );
      await contract.update({ status: 'ANNULE' }, { transaction });

      await transaction.commit();
      return res.status(200).json({ message: 'Contrat annulé.' });
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Génère automatiquement une vente pour chaque échéance dont la date
   * est dans les 5 prochains jours et qui n'a pas encore de vente associée.
   * Appelé au chargement de la page RecurringContracts.
   */
  static async generateUpcomingSales(req, res) {
    const tenantId = req.user.tenantId;
    const transaction = await sequelize.transaction();
    try {
      const today = new Date();
      const trigger = new Date(today);
      trigger.setDate(trigger.getDate() + 5);
      const triggerDate = trigger.toISOString().split('T')[0];

      // Échéances dues dans <= 5 jours, actives, sans vente générée
      const installments = await RecurringInstallment.findAll({
        where: {
          tenantId,
          status: { [Op.in]: ['EN_ATTENTE', 'EN_RETARD'] },
          dueDate: { [Op.lte]: triggerDate },
          generatedSaleId: null
        },
        include: [{
          model: RecurringContract,
          as: 'contract',
          where: { status: 'ACTIF' }
        }],
        transaction
      });

      let generated = 0;
      for (const installment of installments) {
        const contract = installment.contract;
        const amount = parseFloat(installment.amount);
        const ht = parseFloat((amount / 1.18).toFixed(2));
        const tva = parseFloat((amount - ht).toFixed(2));

        const saleRef = `RC-${Date.now().toString().slice(-8)}-${installment.installmentNumber}`;

        const sale = await Sale.create({
          tenantId,
          customerId: contract.customerId || null,
          walkinName: contract.walkinName || null,
          walkinPhone: contract.walkinPhone || null,
          reference: saleRef,
          status: 'EN_COURS',
          totalHt: ht,
          totalTtc: amount,
          taxAmount: tva,
          amountPaid: 0,
          recurringInstallmentId: installment.id
        }, { transaction });

        const invoiceId = `INV-RC-${Date.now().toString().slice(-8)}`;
        await Invoice.create({
          id: invoiceId,
          tenantId,
          saleId: sale.id,
          customerId: contract.customerId || null,
          amount: ht,
          taxAmount: tva,
          status: 'PENDING',
          dueDate: new Date(installment.dueDate)
        }, { transaction });

        // Créer un SaleItem / InvoiceItem par service si multi-services, sinon comportement original
        const serviceLines = Array.isArray(contract.serviceItems) && contract.serviceItems.length > 0
          ? contract.serviceItems
          : [{ serviceId: contract.serviceId || null, name: contract.title, unitPrice: ht, quantity: 1 }];

        for (const line of serviceLines) {
          const lineUnitPriceHt = parseFloat(line.unitPrice) || 0;
          const lineQty = parseInt(line.quantity) || 1;
          const lineTtc = parseFloat((lineUnitPriceHt * lineQty * 1.18).toFixed(2));

          await SaleItem.create({
            saleId: sale.id,
            stockItemId: null,
            serviceId: line.serviceId || null,
            quantity: lineQty,
            quantityDelivered: 0,
            unitPrice: lineUnitPriceHt,
            totalTtc: lineTtc,
            taxRate: 18
          }, { transaction });

          await InvoiceItem.create({
            invoiceId,
            productId: null,
            name: `${line.name || contract.title} — Échéance ${installment.installmentNumber}`,
            qty: lineQty,
            price: lineUnitPriceHt,
            tva: 18
          }, { transaction });
        }

        await installment.update({ generatedSaleId: sale.id }, { transaction });
        generated++;
      }

      await transaction.commit();
      return res.status(200).json({ generated });
    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Appelé par SalesController quand une vente liée à une échéance est soldée.
   * Marque l'échéance comme PAYE et met à jour le contrat.
   */
  static async syncContractPartialPaid(installmentId, saleAmountPaid, tenantId) {
    try {
      const installment = await RecurringInstallment.findOne({ where: { id: installmentId, tenantId } });
      if (!installment) return;

      const contract = await RecurringContract.findByPk(installment.contractId);
      if (!contract) return;

      const paidCount = await RecurringInstallment.count({
        where: { contractId: installment.contractId, status: 'PAYE' }
      });
      const fullyPaidTotal = parseFloat(contract.installmentAmount) * paidCount;
      const newAmountPaid = Math.min(
        fullyPaidTotal + parseFloat(saleAmountPaid),
        parseFloat(contract.totalAmount)
      );
      await contract.update({ amountPaid: newAmountPaid });
    } catch (e) {
      console.error('[RecurringSync] Erreur sync partiel:', e.message);
    }
  }

  static async syncInstallmentPaid(installmentId, tenantId) {
    try {
      const installment = await RecurringInstallment.findOne({
        where: { id: installmentId, tenantId }
      });
      if (!installment || installment.status === 'PAYE') return;

      await installment.update({ status: 'PAYE', paidAt: new Date() });

      const paidCount = await RecurringInstallment.count({
        where: { contractId: installment.contractId, status: 'PAYE' }
      });
      const contract = await RecurringContract.findByPk(installment.contractId);
      if (contract) {
        const newAmountPaid = parseFloat(contract.installmentAmount) * paidCount;
        const allPaid = paidCount >= contract.numberOfInstallments;
        await contract.update({
          amountPaid: newAmountPaid,
          status: allPaid ? 'TERMINE' : 'ACTIF'
        });
      }
    } catch (e) {
      console.error('[RecurringSync] Erreur sync installment:', e.message);
    }
  }
}

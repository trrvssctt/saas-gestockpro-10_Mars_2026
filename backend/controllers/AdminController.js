
import { Tenant, User, Subscription, Plan, Payment, AuditLog, Sale, SaleItem, Customer, StockItem, ProductMovement, Category, Subcategory } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { Op, fn, col } from 'sequelize';
import crypto from 'crypto';

export class AdminController {
  /**
   * Dashboard Global : Stats, Revenus et Alertes
   */
  static async getGlobalDashboard(req, res) {
    try {
      // ── Period params: ?year=2024 &month=3 (month=0 means "all year") ───────
      const now = new Date();
      const filterYear  = req.query.year  ? parseInt(req.query.year,  10) : null;
      const filterMonth = req.query.month ? parseInt(req.query.month, 10) : null; // 1-12 or null=full year

      // Build period boundaries
      let periodStart = null;
      let periodEnd   = null;
      if (filterYear) {
        if (filterMonth) {
          // Specific month of a year
          periodStart = new Date(filterYear, filterMonth - 1, 1);
          periodEnd   = new Date(filterYear, filterMonth, 1);
        } else {
          // Full year
          periodStart = new Date(filterYear, 0, 1);
          periodEnd   = new Date(filterYear + 1, 0, 1);
        }
      }

      // Determine tenant scoping
      const isSuper = req.user && req.user.role === 'SUPER_ADMIN';
      const requestedTenantId = isSuper ? (req.headers['x-tenant-id'] || null) : (req.user ? req.user.tenantId : null);
      const tenantWhere = requestedTenantId ? { tenantId: requestedTenantId } : null;

      // High level tenant counts
      const totalTenants  = await Tenant.count();
      const activeTenants = await Tenant.count({ where: { isActive: true } });

      // ── Period filter helper ─────────────────────────────────────────────
      const withPeriod = (base = {}) => {
        const w = { ...(tenantWhere || {}), ...base };
        if (periodStart) w.createdAt = { [Op.gte]: periodStart, [Op.lt]: periodEnd };
        return w;
      };

      // ── Sales & finance ──────────────────────────────────────────────────
      const salesWhere = withPeriod({ status: { [Op.ne]: 'ANNULE' } });
      const totalSalesCount = await Sale.count({ where: salesWhere });
      const totalRevenue    = parseFloat(await Sale.sum('totalTtc', { where: salesWhere }) || 0);

      // totalCollected = paiements reçus dans la période
      const paymentsLinkedWhere = withPeriod({ saleId: { [Op.ne]: null }, status: 'COMPLETED' });
      const totalCollected = parseFloat(await Payment.sum('amount', { where: paymentsLinkedWhere }) || 0);

      // ── Créances : dettes non réglées à la fin de la période ────────────
      // On charge TOUTES les ventes créées avant la fin de la période,
      // et les paiements reçus avant la fin de la période pour calculer le solde réel.
      const creancesSalesWhere = tenantWhere
        ? { ...tenantWhere, status: { [Op.ne]: 'ANNULE' }, ...(periodEnd ? { createdAt: { [Op.lt]: periodEnd } } : {}) }
        : { status: { [Op.ne]: 'ANNULE' }, ...(periodEnd ? { createdAt: { [Op.lt]: periodEnd } } : {}) };

      const creancesPayWhere = tenantWhere
        ? { ...tenantWhere, saleId: { [Op.ne]: null }, status: 'COMPLETED', ...(periodEnd ? { createdAt: { [Op.lt]: periodEnd } } : {}) }
        : { saleId: { [Op.ne]: null }, status: 'COMPLETED', ...(periodEnd ? { createdAt: { [Op.lt]: periodEnd } } : {}) };

      const [allSalesForCreances, allPaymentsForCreances] = await Promise.all([
        Sale.findAll({ where: creancesSalesWhere, include: [{ model: Customer }], attributes: ['id','totalTtc','status','customerId'] }),
        Payment.findAll({ where: creancesPayWhere, attributes: ['saleId','amount'] })
      ]);
      const paidBySale = {};
      allPaymentsForCreances.forEach(p => {
        paidBySale[p.saleId] = (paidBySale[p.saleId] || 0) + parseFloat(p.amount || 0);
      });
      const debtByCustomer = {};
      allSalesForCreances.forEach(s => {
        const paid = paidBySale[s.id] || 0;
        const due  = parseFloat(s.totalTtc || 0) - paid;
        if (due > 0) {
          const cid   = s.Customer?.id || 'PASSAGE';
          const cname = s.Customer?.companyName || s.Customer?.name || 'Client';
          debtByCustomer[cid] = debtByCustomer[cid] || { id: cid, name: cname, total: 0 };
          debtByCustomer[cid].total += due;
        }
      });
      const topDebtors  = Object.values(debtByCustomer).sort((a, b) => b.total - a.total).slice(0, 5);
      const totalUnpaid = Object.values(debtByCustomer).reduce((s, d) => s + d.total, 0);

      const overdueCount = await Sale.count({ where: withPeriod({ status: 'EN_COURS' }) });

      // Recent sales (in period)
      const recentSalesWhere = withPeriod({ status: { [Op.ne]: 'ANNULE' } });
      const recentSales = await Sale.findAll({ where: recentSalesWhere, include: [{ model: Customer }], order: [['createdAt','DESC']], limit: 20 });

      // Latest payments (in period)
      const latestPaymentsWhere = tenantWhere
        ? { ...tenantWhere, ...(periodStart ? { createdAt: { [Op.gte]: periodStart, [Op.lt]: periodEnd } } : {}) }
        : { ...(periodStart ? { createdAt: { [Op.gte]: periodStart, [Op.lt]: periodEnd } } : {}) };
      const latestPayments = await Payment.findAll({
        where: latestPaymentsWhere,
        include: [{ model: Sale, include: [{ model: Customer }] }],
        order: [['createdAt','DESC']],
        limit: 10
      });

      // Customers
      const customersCount   = await Customer.count({ where: tenantWhere || {} });
      const latestCustomers  = await Customer.findAll({ where: tenantWhere || {}, order: [['createdAt','DESC']], limit: 5 });

      // Stock (not time-scoped — reflects current state)
      const stocksTotal   = await StockItem.count({ where: tenantWhere || {} });
      const stocksRupture = await StockItem.count({ where: { ...(tenantWhere || {}), currentLevel: { [Op.lte]: 0 } } });
      const stocksLow     = await StockItem.count({ where: { ...(tenantWhere || {}), [Op.and]: [ { currentLevel: { [Op.gt]: 0 } }, { minThreshold: { [Op.ne]: null } }, sequelize.where(col('stock_item.current_level'), '<=', col('stock_item.min_threshold')) ] } });
      const recentStocks  = await StockItem.findAll({ where: tenantWhere || {}, order: [['updatedAt','DESC']], limit: 20 });

      // Movements (in period)
      const movementsWhere = tenantWhere
        ? { ...tenantWhere, ...(periodStart ? { createdAt: { [Op.gte]: periodStart, [Op.lt]: periodEnd } } : {}) }
        : { ...(periodStart ? { createdAt: { [Op.gte]: periodStart, [Op.lt]: periodEnd } } : {}) };
      const recentMovements = await ProductMovement.findAll({ where: movementsWhere, include: [{ model: StockItem }], order: [['createdAt','DESC']], limit: 10 });

      // Categories
      const categoriesCount    = await Category.count({ where: tenantWhere || {} });
      const subcategoriesCount = await Subcategory.count({ where: tenantWhere || {} });

      // Users
      const usersCount     = await User.count({ where: tenantWhere || {} });
      const recentUsers    = await User.findAll({ where: tenantWhere || {}, order: [['lastLogin','DESC NULLS LAST']], limit: 5 });
      const usersByRoleRaw = await User.findAll({ attributes: ['role', [fn('COUNT', col('role')), 'cnt']], group: ['role'] });
      const usersByRole    = {};
      usersByRoleRaw.forEach(r => { usersByRole[r.role] = parseInt(r.get('cnt'), 10); });

      // Subscriptions
      const subsThreshold = new Date();
      subsThreshold.setDate(subsThreshold.getDate() + 7);
      const subsWhere = requestedTenantId ? { tenantId: requestedTenantId, nextBillingDate: { [Op.lte]: subsThreshold } } : { nextBillingDate: { [Op.lte]: subsThreshold } };
      const subs = await Subscription.findAll({ where: subsWhere, include: [{ model: Tenant, attributes: ['name'] }], limit: 50 });

      const pendingValidationsRaw = await Subscription.findAll({ where: { status: 'PENDING' }, include: [{ model: Tenant, attributes: ['id','name','domain'] }], limit: 50 });
      const pendingValidations = pendingValidationsRaw.map(s => {
        const tenantIdVal    = s.tenantId || s.Tenant?.id || (s.tenant ? s.tenant.id : null);
        const tenantNameVal  = s.Tenant?.name || (s.tenant ? s.tenant.name : null) || null;
        const tenantDomainVal= s.Tenant?.domain || (s.tenant ? s.tenant.domain : null) || null;
        return { id: tenantIdVal, tenant: { id: tenantIdVal, name: tenantNameVal, domain: tenantDomainVal }, tenantName: tenantNameVal, tenantDomain: tenantDomainVal, planId: s.planId, status: s.status, nextBillingDate: s.nextBillingDate };
      });

      // MRR
      let mrr = 0;
      try {
        const activeSubs = await Subscription.findAll({ where: { status: 'ACTIVE' }, include: [{ model: Plan, as: 'planDetails' }] });
        mrr = activeSubs.reduce((sum, s) => sum + Number(s.planDetails?.priceMonthly || 0), 0);
        if (!isFinite(mrr) || Number.isNaN(mrr)) mrr = 0;
      } catch (e) { console.warn('[MRR CALC ERROR]', e.message || e); mrr = 0; }

      // ── Revenue stats : 12 months of the selected year (or last 6 months if no year) ──
      const revenueStats = [];
      try {
        const statsYear  = filterYear || now.getFullYear();
        const nbMonths   = filterYear ? 12 : 6;
        const startMonth = filterYear ? 0 : now.getMonth() - 5;

        for (let i = 0; i < nbMonths; i++) {
          const start = filterYear
            ? new Date(statsYear, i, 1)
            : new Date(now.getFullYear(), startMonth + i, 1);
          const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

          const monthSalesWhere = { createdAt: { [Op.gte]: start, [Op.lt]: end }, status: { [Op.ne]: 'ANNULE' }, ...(tenantWhere || {}) };
          const monthPayWhere   = { createdAt: { [Op.gte]: start, [Op.lt]: end }, saleId: { [Op.ne]: null }, status: 'COMPLETED', ...(tenantWhere || {}) };

          const total     = parseFloat((await Sale.sum('totalTtc', { where: monthSalesWhere })) || 0);
          const collected = parseFloat((await Payment.sum('amount',  { where: monthPayWhere   })) || 0);

          // Créances cumulées à fin de ce mois
          const creanceSalesUpTo = { createdAt: { [Op.lt]: end }, status: { [Op.ne]: 'ANNULE' }, ...(tenantWhere || {}) };
          const creancePayUpTo   = { createdAt: { [Op.lt]: end }, saleId: { [Op.ne]: null }, status: 'COMPLETED', ...(tenantWhere || {}) };
          const [salesTot, payTot] = await Promise.all([
            Sale.sum('totalTtc', { where: creanceSalesUpTo }),
            Payment.sum('amount', { where: creancePayUpTo })
          ]);
          const creances = Math.max(0, parseFloat(salesTot || 0) - parseFloat(payTot || 0));

          revenueStats.push({ month: start.toISOString(), total, collected, creances });
        }
      } catch (e) { console.warn('[REVENUE STATS ERROR]', e.message || e); }

      const latePayments = overdueCount;
      const pendingSub   = pendingValidations.length || 0;

      return res.status(200).json({
        // ── Period metadata (consumed by the frontend) ──
        period: {
          year:  filterYear  || now.getFullYear(),
          month: filterMonth || null,
          isFiltered: !!filterYear,
          label: filterYear
            ? (filterMonth
                ? new Date(filterYear, filterMonth - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                : String(filterYear))
            : 'Toutes les années'
        },
        stats: {
          totalTenants, activeTenants, mrr, latePayments, pendingSub,
          totalSalesCount, totalRevenue, totalCollected, totalUnpaid,
          overdueCount, customersCount, stocksTotal, stocksRupture,
          stocksLow, categoriesCount, subcategoriesCount, usersCount
        },
        topDebtors,
        latestPayments: latestPayments.map(p => ({ id: p.id, amount: p.amount, createdAt: p.createdAt, saleId: p.saleId, customer: p.Sale?.Customer?.companyName || null })),
        recentSales: recentSales.map(s => ({ id: s.id, reference: s.reference, totalTtc: s.totalTtc, amountPaid: s.amountPaid || 0, status: s.status, createdAt: s.createdAt, customer: s.Customer?.companyName, operator: s.operator || s.operatorName || null })),
        latestCustomers: latestCustomers.map(c => ({ id: c.id, companyName: c.companyName || c.name, createdAt: c.createdAt })),
        recentMovements: recentMovements.map(m => ({ id: m.id, productName: m.productName || m.StockItem?.name, quantity: m.quantity, createdAt: m.createdAt, type: m.type, userRef: m.userRef || m.userName || (m.user ? m.user.name : null) })),
        users: { count: usersCount, byRole: usersByRole, recent: recentUsers.map(u => ({ id: u.id, name: u.name, email: u.email, lastLogin: u.lastLogin, role: u.role || 'EMPLOYEE' })) },
        subscriptionAlerts: subs.map(s => ({ tenant: s.Tenant?.name, nextBillingDate: s.nextBillingDate, status: s.status })),
        subscription: subs && subs.length > 0 ? { subscription: { nextBillingDate: subs[0].nextBillingDate, tenant: subs[0].Tenant?.name, status: subs[0].status, planId: subs[0].planId } } : null,
        stocks: recentStocks.map(s => ({ id: s.id, name: s.name, currentLevel: s.currentLevel, minThreshold: s.minThreshold, sku: s.sku })),
        pendingValidations,
        revenueStats
      });
    } catch (error) {
      console.error("[KERNEL ADMIN DASHBOARD ERROR]:", error);
      return res.status(500).json({ error: error.name, message: error.message });
    }
  }

  /**
   * Liste enrichie des comptes
   */
  static async listTenants(req, res) {
    try {
      const tenants = await Tenant.findAll({
        order: [['createdAt', 'DESC']],
        include: [
          { 
            model: Subscription, 
            as: 'subscription',
            include: [{ model: Plan, as: 'planDetails' }]
          }
        ]
      });
      
      const enriched = await Promise.all(tenants.map(async (t) => {
        const userCount = await User.count({ where: { tenantId: t.id } });
        return { 
          ...t.toJSON(), 
          userCount,
          planName: t.subscription?.planDetails?.name || 'SANS_PLAN',
          planMaxUsers: t.subscription?.planDetails?.maxUsers || 0,
          isUpToDate: t.paymentStatus === 'UP_TO_DATE' || t.paymentStatus === 'TRIAL'
        };
      }));

      return res.status(200).json(enriched);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Détails d'une souscription spécifique (Registry Billing)
   */
  static async getTenantBillingDetails(req, res) {
    try {
      const { id } = req.params;
      const tenant = await Tenant.findByPk(id, {
        include: [
          { 
            model: Subscription, 
            as: 'subscription',
            include: [{ model: Plan, as: 'planDetails' }]
          }
        ]
      });

      if (!tenant) return res.status(404).json({ error: 'Instance non trouvée' });

      const payments = await Payment.findAll({
        where: { tenantId: id, saleId: null },
        order: [['paymentDate', 'DESC']]
      });

      const userCount = await User.count({ where: { tenantId: id } });

      return res.status(200).json({
        tenant,
        payments,
        stats: { userCount }
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Kill-Switch (Correction de l'audit)
   */
  static async toggleTenantLock(req, res) {
    try {
      const { id } = req.params;
      const tenant = await Tenant.findByPk(id);
      if (!tenant) return res.status(404).json({ error: 'Tenant non trouvé' });

      await tenant.update({ isActive: !tenant.isActive });
      
      // Audit: only set userId when the user exists in the users table.
      // Some master/system actors may exist outside of the tenants' users table,
      // so we fallback to recording only `userName` and a null `userId` to avoid FK violations.
      let auditUserId = null;
      let auditUserName = 'SYSTEM';
      try {
        if (req.user && req.user.id) {
          const found = await User.findByPk(req.user.id);
          if (found) auditUserId = req.user.id;
          auditUserName = req.user.name || (found ? found.name : auditUserName);
        }
      } catch (e) {
        // don't fail the main flow for audit lookup errors
        console.warn('[AUDIT USER LOOKUP FAILED]', e.message || e);
      }

      await AuditLog.create({
        tenantId: id,
        userId: auditUserId,
        userName: auditUserName,
        action: tenant.isActive ? 'TENANT_UNLOCKED' : 'TENANT_LOCKED',
        resource: `Tenant: ${tenant.name} (${tenant.domain})`,
        severity: 'HIGH',
        sha256Signature: crypto.createHash('sha256').update(`LOCK_ACTION:${id}:${Date.now()}`).digest('hex')
      });

      return res.status(200).json(tenant);
    } catch (error) {
      console.error("[TOGGLE LOCK ERROR]:", error);
      return res.status(500).json({ error: error.name, message: error.message });
    }
  }

  static async listPlans(req, res) {
    try {
      const plans = await Plan.findAll({ order: [['priceMonthly', 'ASC']] });
      return res.status(200).json(plans);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Retourne les logs d'audit (filtres: tenantId, userId, q, limit, offset)
   */
  static async getLogs(req, res) {
    try {
      const { tenantId, userId, q, limit = 200, offset = 0 } = req.query;
      const where = {};
      if (tenantId) where.tenantId = tenantId;
      if (userId) where.userId = userId;
      if (q) where[Op.or] = [
        { action: { [Op.iLike]: `%${q}%` } },
        { resource: { [Op.iLike]: `%${q}%` } },
        { userName: { [Op.iLike]: `%${q}%` } }
      ];

      const logs = await AuditLog.findAll({ where, order: [['createdAt', 'DESC']], limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
      return res.status(200).json(logs.map(l => ({ id: l.id, tenantId: l.tenantId, userId: l.userId, userName: l.userName, action: l.action, resource: l.resource, status: l.status, severity: l.severity, createdAt: l.createdAt })));
    } catch (error) {
      console.error('[GET LOGS ERROR]', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Liste les utilisateurs d'un tenant (support pour SuperAdmin views)
   */
  static async listUsersForTenant(req, res) {
    try {
      const { id } = req.params;
      const users = await User.findAll({ where: { tenantId: id }, order: [['createdAt', 'DESC']] });
      return res.status(200).json(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
    } catch (error) {
      console.error('[LIST USERS FOR TENANT ERROR]', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async createPlan(req, res) {
    try {
      const plan = await Plan.create(req.body);
      return res.status(201).json(plan);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async updatePlan(req, res) {
    try {
      const plan = await Plan.findByPk(req.params.id);
      if (!plan) return res.status(404).json({ error: 'Plan non trouvé' });
      await plan.update(req.body);
      return res.status(200).json(plan);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async deletePlan(req, res) {
    try {
      const plan = await Plan.findByPk(req.params.id);
      if (!plan) return res.status(404).json({ error: 'Plan non trouvé' });
      await plan.update({ isActive: false });
      return res.status(200).json({ message: 'Plan désactivé.' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async sendEmailToOwner(req, res) {
    try {
      const { tenantId, tenantName, subject, body: bodyText, toEmail } = req.body || {};
      let tenant = null;
      if (tenantId) tenant = await Tenant.findByPk(tenantId);
      else if (tenantName) tenant = await Tenant.findOne({ where: { name: tenantName } });

      const recipients = [];
      if (toEmail) recipients.push(toEmail);
      if (tenant) {
        if (tenant.contactEmail) recipients.push(tenant.contactEmail);
        if (tenant.email) recipients.push(tenant.email);
        // find admin/owner users
        try {
          const admins = await User.findAll({ where: { tenantId: tenant.id, role: { [Op.in]: ['OWNER', 'ADMIN'] } } });
          admins.forEach(a => { if (a.email) recipients.push(a.email); });
        } catch (e) {
          console.warn('[SEND EMAIL] unable to query tenant users', e.message || e);
        }
      }

      // dedupe and filter
      const toList = Array.from(new Set((recipients || []).filter(Boolean)));
      if (toList.length === 0) return res.status(400).json({ error: 'Aucun destinataire trouvé' });

      const to = toList.join(',');

      // Prepare audit user info: only set `userId` when that user exists in `users` table
      let auditUserId = null;
      let auditUserName = 'SYSTEM';
      try {
        if (req.user && req.user.id) {
          const foundUser = await User.findByPk(req.user.id);
          if (foundUser) auditUserId = req.user.id;
          auditUserName = req.user.name || (foundUser ? foundUser.name : auditUserName);
        }
      } catch (e) {
        console.warn('[AUDIT USER LOOKUP FAILED]', e.message || e);
      }

      // Attempt to send via SMTP if configured. Capture any SMTP error for diagnostics
      let smtpError = null;
      if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
        try {
          const nodemailer = (await import('nodemailer')).default;
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
          });

          const mailOptions = {
            from: process.env.SMTP_FROM || 'no-reply@kernel-saas.local',
            to,
            subject: subject || 'Notification Kernel SaaS',
            text: bodyText || '',
            html: bodyText ? (String(bodyText).replace(/\n/g, '<br/>')) : undefined
          };

          const info = await transporter.sendMail(mailOptions);
          try {
            await AuditLog.create({
              tenantId: tenant ? tenant.id : null,
              userId: auditUserId,
              userName: auditUserName,
              action: 'EMAIL_SENT',
              resource: `To:${to} Subject:${mailOptions.subject}`,
              severity: 'LOW',
              sha256Signature: crypto.createHash('sha256').update(`EMAIL_SENT:${to}:${Date.now()}`).digest('hex')
            });
          } catch (auditErr) {
            console.error('[AUDIT CREATE FAILED AFTER SMTP SEND]', auditErr);
            // return success to client but include audit warning
            return res.status(200).json({ message: 'Email envoyé (audit log failed)', info, auditError: String(auditErr?.message || auditErr) });
          }

          return res.status(200).json({ message: 'Email envoyé', info });
        } catch (err) {
          console.error('[SMTP SEND ERROR]', err);
          smtpError = String(err?.message || err);
          // fallthrough to queued fallback
        }
      }

      // Fallback: queue/log the message in AuditLog when SMTP not configured or send failed
      try {
        await AuditLog.create({
          tenantId: tenant ? tenant.id : null,
          userId: auditUserId,
          userName: auditUserName,
          action: 'EMAIL_QUEUED',
          resource: `To:${to} Subject:${subject || 'no-subject'} Body:${String(bodyText || '').slice(0,240)}`,
          severity: 'LOW',
          sha256Signature: crypto.createHash('sha256').update(`EMAIL_QUEUE:${to}:${Date.now()}`).digest('hex')
        });
      } catch (auditErr) {
        console.error('[AUDIT CREATE FAILED FOR QUEUED EMAIL]', auditErr);
        // don't fail the request entirely; return a helpful 200 with diagnostic info
        return res.status(200).json({ message: 'SMTP non configuré ou envoi échoué, tentative de mise en file échouée (audit log)', queuedTo: to, smtpError, auditError: String(auditErr?.message || auditErr) });
      }

      return res.status(200).json({ message: 'SMTP non configuré ou envoi échoué, message mis en file (audit log)', queuedTo: to, smtpError });
    } catch (error) {
      console.error('[SEND EMAIL ERROR]', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Validation manuelle d'une souscription par le SuperAdmin / Admin
   */
  static async validateSubscription(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params; // tenant id
      const tenant = await Tenant.findByPk(id, { transaction });
      if (!tenant) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Instance non trouvée' });
      }

      // Determine the plan to activate: pendingPlanId (upgrade) or current plan
      const PERIOD_MONTHS = { '1M': 1, '3M': 3, '1Y': 12 };
      const pendingPlan = tenant.pendingPlanId || null;
      const pendingPeriod = tenant.pendingPeriod || '1M';
      const months = PERIOD_MONTHS[pendingPeriod] || 1;
      const activatePlanId = pendingPlan || tenant.plan || 'FREE_TRIAL';

      // Find or create subscription record
      let sub = await Subscription.findOne({ where: { tenantId: id }, transaction });
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + months);

      if (sub) {
        await sub.update({ status: 'ACTIVE', planId: activatePlanId, nextBillingDate: nextBilling }, { transaction });
      } else {
        sub = await Subscription.create({ tenantId: id, planId: activatePlanId, status: 'ACTIVE', nextBillingDate: nextBilling, autoRenew: true }, { transaction });
      }

      // Reactivate tenant, activate new plan, clear pending fields
      await tenant.update({
        isActive: true,
        paymentStatus: 'UP_TO_DATE',
        lastPaymentDate: new Date(),
        plan: activatePlanId,
        ...(pendingPlan ? { pendingPlanId: null, pendingPeriod: null } : {})
      }, { transaction });

      // Create a Payment record for this subscription validation only if none exists yet.
      try {
        const { amount: bodyAmount, method: bodyMethod, reference: bodyReference, transactionId } = req.body || {};
        let amountToRecord = null;
        if (bodyAmount && !isNaN(Number(bodyAmount))) amountToRecord = Number(bodyAmount);

        if (amountToRecord === null) {
          const planIdToUse = sub.planId || tenant.plan || 'FREE_TRIAL';
          const plan = await Plan.findByPk(planIdToUse, { transaction });
          amountToRecord = Number(plan?.priceMonthly || tenant.lastPaymentAmount || tenant.subscription?.planDetails?.priceMonthly || 0) || 0;
        }

        const methodToUse = bodyMethod || 'WAVE';
        const referenceToUse = bodyReference || transactionId || `VALID-${Date.now()}`;

        // Check for existing payment to avoid duplicate entries.
        let existing = null;
        if (referenceToUse) {
          existing = await Payment.findOne({ where: { tenantId: id, reference: referenceToUse, saleId: null }, transaction });
        }

        // If no exact reference match, try matching recent payment by amount within a time window (15 minutes)
        if (!existing) {
          const lookbackMs = 1000 * 60 * 15; // 15 minutes
          const since = new Date(Date.now() - lookbackMs);
          existing = await Payment.findOne({ where: { tenantId: id, amount: amountToRecord, saleId: null, paymentDate: { [Op.gte]: since } }, transaction });
        }

        if (existing) {
          console.log(`[PAYMENT SKIP] Found existing payment ${existing.id} for tenant ${id} (ref=${existing.reference})`);
        } else {
          await Payment.create({
            tenantId: id,
            saleId: null,
            amount: amountToRecord,
            method: methodToUse,
            reference: referenceToUse,
            paymentDate: new Date()
          }, { transaction });
        }
      } catch (e) {
        console.warn('[PAYMENT RECORD FAILED]', e.message || e);
        // don't fail the whole flow for payment logging issues
      }

      // Audit log - verify user exists to avoid FK violation
      let auditUserId = null;
      let auditUserName = 'SYSTEM';
      try {
        if (req.user && req.user.id) {
          const found = await User.findByPk(req.user.id, { transaction });
          if (found) auditUserId = req.user.id;
          auditUserName = req.user.name || (found ? found.name : auditUserName);
        }
      } catch (e) {
        console.warn('[AUDIT USER LOOKUP FAILED]', e.message || e);
      }

      await AuditLog.create({
        tenantId: id,
        userId: auditUserId,
        userName: auditUserName,
        action: 'SUBSCRIPTION_VALIDATED',
        resource: `Tenant: ${tenant.name} (${tenant.domain})`,
        severity: 'HIGH',
        sha256Signature: crypto.createHash('sha256').update(`VALIDATE_SUB:${id}:${Date.now()}`).digest('hex')
      }, { transaction });

      await transaction.commit();

      return res.status(200).json({ message: 'Abonnement validé.', tenant: { id: tenant.id, isActive: true } });
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('[VALIDATE SUBSCRIPTION ERROR]:', error);
      return res.status(500).json({ error: 'ValidationError', message: 'Une erreur inattendue est survenue sur le serveur.' });
    }
  }

  /**
   * Reject a pending subscription/upgrade request
   */
  static async rejectSubscription(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params; // tenant id
      const tenant = await Tenant.findByPk(id, { transaction });
      if (!tenant) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Instance non trouvée' });
      }

      // Mark subscription as rejected
      const sub = await Subscription.findOne({ where: { tenantId: id }, transaction });
      if (sub) {
        await sub.update({ status: 'REJECTED' }, { transaction });
      }

      await tenant.update({ paymentStatus: 'REJECTED' }, { transaction });

      // Audit
      await AuditLog.create({
        tenantId: id,
        userId: req.user?.id || null,
        userName: req.user?.name || 'SYSTEM',
        action: 'SUBSCRIPTION_UPGRADE_REJECTED',
        resource: `Tenant: ${tenant.name} (${tenant.domain})`,
        severity: 'MEDIUM',
        sha256Signature: crypto.createHash('sha256').update(`REJECT_SUB:${id}:${Date.now()}`).digest('hex')
      }, { transaction });

      await transaction.commit();
      return res.status(200).json({ message: 'Demande d\'upgrade rejetée.' });
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('[REJECT SUBSCRIPTION ERROR]:', error);
      return res.status(500).json({ error: 'RejectError', message: error.message });
    }
  }
}


import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.js';
import { tenantIsolation } from '../middlewares/tenant.js';
import { checkPermission } from '../middlewares/rbac.js';

import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import stockRoutes from './stock.routes.js';
import salesRoutes from './sales.routes.js';
import customerRoutes from './customers.routes.js';
import billingRoutes from './billing.routes.js';
import aiRoutes from './ai.routes.js';
import { AIController } from '../controllers/AIController.js';
import financeRoutes from './finance.routes.js';
import documentRoutes from './document.routes.js';
import resilienceRoutes from './resilience.routes.js';
import categoriesRoutes from './categories.routes.js';
import subcategoriesRoutes from './subcategories.routes.js';
import recoveryRoutes from './recovery.routes.js';
import servicesRoutes from './services.routes.js';
import { TenantController } from '../controllers/TenantController.js';
import { SubscriptionController } from '../controllers/SubscriptionController.js';
import { PaymentController } from '../controllers/PaymentController.js';
import { AnnouncementController } from '../controllers/AnnouncementController.js';
import hrRoutes from './hr.routes.js';
import contactRoutes, { adminRouter as contactAdminRoutes } from './contact.routes.js';
import supportRoutes from './support.routes.js';

const router = Router();

// --- ROUTES PUBLIQUES ---
router.post('/payments/callback', PaymentController.handleWebhook); // Route callback globale
router.use('/auth', authRoutes);
router.get('/plans', SubscriptionController.listPlans); 
// Expose bridge as public to allow server-side forwarding from clients without requiring JWT
router.post('/ai/bridge', AIController.bridgeWebhook);
// Route publique pour l'envoi de messages de contact depuis la landing page
router.use('/contact', contactRoutes);

// --- PROTECTION JWT ---
router.use(authenticateJWT);

// Annonces/Notifications (visibles par tous les utilisateurs connectés)
router.get('/announcements', AnnouncementController.list);

router.use('/admin', adminRoutes);
router.use('/stock', tenantIsolation, stockRoutes);
router.use('/categories', tenantIsolation, categoriesRoutes);
router.use('/subcategories', tenantIsolation, subcategoriesRoutes);
router.use('/sales', tenantIsolation, salesRoutes);
router.use('/customers', tenantIsolation, customerRoutes);
router.use('/billing', tenantIsolation, billingRoutes);
router.use('/ai', tenantIsolation, aiRoutes);
router.use('/finance', tenantIsolation, financeRoutes);
router.use('/documents', tenantIsolation, documentRoutes);
router.use('/resilience', tenantIsolation, resilienceRoutes);
router.use('/recovery', tenantIsolation, recoveryRoutes);
router.use('/services', tenantIsolation, servicesRoutes);
router.use('/hr', tenantIsolation, hrRoutes);

// Support tickets (tenant-scoped)
router.use('/support', tenantIsolation, supportRoutes);

// Subscription upgrade (tenant ADMIN → PENDING, validated by SuperAdmin)
router.post('/subscription/upgrade', tenantIsolation, checkPermission(['ADMIN']), SubscriptionController.upgradePlan);
router.get('/subscription', tenantIsolation, checkPermission(['ADMIN']), SubscriptionController.getMySubscription);
router.post('/subscription/payment', tenantIsolation, checkPermission(['ADMIN']), SubscriptionController.recordPayment);

// Routes admin pour la gestion des messages de contact (après JWT)
router.use('/admin/contact', contactAdminRoutes);

// Routes temporaires pour les alertes de billing (à implémenter dans admin.routes.js)
router.get('/admin/billing/overdue', checkPermission(['ADMIN']), (req, res) => {
  // TODO: Implémenter la logique pour récupérer les comptes en retard de paiement
  res.json([]);
});

router.get('/admin/billing/upcoming', checkPermission(['ADMIN']), (req, res) => {
  // TODO: Implémenter la logique pour récupérer les facturations à venir
  res.json([]);
});

router.get('/settings', tenantIsolation, checkPermission(['ADMIN', 'SALES', 'STOCK_MANAGER', 'ACCOUNTANT']), TenantController.getSettings);
router.put('/settings', tenantIsolation, checkPermission(['ADMIN']), TenantController.updateSettings);

// Route pour récupérer les informations du tenant 
router.get('/tenant/info', tenantIsolation, checkPermission(['ADMIN', 'SALES', 'STOCK_MANAGER', 'ACCOUNTANT', 'EMPLOYEE']), TenantController.getSettings);

export default router;

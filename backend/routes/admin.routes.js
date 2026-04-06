

import { Router } from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { SupportController } from '../controllers/SupportController.js';
import { AnnouncementController } from '../controllers/AnnouncementController.js';
import { checkRole } from '../middlewares/rbac.js';


const router = Router();


// Allow both tenant-level ADMIN and SUPER_ADMIN to access dashboard KPIs
router.use((req, res, next) => checkRole(['SUPER_ADMIN', 'ADMIN'])(req, res, next));


// Dashboard
router.get('/dashboard', AdminController.getGlobalDashboard);
router.get('/payments/recent', AdminController.getRecentPayments);

// Logs / Audit
router.get('/logs', AdminController.getLogs);

// Tenants
router.get('/tenants', AdminController.listTenants);
router.get('/tenants/:id/billing', AdminController.getTenantBillingDetails);
router.get('/tenants/:id/users', AdminController.listUsersForTenant);
router.put('/tenants/:tenantId/users/:userId/reset-password', AdminController.resetUserPassword);
router.post('/tenants/:id/toggle-lock', AdminController.toggleTenantLock);
router.post('/tenants/:id/subscription/validate', AdminController.validateSubscription);
router.post('/tenants/:id/subscription/reject', AdminController.rejectSubscription);

// Plans CRUD
router.get('/plans', AdminController.listPlans);
router.post('/plans', AdminController.createPlan);
router.put('/plans/:id', AdminController.updatePlan);
router.delete('/plans/:id', AdminController.deletePlan);

// Communication
router.post('/email/send', AdminController.sendEmailToOwner);

// ── Support Tickets (SuperAdmin) ──
// IMPORTANT: /support/stats MUST be before /support/:id to avoid route conflict
router.get('/support/stats', SupportController.getStats);
router.get('/support', SupportController.listAllTickets);
router.patch('/support/:id', SupportController.updateTicket);

// ── Announcements / Communication (SuperAdmin) ──
router.get('/announcements', AnnouncementController.listAll);
router.post('/announcements', AnnouncementController.create);
router.patch('/announcements/:id', AnnouncementController.update);
router.delete('/announcements/:id', AnnouncementController.remove);


export default router;
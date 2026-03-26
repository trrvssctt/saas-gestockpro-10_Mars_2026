
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticateJWT } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/rbac.js';

const router = Router();

// --- ROUTES PUBLIQUES ---
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/superadmin/login', AuthController.superAdminLogin);
router.post('/mfa/verify', AuthController.verifyMFA); // Nouveau flux MFA

// --- ROUTES PROTÉGÉES (IAM) ---
router.use(authenticateJWT);

router.get('/me', async (req, res) => {
  try {
    const user = req.user; // Données du JWT

    // Récupérer en base le tenant et l'abonnement pour avoir des données fraîches (pas celles du JWT)
    let tenantData = null;
    let subscriptionData = null;
    try {
      const { Tenant, Subscription } = await import('../models/index.js');
      const tenant = await Tenant.findByPk(user.tenantId, {
        attributes: ['id', 'isActive', 'paymentStatus', 'plan', 'primaryColor', 'buttonColor', 'fontFamily', 'baseFontSize', 'theme']
      });
      if (tenant) {
        tenantData = {
          isActive: tenant.isActive,
          paymentStatus: tenant.paymentStatus,
          plan: tenant.plan,
          primaryColor: tenant.primaryColor,
          buttonColor: tenant.buttonColor,
          fontFamily: tenant.fontFamily,
          baseFontSize: tenant.baseFontSize,
          theme: tenant.theme
        };
      }
      const sub = await Subscription.findOne({ where: { tenantId: user.tenantId } });
      if (sub) {
        subscriptionData = {
          planId: sub.planId,
          status: sub.status,
          nextBillingDate: sub.nextBillingDate
        };
      }
    } catch (dbErr) {
      console.warn('[/auth/me] Could not fetch tenant/subscription:', dbErr && dbErr.message);
    }

    // Si l'utilisateur a un employeeId, récupérer ses données Employee
    if (user.employeeId) {
      const { Employee } = await import('../models/index.js');
      const employee = await Employee.findOne({
        where: {
          id: user.employeeId,
          tenantId: user.tenantId
        },
        attributes: ['id', 'firstName', 'lastName', 'email', 'position', 'departmentId', 'status']
      });

      if (employee) {
        return res.json({
          ...user,
          tenant: tenantData,
          subscription: subscriptionData,
          email: employee.email,
          employee: employee.toJSON()
        });
      }
    }

    // Sinon, vérifier si c'est un employé par rôle et chercher Employee par email/nom
    const roles = Array.isArray(user.roles) ? user.roles : [user.role];
    const isEmployeeRole = roles.some(role =>
      ['EMPLOYEE', 'STOCK_MANAGER', 'SALES', 'ACCOUNTANT'].includes(role)
    );

    if (isEmployeeRole) {
      const { Employee, User } = await import('../models/index.js');

      const fullUser = await User.findByPk(user.id, {
        attributes: ['id', 'email', 'name', 'employeeId']
      });

      if (fullUser && fullUser.email) {
        const employee = await Employee.findOne({
          where: {
            email: fullUser.email,
            tenantId: user.tenantId
          },
          attributes: ['id', 'firstName', 'lastName', 'email', 'position', 'departmentId', 'status']
        });

        if (employee) {
          if (!fullUser.employeeId) {
            await fullUser.update({ employeeId: employee.id });
            console.log(`✅ Auto-linked user ${fullUser.id} to employee ${employee.id}`);
          }

          return res.json({
            ...user,
            tenant: tenantData,
            subscription: subscriptionData,
            email: fullUser.email,
            employeeId: employee.id,
            employee: employee.toJSON()
          });
        }
      }
    }

    // Par défaut, retourner user enrichi avec tenant + subscription frais
    res.json({ ...user, tenant: tenantData, subscription: subscriptionData });
  } catch (error) {
    console.error('Error in /auth/me:', error);
    res.json(req.user); // Fallback
  }
});

// Gestion utilisateurs
router.get('/users', checkRole(['ADMIN']), AuthController.listUsers);
router.get('/available-employees', checkRole(['ADMIN']), AuthController.getAvailableEmployees);
router.post('/users', checkRole(['ADMIN']), AuthController.createUser);
router.put('/users/:id', checkRole(['ADMIN']), AuthController.updateUser);
router.delete('/users/:id', checkRole(['ADMIN']), AuthController.deleteUser);

// Nouvelles actions de sécurité
router.post('/users/:id/reset-password', checkRole(['ADMIN']), AuthController.resetUserPassword);
router.post('/users/:id/toggle-mfa', checkRole(['ADMIN']), AuthController.toggleMFA);

// Changement de mot de passe (auto)
router.post('/change-password', AuthController.changeOwnPassword);

// --- ROUTES DE GESTION DE SESSION ---
router.post('/logout', AuthController.logout);
router.post('/logout-all', AuthController.logoutAll);
router.get('/sessions', AuthController.getActiveSessions);
router.post('/validate-session', AuthController.validateSession);

export default router;

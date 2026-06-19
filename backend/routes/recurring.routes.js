
import { Router } from 'express';
import { RecurringContractController } from '../controllers/RecurringContractController.js';
import { checkPermission } from '../middlewares/rbac.js';

const router = Router();

router.get('/',    checkPermission(['ADMIN', 'SALES', 'ACCOUNTANT']), RecurringContractController.list);
router.post('/',   checkPermission(['ADMIN', 'SALES', 'ACCOUNTANT']), RecurringContractController.create);

// Routes statiques AVANT /:id pour éviter les conflits
router.post('/installments/:installmentId/pay', checkPermission(['ADMIN', 'SALES', 'ACCOUNTANT']), RecurringContractController.payInstallment);
router.post('/mark-overdue',    checkPermission(['ADMIN', 'ACCOUNTANT']), RecurringContractController.markOverdue);
router.post('/generate-sales',  checkPermission(['ADMIN', 'SALES', 'ACCOUNTANT']), RecurringContractController.generateUpcomingSales);

// Routes par ID
router.get('/:id',          checkPermission(['ADMIN', 'SALES', 'ACCOUNTANT']), RecurringContractController.getOne);
router.put('/:id',          checkPermission(['ADMIN']), RecurringContractController.updateContract);
router.delete('/:id',       checkPermission(['ADMIN']), RecurringContractController.deleteContract);
router.post('/:id/pause',   checkPermission(['ADMIN']), RecurringContractController.pause);
router.post('/:id/resume',  checkPermission(['ADMIN', 'SALES', 'ACCOUNTANT']), RecurringContractController.resume);
router.post('/:id/cancel',  checkPermission(['ADMIN']), RecurringContractController.cancel);

export default router;

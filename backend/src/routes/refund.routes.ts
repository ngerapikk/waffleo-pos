import { Router } from 'express';
import { RefundController } from '../controllers/refund.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Only Supervisor and Admin can process and view refunds
router.post('/', requireAuth, requireRole(['SUPERVISOR', 'ADMIN']), RefundController.processRefund);
router.get('/', requireAuth, requireRole(['SUPERVISOR', 'ADMIN']), RefundController.getRefunds);

export default router;

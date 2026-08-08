import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Only ADMIN and SUPERVISOR can access audit logs
router.get('/', requireAuth, requireRole(['ADMIN', 'SUPERVISOR']), AuditController.getAuditLogs);

export default router;

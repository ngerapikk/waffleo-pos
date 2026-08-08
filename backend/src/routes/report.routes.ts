import { Router } from 'express';
import { getSalesReport, getShiftReconciliation, getCommissions, getDashboardSummary, getSalesTrend } from '../controllers/report.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Dashboard is accessible to all authenticated users (including Kasir)
router.use(requireAuth);
router.get('/dashboard', getDashboardSummary);

// All other report endpoints: Supervisor/Admin only
router.use(requireRole(['SUPERVISOR', 'ADMIN']));

router.get('/sales', getSalesReport);
router.get('/shift', getShiftReconciliation);
router.get('/commissions', getCommissions);
router.get('/sales-trend', getSalesTrend);

export default router;

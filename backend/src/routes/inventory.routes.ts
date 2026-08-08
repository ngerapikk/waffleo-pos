import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Everyone can view inventory (Kasir = read-only)
router.get('/', requireAuth, InventoryController.getInventory);

// Only SUPERVISOR and ADMIN can adjust/convert/produce stock
router.patch('/:id/adjust', requireAuth, requireRole(['SUPERVISOR', 'ADMIN']), InventoryController.adjustStock);
router.post('/conversions', requireAuth, requireRole(['SUPERVISOR', 'ADMIN']), InventoryController.convertStock);
router.post('/produce', requireAuth, requireRole(['SUPERVISOR', 'ADMIN']), InventoryController.produceStock);

// Shift usage (Kasir can do this)
router.post('/close-shift-usage', requireAuth, InventoryController.closeShiftUsage);

export default router;

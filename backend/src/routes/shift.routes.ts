import { Router } from 'express';
import { ShiftController } from '../controllers/shift.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/current', ShiftController.getCurrentShift);
router.post('/open', ShiftController.openShift);
router.post('/close', ShiftController.closeShift);

export default router;

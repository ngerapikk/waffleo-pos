import { Router } from 'express';
import { getPromos, createPromo, updatePromo, deletePromo, validateVoucher } from '../controllers/promo.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

// Kasir needs to be able to get promos for cart calculation, and validate vouchers
router.get('/', getPromos);
router.get('/validate', validateVoucher);

// Only Supervisor and Admin can manage promos
router.post('/', requireRole(['SUPERVISOR', 'ADMIN']), createPromo);
router.put('/:id', requireRole(['SUPERVISOR', 'ADMIN']), updatePromo);
router.delete('/:id', requireRole(['SUPERVISOR', 'ADMIN']), deletePromo);

export default router;

import { Router } from 'express';
import { 
  createOrder, 
  getLiveOrders, 
  getHistoryOrders,
  prepareOrder, 
  processPayment, 
  refundOrder,
  completeOrder, 
  cancelOrder,
  updateOrder 
} from '../controllers/order.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Protect all order routes
router.use(requireAuth);

router.get('/', getLiveOrders);
router.get('/history', getHistoryOrders);
router.post('/', createOrder);
router.put('/:id', updateOrder);
router.post('/:id/prepare', prepareOrder);
router.post('/:id/payments', processPayment);
router.post('/:id/refund', refundOrder);
router.post('/:id/done', completeOrder);
router.post('/:id/cancel', cancelOrder);

export default router;

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class RefundController {
  static async getRefunds(req: Request, res: Response) {
    try {
      const refunds = await prisma.refund.findMany({
        include: {
          order: {
            select: {
              orderNumber: true,
              customerData: true
            }
          },
          approvedBy: {
            select: {
              fullName: true,
              role: true
            }
          }
        },
        orderBy: {
          approvedAt: 'desc'
        }
      });
      return res.status(200).json(refunds);
    } catch (error) {
      console.error('Failed to fetch refunds:', error);
      return res.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch refunds' });
    }
  }

  static async processRefund(req: Request, res: Response) {
    try {
      const { orderId, reason } = req.body;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }

      if (!orderId || !reason) {
        return res.status(400).json({ code: 'BAD_REQUEST', message: 'orderId and reason are required' });
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          payments: true
        }
      });

      if (!order) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' });
      }

      if (order.status !== 'DONE') {
        return res.status(400).json({ code: 'BAD_REQUEST', message: 'Only DONE orders can be refunded' });
      }

      if (order.refunded) {
        return res.status(400).json({ code: 'BAD_REQUEST', message: 'Order is already refunded' });
      }

      // Calculate total actual paid amount
      const payment = order.payments[0]; // Assuming one payment per order
      let refundAmount = 0;
      
      if (payment) {
        refundAmount = Number(payment.totalTendered) - Number(payment.changeGiven);
      } else {
        // Fallback to sum of items
        refundAmount = order.items.reduce((sum, item) => sum + Number(item.lineTotal), 0) - Number(order.discountAmount || 0);
      }

      // Use a transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Refund record
        const refund = await tx.refund.create({
          data: {
            orderId: order.id,
            amount: refundAmount,
            reason,
            approvedById: user.id
          }
        });

        // 2. Update Order
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: { refunded: true }
        });

        // 3. Create AuditLog
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'ORDER_REFUND',
            entityType: 'order',
            entityId: order.id,
            beforeValue: { refunded: false },
            afterValue: { refunded: true, refundId: refund.id, reason, amount: refundAmount }
          }
        });

        return { refund, updatedOrder };
      });

      return res.status(200).json({
        code: 'SUCCESS',
        message: 'Refund processed successfully',
        data: result
      });

    } catch (error) {
      console.error('Process refund error:', error);
      return res.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to process refund' });
    }
  }
}

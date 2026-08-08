import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { ProductType } from '@prisma/client';
import { broadcastOrderUpdate } from '../lib/ws';
import { calculateDiscount, validatePromoEligibility } from '../services/promo.service';
import { Prisma } from '@prisma/client';

const toJson = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v ?? null));

const orderItemSchema = z.object({
  id: z.string().optional().nullable(),
  productType: z.enum(['TOPPING', 'DRINK']),
  toppingId: z.string().optional().nullable(),
  halfPartnerToppingId: z.string().optional().nullable(),
  flavourId: z.string().optional().nullable(),
  addonIds: z.array(z.string()).optional().nullable(),
  drinkId: z.string().optional().nullable(),
  sweetnessLevelId: z.string().optional().nullable(),
  icedLevelId: z.string().optional().nullable(),
  qty: z.number().int().min(1),
  prepared: z.boolean().optional().nullable(),
});

const createOrderSchema = z.object({
  channelId: z.string(),
  customerData: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  discountId: z.string().optional().nullable(),
});

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { outletId, id: userId } = req.user!;
    
    const validatedData = createOrderSchema.parse(req.body);

    // 1. Get Outlet and Channel
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (!outlet) {
      res.status(404).json({ message: 'Outlet not found' });
      return;
    }

    const channel = await prisma.channel.findUnique({ where: { id: validatedData.channelId } });
    if (!channel) {
      res.status(404).json({ message: 'Channel not found' });
      return;
    }

    // 2. Format Customer Data with Prefix
    let finalCustomerData = validatedData.customerData || '';
    if (channel.customerPrefix && !finalCustomerData.startsWith(channel.customerPrefix)) {
      finalCustomerData = channel.customerPrefix + finalCustomerData;
    }

    // 3. Process Items & Calculate Price
    const orderItems: any[] = [];
    for (const item of validatedData.items) {
      let unitPrice = 0;

      if (item.productType === 'TOPPING' && item.toppingId) {
        const topping = await prisma.toppingUtama.findUnique({ where: { id: item.toppingId } });
        if (!topping) throw new Error(`Topping not found: ${item.toppingId}`);

        let primaryPrice = 0;
        if (channel.priceTier === 'Direct') primaryPrice = Number(topping.priceDirect);
        else if (channel.priceTier === 'GrabGo') primaryPrice = Number(topping.priceGrabGo);
        else if (channel.priceTier === 'Shopee') primaryPrice = Number(topping.priceShopee);
        
        // Handle Half Portion
        if (item.halfPartnerToppingId) {
            const partnerTopping = await prisma.toppingUtama.findUnique({ where: { id: item.halfPartnerToppingId } });
            if (!partnerTopping) throw new Error(`Partner Topping not found: ${item.halfPartnerToppingId}`);
            
            let partnerPrice = 0;
            if (channel.priceTier === 'Direct') partnerPrice = Number(partnerTopping.priceDirect);
            else if (channel.priceTier === 'GrabGo') partnerPrice = Number(partnerTopping.priceGrabGo);
            else if (channel.priceTier === 'Shopee') partnerPrice = Number(partnerTopping.priceShopee);
            
            unitPrice += (primaryPrice / 2) + (partnerPrice / 2);
        } else {
            unitPrice += primaryPrice;
        }
        
        // Add flavour price if any
        if (item.flavourId) {
            const flavour = await prisma.flavour.findUnique({ where: { id: item.flavourId }});
            if (flavour) {
                if (channel.priceTier === 'Direct') unitPrice += Number(flavour.extraPriceDirect);
                else unitPrice += Number(flavour.extraPriceOnline); // Online covers both GrabGo and Shopee
            }
        }

        // Add addons price if any
        if (item.addonIds && item.addonIds.length > 0) {
            const addons = await prisma.addon.findMany({ where: { id: { in: item.addonIds } } });
            for (const addon of addons) {
                if (channel.priceTier === 'Direct') unitPrice += Number(addon.extraPriceDirect);
                else unitPrice += Number(addon.extraPriceOnline);
            }
        }
      } else if (item.productType === 'DRINK' && item.drinkId) {
        const drink = await prisma.drink.findUnique({ where: { id: item.drinkId } });
        if (!drink) throw new Error(`Drink not found: ${item.drinkId}`);

        if (channel.priceTier === 'Direct') unitPrice += Number(drink.priceDirect);
        else if (channel.priceTier === 'GrabGo') unitPrice += Number(drink.priceGrabGo);
        else if (channel.priceTier === 'Shopee') unitPrice += Number(drink.priceShopee);
      }

      orderItems.push({
        productType: item.productType as ProductType,
        toppingId: item.toppingId,
        halfPartnerToppingId: item.halfPartnerToppingId,
        flavourId: item.flavourId,
        drinkId: item.drinkId,
        sweetnessLevelId: item.sweetnessLevelId,
        icedLevelId: item.icedLevelId,
        qty: item.qty,
        unitPrice,
        lineTotal: unitPrice * item.qty,
        addons: item.addonIds && item.addonIds.length > 0 ? {
            create: item.addonIds.map((id: string) => ({ addonId: id }))
        } : undefined
      });
    }

    // 4. Generate Order Number
    // Format: BR[BranchCode][YYMMDD][Counter]
    const today = new Date();
    const yy = today.getFullYear().toString().slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    
    // Set to start of day in server timezone
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const countToday = await prisma.order.count({
      where: {
        outletId,
        createdAt: { gte: startOfDay }
      }
    });
    
    const counterStr = String(countToday + 1).padStart(3, '0');
    const orderNumber = `BR${outlet.branchCode}${yy}${mm}${dd}${counterStr}`;

    // Calculate subtotal
    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    
    // Evaluate promo if any
    let discountAmount = 0;
    if (validatedData.discountId) {
      const promo = await prisma.discount.findUnique({ where: { id: validatedData.discountId } });
      if (promo) {
        const check = validatePromoEligibility(promo, channel.id, subtotal);
        if (check.valid) {
          discountAmount = await calculateDiscount(promo, subtotal, orderItems);
        } else {
          res.status(400).json({ message: `Promo tidak dapat digunakan: ${check.reason}` });
          return;
        }
      }
    }

    // 5. Save to DB in transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          outletId,
          channelId: channel.id,
          customerData: finalCustomerData,
          notes: validatedData.notes,
          discountId: validatedData.discountId || null,
          discountAmount: discountAmount > 0 ? discountAmount : null,
          createdById: userId,
          paymentStatus: channel.isPlatform ? 'PAID' : 'UNPAID',
          items: {
            create: orderItems,
          }
        },
        include: {
          items: true,
          channel: true,
        }
      });

      if (channel.isPlatform) {
        const amount = subtotal - discountAmount;
        await tx.payment.create({
          data: {
            orderId: order.id,
            method: 'TRANSFER',
            cashAmount: 0,
            qrisAmount: 0,
            transferAmount: amount,
            totalTendered: amount,
            changeGiven: 0,
            paidById: userId
          }
        });
      }

      return order;
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: newOrder
    });
    
    // Broadcast update via WebSocket
    broadcastOrderUpdate();
  } catch (error: any) {
    console.error('Create order error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: (error as any).errors });
    } else {
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }
};

const updateOrderSchema = z.object({
  channelId: z.string(),
  customerData: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  discountId: z.string().optional().nullable(),
});

// Helper: build a human-readable snapshot array from order items with relations
function buildItemSnapshot(items: any[]): any[] {
  return items.map(item => {
    const snapshot: any = {
      productType: item.productType,
      qty: item.qty,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
      prepared: item.prepared || false,
    };
    if (item.topping) snapshot.name = item.topping.name;
    if (item.halfPartner) snapshot.halfPartner = item.halfPartner.name;
    if (item.drink) snapshot.name = item.drink.name;
    if (item.flavour) snapshot.flavour = item.flavour.name;
    if (item.sweetnessLevel) snapshot.sweetness = item.sweetnessLevel.name;
    if (item.icedLevel) snapshot.iced = item.icedLevel.name;
    if (item.addons && item.addons.length > 0) {
      snapshot.addons = item.addons.map((a: any) => a.addon?.name || a.addonId);
    }
    return snapshot;
  });
}

export const updateOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId, outletId } = req.user!;
    const orderId = req.params.id as string;

    const validatedData = updateOrderSchema.parse(req.body);

    // 1. Get existing order with full relations
    const existingOrder = await prisma.order.findFirst({
      where: { id: orderId, outletId },
      include: {
        channel: true,
        items: {
          include: {
            topping: true,
            halfPartner: true,
            flavour: true,
            drink: true,
            sweetnessLevel: true,
            icedLevel: true,
            addons: { include: { addon: true } }
          }
        },
        payments: true,
        editLogs: true
      }
    });

    if (!existingOrder) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (existingOrder.status !== 'OPEN') {
      res.status(409).json({ message: 'Hanya pesanan OPEN yang bisa diedit' });
      return;
    }

    // 2. Build "before" snapshot
    const itemsBefore = buildItemSnapshot(existingOrder.items);
    const totalBefore = existingOrder.items.reduce((sum, item) => sum + Number(item.lineTotal), 0) - Number(existingOrder.discountAmount || 0);
    const channelBefore = existingOrder.channel.name;
    const customerBefore = existingOrder.customerData || '';
    const notesBefore = existingOrder.notes || '';
    const paymentStatusBefore = existingOrder.paymentStatus;

    // 3. Get new channel
    const newChannel = await prisma.channel.findUnique({ where: { id: validatedData.channelId } });
    if (!newChannel) {
      res.status(404).json({ message: 'Channel not found' });
      return;
    }

    // 4. Format customer data
    let finalCustomerData = validatedData.customerData || '';
    if (newChannel.customerPrefix && !finalCustomerData.startsWith(newChannel.customerPrefix)) {
      finalCustomerData = newChannel.customerPrefix + finalCustomerData;
    }

    // 5. Process new items & calculate prices
    const newOrderItems: any[] = [];
    let hasUnpreparedItems = false;

    for (const item of validatedData.items) {
      let unitPrice = 0;

      if (item.productType === 'TOPPING' && item.toppingId) {
        const topping = await prisma.toppingUtama.findUnique({ where: { id: item.toppingId } });
        if (!topping) throw new Error(`Topping not found: ${item.toppingId}`);

        let primaryPrice = 0;
        if (newChannel.priceTier === 'Direct') primaryPrice = Number(topping.priceDirect);
        else if (newChannel.priceTier === 'GrabGo') primaryPrice = Number(topping.priceGrabGo);
        else if (newChannel.priceTier === 'Shopee') primaryPrice = Number(topping.priceShopee);

        if (item.halfPartnerToppingId) {
          const partnerTopping = await prisma.toppingUtama.findUnique({ where: { id: item.halfPartnerToppingId } });
          if (!partnerTopping) throw new Error(`Partner Topping not found: ${item.halfPartnerToppingId}`);
          let partnerPrice = 0;
          if (newChannel.priceTier === 'Direct') partnerPrice = Number(partnerTopping.priceDirect);
          else if (newChannel.priceTier === 'GrabGo') partnerPrice = Number(partnerTopping.priceGrabGo);
          else if (newChannel.priceTier === 'Shopee') partnerPrice = Number(partnerTopping.priceShopee);
          unitPrice += (primaryPrice / 2) + (partnerPrice / 2);
        } else {
          unitPrice += primaryPrice;
        }

        if (item.flavourId) {
          const flavour = await prisma.flavour.findUnique({ where: { id: item.flavourId } });
          if (flavour) {
            if (newChannel.priceTier === 'Direct') unitPrice += Number(flavour.extraPriceDirect);
            else unitPrice += Number(flavour.extraPriceOnline);
          }
        }

        if (item.addonIds && item.addonIds.length > 0) {
          const addons = await prisma.addon.findMany({ where: { id: { in: item.addonIds } } });
          for (const addon of addons) {
            if (newChannel.priceTier === 'Direct') unitPrice += Number(addon.extraPriceDirect);
            else unitPrice += Number(addon.extraPriceOnline);
          }
        }
      } else if (item.productType === 'DRINK' && item.drinkId) {
        const drink = await prisma.drink.findUnique({ where: { id: item.drinkId } });
        if (!drink) throw new Error(`Drink not found: ${item.drinkId}`);
        if (newChannel.priceTier === 'Direct') unitPrice += Number(drink.priceDirect);
        else if (newChannel.priceTier === 'GrabGo') unitPrice += Number(drink.priceGrabGo);
        else if (newChannel.priceTier === 'Shopee') unitPrice += Number(drink.priceShopee);
      }

      let isPrepared = false;
      if (item.id) {
        const existingItem = existingOrder.items.find(i => i.id === item.id);
        if (existingItem && existingItem.qty === item.qty && (existingOrder.prepared || existingItem.prepared)) {
          isPrepared = true;
        }
      }

      if (!isPrepared) {
        hasUnpreparedItems = true;
      }

      newOrderItems.push({
        id: item.id,
        productType: item.productType as ProductType,
        toppingId: item.toppingId,
        halfPartnerToppingId: item.halfPartnerToppingId,
        flavourId: item.flavourId,
        drinkId: item.drinkId,
        sweetnessLevelId: item.sweetnessLevelId,
        icedLevelId: item.icedLevelId,
        qty: item.qty,
        unitPrice,
        lineTotal: unitPrice * item.qty,
        prepared: isPrepared,
        addons: item.addonIds && item.addonIds.length > 0 ? {
          create: item.addonIds.map((id: string) => ({ addonId: id }))
        } : undefined
      });
    }

    let finalOrderPrepared = existingOrder.prepared;
    if (existingOrder.prepared && hasUnpreparedItems) {
      finalOrderPrepared = false;
    }

    // 6. Execute everything in a transaction
    const editNumber = existingOrder.editLogs.length + 1;
    const paidAmount = existingOrder.payments.reduce((sum, p) => sum + Number(p.totalTendered) - Number(p.changeGiven), 0);

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.orderItem.deleteMany({ where: { orderId } });

      // Create new items with nested addons
      for (const ni of newOrderItems) {
        const { id, addons, ...rest } = ni;
        await tx.orderItem.create({
          data: {
            orderId,
            ...(id ? { id } : {}),
            ...rest,
            addons
          }
        });
      }

      // Recalculate discount
      const subtotalAfter = newOrderItems.reduce((sum, i) => sum + i.lineTotal, 0);
      let discountAmountAfter = 0;
      const newDiscountId = validatedData.discountId !== undefined ? (validatedData.discountId || null) : existingOrder.discountId;
      
      if (newDiscountId) {
        const promo = await tx.discount.findUnique({ where: { id: newDiscountId } });
        if (promo) {
          const check = validatePromoEligibility(promo, newChannel.id, subtotalAfter);
          if (check.valid) {
            discountAmountAfter = await calculateDiscount(promo, subtotalAfter, newOrderItems);
          }
        }
      }

      const totalAfter = subtotalAfter - discountAmountAfter;
      const paymentStatusAfter = totalAfter <= paidAmount ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID');

      // Update Order Header
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          channelId: newChannel.id,
          customerData: finalCustomerData,
          notes: validatedData.notes,
          discountId: newDiscountId,
          discountAmount: discountAmountAfter > 0 ? discountAmountAfter : null,
          paymentStatus: paymentStatusAfter,
          prepared: finalOrderPrepared,
        },
        include: {
          items: {
            include: {
              topping: true,
              halfPartner: true,
              flavour: true,
              drink: true,
              sweetnessLevel: true,
              icedLevel: true,
              addons: { include: { addon: true } }
            }
          },
          channel: true,
          payments: true,
        }
      });

      // Build "after" snapshot
      const itemsAfter = buildItemSnapshot(order.items);

      // Create edit log
      await tx.orderEditLog.create({
        data: {
          orderId,
          editNumber,
          editedById: userId,
          itemsBefore,
          itemsAfter,
          totalBefore,
          totalAfter,
          channelBefore,
          channelAfter: newChannel.name,
          customerBefore,
          customerAfter: finalCustomerData,
          notesBefore,
          notesAfter: validatedData.notes || '',
          paymentStatusBefore,
          paymentStatusAfter: paymentStatusAfter as string,
        }
      });

      // Create audit log for order update
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'ORDER_UPDATE',
          entityType: 'Order',
          entityId: orderId,
          beforeValue: toJson({ total: totalBefore, items: itemsBefore, paymentStatus: paymentStatusBefore }),
          afterValue: toJson({ total: totalAfter, items: itemsAfter, paymentStatus: paymentStatusAfter, editNumber })
        }
      });

      const overpaidAmount = paymentStatusBefore === 'PAID' && totalAfter < paidAmount ? paidAmount - totalAfter : 0;
      
      return {
        order,
        totalAfter,
        overpaidAmount
      };
    });

    res.json({
      message: 'Order updated successfully',
      order: updatedOrder.order,
      previousTotal: totalBefore,
      newTotal: updatedOrder.totalAfter,
      paidAmount,
      overpaidAmount: updatedOrder.overpaidAmount,
      editNumber
    });

    broadcastOrderUpdate();
  } catch (error: any) {
    console.error('Update order error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: (error as any).errors });
    } else {
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }
};

export const getLiveOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { outletId } = req.user!;
    const orders = await prisma.order.findMany({
      where: {
        outletId,
        status: 'OPEN'
      },
      include: {
        channel: true,
        items: {
          include: {
            topping: true,
            halfPartner: true,
            flavour: true,
            addons: { include: { addon: true } },
            drink: true,
            sweetnessLevel: true,
            icedLevel: true
          }
        },
        payments: true,
        discount: true
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ orders });
  } catch (error: any) {
    console.error('getLiveOrders error:', error);
    res.status(500).json({ message: 'Internal server error', error });
  }
};

export const refundOrder = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { amount } = req.body;
    const userId = req.user!.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid refund amount' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true }
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const total = (order as any).items.reduce((sum: number, item: any) => sum + Number(item.lineTotal), 0);
    const paid = (order as any).payments.reduce((sum: number, p: any) => sum + Number(p.totalTendered) - Number(p.changeGiven), 0);

    if (paid <= total) {
      return res.status(400).json({ message: 'Order is not overpaid' });
    }

    await prisma.payment.create({
      data: {
        orderId: id,
        method: 'CASH',
        cashAmount: 0,
        totalTendered: 0,
        changeGiven: amount,
        paidById: userId
      }
    });

    return res.json({ message: 'Refund successful' });
  } catch (error) {
    console.error('refundOrder error:', error);
    res.status(500).json({ message: 'Failed to process refund' });
  }
};

export const prepareOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId, outletId } = req.user!;
    const id = req.params.id as string;

    const order = await prisma.order.findFirst({ where: { id, outletId } });
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    if (order.status !== 'OPEN') {
      res.status(409).json({ message: 'Order is not OPEN' });
      return;
    }
    if (order.prepared) {
      res.status(409).json({ message: 'Order is already prepared' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const orderUpdate = await tx.order.update({
        where: { id },
        data: {
          prepared: true,
          preparedById: userId,
          preparedAt: new Date()
        }
      });

      await tx.orderItem.updateMany({
        where: { orderId: id },
        data: { prepared: true }
      });

      return orderUpdate;
    });

    res.json({ message: 'Order prepared', order: updated });
    broadcastOrderUpdate();
  } catch (error: any) {
    console.error('prepareOrder error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const processPaymentSchema = z.object({
  method: z.enum(['CASH', 'QRIS', 'CASH_QRIS', 'TRANSFER']),
  cashAmount: z.number().min(0).default(0),
});

export const processPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId, outletId } = req.user!;
    const id = req.params.id as string;

    const validatedData = processPaymentSchema.parse(req.body);

    const order = await prisma.order.findFirst({
      where: { id, outletId },
      include: { items: true, payments: true }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.status !== 'OPEN') {
      res.status(409).json({ message: 'Order is not OPEN' });
      return;
    }

    if (order.paymentStatus === 'PAID') {
      res.status(409).json({ message: 'Order is already paid' });
      return;
    }

    // Calculate total order amount and what's already been paid
    const totalOrderAmount = order.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    const paidSoFar = order.payments.reduce(
      (sum, p) => sum + Number(p.totalTendered) - Number(p.changeGiven), 0
    );
    const remainingAmount = totalOrderAmount - paidSoFar;
    
    let cashAmount = 0;
    let qrisAmount = 0;
    let transferAmount = 0;
    let changeGiven = 0;

    if (validatedData.method === 'CASH') {
      cashAmount = validatedData.cashAmount;
      if (cashAmount < remainingAmount) {
         res.status(422).json({ message: 'Cash amount is less than remaining total' });
         return;
      }
      changeGiven = cashAmount - remainingAmount;
    } else if (validatedData.method === 'QRIS') {
      qrisAmount = remainingAmount;
    } else if (validatedData.method === 'TRANSFER') {
      transferAmount = remainingAmount;
    } else if (validatedData.method === 'CASH_QRIS') {
      cashAmount = validatedData.cashAmount;
      if (cashAmount >= remainingAmount) {
         changeGiven = cashAmount - remainingAmount;
         qrisAmount = 0;
      } else {
         qrisAmount = remainingAmount - cashAmount;
      }
    }

    const totalTendered = cashAmount + qrisAmount + transferAmount;

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: validatedData.method,
          cashAmount,
          qrisAmount,
          transferAmount,
          totalTendered,
          changeGiven,
          paidById: userId
        }
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID'
        }
      });
    });

    res.json({ message: 'Payment processed successfully', changeGiven });
    broadcastOrderUpdate();
  } catch (error: any) {
    console.error('processPayment error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: (error as any).errors });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

import { StockService } from '../services/stock.service';

export const completeOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId, outletId } = req.user!;
    const id = req.params.id as string;

    const order = await prisma.order.findFirst({ where: { id, outletId } });
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.status !== 'OPEN') {
      res.status(409).json({ message: 'Order is not OPEN' });
      return;
    }

    if (order.paymentStatus !== 'PAID') {
      res.status(409).json({ message: 'Order is not PAID' });
      return;
    }

    if (!order.prepared) {
      res.status(409).json({ message: 'Order is not prepared' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark as DONE
      const doneOrder = await tx.order.update({
        where: { id },
        data: {
          status: 'DONE',
        }
      });

      // 2. Deduct stock via StockService
      await StockService.deductOrderStock(id, userId, tx);

      return doneOrder;
    });

    res.json({ message: 'Order completed and stock deducted', order: updated });
    broadcastOrderUpdate();
  } catch (error: any) {
    console.error('completeOrder error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const cancelOrderSchema = z.object({
  reason: z.string().min(1),
});

export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId, outletId } = req.user!;
    const id = req.params.id as string;

    const validatedData = cancelOrderSchema.parse(req.body);

    const order = await prisma.order.findFirst({ where: { id, outletId } });
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.status !== 'OPEN') {
      res.status(409).json({ message: 'Order cannot be cancelled because it is not OPEN' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const orderUpdate = await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelReason: validatedData.reason,
          cancelledById: userId,
          cancelledAt: new Date()
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'ORDER_CANCEL',
          entityType: 'Order',
          entityId: id,
          afterValue: toJson({ cancelReason: validatedData.reason })
        }
      });

      return orderUpdate;
    });

    res.json({ message: 'Order cancelled', order: updated });
    broadcastOrderUpdate();
  } catch (error: any) {
    console.error('cancelOrder error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: (error as any).errors });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const getHistoryOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { outletId } = req.user!;
    const { startDate, endDate, status } = req.query;

    let whereClause: any = {
      outletId,
      status: { in: ['DONE', 'CANCELLED'] }
    };

    if (status && (status === 'DONE' || status === 'CANCELLED')) {
      whereClause.status = status;
    }

    if (startDate && endDate) {
      const [sYear, sMonth, sDay] = (startDate as string).split('-').map(Number);
      const [eYear, eMonth, eDay] = (endDate as string).split('-').map(Number);

      const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
      const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);

      whereClause.createdAt = {
        gte: start,
        lte: end
      };
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        channel: true,
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: {
            topping: true,
            halfPartner: true,
            flavour: true,
            drink: true,
            sweetnessLevel: true,
            icedLevel: true,
            addons: {
              include: { addon: true }
            }
          }
        },
        payments: true,
        editLogs: {
          include: { editedBy: { select: { id: true, fullName: true } } },
          orderBy: { editNumber: 'asc' }
        },
        discount: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error: any) {
    console.error('getHistoryOrders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

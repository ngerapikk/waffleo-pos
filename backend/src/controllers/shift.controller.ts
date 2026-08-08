import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { startOfDay } from 'date-fns';
import { Prisma } from '@prisma/client';

const toJson = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v ?? null));

export class ShiftController {
  // Get current open shift for the user's outlet
  static async getCurrentShift(req: Request, res: Response) {
    try {
      const outletId = req.user!.outletId;

      const shift = await prisma.shift.findFirst({
        where: {
          outletId,
          status: 'OPEN'
        }
      });

      res.json({ shift });
    } catch (error) {
      console.error('Failed to get current shift:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Open a new shift
  static async openShift(req: Request, res: Response) {
    try {
      const { openingCash } = req.body;
      const outletId = req.user!.outletId;
      const userId = req.user!.id;

      // Check if there's already an open shift
      const existingShift = await prisma.shift.findFirst({
        where: {
          outletId,
          status: 'OPEN'
        }
      });

      if (existingShift) {
        return res.status(400).json({ error: 'A shift is already open.' });
      }

      const shift = await prisma.shift.create({
        data: {
          outletId,
          openedById: userId,
          openingCash: Number(openingCash) || 0,
          status: 'OPEN'
        }
      });

      await prisma.auditLog.create({
        data: {
          actorId: userId,
          action: 'SHIFT_OPEN',
          entityType: 'Shift',
          entityId: shift.id,
          afterValue: toJson({ openingCash: shift.openingCash })
        }
      });

      res.json({ shift });
    } catch (error) {
      console.error('Failed to open shift:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Close the current shift
  static async closeShift(req: Request, res: Response) {
    try {
      const { usedAdonanBesar, usedAdonanKecil, closingCashActual } = req.body;
      const outletId = req.user!.outletId;
      const userId = req.user!.id;

      const shift = await prisma.shift.findFirst({
        where: {
          outletId,
          status: 'OPEN'
        }
      });

      if (!shift) {
        return res.status(400).json({ error: 'No open shift found.' });
      }

      const usedBesar = Number(usedAdonanBesar) || 0;
      const usedKecil = Number(usedAdonanKecil) || 0;
      const actualCash = Number(closingCashActual) || 0;

      // Calculate expected cash
      // 1. Get total cash payments during this shift
      const payments = await prisma.payment.findMany({
        where: {
          order: {
            outletId,
            refunded: false
          },
          paidAt: {
            gte: shift.openedAt
          }
        }
      });

      const totalCashIn = payments.reduce((sum, p) => sum + Number(p.cashAmount), 0);
      const expectedCash = Number(shift.openingCash || 0) + totalCashIn;

      // Wrap inventory updates and shift closing in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // --- 1. Update Inventory (similar to closeShiftUsage) ---
        if (usedBesar > 0 || usedKecil > 0) {
          const ingredientNames = [
            'Adonan Besar', 'Adonan Kecil',
            'Telur', 'Minyak', 'Perisa Vanilla', 'Susu Evaporasi Tiga Sapi'
          ];
          
          const ingredients = await tx.ingredient.findMany({
            where: { name: { in: ingredientNames } }
          });
          
          const ingMap = new Map(ingredients.map(ing => [ing.name, ing]));

          ingredientNames.forEach(name => {
            if (!ingMap.has(name)) {
              throw new Error(`Bahan baku ${name} tidak ditemukan di database`);
            }
          });

          const usages: { [name: string]: number } = {
            'Adonan Besar': usedBesar,
            'Adonan Kecil': usedKecil,
            'Telur': (usedBesar * 6) + (usedKecil * 3),
            'Minyak': (usedBesar * 50) + (usedKecil * 25),
            'Perisa Vanilla': (usedBesar * 10) + (usedKecil * 5),
            'Susu Evaporasi Tiga Sapi': (usedBesar * 100) + (usedKecil * 50)
          };

          for (const [name, qty] of Object.entries(usages)) {
            if (qty > 0) {
              const ing = ingMap.get(name)!;
              await tx.ingredient.update({
                where: { id: ing.id },
                data: { currentStock: { decrement: qty } }
              });

              await tx.stockMovement.create({
                data: {
                  ingredientId: ing.id,
                  movementType: 'CONVERSION_OUT',
                  qty: -qty,
                  reason: `Tutup Shift: Terpakai ${usedBesar} Besar, ${usedKecil} Kecil`,
                  performedById: userId
                }
              });
            }
          }
        }

        // --- 2. Close Shift ---
        const closedShift = await tx.shift.update({
          where: { id: shift.id },
          data: {
            status: 'CLOSED',
            closedById: userId,
            closedAt: new Date(),
            closingCashExpected: expectedCash,
            closingCashActual: actualCash
          }
        });

        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'SHIFT_CLOSE',
            entityType: 'Shift',
            entityId: shift.id,
            beforeValue: toJson({ openingCash: shift.openingCash }),
            afterValue: toJson({ closingCashExpected: expectedCash, closingCashActual: actualCash })
          }
        });

        return closedShift;
      });

      res.json({ success: true, shift: result });
    } catch (error: any) {
      console.error('Failed to close shift:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
}

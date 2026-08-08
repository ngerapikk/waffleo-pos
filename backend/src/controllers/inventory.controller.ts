import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const toJson = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v ?? null));

export class InventoryController {
  // Get all inventory (Ingredients and InventoryItems)
  static async getInventory(req: Request, res: Response) {
    try {
      const ingredients = await prisma.ingredient.findMany({
        orderBy: { name: 'asc' }
      });
      const inventoryItems = await prisma.inventoryItem.findMany({
        orderBy: { name: 'asc' }
      });

      res.json({ ingredients, inventoryItems });
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Adjust stock manually
  static async adjustStock(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { qty, reason } = req.body;
      const performedById = req.user!.id;

      if (qty === undefined || isNaN(Number(qty))) {
        return res.status(400).json({ error: 'Invalid quantity' });
      }

      // Start transaction to update stock and log movement
      const result = await prisma.$transaction(async (tx) => {
        // Find existing ingredient to ensure it exists
        const ingredient = await tx.ingredient.findUnique({ where: { id } });
        if (!ingredient) {
          throw new Error('Ingredient not found');
        }

        // Update current stock (qty can be positive or negative)
        const updated = await tx.ingredient.update({
          where: { id },
          data: {
            currentStock: {
              increment: Number(qty) // Prisma handles both positive and negative increment
            }
          }
        });

        // Log movement
        const stockMovement = await tx.stockMovement.create({
          data: {
            ingredientId: id,
            movementType: 'MANUAL_ADJUST',
            qty: Number(qty),
            reason: reason || 'Manual adjustment via Inventory Module',
            performedById
          }
        });

        // Log audit
        await tx.auditLog.create({
          data: {
            actorId: performedById,
            action: 'INVENTORY_ADJUST',
            entityType: 'Ingredient',
            entityId: id,
            beforeValue: toJson({ currentStock: ingredient.currentStock }),
            afterValue: toJson({ currentStock: updated.currentStock, reason, movementId: stockMovement.id })
          }
        });

        return updated;
      });

      res.json(result);
    } catch (error: any) {
      console.error('Failed to adjust stock:', error);
      if (error.message === 'Ingredient not found') {
        res.status(404).json({ error: 'Ingredient not found' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Stock Conversion (e.g., Gula Kabung -> Gula Aren)
  static async convertStock(req: Request, res: Response) {
    try {
      const { inputIngredientId, inputQty, outputIngredientId, outputQty } = req.body;
      const performedById = req.user!.id;

      if (!inputIngredientId || !outputIngredientId || !inputQty || !outputQty) {
        return res.status(400).json({ error: 'Missing required fields for conversion' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Deduct input
        const inputUpdated = await tx.ingredient.update({
          where: { id: inputIngredientId },
          data: { currentStock: { decrement: Number(inputQty) } }
        });

        // 2. Add output
        const outputUpdated = await tx.ingredient.update({
          where: { id: outputIngredientId },
          data: { currentStock: { increment: Number(outputQty) } }
        });

        // 3. Log stock conversion
        await tx.stockConversion.create({
          data: {
            inputIngredientId,
            inputQty: Number(inputQty),
            outputIngredientId,
            outputQty: Number(outputQty),
            performedById
          }
        });

        // 4. Log movements for both
        await tx.stockMovement.create({
          data: {
            ingredientId: inputIngredientId,
            movementType: 'CONVERSION_OUT',
            qty: -Number(inputQty),
            reason: 'Used in stock conversion',
            performedById
          }
        });

        await tx.stockMovement.create({
          data: {
            ingredientId: outputIngredientId,
            movementType: 'CONVERSION_IN',
            qty: Number(outputQty),
            reason: 'Produced from stock conversion',
            performedById
          }
        });

        // Log audit
        await tx.auditLog.create({
          data: {
            actorId: performedById,
            action: 'INVENTORY_CONVERT',
            entityType: 'Ingredient',
            entityId: outputIngredientId,
            beforeValue: toJson({ inputId: inputIngredientId, inputQty }),
            afterValue: toJson({ outputId: outputIngredientId, outputQty })
          }
        });

        return { inputUpdated, outputUpdated };
      });

      res.json(result);
    } catch (error) {
      console.error('Failed to convert stock:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Atomic Production System (Produksi Adonan, Krimer, Espresso, dll)
  static async produceStock(req: Request, res: Response) {
    try {
      const { outputIngredientId, outputQty } = req.body;
      const performedById = req.user!.id;

      if (!outputIngredientId || !outputQty || isNaN(Number(outputQty))) {
        return res.status(400).json({ error: 'Invalid input' });
      }

      const RECIPES: Record<string, { name: string, qtyPerUnit: number }[]> = {
        'Adonan Besar': [
          { name: 'Tepung Terigu', qtyPerUnit: 420 },
          { name: 'Maizena', qtyPerUnit: 80 },
          { name: 'Baking Powder', qtyPerUnit: 16 },
          { name: 'Gula Pasir', qtyPerUnit: 160 }
        ],
        'Adonan Kecil': [
          { name: 'Tepung Terigu', qtyPerUnit: 210 },
          { name: 'Maizena', qtyPerUnit: 40 },
          { name: 'Baking Powder', qtyPerUnit: 8 },
          { name: 'Gula Pasir', qtyPerUnit: 80 }
        ],
        'Krimer': [
          { name: 'MaxCreamer', qtyPerUnit: 0.5 },
          { name: 'Rich Creme', qtyPerUnit: 0.5 },
        ],
        'Cocoa Powder': [
          { name: 'Van Houten', qtyPerUnit: 0.5 },
          { name: 'Tulip Bordeaux', qtyPerUnit: 0.5 },
        ],
        'Espresso': [
          { name: 'Biji Kopi', qtyPerUnit: 18 / 60 },
        ]
      };

      const result = await prisma.$transaction(async (tx) => {
        const outputIngredient = await tx.ingredient.findUnique({ where: { id: outputIngredientId } });
        if (!outputIngredient) throw new Error('Output ingredient not found');

        const recipe = RECIPES[outputIngredient.name];
        if (!recipe) {
          throw new Error(`Sistem atomik untuk ${outputIngredient.name} belum dikonfigurasi`);
        }

        const qty = Number(outputQty);

        // Deduct all input ingredients
        for (const reqIng of recipe) {
          const inputIngredient = await tx.ingredient.findFirst({ where: { name: reqIng.name } });
          if (!inputIngredient) throw new Error(`Bahan baku ${reqIng.name} tidak ditemukan di database`);

          const consumeQty = reqIng.qtyPerUnit * qty;
          
          await tx.ingredient.update({
            where: { id: inputIngredient.id },
            data: { currentStock: { decrement: consumeQty } }
          });

          await tx.stockMovement.create({
            data: {
              ingredientId: inputIngredient.id,
              movementType: 'CONVERSION_OUT',
              qty: -consumeQty,
              reason: `Produksi ${qty} ${outputIngredient.unit} ${outputIngredient.name}`,
              performedById
            }
          });
        }

        // Increment output ingredient
        const updatedOutput = await tx.ingredient.update({
          where: { id: outputIngredient.id },
          data: { currentStock: { increment: qty } }
        });

        await tx.stockMovement.create({
          data: {
            ingredientId: outputIngredient.id,
            movementType: 'CONVERSION_IN',
            qty: qty,
            reason: `Hasil Produksi Sistem Atomik`,
            performedById
          }
        });

        // Log audit
        await tx.auditLog.create({
          data: {
            actorId: performedById,
            action: 'INVENTORY_PRODUCE',
            entityType: 'Ingredient',
            entityId: outputIngredient.id,
            afterValue: toJson({ outputId: outputIngredient.id, qtyProduced: qty })
          }
        });

        return updatedOutput;
      });

      res.json(result);
    } catch (error: any) {
      console.error('Failed to produce stock:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  static async closeShiftUsage(req: Request, res: Response) {
    const { usedAdonanBesar, usedAdonanKecil } = req.body;
    const performedById = req.user!.id;

    const usedBesar = Number(usedAdonanBesar) || 0;
    const usedKecil = Number(usedAdonanKecil) || 0;

    if (usedBesar === 0 && usedKecil === 0) {
      res.json({ message: 'No usage reported.' });
      return;
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Find all needed ingredients first
        const ingredientNames = [
          'Adonan Besar', 'Adonan Kecil',
          'Telur', 'Minyak', 'Perisa Vanilla', 'Susu Evaporasi Tiga Sapi'
        ];
        
        const ingredients = await tx.ingredient.findMany({
          where: { name: { in: ingredientNames } }
        });
        
        const ingMap = new Map(ingredients.map(ing => [ing.name, ing]));

        // Check if all needed ingredients exist
        ingredientNames.forEach(name => {
          if (!ingMap.has(name)) {
            throw new Error(`Bahan baku ${name} tidak ditemukan di database`);
          }
        });

        // Calculate total usages
        const usages: { [name: string]: number } = {
          'Adonan Besar': usedBesar,
          'Adonan Kecil': usedKecil,
          'Telur': (usedBesar * 6) + (usedKecil * 3),
          'Minyak': (usedBesar * 50) + (usedKecil * 25),
          'Perisa Vanilla': (usedBesar * 10) + (usedKecil * 5),
          'Susu Evaporasi Tiga Sapi': (usedBesar * 100) + (usedKecil * 50)
        };

        const updatedIngredients = [];

        for (const [name, qty] of Object.entries(usages)) {
          if (qty > 0) {
            const ing = ingMap.get(name)!;
            const updated = await tx.ingredient.update({
              where: { id: ing.id },
              data: { currentStock: { decrement: qty } }
            });

            await tx.stockMovement.create({
              data: {
                ingredientId: ing.id,
                movementType: 'CONVERSION_OUT', // Or maybe 'ADJUSTMENT' or a new type. Using CONVERSION_OUT to signify usage
                qty: -qty,
                reason: `Tutup Shift: Terpakai ${usedBesar} Besar, ${usedKecil} Kecil`,
                performedById
              }
            });

            updatedIngredients.push(updated);
          }
        }

        // Log audit
        await tx.auditLog.create({
          data: {
            actorId: performedById,
            action: 'INVENTORY_SHIFT_USAGE',
            entityType: 'Shift',
            entityId: 'SYSTEM', // Not bound to a specific shift ID here, but represents usage
            afterValue: toJson(usages)
          }
        });

        return updatedIngredients;
      });

      res.json({ success: true, updatedIngredients: result });
    } catch (error: any) {
      console.error('Failed to report shift usage:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
}

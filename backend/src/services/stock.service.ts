import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class StockService {
  /**
   * Deducts ingredients based on the recipes of all items in an order.
   * This should only be called once when an order transitions to DONE.
   */
  static async deductOrderStock(orderId: string, performedById: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;

    // Fetch all items in the order, including their relations to determine recipes
    const orderItems = await db.orderItem.findMany({
      where: { orderId },
      include: {
        addons: true, // We need to know which addons were selected
      }
    });

    for (const item of orderItems) {
      const qty = item.qty;

      if (item.productType === 'TOPPING') {
        if (item.toppingId && item.halfPartnerToppingId) {
          // Half-half topping logic: uses half the recipe qty for each topping
          await this.deductRecipeStock(db, { toppingId: item.toppingId }, qty, performedById, orderId, true);
          await this.deductRecipeStock(db, { toppingId: item.halfPartnerToppingId }, qty, performedById, orderId, true);
        } else if (item.toppingId) {
          // Full topping
          await this.deductRecipeStock(db, { toppingId: item.toppingId }, qty, performedById, orderId);
        }

        // Deduct flavour
        if (item.flavourId) {
          await this.deductRecipeStock(db, { flavourId: item.flavourId }, qty, performedById, orderId);
        }

        // Deduct addons
        for (const addon of item.addons) {
          await this.deductRecipeStock(db, { addonId: addon.addonId }, qty, performedById, orderId);
        }

      } else if (item.productType === 'DRINK') {
        if (item.drinkId) {
          // Deduct drink
          await this.deductRecipeStock(db, { drinkId: item.drinkId }, qty, performedById, orderId);
        }
      }
    }
  }

  /**
   * Finds the recipe for a given option and deducts the corresponding ingredient(s)
   */
  private static async deductRecipeStock(
    db: Prisma.TransactionClient,
    whereClause: { toppingId?: string; flavourId?: string; addonId?: string; drinkId?: string },
    orderQty: number,
    performedById: string,
    orderId: string,
    isHalf: boolean = false
  ) {
    const recipes = await db.recipe.findMany({
      where: whereClause
    });

    for (const recipe of recipes) {
      // If half portion, we use half the gram usage
      const qtyToDeduct = (Number(recipe.qtyPerUnit) * orderQty) / (isHalf ? 2 : 1);

      // Deduct current stock
      await db.ingredient.update({
        where: { id: recipe.ingredientId },
        data: {
          currentStock: {
            decrement: qtyToDeduct
          }
        }
      });

      // Log movement
      await db.stockMovement.create({
        data: {
          ingredientId: recipe.ingredientId,
          movementType: 'SALE_DEDUCTION',
          qty: -qtyToDeduct,
          reason: 'Order fulfilled',
          referenceId: orderId,
          performedById: performedById
        }
      });
    }
  }
}

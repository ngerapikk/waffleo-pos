import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockService } from '../services/stock.service';
import { prisma } from '../lib/prisma';

vi.mock('../lib/prisma', () => ({
  prisma: {
    orderItem: { findMany: vi.fn() },
    recipe: { findMany: vi.fn() },
    ingredient: { update: vi.fn() },
    stockMovement: { create: vi.fn() },
  }
}));

describe('Recipe Gram Calculation - StockService', () => {
  let mockTx: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTx = {
      orderItem: prisma.orderItem,
      recipe: prisma.recipe,
      ingredient: prisma.ingredient,
      stockMovement: prisma.stockMovement,
    };
  });

  it('deducts full gram usage for a single topping', async () => {
    (mockTx.orderItem.findMany as any).mockResolvedValue([
      { productType: 'TOPPING', toppingId: 'top1', qty: 2, addons: [] }
    ]);
    (mockTx.recipe.findMany as any).mockResolvedValue([
      { ingredientId: 'ing1', qtyPerUnit: 15 } // 15 grams per portion
    ]);
    
    await StockService.deductOrderStock('order1', 'user1', mockTx);

    // Qty is 2. Full portion. So 15 * 2 = 30
    expect(mockTx.ingredient.update).toHaveBeenCalledWith({
      where: { id: 'ing1' },
      data: { currentStock: { decrement: 30 } }
    });
  });

  it('deducts half gram usage for half-half topping', async () => {
    (mockTx.orderItem.findMany as any).mockResolvedValue([
      { productType: 'TOPPING', toppingId: 'top1', halfPartnerToppingId: 'top2', qty: 1, addons: [] }
    ]);
    
    // First call (top1 recipe), second call (top2 recipe)
    (mockTx.recipe.findMany as any)
      .mockResolvedValueOnce([{ ingredientId: 'ing1', qtyPerUnit: 20 }])
      .mockResolvedValueOnce([{ ingredientId: 'ing2', qtyPerUnit: 30 }]);
      
    await StockService.deductOrderStock('order1', 'user1', mockTx);

    // qty is 1. Half portion.
    // top1: 20 / 2 = 10
    expect(mockTx.ingredient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ing1' },
        data: { currentStock: { decrement: 10 } }
      })
    );
    // top2: 30 / 2 = 15
    expect(mockTx.ingredient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ing2' },
        data: { currentStock: { decrement: 15 } }
      })
    );
  });
});

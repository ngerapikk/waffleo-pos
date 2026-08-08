import { Discount, PromoType } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface OrderItemInput {
  productType: 'TOPPING' | 'DRINK';
  toppingId?: string;
  drinkId?: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export function validatePromoEligibility(
  promo: Discount,
  channelId: string,
  subtotal: number
): { valid: boolean; reason?: string } {
  if (!promo.active) {
    return { valid: false, reason: 'Promo tidak aktif' };
  }

  const now = new Date();
  if (promo.validFrom && now < promo.validFrom) {
    return { valid: false, reason: 'Promo belum dimulai' };
  }
  if (promo.validTo && now > promo.validTo) {
    return { valid: false, reason: 'Promo sudah berakhir' };
  }

  if (promo.applicableChannels && promo.applicableChannels.length > 0) {
    if (!promo.applicableChannels.includes(channelId)) {
      return { valid: false, reason: 'Promo tidak berlaku untuk channel pesanan ini' };
    }
  }

  const payload: any = promo.rulePayload;

  if (promo.promoType === 'TIME_WINDOW') {
    const { days, startTime, endTime } = payload;
    if (days && days.length > 0) {
      const currentDay = now.getDay();
      if (!days.includes(currentDay)) {
        return { valid: false, reason: 'Promo tidak berlaku pada hari ini' };
      }
    }
    if (startTime && endTime) {
      const currentTime = now.toTimeString().substring(0, 5); // HH:MM
      if (currentTime < startTime || currentTime > endTime) {
        return { valid: false, reason: 'Promo tidak berlaku pada jam ini' };
      }
    }
  }

  if (promo.promoType === 'MIN_PURCHASE') {
    if (subtotal < (payload.minAmount || 0)) {
      return { valid: false, reason: `Minimum pembelian Rp${payload.minAmount} belum terpenuhi` };
    }
  }

  return { valid: true };
}

export async function calculateDiscount(
  promo: Discount,
  subtotal: number,
  items: OrderItemInput[]
): Promise<number> {
  const payload: any = promo.rulePayload;

  switch (promo.promoType) {
    case 'PERCENT': {
      const percentage = payload.percentage || 0;
      return Math.floor(subtotal * (percentage / 100));
    }
    case 'FIXED_AMOUNT': {
      return payload.amount || 0;
    }
    case 'VOUCHER_CODE': {
      // Act like fixed or percent based on voucher definition
      if (payload.discountType === 'PERCENT') {
        const percentage = payload.discountValue || 0;
        return Math.floor(subtotal * (percentage / 100));
      } else {
        return payload.discountValue || 0;
      }
    }
    case 'BOGO': {
      // Find one 'Buy' item
      const buyType = payload.buyProductType; // 'TOPPING' or 'DRINK'
      const getType = payload.getProductType; // 'TOPPING' or 'DRINK'
      
      let hasBuy = items.some(i => i.productType === buyType);
      
      if (hasBuy) {
        // Find the cheapest 'Get' item
        const getItems = items.filter(i => i.productType === getType);
        if (getItems.length > 0) {
          getItems.sort((a, b) => a.unitPrice - b.unitPrice);
          const cheapestGetItem = getItems[0];
          const discountVal = cheapestGetItem.unitPrice - (payload.getPrice || 0);
          return Math.max(0, discountVal);
        }
      }
      return 0;
    }
    case 'BUY_X_GET_Y': {
      const buyQtyRequired = payload.buyQty || 1;
      const getQtyProvided = payload.getQty || 1;
      const buyItemsReq = payload.buyItems || [];
      const getItemsReq = payload.getItems || [];
      const getPrice = payload.getPrice || 0;

      const toppings = await prisma.toppingUtama.findMany();
      const drinks = await prisma.drink.findMany();

      const isMatch = (item: OrderItemInput, reqs: string[]) => {
        if (reqs.includes('CAT_ALL_WAFFLE') && item.productType === 'TOPPING') return true;
        if (reqs.includes('CAT_ALL_DRINK') && item.productType === 'DRINK') return true;
        if (item.productType === 'TOPPING') {
          const t = toppings.find((x: any) => x.id === item.toppingId);
          if (t && reqs.includes(`CAT_${t.series}`)) return true;
        }
        if (item.productType === 'DRINK') {
          const d = drinks.find((x: any) => x.id === item.drinkId);
          if (d && reqs.includes(`CAT_${d.drinkType.toUpperCase().replace('-', '_')}`)) return true;
        }
        if (item.toppingId && reqs.includes(item.toppingId)) return true;
        if (item.drinkId && reqs.includes(item.drinkId)) return true;
        return false;
      };

      let totalBuyQty = 0;
      for (const item of items) {
        if (isMatch(item, buyItemsReq)) {
          totalBuyQty += item.qty;
        }
      }

      const multiplier = Math.floor(totalBuyQty / buyQtyRequired);
      if (multiplier > 0) {
        let discountableGetItems: any[] = [];
        for (const item of items) {
          if (isMatch(item, getItemsReq)) {
            for (let i = 0; i < item.qty; i++) {
              discountableGetItems.push(item);
            }
          }
        }

        if (discountableGetItems.length > 0) {
          const pricedGetItems = discountableGetItems.sort((a, b) => a.unitPrice - b.unitPrice);
          let totalDiscount = 0;
          const itemsToDiscount = Math.min(pricedGetItems.length, multiplier * getQtyProvided);
          for (let i = 0; i < itemsToDiscount; i++) {
            totalDiscount += Math.max(0, pricedGetItems[i].unitPrice - getPrice);
          }
          return totalDiscount;
        }
      }
      return 0;
    }
    case 'BUNDLE': {
      const bundleItemsReq = payload.bundleItems || [];
      if (bundleItemsReq.length === 0) return 0;

      const toppings = await prisma.toppingUtama.findMany();
      const drinks = await prisma.drink.findMany();

      const isMatch = (item: OrderItemInput, req: string) => {
        if (req === 'CAT_ALL_WAFFLE' && item.productType === 'TOPPING') return true;
        if (req === 'CAT_ALL_DRINK' && item.productType === 'DRINK') return true;
        if (item.productType === 'TOPPING') {
          const t = toppings.find((x: any) => x.id === item.toppingId);
          if (t && req === `CAT_${t.series}`) return true;
        }
        if (item.productType === 'DRINK') {
          const d = drinks.find((x: any) => x.id === item.drinkId);
          if (d && req === `CAT_${d.drinkType.toUpperCase().replace('-', '_')}`) return true;
        }
        if (item.toppingId && req === item.toppingId) return true;
        if (item.drinkId && req === item.drinkId) return true;
        return false;
      };

      let flatItems: any[] = [];
      for (const item of items) {
        for (let i = 0; i < item.qty; i++) {
          flatItems.push({ ...item, used: false });
        }
      }

      let bundleCount = 0;
      let totalBundlePrice = 0;

      while (true) {
        let bundleFormed = true;
        let currentBundlePrice = 0;
        let itemsToMarkUsed: any[] = [];

        for (const req of bundleItemsReq) {
          const match = flatItems
            .filter(i => !i.used && !itemsToMarkUsed.includes(i) && isMatch(i, req))
            .sort((a, b) => a.unitPrice - b.unitPrice)[0];

          if (match) {
            itemsToMarkUsed.push(match);
            currentBundlePrice += match.unitPrice;
          } else {
            bundleFormed = false;
            break;
          }
        }

        if (bundleFormed) {
          bundleCount++;
          totalBundlePrice += currentBundlePrice;
          itemsToMarkUsed.forEach(i => i.used = true);
        } else {
          break;
        }
      }

      if (bundleCount > 0) {
        const discountType = payload.discountType || 'PERCENT';
        const discountValue = payload.discountValue || 0;
        if (discountType === 'PERCENT') {
          return Math.floor(totalBundlePrice * (discountValue / 100));
        } else {
          return discountValue * bundleCount;
        }
      }
      return 0;
    }
    case 'TIME_WINDOW':
    case 'MIN_PURCHASE': {
      if (payload.discountType === 'PERCENT') {
        const percentage = payload.discountValue || 0;
        return Math.floor(subtotal * (percentage / 100));
      } else {
        return payload.discountValue || 0;
      }
    }
    default:
      return 0;
  }
}

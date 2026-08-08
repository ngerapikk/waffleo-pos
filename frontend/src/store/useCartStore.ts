import { create } from 'zustand';
import api from '../lib/api';

export interface CartItem {
  id: string; // local temp ID
  productType: 'TOPPING' | 'DRINK';
  toppingId?: string;
  halfPartnerToppingId?: string;
  drinkId?: string;
  flavourId?: string;
  addonIds: string[];
  sweetnessLevelId?: string;
  icedLevelId?: string;
  name: string;
  details: string; // computed string for UI e.g., "Pandan, Meses"
  qty: number;
  unitPrice: number; // Snapshot of price for UI display (Backend re-calculates)
}

export interface Channel {
  id: string;
  name: string;
  customerPrefix: string | null;
  priceTier: 'Direct' | 'GrabGo' | 'Shopee';
}

export interface MenuCatalog {
  toppings: any[];
  drinks: any[];
  flavours: any[];
  addons: any[];
  sweetness: any[];
  icedLevels: any[];
}

interface CartState {
  channelId: string;
  customerData: string;
  notes: string;
  items: CartItem[];
  channels: Channel[];
  menu: MenuCatalog | null;
  appliedPromo: any | null;

  // Edit Mode States
  editingOrderId: string | null;
  editingOrderNumber: string | null;
  editingPreviousTotal: number;
  editingWasPaid: boolean;
  editingPaidAmount: number;

  // Actions
  setChannel: (channelId: string) => void;
  setCustomerData: (name: string) => void;
  setNotes: (notes: string) => void;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
  loadOrderForEdit: (order: any) => void;
  cancelEdit: () => void;
  fetchChannels: () => Promise<void>;
  fetchMenu: () => Promise<void>;
  
  getSubtotal: () => number;
  getDiscount: () => number;
  getItemUnitPrice: (item: CartItem) => number;
  setAppliedPromo: (promo: any | null) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  channelId: '', // Default to Walk In, set after fetch
  customerData: '',
  notes: '',
  items: [],
  channels: [],
  menu: null,
  appliedPromo: null,

  editingOrderId: null,
  editingOrderNumber: null,
  editingPreviousTotal: 0,
  editingWasPaid: false,
  editingPaidAmount: 0,

  setChannel: (channelId) => set({ channelId }),
  setCustomerData: (customerData) => set({ customerData }),
  setNotes: (notes) => set({ notes }),

  addItem: (item) => set((state) => {
    // Generate a simple unique ID for the local cart item
    const newItem = { ...item, id: Date.now().toString() + Math.random().toString(36).substring(7) };
    return { items: [...state.items, newItem] };
  }),

  removeItem: (id) => set((state) => ({
    items: state.items.filter((item) => item.id !== id)
  })),

  updateQty: (id, delta) => set((state) => ({
    items: state.items.map((item) => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    })
  })),

  clearCart: () => set({ 
    items: [], 
    customerData: '', 
    notes: '',
    editingOrderId: null,
    editingOrderNumber: null,
    editingPreviousTotal: 0,
    editingWasPaid: false,
    editingPaidAmount: 0,
    appliedPromo: null
  }),

  cancelEdit: () => get().clearCart(),

  loadOrderForEdit: (order: any) => {
    // 1. Calculate paid amount if previously paid
    const paidAmount = order.payments ? order.payments.reduce((sum: number, p: any) => sum + Number(p.totalTendered) - Number(p.changeGiven), 0) : 0;
    const previousTotal = order.items ? order.items.reduce((sum: number, i: any) => sum + Number(i.lineTotal), 0) : 0;

    // 2. Map items to CartItems
    const cartItems: CartItem[] = (order.items || []).map((item: any) => {
      // Build details string similar to frontend display logic
      let details = '';
      if (item.productType === 'TOPPING') {
        const parts = [];
        if (item.halfPartner) parts.push(`& ${item.halfPartner.name}`);
        if (item.flavour) parts.push(`Flavour: ${item.flavour.name}`);
        if (item.sweetnessLevel) parts.push(`Sugar: ${item.sweetnessLevel.name}`);
        if (item.icedLevel) parts.push(`Ice: ${item.icedLevel.name}`);
        if (item.addons && item.addons.length > 0) {
          parts.push(...item.addons.map((a: any) => `+${a.addon?.name}`));
        }
        details = parts.join(', ');
      } else {
        const parts = [];
        if (item.sweetnessLevel) parts.push(`Sugar: ${item.sweetnessLevel.name}`);
        if (item.icedLevel) parts.push(`Ice: ${item.icedLevel.name}`);
        if (item.addons && item.addons.length > 0) {
          parts.push(...item.addons.map((a: any) => `+${a.addon?.name}`));
        }
        details = parts.join(', ');
      }

      return {
        id: item.id || Date.now().toString() + Math.random().toString(36).substring(7),
        productType: item.productType,
        toppingId: item.toppingId || undefined,
        halfPartnerToppingId: item.halfPartnerToppingId || undefined,
        drinkId: item.drinkId || undefined,
        flavourId: item.flavourId || undefined,
        addonIds: item.addons ? item.addons.map((a: any) => a.addonId) : [],
        sweetnessLevelId: item.sweetnessLevelId || undefined,
        icedLevelId: item.icedLevelId || undefined,
        name: item.topping?.name || item.drink?.name || '',
        details,
        qty: item.qty,
        unitPrice: Number(item.unitPrice),
      };
    });

    // 3. Set state
    set({
      editingOrderId: order.id,
      editingOrderNumber: order.orderNumber,
      editingPreviousTotal: previousTotal,
      editingWasPaid: order.paymentStatus === 'PAID',
      editingPaidAmount: paidAmount,
      channelId: order.channelId,
      customerData: order.customerData || '',
      notes: order.notes || '',
      items: cartItems,
      appliedPromo: order.discount || null
    });
  },

  fetchChannels: async () => {
    try {
      const { data } = await api.get('/channels');
      set({ channels: data });
      if (data.length > 0 && !get().channelId) {
        set({ channelId: data[0].id });
      }
    } catch (error) {
      console.error('Failed to fetch channels', error);
    }
  },

  fetchMenu: async () => {
    try {
      const { data } = await api.get('/menu');
      set({ menu: data });
    } catch (error) {
      console.error('Failed to fetch menu', error);
    }
  },

  getSubtotal: () => {
    const { items, channels, channelId, menu } = get();
    const currentChannel = channels.find(c => c.id === channelId);
    const tier = currentChannel?.priceTier || 'Direct';

    return items.reduce((acc, item) => {
      let unitPrice = 0;
      if (menu) {
        if (item.productType === 'TOPPING' && item.toppingId) {
          const topping = menu.toppings.find(t => t.id === item.toppingId);
          if (topping) {
            const primaryPrice = tier === 'Direct' ? Number(topping.priceDirect) : tier === 'GrabGo' ? Number(topping.priceGrabGo) : Number(topping.priceShopee);
            if (item.halfPartnerToppingId) {
              const partnerTopping = menu.toppings.find(t => t.id === item.halfPartnerToppingId);
              if (partnerTopping) {
                const partnerPrice = tier === 'Direct' ? Number(partnerTopping.priceDirect) : tier === 'GrabGo' ? Number(partnerTopping.priceGrabGo) : Number(partnerTopping.priceShopee);
                unitPrice += (primaryPrice / 2) + (partnerPrice / 2);
              } else {
                unitPrice += primaryPrice;
              }
            } else {
              unitPrice += primaryPrice;
            }
          }
          if (item.flavourId) {
            const flavour = menu.flavours.find(f => f.id === item.flavourId);
            if (flavour) {
              unitPrice += tier === 'Direct' ? Number(flavour.extraPriceDirect) : Number(flavour.extraPriceOnline);
            }
          }
          if (item.addonIds && item.addonIds.length > 0) {
            item.addonIds.forEach(addonId => {
               const addon = menu.addons.find(a => a.id === addonId);
               if (addon) {
                 unitPrice += tier === 'Direct' ? Number(addon.extraPriceDirect) : Number(addon.extraPriceOnline);
               }
            });
          }
        } else if (item.productType === 'DRINK' && item.drinkId) {
          const drink = menu.drinks.find(d => d.id === item.drinkId);
          if (drink) {
            unitPrice += tier === 'Direct' ? Number(drink.priceDirect) : tier === 'GrabGo' ? Number(drink.priceGrabGo) : Number(drink.priceShopee);
          }
        }
      }
      return acc + (unitPrice || item.unitPrice) * item.qty;
    }, 0);
  },

  getDiscount: () => {
    const { appliedPromo, getSubtotal, items, channels, channelId, menu } = get();
    if (!appliedPromo) return 0;
    
    const subtotal = getSubtotal();
    const payload = appliedPromo.rulePayload;
    
    switch (appliedPromo.promoType) {
      case 'PERCENT':
        return Math.floor(subtotal * ((payload.percentage || 0) / 100));
      case 'FIXED_AMOUNT':
        return payload.amount || 0;
      case 'VOUCHER_CODE':
        return payload.discountType === 'PERCENT' 
          ? Math.floor(subtotal * ((payload.discountValue || 0) / 100))
          : (payload.discountValue || 0);
      case 'BOGO': {
        const buyType = payload.buyProductType;
        const getType = payload.getProductType;
        const hasBuy = items.some(i => i.productType === buyType);
        if (hasBuy) {
          const getItems = items.filter(i => i.productType === getType);
          if (getItems.length > 0) {
            // Recompute unit prices for get items to find cheapest
            const currentChannel = channels.find(c => c.id === channelId);
            const tier = currentChannel?.priceTier || 'Direct';
            
            const pricedGetItems = getItems.map(item => {
              let p = 0;
              if (item.productType === 'TOPPING' && menu) {
                 const t = menu.toppings.find(x => x.id === item.toppingId);
                 if (t) p = tier === 'Direct' ? Number(t.priceDirect) : tier === 'GrabGo' ? Number(t.priceGrabGo) : Number(t.priceShopee);
              } else if (item.productType === 'DRINK' && menu) {
                 const d = menu.drinks.find(x => x.id === item.drinkId);
                 if (d) p = tier === 'Direct' ? Number(d.priceDirect) : tier === 'GrabGo' ? Number(d.priceGrabGo) : Number(d.priceShopee);
              }
              return { ...item, calcPrice: p || item.unitPrice };
            }).sort((a, b) => a.calcPrice - b.calcPrice);
            
            return Math.max(0, pricedGetItems[0].calcPrice - (payload.getPrice || 0));
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

        const isMatch = (item: CartItem, reqs: string[]) => {
          if (reqs.includes('CAT_ALL_WAFFLE') && item.productType === 'TOPPING') return true;
          if (reqs.includes('CAT_ALL_DRINK') && item.productType === 'DRINK') return true;
          if (item.productType === 'TOPPING' && menu) {
            const t = menu.toppings.find(x => x.id === item.toppingId);
            if (t && reqs.includes(`CAT_${t.series}`)) return true;
          }
          if (item.productType === 'DRINK' && menu) {
            const d = menu.drinks.find(x => x.id === item.drinkId);
            // d.drinkType might be 'Coffee' or 'Non-Coffee', standardize it
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
            const currentChannel = channels.find(c => c.id === channelId);
            const tier = currentChannel?.priceTier || 'Direct';
            
            const pricedGetItems = discountableGetItems.map(item => {
              let p = 0;
              if (item.productType === 'TOPPING' && menu) {
                 const t = menu.toppings.find(x => x.id === item.toppingId);
                 if (t) p = tier === 'Direct' ? Number(t.priceDirect) : tier === 'GrabGo' ? Number(t.priceGrabGo) : Number(t.priceShopee);
              } else if (item.productType === 'DRINK' && menu) {
                 const d = menu.drinks.find(x => x.id === item.drinkId);
                 if (d) p = tier === 'Direct' ? Number(d.priceDirect) : tier === 'GrabGo' ? Number(d.priceGrabGo) : Number(d.priceShopee);
              }
              return { ...item, calcPrice: p || item.unitPrice };
            }).sort((a, b) => a.calcPrice - b.calcPrice);
            
            let totalDiscount = 0;
            const itemsToDiscount = Math.min(pricedGetItems.length, multiplier * getQtyProvided);
            for (let i = 0; i < itemsToDiscount; i++) {
              totalDiscount += Math.max(0, pricedGetItems[i].calcPrice - getPrice);
            }
            return totalDiscount;
          }
        }
        return 0;
      }
      case 'TIME_WINDOW':
      case 'MIN_PURCHASE':
        return payload.discountType === 'PERCENT'
          ? Math.floor(subtotal * ((payload.discountValue || 0) / 100))
          : (payload.discountValue || 0);
      case 'BUNDLE': {
        const bundleItemsReq = payload.bundleItems || [];
        if (bundleItemsReq.length === 0) return 0;
        
        const isMatch = (item: CartItem, req: string) => {
          if (req === 'CAT_ALL_WAFFLE' && item.productType === 'TOPPING') return true;
          if (req === 'CAT_ALL_DRINK' && item.productType === 'DRINK') return true;
          if (item.productType === 'TOPPING' && menu) {
            const t = menu.toppings.find(x => x.id === item.toppingId);
            if (t && req === `CAT_${t.series}`) return true;
          }
          if (item.productType === 'DRINK' && menu) {
            const d = menu.drinks.find(x => x.id === item.drinkId);
            if (d && req === `CAT_${d.drinkType.toUpperCase().replace('-', '_')}`) return true;
          }
          if (item.toppingId && req === item.toppingId) return true;
          if (item.drinkId && req === item.drinkId) return true;
          return false;
        };

        const currentChannel = channels.find(c => c.id === channelId);
        const tier = currentChannel?.priceTier || 'Direct';

        let flatItems: any[] = [];
        for (const item of items) {
          let p = 0;
          if (item.productType === 'TOPPING' && menu) {
             const t = menu.toppings.find(x => x.id === item.toppingId);
             if (t) p = tier === 'Direct' ? Number(t.priceDirect) : tier === 'GrabGo' ? Number(t.priceGrabGo) : Number(t.priceShopee);
          } else if (item.productType === 'DRINK' && menu) {
             const d = menu.drinks.find(x => x.id === item.drinkId);
             if (d) p = tier === 'Direct' ? Number(d.priceDirect) : tier === 'GrabGo' ? Number(d.priceGrabGo) : Number(d.priceShopee);
          }
          for (let i = 0; i < item.qty; i++) {
            flatItems.push({ ...item, calcPrice: p || item.unitPrice, used: false });
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
              .sort((a, b) => a.calcPrice - b.calcPrice)[0];

            if (match) {
              itemsToMarkUsed.push(match);
              currentBundlePrice += match.calcPrice;
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
      default:
        return 0;
    }
  },

  setAppliedPromo: (promo) => set({ appliedPromo: promo }),

  getItemUnitPrice: (item: CartItem) => {
    const { channels, channelId, menu } = get();
    const currentChannel = channels.find(c => c.id === channelId);
    const tier = currentChannel?.priceTier || 'Direct';

    let unitPrice = 0;
    if (menu) {
      if (item.productType === 'TOPPING' && item.toppingId) {
        const topping = menu.toppings.find(t => t.id === item.toppingId);
        if (topping) {
          const primaryPrice = tier === 'Direct' ? Number(topping.priceDirect) : tier === 'GrabGo' ? Number(topping.priceGrabGo) : Number(topping.priceShopee);
          if (item.halfPartnerToppingId) {
            const partnerTopping = menu.toppings.find(t => t.id === item.halfPartnerToppingId);
            if (partnerTopping) {
              const partnerPrice = tier === 'Direct' ? Number(partnerTopping.priceDirect) : tier === 'GrabGo' ? Number(partnerTopping.priceGrabGo) : Number(partnerTopping.priceShopee);
              unitPrice += (primaryPrice / 2) + (partnerPrice / 2);
            } else {
              unitPrice += primaryPrice;
            }
          } else {
            unitPrice += primaryPrice;
          }
        }
        if (item.flavourId) {
          const flavour = menu.flavours.find(f => f.id === item.flavourId);
          if (flavour) {
            unitPrice += tier === 'Direct' ? Number(flavour.extraPriceDirect) : Number(flavour.extraPriceOnline);
          }
        }
        if (item.addonIds && item.addonIds.length > 0) {
          item.addonIds.forEach(addonId => {
             const addon = menu.addons.find(a => a.id === addonId);
             if (addon) {
               unitPrice += tier === 'Direct' ? Number(addon.extraPriceDirect) : Number(addon.extraPriceOnline);
             }
          });
        }
      } else if (item.productType === 'DRINK' && item.drinkId) {
        const drink = menu.drinks.find(d => d.id === item.drinkId);
        if (drink) {
          unitPrice += tier === 'Direct' ? Number(drink.priceDirect) : tier === 'GrabGo' ? Number(drink.priceGrabGo) : Number(drink.priceShopee);
        }
      }
    }
    return unitPrice || item.unitPrice;
  }
}));

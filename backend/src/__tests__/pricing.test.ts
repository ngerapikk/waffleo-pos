import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrder } from '../controllers/order.controller';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

// Mock prisma and broadcast
vi.mock('../lib/prisma', () => ({
  prisma: {
    outlet: { findUnique: vi.fn() },
    channel: { findUnique: vi.fn() },
    toppingUtama: { findUnique: vi.fn() },
    flavour: { findUnique: vi.fn() },
    addon: { findMany: vi.fn() },
    drink: { findUnique: vi.fn() },
    order: { count: vi.fn(), create: vi.fn() },
    discount: { findUnique: vi.fn() },
    $transaction: vi.fn((callback) => callback(prisma)),
  }
}));

vi.mock('../lib/ws', () => ({
  broadcastOrderUpdate: vi.fn(),
}));

describe('Pricing Logic - createOrder', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      user: { id: 'user1', outletId: 'outlet1', role: 'KASIR', name: 'Test' },
      body: {
        channelId: 'channel1',
        customerData: 'Test',
        items: []
      }
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Default mocks
    (prisma.outlet.findUnique as any).mockResolvedValue({ id: 'outlet1', branchCode: '001' });
    (prisma.order.count as any).mockResolvedValue(0);
    (prisma.order.create as any).mockImplementation((args: any) => Promise.resolve({ id: 'order1', ...args.data }));
  });

  it('calculates Direct price for single topping Walk-In', async () => {
    (prisma.channel.findUnique as any).mockResolvedValue({ id: 'channel1', priceTier: 'Direct' });
    (prisma.toppingUtama.findUnique as any).mockResolvedValue({
      id: 'topping1',
      priceDirect: new Prisma.Decimal(18000),
      priceGrabGo: new Prisma.Decimal(22500),
      priceShopee: new Prisma.Decimal(24000)
    });

    mockReq.body.items = [{ productType: 'TOPPING', toppingId: 'topping1', qty: 1 }];

    await createOrder(mockReq as Request, mockRes as Response);

    const createCall = (prisma.order.create as any).mock.calls[0][0];
    expect(createCall.data.items.create[0].unitPrice).toBe(18000);
    expect(createCall.data.items.create[0].lineTotal).toBe(18000);
  });

  it('calculates GrabGo price for single topping GrabFood', async () => {
    (prisma.channel.findUnique as any).mockResolvedValue({ id: 'channel2', priceTier: 'GrabGo' });
    (prisma.toppingUtama.findUnique as any).mockResolvedValue({
      id: 'topping1',
      priceDirect: new Prisma.Decimal(18000),
      priceGrabGo: new Prisma.Decimal(22500),
      priceShopee: new Prisma.Decimal(24000)
    });

    mockReq.body.items = [{ productType: 'TOPPING', toppingId: 'topping1', qty: 1 }];

    await createOrder(mockReq as Request, mockRes as Response);

    const createCall = (prisma.order.create as any).mock.calls[0][0];
    expect(createCall.data.items.create[0].unitPrice).toBe(22500);
  });

  it('calculates Half-half Tiramisu + Greentea Walk-In', async () => {
    (prisma.channel.findUnique as any).mockResolvedValue({ id: 'channel1', priceTier: 'Direct' });
    (prisma.toppingUtama.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === 'tiramisu') return Promise.resolve({ priceDirect: new Prisma.Decimal(18000) });
      if (where.id === 'greentea') return Promise.resolve({ priceDirect: new Prisma.Decimal(18000) });
    });

    mockReq.body.items = [{ productType: 'TOPPING', toppingId: 'tiramisu', halfPartnerToppingId: 'greentea', qty: 1 }];

    await createOrder(mockReq as Request, mockRes as Response);

    const createCall = (prisma.order.create as any).mock.calls[0][0];
    // (18000 / 2) + (18000 / 2) = 18000
    expect(createCall.data.items.create[0].unitPrice).toBe(18000);
  });

  it('calculates Half-half Hazelnut + Chocolate GrabFood', async () => {
    (prisma.channel.findUnique as any).mockResolvedValue({ id: 'channel2', priceTier: 'GrabGo' });
    (prisma.toppingUtama.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === 'hazelnut') return Promise.resolve({ priceGrabGo: new Prisma.Decimal(31500) });
      if (where.id === 'chocolate') return Promise.resolve({ priceGrabGo: new Prisma.Decimal(22500) });
    });

    mockReq.body.items = [{ productType: 'TOPPING', toppingId: 'hazelnut', halfPartnerToppingId: 'chocolate', qty: 1 }];

    await createOrder(mockReq as Request, mockRes as Response);

    const createCall = (prisma.order.create as any).mock.calls[0][0];
    // (31500 / 2) + (22500 / 2) = 15750 + 11250 = 27000
    expect(createCall.data.items.create[0].unitPrice).toBe(27000);
  });

  it('calculates Flavour & Addons pricing correctly', async () => {
    (prisma.channel.findUnique as any).mockResolvedValue({ id: 'channel1', priceTier: 'Direct' });
    (prisma.toppingUtama.findUnique as any).mockResolvedValue({ priceDirect: new Prisma.Decimal(18000) });
    (prisma.flavour.findUnique as any).mockResolvedValue({ extraPriceDirect: new Prisma.Decimal(2000), extraPriceOnline: new Prisma.Decimal(3000) });
    (prisma.addon.findMany as any).mockResolvedValue([{ extraPriceDirect: new Prisma.Decimal(2000), extraPriceOnline: new Prisma.Decimal(3000) }]);

    mockReq.body.items = [{ productType: 'TOPPING', toppingId: 'top1', flavourId: 'flav1', addonIds: ['add1'], qty: 1 }];

    await createOrder(mockReq as Request, mockRes as Response);

    const createCall = (prisma.order.create as any).mock.calls[0][0];
    // 18000 + 2000 + 2000 = 22000
    expect(createCall.data.items.create[0].unitPrice).toBe(22000);
  });
});

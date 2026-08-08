import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrder } from '../controllers/order.controller';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

vi.mock('../lib/prisma', () => ({
  prisma: {
    outlet: { findUnique: vi.fn() },
    channel: { findUnique: vi.fn() },
    toppingUtama: { findUnique: vi.fn() },
    order: { count: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((callback) => callback(prisma)),
  }
}));

vi.mock('../lib/ws', () => ({
  broadcastOrderUpdate: vi.fn(),
}));

describe('Order ID Formatting - createOrder', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      user: { id: 'user1', outletId: 'outlet1', role: 'KASIR', name: 'Test' },
      body: {
        channelId: 'channel1',
        customerData: 'Test',
        items: [{ productType: 'TOPPING', toppingId: 'topping1', qty: 1 }]
      }
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    (prisma.outlet.findUnique as any).mockResolvedValue({ id: 'outlet1', branchCode: '001' });
    (prisma.channel.findUnique as any).mockResolvedValue({ id: 'channel1', priceTier: 'Direct' });
    (prisma.toppingUtama.findUnique as any).mockResolvedValue({ priceDirect: new Prisma.Decimal(18000) });
  });

  it('formats Order ID as BR[BranchCode][YYMMDD][Counter]', async () => {
    // Current date logic from controller:
    const today = new Date();
    const yy = today.getFullYear().toString().slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    
    // Test for 5 existing orders (so this is the 6th order)
    (prisma.order.count as any).mockResolvedValue(5);
    (prisma.order.create as any).mockImplementation((args: any) => Promise.resolve({ id: 'order1', ...args.data }));

    await createOrder(mockReq as Request, mockRes as Response);

    const createCall = (prisma.order.create as any).mock.calls[0][0];
    const generatedOrderNumber = createCall.data.orderNumber;

    expect(generatedOrderNumber).toBe(`BR001${yy}${mm}${dd}006`);
  });

  it('prefixes customerData based on channel', async () => {
    (prisma.channel.findUnique as any).mockResolvedValue({ id: 'channel1', priceTier: 'GrabGo', customerPrefix: 'GF-' });
    (prisma.order.count as any).mockResolvedValue(0);
    (prisma.order.create as any).mockImplementation((args: any) => Promise.resolve({ id: 'order1', ...args.data }));

    await createOrder(mockReq as Request, mockRes as Response);

    const createCall = (prisma.order.create as any).mock.calls[0][0];
    expect(createCall.data.customerData).toBe('GF-Test');
  });
});

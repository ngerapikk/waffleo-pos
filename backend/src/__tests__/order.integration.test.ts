import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createOrder } from '../controllers/order.controller';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

// Mock dependencies
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

const app = express();
app.use(express.json());

// Fake auth middleware
app.use((req, res, next) => {
  req.user = { id: 'user1', outletId: 'outlet1', role: 'KASIR', name: 'Kasir 1' };
  next();
});
app.post('/orders', createOrder);

describe('Order Integration (Mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.outlet.findUnique as any).mockResolvedValue({ id: 'outlet1', branchCode: '001' });
    (prisma.channel.findUnique as any).mockResolvedValue({ id: 'channel1', priceTier: 'Direct' });
    (prisma.toppingUtama.findUnique as any).mockResolvedValue({ priceDirect: new Prisma.Decimal(18000) });
    (prisma.order.count as any).mockResolvedValue(0);
    (prisma.order.create as any).mockImplementation((args: any) => Promise.resolve({ id: 'order123', ...args.data }));
  });

  it('creates an order successfully with HTTP request', async () => {
    const res = await request(app)
      .post('/orders')
      .send({
        channelId: 'channel1',
        customerData: 'Test Integration',
        items: [{ productType: 'TOPPING', toppingId: 'top1', qty: 1 }]
      });

    expect(res.status).toBe(201);
    expect(res.body.order.orderNumber).toBeDefined();
    
    // Check if prisma.order.create was called
    expect(prisma.order.create).toHaveBeenCalled();
  });
});

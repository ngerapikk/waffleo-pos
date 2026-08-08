import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCommissions } from '../controllers/report.controller';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

// Mock prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    order: { findMany: vi.fn() },
  }
}));

describe('Net Settlement Math - getCommissions', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      user: { id: 'user1', outletId: 'outlet1', role: 'ADMIN', name: 'Test' },
      query: { start: '2026-08-01', end: '2026-08-31' }
    };
    jsonMock = vi.fn();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: jsonMock,
    };
  });

  it('calculates GrabFood commission correctly (20%, flat 0)', async () => {
    (prisma.order.findMany as any).mockResolvedValue([
      {
        channel: { name: 'GrabFood', commissionPct: new Prisma.Decimal(20), flatFee: new Prisma.Decimal(0), settlesTo: 'Grab Merchant' },
        items: [{ lineTotal: new Prisma.Decimal(100000) }]
      }
    ]);

    await getCommissions(mockReq as Request, mockRes as Response);

    const response = jsonMock.mock.calls[0][0];
    const grabStats = response.commissions.find((c: any) => c.channelName === 'GrabFood');
    
    expect(grabStats.grossRevenue).toBe(100000);
    // 20% of 100k = 20k
    expect(grabStats.totalCommission).toBe(20000);
    expect(grabStats.totalFlatFee).toBe(0);
    // Net = 100k - 20k = 80k
    expect(grabStats.netSettlement).toBe(80000);
  });

  it('calculates GoFood commission correctly (20%, flat 1000)', async () => {
    (prisma.order.findMany as any).mockResolvedValue([
      {
        channel: { name: 'GoFood', commissionPct: new Prisma.Decimal(20), flatFee: new Prisma.Decimal(1000), settlesTo: 'GoBiz' },
        items: [{ lineTotal: new Prisma.Decimal(100000) }]
      }
    ]);

    await getCommissions(mockReq as Request, mockRes as Response);

    const response = jsonMock.mock.calls[0][0];
    const goFoodStats = response.commissions.find((c: any) => c.channelName === 'GoFood');
    
    expect(goFoodStats.grossRevenue).toBe(100000);
    expect(goFoodStats.totalCommission).toBe(20000);
    expect(goFoodStats.totalFlatFee).toBe(1000); // 1000 flat fee per order
    // Net = 100k - 20k - 1k = 79k
    expect(goFoodStats.netSettlement).toBe(79000);
  });

  it('aggregates multiple orders correctly', async () => {
    (prisma.order.findMany as any).mockResolvedValue([
      {
        channel: { name: 'ShopeeFood', commissionPct: new Prisma.Decimal(25), flatFee: new Prisma.Decimal(0), settlesTo: 'ShopeePay' },
        items: [{ lineTotal: new Prisma.Decimal(40000) }] // net 30000
      },
      {
        channel: { name: 'ShopeeFood', commissionPct: new Prisma.Decimal(25), flatFee: new Prisma.Decimal(0), settlesTo: 'ShopeePay' },
        items: [{ lineTotal: new Prisma.Decimal(80000) }] // net 60000
      }
    ]);

    await getCommissions(mockReq as Request, mockRes as Response);

    const response = jsonMock.mock.calls[0][0];
    const shopeeStats = response.commissions.find((c: any) => c.channelName === 'ShopeeFood');
    
    expect(shopeeStats.orderCount).toBe(2);
    expect(shopeeStats.grossRevenue).toBe(120000);
    expect(shopeeStats.totalCommission).toBe(30000);
    expect(shopeeStats.netSettlement).toBe(90000);

    expect(response.summary.totalGross).toBe(120000);
    expect(response.summary.totalNet).toBe(90000);
  });
});

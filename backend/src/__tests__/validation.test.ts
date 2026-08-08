import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { createOrder } from '../controllers/order.controller';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

vi.mock('../lib/prisma', () => ({
  prisma: {
    outlet: { findUnique: vi.fn() },
    channel: { findUnique: vi.fn() },
    order: { count: vi.fn(), create: vi.fn() }
  }
}));

describe('Order Validation', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockReq = {
      user: { id: 'user1', outletId: 'outlet1', role: 'KASIR', name: 'Test' },
      body: {
        channelId: 'channel1',
        customerData: 'Test',
        items: []
      }
    };
  });

  it('fails if channel is missing', async () => {
    mockReq.body.channelId = undefined;

    await createOrder(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock.mock.calls[0][0].message).toContain('Validation error');
  });

  it('fails if items are empty', async () => {
    mockReq.body.items = [];

    await createOrder(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock.mock.calls[0][0].message).toContain('Validation error');
  });

  it('fails if productType is missing from an item', async () => {
    mockReq.body.items = [{ toppingId: 'top1', qty: 1 }]; // Missing productType

    await createOrder(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
  });
});

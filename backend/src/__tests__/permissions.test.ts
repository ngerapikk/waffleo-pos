import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireRole } from '../middlewares/auth.middleware';
import { Request, Response, NextFunction } from 'express';

describe('Permissions Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextMock: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      user: { id: 'user1', outletId: 'outlet1', role: 'KASIR', name: 'Test' },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextMock = vi.fn();
  });

  it('allows access if role matches exactly', () => {
    const middleware = requireRole(['KASIR']);
    middleware(mockReq as Request, mockRes as Response, nextMock);
    
    expect(nextMock).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('allows access if role is included in allowed roles', () => {
    const middleware = requireRole(['SUPERVISOR', 'KASIR']);
    middleware(mockReq as Request, mockRes as Response, nextMock);
    
    expect(nextMock).toHaveBeenCalled();
  });

  it('blocks access if role is not allowed', () => {
    const middleware = requireRole(['ADMIN', 'SUPERVISOR']);
    middleware(mockReq as Request, mockRes as Response, nextMock);
    
    expect(nextMock).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'FORBIDDEN', message: 'Insufficient role permissions' }));
  });

  it('blocks access if user is missing', () => {
    mockReq.user = undefined;
    const middleware = requireRole(['KASIR']);
    middleware(mockReq as Request, mockRes as Response, nextMock);
    
    expect(nextMock).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});

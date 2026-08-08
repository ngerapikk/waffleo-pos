import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class AuditController {
  static async getAuditLogs(req: Request, res: Response) {
    try {
      const logs = await prisma.auditLog.findMany({
        include: {
          actor: {
            select: {
              fullName: true,
              role: true
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 100 // Limit to last 100 logs for performance
      });

      return res.status(200).json(logs);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      return res.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch audit logs' });
    }
  }
}

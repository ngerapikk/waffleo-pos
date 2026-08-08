import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid username or password' });
      return;
    }

    if (!user.active) {
      res.status(403).json({ code: 'FORBIDDEN', message: 'Account is inactive' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid username or password' });
      return;
    }

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'waffleo-pos-jwt-secret-change-in-production';
    // Remove process.env.JWT_EXPIRY fallback to hardcoded string literal because jwt.sign types are weird with `string | undefined`
    const expiresIn = (process.env.JWT_EXPIRY as any) || '12h';
    const payload = { id: user.id, role: user.role, name: user.fullName, outletId: user.outletId };
    const token = jwt.sign(payload, secret, { expiresIn });

    // Write Audit Trail
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'AUTH_LOGIN',
        entityType: 'User',
        entityId: user.id,
        afterValue: { ip: req.ip, userAgent: req.headers['user-agent'] },
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.fullName,
        role: user.role,
        outletId: user.outletId,
      },
    });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        outletId: true,
        active: true,
      },
    });

    if (!user) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
      return;
    }

    res.json({ user });
  })
);

export default router;


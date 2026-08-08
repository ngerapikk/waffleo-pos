import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

const toJson = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v ?? null));

// ─────────────── Schemas ───────────────

const createUserSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'KASIR']),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'KASIR']).optional(),
  active: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password minimal 6 karakter'),
});

const branchSchema = z.object({
  name: z.string().min(1).optional(),
  branchCode: z.string().min(1).optional(),
  address: z.string().optional(),
  timezone: z.string().optional(),
});

// ─────────────── Users ───────────────

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const outletId = String(req.user!.outletId);
  const users = await prisma.user.findMany({
    where: { outletId },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
  });
  res.json(users);
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const outletId = String(req.user!.outletId);
  const data = createUserSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) {
    res.status(409).json({ code: 'CONFLICT', message: 'Username sudah digunakan' });
    return;
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      username: data.username,
      passwordHash,
      fullName: data.fullName,
      role: data.role,
      outletId,
    },
    select: { id: true, username: true, fullName: true, role: true, active: true, createdAt: true },
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'USER_CREATE',
      entityType: 'User',
      entityId: user.id,
      afterValue: toJson({ username: user.username, role: user.role }),
    },
  });
  res.status(201).json(user);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const id = String(req.params.id);
  const data = updateUserSchema.parse(req.body);
  const before = await prisma.user.findUnique({ where: { id }, select: { role: true, active: true, fullName: true } });
  if (!before) { res.status(404).json({ message: 'User tidak ditemukan' }); return; }
  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, fullName: true, role: true, active: true, updatedAt: true },
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'USER_UPDATE',
      entityType: 'User',
      entityId: id,
      beforeValue: toJson(before),
      afterValue: toJson(data),
    },
  });
  res.json(user);
});

export const resetUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const id = String(req.params.id);
  const { newPassword } = resetPasswordSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'USER_RESET_PASSWORD',
      entityType: 'User',
      entityId: id,
      afterValue: toJson({ note: 'Password was reset by admin' }),
    },
  });
  res.json({ message: 'Password berhasil direset' });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const id = String(req.params.id);
  if (id === actorId) {
    res.status(400).json({ code: 'BAD_REQUEST', message: 'Tidak bisa menghapus akun sendiri' });
    return;
  }
  const before = await prisma.user.findUnique({ where: { id }, select: { username: true, role: true } });
  if (!before) { res.status(404).json({ message: 'User tidak ditemukan' }); return; }
  await prisma.user.update({ where: { id }, data: { active: false } });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'USER_DEACTIVATE',
      entityType: 'User',
      entityId: id,
      beforeValue: toJson(before),
      afterValue: toJson({ active: false }),
    },
  });
  res.json({ message: 'User dinonaktifkan' });
});

// ─────────────── Branch ───────────────

export const getBranch = asyncHandler(async (req: Request, res: Response) => {
  const outletId = String(req.user!.outletId);
  const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
  if (!outlet) { res.status(404).json({ message: 'Outlet tidak ditemukan' }); return; }
  res.json(outlet);
});

export const updateBranch = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const outletId = String(req.user!.outletId);
  const data = branchSchema.parse(req.body);
  const before = await prisma.outlet.findUnique({ where: { id: outletId } });
  const outlet = await prisma.outlet.update({ where: { id: outletId }, data });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'BRANCH_UPDATE',
      entityType: 'Outlet',
      entityId: outlet.id,
      beforeValue: toJson(before),
      afterValue: toJson(data),
    },
  });
  res.json(outlet);
});

// ─────────────── System Config ───────────────

const SYSTEM_CONFIG_KEY = 'systemConfig';

export const getSystemConfig = asyncHandler(async (req: Request, res: Response) => {
  const outletId = String(req.user!.outletId);
  const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
  const defaults = {
    outletName: outlet?.name ?? 'Waffleo',
    receiptFooter: 'Terima kasih telah memesan di Waffleo! 🧇',
    orderIdPrefix: outlet?.branchCode ?? '001',
    printerIp: '',
    printerPort: 9100,
    autoOpenDrawer: false,
    showLogoOnReceipt: true,
    lowStockThreshold: 500,
    backupEmail: '',
    operationalStart: '09:00',
    operationalEnd: '21:00',
    maxOpenOrders: 20,
    defaultChannel: 'Walk In',
  };
  res.json(defaults);
});

export const updateSystemConfig = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const outletId = String(req.user!.outletId);
  const allowed = z.object({
    outletName: z.string().optional(),
    receiptFooter: z.string().optional(),
    orderIdPrefix: z.string().optional(),
    printerIp: z.string().optional(),
    printerPort: z.number().int().min(1).max(65535).optional(),
    autoOpenDrawer: z.boolean().optional(),
    showLogoOnReceipt: z.boolean().optional(),
    lowStockThreshold: z.number().nonnegative().optional(),
    backupEmail: z.string().email().or(z.literal('')).optional(),
    operationalStart: z.string().optional(),
    operationalEnd: z.string().optional(),
    maxOpenOrders: z.number().int().min(1).optional(),
    defaultChannel: z.string().optional(),
  });
  const data = allowed.parse(req.body);

  // Sync relevant fields back to outlet record
  const update: Record<string, unknown> = {};
  if (data.outletName) update.name = data.outletName;
  if (data.orderIdPrefix) update.branchCode = data.orderIdPrefix;
  if (Object.keys(update).length > 0) {
    await prisma.outlet.update({ where: { id: outletId }, data: update });
  }

  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'SYSTEM_CONFIG_UPDATE',
      entityType: 'Outlet',
      entityId: outletId,
      afterValue: toJson({ [SYSTEM_CONFIG_KEY]: data }),
    },
  });

  res.json({ message: 'Konfigurasi sistem berhasil disimpan', config: data });
});

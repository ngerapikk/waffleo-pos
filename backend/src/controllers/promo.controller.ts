import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { PromoType } from '@prisma/client';

// We use Prisma's Json type, which requires values to be mapped to a format Prisma accepts.
// A helper to serialize objects for AuditLog
const toJson = (obj: any) => JSON.parse(JSON.stringify(obj));

const rulePayloadSchema = z.record(z.string(), z.any());

const promoSchema = z.object({
  name: z.string().min(1, "Nama promo wajib diisi"),
  promoType: z.nativeEnum(PromoType),
  rulePayload: rulePayloadSchema,
  validFrom: z.string().nullable().optional(),
  validTo: z.string().nullable().optional(),
  applicableChannels: z.array(z.string()),
  active: z.boolean(),
});

export const getPromos = async (req: Request, res: Response): Promise<void> => {
  try {
    const promos = await prisma.discount.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(promos);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Gagal mengambil promo' });
  }
};

export const createPromo = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = promoSchema.parse(req.body);
    const userId = req.user!.id;

    // Additional validation could be added here depending on promoType.
    if (data.promoType === 'VOUCHER_CODE') {
      const payload: any = data.rulePayload;
      if (!payload.code) {
        res.status(400).json({ message: 'Kode voucher wajib diisi untuk tipe VOUCHER_CODE' });
        return;
      }
      payload.code = payload.code.toUpperCase();
      
      // Since JSON querying in Prisma depends on DB type, fallback to JS filter for uniqueness
      const existing = await prisma.discount.findMany({
        where: { promoType: 'VOUCHER_CODE' }
      });
      const exists = existing.find(d => (d.rulePayload as any)?.code === payload.code);
      
      if (exists) {
        res.status(400).json({ message: 'Kode voucher sudah digunakan oleh promo lain' });
        return;
      }
      data.rulePayload = payload;
    }

    const newPromo = await prisma.$transaction(async (tx) => {
      const promo = await tx.discount.create({
        data: {
          name: data.name,
          promoType: data.promoType,
          rulePayload: data.rulePayload as any,
          validFrom: data.validFrom ? new Date(data.validFrom) : null,
          validTo: data.validTo ? new Date(data.validTo) : null,
          applicableChannels: data.applicableChannels,
          active: data.active,
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'CREATE_PROMO',
          entityType: 'discount',
          entityId: promo.id,
          afterValue: toJson(promo),
        }
      });

      return promo;
    });

    res.status(201).json(newPromo);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: (error as any).errors });
    } else {
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }
};

export const updatePromo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = promoSchema.parse(req.body);
    const userId = req.user!.id;

    const existingPromo = await prisma.discount.findUnique({ where: { id } });
    if (!existingPromo) {
      res.status(404).json({ message: 'Promo tidak ditemukan' });
      return;
    }

    if (data.promoType === 'VOUCHER_CODE') {
      const payload: any = data.rulePayload;
      if (!payload.code) {
        res.status(400).json({ message: 'Kode voucher wajib diisi untuk tipe VOUCHER_CODE' });
        return;
      }
      payload.code = payload.code.toUpperCase();
      
      const existing = await prisma.discount.findMany({
        where: { promoType: 'VOUCHER_CODE' }
      });
      const exists = existing.find(d => (d.rulePayload as any)?.code === payload.code && d.id !== id);
      
      if (exists) {
        res.status(400).json({ message: 'Kode voucher sudah digunakan oleh promo lain' });
        return;
      }
      data.rulePayload = payload;
    }

    const updatedPromo = await prisma.$transaction(async (tx) => {
      const promo = await tx.discount.update({
        where: { id },
        data: {
          name: data.name,
          promoType: data.promoType,
          rulePayload: data.rulePayload as any,
          validFrom: data.validFrom ? new Date(data.validFrom) : null,
          validTo: data.validTo ? new Date(data.validTo) : null,
          applicableChannels: data.applicableChannels,
          active: data.active,
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'UPDATE_PROMO',
          entityType: 'discount',
          entityId: promo.id,
          beforeValue: toJson(existingPromo),
          afterValue: toJson(promo),
        }
      });

      return promo;
    });

    res.json(updatedPromo);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: (error as any).errors });
    } else {
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }
};

export const deletePromo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const existingPromo = await prisma.discount.findUnique({ where: { id } });
    if (!existingPromo) {
      res.status(404).json({ message: 'Promo tidak ditemukan' });
      return;
    }

    const usedInOrders = await prisma.order.findFirst({ where: { discountId: id } });
    if (usedInOrders) {
      res.status(400).json({ message: 'Promo sudah digunakan pada pesanan dan tidak dapat dihapus. Silakan nonaktifkan promo ini.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.discount.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'DELETE_PROMO',
          entityType: 'discount',
          entityId: id,
          beforeValue: toJson(existingPromo),
        }
      });
    });

    res.json({ message: 'Promo berhasil dihapus' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Gagal menghapus promo' });
  }
};

export const validateVoucher = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ message: 'Kode voucher harus disertakan' });
      return;
    }

    const discounts = await prisma.discount.findMany({
      where: {
        promoType: 'VOUCHER_CODE',
        active: true,
      }
    });
    
    const validPromo = discounts.find((d) => {
      const payload: any = d.rulePayload;
      return payload && payload.code === code.toUpperCase();
    });

    if (!validPromo) {
      res.status(404).json({ message: 'Voucher tidak ditemukan atau sudah tidak aktif' });
      return;
    }

    res.json(validPromo);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Gagal validasi voucher' });
  }
};

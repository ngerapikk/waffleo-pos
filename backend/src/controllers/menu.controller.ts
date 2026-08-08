import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import { Prisma, ToppingSeries } from '@prisma/client';
import { prisma } from '../lib/prisma';

// Cast any value to Prisma InputJsonValue (safe for beforeValue/afterValue)
const toJson = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v ?? null));

// ─────────────── Schemas ───────────────

const toppingSchema = z.object({
  name: z.string().min(1),
  series: z.nativeEnum(ToppingSeries),
  priceDirect: z.number().nonnegative(),
  priceGrabGo: z.number().nonnegative(),
  priceShopee: z.number().nonnegative(),
  gramPerPortion: z.number().nonnegative(),
  sortOrder: z.number().int().optional(),
});

const flavourSchema = z.object({
  name: z.string().min(1),
  extraPriceDirect: z.number().nonnegative(),
  extraPriceOnline: z.number().nonnegative(),
  ingredientUsage: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const addonSchema = z.object({
  name: z.string().min(1),
  extraPriceDirect: z.number().nonnegative(),
  extraPriceOnline: z.number().nonnegative(),
  usagePerPortion: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const drinkSchema = z.object({
  name: z.string().min(1),
  drinkType: z.string().min(1),
  priceDirect: z.number().nonnegative(),
  priceGrabGo: z.number().nonnegative(),
  priceShopee: z.number().nonnegative(),
  sortOrder: z.number().int().optional(),
});

// ─────────────── Menu Catalog (POS) ───────────────

export const getMenuCatalog = async (req: Request, res: Response) => {
  try {
    const [toppings, drinks, flavours, addons, sweetness, icedLevels] = await Promise.all([
      prisma.toppingUtama.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.drink.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.flavour.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.addon.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.sweetnessLevel.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.icedLevel.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    res.json({ toppings, drinks, flavours, addons, sweetness, icedLevels });
  } catch (error) {
    console.error('[Menu Controller] Error fetching menu catalog:', error);
    res.status(500).json({ message: 'Failed to fetch menu catalog' });
  }
};

// ─────────────── Toppings CRUD ───────────────

export const getToppings = asyncHandler(async (_req: Request, res: Response) => {
  const items = await prisma.toppingUtama.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(items);
});

export const createTopping = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const data = toppingSchema.parse(req.body);
  const item = await prisma.toppingUtama.create({ data });
  await prisma.auditLog.create({ data: { actorId, action: 'MENU_TOPPING_CREATE', entityType: 'ToppingUtama', entityId: item.id, afterValue: toJson(data) } });
  res.status(201).json(item);
});

export const updateTopping = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const id = String(req.params.id);
  const data = toppingSchema.partial().parse(req.body);
  const before = await prisma.toppingUtama.findUnique({ where: { id } });
  const item = await prisma.toppingUtama.update({ where: { id }, data });
  await prisma.auditLog.create({ data: { actorId, action: 'MENU_TOPPING_UPDATE', entityType: 'ToppingUtama', entityId: id, beforeValue: toJson(before), afterValue: toJson(data) } });
  res.json(item);
});

export const toggleTopping = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const id = String(req.params.id);
  const before = await prisma.toppingUtama.findUnique({ where: { id } });
  if (!before) { res.status(404).json({ message: 'Not found' }); return; }
  const item = await prisma.toppingUtama.update({ where: { id }, data: { active: !before.active } });
  await prisma.auditLog.create({ data: { actorId, action: 'MENU_TOPPING_TOGGLE', entityType: 'ToppingUtama', entityId: id, beforeValue: toJson({ active: before.active }), afterValue: toJson({ active: item.active }) } });
  res.json(item);
});

// ─────────────── Flavours CRUD ───────────────

export const getFlavours = asyncHandler(async (_req: Request, res: Response) => {
  const items = await prisma.flavour.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(items);
});

export const createFlavour = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const data = flavourSchema.parse(req.body);
  const item = await prisma.flavour.create({ data });
  await prisma.auditLog.create({ data: { actorId, action: 'MENU_FLAVOUR_CREATE', entityType: 'Flavour', entityId: item.id, afterValue: toJson(data) } });
  res.status(201).json(item);
});

export const updateFlavour = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const id = String(req.params.id);
  const data = flavourSchema.partial().parse(req.body);
  const before = await prisma.flavour.findUnique({ where: { id } });
  const item = await prisma.flavour.update({ where: { id }, data });
  await prisma.auditLog.create({ data: { actorId, action: 'MENU_FLAVOUR_UPDATE', entityType: 'Flavour', entityId: id, beforeValue: toJson(before), afterValue: toJson(data) } });
  res.json(item);
});

export const toggleFlavour = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const id = String(req.params.id);
  const before = await prisma.flavour.findUnique({ where: { id } });
  if (!before) { res.status(404).json({ message: 'Not found' }); return; }
  const item = await prisma.flavour.update({ where: { id }, data: { active: !before.active } });
  await prisma.auditLog.create({ data: { actorId, action: 'MENU_FLAVOUR_TOGGLE', entityType: 'Flavour', entityId: id, beforeValue: toJson({ active: before.active }), afterValue: toJson({ active: item.active }) } });
  res.json(item);
});

// ─────────────── Addons CRUD ───────────────

export const getAddons = asyncHandler(async (_req: Request, res: Response) => {
  const items = await prisma.addon.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(items);
});

export const createAddon = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const data = addonSchema.parse(req.body);
  const item = await prisma.addon.create({ data });
  await prisma.auditLog.create({ data: { actorId, action: 'MENU_ADDON_CREATE', entityType: 'Addon', entityId: item.id, afterValue: toJson(data) } });
  res.status(201).json(item);
});

export const updateAddon = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const id = String(req.params.id);
  const data = addonSchema.partial().parse(req.body);
  const before = await prisma.addon.findUnique({ where: { id } });
  const item = await prisma.addon.update({ where: { id }, data });
  await prisma.auditLog.create({ data: { actorId, action: 'MENU_ADDON_UPDATE', entityType: 'Addon', entityId: id, beforeValue: toJson(before), afterValue: toJson(data) } });
  res.json(item);
});

export const toggleAddon = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const id = String(req.params.id);
  const before = await prisma.addon.findUnique({ where: { id } });
  if (!before) { res.status(404).json({ message: 'Not found' }); return; }
  const item = await prisma.addon.update({ where: { id }, data: { active: !before.active } });
  await prisma.auditLog.create({ data: { actorId, action: 'MENU_ADDON_TOGGLE', entityType: 'Addon', entityId: id, beforeValue: toJson({ active: before.active }), afterValue: toJson({ active: item.active }) } });
  res.json(item);
});

// ─────────────── Drinks CRUD ───────────────

export const getDrinks = asyncHandler(async (_req: Request, res: Response) => {
  const items = await prisma.drink.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(items);
});

export const createDrink = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const data = drinkSchema.parse(req.body);
  const item = await prisma.drink.create({ data });
  await prisma.auditLog.create({ data: { actorId, action: 'MENU_DRINK_CREATE', entityType: 'Drink', entityId: item.id, afterValue: toJson(data) } });
  res.status(201).json(item);
});

export const updateDrink = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const id = String(req.params.id);
  const data = drinkSchema.partial().parse(req.body);
  const before = await prisma.drink.findUnique({ where: { id } });
  const item = await prisma.drink.update({ where: { id }, data });
  await prisma.auditLog.create({ data: { actorId, action: 'MENU_DRINK_UPDATE', entityType: 'Drink', entityId: id, beforeValue: toJson(before), afterValue: toJson(data) } });
  res.json(item);
});

export const toggleDrink = asyncHandler(async (req: Request, res: Response) => {
  const actorId = String(req.user!.id);
  const id = String(req.params.id);
  const before = await prisma.drink.findUnique({ where: { id } });
  if (!before) { res.status(404).json({ message: 'Not found' }); return; }
  const item = await prisma.drink.update({ where: { id }, data: { active: !before.active } });
  await prisma.auditLog.create({ data: { actorId, action: 'MENU_DRINK_TOGGLE', entityType: 'Drink', entityId: id, beforeValue: toJson({ active: before.active }), afterValue: toJson({ active: item.active }) } });
  res.json(item);
});

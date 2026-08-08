// WAFFLEO POS — Seed Script
// Populates all master data from Claude.md §F.2–F.4
// Run with: npm run prisma:seed

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/waffleo_pos?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🧹 Clearing existing data...');
  // Clear in dependency order
  await prisma.auditLog.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockConversion.deleteMany();
  await prisma.orderItemAddon.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.orderEditLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.user.deleteMany();
  await prisma.toppingUtama.deleteMany();
  await prisma.flavour.deleteMany();
  await prisma.addon.deleteMany();
  await prisma.drink.deleteMany();
  await prisma.sweetnessLevel.deleteMany();
  await prisma.icedLevel.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.outlet.deleteMany();

  // ================================================================
  // 1. OUTLET (Claude.md §F.1)
  // ================================================================
  console.log('🏪 Seeding outlet...');
  const outlet = await prisma.outlet.create({
    data: {
      name: 'Waffleo Gabek',
      branchCode: '001',
      address: 'Jl. Gabek',
      timezone: 'Asia/Jakarta',
    },
  });

  // ================================================================
  // 2. USERS (Claude.md §D)
  // ================================================================
  console.log('👤 Seeding users...');
  const adminPassword = process.env.ADMIN_PASSWORD || 'WaffleoAdmin2026!';
  const kasirPassword = process.env.KASIR_PASSWORD || 'KasirWaffleo123';
  const supervisorPassword = process.env.SUPERVISOR_PASSWORD || 'SpvWaffleo123';

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const kasirHash = await bcrypt.hash(kasirPassword, 10);
  const supervisorHash = await bcrypt.hash(supervisorPassword, 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash,
      fullName: 'Admin User',
      role: 'ADMIN',
      outletId: outlet.id,
    },
  });

  await prisma.user.create({
    data: {
      username: 'supervisor',
      passwordHash: supervisorHash,
      fullName: 'Siti Supervisor',
      role: 'SUPERVISOR',
      outletId: outlet.id,
    },
  });

  await prisma.user.create({
    data: {
      username: 'kasir',
      passwordHash: kasirHash,
      fullName: 'Budi Kasir',
      role: 'KASIR',
      outletId: outlet.id,
    },
  });

  // ================================================================
  // 3. CHANNELS (Claude.md §F.2 — Channels & Settlement)
  // ================================================================
  console.log('📡 Seeding channels...');
  const channelsData = [
    { name: 'Walk In',     priceTier: 'Direct',  commissionPct: 0,  flatFee: 0,    settlesTo: 'Cash drawer',            isPlatform: false, customerPrefix: null,   sortOrder: 0 },
    { name: 'WhatsApp',    priceTier: 'Direct',  commissionPct: 0,  flatFee: 0,    settlesTo: 'Cash drawer / Transfer', isPlatform: false, customerPrefix: null,   sortOrder: 1 },
    { name: 'Instagram',   priceTier: 'Direct',  commissionPct: 0,  flatFee: 0,    settlesTo: 'Cash drawer / Transfer', isPlatform: false, customerPrefix: null,   sortOrder: 2 },
    { name: 'GrabFood',    priceTier: 'GrabGo',  commissionPct: 20, flatFee: 0,    settlesTo: 'BCA (auto)',             isPlatform: true,  customerPrefix: 'GF - ', sortOrder: 3 },
    { name: 'GoFood',      priceTier: 'GrabGo',  commissionPct: 20, flatFee: 1000, settlesTo: 'BCA (auto)',             isPlatform: true,  customerPrefix: 'F - ',  sortOrder: 4 },
    { name: 'ShopeeFood',  priceTier: 'Shopee',  commissionPct: 25, flatFee: 0,    settlesTo: 'BCA (auto)',             isPlatform: true,  customerPrefix: '# ',    sortOrder: 5 },
  ];

  const channels: Record<string, any> = {};
  for (const ch of channelsData) {
    channels[ch.name] = await prisma.channel.create({ data: ch });
  }

  // ================================================================
  // 4. TOPPING UTAMA (Claude.md §F.2 — 12 items)
  // ================================================================
  console.log('🧇 Seeding toppings...');
  const toppingsData = [
    { name: 'Polos',            series: 'SPREAD' as const,  priceDirect: 13000, priceGrabGo: 17000, priceShopee: 17500, gramPerPortion: 0,  sortOrder: 0 },
    { name: 'Chocolate',        series: 'SPREAD' as const,  priceDirect: 18000, priceGrabGo: 22500, priceShopee: 24000, gramPerPortion: 55, sortOrder: 1 },
    { name: 'Tiramisu',         series: 'SPREAD' as const,  priceDirect: 18000, priceGrabGo: 22500, priceShopee: 24000, gramPerPortion: 55, sortOrder: 2 },
    { name: 'Greentea',         series: 'SPREAD' as const,  priceDirect: 18000, priceGrabGo: 22500, priceShopee: 24000, gramPerPortion: 55, sortOrder: 3 },
    { name: 'Taro',             series: 'SPREAD' as const,  priceDirect: 18000, priceGrabGo: 22500, priceShopee: 24000, gramPerPortion: 55, sortOrder: 4 },
    { name: 'Cappuccino',       series: 'SPREAD' as const,  priceDirect: 19000, priceGrabGo: 24000, priceShopee: 26000, gramPerPortion: 55, sortOrder: 5 },
    { name: 'Strawberry',       series: 'SPREAD' as const,  priceDirect: 18000, priceGrabGo: 22500, priceShopee: 24000, gramPerPortion: 80, sortOrder: 6 },  // Exception: 80g
    { name: 'Blueberry',        series: 'SPREAD' as const,  priceDirect: 18000, priceGrabGo: 22500, priceShopee: 24000, gramPerPortion: 80, sortOrder: 7 },  // Exception: 80g
    { name: 'Choco Crunchy',    series: 'CRUNCHY' as const, priceDirect: 20000, priceGrabGo: 25000, priceShopee: 27000, gramPerPortion: 80, sortOrder: 8 },
    { name: 'Tiramisu Crunchy', series: 'CRUNCHY' as const, priceDirect: 20000, priceGrabGo: 25000, priceShopee: 27000, gramPerPortion: 80, sortOrder: 9 },
    { name: 'Hazelnut',         series: 'PREMIUM' as const, priceDirect: 25000, priceGrabGo: 31500, priceShopee: 34000, gramPerPortion: 80, sortOrder: 10 },
    { name: 'Ovomaltine',       series: 'PREMIUM' as const, priceDirect: 36000, priceGrabGo: 45000, priceShopee: 48000, gramPerPortion: 80, sortOrder: 11 },
  ];

  const toppings: Record<string, any> = {};
  for (const t of toppingsData) {
    toppings[t.name] = await prisma.toppingUtama.create({ data: t });
  }

  // ================================================================
  // 5. FLAVOURS (Claude.md §F.2 — 5 items)
  // ================================================================
  console.log('🎨 Seeding flavours...');
  const flavoursData = [
    { name: 'Original',    extraPriceDirect: 0,    extraPriceOnline: 0,    ingredientUsage: null,                sortOrder: 0 },
    { name: 'Pandan',      extraPriceDirect: 2000, extraPriceOnline: 3000, ingredientUsage: '3g Perisa Pandan',  sortOrder: 1 },
    { name: 'Redvelvet',   extraPriceDirect: 2000, extraPriceOnline: 3000, ingredientUsage: '3g Perisa Redvelvet', sortOrder: 2 },
    { name: 'Blackforest', extraPriceDirect: 2000, extraPriceOnline: 3000, ingredientUsage: '3g Perisa Blackforest', sortOrder: 3 },
    { name: 'Mocca',       extraPriceDirect: 2000, extraPriceOnline: 3000, ingredientUsage: '3g Perisa Mocca',   sortOrder: 4 },
  ];

  const flavours: Record<string, any> = {};
  for (const f of flavoursData) {
    flavours[f.name] = await prisma.flavour.create({ data: f });
  }

  // ================================================================
  // 6. ADD-ONS (Claude.md §F.2 — 4 items)
  // ================================================================
  console.log('➕ Seeding add-ons...');
  const addonsData = [
    { name: 'Meses',             extraPriceDirect: 2000, extraPriceOnline: 3000, usagePerPortion: '25g',  sortOrder: 0 },
    { name: 'Chocochip',         extraPriceDirect: 4000, extraPriceOnline: 5000, usagePerPortion: '30g',  sortOrder: 1 },
    { name: 'Keju Parut',        extraPriceDirect: 6000, extraPriceOnline: 7000, usagePerPortion: '1 pc', sortOrder: 2 },
    { name: 'Keju dalam Waffle', extraPriceDirect: 6000, extraPriceOnline: 7000, usagePerPortion: '1 pc', sortOrder: 3 },
  ];

  const addons: Record<string, any> = {};
  for (const a of addonsData) {
    addons[a.name] = await prisma.addon.create({ data: a });
  }

  // ================================================================
  // 7. DRINKS (Claude.md §F.2 — 7 items)
  // ================================================================
  console.log('🥤 Seeding drinks...');
  const drinksData = [
    { name: 'Iced Latte',          drinkType: 'Coffee',     priceDirect: 15000, priceGrabGo: 18750, priceShopee: 20000, sortOrder: 0 },
    { name: 'Iced Aren Latte',     drinkType: 'Coffee',     priceDirect: 16000, priceGrabGo: 20000, priceShopee: 22000, sortOrder: 1 },
    { name: 'Iced Caramel Latte',  drinkType: 'Coffee',     priceDirect: 20000, priceGrabGo: 25000, priceShopee: 27000, sortOrder: 2 },
    { name: 'Iced Hazelnut Latte', drinkType: 'Coffee',     priceDirect: 20000, priceGrabGo: 25000, priceShopee: 27000, sortOrder: 3 },
    { name: 'Iced Chocolate',      drinkType: 'Non-Coffee', priceDirect: 15000, priceGrabGo: 18750, priceShopee: 20000, sortOrder: 4 },
    { name: 'Cookies & Cream',     drinkType: 'Non-Coffee', priceDirect: 15000, priceGrabGo: 18750, priceShopee: 20000, sortOrder: 5 },
    { name: 'Matcha Latte',        drinkType: 'Non-Coffee', priceDirect: 20000, priceGrabGo: 25000, priceShopee: 27000, sortOrder: 6 },
  ];

  const drinks: Record<string, any> = {};
  for (const d of drinksData) {
    drinks[d.name] = await prisma.drink.create({ data: d });
  }

  // ================================================================
  // 8. SWEETNESS LEVELS (Claude.md §F.2)
  // ================================================================
  console.log('🍯 Seeding sweetness levels...');
  await prisma.sweetnessLevel.createMany({
    data: [
      { name: 'Normal', percentage: 100, sortOrder: 0 },
      { name: 'Less',   percentage: 75,  sortOrder: 1 },
      { name: 'Half',   percentage: 50,  sortOrder: 2 },
      { name: 'Low',    percentage: 25,  sortOrder: 3 },
      { name: 'No',     percentage: 0,   sortOrder: 4 },
    ],
  });

  // ================================================================
  // 9. ICED LEVELS (Claude.md §F.2)
  // ================================================================
  console.log('🧊 Seeding iced levels...');
  await prisma.icedLevel.createMany({
    data: [
      { name: 'Normal', percentage: 100, sortOrder: 0 },
      { name: 'Less',   percentage: 50,  sortOrder: 1 },
      { name: 'No',     percentage: 0,   sortOrder: 2 },
    ],
  });

  // ================================================================
  // 10. INGREDIENTS (Claude.md §F.4 — Raw Materials)
  // ================================================================
  console.log('📦 Seeding ingredients...');
  const ingredientsData = [
    // Waffle batter base
    { name: 'Tepung Terigu',               unit: 'g',    packageSize: '1kg',    ingredientGroup: 'Waffle Batter Base',    currentStock: 10000 },
    { name: 'Maizena',                     unit: 'g',    packageSize: '1kg',    ingredientGroup: 'Waffle Batter Base',    currentStock: 5000 },
    { name: 'Gula Pasir',                  unit: 'g',    packageSize: '1kg',    ingredientGroup: 'Waffle Batter Base',    currentStock: 5000 },
    { name: 'Baking Powder',               unit: 'g',    packageSize: '450g',   ingredientGroup: 'Waffle Batter Base',    currentStock: 900 },
    { name: 'Telur',                       unit: 'butir', packageSize: null,    ingredientGroup: 'Waffle Batter Base',    currentStock: 60 },
    { name: 'Minyak',                      unit: 'g',    packageSize: '1L',     ingredientGroup: 'Waffle Batter Base',    currentStock: 2000 },
    { name: 'Perisa Vanilla',              unit: 'g',    packageSize: '500g',   ingredientGroup: 'Waffle Batter Base',    currentStock: 500 },
    { name: 'Susu Evaporasi Tiga Sapi',    unit: 'g',    packageSize: '500g',   ingredientGroup: 'Waffle Batter Base',    currentStock: 1000 },
    // Flavour essences
    { name: 'Perisa Pandan',               unit: 'g',    packageSize: '500g',   ingredientGroup: 'Flavour Essences',      currentStock: 500 },
    { name: 'Perisa Redvelvet',            unit: 'g',    packageSize: '500g',   ingredientGroup: 'Flavour Essences',      currentStock: 500 },
    { name: 'Perisa Blackforest',          unit: 'g',    packageSize: '500g',   ingredientGroup: 'Flavour Essences',      currentStock: 500 },
    { name: 'Perisa Mocca',                unit: 'g',    packageSize: '500g',   ingredientGroup: 'Flavour Essences',      currentStock: 500 },
    // Toppings (stored per gram, package in btl/bks)
    { name: 'Topping Chocolate',           unit: 'g',    packageSize: '1kg',    ingredientGroup: 'Toppings',              currentStock: 2000 },
    { name: 'Topping Tiramisu',            unit: 'g',    packageSize: '1kg',    ingredientGroup: 'Toppings',              currentStock: 2000 },
    { name: 'Topping Greentea',            unit: 'g',    packageSize: '1kg',    ingredientGroup: 'Toppings',              currentStock: 2000 },
    { name: 'Topping Taro',               unit: 'g',    packageSize: '1kg',    ingredientGroup: 'Toppings',              currentStock: 2000 },
    { name: 'Topping Cappuccino',          unit: 'g',    packageSize: '1kg',    ingredientGroup: 'Toppings',              currentStock: 2000 },
    { name: 'Topping Strawberry',          unit: 'g',    packageSize: '1kg',    ingredientGroup: 'Toppings',              currentStock: 2000 },
    { name: 'Topping Blueberry',           unit: 'g',    packageSize: '1kg',    ingredientGroup: 'Toppings',              currentStock: 2000 },
    { name: 'Topping Choco Crunchy',       unit: 'g',    packageSize: '1kg',    ingredientGroup: 'Toppings',              currentStock: 2000 },
    { name: 'Topping Tiramisu Crunchy',    unit: 'g',    packageSize: '1kg',    ingredientGroup: 'Toppings',              currentStock: 2000 },
    { name: 'Topping Hazelnut',            unit: 'g',    packageSize: '500g',   ingredientGroup: 'Toppings',              currentStock: 1000 },
    { name: 'Topping Ovomaltine',          unit: 'g',    packageSize: '680g',   ingredientGroup: 'Toppings',              currentStock: 1360 },
    // Add-ons
    { name: 'Meses',                       unit: 'g',    packageSize: null,     ingredientGroup: 'Add-ons',               currentStock: 1000 },
    { name: 'Chocochip',                   unit: 'g',    packageSize: null,     ingredientGroup: 'Add-ons',               currentStock: 1000 },
    { name: 'Keju',                        unit: 'pc',   packageSize: '32pcs',  ingredientGroup: 'Add-ons',               currentStock: 64 },
    // Packaging (waffle)
    { name: 'Paperbag',                    unit: 'pc',   packageSize: '100pcs', ingredientGroup: 'Packaging Waffle',      currentStock: 200 },
    { name: 'Stiker Logo',                unit: 'pc',   packageSize: '84pcs',  ingredientGroup: 'Packaging Waffle',      currentStock: 168 },
    // Batter (produced/derived)
    { name: 'Adonan Besar',               unit: 'btl',  packageSize: null,     ingredientGroup: 'Batter',                currentStock: 0, isDerived: true },
    { name: 'Adonan Kecil',               unit: 'btl',  packageSize: null,     ingredientGroup: 'Batter',                currentStock: 0, isDerived: true },
    // Drinks base
    { name: 'Biji Kopi',                  unit: 'g',    packageSize: '1kg',    ingredientGroup: 'Drinks Base',            currentStock: 2000 },
    { name: 'MaxCreamer',                 unit: 'g',    packageSize: '500g',   ingredientGroup: 'Drinks Base',            currentStock: 1000 },
    { name: 'Rich Creme',                 unit: 'g',    packageSize: '500g',   ingredientGroup: 'Drinks Base',            currentStock: 1000 },
    { name: 'Krimer Kental Manis',        unit: 'g',    packageSize: null,     ingredientGroup: 'Drinks Base',            currentStock: 2000 },
    { name: 'Freshmilk',                  unit: 'g',    packageSize: '1L',     ingredientGroup: 'Drinks Base',            currentStock: 3000 },
    { name: 'Susu Evaporasi F&N',         unit: 'g',    packageSize: '380g',   ingredientGroup: 'Drinks Base',            currentStock: 1520 },
    { name: 'Batu Es',                    unit: 'g',    packageSize: null,     ingredientGroup: 'Drinks Base',            currentStock: 10000 },
    { name: 'Gula Kabung',                unit: 'bks',  packageSize: null,     ingredientGroup: 'Drinks Base',            currentStock: 20 },
    // Derived drinks ingredients
    { name: 'Krimer',                     unit: 'g',    packageSize: null,     ingredientGroup: 'Drinks Derived',         currentStock: 0, isDerived: true },
    { name: 'Cocoa Powder',               unit: 'g',    packageSize: null,     ingredientGroup: 'Drinks Derived',         currentStock: 0, isDerived: true },
    { name: 'Espresso',                   unit: 'g',    packageSize: null,     ingredientGroup: 'Drinks Derived',         currentStock: 0, isDerived: true },
    { name: 'Gula Aren',                  unit: 'g',    packageSize: null,     ingredientGroup: 'Drinks Derived',         currentStock: 0, isDerived: true },
    // Drinks flavour
    { name: 'Oreo Ground',                unit: 'g',    packageSize: '500g',   ingredientGroup: 'Drinks Flavour',         currentStock: 500 },
    { name: 'Van Houten',                 unit: 'g',    packageSize: '165g',   ingredientGroup: 'Drinks Flavour',         currentStock: 330 },
    { name: 'Tulip Bordeaux',             unit: 'g',    packageSize: '500g',   ingredientGroup: 'Drinks Flavour',         currentStock: 500 },
    { name: 'Matcha Powder',              unit: 'g',    packageSize: '200g',   ingredientGroup: 'Drinks Flavour',         currentStock: 400 },
    { name: 'Sirup Hazelnut',             unit: 'g',    packageSize: '950g',   ingredientGroup: 'Drinks Flavour',         currentStock: 950 },
    { name: 'Sirup Caramel',              unit: 'g',    packageSize: '950g',   ingredientGroup: 'Drinks Flavour',         currentStock: 950 },
    // Packaging (drinks)
    { name: 'Cup 12oz',                   unit: 'pc',   packageSize: '50cup',  ingredientGroup: 'Packaging Drinks',       currentStock: 100 },
    { name: 'Sedotan 6mm',                unit: 'pc',   packageSize: '500pcs', ingredientGroup: 'Packaging Drinks',       currentStock: 500 },
    { name: 'Sedotan 8mm',                unit: 'pc',   packageSize: '500pcs', ingredientGroup: 'Packaging Drinks',       currentStock: 500 },
    { name: 'Sealer Lid',                 unit: 'pc',   packageSize: null,     ingredientGroup: 'Packaging Drinks',       currentStock: 200 },
    // Manual-only stock items (NO recipe rows — Claude.md §F.4)
    { name: 'Plastik 1 Cup',              unit: 'pc',   packageSize: null,     ingredientGroup: 'Manual Only',            currentStock: 200 },
    { name: 'Plastik 2 Cup',              unit: 'pc',   packageSize: null,     ingredientGroup: 'Manual Only',            currentStock: 200 },
    { name: 'Plastik',                    unit: 'bks',  packageSize: null,     ingredientGroup: 'Manual Only',            currentStock: 10 },
    { name: 'Air',                        unit: 'galon', packageSize: null,    ingredientGroup: 'Manual Only',            currentStock: 5 },
  ];

  const ingredients: Record<string, any> = {};
  for (const ing of ingredientsData) {
    ingredients[ing.name] = await prisma.ingredient.create({
      data: {
        name: ing.name,
        unit: ing.unit,
        packageSize: ing.packageSize,
        ingredientGroup: ing.ingredientGroup,
        currentStock: ing.currentStock,
        isDerived: (ing as any).isDerived || false,
      },
    });
  }

  // ================================================================
  // 11. RECIPES (Claude.md §F.4 — Links sellable options to ingredients)
  // ================================================================
  console.log('📋 Seeding recipes...');

  // Helper to create recipe entries
  const createRecipe = async (
    linkField: string,
    linkId: string,
    ingredientName: string,
    qtyPerUnit: number
  ) => {
    await prisma.recipe.create({
      data: {
        [linkField]: linkId,
        ingredientId: ingredients[ingredientName].id,
        qtyPerUnit,
      },
    });
  };

  // -- Topping Utama recipes (gram per portion) --
  // Polos: 0g topping (no recipe needed)
  const toppingRecipeMap: [string, string, number][] = [
    ['Chocolate',        'Topping Chocolate',        55],
    ['Tiramisu',         'Topping Tiramisu',          55],
    ['Greentea',         'Topping Greentea',          55],
    ['Taro',             'Topping Taro',              55],
    ['Cappuccino',       'Topping Cappuccino',        55],
    ['Strawberry',       'Topping Strawberry',        80],  // Exception: 80g
    ['Blueberry',        'Topping Blueberry',         80],  // Exception: 80g
    ['Choco Crunchy',    'Topping Choco Crunchy',     80],
    ['Tiramisu Crunchy', 'Topping Tiramisu Crunchy',  80],
    ['Hazelnut',         'Topping Hazelnut',          80],
    ['Ovomaltine',       'Topping Ovomaltine',        80],
  ];

  for (const [toppingName, ingredientName, qty] of toppingRecipeMap) {
    await createRecipe('toppingId', toppings[toppingName].id, ingredientName, qty);
  }

  // Every Egg Waffle portion consumes: Paperbag 1pc, Stiker Logo 1pc
  for (const toppingName of Object.keys(toppings)) {
    await createRecipe('toppingId', toppings[toppingName].id, 'Paperbag', 1);
    await createRecipe('toppingId', toppings[toppingName].id, 'Stiker Logo', 1);
  }

  // -- Flavour recipes --
  const flavourRecipeMap: [string, string, number][] = [
    ['Pandan',      'Perisa Pandan',      3],
    ['Redvelvet',   'Perisa Redvelvet',   3],
    ['Blackforest', 'Perisa Blackforest', 3],
    ['Mocca',       'Perisa Mocca',       3],
  ];
  // Original has no ingredient
  for (const [flavourName, ingredientName, qty] of flavourRecipeMap) {
    await createRecipe('flavourId', flavours[flavourName].id, ingredientName, qty);
  }

  // -- Add-on recipes --
  const addonRecipeMap: [string, string, number][] = [
    ['Meses',             'Meses',    25],
    ['Chocochip',         'Chocochip', 30],
    ['Keju Parut',        'Keju',     1],
    ['Keju dalam Waffle', 'Keju',     1],
  ];
  for (const [addonName, ingredientName, qty] of addonRecipeMap) {
    await createRecipe('addonId', addons[addonName].id, ingredientName, qty);
  }

  // -- Drink recipes (Claude.md §F.4) --
  // Every drink also consumes: Batu Es 180g, Sealer Lid 1pc
  const drinkRecipes: Record<string, [string, number][]> = {
    'Iced Latte': [
      ['Krimer', 30], ['Krimer Kental Manis', 35], ['Susu Evaporasi F&N', 20],
      ['Freshmilk', 30], ['Espresso', 35], ['Cup 12oz', 1], ['Sedotan 6mm', 1],
    ],
    'Iced Aren Latte': [
      ['Krimer', 30], ['Krimer Kental Manis', 5], ['Gula Aren', 25],
      ['Susu Evaporasi F&N', 20], ['Freshmilk', 30], ['Espresso', 35],
      ['Cup 12oz', 1], ['Sedotan 6mm', 1],
    ],
    'Iced Caramel Latte': [
      ['Krimer', 30], ['Susu Evaporasi F&N', 20], ['Freshmilk', 40],
      ['Sirup Caramel', 25], ['Espresso', 30], ['Cup 12oz', 1], ['Sedotan 6mm', 1],
    ],
    'Iced Hazelnut Latte': [
      ['Krimer', 30], ['Susu Evaporasi F&N', 20], ['Freshmilk', 40],
      ['Sirup Hazelnut', 25], ['Espresso', 30], ['Cup 12oz', 1], ['Sedotan 6mm', 1],
    ],
    'Iced Chocolate': [
      ['Krimer', 20], ['Krimer Kental Manis', 30], ['Gula Aren', 10],
      ['Van Houten', 5], ['Tulip Bordeaux', 5],  // Cocoa Powder = 5+5 compound
      ['Susu Evaporasi F&N', 20], ['Freshmilk', 30], ['Cup 12oz', 1], ['Sedotan 6mm', 1],
    ],
    'Cookies & Cream': [
      ['Krimer', 30], ['Krimer Kental Manis', 30], ['Susu Evaporasi F&N', 20],
      ['Freshmilk', 30], ['Oreo Ground', 40], ['Cup 12oz', 1], ['Sedotan 8mm', 1],
    ],
    'Matcha Latte': [
      ['Matcha Powder', 4], ['Gula Pasir', 15], ['Susu Evaporasi F&N', 40],
      ['Freshmilk', 100], ['Cup 12oz', 1], ['Sedotan 6mm', 1],
    ],
  };

  for (const [drinkName, recipeItems] of Object.entries(drinkRecipes)) {
    for (const [ingredientName, qty] of recipeItems) {
      await createRecipe('drinkId', drinks[drinkName].id, ingredientName, qty);
    }
    // Universal per drink: Batu Es 180g + Sealer Lid 1pc
    await createRecipe('drinkId', drinks[drinkName].id, 'Batu Es', 180);
    await createRecipe('drinkId', drinks[drinkName].id, 'Sealer Lid', 1);
  }

  console.log('✅ Seed completed successfully!');
  console.log(`   📍 Outlet: ${outlet.name} (${outlet.branchCode})`);
  console.log(`   👤 Users: admin (env:ADMIN_PASSWORD or WaffleoAdmin2026!), supervisor (env:SUPERVISOR_PASSWORD or SpvWaffleo123), kasir (env:KASIR_PASSWORD or KasirWaffleo123)`);
  console.log(`   📡 Channels: ${channelsData.length}`);
  console.log(`   🧇 Toppings: ${toppingsData.length}`);
  console.log(`   🎨 Flavours: ${flavoursData.length}`);
  console.log(`   ➕ Add-ons: ${addonsData.length}`);
  console.log(`   🥤 Drinks: ${drinksData.length}`);
  console.log(`   📦 Ingredients: ${ingredientsData.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

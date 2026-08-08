import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Channel commission config — matches Claude.md §F.2
const CHANNEL_COMMISSION: Record<string, { commission: number; flatFee: number }> = {
  'GrabFood':   { commission: 0.20, flatFee: 0 },
  'GoFood':     { commission: 0.20, flatFee: 1000 },
  'ShopeeFood': { commission: 0.25, flatFee: 0 },
  'Walk In':    { commission: 0, flatFee: 0 },
  'WhatsApp':   { commission: 0, flatFee: 0 },
  'Instagram':  { commission: 0, flatFee: 0 },
};

function parseDateRange(req: Request): { startDate: Date; endDate: Date } {
  const start = req.query.start as string;
  const end = req.query.end as string;
  
  const startDate = start ? new Date(`${start}T00:00:00+07:00`) : new Date(new Date().setHours(0, 0, 0, 0));
  const endDate = end ? new Date(`${end}T23:59:59+07:00`) : new Date(new Date().setHours(23, 59, 59, 999));
  
  return { startDate, endDate };
}

// GET /reports/sales?start=&end=
export const getSalesReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { outletId } = req.user!;
    const { startDate, endDate } = parseDateRange(req);

    const orders = await prisma.order.findMany({
      where: {
        outletId,
        status: 'DONE',
        refunded: false,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        channel: true,
        items: {
          include: {
            topping: true,
            halfPartner: true,
            drink: true,
          },
        },
      },
    });

    // Sales by Channel
    const channelMap: Record<string, { channelId: string; channelName: string; total: number; orderCount: number }> = {};
    // Sales by Product
    const productMap: Record<string, { name: string; total: number; qty: number }> = {};
    
    let grandTotal = 0;

    for (const order of orders) {
      const orderTotal = order.items.reduce((sum, item) => sum + parseFloat(item.lineTotal.toString()), 0);
      grandTotal += orderTotal;

      // Channel aggregation
      const chName = order.channel.name;
      if (!channelMap[chName]) {
        channelMap[chName] = { channelId: order.channelId, channelName: chName, total: 0, orderCount: 0 };
      }
      channelMap[chName].total += orderTotal;
      channelMap[chName].orderCount += 1;

      // Product aggregation
      for (const item of order.items) {
        let productName = 'Unknown';
        if (item.topping) {
          productName = item.halfPartner 
            ? `${item.topping.name} & ${item.halfPartner.name} (Half)` 
            : item.topping.name;
        } else if (item.drink) {
          productName = item.drink.name;
        }
        
        if (!productMap[productName]) {
          productMap[productName] = { name: productName, total: 0, qty: 0 };
        }
        productMap[productName].total += parseFloat(item.lineTotal.toString());
        productMap[productName].qty += item.qty;
      }
    }

    const salesByChannel = Object.values(channelMap)
      .sort((a, b) => b.total - a.total)
      .map(ch => ({
        ...ch,
        percentage: grandTotal > 0 ? Math.round((ch.total / grandTotal) * 100) : 0,
      }));

    const salesByProduct = Object.values(productMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20); // top 20

    res.json({
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      grandTotal,
      totalOrders: orders.length,
      salesByChannel,
      salesByProduct,
    });
  } catch (error) {
    console.error('getSalesReport error:', error);
    res.status(500).json({ message: 'Gagal mengambil laporan penjualan' });
  }
};

// GET /reports/shift?date=YYYY-MM-DD
export const getShiftReconciliation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { outletId } = req.user!;
    const startStr = req.query.start as string;
    const endStr = req.query.end as string;
    const dateStr = req.query.date as string;
    
    let startOfDay: Date, endOfDay: Date;
    if (startStr && endStr) {
      startOfDay = new Date(`${startStr}T00:00:00+07:00`);
      endOfDay = new Date(`${endStr}T23:59:59.999+07:00`);
    } else {
      const targetDate = dateStr ? new Date(`${dateStr}T00:00:00+07:00`) : new Date();
      startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
    }

    // Find shift for this date
    const shift = await prisma.shift.findFirst({
      where: {
        outletId,
        openedAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        openedBy: { select: { fullName: true } },
        closedBy: { select: { fullName: true } },
      },
      orderBy: { openedAt: 'desc' },
    });

    // Calculate expected cash from payments (all CASH + CASH portion of CASH_QRIS)
    const payments = await prisma.payment.findMany({
      where: {
        order: {
          outletId,
          status: 'DONE',
          refunded: false,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      },
    });

    let expectedCash = 0;
    let totalQris = 0;
    let totalTransfer = 0;
    let totalGross = 0;

    for (const p of payments) {
      const cash = parseFloat(p.cashAmount.toString());
      const qris = parseFloat(p.qrisAmount.toString());
      const transfer = parseFloat(p.transferAmount.toString());
      const change = parseFloat(p.changeGiven.toString());
      
      expectedCash += cash - change; // net cash (after change)
      totalQris += qris;
      totalTransfer += transfer;
      totalGross += cash + qris + transfer - change;
    }

    // Opening cash from shift
    const openingCash = shift?.openingCash ? parseFloat(shift.openingCash.toString()) : 0;
    const expectedTotal = openingCash + expectedCash;
    const actualCash = shift?.closingCashActual ? parseFloat(shift.closingCashActual.toString()) : null;
    const variance = actualCash !== null ? actualCash - expectedTotal : null;

    res.json({
      date: dateStr || startOfDay.toISOString().split('T')[0],
      shift: shift ? {
        id: shift.id,
        status: shift.status,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        openedBy: shift.openedBy.fullName,
        closedBy: shift.closedBy?.fullName || null,
        openingCash,
        closingCashExpected: shift.closingCashExpected ? parseFloat(shift.closingCashExpected.toString()) : null,
        closingCashActual: actualCash,
      } : null,
      cashFromSales: expectedCash,
      openingCash,
      expectedTotal,
      actualCash,
      variance,
      paymentBreakdown: {
        cash: expectedCash,
        qris: totalQris,
        transfer: totalTransfer,
        gross: totalGross,
      },
    });
  } catch (error) {
    console.error('getShiftReconciliation error:', error);
    res.status(500).json({ message: 'Gagal mengambil data rekonsiliasi shift' });
  }
};

// GET /reports/commissions?start=&end=
export const getCommissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { outletId } = req.user!;
    const { startDate, endDate } = parseDateRange(req);

    const orders = await prisma.order.findMany({
      where: {
        outletId,
        status: 'DONE',
        refunded: false,
        createdAt: { gte: startDate, lte: endDate },
        channel: {
          isPlatform: true, // Only platform channels have commission
        },
      },
      include: {
        channel: true,
        items: true,
      },
    });

    // Group by channel
    const commissionMap: Record<string, {
      channelName: string;
      commissionPct: number;
      flatFeePerOrder: number;
      settlesTo: string;
      orderCount: number;
      grossRevenue: number;
      totalCommission: number;
      totalFlatFee: number;
      netSettlement: number;
    }> = {};

    for (const order of orders) {
      const chName = order.channel.name;
      const gross = order.items.reduce((sum, item) => sum + parseFloat(item.lineTotal.toString()), 0);
      
      const commissionPct = parseFloat(order.channel.commissionPct.toString()) / 100;
      const flatFee = parseFloat(order.channel.flatFee.toString());
      
      // Net = (Item Total × (1 − commission%)) − flat_fee
      const commission = gross * commissionPct;
      const net = gross * (1 - commissionPct) - flatFee;

      if (!commissionMap[chName]) {
        commissionMap[chName] = {
          channelName: chName,
          commissionPct: parseFloat(order.channel.commissionPct.toString()),
          flatFeePerOrder: flatFee,
          settlesTo: order.channel.settlesTo,
          orderCount: 0,
          grossRevenue: 0,
          totalCommission: 0,
          totalFlatFee: 0,
          netSettlement: 0,
        };
      }
      
      commissionMap[chName].orderCount += 1;
      commissionMap[chName].grossRevenue += gross;
      commissionMap[chName].totalCommission += commission;
      commissionMap[chName].totalFlatFee += flatFee;
      commissionMap[chName].netSettlement += net;
    }

    const commissions = Object.values(commissionMap).sort((a, b) => b.grossRevenue - a.grossRevenue);

    const totalGross = commissions.reduce((s, c) => s + c.grossRevenue, 0);
    const totalNet = commissions.reduce((s, c) => s + c.netSettlement, 0);
    const totalDeducted = commissions.reduce((s, c) => s + c.totalCommission + c.totalFlatFee, 0);

    res.json({
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      commissions,
      summary: {
        totalGross,
        totalDeducted,
        totalNet,
      },
    });
  } catch (error) {
    console.error('getCommissions error:', error);
    res.status(500).json({ message: 'Gagal mengambil data komisi' });
  }
};

// GET /reports/dashboard
export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { outletId } = req.user!;
    
    // Today's boundaries
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    
    // 4. Current Shift Info (needed early for hourly trend start time)
    const currentShift = await prisma.shift.findFirst({
      where: { outletId, status: 'OPEN' },
      include: { openedBy: { select: { fullName: true } } },
      orderBy: { openedAt: 'desc' }
    });

    // 1. Get today's orders for KPIs and Top Products
    const todaysOrders = await prisma.order.findMany({
      where: {
        outletId,
        status: { in: ['OPEN', 'DONE'] },
        createdAt: { gte: startOfToday, lte: endOfToday }
      },
      include: {
        channel: true,
        items: {
          include: { topping: true, halfPartner: true, drink: true }
        }
      }
    });

    let todayGrossSales = 0;
    let completedOrders = 0;
    let activeOrders = 0;
    const topProductMap: Record<string, { name: string; qty: number }> = {};
    const salesByChannelMap: Record<string, number> = {};

    for (const order of todaysOrders) {
      if (order.refunded) continue; // Skip refunded orders for KPI calculations

      if (order.status === 'DONE') {
        completedOrders++;
        const orderTotal = order.items.reduce((sum, item) => sum + parseFloat(item.lineTotal.toString()), 0);
        todayGrossSales += orderTotal;
        
        const chName = order.channel?.name || 'Walk In';
        salesByChannelMap[chName] = (salesByChannelMap[chName] || 0) + orderTotal;
      } else if (order.status === 'OPEN') {
        activeOrders++;
      }

      // Aggregate top products from ALL orders (even OPEN ones for live visibility, or only DONE ones?)
      // Let's use DONE only for top products to be accurate to sales
      if (order.status === 'DONE') {
        for (const item of order.items) {
          let productName = 'Unknown';
          if (item.topping) {
            productName = item.halfPartner ? `${item.topping.name} & ${item.halfPartner.name} (Half)` : item.topping.name;
          } else if (item.drink) {
            productName = item.drink.name;
          }
          if (!topProductMap[productName]) {
            topProductMap[productName] = { name: productName, qty: 0 };
          }
          topProductMap[productName].qty += item.qty;
        }
      }
    }

    const topProducts = Object.values(topProductMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5); // top 5

    const salesByChannel = Object.keys(salesByChannelMap).map(k => ({
      name: k,
      total: salesByChannelMap[k]
    })).sort((a, b) => b.total - a.total);

    // 2. Sales Trend (Hourly for today, up to 23:59)
    const salesTrendMap: Record<string, number> = {};
    const startHour = currentShift ? currentShift.openedAt.getHours() : 0;
    
    for (let i = startHour; i <= 23; i++) {
      const hourStr = `${i.toString().padStart(2, '0')}:00`;
      salesTrendMap[hourStr] = 0;
    }

    for (const order of todaysOrders) {
      if (order.status === 'DONE') {
        const orderTotal = order.items.reduce((sum, item) => sum + parseFloat(item.lineTotal.toString()), 0);
        const hourStr = `${order.createdAt.getHours().toString().padStart(2, '0')}:00`;
        if (salesTrendMap[hourStr] !== undefined) {
          salesTrendMap[hourStr] += orderTotal;
        }
      }
    }

    const salesTrend = Object.keys(salesTrendMap).sort().map(time => ({
      date: time, // using 'date' key to match frontend interface
      total: salesTrendMap[time]
    }));

    // 3. Low Stock Alerts
    const ingredients = await prisma.ingredient.findMany();

    const lowStockAlerts = ingredients
      .filter(ing => ing.lowStockThreshold !== null && parseFloat(ing.currentStock.toString()) <= parseFloat(ing.lowStockThreshold.toString()))
      .map(ing => ({
        id: ing.id,
        name: ing.name,
        stock: parseFloat(ing.currentStock.toString()),
        unit: ing.unit,
        threshold: ing.lowStockThreshold ? parseFloat(ing.lowStockThreshold.toString()) : 0
      }));

    // (Current shift was queried at the top)

    res.json({
      kpis: {
        todayGrossSales,
        completedOrders,
        activeOrders
      },
      salesTrend,
      salesByChannel,
      topProducts,
      lowStockAlerts,
      currentShift: currentShift ? {
        id: currentShift.id,
        openedAt: currentShift.openedAt,
        openedBy: currentShift.openedBy.fullName
      } : null
    });
  } catch (error) {
    console.error('getDashboardSummary error:', error);
    res.status(500).json({ message: 'Gagal mengambil data dashboard' });
  }
};

// GET /reports/sales-trend?range=7d|1m|6m|1y
export const getSalesTrend = async (req: Request, res: Response): Promise<void> => {
  try {
    const { outletId } = req.user!;
    const range = req.query.range as string || '7d';
    
    const today = new Date();
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    
    let startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    
    if (range === '1y') {
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
    } else if (range === '6m') {
      startDate.setMonth(startDate.getMonth() - 5);
      startDate.setDate(1);
    } else if (range === '1m') {
      startDate.setDate(startDate.getDate() - 29);
    } else { // 7d
      startDate.setDate(startDate.getDate() - 6);
    }

    const orders = await prisma.order.findMany({
      where: {
        outletId,
        status: 'DONE',
        refunded: false,
        createdAt: { gte: startDate, lte: endOfToday }
      },
      include: { items: true }
    });

    const salesTrendMap: Record<string, number> = {};
    
    // Initialize buckets
    if (range === '1y' || range === '6m') {
      let currentMonth = new Date(startDate);
      while (currentMonth <= endOfToday) {
        const monthStr = currentMonth.toISOString().slice(0, 7); // YYYY-MM
        salesTrendMap[monthStr] = 0;
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
    } else {
      let currentDay = new Date(startDate);
      while (currentDay <= endOfToday) {
        const dayStr = currentDay.toISOString().split('T')[0]; // YYYY-MM-DD
        salesTrendMap[dayStr] = 0;
        currentDay.setDate(currentDay.getDate() + 1);
      }
    }

    for (const order of orders) {
      const orderTotal = order.items.reduce((sum, item) => sum + parseFloat(item.lineTotal.toString()), 0);
      if (range === '1y' || range === '6m') {
        const monthStr = order.createdAt.toISOString().slice(0, 7);
        if (salesTrendMap[monthStr] !== undefined) {
          salesTrendMap[monthStr] += orderTotal;
        }
      } else {
        const dayStr = order.createdAt.toISOString().split('T')[0];
        if (salesTrendMap[dayStr] !== undefined) {
          salesTrendMap[dayStr] += orderTotal;
        }
      }
    }

    const salesTrend = Object.keys(salesTrendMap).sort().map(date => ({
      date,
      total: salesTrendMap[date]
    }));

    res.json(salesTrend);
  } catch (error) {
    console.error('getSalesTrend error:', error);
    res.status(500).json({ message: 'Gagal mengambil data tren penjualan' });
  }
};

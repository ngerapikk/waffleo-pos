import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { TrendingUp, ShoppingBag, Wallet, DollarSign, FileDown, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { Skeleton } from '../components/common/Skeleton';

// ─────────────── Helpers ───────────────
const fmtRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const CHANNEL_COLORS: Record<string, string> = {
  'Walk In':    '#10b981',
  'WhatsApp':   '#06b6d4',
  'Instagram':  '#a855f7',
  'GrabFood':   '#22c55e',
  'GoFood':     '#ef4444',
  'ShopeeFood': '#f97316',
};

const DEFAULT_COLOR = '#94a3b8';

const PRODUCT_COLORS = [
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#3b82f6', // blue-500
  '#0ea5e9', // sky-500
  '#14b8a6', // teal-500
  '#22c55e', // green-500
  '#84cc16', // lime-500
  '#eab308', // yellow-500
  '#f59e0b', // amber-500
  '#f97316', // orange-500
  '#ef4444', // red-500
];

const DYNAMIC_COLORS = [
  '#22c55e', // Hijau cerah (green-500)
  '#84cc16', // Hijau muda (lime-500)
  '#eab308', // Kuning (yellow-500)
  '#f59e0b', // Kuning orange (amber-500)
  '#f97316', // Orange (orange-500)
  '#ef4444', // Merah (red-500)
];

const getDynamicChannelColor = (index: number, total: number) => {
  if (total <= 1) return DYNAMIC_COLORS[0];
  const colorIndex = Math.round((index / (total - 1)) * (DYNAMIC_COLORS.length - 1));
  return DYNAMIC_COLORS[Math.min(colorIndex, DYNAMIC_COLORS.length - 1)];
};

// ─────────────── Types ───────────────
interface SalesData {
  period: { start: string; end: string };
  grandTotal: number;
  totalOrders: number;
  salesByChannel: { channelName: string; total: number; orderCount: number; percentage: number }[];
  salesByProduct: { name: string; total: number; qty: number }[];
}

interface ShiftData {
  date: string;
  shift: { id: string; status: string; openedAt: string; closedAt: string | null; openedBy: string; closedBy: string | null; openingCash: number; closingCashActual: number | null } | null;
  cashFromSales: number;
  openingCash: number;
  expectedTotal: number;
  actualCash: number | null;
  variance: number | null;
  paymentBreakdown: { cash: number; qris: number; transfer: number; gross: number };
}

interface CommissionData {
  period: { start: string; end: string };
  commissions: {
    channelName: string;
    commissionPct: number;
    flatFeePerOrder: number;
    settlesTo: string;
    orderCount: number;
    grossRevenue: number;
    totalCommission: number;
    totalFlatFee: number;
    netSettlement: number;
  }[];
  summary: { totalGross: number; totalDeducted: number; totalNet: number };
}

// ─────────────── Custom Tooltip ───────────────
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3">
      <p className="font-semibold text-gray-800 mb-1 text-sm">{label}</p>
      <p className="text-wfl-orange font-bold">{fmtRp(payload[0].value)}</p>
      {payload[0].payload.qty && (
        <p className="text-gray-500 text-xs mt-0.5">{payload[0].payload.qty}x terjual</p>
      )}
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3">
      <p className="font-semibold text-gray-800 text-sm mb-1">{d.channelName}</p>
      <p className="font-bold" style={{ color: d.color || CHANNEL_COLORS[d.channelName] || DEFAULT_COLOR }}>{fmtRp(d.total)}</p>
      <p className="text-gray-500 text-xs">{d.percentage}% dari total</p>
      <p className="text-gray-400 text-xs">{d.orderCount} order</p>
    </div>
  );
};

// ─────────────── Component ───────────────
export const Reports = () => {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [dateFilter, setDateFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('TODAY');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [shiftData, setShiftData] = useState<ShiftData | null>(null);
  const [commissionData, setCommissionData] = useState<CommissionData | null>(null);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [trendRange, setTrendRange] = useState<'7d' | '1m' | '6m' | '1y'>('7d');
  const [salesTrend, setSalesTrend] = useState<{ date: string, total: number }[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const fetchTrend = useCallback(async () => {
    setTrendLoading(true);
    try {
      const { data } = await api.get(`/reports/sales-trend?range=${trendRange}`);
      setSalesTrend(data);
    } catch (e) {
      console.error('Trend fetch error:', e);
    } finally {
      setTrendLoading(false);
    }
  }, [trendRange]);

  useEffect(() => { fetchTrend(); }, [fetchTrend]);

  // Compute effective date range from filter
  const getEffectiveDates = useCallback(() => {
    const now = new Date();
    switch (dateFilter) {
      case 'TODAY':
        return { start: today, end: today };
      case 'WEEK':
        return { start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: today };
      case 'MONTH':
        return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: today };
      case 'CUSTOM':
        return { start: startDate, end: endDate };
      default:
        return { start: today, end: today };
    }
  }, [dateFilter, startDate, endDate, today]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getEffectiveDates();
      const [sales, shift, comm] = await Promise.all([
        api.get(`/reports/sales?start=${start}&end=${end}`).then(r => r.data),
        api.get(`/reports/shift?start=${start}&end=${end}`).then(r => r.data),
        api.get(`/reports/commissions?start=${start}&end=${end}`).then(r => r.data),
      ]);
      setSalesData(sales);
      setShiftData(shift);
      setCommissionData(comm);
    } catch (e) {
      console.error('Reports fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [getEffectiveDates]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─────── Export Excel ───────
  const exportToExcel = async () => {
    if (!salesData || !shiftData || !commissionData) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx-js-style');

      const workbook = XLSX.utils.book_new();
      const { start, end } = getEffectiveDates();
      const periodLabel = start === end ? start : `${start} s/d ${end}`;

      // ── Helper styles ──
      const titleStyle = {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFFFF' } },
        fill: { fgColor: { rgb: 'FF8B4513' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
      const subtitleStyle = {
        font: { italic: true, sz: 11, color: { rgb: 'FF555555' } },
        fill: { fgColor: { rgb: 'FFFFF8F0' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
      const headerStyle = (rgb: string) => ({
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFFFF' } },
        fill: { fgColor: { rgb } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
      });
      const cellStyle = (align: 'left' | 'right' | 'center' = 'left', numFmt?: string) => ({
        font: { sz: 10 },
        alignment: { horizontal: align, vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { rgb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { rgb: 'FFE5E7EB' } },
        },
        ...(numFmt ? { numFmt } : {}),
      });
      const altRowFill = { fill: { fgColor: { rgb: 'FFFFF8F0' } } };
      const totalRowStyle = {
        font: { bold: true, sz: 11 },
        fill: { fgColor: { rgb: 'FFF5DEB3' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } },
      };

      // ════════════════════════════════
      // Sheet 1: Ringkasan Penjualan
      // ════════════════════════════════
      const ws1Rows: any[][] = [
        [{ v: '📊 LAPORAN PENJUALAN — WAFFLEO POS', s: titleStyle }],
        [{ v: `Periode: ${periodLabel}   |   Dicetak: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, s: subtitleStyle }],
        [],
        // KPI summary
        [
          { v: 'TOTAL PENDAPATAN', s: { font: { bold: true, sz: 10, color: { rgb: 'FF8B4513' } }, fill: { fgColor: { rgb: 'FFFFF0E0' } }, alignment: { horizontal: 'center' }, border: { top: { style: 'medium', color: { rgb: 'FFD97706' } }, bottom: { style: 'medium', color: { rgb: 'FFD97706' } }, left: { style: 'medium', color: { rgb: 'FFD97706' } }, right: { style: 'medium', color: { rgb: 'FFD97706' } } } } },
          { v: 'JUMLAH ORDER', s: { font: { bold: true, sz: 10, color: { rgb: 'FF166534' } }, fill: { fgColor: { rgb: 'FFF0FFF4' } }, alignment: { horizontal: 'center' }, border: { top: { style: 'medium', color: { rgb: 'FF22C55E' } }, bottom: { style: 'medium', color: { rgb: 'FF22C55E' } }, left: { style: 'medium', color: { rgb: 'FF22C55E' } }, right: { style: 'medium', color: { rgb: 'FF22C55E' } } } } },
          { v: 'RATA-RATA PER ORDER', s: { font: { bold: true, sz: 10, color: { rgb: 'FF1D4ED8' } }, fill: { fgColor: { rgb: 'FFEFF6FF' } }, alignment: { horizontal: 'center' }, border: { top: { style: 'medium', color: { rgb: 'FF3B82F6' } }, bottom: { style: 'medium', color: { rgb: 'FF3B82F6' } }, left: { style: 'medium', color: { rgb: 'FF3B82F6' } }, right: { style: 'medium', color: { rgb: 'FF3B82F6' } } } } },
        ],
        [
          { v: salesData.grandTotal, t: 'n', z: '"Rp"#,##0', s: { font: { bold: true, sz: 14, color: { rgb: 'FF8B4513' } }, fill: { fgColor: { rgb: 'FFFFF0E0' } }, alignment: { horizontal: 'center' }, border: { bottom: { style: 'medium', color: { rgb: 'FFD97706' } }, left: { style: 'medium', color: { rgb: 'FFD97706' } }, right: { style: 'medium', color: { rgb: 'FFD97706' } } } } },
          { v: salesData.totalOrders, t: 'n', s: { font: { bold: true, sz: 14, color: { rgb: 'FF166534' } }, fill: { fgColor: { rgb: 'FFF0FFF4' } }, alignment: { horizontal: 'center' }, border: { bottom: { style: 'medium', color: { rgb: 'FF22C55E' } }, left: { style: 'medium', color: { rgb: 'FF22C55E' } }, right: { style: 'medium', color: { rgb: 'FF22C55E' } } } } },
          { v: salesData.totalOrders > 0 ? Math.round(salesData.grandTotal / salesData.totalOrders) : 0, t: 'n', z: '"Rp"#,##0', s: { font: { bold: true, sz: 14, color: { rgb: 'FF1D4ED8' } }, fill: { fgColor: { rgb: 'FFEFF6FF' } }, alignment: { horizontal: 'center' }, border: { bottom: { style: 'medium', color: { rgb: 'FF3B82F6' } }, left: { style: 'medium', color: { rgb: 'FF3B82F6' } }, right: { style: 'medium', color: { rgb: 'FF3B82F6' } } } } },
        ],
        [],
        // Sales by Channel
        [{ v: 'PENJUALAN PER CHANNEL', s: { font: { bold: true, sz: 12, color: { rgb: 'FF8B4513' } }, fill: { fgColor: { rgb: 'FFFFF8F0' } } } }],
        ['Channel', 'Jumlah Order', 'Total Penjualan', 'Persentase'].map(h => ({ v: h, s: headerStyle('FFC2722A') })),
        ...salesData.salesByChannel.map((ch, i) => [
          { v: ch.channelName, s: { ...cellStyle('left'), ...(i % 2 === 0 ? altRowFill : {}), font: { sz: 10, bold: true } } },
          { v: ch.orderCount, t: 'n', s: { ...cellStyle('center'), ...(i % 2 === 0 ? altRowFill : {}) } },
          { v: ch.total, t: 'n', z: '"Rp"#,##0', s: { ...cellStyle('right'), ...(i % 2 === 0 ? altRowFill : {}) } },
          { v: `${ch.percentage}%`, s: { ...cellStyle('center'), ...(i % 2 === 0 ? altRowFill : {}) } },
        ]),
        [
          { v: 'TOTAL', s: totalRowStyle },
          { v: salesData.totalOrders, t: 'n', s: totalRowStyle },
          { v: salesData.grandTotal, t: 'n', z: '"Rp"#,##0', s: totalRowStyle },
          { v: '100%', s: totalRowStyle },
        ],
        [],
        // Sales by Product
        [{ v: 'PENJUALAN PER PRODUK (TOP 20)', s: { font: { bold: true, sz: 12, color: { rgb: 'FF8B4513' } }, fill: { fgColor: { rgb: 'FFFFF8F0' } } } }],
        ['Produk', 'Qty Terjual', 'Total Penjualan'].map(h => ({ v: h, s: headerStyle('FF6B3A1F') })),
        ...salesData.salesByProduct.map((p, i) => [
          { v: p.name, s: { ...cellStyle('left'), ...(i % 2 === 0 ? altRowFill : {}) } },
          { v: p.qty, t: 'n', s: { ...cellStyle('center'), ...(i % 2 === 0 ? altRowFill : {}) } },
          { v: p.total, t: 'n', z: '"Rp"#,##0', s: { ...cellStyle('right'), ...(i % 2 === 0 ? altRowFill : {}) } },
        ]),
      ];

      const ws1 = XLSX.utils.aoa_to_sheet(ws1Rows);
      ws1['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
        { s: { r: 6, c: 0 }, e: { r: 6, c: 3 } },
        { s: { r: 7 + salesData.salesByChannel.length + 2, c: 0 }, e: { r: 7 + salesData.salesByChannel.length + 2, c: 3 } },
      ];
      ws1['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 22 }, { wch: 14 }];
      ws1['!rows'] = [{ hpt: 28 }, { hpt: 20 }];
      XLSX.utils.book_append_sheet(workbook, ws1, '📊 Penjualan');

      // ════════════════════════════════
      // Sheet 2: Rekonsiliasi Shift
      // ════════════════════════════════
      const shiftRows: any[][] = [
        [{ v: '💰 REKONSILIASI KAS SHIFT — WAFFLEO POS', s: titleStyle }],
        [{ v: `Tanggal: ${start}   |   Dicetak: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, s: subtitleStyle }],
        [],
        ['ITEM', 'NILAI'].map(h => ({ v: h, s: headerStyle('FF166534') })),
      ];

      const addShiftRow = (label: string, value: number | string, highlight = false) => {
        const s = highlight
          ? { ...cellStyle('right'), font: { sz: 11, bold: true }, fill: { fgColor: { rgb: 'FFF0FFF4' } } }
          : cellStyle('right');
        shiftRows.push([
          { v: label, s: cellStyle('left') },
          typeof value === 'number'
            ? { v: value, t: 'n', z: '"Rp"#,##0', s }
            : { v: value, s },
        ]);
      };

      addShiftRow('Kas Pembuka (Opening Cash)', shiftData.openingCash);
      addShiftRow('Pendapatan Cash (dari DB)', shiftData.cashFromSales);
      addShiftRow('Expected Total Kas', shiftData.expectedTotal, true);
      shiftRows.push([]);
      addShiftRow('Actual Kas Fisik (input kasir)', shiftData.actualCash ?? 'Belum diinput');
      const varianceVal = shiftData.variance;
      shiftRows.push([
        { v: 'Selisih (Variance)', s: { ...cellStyle('left'), font: { sz: 11, bold: true } } },
        varianceVal !== null
          ? { v: varianceVal, t: 'n', z: '"Rp"#,##0', s: { ...cellStyle('right'), font: { sz: 11, bold: true, color: { rgb: varianceVal === 0 ? 'FF166534' : 'FFdc2626' } } } }
          : { v: 'Belum tersedia', s: cellStyle('right') },
      ]);
      shiftRows.push([]);
      [
        ['Breakdown Pembayaran Masuk', ''],
        ['• Cash (bersih, setelah kembalian)', shiftData.paymentBreakdown.cash],
        ['• QRIS', shiftData.paymentBreakdown.qris],
        ['• Transfer', shiftData.paymentBreakdown.transfer],
        ['Total Gross Penjualan', shiftData.paymentBreakdown.gross],
      ].forEach(([label, val]) => {
        shiftRows.push([
          { v: label, s: cellStyle('left') },
          typeof val === 'number' ? { v: val, t: 'n', z: '"Rp"#,##0', s: cellStyle('right') } : { v: val, s: cellStyle('left') },
        ]);
      });

      const ws2 = XLSX.utils.aoa_to_sheet(shiftRows);
      ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }];
      ws2['!cols'] = [{ wch: 40 }, { wch: 25 }];
      ws2['!rows'] = [{ hpt: 28 }, { hpt: 20 }];
      XLSX.utils.book_append_sheet(workbook, ws2, '💰 Rekonsiliasi Shift');

      // ════════════════════════════════
      // Sheet 3: Komisi Platform
      // ════════════════════════════════
      const commRows: any[][] = [
        [{ v: '🏪 KOMISI & FEE PLATFORM — WAFFLEO POS', s: titleStyle }],
        [{ v: `Periode: ${periodLabel}   |   Dicetak: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, s: subtitleStyle }],
        [],
        ['Platform', 'Komisi (%)', 'Flat Fee/Order', 'Jumlah Order', 'Gross Revenue', 'Total Komisi', 'Total Flat Fee', 'Net Settlement', 'Settles To'].map(h => ({ v: h, s: headerStyle('FF7C3AED') })),
        ...commissionData.commissions.map((c, i) => [
          { v: c.channelName, s: { ...cellStyle('left'), ...(i % 2 === 0 ? altRowFill : {}), font: { sz: 10, bold: true } } },
          { v: `${c.commissionPct}%`, s: { ...cellStyle('center'), ...(i % 2 === 0 ? altRowFill : {}) } },
          { v: c.flatFeePerOrder, t: 'n', z: '"Rp"#,##0', s: { ...cellStyle('right'), ...(i % 2 === 0 ? altRowFill : {}) } },
          { v: c.orderCount, t: 'n', s: { ...cellStyle('center'), ...(i % 2 === 0 ? altRowFill : {}) } },
          { v: c.grossRevenue, t: 'n', z: '"Rp"#,##0', s: { ...cellStyle('right'), ...(i % 2 === 0 ? altRowFill : {}) } },
          { v: c.totalCommission, t: 'n', z: '"Rp"#,##0', s: { ...cellStyle('right'), ...(i % 2 === 0 ? altRowFill : {}), font: { sz: 10, color: { rgb: 'FFef4444' } } } },
          { v: c.totalFlatFee, t: 'n', z: '"Rp"#,##0', s: { ...cellStyle('right'), ...(i % 2 === 0 ? altRowFill : {}), font: { sz: 10, color: { rgb: 'FFf97316' } } } },
          { v: c.netSettlement, t: 'n', z: '"Rp"#,##0', s: { ...cellStyle('right'), ...(i % 2 === 0 ? altRowFill : {}), font: { sz: 10, bold: true, color: { rgb: 'FF166534' } } } },
          { v: c.settlesTo, s: { ...cellStyle('center'), ...(i % 2 === 0 ? altRowFill : {}) } },
        ]),
        // Total row
        [
          { v: 'TOTAL', s: { ...totalRowStyle, alignment: { horizontal: 'left' } } },
          { v: '', s: totalRowStyle },
          { v: '', s: totalRowStyle },
          { v: commissionData.commissions.reduce((s, c) => s + c.orderCount, 0), t: 'n', s: totalRowStyle },
          { v: commissionData.summary.totalGross, t: 'n', z: '"Rp"#,##0', s: totalRowStyle },
          { v: commissionData.commissions.reduce((s, c) => s + c.totalCommission, 0), t: 'n', z: '"Rp"#,##0', s: { ...totalRowStyle, font: { bold: true, sz: 11, color: { rgb: 'FFef4444' } } } },
          { v: commissionData.commissions.reduce((s, c) => s + c.totalFlatFee, 0), t: 'n', z: '"Rp"#,##0', s: { ...totalRowStyle, font: { bold: true, sz: 11, color: { rgb: 'FFf97316' } } } },
          { v: commissionData.summary.totalNet, t: 'n', z: '"Rp"#,##0', s: { ...totalRowStyle, font: { bold: true, sz: 11, color: { rgb: 'FF166534' } } } },
          { v: '', s: totalRowStyle },
        ],
      ];

      const ws3 = XLSX.utils.aoa_to_sheet(commRows);
      ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }];
      ws3['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 18 }];
      ws3['!rows'] = [{ hpt: 28 }, { hpt: 20 }];
      XLSX.utils.book_append_sheet(workbook, ws3, '🏪 Komisi Platform');

      XLSX.writeFile(workbook, `Laporan_Waffleo_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    } catch (e: any) {
      console.error('Export error:', e);
      alert('Gagal export: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  // ─────── Date filter buttons ───────
  const filterButtons = [
    { key: 'TODAY', label: 'Hari Ini' },
    { key: 'WEEK', label: 'Minggu Ini' },
    { key: 'MONTH', label: 'Bulan Ini' },
    { key: 'CUSTOM', label: 'Custom' },
  ] as const;


  const salesByChannelWithColors = salesData?.salesByChannel
    ? [...salesData.salesByChannel]
        .sort((a, b) => b.total - a.total)
        .map((ch, i, arr) => ({ ...ch, color: getDynamicChannelColor(i, arr.length) }))
    : [];

  const maxProductTotal = salesData?.salesByProduct.length 
    ? Math.max(...salesData.salesByProduct.map(p => p.total)) 
    : 0;

  const { start: effectiveStart, end: effectiveEnd } = getEffectiveDates();
  const isSingleDay = effectiveStart === effectiveEnd;

  return (
    <div className="h-full overflow-auto bg-wfl-offwhite">
      {/* ── Header bar ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-wfl-border px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-wfl-brown">Reports</h1>
          <p className="text-sm text-wfl-text-secondary">Laporan keuangan & operasional outlet</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date filters */}
          <div className="flex gap-1 bg-wfl-offwhite rounded-xl p-1">
            {filterButtons.map(btn => (
              <button
                key={btn.key}
                onClick={() => setDateFilter(btn.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  dateFilter === btn.key
                    ? 'bg-wfl-orange text-white shadow-sm'
                    : 'text-wfl-text-secondary hover:text-wfl-brown'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-wfl-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-wfl-orange/40"
              />
              <span className="text-wfl-text-secondary text-sm">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-wfl-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-wfl-orange/40"
              />
            </div>
          )}

          <button
            onClick={fetchAll}
            disabled={loading}
            className="p-2 text-wfl-text-secondary hover:text-wfl-orange hover:bg-wfl-orange/10 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={exportToExcel}
            disabled={exporting || !salesData}
            className="flex items-center gap-2 px-4 py-2 bg-wfl-orange text-white rounded-xl text-sm font-semibold hover:bg-wfl-orange-hover transition-colors shadow-sm disabled:opacity-50"
          >
            <FileDown size={16} />
            {exporting ? 'Mengekspor...' : 'Export Excel'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              icon: <TrendingUp size={22} />,
              label: 'Total Pendapatan',
              value: salesData ? fmtRp(salesData.grandTotal) : '—',
              color: 'bg-amber-50 text-amber-700 border-amber-200',
              iconBg: 'bg-amber-100 text-amber-600',
            },
            {
              icon: <ShoppingBag size={22} />,
              label: 'Jumlah Order',
              value: salesData ? `${salesData.totalOrders} order` : '—',
              color: 'bg-green-50 text-green-700 border-green-200',
              iconBg: 'bg-green-100 text-green-600',
            },
            {
              icon: <DollarSign size={22} />,
              label: 'Rata-rata per Order',
              value: salesData && salesData.totalOrders > 0
                ? fmtRp(salesData.grandTotal / salesData.totalOrders)
                : '—',
              color: 'bg-blue-50 text-blue-700 border-blue-200',
              iconBg: 'bg-blue-100 text-blue-600',
            },
          ].map((card, i) => (
            <div key={i} className={`rounded-2xl border p-5 flex items-center gap-4 ${card.color}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{card.label}</p>
                <p className="text-2xl font-bold mt-0.5">{loading ? <Skeleton className="h-8 w-32" /> : card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-2 gap-5">
          {/* Sales by Channel — Pie */}
          <div className="bg-white rounded-2xl border border-wfl-border p-5 shadow-sm">
            <h2 className="font-bold text-wfl-brown text-base mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-wfl-orange inline-block"></span>
              Penjualan per Channel
            </h2>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-wfl-text-secondary text-sm">Memuat data...</div>
            ) : salesByChannelWithColors.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-wfl-text-secondary text-sm">Tidak ada data</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={salesByChannelWithColors}
                    dataKey="total"
                    nameKey="channelName"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={3}
                  >
                    {salesByChannelWithColors.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    formatter={(value: string) => <span className="text-xs text-wfl-text">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {/* Channel legend with revenue */}
            {!loading && salesByChannelWithColors.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {salesByChannelWithColors.map((ch, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                        style={{ background: ch.color }}
                      />
                      <span className="text-wfl-text">{ch.channelName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-wfl-text-secondary text-xs">{ch.orderCount} order</span>
                      <span className="font-semibold text-wfl-brown">{fmtRp(ch.total)}</span>
                      <span className="text-wfl-text-secondary w-8 text-right">{ch.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sales by Product — Bar */}
          <div className="bg-white rounded-2xl border border-wfl-border p-5 shadow-sm flex flex-col">
            <h2 className="font-bold text-wfl-brown text-base mb-4 flex items-center gap-2 shrink-0">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
              Penjualan per Produk
            </h2>
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-wfl-text-secondary text-sm min-h-75">Memuat data...</div>
            ) : salesData?.salesByProduct.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-wfl-text-secondary text-sm min-h-75">Tidak ada data</div>
            ) : (
              <div className="flex-1 flex flex-col min-h-75 w-full">
                {/* Scrollable Bar Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-1 styled-scrollbar max-h-87.5">
                  <div style={{ height: Math.max(300, (salesData?.salesByProduct.length || 0) * 40) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={salesData?.salesByProduct}
                        layout="vertical"
                        margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                        <XAxis type="number" hide domain={[0, maxProductTotal]} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={110}
                          tick={{ fontSize: 10, fill: '#6b7280' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomBarTooltip />} />
                        <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                          {salesData?.salesByProduct.map((_, i) => (
                            <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Fixed X-Axis Area */}
                <div className="h-8 shrink-0 mt-1 pt-1" style={{ paddingRight: '4px' }}>
                  <ResponsiveContainer width="100%" height={30}>
                    <BarChart
                      data={[{ name: 'dummy', total: maxProductTotal }]}
                      layout="vertical"
                      margin={{ left: 0, right: 20, top: -10, bottom: 0 }}
                    >
                      <XAxis
                        type="number"
                        domain={[0, maxProductTotal]}
                        tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis type="category" width={110} tick={false} axisLine={false} tickLine={false} />
                      <Bar dataKey="total" fill="transparent" isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Shift Reconciliation or Payment Summary ── */}
        <div className="bg-white rounded-2xl border border-wfl-border p-5 shadow-sm">
          <h2 className="font-bold text-wfl-brown text-base mb-4 flex items-center gap-2">
            <Wallet size={18} className="text-green-600" />
            {isSingleDay ? 'Rekonsiliasi Kas Shift' : 'Rincian Metode Pembayaran'}
            {isSingleDay && shiftData?.shift && (
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                shiftData.shift.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {shiftData.shift.status === 'OPEN' ? 'Shift Aktif' : 'Shift Tutup'}
              </span>
            )}
          </h2>

          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                 <Skeleton className="h-10 w-full rounded-lg" />
                 <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <Skeleton className="col-span-1 h-22 w-full rounded-lg" />
            </div>
          ) : isSingleDay && shiftData?.shift ? (
            <div className="grid grid-cols-3 gap-4">
              {/* Left: reconciliation numbers */}
              <div className="col-span-2 space-y-2">
                {[
                  { label: 'Kas Pembuka', value: shiftData?.openingCash || 0, muted: true },
                  { label: 'Pendapatan Cash (dari sistem)', value: shiftData?.cashFromSales || 0 },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-wfl-text-secondary">{row.label}</span>
                    <span className="font-medium text-wfl-brown">{fmtRp(row.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2.5 px-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-sm font-semibold text-green-800">Expected Total Kas</span>
                  <span className="font-bold text-green-700">{fmtRp(shiftData?.expectedTotal || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 px-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-semibold text-blue-800">Actual Kas Fisik (input kasir)</span>
                  <span className="font-bold text-blue-700">
                    {shiftData?.actualCash !== null ? fmtRp(shiftData?.actualCash) : (
                      <span className="text-gray-400 font-normal italic">Belum diinput</span>
                    )}
                  </span>
                </div>
                {shiftData?.variance !== null && shiftData?.variance !== undefined && (
                  <div className={`flex justify-between items-center py-2 px-3 rounded-lg border ${
                    shiftData.variance < 0 ? 'bg-red-50 border-red-200' : shiftData.variance > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <span className={`text-sm font-semibold ${shiftData.variance < 0 ? 'text-red-800' : shiftData.variance > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                      Selisih
                    </span>
                    <span className={`font-bold ${shiftData.variance < 0 ? 'text-red-700' : shiftData.variance > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
                      {shiftData.variance > 0 ? '+' : ''}{fmtRp(shiftData.variance)} {shiftData.variance === 0 && '(Sesuai)'}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: payment breakdown */}
              <div className="bg-gray-50 rounded-xl p-4 flex flex-col justify-between">
                <p className="text-xs font-bold text-wfl-text-secondary uppercase tracking-wider mb-3">Breakdown Pembayaran</p>
                {[
                  { label: 'Cash (bersih)', value: shiftData?.paymentBreakdown?.cash || 0, color: 'text-green-700' },
                  { label: 'QRIS', value: shiftData?.paymentBreakdown?.qris || 0, color: 'text-blue-700' },
                  { label: 'Transfer', value: shiftData?.paymentBreakdown?.transfer || 0, color: 'text-purple-700' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between text-sm mb-1.5">
                    <span className="text-wfl-text-secondary">{item.label}</span>
                    <span className={`font-medium ${item.color}`}>{fmtRp(item.value)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between text-sm">
                  <span className="font-bold text-wfl-brown">Total Gross</span>
                  <span className="font-bold text-wfl-brown">{fmtRp(shiftData?.paymentBreakdown?.gross || 0)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-center">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center"><span className="text-gray-500">Metode CASH</span><span className="font-bold text-wfl-brown text-base">{fmtRp(shiftData?.paymentBreakdown?.cash || 0)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500">Metode QRIS</span><span className="font-bold text-wfl-brown text-base">{fmtRp(shiftData?.paymentBreakdown?.qris || 0)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500">Metode TRANSFER</span><span className="font-bold text-wfl-brown text-base">{fmtRp(shiftData?.paymentBreakdown?.transfer || 0)}</span></div>
                  <div className="pt-3 mt-3 border-t border-gray-200 flex justify-between font-bold text-wfl-brown text-lg">
                    <span>TOTAL PENDAPATAN (Gross)</span>
                    <span>{fmtRp(shiftData?.paymentBreakdown?.gross || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Commission Breakdown ── */}
        <div className="bg-white rounded-2xl border border-wfl-border p-5 shadow-sm">
          <h2 className="font-bold text-wfl-brown text-base mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span>
            Komisi & Fee Platform
          </h2>

          {loading ? (
            <div className="text-wfl-text-secondary text-sm py-8 text-center">Memuat data...</div>
          ) : !commissionData?.commissions.length ? (
            <div className="text-wfl-text-secondary text-sm py-8 text-center bg-gray-50 rounded-xl">
              Tidak ada order dari platform (GrabFood/GoFood/ShopeeFood) pada periode ini
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-purple-50">
                      {['Platform', 'Komisi', 'Flat Fee/Order', 'Order', 'Gross Revenue', 'Total Komisi', 'Total Flat Fee', 'Net Settlement', 'Settles To'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-purple-800 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {commissionData.commissions.map((c, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-purple-50/30'}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHANNEL_COLORS[c.channelName] || DEFAULT_COLOR }} />
                            <span className="font-semibold text-wfl-brown">{c.channelName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium text-purple-700">{c.commissionPct}%</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{fmtRp(c.flatFeePerOrder)}</td>
                        <td className="px-3 py-2.5 text-center">{c.orderCount}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{fmtRp(c.grossRevenue)}</td>
                        <td className="px-3 py-2.5 text-right text-red-600 font-medium">−{fmtRp(c.totalCommission)}</td>
                        <td className="px-3 py-2.5 text-right text-orange-600 font-medium">−{fmtRp(c.totalFlatFee)}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-green-700">{fmtRp(c.netSettlement)}</td>
                        <td className="px-3 py-2.5 text-xs text-wfl-text-secondary">{c.settlesTo}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-purple-100 border-t-2 border-purple-200">
                      <td colSpan={4} className="px-3 py-2.5 font-bold text-purple-800">TOTAL</td>
                      <td className="px-3 py-2.5 text-right font-bold text-purple-800">{fmtRp(commissionData.summary.totalGross)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-red-700">
                        −{fmtRp(commissionData.commissions.reduce((s, c) => s + c.totalCommission, 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-orange-700">
                        −{fmtRp(commissionData.commissions.reduce((s, c) => s + c.totalFlatFee, 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-green-700">{fmtRp(commissionData.summary.totalNet)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Commission summary formula note */}
              <p className="text-xs text-wfl-text-secondary mt-3 bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-semibold">Formula:</span> Net = (Gross × (1 − komisi%)) − flat fee per order
              </p>
            </>
          )}
        </div>
      </div>

      {/* TREN PENJUALAN HISTORIS */}
      <div className="bg-white rounded-2xl shadow-sm border border-wfl-gray-100 overflow-hidden mb-6">
        <div className="border-b border-wfl-gray-100 p-5 bg-wfl-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-wfl-text-dark">Tren Penjualan Historis</h2>
              <p className="text-sm text-wfl-text-secondary">Pertumbuhan pendapatan seiring waktu</p>
            </div>
          </div>
          
          <div className="flex bg-white rounded-lg p-1 border border-wfl-gray-200">
            {(['7d', '1m', '6m', '1y'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTrendRange(r)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  trendRange === r 
                    ? 'bg-wfl-orange text-white shadow-sm' 
                    : 'text-wfl-text-secondary hover:bg-wfl-gray-50'
                }`}
              >
                {r === '7d' ? '7 Hari' : r === '1m' ? '1 Bulan' : r === '6m' ? '6 Bulan' : '1 Tahun'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-6">
          {trendLoading ? (
            <div className="h-75 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wfl-orange"></div>
            </div>
          ) : (
            <div className="h-75 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid stroke="#f1f5f9" strokeDasharray="5 5" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => {
                      if (!val) return '';
                      if (trendRange === '6m' || trendRange === '1y') {
                        // Month string (YYYY-MM)
                        const [y, m] = val.split('-');
                        const d = new Date(Number(y), Number(m) - 1, 1);
                        return d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
                      } else {
                        // Date string (YYYY-MM-DD)
                        const d = new Date(val);
                        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                      }
                    }} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10} 
                  />
                  <YAxis 
                    tickFormatter={(val) => `Rp${val / 1000}k`} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    tickLine={false} 
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip 
                    formatter={(value: any) => [fmtRp(Number(value)), 'Penjualan']}
                    labelFormatter={(label) => {
                      if (!label) return '';
                      if (trendRange === '6m' || trendRange === '1y') {
                        const [y, m] = (label as string).split('-');
                        const d = new Date(Number(y), Number(m) - 1, 1);
                        return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                      } else {
                        return new Date(label as string).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
                      }
                    }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#FF8B45" 
                    strokeWidth={3} 
                    dot={{ fill: '#FF8B45', strokeWidth: 2, r: 4, stroke: '#fff' }} 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#E67A38' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

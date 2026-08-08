import React, { useEffect, useState, useMemo } from 'react';
import api from '../lib/api';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { FileDown, Printer, Search, Eye, Inbox, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { HistoryDetailModal } from '../components/orders/HistoryDetailModal';
import { Skeleton } from '../components/common/Skeleton';

export interface HistoryOrder {
  id: string;
  orderNumber: string;
  customerData: string;
  status: 'DONE' | 'CANCELLED';
  paymentStatus: string;
  notes: string | null;
  cancelReason: string | null;
  channel: { name: string };
  createdBy: { fullName: string };
  items: any[];
  payments: any[];
  editLogs: any[];
  createdAt: string;
  cancelledAt: string | null;
  discountAmount?: number | null;
  discount?: any | null;
  refunded: boolean;
}

export const History: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DONE' | 'CANCELLED'>('ALL');
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('TODAY');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState<HistoryOrder | null>(null);
  const [toasts, setToasts] = useState<{id: number, message: string, type: 'success' | 'error' | 'warning' | 'info'}[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Determine dates based on filter
      let start = startDate;
      let end = endDate;
      const today = new Date();
      
      switch (dateFilter) {
        case 'TODAY':
          start = format(today, 'yyyy-MM-dd');
          end = format(today, 'yyyy-MM-dd');
          break;
        case 'YESTERDAY':
          const yesterday = subDays(today, 1);
          start = format(yesterday, 'yyyy-MM-dd');
          end = format(yesterday, 'yyyy-MM-dd');
          break;
        case 'WEEK':
          start = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          end = format(today, 'yyyy-MM-dd');
          break;
        case 'MONTH':
          start = format(startOfMonth(today), 'yyyy-MM-dd');
          end = format(today, 'yyyy-MM-dd');
          break;
        case 'CUSTOM':
          // Use startDate and endDate states
          break;
      }

      const params = new URLSearchParams();
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await api.get(`/orders/history?${params.toString()}`);
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, statusFilter, startDate, endDate]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (o.customerData && o.customerData.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [orders, searchQuery]);

  const calculateTotal = (items: any[]) => {
    return items.reduce((acc, item) => acc + parseFloat(item.lineTotal), 0);
  };

  const exportToExcel = async () => {
    if (orders.length === 0) return;
    
    try {
      const XLSX = await import('xlsx-js-style');

      const rows: any[] = [];
      
      // Title
      rows.push([{ v: 'LAPORAN HISTORI PENJUALAN WAFFLEO', s: { font: { sz: 16, bold: true, color: { rgb: 'FFFFFFFF' } }, fill: { fgColor: { rgb: 'FF8B4513' } }, alignment: { vertical: 'center', horizontal: 'center' } } }]);
      
      // Subtitle
      rows.push([{ v: `Tanggal Cetak: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, s: { font: { sz: 11, italic: true }, alignment: { vertical: 'center', horizontal: 'center' } } }]);
      
      // Empty row
      rows.push([]);

      // Headers
      const headers = ['Order ID', 'Tanggal', 'Jam', 'Kasir', 'Pelanggan', 'Channel', 'Status', 'Metode Pembayaran', 'Detail Pesanan', 'Total Harga', 'Catatan', 'Alasan Batal'];
      
      const headerRow = headers.map(h => ({
        v: h,
        s: {
          fill: { fgColor: { rgb: 'FFF5DEB3' } },
          font: { sz: 11, bold: true, color: { rgb: 'FF000000' } },
          alignment: { vertical: 'center', horizontal: 'center' },
          border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        }
      }));
      rows.push(headerRow);

      // Data Rows
      filteredOrders.forEach((order) => {
        const itemsList = order.items.map((item: any) => {
          let name = item.name || item.productType;
          if (item.topping) name = item.topping.name;
          if (item.drink) name = item.drink.name;
          
          let details = `${item.qty}x ${name}`;
          if (item.halfPartner) details += ` & ${item.halfPartner.name}`;
          if (item.flavour) details += ` (${item.flavour.name})`;
          return details;
        }).join('\n');

        const row = [
          order.orderNumber,
          format(new Date(order.createdAt), 'yyyy-MM-dd'),
          format(new Date(order.createdAt), 'HH:mm:ss'),
          order.createdBy.fullName,
          order.customerData || '-',
          order.channel.name,
          order.status,
          order.payments.length > 0 
            ? order.payments.map((p: any) => p.method === 'CASH_QRIS' ? 'Split (Cash+QRIS)' : p.method).join('\n') 
            : '-',
          itemsList,
          calculateTotal(order.items) - (Number(order.discountAmount) || 0),
          order.notes || '-',
          order.cancelReason || '-'
        ].map((val, idx) => ({
          v: val,
          t: idx === 9 ? 'n' : 's',
          z: idx === 9 ? '"Rp"#,##0' : undefined,
          s: {
            font: { sz: 10 },
            alignment: { vertical: 'top', horizontal: idx === 9 ? 'right' : 'left', wrapText: true },
            border: { top: { style: 'thin', color: { auto: 1 } }, left: { style: 'thin', color: { auto: 1 } }, bottom: { style: 'thin', color: { auto: 1 } }, right: { style: 'thin', color: { auto: 1 } } }
          }
        }));
        
        rows.push(row);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      
      // Merges
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, // Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }  // Subtitle
      ];

      // Column widths
      worksheet['!cols'] = [
        { wch: 18 }, // Order ID
        { wch: 12 }, // Tanggal
        { wch: 10 }, // Jam
        { wch: 18 }, // Kasir
        { wch: 18 }, // Pelanggan
        { wch: 15 }, // Channel
        { wch: 12 }, // Status
        { wch: 20 }, // Metode
        { wch: 45 }, // Detail
        { wch: 18 }, // Total
        { wch: 25 }, // Catatan
        { wch: 20 }  // Alasan
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Histori Penjualan');
      
      XLSX.writeFile(workbook, `Laporan_Histori_Waffleo_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);

    } catch (error: any) {
      console.error('Error generating Excel:', error);
      alert(`Terjadi kesalahan saat membuat file Excel: ${error.message}`);
    }
  };

  const printAll = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-wfl-cream/30 print:bg-white">
      {/* Filters Section */}
      <div className="p-6 bg-white border-b border-wfl-border flex flex-col md:flex-row gap-4 justify-between items-start md:items-center print:hidden">
        
        <div className="flex flex-wrap gap-3 items-center">
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-wfl-cream/50 border border-wfl-border rounded-lg text-sm font-medium text-wfl-text focus:outline-none focus:border-wfl-orange"
          >
            <option value="ALL">Semua Status</option>
            <option value="DONE">Selesai (Done)</option>
            <option value="CANCELLED">Batal (Cancelled)</option>
          </select>

          <select 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value as any)}
            className="px-3 py-2 bg-wfl-cream/50 border border-wfl-border rounded-lg text-sm font-medium text-wfl-text focus:outline-none focus:border-wfl-orange"
          >
            <option value="TODAY">Hari Ini</option>
            <option value="YESTERDAY">Kemarin</option>
            <option value="WEEK">Minggu Ini</option>
            <option value="MONTH">Bulan Ini</option>
            <option value="CUSTOM">Kustom</option>
          </select>

          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 bg-wfl-cream/50 border border-wfl-border rounded-lg text-sm"
              />
              <span className="text-wfl-text-secondary">to</span>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 bg-wfl-cream/50 border border-wfl-border rounded-lg text-sm"
              />
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-wfl-text-secondary" />
            <input 
              type="text"
              placeholder="Cari Order ID / Pelanggan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-wfl-cream/50 border border-wfl-border rounded-lg text-sm w-64 focus:outline-none focus:border-wfl-orange"
            />
          </div>
        </div>

        {/* Kasir doesn't see action buttons */}
        {user?.role !== 'KASIR' && (
          <div className="flex gap-2">
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-wfl-border rounded-lg text-sm font-semibold text-wfl-text hover:bg-wfl-cream transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Export Excel
            </button>
            <button 
              onClick={printAll}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-wfl-border rounded-lg text-sm font-semibold text-wfl-text hover:bg-wfl-cream transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="bg-white rounded-2xl border border-wfl-border overflow-hidden shadow-sm print:shadow-none print:border-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-wfl-cream/50 border-b border-wfl-border">
                <th className="px-6 py-4 text-xs font-bold text-wfl-text-secondary uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-xs font-bold text-wfl-text-secondary uppercase tracking-wider">Waktu</th>
                <th className="px-6 py-4 text-xs font-bold text-wfl-text-secondary uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-wfl-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-wfl-text-secondary uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-wfl-text-secondary uppercase tracking-wider print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wfl-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-3 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-3 w-12" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-10 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                        <Inbox size={32} className="text-gray-300" />
                      </div>
                      <p className="font-semibold text-gray-600">Tidak ada data histori</p>
                      <p className="text-sm">Tidak ada pesanan yang ditemukan untuk filter yang dipilih.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-wfl-cream/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-wfl-text">
                      {order.orderNumber}
                      <div className="text-xs text-wfl-text-secondary mt-1">{order.channel.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-wfl-text">
                      {format(new Date(order.createdAt), 'dd MMM yyyy')}
                      <div className="text-xs text-wfl-text-secondary mt-1">
                        {format(new Date(order.createdAt), 'HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-wfl-text">
                      {order.customerData || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'DONE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {order.status === 'DONE' ? 'Selesai' : 'Batal'}
                      </span>
                      {order.refunded && (
                        <span className="mt-1 w-max inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                          REFUNDED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-wfl-text">
                      Rp {(calculateTotal(order.items) - (Number(order.discountAmount) || 0)).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 print:hidden">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-wfl-text-secondary hover:text-wfl-orange hover:bg-wfl-orange/10 rounded-lg transition-colors"
                        title="Lihat Detail"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <HistoryDetailModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onRefundSuccess={() => {
            fetchHistory();
          }}
          showToast={showToast}
        />
      )}

      {createPortal(
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-100 flex flex-col items-center gap-2 transition-all duration-300 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${
              t.type === 'success' ? 'bg-[#FCFCFC] border-[#448347]/20 text-[#448347]' :
              t.type === 'error' ? 'bg-[#FCFCFC] border-red-500/20 text-red-600' :
              t.type === 'warning' ? 'bg-[#FCFCFC] border-yellow-500/20 text-yellow-600' :
              'bg-[#FCFCFC] border-blue-500/20 text-blue-600'
            } animate-in fade-in slide-in-from-top-4 pointer-events-auto`}>
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {t.type === 'error' && <XCircle className="w-5 h-5" />}
              {t.type === 'warning' && <AlertCircle className="w-5 h-5" />}
              {t.type === 'info' && <Info className="w-5 h-5" />}
              <p className="font-semibold">{t.message}</p>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

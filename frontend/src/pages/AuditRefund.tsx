import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Shield, Clock, RotateCcw, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { Skeleton } from '../components/common/Skeleton';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue: any;
  afterValue: any;
  timestamp: string;
  actor: {
    fullName: string;
    role: string;
  };
}

interface RefundLog {
  id: string;
  amount: string;
  reason: string;
  approvedAt: string;
  order: {
    orderNumber: string;
    customerData: string | null;
  };
  approvedBy: {
    fullName: string;
    role: string;
  };
}

export const AuditRefund: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'REFUND'>('AUDIT');
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [refunds, setRefunds] = useState<RefundLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'AUDIT') {
        const res = await api.get('/audits');
        setAudits(res.data);
      } else {
        const res = await api.get('/refunds');
        setRefunds(res.data);
      }
    } catch (err: any) {
      console.error(`Failed to fetch ${activeTab.toLowerCase()}:`, err);
      setError(err.response?.data?.message || 'Terjadi kesalahan saat mengambil data');
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (amount: number | string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(Number(amount));
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'ORDER_REFUND': return 'Order Refund';
      case 'ORDER_CANCEL': return 'Order Batal';
      case 'STOCK_UPDATE': return 'Update Stok';
      case 'LOGIN': 
      case 'AUTH_LOGIN': return 'Login';
      case 'SHIFT_OPEN': return 'Buka Shift';
      case 'SHIFT_CLOSE': return 'Tutup Shift';
      default: return action;
    }
  };

  const getEntityLabel = (entityType: string) => {
    const type = entityType.toLowerCase();
    if (type === 'order') return 'Pesanan / Transaksi';
    if (type === 'shift') return 'Sistem Shift';
    if (type === 'user') return 'Pengguna';
    return entityType;
  };

  const getDetailLabel = (action: string, afterValue: any) => {
    if (!afterValue) return '-';
    try {
      if (action === 'ORDER_REFUND') {
        return `Refund ${formatRupiah(afterValue.amount || 0)} (Alasan: ${afterValue.reason || '-'})`;
      }
      if (action === 'ORDER_CANCEL') {
        return `Batal (Alasan: ${afterValue.cancelReason || '-'})`;
      }
      if (action === 'AUTH_LOGIN' || action === 'LOGIN') {
        const ua = afterValue.userAgent ? afterValue.userAgent.split(' ')[0] : '';
        return `Login dari IP ${afterValue.ip || '-'} ${ua ? `(${ua})` : ''}`;
      }
      if (action === 'SHIFT_OPEN') {
        return `Buka Shift (Saldo Awal: ${formatRupiah(afterValue.openingCash || 0)})`;
      }
      if (action === 'SHIFT_CLOSE') {
        return `Tutup Shift (Saldo Aktual: ${formatRupiah(afterValue.closingCashActual || 0)})`;
      }
      return JSON.stringify(afterValue).substring(0, 60) + (JSON.stringify(afterValue).length > 60 ? '...' : '');
    } catch(e) {
      return '-';
    }
  };

  return (
    <div className="flex flex-col h-full bg-wfl-cream/30">
      <div className="p-6 pb-0">
        <h1 className="text-2xl font-bold text-wfl-text mb-2 flex items-center gap-2">
          <Shield className="w-6 h-6 text-wfl-orange" />
          Audit & Refund
        </h1>
        <p className="text-wfl-text-secondary text-sm mb-6">
          Riwayat aktivitas sistem dan daftar transaksi yang dikembalikan dananya.
        </p>

        {/* Tabs */}
        <div className="flex border-b border-wfl-border">
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'AUDIT'
                ? 'border-wfl-orange text-wfl-orange'
                : 'border-transparent text-wfl-text-secondary hover:text-wfl-text'
            }`}
          >
            <Clock className="w-4 h-4" />
            Log Sistem (Audit)
          </button>
          <button
            onClick={() => setActiveTab('REFUND')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'REFUND'
                ? 'border-wfl-orange text-wfl-orange'
                : 'border-transparent text-wfl-text-secondary hover:text-wfl-text'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Riwayat Refund
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-wfl-border overflow-hidden">
            <div className="overflow-x-auto">
              {activeTab === 'AUDIT' ? (
                <table className="w-full text-left text-sm">
                  <thead className="bg-wfl-cream/50 text-wfl-text-secondary">
                    <tr>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Waktu</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Aktor</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Aksi</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Target Entitas</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Detail Perubahan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-wfl-border">
                    {audits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-wfl-text-secondary">
                          Tidak ada log audit yang ditemukan.
                        </td>
                      </tr>
                    ) : (
                      audits.map((log) => (
                        <tr key={log.id} className="hover:bg-wfl-cream/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-wfl-text-secondary">
                            {format(new Date(log.timestamp), 'dd MMM yyyy, HH:mm')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-wfl-text">{log.actor.fullName}</div>
                            <div className="text-xs text-wfl-text-secondary">{log.actor.role}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              {getActionLabel(log.action)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-wfl-text">
                            {getEntityLabel(log.entityType)} <br/>
                            <span className="text-xs text-wfl-text-secondary">ID: {log.entityId.substring(0, 8)}...</span>
                          </td>
                          <td className="px-6 py-4 max-w-xs truncate text-wfl-text-secondary" title={JSON.stringify(log.afterValue)}>
                            {getDetailLabel(log.action, log.afterValue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-wfl-cream/50 text-wfl-text-secondary">
                    <tr>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Waktu Refund</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Order ID</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Nominal</th>
                      <th className="px-6 py-4 font-semibold">Alasan</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Disetujui Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-wfl-border">
                    {refunds.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-wfl-text-secondary">
                          Tidak ada riwayat refund.
                        </td>
                      </tr>
                    ) : (
                      refunds.map((ref) => (
                        <tr key={ref.id} className="hover:bg-wfl-cream/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-wfl-text-secondary">
                            {format(new Date(ref.approvedAt), 'dd MMM yyyy, HH:mm')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-wfl-text">{ref.order.orderNumber}</div>
                            {ref.order.customerData && (
                              <div className="text-xs text-wfl-text-secondary">{ref.order.customerData}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-red-600">
                            {formatRupiah(ref.amount)}
                          </td>
                          <td className="px-6 py-4 text-wfl-text">
                            {ref.reason}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-wfl-text">{ref.approvedBy.fullName}</div>
                            <div className="text-xs text-wfl-text-secondary">{ref.approvedBy.role}</div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

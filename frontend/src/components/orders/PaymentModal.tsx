import React, { useState } from 'react';
import api from '../../lib/api';
import { createPortal } from 'react-dom';

interface PaymentModalProps {
  order: any;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ order, onClose, onSuccess, onError }) => {
  const [method, setMethod] = useState<'CASH' | 'QRIS' | 'CASH_QRIS' | 'TRANSFER'>('CASH');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const subtotal = order.items.reduce((sum: number, item: any) => sum + Number(item.lineTotal), 0);
  const rawTotal = subtotal - (Number(order.discountAmount) || 0);
  const paidAmount = order.payments?.reduce((sum: number, p: any) => sum + Number(p.totalTendered) - Number(p.changeGiven), 0) || 0;
  const total = Math.max(0, rawTotal - paidAmount);

  const formatRupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  const handlePay = async () => {
    setLoading(true);
    try {
      const payload = {
        method,
        cashAmount: method === 'CASH' || method === 'CASH_QRIS' ? Number(cashAmount) : 0,
      };
      const res = await api.post(`/orders/${order.id}/payments`, payload);
      if (res.data.changeGiven > 0) {
        onSuccess(`Pembayaran sukses. Kembalian: ${formatRupiah(res.data.changeGiven)}`);
      } else {
        onSuccess('Pembayaran sukses.');
      }
    } catch (err: any) {
      console.error(err);
      onError(err.response?.data?.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const getRemainder = () => {
    if (method !== 'CASH_QRIS') return 0;
    const cash = Number(cashAmount);
    return cash < total ? total - cash : 0;
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-112.5 min-w-[320px] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-orange-500 p-4 text-white">
          <h2 className="text-xl font-bold">Payment: {order.orderNumber}</h2>
          <p className="text-orange-200">Customer: {order.customerData || 'Walk-In'}</p>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {paidAmount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex justify-between items-center text-sm">
              <span className="text-orange-800 font-medium">Sudah Dibayar</span>
              <span className="font-bold text-orange-900">{formatRupiah(paidAmount)}</span>
            </div>
          )}
          
          <div className="text-center mb-6 flex flex-col items-center">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-1">
              {paidAmount > 0 ? 'Kekurangan Tagihan' : 'Total Tagihan'}
            </p>
            {Number(order.discountAmount) > 0 && !paidAmount && (
              <p className="text-sm text-gray-400 line-through mb-0.5">{formatRupiah(subtotal)}</p>
            )}
            <p className="text-4xl font-bold text-gray-800">{formatRupiah(total)}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-3">
                {['CASH', 'QRIS', 'CASH_QRIS', 'TRANSFER'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m as any)}
                    className={`py-2 px-3 rounded-lg border-2 text-sm font-bold transition-all ${
                      method === m
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {m.replace('_', ' + ')}
                  </button>
                ))}
              </div>
            </div>

            {(method === 'CASH' || method === 'CASH_QRIS') && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nominal Cash Diterima</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-bold text-lg text-gray-800"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-2 mt-3">
                  {[50000, 100000, total].map((amount, i) => (
                    <button
                      key={i}
                      onClick={() => setCashAmount(amount.toString())}
                      className="flex-1 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      {i === 2 ? 'Uang Pas' : (amount / 1000) + 'k'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {method === 'CASH_QRIS' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex justify-between items-center">
                <span className="text-orange-800 font-medium">Sisa Tagihan (via QRIS)</span>
                <span className="font-bold text-orange-900 text-lg">{formatRupiah(getRemainder())}</span>
              </div>
            )}
            
            {method === 'CASH' && Number(cashAmount) > total && (
              <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex justify-between items-center">
                <span className="text-green-800 font-medium">Kembalian</span>
                <span className="font-bold text-green-900 text-lg">{formatRupiah(Number(cashAmount) - total)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white text-gray-700 font-bold border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handlePay}
            disabled={loading || (method === 'CASH' && Number(cashAmount) < total)}
            className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : 'Proses Pembayaran'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

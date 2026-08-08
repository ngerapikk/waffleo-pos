import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';

interface CancelOrderModalProps {
  orderId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

const PREDEFINED_REASONS = [
  "Customer membatalkan pesanan",
  "Bahan baku tidak mencukupi",
  "Kesalahan input kasir",
  "Pelanggan berubah pikiran / pesanan diganti",
  "Lainnya"
];

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({ orderId, onClose, onSuccess, onError }) => {
  const [selectedReason, setSelectedReason] = useState<string>(PREDEFINED_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalReason = selectedReason === 'Lainnya' ? customReason.trim() : selectedReason;
    
    if (!finalReason) {
      onError('Alasan pembatalan wajib diisi');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/orders/${orderId}/cancel`, { reason: finalReason });
      onSuccess('Order cancelled');
      onClose();
    } catch (err: any) {
      console.error(err);
      onError(err.response?.data?.message || 'Failed to cancel order');
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-112.5 min-w-[320px] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 bg-red-50 text-red-700">
          <h2 className="text-xl font-bold">Batalkan Pesanan</h2>
          <p className="text-sm mt-1 text-red-600/80">Tindakan ini tidak dapat diurungkan</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Pilih Alasan Pembatalan:
          </label>
          
          <div className="space-y-3 mb-4">
            {PREDEFINED_REASONS.map(reason => (
              <label 
                key={reason} 
                className={`flex items-start p-3 border rounded-xl cursor-pointer transition-colors ${
                  selectedReason === reason 
                    ? 'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500' 
                    : 'border-gray-200 hover:border-red-200 hover:bg-red-50/50'
                }`}
              >
                <div className="flex items-center h-5">
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                </div>
                <div className="ml-3 text-sm font-medium">
                  {reason}
                </div>
              </label>
            ))}
          </div>

          {selectedReason === 'Lainnya' && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tulis Alasan Secara Spesifik:
              </label>
              <textarea
                autoFocus
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-800"
                placeholder="Masukkan alasan detail..."
                rows={3}
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 disabled:opacity-50 transition-colors"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 focus:ring-4 focus:ring-red-500/30 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Memproses...' : 'Batalkan'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

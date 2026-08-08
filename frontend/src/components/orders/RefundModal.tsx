import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

interface RefundModalProps {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({ orderId, orderNumber, onClose, onSuccess, onError }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      onError('Alasan refund harus diisi');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/refunds', { orderId, reason });
      onSuccess('Refund berhasil diproses');
    } catch (err: any) {
      console.error(err);
      onError(err.response?.data?.message || 'Gagal memproses refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden relative flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-wfl-border flex items-center justify-between bg-red-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-900 leading-tight">Proses Refund</h2>
              <p className="text-sm text-red-700 font-medium">Order: {orderNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-red-900/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-gray-600 mb-6 font-medium">
            Tindakan ini akan mengembalikan uang pelanggan dan mencatatnya ke laporan audit. Stok bahan baku yang sudah terpotong <span className="font-bold text-red-600">tidak</span> akan dikembalikan otomatis. Lanjutkan?
          </p>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Alasan Refund <span className="text-red-500">*</span>
            </label>
            <textarea 
              className="w-full border border-border-light rounded-lg p-3 text-sm focus:outline-none focus:border-orange-primary focus:ring-1 focus:ring-orange-primary min-h-25 resize-none"
              placeholder="Contoh: Barang cacat, komplain pelanggan, dll..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Memproses...
                </>
              ) : (
                'Proses Refund'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

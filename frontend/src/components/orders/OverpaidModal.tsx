import React from 'react';
import { createPortal } from 'react-dom';
import { formatRupiah } from '../../utils/format';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface OverpaidModalProps {
  amount: number;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const OverpaidModal: React.FC<OverpaidModalProps> = ({ amount, onClose, onConfirm, loading }) => {
  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-112.5 min-w-[320px] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-wfl-green text-white px-6 py-4 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-white" />
          <h2 className="text-xl font-bold">Kelebihan Pembayaran</h2>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-6">
          <div className="text-wfl-text-secondary text-base">
            Total baru lebih kecil dari yang sudah dibayar. Terdapat kelebihan sebesar:
          </div>
          
          <div className="text-4xl font-bold text-wfl-green">
            {formatRupiah(amount)}
          </div>
          
          <div className="text-sm font-semibold text-wfl-brown bg-wfl-cream p-4 rounded-xl border border-wfl-orange/30">
            Apakah uang kelebihan sudah dikembalikan secara tunai ke pelanggan?
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-wfl-border bg-wfl-offwhite flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            Belum Dikembalikan
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-wfl-green hover:bg-wfl-green-hover text-white rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={20} />
            {loading ? 'Memproses...' : 'Sudah Dikembalikan'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

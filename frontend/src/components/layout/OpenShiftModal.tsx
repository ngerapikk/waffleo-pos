import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Wallet } from 'lucide-react';
import { useShiftStore } from '../../store/useShiftStore';

interface OpenShiftModalProps {
  onClose: () => void;
}

export const OpenShiftModal = ({ onClose }: OpenShiftModalProps) => {
  const [openingCash, setOpeningCash] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { openShift } = useShiftStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const cash = Number(openingCash) || 0;

    try {
      await openShift(cash);
      setSuccess(true);
      // Automatically close the success message after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Gagal membuka shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-125 max-w-[95vw] overflow-hidden shadow-xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Buka Shift</h2>
            <p className="text-sm text-gray-500 mt-1">Masukkan saldo awal kasir sebelum mulai menerima pesanan.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting || success}
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Shift Berhasil Dibuka</h3>
            <p className="text-gray-500">Selamat bekerja! Anda sekarang bisa mulai menerima pesanan.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saldo Awal Kasir (Cash in Drawer)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-medium mr-1">Rp</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wfl-orange/50 focus:border-wfl-orange"
                    placeholder="Contoh: 150000"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Wallet className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Masukkan jumlah uang kembalian fisik yang ada di dalam laci kasir saat ini.
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-wfl-green hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                disabled={isSubmitting || openingCash === ''}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Membuka...
                  </>
                ) : (
                  'Buka Shift Sekarang'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

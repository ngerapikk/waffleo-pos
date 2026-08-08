import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Package, Wallet } from 'lucide-react';
import { useShiftStore } from '../../store/useShiftStore';

interface CloseShiftModalProps {
  onClose: () => void;
}

export const CloseShiftModal = ({ onClose }: CloseShiftModalProps) => {
  const [usedAdonanBesar, setUsedAdonanBesar] = useState<number | ''>('');
  const [usedAdonanKecil, setUsedAdonanKecil] = useState<number | ''>('');
  const [closingCashActual, setClosingCashActual] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { closeShift } = useShiftStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const besar = Number(usedAdonanBesar) || 0;
    const kecil = Number(usedAdonanKecil) || 0;
    const actualCash = Number(closingCashActual) || 0;

    try {
      await closeShift(besar, kecil, actualCash);
      setSuccess(true);
      // Automatically close the success message after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal menutup shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-125 max-w-[95vw] overflow-hidden shadow-xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tutup Shift</h2>
            <p className="text-sm text-gray-500 mt-1">Masukkan jumlah Adonan yang terpakai selama shift ini.</p>
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Shift Berhasil Ditutup</h3>
            <p className="text-gray-500">Stok bahan baku (Adonan, Telur, Minyak, dll) telah dikurangi sesuai penggunaan.</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Adonan Besar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adonan Besar Terpakai
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={usedAdonanBesar}
                    onChange={(e) => setUsedAdonanBesar(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wfl-orange/50 focus:border-wfl-orange"
                    placeholder="Contoh: 2"
                  />
                </div>
              </div>

              {/* Adonan Kecil */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adonan Kecil Terpakai
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={usedAdonanKecil}
                    onChange={(e) => setUsedAdonanKecil(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wfl-orange/50 focus:border-wfl-orange"
                    placeholder="Contoh: 1"
                  />
                </div>
              </div>

              {/* Saldo Fisik */}
              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saldo Kasir Aktual (Fisik)
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
                    value={closingCashActual}
                    onChange={(e) => setClosingCashActual(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wfl-orange/50 focus:border-wfl-orange"
                    placeholder="Contoh: 500000"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Wallet className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Total uang tunai fisik yang ada di dalam laci saat ini.</p>
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
                className="px-6 py-2.5 bg-wfl-orange hover:bg-wfl-orange-hover text-white font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                disabled={isSubmitting || closingCashActual === ''}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  'Tutup Shift'
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

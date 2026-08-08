import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useInventoryStore } from '../../store/useInventoryStore';
import type { Ingredient } from '../../store/useInventoryStore';

interface Props {
  ingredient: Ingredient;
  onClose: () => void;
}

export function AdjustStockModal({ ingredient, onClose }: Props) {
  const { adjustStock } = useInventoryStore();
  const [qtyStr, setQtyStr] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdd = qtyStr.startsWith('+');
  const isSubtract = qtyStr.startsWith('-');
  const isValidNumber = !isNaN(Number(qtyStr)) && qtyStr.trim() !== '' && Number(qtyStr) !== 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidNumber) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await adjustStock(ingredient.id, Number(qtyStr), reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-125 max-w-[95vw] overflow-hidden shadow-xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Adjust Stock</h2>
            <p className="text-sm text-gray-500 mt-1">
              {ingredient.name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center border border-gray-100">
            <span className="text-sm font-medium text-gray-600">Current Stock</span>
            <span className="text-lg font-mono font-bold text-gray-900">
              {Number(ingredient.currentStock).toLocaleString()} <span className="text-sm text-gray-500 font-sans">{ingredient.unit}</span>
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adjustment Quantity
            </label>
            <input
              type="text"
              placeholder="+50 or -20"
              value={qtyStr}
              onChange={(e) => setQtyStr(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-lg"
              autoFocus
            />
            <p className="mt-2 text-sm text-gray-500">
              Use <code className="bg-gray-100 px-1 rounded">+</code> to add or <code className="bg-gray-100 px-1 rounded">-</code> to deduct.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Damaged, Restock, Expiry..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!isValidNumber || isSubmitting}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                isAdd
                  ? 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50'
                  : isSubtract
                  ? 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50'
                  : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
              }`}
            >
              {isSubmitting ? 'Saving...' : isAdd ? 'Add Stock' : isSubtract ? 'Deduct Stock' : 'Adjust Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

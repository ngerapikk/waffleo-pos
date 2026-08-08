import React, { useState } from 'react';
import { X, ArrowDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useInventoryStore } from '../../store/useInventoryStore';
import type { Ingredient } from '../../store/useInventoryStore';

interface Props {
  ingredients: Ingredient[];
  onClose: () => void;
}

const RECIPES: Record<string, { name: string, qtyPerUnit: number }[]> = {
  'Adonan Besar': [
    { name: 'Tepung Terigu', qtyPerUnit: 420 },
    { name: 'Maizena', qtyPerUnit: 80 },
    { name: 'Baking Powder', qtyPerUnit: 16 },
    { name: 'Gula Pasir', qtyPerUnit: 160 }
  ],
  'Adonan Kecil': [
    { name: 'Tepung Terigu', qtyPerUnit: 210 },
    { name: 'Maizena', qtyPerUnit: 40 },
    { name: 'Baking Powder', qtyPerUnit: 8 },
    { name: 'Gula Pasir', qtyPerUnit: 80 }
  ],
  'Krimer': [
    { name: 'MaxCreamer', qtyPerUnit: 0.5 },
    { name: 'Rich Creme', qtyPerUnit: 0.5 },
  ],
  'Cocoa Powder': [
    { name: 'Van Houten', qtyPerUnit: 0.5 },
    { name: 'Tulip Bordeaux', qtyPerUnit: 0.5 },
  ],
  'Espresso': [
    { name: 'Biji Kopi', qtyPerUnit: 18 / 60 },
  ]
};

export function ProduceStockModal({ ingredients, onClose }: Props) {
  const { produceStock } = useInventoryStore();
  
  // Find valid derived ingredients that have recipes defined
  const producibleIngredients = ingredients.filter(i => RECIPES[i.name]);
  
  const [outputIngredientId, setOutputIngredientId] = useState(producibleIngredients.length > 0 ? producibleIngredients[0].id : '');
  const [outputQty, setOutputQty] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = 
    outputIngredientId !== '' && 
    !isNaN(Number(outputQty)) && Number(outputQty) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await produceStock(outputIngredientId, Number(outputQty));
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to produce stock');
      setIsSubmitting(false);
    }
  };

  const outputIngredient = ingredients.find(i => i.id === outputIngredientId);
  const currentRecipe = outputIngredient ? RECIPES[outputIngredient.name] : null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-150 max-w-[95vw] overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Sistem Atomik Produksi</h2>
            <p className="text-sm text-gray-500 mt-1">
              Produksi barang turunan dari beberapa bahan baku sekaligus
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barang yang Diproduksi</label>
              <select
                value={outputIngredientId}
                onChange={(e) => setOutputIngredientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {producibleIngredients.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Produksi</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={outputQty}
                  onChange={(e) => setOutputQty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="e.g. 1"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400 text-sm">
                  {outputIngredient?.unit || ''}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center text-gray-400">
            <ArrowDown size={24} />
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Estimasi Bahan yang Digunakan:</h3>
            {currentRecipe && Number(outputQty) > 0 ? (
              <ul className="space-y-2">
                {currentRecipe.map((item, index) => {
                  const requiredAmount = item.qtyPerUnit * Number(outputQty);
                  const sourceIngredient = ingredients.find(i => i.name === item.name);
                  
                  return (
                    <li key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-mono font-medium text-red-600">
                        -{requiredAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {sourceIngredient?.unit}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">Masukkan jumlah produksi untuk melihat estimasi bahan baku.</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="w-full py-3 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {isSubmitting ? 'Memproses...' : 'Proses Produksi'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
